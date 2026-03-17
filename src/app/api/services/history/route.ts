import { NextRequest, NextResponse } from "next/server";
import { getGroupPriceHistory } from "@/lib/price-history";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const days = parseInt(searchParams.get("days") || "30");

  if (!groupId) {
    return NextResponse.json(
      { error: "groupId is required" },
      { status: 400 }
    );
  }

  const history = await getGroupPriceHistory(groupId, days);
  return NextResponse.json(history);
}
