import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

type Decimal = Prisma.Decimal;

export async function recordPriceChanges(
  serviceUpdates: { serviceId: string; newRate: Decimal }[]
) {
  let recorded = 0;

  for (const update of serviceUpdates) {
    const lastRecord = await prisma.priceHistory.findFirst({
      where: { serviceId: update.serviceId },
      orderBy: { recordedAt: "desc" },
    });

    const shouldRecord =
      !lastRecord || !lastRecord.rate.equals(update.newRate);

    if (shouldRecord) {
      await prisma.priceHistory.create({
        data: {
          serviceId: update.serviceId,
          rate: update.newRate,
        },
      });
      recorded++;
    }
  }

  return { recorded };
}

export async function getServicePriceHistory(
  serviceId: string,
  days = 30
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.priceHistory.findMany({
    where: {
      serviceId,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "asc" },
  });
}

export async function getGroupPriceHistory(groupId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const services = await prisma.rawService.findMany({
    where: { groupId },
    include: {
      provider: { select: { name: true, slug: true, isOwner: true } },
      priceHistory: {
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
      },
    },
  });

  return services.map((s) => ({
    serviceId: s.id,
    providerName: s.provider.name,
    providerSlug: s.provider.slug,
    isOwner: s.provider.isOwner,
    currentRate: s.rate,
    history: s.priceHistory,
  }));
}
