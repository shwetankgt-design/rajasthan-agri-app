import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  collection_centre: "Collection centre",
  warehouse: "Warehouse",
  cold_storage: "Cold storage",
  sorting_grading: "Sorting & grading",
  assaying_lab: "Assaying lab",
  primary_processing: "Primary processing",
};

export default async function FacilitiesPage() {
  await requireRole(["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"]);

  const facilities = await prisma.facility.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Infrastructure Registry"
        description="Collection centres, warehouses, cold storage and processing facilities — one shared registry for FPOs and buyers."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {facilities.map((f) => (
          <Link key={f.id} href={`/facilities/${f.id}`} className="block">
            <Card className="transition-shadow hover:shadow-card-hover">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-800">{f.name}</div>
                  <Badge tone={f.verified ? "success" : "neutral"}>
                    {f.verified ? "Verified" : "Pending verification"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {TYPE_LABELS[f.facilityType] ?? f.facilityType} · {f.district}
                  {f.village ? `, ${f.village}` : ""}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Capacity: {f.capacityValue.toLocaleString("en-IN")} {f.capacityUnit} · as of{" "}
                  {new Date(f.declaredAt).toLocaleDateString("en-IN")}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
        {facilities.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState message="No facilities registered yet." />
          </div>
        )}
      </div>
    </div>
  );
}
