import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMandiPriceData } from "@/lib/marketPrices";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { LineChart } from "@/components/ui/LineChart";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function PriceComparisonPage() {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);

  let myDistrict: string | null = null;
  if (user.fpoId) {
    const fpo = await prisma.fPO.findUnique({ where: { id: user.fpoId } });
    myDistrict = fpo?.district ?? null;
  }

  const { rows, trends } = await getMandiPriceData({ district: myDistrict });

  return (
    <div>
      <PageHeader
        title="Mandi Price Comparison"
        description="Most recent observed price per mandi, with the 30-day range, MSP and an indicative export rate where applicable."
      />

      {trends.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {trends.map((t) => (
            <Card key={t.cropName}>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">{t.cropName} — 90-day modal price</h2>
                <LineChart points={t.points} valuePrefix="₹" valueSuffix="/qtl" />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Mandi</Th>
            <Th>Latest modal (Rs/qtl)</Th>
            <Th>30-day range</Th>
            <Th>MSP (Rs/qtl)</Th>
            <Th>Export estimate (Rs/qtl)</Th>
            <Th>As of</Th>
          </Thead>
          <Tbody>
            {rows.map((row) => {
              const belowMsp = row.msp !== null && row.modal < row.msp;
              return (
                <Tr key={`${row.cropName}-${row.mandiName}`}>
                  <Td className="font-medium text-slate-800">{row.cropName}</Td>
                  <Td>{row.mandiName}</Td>
                  <Td className="font-mono tabular-nums font-medium">₹{row.modal.toLocaleString("en-IN")}</Td>
                  <Td className="font-mono tabular-nums text-slate-500">
                    ₹{row.min30.toLocaleString("en-IN")} – ₹{row.max30.toLocaleString("en-IN")}
                  </Td>
                  <Td>
                    {row.msp ? (
                      <span className="flex items-center gap-1.5 font-mono tabular-nums">
                        ₹{row.msp.toLocaleString("en-IN")}
                        {belowMsp && <Badge tone="danger">below MSP</Badge>}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="font-mono tabular-nums text-emerald-700">
                    {row.exportEstimate ? `₹${row.exportEstimate.toLocaleString("en-IN")}` : "—"}
                  </Td>
                  <Td className="text-xs text-slate-500">{new Date(row.latestDate).toLocaleDateString("en-IN")}</Td>
                </Tr>
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={7} message="No price data for this district yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
