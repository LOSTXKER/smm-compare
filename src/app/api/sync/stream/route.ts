import { prisma } from "@/lib/prisma";
import { syncProviderWithProgress, type ProgressEvent, type SyncResult } from "@/lib/sync";
import { matchAndGroupServices } from "@/lib/service-matcher";

export const maxDuration = 300;

export async function POST() {
  const providers = await prisma.provider.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: ProgressEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

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

      send({ type: "matching", detail: "จับคู่บริการข้ามเว็บ..." });

      try {
        const matchResult = await matchAndGroupServices();
        send({ type: "done", results, matchResult });
      } catch {
        send({ type: "done", results, matchResult: { matched: 0, newGroups: 0 } });
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
