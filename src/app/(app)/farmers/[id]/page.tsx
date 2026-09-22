import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { recordAudit } from "@/lib/audit";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function FarmerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);

  const { id } = await params;

  const farmer = await prisma.farmer.findFirst({
    where: scope ? { id, memberships: { some: scope } } : { id },
    include: {
      plots: {
        include: {
          cropCycles: { include: { crop: true, variety: true } },
        },
      },
      memberships: { include: { fpo: true } },
    },
  });

  if (!farmer) notFound();

  await recordAudit({
    actor: user,
    action: "read_farmer",
    purpose: "FPO workbench farmer detail view",
    targetType: "Farmer",
    targetId: farmer.id,
  });

  return (
    <div>
      <Link href="/farmers" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        ← Back to Farmer Registry
      </Link>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{farmer.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {farmer.platformId} · {farmer.mobileNumber}
              </p>
            </div>
            <Badge tone="brand">{farmer.memberships[0]?.fpo.legalName ?? "No FPO membership"}</Badge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Village</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{farmer.villageName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tehsil</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{farmer.tehsil}</dd>
            </div>
            <div>
              <dt className="text-slate-500">District</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{farmer.district}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Landholding</dt>
              <dd className="mt-0.5 font-medium capitalize text-slate-800">
                {farmer.landholdingCategory ?? "—"}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Plots ({farmer.plots.length})
      </h2>
      <div className="space-y-4">
        {farmer.plots.map((plot) => (
          <Card key={plot.id}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800">
                  {plot.plotCode} · {plot.villageName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  {(plot.areaSqm / 10000).toFixed(2)} ha
                  {plot.belowRemoteSensingThreshold && <Badge tone="warning">below RS threshold</Badge>}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {plot.irrigationSource ?? "irrigation source unknown"} · soil: {plot.soilTypeDeclared ?? "unknown"} ·
                centre {plot.centerLat.toFixed(4)}, {plot.centerLng.toFixed(4)}
              </div>

              {plot.cropCycles.length > 0 && (
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 pr-4 font-medium">Season</th>
                      <th className="py-1 pr-4 font-medium">Crop</th>
                      <th className="py-1 pr-4 font-medium">Variety</th>
                      <th className="py-1 pr-4 font-medium">Sowing date</th>
                      <th className="py-1 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plot.cropCycles.map((cycle) => (
                      <tr key={cycle.id}>
                        <td className="py-1.5 pr-4">
                          {cycle.season} {cycle.seasonYearLabel}
                        </td>
                        <td className="py-1.5 pr-4">{cycle.crop.name}</td>
                        <td className="py-1.5 pr-4">{cycle.variety?.name ?? "—"}</td>
                        <td className="py-1.5 pr-4">
                          {cycle.sowingDate ? new Date(cycle.sowingDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-1.5 pr-4 capitalize">{cycle.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
