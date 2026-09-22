import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSownAreaAndProduction, getFpoPerformance } from "@/lib/governmentStats";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["GOVERNMENT", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const [{ production, dataVintage }, fpoPerformance] = await Promise.all([
    getSownAreaAndProduction(),
    getFpoPerformance(),
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

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="government-export-${exportedAt.slice(0, 10)}.csv"`,
    },
  });
}
