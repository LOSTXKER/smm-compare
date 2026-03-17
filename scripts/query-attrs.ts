import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL!;
console.log('Connecting to:', url.replace(/:[^:@]+@/, ':***@'));
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const platforms = await prisma.normalizedAttribute.findMany({
    select: { platform: true },
    distinct: ['platform'],
    orderBy: { platform: 'asc' },
  });
  console.log('\n=== PLATFORMS ===');
  console.log(platforms.map(p => p.platform).join(', '));

  const types = await prisma.normalizedAttribute.findMany({
    select: { serviceType: true },
    distinct: ['serviceType'],
    orderBy: { serviceType: 'asc' },
  });
  console.log('\n=== SERVICE TYPES ===');
  console.log(types.map(t => t.serviceType).join(', '));

  const qualities = await prisma.normalizedAttribute.findMany({
    select: { quality: true },
    distinct: ['quality'],
    orderBy: { quality: 'asc' },
  });
  console.log('\n=== QUALITY VALUES ===');
  console.log(qualities.map(q => q.quality).join(', '));

  const speeds = await prisma.normalizedAttribute.findMany({
    select: { speed: true },
    distinct: ['speed'],
    orderBy: { speed: 'asc' },
  });
  console.log('\n=== SPEED VALUES ===');
  console.log(speeds.map(s => s.speed).join(', '));

  const refills = await prisma.normalizedAttribute.findMany({
    select: { refillDays: true },
    distinct: ['refillDays'],
    orderBy: { refillDays: 'asc' },
  });
  console.log('\n=== REFILL DAYS ===');
  console.log(refills.map(r => r.refillDays).join(', '));

  const geos = await prisma.normalizedAttribute.findMany({
    select: { geoTarget: true },
    distinct: ['geoTarget'],
    orderBy: { geoTarget: 'asc' },
  });
  console.log('\n=== GEO TARGETS ===');
  console.log(geos.map(g => g.geoTarget).join(', '));

  const combos = await prisma.$queryRaw`
    SELECT platform, "serviceType", COUNT(*)::int as count 
    FROM "NormalizedAttribute" 
    GROUP BY platform, "serviceType" 
    ORDER BY count DESC 
    LIMIT 30
  `;
  console.log('\n=== TOP PLATFORM+TYPE COMBOS ===');
  console.log(combos);

  const fbLive = await prisma.normalizedAttribute.findMany({
    where: { serviceType: 'live_views' },
    include: { service: { select: { name: true, category: true, provider: { select: { name: true } } } } },
    take: 20,
  });
  console.log('\n=== LIVE_VIEWS SERVICES ===');
  for (const s of fbLive) {
    console.log(`[${s.service.provider.name}] ${s.service.name} | quality=${s.quality} speed=${s.speed} refill=${s.refillDays} geo=${s.geoTarget}`);
  }

  const followers = await prisma.normalizedAttribute.findMany({
    where: { serviceType: 'followers', platform: 'instagram' },
    include: { service: { select: { name: true, category: true, provider: { select: { name: true } } } } },
    take: 20,
  });
  console.log('\n=== INSTAGRAM FOLLOWERS ===');
  for (const s of followers) {
    console.log(`[${s.service.provider.name}] ${s.service.name} | quality=${s.quality} speed=${s.speed} refill=${s.refillDays} geo=${s.geoTarget}`);
  }

  const watchTime = await prisma.normalizedAttribute.findMany({
    where: { serviceType: 'watch_time' },
    include: { service: { select: { name: true, category: true, provider: { select: { name: true } } } } },
    take: 20,
  });
  console.log('\n=== WATCH_TIME SERVICES ===');
  for (const s of watchTime) {
    console.log(`[${s.service.provider.name}] ${s.service.name} | quality=${s.quality} speed=${s.speed} refill=${s.refillDays} geo=${s.geoTarget}`);
  }

  const views = await prisma.normalizedAttribute.findMany({
    where: { serviceType: 'views', platform: 'facebook' },
    include: { service: { select: { name: true, category: true, provider: { select: { name: true } } } } },
    take: 20,
  });
  console.log('\n=== FACEBOOK VIEWS ===');
  for (const s of views) {
    console.log(`[${s.service.provider.name}] ${s.service.name} | quality=${s.quality} speed=${s.speed} refill=${s.refillDays} geo=${s.geoTarget}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
