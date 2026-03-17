import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalProviders, totalServices, totalGroups] = await Promise.all([
    prisma.provider.count({ where: { active: true } }),
    prisma.rawService.count(),
    prisma.serviceGroup.count(),
  ]);

  const groups = await prisma.serviceGroup.findMany({
    include: {
      services: {
        include: {
          provider: { select: { isOwner: true } },
        },
      },
    },
  });

  let cheaperCount = 0;
  let moreExpensiveCount = 0;
  let comparableGroups = 0;

  for (const group of groups) {
    const ownerService = group.services.find((s) => s.provider.isOwner);
    const competitors = group.services.filter((s) => !s.provider.isOwner);

    if (!ownerService || competitors.length === 0) continue;

    comparableGroups++;
    const ownerRate = Number(ownerService.rate);
    const avgCompetitorRate =
      competitors.reduce((sum, s) => sum + Number(s.rate), 0) /
      competitors.length;

    if (ownerRate < avgCompetitorRate) {
      cheaperCount++;
    } else if (ownerRate > avgCompetitorRate) {
      moreExpensiveCount++;
    }
  }

  const cheaperPercent =
    comparableGroups > 0
      ? Math.round((cheaperCount / comparableGroups) * 100)
      : 0;

  const topExpensive = await prisma.serviceGroup.findMany({
    include: {
      services: {
        include: {
          provider: { select: { name: true, isOwner: true, currency: true } },
        },
        orderBy: { rate: "asc" },
      },
    },
    take: 100,
  });

  const expensiveList = topExpensive
    .map((group) => {
      const ours = group.services.find((s) => s.provider.isOwner);
      const cheapest = group.services[0];
      if (!ours || !cheapest || cheapest.provider.isOwner) return null;

      const diff =
        ((Number(ours.rate) - Number(cheapest.rate)) /
          Number(cheapest.rate)) *
        100;

      return {
        groupId: group.id,
        label: group.label,
        ourRate: Number(ours.rate),
        cheapestRate: Number(cheapest.rate),
        cheapestProvider: cheapest.provider.name,
        diffPercent: Math.round(diff * 10) / 10,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => (b?.diffPercent ?? 0) - (a?.diffPercent ?? 0)
    )
    .slice(0, 10);

  return NextResponse.json({
    totalProviders,
    totalServices,
    totalGroups,
    comparableGroups,
    cheaperPercent,
    cheaperCount,
    moreExpensiveCount,
    topExpensive: expensiveList,
  });
}
