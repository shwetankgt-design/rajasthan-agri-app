import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAdvisoriesForFarmer } from "@/lib/advisoryService";
import { AdvisoryCard } from "@/components/AdvisoryCard";
import { WeatherCard } from "@/components/WeatherCard";
import { SoilHealthPanel } from "@/components/SoilHealthPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function MyFarmPage() {
  const user = await getCurrentUser();
  if (!user || !user.farmerId) redirect("/dashboard");

  await ensureAdvisoriesForFarmer(user.farmerId);

  const farmer = await prisma.farmer.findUnique({
    where: { id: user.farmerId },
    include: {
      plots: {
        include: { cropCycles: { include: { crop: true, variety: true } } },
      },
      memberships: { include: { fpo: true } },
    },
  });

  if (!farmer) redirect("/dashboard");

  const advisories = await prisma.advisory.findMany({
    where: {
      acknowledged: false,
      cropCycle: { plot: { farmerId: user.farmerId } },
    },
    include: { cropCycle: { include: { crop: true } } },
    orderBy: { actionDateStart: "asc" },
    take: 3,
  });

  return (
    <div>
      <PageHeader
        title="My Farm"
        description={`${farmer.villageName}, ${farmer.tehsil}, ${farmer.district} · ${
          farmer.memberships[0]?.fpo.legalName ?? "No FPO membership"
        }`}
      />

      <div className="mb-8">
        <WeatherCard district={farmer.district} referenceDate={new Date()} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        What to do today
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {advisories.map((a) => (
          <AdvisoryCard
            key={a.id}
            id={a.id}
            adviceType={a.adviceType}
            message={a.message}
            reason={a.reason}
            actionDateStart={a.actionDateStart.toISOString()}
            actionDateEnd={a.actionDateEnd?.toISOString() ?? null}
            cropName={a.cropCycle.crop.name}
          />
        ))}
        {advisories.length === 0 && (
          <div className="sm:col-span-3">
            <EmptyState message="No active advisories right now." />
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">My plots</h2>
      <div className="space-y-4">
        {farmer.plots.map((plot) => (
          <Card key={plot.id}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800">
                  {plot.plotCode} · {(plot.areaSqm / 10000).toFixed(2)} ha
                </div>
                <div className="text-xs text-slate-500">{plot.irrigationSource ?? "rainfed"}</div>
              </div>

              {plot.cropCycles.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No crop cycle opened yet</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {plot.cropCycles.map((cycle) => (
                    <li
                      key={cycle.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span>
                        {cycle.crop.name}
                        {cycle.variety ? ` (${cycle.variety.name})` : ""} — {cycle.season} {cycle.seasonYearLabel}
                      </span>
                      <Badge tone="brand">{cycle.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}

              <SoilHealthPanel plotId={plot.id} soilTypeDeclared={plot.soilTypeDeclared} />
            </CardBody>
          </Card>
        ))}

        {farmer.plots.length === 0 && <EmptyState message="No plots mapped yet." />}
      </div>
    </div>
  );
}
