import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FreightEstimateForm } from "@/components/FreightEstimateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default async function FreightEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  await requireRole(["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"]);
  const { from } = await searchParams;

  const [facilities, transporters] = await Promise.all([
    prisma.facility.findMany({
      select: { id: true, name: true, district: true },
      orderBy: { name: "asc" },
    }),
    prisma.transporter.findMany({
      select: { id: true, name: true, ratePerKmRs: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Freight Estimate"
        description="Estimated distance and freight cost between any two registry points."
      />

      <Card className="max-w-2xl">
        <CardBody>
          <FreightEstimateForm facilities={facilities} transporters={transporters} defaultFromId={from} />
        </CardBody>
      </Card>
    </div>
  );
}
