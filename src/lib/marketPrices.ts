import { prisma } from "./prisma";
import { estimateExportPriceRs } from "./exportRates";

export type PriceRow = {
  mandiName: string;
  cropName: string;
  cropCode: string;
  latestDate: Date;
  modal: number;
  min30: number;
  max30: number;
  msp: number | null;
  exportEstimate: number | null;
};

export type PriceTrend = {
  cropName: string;
  points: { label: string; value: number }[];
};

/**
 * Mandi price comparison rows + 90-day trend, optionally scoped to a
 * district and/or a set of crop codes (e.g. only the crops a farmer or FPO
 * actually deals in). Shared by the FPO and farmer-facing price pages so
 * both read the same mandi + export-estimate logic.
 */
export async function getMandiPriceData(options: { district?: string | null; cropCodes?: string[] }) {
  const mandis = await prisma.mandiMaster.findMany({
    where: options.district ? { district: options.district } : undefined,
    orderBy: { name: "asc" },
  });
  const mandiIds = mandis.map((m) => m.id);

  const observations = await prisma.priceObservation.findMany({
    where: {
      ...(mandiIds.length > 0 ? { mandiId: { in: mandiIds } } : {}),
      ...(options.cropCodes && options.cropCodes.length > 0
        ? { crop: { code: { in: options.cropCodes } } }
        : {}),
    },
    include: { crop: true, mandi: true },
    orderBy: { observedDate: "desc" },
  });

  const thirtyDaysAgo = new Date("2026-08-08");
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const latestByKey = new Map<string, PriceRow>();
  for (const obs of observations) {
    const key = `${obs.mandiId}:${obs.cropId}`;
    const existing = latestByKey.get(key);
    if (!existing) {
      latestByKey.set(key, {
        mandiName: obs.mandi.name,
        cropName: obs.crop.name,
        cropCode: obs.crop.code,
        latestDate: obs.observedDate,
        modal: obs.modalPriceRs,
        min30: obs.minPriceRs,
        max30: obs.maxPriceRs,
        msp: obs.mspRs,
        exportEstimate: estimateExportPriceRs(obs.modalPriceRs, obs.crop.code),
      });
    } else if (obs.observedDate >= thirtyDaysAgo) {
      existing.min30 = Math.min(existing.min30, obs.minPriceRs);
      existing.max30 = Math.max(existing.max30, obs.maxPriceRs);
    }
  }
  const rows = Array.from(latestByKey.values()).sort(
    (a, b) => a.cropName.localeCompare(b.cropName) || a.mandiName.localeCompare(b.mandiName),
  );

  const trendByCrop = new Map<string, Map<string, { sum: number; count: number }>>();
  for (const obs of observations) {
    const cropTrend = trendByCrop.get(obs.crop.name) ?? new Map();
    const dateKey = obs.observedDate.toISOString().slice(0, 10);
    const existing = cropTrend.get(dateKey) ?? { sum: 0, count: 0 };
    existing.sum += obs.modalPriceRs;
    existing.count += 1;
    cropTrend.set(dateKey, existing);
    trendByCrop.set(obs.crop.name, cropTrend);
  }
  const trends: PriceTrend[] = Array.from(trendByCrop.entries())
    .map(([cropName, series]) => ({
      cropName,
      points: Array.from(series.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          value: Math.round(v.sum / v.count),
        })),
    }))
    .sort((a, b) => a.cropName.localeCompare(b.cropName));

  return { rows, trends };
}
