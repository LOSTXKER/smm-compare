import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { fetchServices } from "./smm-client";
import { normalizeServices } from "./gemini-normalizer";
import { matchAndGroupServices } from "./service-matcher";
import { recordPriceChanges } from "./price-history";
import { checkProviderHealth } from "./health-monitor";
import { getConfigInt } from "./config";

export interface SyncResult {
  providerId: string;
  providerName: string;
  servicesFound: number;
  servicesUpserted: number;
  priceChanges: number;
  normalized: number;
  error?: string;
}

export type ProgressEvent =
  | { type: "step"; provider: string; step: string; detail: string }
  | { type: "progress"; provider: string; current: number; total: number; step: string }
  | { type: "provider_done"; result: SyncResult }
  | { type: "matching"; detail: string }
  | { type: "done"; results: SyncResult[]; matchResult: { matched: number; newGroups: number } }
  | { type: "error"; message: string };

type ProgressCallback = (event: ProgressEvent) => void;

export async function syncProviderWithProgress(
  providerId: string,
  onProgress: ProgressCallback
): Promise<SyncResult> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) throw new Error("Provider not found");

  onProgress({ type: "step", provider: provider.name, step: "health", detail: "ตรวจสอบสถานะ API..." });
  await checkProviderHealth(providerId);

  onProgress({ type: "step", provider: provider.name, step: "fetch", detail: "ดึงรายการบริการจาก API..." });
  const result = await fetchServices(provider.apiUrl, provider.apiKey);

  if (!result.success || !result.services) {
    return {
      providerId: provider.id,
      providerName: provider.name,
      servicesFound: 0,
      servicesUpserted: 0,
      priceChanges: 0,
      normalized: 0,
      error: result.error,
    };
  }

  onProgress({ type: "step", provider: provider.name, step: "upsert", detail: `พบ ${result.services.length} บริการ กำลังบันทึก...` });

  const priceUpdates: { serviceId: string; newRate: Prisma.Decimal }[] = [];
  let upserted = 0;
  const totalServices = result.services.length;

  for (const svc of result.services) {
    try {
      const rateStr = String(svc.rate);
      const rateParsed = parseFloat(rateStr);
      if (isNaN(rateParsed) || rateParsed < 0) continue;
      if (rateParsed >= 1_000_000_000_000) continue;

      const safeRate = rateParsed.toFixed(8);
      const newRate = new Prisma.Decimal(safeRate);

      const safeMin = Math.max(0, Math.min(Number(svc.min) || 0, 2147483647));
      const safeMax = Math.max(0, Math.min(Number(svc.max) || 0, 2147483647));

      const existing = await prisma.rawService.findUnique({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: String(svc.service),
          },
        },
      });

      const record = await prisma.rawService.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: String(svc.service),
          },
        },
        update: {
          name: svc.name,
          category: svc.category,
          type: svc.type,
          rate: newRate,
          min: safeMin,
          max: safeMax,
          refill: svc.refill ?? false,
          cancel: svc.cancel ?? false,
          lastSyncedAt: new Date(),
        },
        create: {
          providerId: provider.id,
          externalId: String(svc.service),
          name: svc.name,
          category: svc.category,
          type: svc.type,
          rate: newRate,
          min: safeMin,
          max: safeMax,
          refill: svc.refill ?? false,
          cancel: svc.cancel ?? false,
        },
      });

      if (!existing || !existing.rate.equals(newRate)) {
        priceUpdates.push({ serviceId: record.id, newRate });
      }

      upserted++;

      if (upserted % 50 === 0 || upserted === totalServices) {
        onProgress({ type: "progress", provider: provider.name, current: upserted, total: totalServices, step: "upsert" });
      }
    } catch (svcErr) {
      console.error(`Upsert failed for service ${svc.service}:`, svcErr instanceof Error ? svcErr.message : svcErr);
    }
  }

  onProgress({ type: "step", provider: provider.name, step: "price", detail: `บันทึกประวัติราคา (${priceUpdates.length} เปลี่ยน)...` });
  const { recorded } = await recordPriceChanges(priceUpdates);

  let normalizedCount = 0;
  const MAX_AI_ROUNDS = await getConfigInt("ai_max_rounds", 5);

  for (let round = 1; round <= MAX_AI_ROUNDS; round++) {
    const unnormalized = await prisma.rawService.findMany({
      where: { providerId: provider.id, normalized: null },
      select: { id: true, externalId: true, name: true, category: true },
    });

    if (unnormalized.length === 0) {
      if (round === 1) {
        onProgress({ type: "step", provider: provider.name, step: "ai", detail: "ไม่มีบริการใหม่ที่ต้องวิเคราะห์" });
      }
      break;
    }

    const serviceIds = unnormalized.map((s) => s.id);
    const roundLabel = round > 1 ? ` (รอบที่ ${round})` : "";

    onProgress({
      type: "step",
      provider: provider.name,
      step: "ai",
      detail: `วิเคราะห์ ${unnormalized.length} บริการด้วย AI${roundLabel}...`,
    });

    onProgress({
      type: "progress",
      provider: provider.name,
      current: 0,
      total: unnormalized.length,
      step: "ai",
    });

    const saveNormResult = async (norm: { externalId: string; platform: string; serviceType: string; quality: string | null; speed: string | null; refillDays: number | null; geoTarget: string | null; durationMinutes: number | null; watchDurationSec: number | null }) => {
      const idx = parseInt(norm.externalId, 10);
      const serviceId = !isNaN(idx) && idx >= 0 && idx < serviceIds.length
        ? serviceIds[idx]
        : null;

      if (!serviceId) return;

      const exists = await prisma.rawService.findUnique({
        where: { id: serviceId },
        select: { id: true },
      });
      if (!exists) return;

      try {
        const platform = norm.platform || "unknown";
        const serviceType = norm.serviceType || "other";

        await prisma.normalizedAttribute.upsert({
          where: { serviceId },
          update: {
            platform,
            serviceType,
            quality: norm.quality ?? null,
            speed: norm.speed ?? null,
            refillDays: norm.refillDays ?? null,
            geoTarget: norm.geoTarget ?? null,
            durationMinutes: norm.durationMinutes ?? null,
            watchDurationSec: norm.watchDurationSec ?? null,
          },
          create: {
            service: { connect: { id: serviceId } },
            platform,
            serviceType,
            quality: norm.quality ?? null,
            speed: norm.speed ?? null,
            refillDays: norm.refillDays ?? null,
            geoTarget: norm.geoTarget ?? null,
            durationMinutes: norm.durationMinutes ?? null,
            watchDurationSec: norm.watchDurationSec ?? null,
          },
        });
        normalizedCount++;
      } catch (innerErr) {
        console.error(`Norm save failed [${serviceId}]:`, innerErr instanceof Error ? innerErr.message : innerErr);
      }
    };

    let roundSaved = 0;
    try {
      await normalizeServices(
        unnormalized.map((s, i) => ({
          externalId: String(i),
          name: s.name,
          category: s.category,
        })),
        50,
        (completed, total) => {
          onProgress({
            type: "progress",
            provider: provider.name,
            current: completed,
            total,
            step: "ai",
          });
        },
        async (batchResults) => {
          for (const norm of batchResults) {
            await saveNormResult(norm);
            roundSaved++;
          }
          onProgress({
            type: "step",
            provider: provider.name,
            step: "ai_save",
            detail: `บันทึกแล้ว ${normalizedCount} รายการ`,
          });
        },
        (logMsg) => {
          onProgress({
            type: "step",
            provider: provider.name,
            step: "ai",
            detail: logMsg,
          });
        }
      );
    } catch (err) {
      console.error(`Normalization round ${round} error:`, err instanceof Error ? err.message : err);
    }

    if (roundSaved === 0) {
      onProgress({
        type: "step",
        provider: provider.name,
        step: "ai",
        detail: `รอบที่ ${round}: ไม่สามารถวิเคราะห์เพิ่มได้ หยุดลอง`,
      });
      break;
    }

    const remaining = await prisma.rawService.count({
      where: { providerId: provider.id, normalized: null },
    });

    if (remaining > 0 && round < MAX_AI_ROUNDS) {
      onProgress({
        type: "step",
        provider: provider.name,
        step: "ai",
        detail: `เหลือ ${remaining} บริการที่ยังไม่ได้วิเคราะห์ → ลองอีกรอบอัตโนมัติ...`,
      });
      await new Promise((r) => setTimeout(r, 5000));
    } else if (remaining > 0) {
      onProgress({
        type: "step",
        provider: provider.name,
        step: "ai",
        detail: `เหลือ ${remaining} บริการที่ยังวิเคราะห์ไม่สำเร็จ (ครบ ${MAX_AI_ROUNDS} รอบแล้ว)`,
      });
    }
  }

  await prisma.provider.update({
    where: { id: provider.id },
    data: { lastSyncedAt: new Date() },
  });

  return {
    providerId: provider.id,
    providerName: provider.name,
    servicesFound: result.services.length,
    servicesUpserted: upserted,
    priceChanges: recorded,
    normalized: normalizedCount,
  };
}

export async function syncProvider(providerId: string): Promise<SyncResult> {
  return syncProviderWithProgress(providerId, () => {});
}

export async function syncAllProviders() {
  const providers = await prisma.provider.findMany({
    where: { active: true },
  });

  const results: SyncResult[] = [];

  for (const provider of providers) {
    try {
      const result = await syncProvider(provider.id);
      results.push(result);
    } catch (err) {
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        servicesFound: 0,
        servicesUpserted: 0,
        priceChanges: 0,
        normalized: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const matchResult = await matchAndGroupServices();

  return { providers: results, matching: matchResult };
}
