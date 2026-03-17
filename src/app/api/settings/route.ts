import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { getAllConfig, invalidateConfigCache, CONFIG_DEFAULTS } from "@/lib/config";

export async function GET() {
  const config = await getAllConfig();

  const [dbOk, lastSync] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    prisma.syncLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    config,
    defaults: CONFIG_DEFAULTS,
    system: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      dbConnected: dbOk,
      nodeEnv: process.env.NODE_ENV,
      lastSync: lastSync
        ? {
            providerName: lastSync.providerName,
            createdAt: lastSync.createdAt.toISOString(),
            error: lastSync.error,
            servicesFound: lastSync.servicesFound,
            priceChanges: lastSync.priceChanges,
          }
        : null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const updates = body as Record<string, string>;

  const allowedKeys = new Set(Object.keys(CONFIG_DEFAULTS));
  const ops = Object.entries(updates)
    .filter(([k]) => allowedKeys.has(k))
    .map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

  await Promise.all(ops);
  invalidateConfigCache();

  return NextResponse.json({ success: true });
}
