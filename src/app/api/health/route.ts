import { NextRequest, NextResponse } from "next/server";
import { checkAllProviders, getProviderUptime } from "@/lib/health-monitor";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId");
  const days = parseInt(searchParams.get("days") || "7");

  if (providerId) {
    const uptime = await getProviderUptime(providerId, days);
    return NextResponse.json(uptime);
  }

  const results = await checkAllProviders();
  return NextResponse.json(results);
}
