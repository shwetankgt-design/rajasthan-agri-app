import { requireRole } from "@/lib/auth";
import {
  getSownAreaAndProduction,
  getFpoPerformance,
  PRODUCTION_CONFIDENCE_BAND_PCT,
} from "@/lib/governmentStats";
import {
  getHeadlineKpis,
  getMspGap,
  getIrrigationProfile,
  getLandholdingProfile,
  getMarketLinkageGap,
  getStorageAdequacy,
  getPaymentRealisation,
  getPriceBenchmark,
  irrigationSourceLabel,
  lotStateLabel,
} from "@/lib/governmentAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/ui/BarChart";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

function rs(v: number) {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}
function pct(v: number, digits = 1) {
  return `${v.toFixed(digits)}%`;
}
function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3 mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default async function GovernmentDashboardPage() {
  await requireRole(["GOVERNMENT", "ADMIN"]);

  const [
    { sownArea, production, dataVintage },
    fpoPerformance,
    kpis,
    mspGap,
    irrigation,
    landholding,
    marketLinkage,
    storage,
    paymentRealisation,
    priceBenchmark,
  ] = await Promise.all([
    getSownAreaAndProduction(),
    getFpoPerformance(),
    getHeadlineKpis(),
    getMspGap(),
    getIrrigationProfile(),
    getLandholdingProfile(),
    getMarketLinkageGap(),
    getStorageAdequacy(),
    getPaymentRealisation(),
    getPriceBenchmark(),
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

      {/* Headline KPIs — the six numbers an officer should be able to read in one glance. */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Farmers on platform"
          value={kpis.farmers.toLocaleString("en-IN")}
          hint={`${pct(kpis.smallMarginalPct, 0)} small & marginal · ${pct(kpis.womenFarmerPct, 0)} women`}
        />
        <StatCard
          label="Mapped area under crop"
          value={`${kpis.mappedAreaHa.toFixed(0)} ha`}
          hint={`${kpis.rainfedAreaHa.toFixed(0)} ha rainfed (${pct(kpis.rainfedPct, 0)})`}
        />
        <StatCard
          label="Estimated production"
          value={`${Math.round(kpis.estimatedProductionKg / 1000).toLocaleString("en-IN")} t`}
          hint={`±${PRODUCTION_CONFIDENCE_BAND_PCT}% confidence band`}
        />
        <StatCard
          label="Contracted trade value"
          value={rs(kpis.contractedValueRs)}
          hint={`${kpis.unsoldLots} lots (${Math.round(kpis.unsoldKg / 1000)} t) with no buyer offer`}
        />
        <StatCard
          label="Payment realisation"
          value={pct(kpis.paymentRealisationPct, 0)}
          hint={`${rs(kpis.outstandingRs)} outstanding to FPOs`}
        />
        <StatCard
          label="Mandi–crop pairs below MSP"
          value={`${kpis.mspPairsBelow} / ${kpis.mspPairsTracked}`}
          hint="Procurement support indicator"
        />
      </div>

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

      {/* ── Price realisation against MSP ── */}
      <SectionHeading
        title="Price Realisation Against MSP"
        note="Latest observed modal price against the notified MSP, by mandi and crop. Sorted worst-first — a negative gap indicates where procurement support is most needed."
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Mandi</Th>
            <Th>District</Th>
            <Th>Modal (Rs/qtl)</Th>
            <Th>MSP (Rs/qtl)</Th>
            <Th>Gap</Th>
            <Th>Status</Th>
          </Thead>
          <Tbody>
            {mspGap.map((row) => (
              <Tr key={`${row.cropName}-${row.mandiName}`}>
                <Td className="font-medium text-slate-800">{row.cropName}</Td>
                <Td>{row.mandiName}</Td>
                <Td>{row.district}</Td>
                <Td className="font-mono tabular-nums">₹{row.modalPriceRs.toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums">₹{row.mspRs.toLocaleString("en-IN")}</Td>
                <Td
                  className={`font-mono tabular-nums font-medium ${
                    row.belowMsp ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {row.gapRs >= 0 ? "+" : "−"}₹{Math.abs(row.gapRs).toLocaleString("en-IN")} ({pct(Math.abs(row.gapPct))})
                </Td>
                <Td>
                  <Badge tone={row.belowMsp ? "danger" : "success"}>
                    {row.belowMsp ? "Below MSP" : "At/above MSP"}
                  </Badge>
                </Td>
              </Tr>
            ))}
            {mspGap.length === 0 && <EmptyRow colSpan={7} message="No MSP-notified crops in the current price series." />}
          </Tbody>
        </Table>
      </TableCard>

      {/* ── Irrigation dependence ── */}
      <SectionHeading
        title="Irrigation Dependence & Drought Exposure"
        note="Share of mapped area without assured irrigation. Rainfed area is the first to fail in a deficient monsoon and is the primary target for irrigation schemes and contingency planning."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {irrigation.map((d) => (
          <Card key={d.district}>
            <CardBody>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{d.district}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.totalHa.toFixed(1)} ha mapped · {d.assuredHa.toFixed(1)} ha with assured irrigation
                  </p>
                </div>
                <Badge tone={d.rainfedPct >= 30 ? "danger" : d.rainfedPct >= 15 ? "warning" : "success"}>
                  {pct(d.rainfedPct, 0)} rainfed
                </Badge>
              </div>
              <BarChart
                data={d.bySource.map((s) => ({
                  label: irrigationSourceLabel(s.source),
                  value: Math.round(s.ha * 10) / 10,
                  tone: s.source === "rainfed" ? ("danger" as const) : ("brand" as const),
                }))}
                formatValue={(v) => `${v.toLocaleString("en-IN")} ha`}
              />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ── Beneficiary profile ── */}
      <SectionHeading
        title="Beneficiary Profile — Landholding & Inclusion"
        note={`Most central schemes key eligibility off the small-and-marginal cut, so this is the targeting table. Women hold ${landholding.womenAreaHa.toFixed(1)} ha across ${landholding.womenFarmers} farmers (${pct(landholding.womenFarmerPct, 0)} of all farmers).`}
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>Landholding category</Th>
            <Th>Farmers</Th>
            <Th>Share of farmers</Th>
            <Th>Area (ha)</Th>
            <Th>Share of area</Th>
            <Th>Avg holding (ha)</Th>
          </Thead>
          <Tbody>
            {landholding.rows.map((row) => (
              <Tr key={row.category}>
                <Td className="font-medium capitalize text-slate-800">{row.category}</Td>
                <Td className="font-mono tabular-nums">{row.farmers}</Td>
                <Td className="font-mono tabular-nums">{pct(row.farmerPct, 0)}</Td>
                <Td className="font-mono tabular-nums">{row.areaHa.toFixed(1)}</Td>
                <Td className="font-mono tabular-nums">{pct(row.areaPct, 0)}</Td>
                <Td className="font-mono tabular-nums">{row.avgHoldingHa.toFixed(2)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      {/* ── Market linkage gap ── */}
      <SectionHeading
        title="Market Linkage Gap"
        note="Declared volume that has attracted no buyer offer at all. This is where buyer outreach and matchmaking should be directed first."
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>Availability state</Th>
            <Th>Lots</Th>
            <Th>Total volume (kg)</Th>
            <Th>Lots with buyer interest</Th>
            <Th>Volume with no interest (kg)</Th>
            <Th>Conversion</Th>
          </Thead>
          <Tbody>
            {marketLinkage.map((row) => (
              <Tr key={row.state}>
                <Td className="font-medium text-slate-800">{lotStateLabel(row.state)}</Td>
                <Td className="font-mono tabular-nums">{row.lots}</Td>
                <Td className="font-mono tabular-nums">{row.totalKg.toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums">
                  {row.lotsWithInterest} / {row.lots}
                </Td>
                <Td className="font-mono tabular-nums text-rose-600">{row.kgNoInterest.toLocaleString("en-IN")}</Td>
                <Td>
                  <Badge tone={row.conversionPct >= 60 ? "success" : row.conversionPct > 0 ? "warning" : "danger"}>
                    {pct(row.conversionPct, 0)}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      {/* ── Storage adequacy ── */}
      <SectionHeading
        title="Storage Infrastructure Adequacy"
        note="Estimated production against verified storage capacity in the same district. Only facilities declaring capacity in tonnes are counted as storage — assaying labs and processing throughput are excluded."
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>District</Th>
            <Th>Estimated production (t)</Th>
            <Th>Verified storage (t)</Th>
            <Th>Declared storage (t)</Th>
            <Th>Coverage</Th>
            <Th>Shortfall (t)</Th>
          </Thead>
          <Tbody>
            {storage.map((row) => (
              <Tr key={row.district}>
                <Td className="font-medium text-slate-800">{row.district}</Td>
                <Td className="font-mono tabular-nums">{Math.round(row.estimatedProductionTonnes).toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums">{row.verifiedStorageTonnes.toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums text-slate-500">
                  {row.declaredStorageTonnes.toLocaleString("en-IN")}
                </Td>
                <Td>
                  {row.coveragePct === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <Badge tone={row.coveragePct >= 100 ? "success" : row.coveragePct >= 50 ? "warning" : "danger"}>
                      {pct(row.coveragePct, 0)}
                    </Badge>
                  )}
                </Td>
                <Td className="font-mono tabular-nums font-medium text-rose-600">
                  {Math.round(row.gapTonnes).toLocaleString("en-IN")}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      {/* ── Payment realisation ── */}
      <SectionHeading
        title="Payment Realisation to FPOs"
        note="Executed contract value against payments actually recorded. Delayed payment is the most common grievance in aggregation models, so it is tracked per FPO rather than only in aggregate."
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>FPO</Th>
            <Th>District</Th>
            <Th>Contracts</Th>
            <Th>Contracted (Rs)</Th>
            <Th>Paid (Rs)</Th>
            <Th>Outstanding (Rs)</Th>
            <Th>Realisation</Th>
          </Thead>
          <Tbody>
            {paymentRealisation.map((row) => (
              <Tr key={row.fpoName}>
                <Td className="font-medium text-slate-800">{row.fpoName}</Td>
                <Td>{row.district}</Td>
                <Td className="font-mono tabular-nums">{row.contracts}</Td>
                <Td className="font-mono tabular-nums">{rs(row.contractedRs)}</Td>
                <Td className="font-mono tabular-nums">{rs(row.paidRs)}</Td>
                <Td className="font-mono tabular-nums font-medium text-amber-700">{rs(row.outstandingRs)}</Td>
                <Td>
                  <Badge tone={row.realisationPct >= 90 ? "success" : row.realisationPct >= 60 ? "warning" : "danger"}>
                    {pct(row.realisationPct, 0)}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      {/* ── Contracted price vs mandi benchmark ── */}
      <SectionHeading
        title="Contracted Price Against Mandi Benchmark"
        note="Average realised contract price per quintal against the recent mandi modal price for the same crop. Forward contracts and spot mandi rates are not like-for-like, so treat this as an indicative read on whether aggregation is improving realisation — not a settlement figure."
      />
      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Contracts</Th>
            <Th>Volume (kg)</Th>
            <Th>Avg contracted (Rs/qtl)</Th>
            <Th>Mandi modal (Rs/qtl)</Th>
            <Th>Difference</Th>
          </Thead>
          <Tbody>
            {priceBenchmark.map((row) => (
              <Tr key={row.cropName}>
                <Td className="font-medium text-slate-800">{row.cropName}</Td>
                <Td className="font-mono tabular-nums">{row.contracts}</Td>
                <Td className="font-mono tabular-nums">{row.contractedQtyKg.toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums">₹{Math.round(row.avgContractedRsPerQtl).toLocaleString("en-IN")}</Td>
                <Td className="font-mono tabular-nums text-slate-500">
                  {row.mandiModalRsPerQtl ? `₹${Math.round(row.mandiModalRsPerQtl).toLocaleString("en-IN")}` : "—"}
                </Td>
                <Td>
                  {row.premiumPct === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        row.premiumPct >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {row.premiumPct >= 0 ? "+" : "−"}
                      {pct(Math.abs(row.premiumPct))}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
            {priceBenchmark.length === 0 && <EmptyRow colSpan={6} message="No contracts executed yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
