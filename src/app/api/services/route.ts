import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const serviceType = searchParams.get("serviceType");
  const groupId = searchParams.get("groupId");
  const search = searchParams.get("search");
  const mode = searchParams.get("mode") || "detailed";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Custom mode filter params
  const filterQuality = searchParams.get("filterQuality");
  const filterSpeed = searchParams.get("filterSpeed");
  const filterRefill = searchParams.get("filterRefill");
  const filterGeo = searchParams.get("filterGeo");
  const filterDuration = searchParams.get("filterDuration");
  const filterWatchDuration = searchParams.get("filterWatchDuration");

  if (groupId) {
    const group = await prisma.serviceGroup.findUnique({
      where: { id: groupId },
      include: {
        services: {
          include: {
            provider: {
              select: { name: true, slug: true, isOwner: true, currency: true },
            },
            normalized: true,
          },
          orderBy: { rate: "asc" },
        },
      },
    });

    return NextResponse.json(group);
  }

  if (mode === "broad") {
    return handleBroadMode({ platform, serviceType, search, page, limit });
  }

  if (mode === "custom") {
    return handleCustomMode({
      platform, serviceType, search, page, limit,
      filterQuality, filterSpeed, filterRefill, filterGeo, filterDuration, filterWatchDuration,
    });
  }

  const where = {
    ...(platform && { platform }),
    ...(serviceType && { serviceType }),
    ...(search && {
      label: { contains: search, mode: "insensitive" as const },
    }),
  };

  const [groups, total] = await Promise.all([
    prisma.serviceGroup.findMany({
      where,
      include: {
        services: {
          include: {
            provider: {
              select: { name: true, slug: true, isOwner: true, currency: true },
            },
          },
          orderBy: { rate: "asc" },
        },
        _count: { select: { services: true } },
      },
      orderBy: { label: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.serviceGroup.count({ where }),
  ]);

  const platforms = await prisma.serviceGroup.findMany({
    select: { platform: true },
    distinct: ["platform"],
    orderBy: { platform: "asc" },
  });

  const serviceTypes = await prisma.serviceGroup.findMany({
    select: { serviceType: true },
    distinct: ["serviceType"],
    orderBy: { serviceType: "asc" },
  });

  return NextResponse.json({
    groups,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    filters: {
      platforms: platforms.map((p) => p.platform),
      serviceTypes: serviceTypes.map((s) => s.serviceType),
    },
  });
}

async function handleBroadMode({
  platform,
  serviceType,
  search,
  page,
  limit,
}: {
  platform: string | null;
  serviceType: string | null;
  search: string | null;
  page: number;
  limit: number;
}) {
  const normWhere = {
    ...(platform && { platform }),
    ...(serviceType && { serviceType }),
  };

  const distinctPairs = await prisma.normalizedAttribute.findMany({
    where: normWhere,
    select: { platform: true, serviceType: true },
    distinct: ["platform", "serviceType"],
    orderBy: [{ platform: "asc" }, { serviceType: "asc" }],
  });

  let filteredPairs = distinctPairs;
  if (search) {
    const q = search.toLowerCase();
    filteredPairs = distinctPairs.filter(
      (p) =>
        p.platform.toLowerCase().includes(q) ||
        p.serviceType.toLowerCase().includes(q)
    );
  }

  const total = filteredPairs.length;
  const pagedPairs = filteredPairs.slice((page - 1) * limit, page * limit);

  const groups = await Promise.all(
    pagedPairs.map(async (pair) => {
      const services = await prisma.rawService.findMany({
        where: {
          normalized: {
            platform: pair.platform,
            serviceType: pair.serviceType,
          },
        },
        include: {
          provider: {
            select: { name: true, slug: true, isOwner: true, currency: true },
          },
          normalized: true,
        },
        orderBy: { rate: "asc" },
      });

      const capitalize = (s: string) =>
        s.charAt(0).toUpperCase() + s.slice(1);

      return {
        id: `broad-${pair.platform}-${pair.serviceType}`,
        label: `${capitalize(pair.platform)} ${capitalize(pair.serviceType)}`,
        platform: pair.platform,
        serviceType: pair.serviceType,
        quality: null,
        refillDays: null,
        verified: false,
        services,
        _count: { services: services.length },
      };
    })
  );

  const platforms = await prisma.normalizedAttribute.findMany({
    select: { platform: true },
    distinct: ["platform"],
    orderBy: { platform: "asc" },
  });

  const serviceTypesResult = await prisma.normalizedAttribute.findMany({
    select: { serviceType: true },
    distinct: ["serviceType"],
    orderBy: { serviceType: "asc" },
  });

  return NextResponse.json({
    groups,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    filters: {
      platforms: platforms.map((p) => p.platform),
      serviceTypes: serviceTypesResult.map((s) => s.serviceType),
    },
  });
}

async function handleCustomMode({
  platform, serviceType, search, page, limit,
  filterQuality, filterSpeed, filterRefill, filterGeo, filterDuration, filterWatchDuration,
}: {
  platform: string | null;
  serviceType: string | null;
  search: string | null;
  page: number;
  limit: number;
  filterQuality: string | null;
  filterSpeed: string | null;
  filterRefill: string | null;
  filterGeo: string | null;
  filterDuration: string | null;
  filterWatchDuration: string | null;
}) {
  const normWhere: Record<string, unknown> = {};
  if (platform) normWhere.platform = platform;
  if (serviceType) normWhere.serviceType = serviceType;
  if (filterQuality === "null") normWhere.quality = null;
  else if (filterQuality) normWhere.quality = filterQuality;
  if (filterSpeed === "null") normWhere.speed = null;
  else if (filterSpeed) normWhere.speed = filterSpeed;
  if (filterRefill === "null") normWhere.refillDays = null;
  else if (filterRefill) normWhere.refillDays = parseInt(filterRefill);
  if (filterGeo === "null") normWhere.geoTarget = null;
  else if (filterGeo) normWhere.geoTarget = filterGeo;
  if (filterDuration === "null") normWhere.durationMinutes = null;
  else if (filterDuration) normWhere.durationMinutes = parseInt(filterDuration);
  if (filterWatchDuration === "null") normWhere.watchDurationSec = null;
  else if (filterWatchDuration) normWhere.watchDurationSec = parseInt(filterWatchDuration);

  const matchedNorms = await prisma.normalizedAttribute.findMany({
    where: normWhere,
    select: { serviceId: true },
  });

  const serviceIds = matchedNorms.map((n) => n.serviceId);

  const searchWhere = search
    ? { id: { in: serviceIds }, name: { contains: search, mode: "insensitive" as const } }
    : { id: { in: serviceIds } };

  const total = await prisma.rawService.count({ where: searchWhere });

  const services = await prisma.rawService.findMany({
    where: searchWhere,
    include: {
      provider: { select: { name: true, slug: true, isOwner: true, currency: true } },
      normalized: true,
    },
    orderBy: { rate: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Get available filter values for current platform+serviceType
  const baseWhere: Record<string, unknown> = {};
  if (platform) baseWhere.platform = platform;
  if (serviceType) baseWhere.serviceType = serviceType;

  const [
    availQualities, availSpeeds, availRefills, availGeos, availDurations, availWatchDurations,
    allPlatforms, allServiceTypes,
  ] = await Promise.all([
    prisma.normalizedAttribute.findMany({ where: baseWhere, select: { quality: true }, distinct: ["quality"], orderBy: { quality: "asc" } }),
    prisma.normalizedAttribute.findMany({ where: baseWhere, select: { speed: true }, distinct: ["speed"], orderBy: { speed: "asc" } }),
    prisma.normalizedAttribute.findMany({ where: baseWhere, select: { refillDays: true }, distinct: ["refillDays"], orderBy: { refillDays: "asc" } }),
    prisma.normalizedAttribute.findMany({ where: baseWhere, select: { geoTarget: true }, distinct: ["geoTarget"], orderBy: { geoTarget: "asc" } }),
    prisma.normalizedAttribute.findMany({ where: { ...baseWhere, durationMinutes: { not: null } }, select: { durationMinutes: true }, distinct: ["durationMinutes"], orderBy: { durationMinutes: "asc" } }),
    prisma.normalizedAttribute.findMany({ where: { ...baseWhere, watchDurationSec: { not: null } }, select: { watchDurationSec: true }, distinct: ["watchDurationSec"], orderBy: { watchDurationSec: "asc" } }),
    prisma.normalizedAttribute.findMany({ select: { platform: true }, distinct: ["platform"], orderBy: { platform: "asc" } }),
    prisma.normalizedAttribute.findMany({ select: { serviceType: true }, distinct: ["serviceType"], orderBy: { serviceType: "asc" } }),
  ]);

  return NextResponse.json({
    services,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    filters: {
      platforms: allPlatforms.map((p) => p.platform),
      serviceTypes: allServiceTypes.map((s) => s.serviceType),
    },
    availableFilters: {
      qualities: availQualities.map((q) => q.quality),
      speeds: availSpeeds.map((s) => s.speed),
      refillDays: availRefills.map((r) => r.refillDays),
      geoTargets: availGeos.map((g) => g.geoTarget),
      durationMinutes: availDurations.map((d) => d.durationMinutes),
      watchDurationSecs: availWatchDurations.map((w) => w.watchDurationSec),
    },
  });
}
