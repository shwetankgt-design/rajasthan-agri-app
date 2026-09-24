import { prisma } from "./prisma";
import { PRODUCTION_CONFIDENCE_BAND_PCT } from "./governmentStats";

/**
 * Decision-support analytics for the Department of Agriculture view.
 *
 * Every figure is derived from operational records already in the platform —
 * farmer/plot registry, crop cycles, mandi price observations, lots, contracts
 * and payments. Nothing here is a separate reported dataset, so each panel is
 * as current as the underlying transactions.
 */

const KG_PER_QUINTAL = 100;

// ── Headline KPIs ────────────────────────────────────────────────────────────

export type HeadlineKpis = {
  farmers: number;
  womenFarmers: number;
  womenFarmerPct: number;
  smallMarginalFarmers: number;
  smallMarginalPct: number;
  mappedAreaHa: number;
  rainfedAreaHa: number;
  rainfedPct: number;
  estimatedProductionKg: number;
  contractedValueRs: number;
  paidRs: number;
  outstandingRs: number;
  paymentRealisationPct: number;
  mspPairsTracked: number;
  mspPairsBelow: number;
  unsoldLots: number;
  unsoldKg: number;
};

export async function getHeadlineKpis(): Promise<HeadlineKpis> {
  const [farmers, plots, cycles, contracts, payments, lots, mspGap] = await Promise.all([
    prisma.farmer.findMany({
      select: { id: true, gender: true, plots: { select: { areaSqm: true } } },
    }),
    prisma.plot.findMany({ select: { areaSqm: true, irrigationSource: true } }),
    prisma.cropCycle.findMany({
      where: { status: { not: "abandoned" } },
      select: { plot: { select: { areaSqm: true } }, crop: { select: { indicativeYieldKgHa: true } } },
    }),
    prisma.contract.findMany({ select: { totalValueRs: true } }),
    prisma.payment.findMany({ select: { amountRs: true } }),
    prisma.lot.findMany({ select: { quantityKg: true, offers: { select: { id: true } } } }),
    getMspGap(),
  ]);

  const womenFarmers = farmers.filter((f) => f.gender === "female").length;
  const smallMarginal = farmers.filter((f) => {
    const cls = landholdingClass(f.plots.reduce((s, p) => s + p.areaSqm, 0) / 10000);
    return cls === "marginal" || cls === "small";
  }).length;

  const mappedAreaHa = plots.reduce((s, p) => s + p.areaSqm, 0) / 10000;
  const rainfedAreaHa = plots.filter((p) => p.irrigationSource === "rainfed").reduce((s, p) => s + p.areaSqm, 0) / 10000;

  const estimatedProductionKg = cycles.reduce(
    (s, c) => s + (c.crop.indicativeYieldKgHa ? (c.plot.areaSqm / 10000) * c.crop.indicativeYieldKgHa : 0),
    0,
  );

  const contractedValueRs = contracts.reduce((s, c) => s + c.totalValueRs, 0);
  const paidRs = payments.reduce((s, p) => s + p.amountRs, 0);

  const unsold = lots.filter((l) => l.offers.length === 0);

  return {
    farmers: farmers.length,
    womenFarmers,
    womenFarmerPct: farmers.length ? (womenFarmers / farmers.length) * 100 : 0,
    smallMarginalFarmers: smallMarginal,
    smallMarginalPct: farmers.length ? (smallMarginal / farmers.length) * 100 : 0,
    mappedAreaHa,
    rainfedAreaHa,
    rainfedPct: mappedAreaHa ? (rainfedAreaHa / mappedAreaHa) * 100 : 0,
    estimatedProductionKg,
    contractedValueRs,
    paidRs,
    outstandingRs: contractedValueRs - paidRs,
    paymentRealisationPct: contractedValueRs ? (paidRs / contractedValueRs) * 100 : 0,
    mspPairsTracked: mspGap.length,
    mspPairsBelow: mspGap.filter((r) => r.belowMsp).length,
    unsoldLots: unsold.length,
    unsoldKg: unsold.reduce((s, l) => s + l.quantityKg, 0),
  };
}

// ── A. Price realisation against MSP ─────────────────────────────────────────

