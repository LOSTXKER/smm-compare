import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const providers = await prisma.provider.findMany({
    include: {
      _count: { select: { services: true } },
      healthChecks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ isOwner: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, apiUrl, apiKey, currency, isOwner } = body;

  if (!name || !apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "name, apiUrl, and apiKey are required" },
      { status: 400 }
    );
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = await prisma.provider.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Provider with this name already exists" },
      { status: 409 }
    );
  }

  const provider = await prisma.provider.create({
    data: {
      name,
      slug,
      apiUrl,
      apiKey,
      currency: currency || "USD",
      isOwner: isOwner || false,
    },
  });

  return NextResponse.json(provider, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, apiUrl, apiKey, currency, isOwner, active } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const provider = await prisma.provider.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(apiUrl !== undefined && { apiUrl }),
      ...(apiKey !== undefined && { apiKey }),
      ...(currency !== undefined && { currency }),
      ...(isOwner !== undefined && { isOwner }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json(provider);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.provider.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
