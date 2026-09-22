import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Icon } from "@/components/ui/Icon";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATE_TONE = {
  forecast: "neutral",
  committed: "warning",
  in_stock: "success",
} as const;
const STATE_LABEL: Record<string, string> = {
  forecast: "Forecast",
  committed: "Committed",
  in_stock: "In Stock",
};

export default async function FpoProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["BUYER", "ADMIN"]);
  const { id } = await params;

  const fpo = await prisma.fPO.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { status: "active" },
        include: { farmer: { include: { plots: true } } },
      },
      lots: { include: { crop: true }, orderBy: { availabilityState: "asc" } },
    },
  });
  if (!fpo) notFound();

  const memberCount = fpo.memberships.length;
  const mappedAreaHa =
    fpo.memberships.reduce((sum, m) => sum + m.farmer.plots.reduce((s, p) => s + p.areaSqm, 0), 0) / 10000;

  const cycles = await prisma.cropCycle.findMany({
    where: {
      status: { not: "abandoned" },
      plot: { farmer: { memberships: { some: { fpoId: fpo.id, status: "active" } } } },
    },
    include: { plot: true, crop: true },
  });
  const byCrop = new Map<string, { name: string; areaHa: number; yieldKgHa: number | null }>();
  for (const cycle of cycles) {
    const areaHa = cycle.plot.areaSqm / 10000;
    const existing = byCrop.get(cycle.crop.id);
    if (existing) existing.areaHa += areaHa;
    else byCrop.set(cycle.crop.id, { name: cycle.crop.name, areaHa, yieldKgHa: cycle.crop.indicativeYieldKgHa });
  }
  const projection = Array.from(byCrop.values()).sort((a, b) => b.areaHa - a.areaHa);

  return (
    <div>
      <Card className="mb-6">
        <CardBody>
          <h1 className="text-xl font-semibold text-slate-900">{fpo.legalName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fpo.district} district · Registration {fpo.registrationNumber}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <StatCard label="Members" value={memberCount} icon={<Icon name="users" />} />
            <StatCard label="Mapped area" value={`${mappedAreaHa.toFixed(1)} ha`} icon={<Icon name="map" />} />
            <StatCard label="Active lots" value={fpo.lots.length} icon={<Icon name="layers" />} />
          </div>
        </CardBody>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Available lots</h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>State</Th>
            <Th>Quantity (kg)</Th>
            <Th>Grade</Th>
            <Th>Readiness</Th>
          </Thead>
          <Tbody>
            {fpo.lots.map((lot) => (
              <Tr key={lot.id}>
                <Td className="font-medium">
                  <Link href={`/buyer/lots/${lot.id}`} className="text-brand-700 hover:underline">
                    {lot.crop.name}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={STATE_TONE[lot.availabilityState as keyof typeof STATE_TONE] ?? "neutral"}>
                    {STATE_LABEL[lot.availabilityState] ?? lot.availabilityState}
                  </Badge>
                </Td>
                <Td className="font-mono tabular-nums">{lot.quantityKg.toLocaleString("en-IN")}</Td>
                <Td>{lot.grade ?? "—"}</Td>
                <Td className="text-xs text-slate-500">
                  {lot.readinessDate ? new Date(lot.readinessDate).toLocaleDateString("en-IN") : "already aggregated"}
                </Td>
              </Tr>
            ))}
            {fpo.lots.length === 0 && <EmptyRow colSpan={5} message="No lots yet." />}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-1 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Next-cycle projection
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Projected from currently open crop cycles across this FPO&rsquo;s member farmers.
      </p>
      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Area (ha)</Th>
            <Th>Projected volume (kg)</Th>
          </Thead>
          <Tbody>
            {projection.map((row) => (
              <Tr key={row.name}>
                <Td className="font-medium text-slate-800">{row.name}</Td>
                <Td className="font-mono tabular-nums">{row.areaHa.toFixed(2)}</Td>
                <Td className="font-mono tabular-nums">
                  {row.yieldKgHa ? Math.round(row.areaHa * row.yieldKgHa).toLocaleString("en-IN") : "—"}
                </Td>
              </Tr>
            ))}
            {projection.length === 0 && <EmptyRow colSpan={3} message="No open crop cycles." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
