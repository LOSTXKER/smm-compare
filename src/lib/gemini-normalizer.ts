import { GoogleGenerativeAI } from "@google/generative-ai";

export interface NormalizedServiceData {
  externalId: string;
  platform: string;
  serviceType: string;
  quality: string | null;
  speed: string | null;
  refillDays: number | null;
  geoTarget: string | null;
  durationMinutes: number | null;
  watchDurationSec: number | null;
}

const SYSTEM_PROMPT = `You are a service classifier for Social Media Marketing (SMM) panels.
Given a list of SMM services (with name and category), extract structured attributes for each.

IMPORTANT RULES:
- platform: lowercase, one of: instagram, facebook, tiktok, youtube, twitter, telegram, spotify, threads, discord, linkedin, pinterest, snapchat, twitch, website, app, other
- serviceType: lowercase, one of: followers, likes, views, comments, shares, reactions, subscribers, members, watch_time, saves, impressions, reach, clicks, plays, reposts, story_views, live_views, other
- quality: lowercase or null. Examples: real, bot, premium, mixed, high_quality, organic
- speed: lowercase or null. Examples: instant, fast, slow, gradual, drip_feed
- refillDays: integer or null. Extract from names like "30 days refill", "ประกัน 30 วัน", "lifetime", "ตลอดชีพ", "no refill", "ไม่มีประกัน". "lifetime"/"ตลอดชีพ" = 365, "no refill"/"ไม่มีประกัน" = null
- geoTarget: lowercase or null. Examples: worldwide, thai, usa, india, brazil, arab, turkish
- durationMinutes: integer or null. For live stream services ONLY. Extract the stream duration in minutes. Examples: "15 นาที" = 15, "1 ชั่วโมง" = 60, "2 hours" = 120, "360 Min" = 360. Set null for non-live services.
- watchDurationSec: integer or null. For video view services ONLY. Extract the minimum watch duration in seconds. Examples: "3 วินาที" = 3, "10 วินาที" = 10, "30 วินาที" = 30, "1 นาที" = 60, "3 นาที" = 180, "6 นาที" = 360. Set null if not specified.

Return ONLY valid JSON array. Each item must have ALL fields: externalId, platform, serviceType, quality, speed, refillDays, geoTarget, durationMinutes, watchDurationSec.
Do not add any explanation or markdown formatting.`;

export interface ServiceInput {
  externalId: string;
  name: string;
  category: string;
}

const BATCH_TIMEOUT_MS = 45_000;
const CONCURRENCY = 3;
const COOLDOWN_AFTER_TIMEOUT_MS = 10_000;
const COOLDOWN_BETWEEN_CHUNKS_MS = 2_000;

function raceTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} exceeded ${ms}ms`));
    }, ms);

    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function processSingleBatch(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  batch: ServiceInput[],
  batchLabel: string
): Promise<{ results: NormalizedServiceData[]; timedOut: boolean }> {
  const input = batch.map((s) => ({
    externalId: s.externalId,
    name: s.name,
    category: s.category,
  }));

  const prompt = `${SYSTEM_PROMPT}\n\nServices to classify:\n${JSON.stringify(input, null, 2)}`;

  const controller = new AbortController();
  try {
    const result = await raceTimeout(
      model.generateContent(prompt, { signal: controller.signal }),
      BATCH_TIMEOUT_MS,
      batchLabel
    );
    const text = result.response.text();
    const parsed = JSON.parse(text) as NormalizedServiceData[];
    return { results: Array.isArray(parsed) ? parsed : [], timedOut: false };
  } catch (err) {
    controller.abort();
    const msg = err instanceof Error ? err.message : String(err);
    const timedOut = msg.includes("Timeout") || msg.includes("aborted");
    console.error(`${batchLabel} failed: ${msg}`);
    return { results: [], timedOut };
  }
}

export function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });
}

export async function normalizeServices(
  services: ServiceInput[],
  batchSize = 50,
  onProgress?: (completed: number, total: number) => void,
  onBatchResult?: (results: NormalizedServiceData[]) => Promise<void>,
  onLog?: (message: string) => void
): Promise<NormalizedServiceData[]> {
  const model = createModel();

  const batches: { batch: ServiceInput[]; label: string }[] = [];
  for (let i = 0; i < services.length; i += batchSize) {
    batches.push({
      batch: services.slice(i, i + batchSize),
      label: `batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(services.length / batchSize)}`,
    });
  }

  const results: NormalizedServiceData[] = [];
  let completedServices = 0;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((b) => processSingleBatch(model, b.batch, b.label))
    );

    let hadTimeout = false;
    for (const cr of chunkResults) {
      if (cr.timedOut) hadTimeout = true;
      if (cr.results.length > 0) {
        results.push(...cr.results);
        if (onBatchResult) {
          await onBatchResult(cr.results);
        }
      }
    }

    completedServices += chunk.reduce((sum, b) => sum + b.batch.length, 0);
    onProgress?.(completedServices, services.length);

    if (i + CONCURRENCY < batches.length) {
      if (hadTimeout) {
        onLog?.(`Gemini rate limit detected, cooling down ${COOLDOWN_AFTER_TIMEOUT_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, COOLDOWN_AFTER_TIMEOUT_MS));
      } else {
        await new Promise((r) => setTimeout(r, COOLDOWN_BETWEEN_CHUNKS_MS));
      }
    }
  }

  return results;
}
