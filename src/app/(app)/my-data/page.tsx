import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DataSubjectRequestForm } from "@/components/DataSubjectRequestForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_TONE = {
  pending: "warning",
  completed: "success",
  blocked: "danger",
} as const;

export default async function MyDataPage() {
  const user = await getCurrentUser();
  if (!user || !user.farmerId) redirect("/dashboard");

  const requests = await prisma.dataSubjectRequest.findMany({
    where: { farmerId: user.farmerId },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="My Data"
        description="Request access to, a copy of, or erasure of your personal data on this platform."
      />

      <Card className="mb-6">
        <CardBody>
          <DataSubjectRequestForm />
        </CardBody>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Your requests</h2>
      <div className="space-y-2">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardBody className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-slate-800">{r.requestType}</span>
                <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>{r.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Requested {new Date(r.requestedAt).toLocaleDateString("en-IN")}
              </div>
              {r.blockedReason && <div className="mt-1 text-xs text-rose-600">{r.blockedReason}</div>}
            </CardBody>
          </Card>
        ))}
        {requests.length === 0 && <EmptyState message="No requests yet." />}
      </div>
    </div>
  );
}
