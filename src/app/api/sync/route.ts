import { NextRequest, NextResponse } from "next/server";
import { syncAllProviders, syncProvider } from "@/lib/sync";
import { requireAdmin } from "@/lib/api-auth";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("authorization");
  const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const denied = await requireAdmin();
    if (denied) return denied;
  }

  const body = await req.json().catch(() => ({}));
  const { providerId } = body as { providerId?: string };

  try {
    if (providerId) {
      const result = await syncProvider(providerId);
      return NextResponse.json(result);
    }

    const results = await syncAllProviders();
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
