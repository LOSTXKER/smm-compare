import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name, role } = body;

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "กรุณากรอกข้อมูลให้ครบ" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "อีเมลนี้ถูกใช้แล้ว" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hash, name, role: role || "admin" },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, email, name, role, active, password } = body;

  if (!id) {
    return NextResponse.json({ error: "ไม่พบ ID" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (email !== undefined) data.email = email;
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ไม่พบ ID" }, { status: 400 });
  }

  const count = await prisma.user.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: "ไม่สามารถลบผู้ใช้คนสุดท้ายได้" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
