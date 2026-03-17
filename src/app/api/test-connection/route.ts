import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/smm-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiUrl, apiKey } = body;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "apiUrl and apiKey are required" },
      { status: 400 }
    );
  }

  const result = await testConnection(apiUrl, apiKey);
  return NextResponse.json(result);
}
