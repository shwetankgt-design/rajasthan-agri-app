import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBox } from "@/components/SearchBox";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function FarmersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { q } = await searchParams;

  const membershipFilter = scope ? { memberships: { some: scope } } : {};
  const searchFilter = q
    ? {
        OR: [
          { name: { contains: q } },
          { villageName: { contains: q } },
          { platformId: { contains: q } },
          { district: { contains: q } },
        ],
      }
    : {};

  const farmers = await prisma.farmer.findMany({
    where: { ...membershipFilter, ...searchFilter },
    orderBy: { name: "asc" },
    include: {
      plots: true,
      memberships: { include: { fpo: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Farmer Registry"
        description={`${farmers.length} farmer${farmers.length === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`}
        actions={<SearchBox placeholder="Search name, village, ID, district…" />}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Platform ID</Th>
            <Th>Name</Th>
            <Th>Village</Th>
            <Th>District</Th>
            <Th>Landholding</Th>
            <Th>Plots</Th>
            <Th>FPO</Th>
          </Thead>
          <Tbody>
            {farmers.map((farmer) => (
              <Tr key={farmer.id}>
                <Td className="font-mono text-xs text-slate-500">{farmer.platformId}</Td>
                <Td>
                  <Link href={`/farmers/${farmer.id}`} className="font-medium text-brand-700 hover:underline">
                    {farmer.name}
                  </Link>
                </Td>
                <Td>{farmer.villageName}</Td>
                <Td>{farmer.district}</Td>
                <Td className="capitalize">{farmer.landholdingCategory ?? "—"}</Td>
                <Td>{farmer.plots.length}</Td>
                <Td>{farmer.memberships[0]?.fpo.legalName ?? "—"}</Td>
              </Tr>
            ))}
            {farmers.length === 0 && <EmptyRow colSpan={7} message="No farmers match this search." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