export type MspGapRow = {
  cropName: string;
  mandiName: string;
  district: string;
  modalPriceRs: number;
  mspRs: number;
  gapRs: number;
  gapPct: number;
  belowMsp: boolean;
  observedDate: Date;
};

/**
 * Latest observed modal price against the notified MSP, per mandi and crop.
 * Drives the most direct policy lever on this page: where procurement support
 * is needed, and for which crop.
 */
export async function getMspGap(): Promise<MspGapRow[]> {
  const observations = await prisma.priceObservation.findMany({
    where: { mspRs: { not: null } },
    include: { crop: true, mandi: true },
    orderBy: { observedDate: "desc" },
  });

  const latest = new Map<string, MspGapRow>();
  for (const o of observations) {
    const key = `${o.cropId}::${o.mandiId}`;
    if (latest.has(key)) continue; // ordered desc, so the first hit is the latest
    const msp = o.mspRs!;
    const gapRs = o.modalPriceRs - msp;
    latest.set(key, {
      cropName: o.crop.name,
      mandiName: o.mandi.name,
      district: o.mandi.district,
      modalPriceRs: o.modalPriceRs,
      mspRs: msp,
      gapRs,
      gapPct: (gapRs / msp) * 100,
      belowMsp: gapRs < 0,
      observedDate: o.observedDate,
    });
  }

  return Array.from(latest.values()).sort(
    (a, b) => a.gapPct - b.gapPct || a.cropName.localeCompare(b.cropName),
  );
}

// ── B. Estimate calibration: reference yield vs harvested actuals ────────────

export type YieldCalibrationRow = {
  cropName: string;
  referenceYieldKgHa: number | null;
  observedYieldKgHa: number | null;
  harvestedCycles: number;
  harvestedAreaHa: number;
  variancePct: number | null;
  withinBand: boolean | null;
};

/**
 * How the area × reference-yield estimate compares with yields actually
 * reported on harvested cycles. This is the honesty check on every production
 * number elsewhere on the page — if a crop's variance sits outside the stated
 * confidence band, the estimate for that crop should be treated with caution.
 */
export async function getYieldCalibration(): Promise<YieldCalibrationRow[]> {
  const harvested = await prisma.cropCycle.findMany({
    where: { status: "harvested", actualYieldKg: { not: null } },
    include: { crop: true, plot: { select: { areaSqm: true } } },
  });

  const byCrop = new Map<string, { name: string; ref: number | null; kg: number; ha: number; n: number }>();
  for (const c of harvested) {
    const entry = byCrop.get(c.cropId) ?? {
      name: c.crop.name,
      ref: c.crop.indicativeYieldKgHa,
      kg: 0,
      ha: 0,
      n: 0,
    };
    entry.kg += c.actualYieldKg!;
    entry.ha += c.plot.areaSqm / 10000;
    entry.n += 1;
    byCrop.set(c.cropId, entry);
  }

  return Array.from(byCrop.values())
    .map((e) => {
      const observed = e.ha > 0 ? e.kg / e.ha : null;
      const variancePct = observed && e.ref ? ((observed - e.ref) / e.ref) * 100 : null;
      return {
        cropName: e.name,
        referenceYieldKgHa: e.ref,
        observedYieldKgHa: observed,
        harvestedCycles: e.n,
        harvestedAreaHa: e.ha,
        variancePct,
        withinBand: variancePct === null ? null : Math.abs(variancePct) <= PRODUCTION_CONFIDENCE_BAND_PCT,
      };
    })
    .sort((a, b) => Math.abs(b.variancePct ?? 0) - Math.abs(a.variancePct ?? 0));
}

// ── C. Irrigation dependence / climate vulnerability ─────────────────────────

