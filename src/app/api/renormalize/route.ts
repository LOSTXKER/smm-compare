import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST() {
  const deleted = await prisma.normalizedAttribute.deleteMany({});
  return NextResponse.json({ deleted: deleted.count, message: "รีเซ็ตข้อมูลวิเคราะห์เรียบร้อย กรุณาซิงค์ใหม่เพื่อวิเคราะห์อีกครั้ง" });
}
