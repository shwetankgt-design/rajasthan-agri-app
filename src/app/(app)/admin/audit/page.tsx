import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function AdminAuditPage() {
  await requireRole(["ADMIN"]);

  const entries = await prisma.auditLog.findMany({
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  const actorIds = Array.from(new Set(entries.map((e) => e.actorUserId).filter((v): v is string => !!v)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Personal-data access and financial actions. Append-only — most recent 100 entries."
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Target</Th>
            <Th>Purpose</Th>
            <Th>When</Th>
          </Thead>
          <Tbody>
            {entries.map((e) => (
              <Tr key={e.id}>
                <Td>
                  {e.actorUserId ? actorNameById.get(e.actorUserId) ?? "Unknown" : "System"}
                  <div className="text-xs text-slate-500">{e.actorRole}</div>
                </Td>
                <Td className="font-mono text-xs">{e.action}</Td>
                <Td className="text-xs text-slate-500">
                  {e.targetType}:{e.targetId.slice(0, 10)}…
                </Td>
                <Td className="text-xs text-slate-500">{e.purpose ?? "—"}</Td>
                <Td className="text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString("en-IN")}</Td>
              </Tr>
            ))}
            {entries.length === 0 && <EmptyRow colSpan={5} message="No audit entries yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
