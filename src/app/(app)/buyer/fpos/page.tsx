import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default async function FpoDiscoveryPage() {
  await requireRole(["BUYER", "ADMIN"]);

  const fpos = await prisma.fPO.findMany({
    orderBy: { legalName: "asc" },
    include: {
      memberships: { where: { status: "active" }, include: { farmer: { include: { plots: true } } } },
      lots: true,
    },
  });

  return (
    <div>
      <PageHeader title="FPO Discovery" description="Farmer Producer Organisations registered on the platform." />

      <div className="grid gap-4 sm:grid-cols-2">
        {fpos.map((fpo) => {
          const memberCount = fpo.memberships.length;
          const mappedAreaHa = fpo.memberships.reduce(
            (sum, m) => sum + m.farmer.plots.reduce((s, p) => s + p.areaSqm, 0) / 10000,
            0,
          );
          const commodities = new Set(fpo.lots.map((l) => l.cropId));

          return (
            <Link key={fpo.id} href={`/buyer/fpos/${fpo.id}`} className="block">
              <Card className="transition-shadow hover:shadow-card-hover">
                <CardBody>
                  <div className="font-medium text-slate-800">{fpo.legalName}</div>
                  <div className="text-xs text-slate-500">{fpo.district} district</div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div>
                      <div className="font-mono text-lg font-semibold tabular-nums text-brand-700">
                        {memberCount}
                      </div>
                      <div className="text-xs text-slate-500">members</div>
                    </div>
                    <div>
                      <div className="font-mono text-lg font-semibold tabular-nums text-brand-700">
                        {mappedAreaHa.toFixed(0)} ha
                      </div>
                      <div className="text-xs text-slate-500">mapped area</div>
                    </div>
                    <div>
                      <div className="font-mono text-lg font-semibold tabular-nums text-brand-700">
                        {commodities.size}
                      </div>
                      <div className="text-xs text-slate-500">commodities</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
