import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Icon } from "@/components/ui/Icon";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function ExpectedOutputPage() {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);

  const cycles = await prisma.cropCycle.findMany({
    where: {
      status: { not: "abandoned" },
      plot: scope ? { farmer: { memberships: { some: scope } } } : undefined,
    },
    include: { plot: true, crop: true },
  });

  const byCrop = new Map<
    string,
    { name: string; areaHa: number; yieldKgHa: number | null; plotCount: number }
  >();

  for (const cycle of cycles) {
    const key = cycle.crop.id;
    const areaHa = cycle.plot.areaSqm / 10000;
    const existing = byCrop.get(key);
    if (existing) {
      existing.areaHa += areaHa;
      existing.plotCount += 1;
    } else {
      byCrop.set(key, {
        name: cycle.crop.name,
        areaHa,
        yieldKgHa: cycle.crop.indicativeYieldKgHa,
        plotCount: 1,
      });
    }
  }

  const rows = Array.from(byCrop.values()).sort((a, b) => b.areaHa - a.areaHa);
  const totalAreaHa = rows.reduce((sum, r) => sum + r.areaHa, 0);

  return (
    <div>
      <PageHeader
        title="Expected Output"
        description="Estimated production based on mapped area and reference yield per crop."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total mapped area under crop" value={`${totalAreaHa.toFixed(1)} ha`} icon={<Icon name="map" />} />
        <StatCard label="Distinct crops in cycle" value={rows.length} icon={<Icon name="layers" />} />
      </div>

      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Plots</Th>
            <Th>Area (ha)</Th>
            <Th>Reference yield (kg/ha)</Th>
            <Th>Estimated output (kg)</Th>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.name}>
                <Td className="font-medium text-slate-800">{row.name}</Td>
                <Td>{row.plotCount}</Td>
                <Td className="font-mono tabular-nums">{row.areaHa.toFixed(2)}</Td>
                <Td className="font-mono tabular-nums">{row.yieldKgHa ?? "—"}</Td>
                <Td className="font-mono tabular-nums font-medium">
                  {row.yieldKgHa
                    ? Math.round(row.areaHa * row.yieldKgHa).toLocaleString("en-IN")
                    : "—"}
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={5} message="No active crop cycles found." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
