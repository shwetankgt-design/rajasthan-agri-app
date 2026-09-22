import { prisma } from "./prisma";

export const PRODUCTION_MODEL_ID = "RULE-AREA-YIELD-V1";
export const PRODUCTION_CONFIDENCE_BAND_PCT = 15; // matches the FRS's stated honest R1 target

export type SownAreaRow = {
  district: string;
  cropName: string;
  areaHa: number;
  plotCount: number;
};

export type ProductionRow = {
  district: string;
  cropName: string;
  areaHa: number;
  indicativeYieldKgHa: number | null;
  estimateKg: number | null;
  lowKg: number | null;
  highKg: number | null;
};

export type FpoPerformanceRow = {
  fpoName: string;
  district: string;
  memberCount: number;
  mappedAreaHa: number;
  activeContracts: number;
  completedContracts: number;
  contractedValueRs: number;
};

/**
 * Every number here is derived live from operational data (crop cycles,
 * memberships, contracts) — there is no independent "officially reported"
 * figure source integrated at this tier to reconcile against, so this
 * deliberately shows the model estimate alone rather than fabricating a
 * second number to compare it to (FR-M10-01's reconciliation requirement is
 * therefore only partially met — flagged in the module summary).
 */
export async function getSownAreaAndProduction(): Promise<{
  sownArea: SownAreaRow[];
  production: ProductionRow[];
  dataVintage: Date;
}> {
  const cycles = await prisma.cropCycle.findMany({
    where: { status: { not: "abandoned" } },
    include: { plot: { include: { farmer: true } }, crop: true },
  });

  const key = (district: string, cropName: string) => `${district}::${cropName}`;
  const areaMap = new Map<string, SownAreaRow>();
  let latestRecord = new Date(0);

  for (const cycle of cycles) {
    if (cycle.createdAt > latestRecord) latestRecord = cycle.createdAt;
    const k = key(cycle.plot.farmer.district, cycle.crop.name);
    const areaHa = cycle.plot.areaSqm / 10000;
    const existing = areaMap.get(k);
    if (existing) {
      existing.areaHa += areaHa;
      existing.plotCount += 1;
    } else {
      areaMap.set(k, {
        district: cycle.plot.farmer.district,
        cropName: cycle.crop.name,
        areaHa,
        plotCount: 1,
      });
    }
  }

  const sownArea = Array.from(areaMap.values()).sort(
    (a, b) => a.district.localeCompare(b.district) || b.areaHa - a.areaHa,
  );

  const cropYieldByName = new Map<string, number | null>();
  for (const cycle of cycles) {
    cropYieldByName.set(cycle.crop.name, cycle.crop.indicativeYieldKgHa);
  }

  const production: ProductionRow[] = sownArea.map((row) => {
    const yieldKgHa = cropYieldByName.get(row.cropName) ?? null;
    const estimateKg = yieldKgHa ? row.areaHa * yieldKgHa : null;
    return {
      district: row.district,
      cropName: row.cropName,
      areaHa: row.areaHa,
      indicativeYieldKgHa: yieldKgHa,
      estimateKg,
      lowKg: estimateKg ? estimateKg * (1 - PRODUCTION_CONFIDENCE_BAND_PCT / 100) : null,
      highKg: estimateKg ? estimateKg * (1 + PRODUCTION_CONFIDENCE_BAND_PCT / 100) : null,
    };
  });

  return { sownArea, production, dataVintage: latestRecord };
}

export async function getFpoPerformance(): Promise<FpoPerformanceRow[]> {
  const fpos = await prisma.fPO.findMany({
    include: {
      memberships: { where: { status: "active" }, include: { farmer: { include: { plots: true } } } },
      contracts: true,
    },
  });

  return fpos
    .map((fpo) => ({
      fpoName: fpo.legalName,
      district: fpo.district,
      memberCount: fpo.memberships.length,
      mappedAreaHa:
        fpo.memberships.reduce(
          (sum, m) => sum + m.farmer.plots.reduce((s, p) => s + p.areaSqm, 0),
          0,
        ) / 10000,
      activeContracts: fpo.contracts.filter((c) => c.status === "active").length,
      completedContracts: fpo.contracts.filter((c) => c.status === "completed").length,
      contractedValueRs: fpo.contracts.reduce((sum, c) => sum + c.totalValueRs, 0),
    }))
    .sort((a, b) => b.mappedAreaHa - a.mappedAreaHa);
}
