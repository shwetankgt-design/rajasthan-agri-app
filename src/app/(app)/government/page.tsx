import { requireRole } from "@/lib/auth";
import {
  getSownAreaAndProduction,
  getFpoPerformance,
  PRODUCTION_CONFIDENCE_BAND_PCT,
} from "@/lib/governmentStats";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { BarChart } from "@/components/ui/BarChart";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/Table";

export default async function GovernmentDashboardPage() {
  await requireRole(["GOVERNMENT", "ADMIN"]);

  const [{ sownArea, production, dataVintage }, fpoPerformance] = await Promise.all([
    getSownAreaAndProduction(),
    getFpoPerformance(),
  ]);

  const vintageLabel = dataVintage.getTime() > 0 ? dataVintage.toLocaleString("en-IN") : "no data";

  // Crop-level totals aggregated across districts, for the summary charts.
  const areaByCrop = new Map<string, number>();
  for (const row of sownArea) {
    areaByCrop.set(row.cropName, (areaByCrop.get(row.cropName) ?? 0) + row.areaHa);
  }
  const areaChartData = Array.from(areaByCrop.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10, tone: "brand" as const }));

  const productionByCrop = new Map<string, number>();
  for (const row of production) {
    if (row.estimateKg) productionByCrop.set(row.cropName, (productionByCrop.get(row.cropName) ?? 0) + row.estimateKg);
  }
  const productionChartData = Array.from(productionByCrop.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value: Math.round(value), tone: "teal" as const }));

  const fpoValueChartData = fpoPerformance
    .slice()
    .sort((a, b) => b.contractedValueRs - a.contractedValueRs)
    .map((row) => ({ label: row.fpoName, value: Math.round(row.contractedValueRs), tone: "brand" as const }));

  return (
    <div>
      <PageHeader
        title="Government & Institutional Dashboard"
        description={`Sown area, production estimates and FPO performance across Rajasthan. Updated as of ${vintageLabel}.`}
        actions={
          <a
            href="/api/government/export"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Export CSV
          </a>
        }
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Sown area by crop (ha, all districts)</h2>
            <BarChart data={areaChartData} formatValue={(v) => `${v.toLocaleString("en-IN")} ha`} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Production estimate by crop (kg)</h2>
            <BarChart data={productionChartData} formatValue={(v) => `${v.toLocaleString("en-IN")} kg`} />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-8">
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">FPO performance — contracted value (Rs)</h2>
          <BarChart data={fpoValueChartData} formatValue={(v) => `₹${v.toLocaleString("en-IN")}`} />
        </CardBody>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Sown Area by Crop &amp; District
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>District</Th>
            <Th>Crop</Th>
            <Th>Area (ha)</Th>
            <Th>Plots</Th>
          </Thead>
          <Tbody>
            {sownArea.map((row) => (
              <Tr key={`${row.district}-${row.cropName}`}>
                <Td>{row.district}</Td>
                <Td className="font-medium text-slate-800">{row.cropName}</Td>
                <Td className="font-mono tabular-nums">{row.areaHa.toFixed(2)}</Td>
                <Td>{row.plotCount}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Production Estimate by Crop &amp; District
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>District</Th>
            <Th>Crop</Th>
            <Th>Area (ha)</Th>
            <Th>Estimate (kg) — ±{PRODUCTION_CONFIDENCE_BAND_PCT}%</Th>
          </Thead>
          <Tbody>
            {production.map((row) => (
              <Tr key={`${row.district}-${row.cropName}`}>
                <Td>{row.district}</Td>
                <Td className="font-medium text-slate-800">{row.cropName}</Td>
                <Td className="font-mono tabular-nums">{row.areaHa.toFixed(2)}</Td>
                <Td className="font-mono tabular-nums">
                  {row.estimateKg ? (
                    <>
                      {Math.round(row.estimateKg).toLocaleString("en-IN")}
                      <span className="ml-1 text-xs text-slate-500">
                        ({Math.round(row.lowKg!).toLocaleString("en-IN")} –{" "}
                        {Math.round(row.highKg!).toLocaleString("en-IN")})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">FPO Performance</h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>FPO</Th>
            <Th>District</Th>
            <Th>Members</Th>
            <Th>Mapped area (ha)</Th>
            <Th>Active contracts</Th>
            <Th>Completed contracts</Th>
            <Th>Contracted value (Rs)</Th>
          </Thead>
          <Tbody>
            {fpoPerformance.map((row) => (
              <Tr key={row.fpoName}>
                <Td className="font-medium text-slate-800">{row.fpoName}</Td>
                <Td>{row.district}</Td>
                <Td>{row.memberCount}</Td>
                <Td className="font-mono tabular-nums">{row.mappedAreaHa.toFixed(1)}</Td>
                <Td>{row.activeContracts}</Td>
                <Td>{row.completedContracts}</Td>
                <Td className="font-mono tabular-nums">₹{row.contractedValueRs.toLocaleString("en-IN")}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
