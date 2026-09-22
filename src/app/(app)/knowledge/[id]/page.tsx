import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audiencesFor } from "@/lib/knowledgeAudience";
import { Card, CardBody } from "@/components/ui/Card";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const item = await prisma.sopContent.findUnique({ where: { id } });
  if (!item) notFound();
  if (item.status !== "published" || !audiencesFor(user.role).includes(item.audience)) {
    if (user.role !== "ADMIN") notFound();
  }

  return (
    <div>
      <Link href="/knowledge" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        ← Back to Knowledge Library
      </Link>

      <Card>
        <CardBody>
          <h1 className="text-xl font-semibold text-slate-900">{item.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Version {item.version} · Effective{" "}
            {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString("en-IN") : "—"}
          </p>

          <div className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800">
            {item.contentBody}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
            <div>
              <dt className="text-slate-500">Source attribution</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{item.sourceAttribution ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Approving authority</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{item.approvingAuthority ?? "—"}</dd>
            </div>
          </dl>

          {item.changeLog && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Change log: {item.changeLog}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
