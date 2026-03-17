import { NextRequest, NextResponse } from "next/server";
import {
  fetchAndSaveRates,
  getAvailableCurrencies,
  getAllRates,
} from "@/lib/exchange-rate";

export async function GET() {
  const [currencies, rates] = await Promise.all([
    getAvailableCurrencies(),
    getAllRates(),
  ]);
  return NextResponse.json({ currencies, rates });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const base = (body.base as string) || "USD";

  try {
    const count = await fetchAndSaveRates(base);
    return NextResponse.json({ success: true, count, base });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch rates" },
      { status: 500 }
    );
  }
}