export type IrrigationRow = {
  district: string;
  totalHa: number;
  rainfedHa: number;
  rainfedPct: number;
  assuredHa: number;
  bySource: { source: string; ha: number; pct: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  canal: "Canal",
  tubewell: "Tubewell",
  open_well: "Open well",
  farm_pond: "Farm pond",
  rainfed: "Rainfed",
};

export function irrigationSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/**
 * Rainfed share is the drought-exposure signal: that area has no assured
 * irrigation and is the first to fail in a deficient monsoon.
 */
export async function getIrrigationProfile(): Promise<IrrigationRow[]> {
  const plots = await prisma.plot.findMany({
    select: { areaSqm: true, irrigationSource: true, farmer: { select: { district: true } } },
  });

  const byDistrict = new Map<string, Map<string, number>>();
  for (const p of plots) {
    const district = p.farmer.district;
    const source = p.irrigationSource ?? "unspecified";
    const sources = byDistrict.get(district) ?? new Map<string, number>();
    sources.set(source, (sources.get(source) ?? 0) + p.areaSqm / 10000);
    byDistrict.set(district, sources);
  }

  return Array.from(byDistrict.entries())
    .map(([district, sources]) => {
      const totalHa = Array.from(sources.values()).reduce((s, v) => s + v, 0);
      const rainfedHa = sources.get("rainfed") ?? 0;
      return {
        district,
        totalHa,
        rainfedHa,
        rainfedPct: totalHa ? (rainfedHa / totalHa) * 100 : 0,
        assuredHa: totalHa - rainfedHa,
        bySource: Array.from(sources.entries())
          .map(([source, ha]) => ({ source, ha, pct: totalHa ? (ha / totalHa) * 100 : 0 }))
          .sort((a, b) => b.ha - a.ha),
      };
    })
    .sort((a, b) => b.rainfedPct - a.rainfedPct);
}

// ── D. Equity: landholding profile and women's participation ─────────────────

export type LandholdingRow = {
  category: string;
  farmers: number;
  farmerPct: number;
  areaHa: number;
  areaPct: number;
  avgHoldingHa: number;
};

const CATEGORY_ORDER = ["marginal", "small", "semi-medium", "medium", "large"];

/**
 * Standard Government of India operational-holding classes, derived from the
 * farmer's actual mapped area rather than the stored `landholdingCategory`
 * label. The two must agree for the targeting table to be credible — a
 * farmer classed "marginal" while holding 4 ha is a data-quality failure an
 * officer will spot immediately — so the measured area is treated as the
 * source of truth here.
 */
export function landholdingClass(areaHa: number): string {
  if (areaHa < 1) return "marginal";
  if (areaHa < 2) return "small";
  if (areaHa < 4) return "semi-medium";
  if (areaHa <= 10) return "medium";
  return "large";
}

/**
 * Most central-scheme eligibility keys off the small-and-marginal cut, so this
 * is the targeting table: who the beneficiaries are and how much land they hold.
 */
export async function getLandholdingProfile(): Promise<{
  rows: LandholdingRow[];
  womenFarmers: number;
  womenFarmerPct: number;
  womenAreaHa: number;
}> {
  const farmers = await prisma.farmer.findMany({
    select: { gender: true, landholdingCategory: true, plots: { select: { areaSqm: true } } },
  });

  const byCategory = new Map<string, { farmers: number; areaHa: number }>();
  let womenFarmers = 0;
  let womenAreaHa = 0;
  let totalAreaHa = 0;

  for (const f of farmers) {
    const areaHa = f.plots.reduce((s, p) => s + p.areaSqm, 0) / 10000;
    totalAreaHa += areaHa;
    if (f.gender === "female") {
      womenFarmers += 1;
      womenAreaHa += areaHa;
    }
    const key = landholdingClass(areaHa);
    const entry = byCategory.get(key) ?? { farmers: 0, areaHa: 0 };
    entry.farmers += 1;
    entry.areaHa += areaHa;
    byCategory.set(key, entry);
  }

  const rows = Array.from(byCategory.entries())
    .map(([category, e]) => ({
      category,
      farmers: e.farmers,
      farmerPct: farmers.length ? (e.farmers / farmers.length) * 100 : 0,
      areaHa: e.areaHa,
      areaPct: totalAreaHa ? (e.areaHa / totalAreaHa) * 100 : 0,
      avgHoldingHa: e.farmers ? e.areaHa / e.farmers : 0,
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  return {
    rows,
    womenFarmers,
    womenFarmerPct: farmers.length ? (womenFarmers / farmers.length) * 100 : 0,
    womenAreaHa,
  };
}

// ── E. Market linkage gap ────────────────────────────────────────────────────

export type MarketLinkageRow = {
  state: string;
  lots: number;
  totalKg: number;
  lotsWithInterest: number;
  kgWithInterest: number;
  lotsNoInterest: number;
  kgNoInterest: number;
  conversionPct: number;
};

const STATE_LABELS: Record<string, string> = {
  in_stock: "In stock",
  committed: "Committed",
  forecast: "Forecast",
};

export function lotStateLabel(state: string): string {
  return STATE_LABELS[state] ?? state;
}

/**
 * Volume that has been declared available but has attracted no buyer offer at
 * all — the clearest measure of where market linkage is failing and where
 * buyer outreach should be directed.
 */
export async function getMarketLinkageGap(): Promise<MarketLinkageRow[]> {
  const lots = await prisma.lot.findMany({
    select: { availabilityState: true, quantityKg: true, offers: { select: { id: true } } },
  });

  const byState = new Map<string, MarketLinkageRow>();
  for (const l of lots) {
    const row =
      byState.get(l.availabilityState) ??
      ({
        state: l.availabilityState,
        lots: 0,
        totalKg: 0,
        lotsWithInterest: 0,
        kgWithInterest: 0,
        lotsNoInterest: 0,
        kgNoInterest: 0,
        conversionPct: 0,
      } satisfies MarketLinkageRow);
    row.lots += 1;
    row.totalKg += l.quantityKg;
    if (l.offers.length > 0) {
      row.lotsWithInterest += 1;
      row.kgWithInterest += l.quantityKg;
    } else {
      row.lotsNoInterest += 1;
      row.kgNoInterest += l.quantityKg;
    }
    byState.set(l.availabilityState, row);
  }

  const order = ["in_stock", "committed", "forecast"];
  return Array.from(byState.values())
    .map((r) => ({ ...r, conversionPct: r.lots ? (r.lotsWithInterest / r.lots) * 100 : 0 }))
    .sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
}

// ── F. Storage infrastructure adequacy ───────────────────────────────────────

export type StorageAdequacyRow = {
  district: string;
  estimatedProductionTonnes: number;
  verifiedStorageTonnes: number;
  declaredStorageTonnes: number;
  coveragePct: number | null;
  gapTonnes: number;
};

/**
 * Estimated marketable production against verified storage capacity in the
 * same district. Only facilities whose capacity is declared in tonnes count as
 * storage — assaying labs and processing throughput are excluded rather than
 * silently converted.
 */
export async function getStorageAdequacy(): Promise<StorageAdequacyRow[]> {
  const [cycles, facilities] = await Promise.all([
    prisma.cropCycle.findMany({
      where: { status: { not: "abandoned" } },
      select: {
        crop: { select: { indicativeYieldKgHa: true } },
        plot: { select: { areaSqm: true, farmer: { select: { district: true } } } },
      },
    }),
    prisma.facility.findMany({
      where: { capacityUnit: "tonnes" },
      select: { district: true, capacityValue: true, verified: true },
    }),
  ]);

  const productionByDistrict = new Map<string, number>();
  for (const c of cycles) {
    if (!c.crop.indicativeYieldKgHa) continue;
    const district = c.plot.farmer.district;
    const kg = (c.plot.areaSqm / 10000) * c.crop.indicativeYieldKgHa;
    productionByDistrict.set(district, (productionByDistrict.get(district) ?? 0) + kg);
  }

  const storageByDistrict = new Map<string, { verified: number; declared: number }>();
  for (const f of facilities) {
    const entry = storageByDistrict.get(f.district) ?? { verified: 0, declared: 0 };
    entry.declared += f.capacityValue;
    if (f.verified) entry.verified += f.capacityValue;
    storageByDistrict.set(f.district, entry);
  }

  const districts = new Set([...productionByDistrict.keys(), ...storageByDistrict.keys()]);

  return Array.from(districts)
    .map((district) => {
      const estimatedProductionTonnes = (productionByDistrict.get(district) ?? 0) / 1000;
      const storage = storageByDistrict.get(district) ?? { verified: 0, declared: 0 };
      return {
        district,
        estimatedProductionTonnes,
        verifiedStorageTonnes: storage.verified,
        declaredStorageTonnes: storage.declared,
        coveragePct: estimatedProductionTonnes ? (storage.verified / estimatedProductionTonnes) * 100 : null,
        gapTonnes: Math.max(0, estimatedProductionTonnes - storage.verified),
      };
    })
    .sort((a, b) => (a.coveragePct ?? 0) - (b.coveragePct ?? 0));
}

// ── G. Payment realisation to FPOs ───────────────────────────────────────────

export type PaymentRealisationRow = {
  fpoName: string;
  district: string;
  contracts: number;
  contractedRs: number;
  paidRs: number;
  outstandingRs: number;
  realisationPct: number;
};

/**
 * Delayed payment against executed contracts is the single most common
 * grievance in aggregation models, so it is tracked per FPO rather than only
 * in aggregate.
 */
export async function getPaymentRealisation(): Promise<PaymentRealisationRow[]> {
  const fpos = await prisma.fPO.findMany({
    include: { contracts: { include: { payments: { select: { amountRs: true } } } } },
  });

  return fpos
    .map((fpo) => {
      const contractedRs = fpo.contracts.reduce((s, c) => s + c.totalValueRs, 0);
      const paidRs = fpo.contracts.reduce(
        (s, c) => s + c.payments.reduce((ps, p) => ps + p.amountRs, 0),
        0,
      );
      return {
        fpoName: fpo.legalName,
        district: fpo.district,
        contracts: fpo.contracts.length,
        contractedRs,
        paidRs,
        outstandingRs: contractedRs - paidRs,
        realisationPct: contractedRs ? (paidRs / contractedRs) * 100 : 0,
      };
    })
    .sort((a, b) => a.realisationPct - b.realisationPct);
}

// ── H. Contracted price against the mandi benchmark ──────────────────────────

export type PriceBenchmarkRow = {
  cropName: string;
  contracts: number;
  contractedQtyKg: number;
  avgContractedRsPerQtl: number;
  mandiModalRsPerQtl: number | null;
  premiumRs: number | null;
  premiumPct: number | null;
};

/**
 * Average realised contract price per quintal against the latest mandi modal
 * price for the same crop. Forward contracts and spot mandi rates are not a
 * like-for-like comparison, so this is an indicative benchmark of whether
 * aggregation is improving realisation — not a settlement figure.
 */
export async function getPriceBenchmark(): Promise<PriceBenchmarkRow[]> {
  const [contracts, observations] = await Promise.all([
    prisma.contract.findMany({ include: { crop: true } }),
    prisma.priceObservation.findMany({ orderBy: { observedDate: "desc" }, select: { cropId: true, modalPriceRs: true } }),
  ]);

  const latestModalByCrop = new Map<string, number[]>();
  for (const o of observations) {
    const list = latestModalByCrop.get(o.cropId) ?? [];
    if (list.length < 8) list.push(o.modalPriceRs); // most recent observations across mandis
    latestModalByCrop.set(o.cropId, list);
  }

  const byCrop = new Map<string, { name: string; cropId: string; n: number; kg: number; valueRs: number }>();
  for (const c of contracts) {
    const entry = byCrop.get(c.cropId) ?? { name: c.crop.name, cropId: c.cropId, n: 0, kg: 0, valueRs: 0 };
    entry.n += 1;
    entry.kg += c.quantityKg;
    entry.valueRs += c.totalValueRs;
    byCrop.set(c.cropId, entry);
  }

  return Array.from(byCrop.values())
    .map((e) => {
      const avgContractedRsPerQtl = e.kg ? (e.valueRs / e.kg) * KG_PER_QUINTAL : 0;
      const modals = latestModalByCrop.get(e.cropId) ?? [];
      const mandiModalRsPerQtl = modals.length
        ? modals.reduce((s, v) => s + v, 0) / modals.length
        : null;
      const premiumRs = mandiModalRsPerQtl === null ? null : avgContractedRsPerQtl - mandiModalRsPerQtl;
      return {
        cropName: e.name,
        contracts: e.n,
        contractedQtyKg: e.kg,
        avgContractedRsPerQtl,
        mandiModalRsPerQtl,
        premiumRs,
        premiumPct:
          premiumRs === null || !mandiModalRsPerQtl ? null : (premiumRs / mandiModalRsPerQtl) * 100,
      };
    })
    .sort((a, b) => (b.premiumPct ?? 0) - (a.premiumPct ?? 0));
}
