import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeTransitionButtons } from "@/components/KnowledgeTransitionButtons";
import { NewKnowledgeForm } from "@/components/NewKnowledgeForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATUS_TONE = {
  draft: "neutral",
  technical_review: "warning",
  approved: "info",
  published: "success",
  expired: "danger",
} as const;

export default async function AdminKnowledgePage() {
  await requireRole(["ADMIN"]);

  const items = await prisma.sopContent.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Knowledge Content Management"
        description="Draft → technical review → approved → published → expired. Publish is blocked without source attribution, an approving authority and an effective date."
        actions={<NewKnowledgeForm />}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>Title</Th>
            <Th>Audience</Th>
            <Th>Status</Th>
            <Th>Attribution</Th>
            <Th>Action</Th>
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td className="font-medium text-slate-800">{item.title}</Td>
                <Td className="capitalize">{item.audience}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[item.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                </Td>
                <Td className="text-xs text-slate-500">
                  {item.sourceAttribution ?? <span className="text-amber-600">missing</span>}
                </Td>
                <Td>
                  <KnowledgeTransitionButtons id={item.id} status={item.status} />
                </Td>
              </Tr>
            ))}
            {items.length === 0 && <EmptyRow colSpan={5} message="No content yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
