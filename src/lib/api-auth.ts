import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }
  return null;
}
