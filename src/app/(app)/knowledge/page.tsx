import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audiencesFor } from "@/lib/knowledgeAudience";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORY_LABELS: Record<string, string> = {
  agronomy: "Agronomy SOP",
  governance: "Governance & Compliance",
};

export default async function KnowledgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await prisma.sopContent.findMany({
    where: { status: "published", audience: { in: audiencesFor(user.role) } },
    orderBy: { title: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Knowledge & SOP Library"
        description="Agronomic and governance standard operating procedures, published and attributed to a named source."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.id} href={`/knowledge/${item.id}`} className="block">
            <Card className="transition-shadow hover:shadow-card-hover">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-800">{item.title}</div>
                  <Badge tone="brand">v{item.version}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                  {item.cropCode ? ` · ${item.cropCode.replaceAll("_", " ")}` : ""}
                  {item.operation ? ` · ${item.operation.replaceAll("_", " ")}` : ""}
                </div>
                <div className="mt-2 text-xs text-slate-400">Source: {item.sourceAttribution}</div>
              </CardBody>
            </Card>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState message="No published content available for your role yet." />
          </div>
        )}
      </div>
    </div>
  );
}
