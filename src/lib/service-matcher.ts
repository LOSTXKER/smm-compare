import { prisma } from "./prisma";

export async function matchAndGroupServices() {
  const unmatched = await prisma.rawService.findMany({
    where: {
      groupId: null,
      normalized: { isNot: null },
    },
    include: { normalized: true },
  });

  if (unmatched.length === 0) return { matched: 0, newGroups: 0 };

  let matched = 0;
  let newGroups = 0;

  for (const service of unmatched) {
    const norm = service.normalized;
    if (!norm) continue;

    let group = await prisma.serviceGroup.findFirst({
      where: {
        platform: norm.platform,
        serviceType: norm.serviceType,
        quality: norm.quality,
        refillDays: norm.refillDays,
        verified: false,
      },
    });

    if (!group) {
      const qualityLabel = norm.quality ? ` ${norm.quality}` : "";
      const refillLabel = norm.refillDays
        ? ` ${norm.refillDays}d refill`
        : "";
      const label = `${capitalize(norm.platform)} ${capitalize(norm.serviceType)}${qualityLabel}${refillLabel}`;

      group = await prisma.serviceGroup.create({
        data: {
          label,
          platform: norm.platform,
          serviceType: norm.serviceType,
          quality: norm.quality,
          refillDays: norm.refillDays,
        },
      });
      newGroups++;
    }

    await prisma.rawService.update({
      where: { id: service.id },
      data: { groupId: group.id },
    });
    matched++;
  }

  return { matched, newGroups };
}

export async function reassignService(
  serviceId: string,
  newGroupId: string | null
) {
  return prisma.rawService.update({
    where: { id: serviceId },
    data: { groupId: newGroupId },
  });
}

export async function verifyGroup(groupId: string, verified: boolean) {
  return prisma.serviceGroup.update({
    where: { id: groupId },
    data: { verified },
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
