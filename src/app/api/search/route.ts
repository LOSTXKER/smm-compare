import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const services = await prisma.rawService.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { externalId: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      provider: { select: { name: true, isOwner: true, currency: true, slug: true } },
      normalized: { select: { platform: true, serviceType: true } },
      group: { select: { id: true, label: true } },
    },
    orderBy: { rate: "asc" },
    take: 50,
  });

  const grouped = new Map<string, typeof services>();
  for (const svc of services) {
    const key = svc.provider.name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(svc);
  }

  const results = Array.from(grouped.entries()).map(([provider, svcs]) => ({
    provider,
    isOwner: svcs[0].provider.isOwner,
    services: svcs.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      name: s.name,
      rate: s.rate.toString(),
      currency: s.provider.currency,
      platform: s.normalized?.platform ?? null,
      serviceType: s.normalized?.serviceType ?? null,
      groupId: s.group?.id ?? null,
      groupLabel: s.group?.label ?? null,
    })),
  }));

  return NextResponse.json({ results, total: services.length });
}
