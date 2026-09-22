import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATE_META: Record<string, { label: string; tone: "neutral" | "warning" | "success"; hint: string }> = {
  forecast: { label: "Forecast", tone: "neutral", hint: "Model-predicted, not yet harvested" },
  committed: { label: "Committed", tone: "warning", hint: "FPO has undertaken to supply, harvest pending" },
  in_stock: { label: "In Stock", tone: "success", hint: "Physically aggregated and graded at a known location" },
};

export default async function LotAvailabilityPage() {
  await requireRole(["BUYER", "ADMIN"]);

  const lots = await prisma.lot.findMany({
    include: { fpo: true, crop: true },
    orderBy: [{ availabilityState: "asc" }, { crop: { name: "asc" } }],
  });

  const grouped = {
    forecast: lots.filter((l) => l.availabilityState === "forecast"),
    committed: lots.filter((l) => l.availabilityState === "committed"),
    in_stock: lots.filter((l) => l.availabilityState === "in_stock"),
  };

  return (
    <div>
      <PageHeader
        title="Graded Availability"
        description="Browse graded lots by availability — forecast, committed and in-stock."
      />

      {(["in_stock", "committed", "forecast"] as const).map((state) => (
        <div key={state} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={STATE_META[state].tone}>{STATE_META[state].label}</Badge>
            <span className="text-xs text-slate-500">{STATE_META[state].hint}</span>
          </div>

          <TableCard>
            <Table>
              <Thead>
                <Th>FPO</Th>
                <Th>Crop</Th>
                <Th>Quantity (kg)</Th>
                <Th>Grade</Th>
                <Th>Readiness</Th>
              </Thead>
              <Tbody>
                {grouped[state].map((lot) => (
                  <Tr key={lot.id}>
                    <Td>
                      <Link href={`/buyer/fpos/${lot.fpoId}`} className="font-medium text-brand-700 hover:underline">
                        {lot.fpo.legalName}
                      </Link>
                      <div className="text-xs text-slate-500">{lot.fpo.district}</div>
                    </Td>
                    <Td>
                      <Link href={`/buyer/lots/${lot.id}`} className="text-brand-700 hover:underline">
                        {lot.crop.name}
                      </Link>
                    </Td>
                    <Td className="font-mono tabular-nums">{lot.quantityKg.toLocaleString("en-IN")}</Td>
                    <Td>{lot.grade ?? "—"}</Td>
                    <Td className="text-xs text-slate-500">
                      {lot.readinessDate ? new Date(lot.readinessDate).toLocaleDateString("en-IN") : "already aggregated"}
                    </Td>
                  </Tr>
                ))}
                {grouped[state].length === 0 && <EmptyRow colSpan={5} message="No lots in this state." />}
              </Tbody>
            </Table>
          </TableCard>
        </div>
      ))}
    </div>
  );
}
