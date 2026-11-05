// src/services/demo.js
// seed(companyId, actorId)  -> deterministic synthetic data (source_type = synthetic_demo), idempotent
// purge(companyId, actorId) -> deletes only synthetic_demo rows of that company
//
// What gets generated for the last 12 full months:
//   regional_metrics : every active wilaya x 3 metrics (leads, orders, revenue) x each month
//   social_posts     : 2 platforms (facebook, instagram) x 8 posts per month
//   sales_records    : one row per day
import crypto from 'node:crypto';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/AppError.js';
import { wilayaList } from './wilaya.js';
import { record } from './activity.js';

const SOURCE = 'synthetic_demo';
const BATCH = 500;
const DEMO_PLATFORMS = ['facebook', 'instagram'];
const CONTENT = ['image', 'video', 'carousel', 'reel', 'text'];

// Bigger markets get a larger multiplier; everything else is small but non-zero.
const WILAYA_WEIGHT = {
  '16': 3.0, '31': 2.6, '25': 2.0, '09': 1.6, '19': 1.6, '15': 1.5,
  '06': 1.4, '05': 1.4, '35': 1.3, '23': 1.2, '13': 1.0, '30': 1.0, '26': 1.0,
};

/** mulberry32: tiny seeded PRNG -> same companyId always produces the same data. */
function makeRng(seedText) {
  let a = crypto.createHash('sha1').update(seedText).digest().readUInt32LE(0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lastTwelveMonths() {
  const now = new Date();
  const months = [];
  for (let back = 12; back >= 1; back -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    months.push({ start, end, index: 12 - back, days: end.getUTCDate() });
  }
  return months;
}

// gentle growth + a seasonal wave so the analytics charts look believable
const trend = (i) => 1 + i * 0.03;
const season = (monthIndex0) => 1 + 0.18 * Math.sin((monthIndex0 / 12) * 2 * Math.PI);

async function insertAll(model, rows) {
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    count += (await prisma[model].createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true })).count;
  }
  return count;
}

export async function seed(companyId, actorId) {
  const [existingPosts, existingMetrics, existingSales] = await Promise.all([
    prisma.socialPost.count({ where: { companyId, sourceType: SOURCE } }),
    prisma.regionalMetric.count({ where: { companyId, sourceType: SOURCE } }),
    prisma.salesRecord.count({ where: { companyId, sourceType: SOURCE } }),
  ]);
  if (existingPosts + existingMetrics + existingSales > 0) {
    return { skipped: true, reason: 'Demo data already exists for this company', socialPosts: existingPosts, regionalMetrics: existingMetrics, salesRecords: existingSales };
  }

  const wilayas = await wilayaList();
  if (wilayas.length === 0) throw new AppError('The wilayas table is empty. Seed the wilayas first.', 500, 'WILAYAS_MISSING');

  const rng = makeRng(`soms-demo:${companyId}`);
  const months = lastTwelveMonths();
  const base = { companyId, sourceType: SOURCE };

  // regional_metrics
  const metrics = [];
  for (const m of months) {
    const factor = trend(m.index) * season(m.start.getUTCMonth());
    for (const w of wilayas) {
      const size = WILAYA_WEIGHT[w.code] ?? 0.5 + rng() * 0.4;
      const conversions = Math.round(size * 120 * factor * (0.8 + rng() * 0.4));
      const orders = Math.round(conversions * (0.12 + rng() * 0.1));
      const revenue = Math.round(orders * (3500 + rng() * 2000));
      for (const [metricType, metricValue] of [['conversions', conversions], ['orders', orders], ['revenue', revenue]]) {
        metrics.push({ ...base, wilayaCode: w.code, metricType, periodStart: m.start, periodEnd: m.end, metricValue });
      }
    }
  }

  // social_posts
  const posts = [];
  for (const m of months) {
    const factor = trend(m.index);
    const yyyymm = `${m.start.getUTCFullYear()}${String(m.start.getUTCMonth() + 1).padStart(2, '0')}`;
    for (const platform of DEMO_PLATFORMS) {
      const reach = platform === 'instagram' ? 1.3 : 1;
      for (let i = 1; i <= 8; i += 1) {
        const day = 1 + Math.floor(rng() * m.days);
        const publishedAt = new Date(Date.UTC(m.start.getUTCFullYear(), m.start.getUTCMonth(), day, 8 + Math.floor(rng() * 13), 0, 0));
        const views = Math.round((1500 + rng() * 6000) * reach * factor);
        posts.push({
          ...base,
          platform,
          externalPostId: `demo-${platform}-${yyyymm}-${i}`,
          publishedAt,
          contentType: CONTENT[Math.floor(rng() * CONTENT.length)],
          views,
          likes: Math.round(views * (0.03 + rng() * 0.04)),
          comments: Math.round(views * (0.004 + rng() * 0.006)),
          shares: Math.round(views * (0.002 + rng() * 0.004)),
          clicks: Math.round(views * (0.01 + rng() * 0.02)),
        });
      }
    }
  }

  // sales_records (daily)
  const sales = [];
  for (const m of months) {
    const factor = trend(m.index) * season(m.start.getUTCMonth());
    for (let d = 1; d <= m.days; d += 1) {
      const date = new Date(Date.UTC(m.start.getUTCFullYear(), m.start.getUTCMonth(), d));
      const weekend = [5, 6].includes(date.getUTCDay()); // Fri/Sat: lower in Algeria
      const orderCount = Math.max(1, Math.round(35 * factor * (weekend ? 0.7 : 1) * (0.8 + rng() * 0.4)));
      sales.push({ ...base, orderDate: date, orderCount, revenue: Math.round(orderCount * (3800 + rng() * 1800)) });
    }
  }

  const [regionalMetrics, socialPosts, salesRecords] = [
    await insertAll('regionalMetric', metrics),
    await insertAll('socialPost', posts),
    await insertAll('salesRecord', sales),
  ];

  await record({
    actorUserId: actorId, companyId, action: 'demo.seeded', entityType: 'Company', entityId: companyId,
    metadata: { regionalMetrics, socialPosts, salesRecords },
  });

  return { skipped: false, regionalMetrics, socialPosts, salesRecords };
}

export async function purge(companyId, actorId) {
  const where = { companyId, sourceType: SOURCE };
  const [regionalMetrics, socialPosts, salesRecords] = await prisma.$transaction([
    prisma.regionalMetric.deleteMany({ where }),
    prisma.socialPost.deleteMany({ where }),
    prisma.salesRecord.deleteMany({ where }),
  ]);

  const result = { regionalMetrics: regionalMetrics.count, socialPosts: socialPosts.count, salesRecords: salesRecords.count };
  await record({
    actorUserId: actorId, companyId, action: 'demo.purged', entityType: 'Company', entityId: companyId, metadata: result,
  });
  return result;
}

export const demoService = { seed, purge };
