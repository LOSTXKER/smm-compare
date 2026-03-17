import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const platformFilter = req.nextUrl.searchParams.get("platform") || "";
  const marginStr = req.nextUrl.searchParams.get("margin") || "5";
  const margin = parseFloat(marginStr) / 100;

  const groupWhere: Record<string, unknown> = {};
  if (platformFilter) groupWhere.platform = platformFilter;

  const groups = await prisma.serviceGroup.findMany({
    where: groupWhere,
    include: {
      services: {
        include: {
          provider: {
            select: { id: true, name: true, isOwner: true, currency: true },
          },
        },
        orderBy: { rate: "asc" },
      },
    },
  });

  const platforms = await prisma.serviceGroup.findMany({
    select: { platform: true },
    distinct: ["platform"],
    orderBy: { platform: "asc" },
  });

  const recommendations = groups
    .map((group) => {
      const ourService = group.services.find((s) => s.provider.isOwner);
      const competitors = group.services.filter((s) => !s.provider.isOwner);

      if (!ourService || competitors.length === 0) return null;

      const ourRate = Number(ourService.rate);
      const cheapestCompetitor = competitors[0];
      const cheapestRate = Number(cheapestCompetitor.rate);
      const avgCompetitorRate = competitors.reduce((s, c) => s + Number(c.rate), 0) / competitors.length;

      const suggestedRate = cheapestRate * (1 - margin);
      const diffFromCheapest = ourRate > 0 ? ((ourRate - cheapestRate) / ourRate) * 100 : 0;

      return {
        groupId: group.id,
        label: group.label,
        platform: group.platform,
        serviceType: group.serviceType,
        ourRate,
        ourServiceName: ourService.name,
        cheapestRate,
        cheapestProvider: cheapestCompetitor.provider.name,
        avgCompetitorRate: Math.round(avgCompetitorRate * 100) / 100,
        suggestedRate: Math.round(suggestedRate * 100) / 100,
        diffFromCheapest: Math.round(diffFromCheapest * 10) / 10,
        status:
          ourRate <= suggestedRate
            ? "good"
            : ourRate <= cheapestRate
              ? "ok"
              : "expensive",
        competitorCount: competitors.length,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => (b!.diffFromCheapest ?? 0) - (a!.diffFromCheapest ?? 0)
    );

  const total = recommendations.length;
  const expensive = recommendations.filter((r) => r!.status === "expensive").length;
  const ok = recommendations.filter((r) => r!.status === "ok").length;
  const good = recommendations.filter((r) => r!.status === "good").length;

  return NextResponse.json({
    recommendations,
    platforms: platforms.map((p) => p.platform),
    summary: { total, expensive, ok, good },
  });
}
