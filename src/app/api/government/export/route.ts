import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSownAreaAndProduction, getFpoPerformance } from "@/lib/governmentStats";
import {
  getMspGap,
  getIrrigationProfile,
  getLandholdingProfile,
  getMarketLinkageGap,
  getStorageAdequacy,
  getPaymentRealisation,
  lotStateLabel,
} from "@/lib/governmentAnalytics";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["GOVERNMENT", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const [
    { production, dataVintage },
    fpoPerformance,
    mspGap,
    irrigation,
    landholding,
    marketLinkage,
    storage,
    paymentRealisation,
  ] = await Promise.all([
    getSownAreaAndProduction(),
    getFpoPerformance(),
    getMspGap(),
    getIrrigationProfile(),
    getLandholdingProfile(),
    getMarketLinkageGap(),
    getStorageAdequacy(),
    getPaymentRealisation(),
  ]);

  const exportedAt = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Rajasthan Agri-Intelligence Platform — Government Export`);
  lines.push(`# Exported at: ${exportedAt}`);
  lines.push(`# Data as of: ${dataVintage.toISOString()}`);
  lines.push("");
  lines.push("Section,District,Crop,AreaHa,EstimateKg,LowKg,HighKg");
  for (const row of production) {
    lines.push(
      [
        "Production",
        csvEscape(row.district),
        csvEscape(row.cropName),
        row.areaHa.toFixed(2),
        row.estimateKg ? Math.round(row.estimateKg) : "",
        row.lowKg ? Math.round(row.lowKg) : "",
        row.highKg ? Math.round(row.highKg) : "",
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Section,FPO,District,Members,MappedAreaHa,ActiveContracts,CompletedContracts,ContractedValueRs");
  for (const row of fpoPerformance) {
    lines.push(
      [
        "FpoPerformance",
        csvEscape(row.fpoName),
        csvEscape(row.district),
        row.memberCount,
        row.mappedAreaHa.toFixed(1),
        row.activeContracts,
        row.completedContracts,
        row.contractedValueRs,
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Section,Crop,Mandi,District,ModalRsPerQtl,MspRsPerQtl,GapRs,GapPct,BelowMsp");
  for (const row of mspGap) {
    lines.push(
      [
        "MspGap",
        csvEscape(row.cropName),
        csvEscape(row.mandiName),
        csvEscape(row.district),
        row.modalPriceRs,
        row.mspRs,
        row.gapRs,
        row.gapPct.toFixed(2),
        row.belowMsp ? "yes" : "no",
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Section,District,IrrigationSource,AreaHa,SharePct");
  for (const d of irrigation) {
    for (const s of d.bySource) {
      lines.push(
        ["Irrigation", csvEscape(d.district), csvEscape(s.source), s.ha.toFixed(2), s.pct.toFixed(2)].join(","),
      );
    }
  }

  lines.push("");
  lines.push("Section,LandholdingCategory,Farmers,FarmerSharePct,AreaHa,AreaSharePct,AvgHoldingHa");
  for (const row of landholding.rows) {
    lines.push(
      [
        "Landholding",
        csvEscape(row.category),
        row.farmers,
        row.farmerPct.toFixed(2),
        row.areaHa.toFixed(2),
        row.areaPct.toFixed(2),
        row.avgHoldingHa.toFixed(3),
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Section,AvailabilityState,Lots,TotalKg,LotsWithInterest,KgNoInterest,ConversionPct");
  for (const row of marketLinkage) {
    lines.push(
      [
        "MarketLinkage",
        csvEscape(lotStateLabel(row.state)),
        row.lots,
        row.totalKg,
        row.lotsWithInterest,
        row.kgNoInterest,
        row.conversionPct.toFixed(2),
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Section,District,EstimatedProductionTonnes,VerifiedStorageTonnes,DeclaredStorageTonnes,CoveragePct,ShortfallTonnes");
  for (const row of storage) {
    lines.push(
      [
        "StorageAdequacy",
        csvEscape(row.district),
        row.estimatedProductionTonnes.toFixed(1),
        row.verifiedStorageTonnes,
        row.declaredStorageTonnes,
        row.coveragePct === null ? "" : row.coveragePct.toFixed(2),
        row.gapTonnes.toFixed(1),
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Section,FPO,District,Contracts,ContractedRs,PaidRs,OutstandingRs,RealisationPct");
  for (const row of paymentRealisation) {
    lines.push(
      [
        "PaymentRealisation",
        csvEscape(row.fpoName),
        csvEscape(row.district),
        row.contracts,
        Math.round(row.contractedRs),
        Math.round(row.paidRs),
        Math.round(row.outstandingRs),
        row.realisationPct.toFixed(2),
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="government-export-${exportedAt.slice(0, 10)}.csv"`,
    },
  });
}
