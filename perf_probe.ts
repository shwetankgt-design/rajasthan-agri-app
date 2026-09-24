import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });

let queryCount = 0;
// @ts-expect-error -- event typing for query log
prisma.$on("query", () => {
  queryCount += 1;
});

async function time<T>(label: string, fn: () => Promise<T>) {
  const before = queryCount;
  const t0 = Date.now();
  await fn();
  console.log(`${label}: ${Date.now() - t0}ms, queries=${queryCount - before}`);
}

async function main() {
  await time("warmup single count", () => prisma.farmer.count());
  await time("single count (warm)", () => prisma.farmer.count());
  await time("single count (warm 2)", () => prisma.farmer.count());

  const analytics = await import("./src/lib/governmentAnalytics");
  const stats = await import("./src/lib/governmentStats");

  await time("getSownAreaAndProduction", () => stats.getSownAreaAndProduction());
  await time("getFpoPerformance", () => stats.getFpoPerformance());
  await time("getHeadlineKpis", () => analytics.getHeadlineKpis());
  await time("getMspGap", () => analytics.getMspGap());
  await time("getIrrigationProfile", () => analytics.getIrrigationProfile());
  await time("getLandholdingProfile", () => analytics.getLandholdingProfile());
  await time("getMarketLinkageGap", () => analytics.getMarketLinkageGap());
  await time("getStorageAdequacy", () => analytics.getStorageAdequacy());
  await time("getPaymentRealisation", () => analytics.getPaymentRealisation());
  await time("getPriceBenchmark", () => analytics.getPriceBenchmark());

  console.log(`TOTAL QUERIES: ${queryCount}`);
}

main().finally(() => prisma.$disconnect());
