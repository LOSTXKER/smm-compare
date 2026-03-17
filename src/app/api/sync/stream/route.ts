import { prisma } from "@/lib/prisma";
import { syncProviderWithProgress, type ProgressEvent, type SyncResult } from "@/lib/sync";
import { matchAndGroupServices } from "@/lib/service-matcher";
import { requireAdmin } from "@/lib/api-auth";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { providerId } = body as { providerId?: string };

  let providers;
  if (providerId) {
    const single = await prisma.provider.findUnique({ where: { id: providerId } });
    providers = single ? [single] : [];
  } else {
    providers = await prisma.provider.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let streamOpen = true;

      function send(event: ProgressEvent) {
        if (!streamOpen) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          streamOpen = false;
        }
      }

      function sendKeepAlive() {
        if (!streamOpen) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          streamOpen = false;
        }
      }

      const keepAliveInterval = setInterval(sendKeepAlive, 15_000);

      try {
        send({
          type: "step",
          provider: "",
          step: "start",
          detail: `เริ่มซิงค์ ${providers.length} เว็บ`,
        });

        const results: SyncResult[] = [];

        for (let i = 0; i < providers.length; i++) {
          const provider = providers[i];

          send({
            type: "step",
            provider: provider.name,
            step: "start_provider",
            detail: `(${i + 1}/${providers.length}) เริ่มซิงค์ ${provider.name}`,
          });

          try {
            const result = await syncProviderWithProgress(provider.id, send);
            results.push(result);
            send({ type: "provider_done", result });
          } catch (err) {
            const errResult: SyncResult = {
              providerId: provider.id,
              providerName: provider.name,
              servicesFound: 0,
              servicesUpserted: 0,
              priceChanges: 0,
              normalized: 0,
              error: err instanceof Error ? err.message : "Unknown error",
            };
            results.push(errResult);
            send({ type: "provider_done", result: errResult });
          }
        }

        if (!providerId) {
          send({ type: "matching", detail: "จับคู่บริการข้ามเว็บ..." });
        }

        try {
          const matchResult = await matchAndGroupServices();
          send({ type: "done", results, matchResult });
        } catch {
          send({ type: "done", results, matchResult: { matched: 0, newGroups: 0 } });
        }
      } finally {
        clearInterval(keepAliveInterval);
        if (streamOpen) controller.close();
      }
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
