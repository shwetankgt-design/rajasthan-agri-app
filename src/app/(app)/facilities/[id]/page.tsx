import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const TYPE_LABELS: Record<string, string> = {
  collection_centre: "Collection centre",
  warehouse: "Warehouse",
  cold_storage: "Cold storage",
  sorting_grading: "Sorting & grading",
  assaying_lab: "Assaying lab",
  primary_processing: "Primary processing",
};

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"]);
  const { id } = await params;

  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) notFound();

  const commodities = (facility.commoditiesHandled ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const certifications = (facility.certifications ?? "").split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <div>
      <Link
        href="/facilities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
      >
        ← Back to Infrastructure Registry
      </Link>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{facility.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {TYPE_LABELS[facility.facilityType] ?? facility.facilityType} · {facility.district}
                {facility.village ? `, ${facility.village}` : ""}
              </p>
            </div>
            <Badge tone={facility.verified ? "success" : "neutral"}>
              {facility.verified ? "Verified" : "Pending verification"}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Owner</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{facility.ownerName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Operator</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{facility.operatorName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ownership</dt>
              <dd className="mt-0.5 font-medium capitalize text-slate-800">
                {facility.ownershipType.replaceAll("_", " ")}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Capacity</dt>
              <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-800">
                {facility.capacityValue.toLocaleString("en-IN")} {facility.capacityUnit}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Declared as of</dt>
              <dd className="mt-0.5 font-medium text-slate-800">
                {new Date(facility.declaredAt).toLocaleDateString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Operating hours</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{facility.operatingHours ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contact</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{facility.contactPhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tariff</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{facility.tariffStructure ?? "—"}</dd>
            </div>
          </dl>

          {commodities.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500">Commodities handled</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {commodities.map((c) => (
                  <Badge key={c} tone="neutral">
                    {c.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-500">Certifications</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {certifications.map((c) => (
                  <Badge key={c} tone="brand">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Link
        href={`/logistics/freight-estimate?from=${facility.id}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
      >
        Estimate freight from this facility →
      </Link>
    </div>
  );
}
