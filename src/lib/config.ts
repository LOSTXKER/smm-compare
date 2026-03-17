import { prisma } from "./prisma";

export const CONFIG_DEFAULTS: Record<string, string> = {
  ai_batch_size: "25",
  ai_concurrency: "2",
  ai_timeout_sec: "90",
  ai_max_rounds: "5",
  ai_model: "gemini-2.5-flash",
  sync_cron_schedule: "0 * * * *",
};

let cache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60_000;

export async function getAllConfig(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL_MS) return cache;

  const rows = await prisma.systemConfig.findMany();
  const result: Record<string, string> = { ...CONFIG_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }

  cache = result;
  cacheTime = now;
  return result;
}

export async function getConfig(key: string, fallback?: string): Promise<string> {
  const all = await getAllConfig();
  return all[key] ?? fallback ?? CONFIG_DEFAULTS[key] ?? "";
}

export async function getConfigInt(key: string, fallback?: number): Promise<number> {
  const val = await getConfig(key);
  const n = parseInt(val, 10);
  return isNaN(n) ? (fallback ?? parseInt(CONFIG_DEFAULTS[key] ?? "0", 10)) : n;
}

export function invalidateConfigCache() {
  cache = null;
}
