import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "@/components/PaymentForm";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATUS_TONE = {
  active: "info",
  completed: "success",
  disputed: "danger",
} as const;

export default async function FpoContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { id } = await params;

  const contract = await prisma.contract.findFirst({
    where: scope ? { id, ...scope } : { id },
    include: { buyer: true, crop: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!contract) notFound();

  const paidRs = contract.payments.reduce((sum, p) => sum + p.amountRs, 0);
  const outstandingRs = contract.totalValueRs - paidRs;

  return (
    <div>
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Contract with {contract.buyer.legalName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {contract.crop.name} · {contract.quantityKg.toLocaleString("en-IN")} kg
                @ ₹{contract.pricePerKgRs.toFixed(2)}/kg
              </p>
            </div>
            <Badge tone={STATUS_TONE[contract.status as keyof typeof STATUS_TONE] ?? "neutral"}>
              {contract.status}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-slate-500">Contracted value</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
                ₹{contract.totalValueRs.toLocaleString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Paid</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-700">
                ₹{paidRs.toLocaleString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Outstanding</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-amber-700">
                ₹{outstandingRs.toLocaleString("en-IN")}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {outstandingRs > 0.01 && (
        <Card className="mb-6 max-w-lg">
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Record payment received</h2>
            <PaymentForm contractId={contract.id} />
          </CardBody>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Payment history
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Amount (Rs)</Th>
            <Th>Method</Th>
            <Th>Date</Th>
          </Thead>
          <Tbody>
            {contract.payments.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono tabular-nums">₹{p.amountRs.toLocaleString("en-IN")}</Td>
                <Td className="uppercase text-slate-500">{p.method ?? "—"}</Td>
                <Td className="text-xs text-slate-500">{new Date(p.paidAt).toLocaleDateString("en-IN")}</Td>
              </Tr>
            ))}
            {contract.payments.length === 0 && <EmptyRow colSpan={3} message="No payments recorded yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
