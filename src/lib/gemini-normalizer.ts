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

interface ServiceInput {
  externalId: string;
  name: string;
  category: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function processSingleBatch(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  batch: ServiceInput[],
  batchLabel: string,
  retries = 1
): Promise<NormalizedServiceData[]> {
  const input = batch.map((s) => ({
    externalId: s.externalId,
    name: s.name,
    category: s.category,
  }));

  const prompt = `${SYSTEM_PROMPT}\n\nServices to classify:\n${JSON.stringify(input, null, 2)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await withTimeout(
        model.generateContent(prompt),
        60_000,
        batchLabel
      );
      const text = result.response.text();
      const parsed = JSON.parse(text) as NormalizedServiceData[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${batchLabel} attempt ${attempt + 1} failed: ${msg}`);

      if (attempt < retries) {
        const backoff = 2000 * (attempt + 1);
        console.log(`${batchLabel}: retrying in ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  return [];
}

export async function normalizeServices(
  services: ServiceInput[],
  batchSize = 50,
  onProgress?: (completed: number, total: number) => void,
  onBatchResult?: (results: NormalizedServiceData[]) => Promise<void>
): Promise<NormalizedServiceData[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const batches: { batch: ServiceInput[]; label: string }[] = [];
  for (let i = 0; i < services.length; i += batchSize) {
    batches.push({
      batch: services.slice(i, i + batchSize),
      label: `batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(services.length / batchSize)}`,
    });
  }

  const concurrency = 2;
  const results: NormalizedServiceData[] = [];
  let completedServices = 0;

  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((b) => processSingleBatch(model, b.batch, b.label))
    );
    for (const r of chunkResults) {
      results.push(...r);
      if (onBatchResult && r.length > 0) {
        await onBatchResult(r);
      }
    }

    completedServices += chunk.reduce((sum, b) => sum + b.batch.length, 0);
    onProgress?.(completedServices, services.length);

    if (i + concurrency < batches.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}
