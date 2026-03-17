import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export const maxDuration = 300;

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ type: "step", detail: "กำลังค้นหาบริการที่ยังไม่ได้จับคู่..." });

        const unmatched = await prisma.rawService.findMany({
          where: {
            groupId: null,
            normalized: { isNot: null },
          },
          include: { normalized: true },
        });

        if (unmatched.length === 0) {
          send({ type: "done", matched: 0, newGroups: 0, detail: "ไม่มีบริการใหม่ที่ต้องจับคู่" });
          controller.close();
          return;
        }

        send({ type: "step", detail: `พบ ${unmatched.length} บริการที่ต้องจับคู่` });

        let matched = 0;
        let newGroups = 0;

        for (const service of unmatched) {
          const norm = service.normalized;
          if (!norm) continue;

          let group = await prisma.serviceGroup.findFirst({
            where: {
              platform: norm.platform,
              serviceType: norm.serviceType,
              quality: norm.quality,
              refillDays: norm.refillDays,
              verified: false,
            },
          });

          if (!group) {
            const qualityLabel = norm.quality ? ` ${norm.quality}` : "";
            const refillLabel = norm.refillDays ? ` ${norm.refillDays}d refill` : "";
            const label = `${norm.platform.charAt(0).toUpperCase() + norm.platform.slice(1)} ${norm.serviceType.charAt(0).toUpperCase() + norm.serviceType.slice(1)}${qualityLabel}${refillLabel}`;

            group = await prisma.serviceGroup.create({
              data: {
                label,
                platform: norm.platform,
                serviceType: norm.serviceType,
                quality: norm.quality,
                refillDays: norm.refillDays,
              },
            });
            newGroups++;
          }

          await prisma.rawService.update({
            where: { id: service.id },
            data: { groupId: group.id },
          });
          matched++;

          if (matched % 20 === 0) {
            send({
              type: "progress",
              current: matched,
              total: unmatched.length,
              newGroups,
              detail: `จับคู่แล้ว ${matched}/${unmatched.length} (กลุ่มใหม่ ${newGroups})`,
            });
          }
        }

        send({
          type: "done",
          matched,
          newGroups,
          detail: `เสร็จสิ้น! จับคู่ ${matched} บริการ, สร้างกลุ่มใหม่ ${newGroups} กลุ่ม`,
        });
      } catch (err) {
        send({ type: "error", detail: err instanceof Error ? err.message : "Match failed" });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
