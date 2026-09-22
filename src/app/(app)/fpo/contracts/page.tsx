import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATUS_TONE = {
  active: "info",
  completed: "success",
  disputed: "danger",
} as const;

export default async function FpoContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { status } = await searchParams;

  const allContracts = await prisma.contract.findMany({
    where: scope,
    include: { buyer: true, crop: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    all: allContracts.length,
    active: allContracts.filter((c) => c.status === "active").length,
    completed: allContracts.filter((c) => c.status === "completed").length,
    disputed: allContracts.filter((c) => c.status === "disputed").length,
  };

  const activeStatus = status && ["active", "completed", "disputed"].includes(status) ? status : "all";
  const contracts = activeStatus === "all" ? allContracts : allContracts.filter((c) => c.status === activeStatus);

  const totalValue = allContracts.reduce((sum, c) => sum + c.totalValueRs, 0);
  const totalPaid = allContracts.reduce((sum, c) => sum + c.payments.reduce((s, p) => s + p.amountRs, 0), 0);

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Contracts formed from accepted offers, with settlement status."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs text-slate-500">Total contract value</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
            ₹{totalValue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs text-slate-500">Total received</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-700">
            ₹{totalPaid.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-xs text-slate-500">Outstanding</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-700">
            ₹{(totalValue - totalPaid).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <FilterTabs
        basePath="/fpo/contracts"
        active={activeStatus}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "active", label: "Active", count: counts.active },
          { value: "completed", label: "Completed", count: counts.completed },
          { value: "disputed", label: "Disputed", count: counts.disputed },
        ]}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Buyer</Th>
            <Th>Crop</Th>
            <Th>Value (Rs)</Th>
            <Th>Paid (Rs)</Th>
            <Th>Outstanding (Rs)</Th>
            <Th>Status</Th>
          </Thead>
          <Tbody>
            {contracts.map((c) => {
              const paid = c.payments.reduce((sum, p) => sum + p.amountRs, 0);
              return (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/fpo/contracts/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.buyer.legalName}
                    </Link>
                  </Td>
                  <Td>{c.crop.name}</Td>
                  <Td className="font-mono tabular-nums">₹{c.totalValueRs.toLocaleString("en-IN")}</Td>
                  <Td className="font-mono tabular-nums">₹{paid.toLocaleString("en-IN")}</Td>
                  <Td className="font-mono tabular-nums">₹{(c.totalValueRs - paid).toLocaleString("en-IN")}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"}>{c.status}</Badge>
                  </Td>
                </Tr>
              );
            })}
            {contracts.length === 0 && <EmptyRow colSpan={6} message="No contracts in this category." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
