import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBox } from "@/components/SearchBox";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function PlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { q } = await searchParams;

  const farmerFilter = scope ? { farmer: { memberships: { some: scope } } } : {};
  const searchFilter = q
    ? {
        OR: [
          { plotCode: { contains: q } },
          { villageName: { contains: q } },
          { farmer: { name: { contains: q } } },
        ],
      }
    : {};

  const plots = await prisma.plot.findMany({
    where: { ...farmerFilter, ...searchFilter },
    orderBy: { plotCode: "asc" },
    include: { farmer: true, cropCycles: true },
  });

  return (
    <div>
      <PageHeader
        title="Plot Registry"
        description={`${plots.length} plot${plots.length === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`}
        actions={<SearchBox placeholder="Search plot code, village, farmer…" />}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Plot code</Th>
            <Th>Farmer</Th>
            <Th>Village</Th>
            <Th>Area (ha)</Th>
            <Th>Irrigation</Th>
            <Th>Centre</Th>
            <Th>Crop cycles</Th>
          </Thead>
          <Tbody>
            {plots.map((plot) => (
              <Tr key={plot.id}>
                <Td className="font-mono text-xs text-slate-500">{plot.plotCode}</Td>
                <Td>
                  <Link href={`/farmers/${plot.farmerId}`} className="font-medium text-brand-700 hover:underline">
                    {plot.farmer.name}
                  </Link>
                </Td>
                <Td>{plot.villageName}</Td>
                <Td>
                  <span className="flex items-center gap-1.5 font-mono tabular-nums">
                    {(plot.areaSqm / 10000).toFixed(2)}
                    {plot.belowRemoteSensingThreshold && <Badge tone="warning">low-RS</Badge>}
                  </span>
                </Td>
                <Td>{plot.irrigationSource ?? "—"}</Td>
                <Td className="font-mono text-xs text-slate-500">
                  {plot.centerLat.toFixed(3)}, {plot.centerLng.toFixed(3)}
                </Td>
                <Td>{plot.cropCycles.length}</Td>
              </Tr>
            ))}
            {plots.length === 0 && <EmptyRow colSpan={7} message="No plots match this search." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
