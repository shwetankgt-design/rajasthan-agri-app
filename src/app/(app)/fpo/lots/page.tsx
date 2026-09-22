import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/ui/FilterTabs";
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

export default async function FpoLotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { status } = await searchParams;

  const allLots = await prisma.lot.findMany({
    where: scope,
    include: { crop: true, custodyEvents: true, lotComponents: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    all: allLots.length,
    forecast: allLots.filter((l) => l.availabilityState === "forecast").length,
    committed: allLots.filter((l) => l.availabilityState === "committed").length,
    in_stock: allLots.filter((l) => l.availabilityState === "in_stock").length,
  };

  const activeStatus =
    status && ["forecast", "committed", "in_stock"].includes(status) ? status : "all";
  const lots = activeStatus === "all" ? allLots : allLots.filter((l) => l.availabilityState === activeStatus);

  return (
    <div>
      <PageHeader
        title="Lots & Traceability"
        description="Custody chain, mass balance and provenance per lot."
      />

      <FilterTabs
        basePath="/fpo/lots"
        active={activeStatus}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "forecast", label: "Forecast", count: counts.forecast },
          { value: "committed", label: "Committed", count: counts.committed },
          { value: "in_stock", label: "In Stock", count: counts.in_stock },
        ]}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>State</Th>
            <Th>Quantity (kg)</Th>
            <Th>Source plots</Th>
            <Th>Custody events</Th>
          </Thead>
          <Tbody>
            {lots.map((lot) => (
              <Tr key={lot.id}>
                <Td className="font-medium">
                  <Link href={`/fpo/lots/${lot.id}`} className="text-brand-700 hover:underline">
                    {lot.crop.name}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={STATE_TONE[lot.availabilityState as keyof typeof STATE_TONE] ?? "neutral"}>
                    {STATE_LABEL[lot.availabilityState] ?? lot.availabilityState}
                  </Badge>
                </Td>
                <Td className="font-mono tabular-nums">{lot.quantityKg.toLocaleString("en-IN")}</Td>
                <Td>{lot.lotComponents.length}</Td>
                <Td>{lot.custodyEvents.length}</Td>
              </Tr>
            ))}
            {lots.length === 0 && <EmptyRow colSpan={5} message="No lots in this category." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
