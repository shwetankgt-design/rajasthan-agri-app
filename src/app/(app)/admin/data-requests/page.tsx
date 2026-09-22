import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResolveRequestButton } from "@/components/ResolveRequestButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATUS_TONE = {
  pending: "warning",
  completed: "success",
  blocked: "danger",
} as const;

export default async function AdminDataRequestsPage() {
  await requireRole(["ADMIN"]);

  const requests = await prisma.dataSubjectRequest.findMany({
    include: { farmer: true },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Data Subject Rights Requests"
        description="Erasure requests are blocked, not silently dropped or silently allowed, when the farmer's produce is referenced by an active contract."
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Farmer</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Requested</Th>
            <Th>Action</Th>
          </Thead>
          <Tbody>
            {requests.map((r) => (
              <Tr key={r.id}>
                <Td>{r.farmer.name}</Td>
                <Td className="capitalize">{r.requestType}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>{r.status}</Badge>
                  {r.blockedReason && <div className="mt-1 text-xs text-rose-600">{r.blockedReason}</div>}
                </Td>
                <Td className="text-xs text-slate-500">{new Date(r.requestedAt).toLocaleDateString("en-IN")}</Td>
                <Td>{r.status === "pending" && <ResolveRequestButton id={r.id} />}</Td>
              </Tr>
            ))}
            {requests.length === 0 && <EmptyRow colSpan={5} message="No requests yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
