import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface GroupDetail {
  groupId: string;
  label: string;
  platform: string;
  serviceType: string;
  ourRate: number;
  theirRate: number;
  diffPercent: number;
}

export async function GET(req: NextRequest) {
  const platformFilter = req.nextUrl.searchParams.get("platform") || "";

  const providers = await prisma.provider.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, isOwner: true, currency: true },
  });

  const ownerProvider = providers.find((p) => p.isOwner);
  if (!ownerProvider) {
    return NextResponse.json({ error: "ยังไม่มีเว็บของเรา", competitors: [] });
  }

  const groupWhere: Record<string, unknown> = {};
  if (platformFilter) groupWhere.platform = platformFilter;

  const groups = await prisma.serviceGroup.findMany({
    where: groupWhere,
    include: {
      services: {
        include: {
          provider: { select: { id: true, name: true, isOwner: true, currency: true } },
        },
      },
    },
  });

  const platforms = await prisma.serviceGroup.findMany({
    select: { platform: true },
    distinct: ["platform"],
    orderBy: { platform: "asc" },
  });

  const competitorStats = providers
    .filter((p) => !p.isOwner)
    .map((competitor) => {
      let cheaperThanUs = 0;
      let moreExpensive = 0;
      let samePrice = 0;
      let totalComparable = 0;
      let totalDiffPercent = 0;
      const platformBreakdown: Record<string, { cheaper: number; expensive: number; total: number }> = {};
      const exclusiveServices: string[] = [];
      const cheaperGroups: GroupDetail[] = [];
      const expensiveGroups: GroupDetail[] = [];

      for (const group of groups) {
        const ourService = group.services.find((s) => s.provider.isOwner);
        const theirService = group.services.find((s) => s.provider.id === competitor.id);

        if (theirService && !ourService) {
          exclusiveServices.push(group.label);
        }

        if (!ourService || !theirService) continue;

        totalComparable++;
        const ourRate = Number(ourService.rate);
        const theirRate = Number(theirService.rate);
        const plat = group.platform;
        const diffPercent = ourRate > 0 ? Math.round(((theirRate - ourRate) / ourRate) * 1000) / 10 : 0;

        const detail: GroupDetail = {
          groupId: group.id,
          label: group.label,
          platform: plat,
          serviceType: group.serviceType,
          ourRate,
          theirRate,
          diffPercent,
        };

        if (!platformBreakdown[plat]) {
          platformBreakdown[plat] = { cheaper: 0, expensive: 0, total: 0 };
        }
        platformBreakdown[plat].total++;

        if (theirRate < ourRate) {
          cheaperThanUs++;
          platformBreakdown[plat].cheaper++;
          cheaperGroups.push(detail);
        } else if (theirRate > ourRate) {
          moreExpensive++;
          platformBreakdown[plat].expensive++;
          expensiveGroups.push(detail);
        } else {
          samePrice++;
        }

        if (ourRate > 0) {
          totalDiffPercent += ((theirRate - ourRate) / ourRate) * 100;
        }
      }

      cheaperGroups.sort((a, b) => a.diffPercent - b.diffPercent);
      expensiveGroups.sort((a, b) => b.diffPercent - a.diffPercent);

      const avgDiffPercent = totalComparable > 0 ? totalDiffPercent / totalComparable : 0;
      const totalServices = groups.filter((g) =>
        g.services.some((s) => s.provider.id === competitor.id)
      ).length;

      return {
        id: competitor.id,
        name: competitor.name,
        slug: competitor.slug,
        currency: competitor.currency,
        totalServices,
        totalComparable,
        cheaperThanUs,
        moreExpensive,
        samePrice,
        avgDiffPercent: Math.round(avgDiffPercent * 10) / 10,
        platformBreakdown,
        exclusiveServices,
        exclusiveCount: exclusiveServices.length,
        cheaperGroups,
        expensiveGroups,
      };
    })
    .sort((a, b) => a.avgDiffPercent - b.avgDiffPercent);

  return NextResponse.json({
    owner: ownerProvider,
    competitors: competitorStats,
    platforms: platforms.map((p) => p.platform),
  });
}
