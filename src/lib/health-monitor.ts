import { prisma } from "./prisma";

export async function checkProviderHealth(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) throw new Error("Provider not found");

  const start = Date.now();
  let status = "online";
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(provider.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: provider.apiKey,
        action: "balance",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      status = "error";
      errorMsg = `HTTP ${res.status}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    if (message.includes("abort")) {
      status = "timeout";
      errorMsg = "Request timed out (10s)";
    } else {
      status = "offline";
      errorMsg = message;
    }
  }

  const responseMs = Date.now() - start;

  return prisma.healthCheck.create({
    data: { providerId, status, responseMs, errorMsg },
  });
}

export async function checkAllProviders() {
  const providers = await prisma.provider.findMany({
    where: { active: true },
  });

  const results = await Promise.allSettled(
    providers.map((p) => checkProviderHealth(p.id))
  );

  return results.map((r, i) => ({
    providerId: providers[i].id,
    providerName: providers[i].name,
    ...(r.status === "fulfilled"
      ? { status: r.value.status, responseMs: r.value.responseMs }
      : { status: "error", error: String(r.reason) }),
  }));
}

export async function getProviderUptime(providerId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const checks = await prisma.healthCheck.findMany({
    where: { providerId, checkedAt: { gte: since } },
    orderBy: { checkedAt: "asc" },
  });

  if (checks.length === 0) return { uptime: null, checks: [] };

  const online = checks.filter((c) => c.status === "online").length;
  const uptime = Math.round((online / checks.length) * 100);

  return { uptime, checks };
}
