import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fpoScopeFilter } from "@/lib/tenancy";
import { ensureAdvisoriesForFarmer } from "@/lib/advisoryService";
import { AdvisoryCard } from "@/components/AdvisoryCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart } from "@/components/ui/BarChart";
import { LineChart } from "@/components/ui/LineChart";

async function StaffDashboard({ scope }: { scope: { fpoId: string } | undefined }) {
  const [farmerCount, plotCount, fpoCount, cropCycleCount, pendingOfferCount, offers, contracts] =
    await Promise.all([
      prisma.farmer.count(
        scope ? { where: { memberships: { some: scope } } } : undefined,
      ),
      prisma.plot.count(
        scope ? { where: { farmer: { memberships: { some: scope } } } } : undefined,
      ),
      prisma.fPO.count(),
      prisma.cropCycle.count(
        scope
          ? { where: { plot: { farmer: { memberships: { some: scope } } } } }
          : undefined,
      ),
      prisma.offer.count({
        where: scope ? { lot: scope, status: "pending" } : { status: "pending" },
      }),
      prisma.offer.findMany({
        where: scope ? { lot: scope } : undefined,
        select: { status: true },
      }),
      prisma.contract.findMany({
        where: scope,
        select: { totalValueRs: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const funnel = {
    pending: offers.filter((o) => o.status === "pending").length,
    accepted: offers.filter((o) => o.status === "accepted").length,
    rejected: offers.filter((o) => o.status === "rejected").length,
  };

  // Cumulative contracted value over time — a simple running total by
  // contract-creation order, not a calendar bucketed series (small dataset).
  let running = 0;
  const valueTrend = contracts.map((c, i) => {
    running += c.totalValueRs;
    return { label: `#${i + 1}`, value: Math.round(running) };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Registered farmers" value={farmerCount} icon={<Icon name="users" />} />
        <StatCard label="Mapped plots" value={plotCount} icon={<Icon name="map" />} />
        <StatCard label="FPOs" value={fpoCount} icon={<Icon name="directory" />} />
        <StatCard label="Active crop cycles" value={cropCycleCount} icon={<Icon name="chart" />} />
        <StatCard label="Pending offers" value={pendingOfferCount} icon={<Icon name="inbox" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Offer outcomes</h2>
            {offers.length > 0 ? (
              <BarChart
                data={[
                  { label: "Pending", value: funnel.pending, tone: "warning" },
                  { label: "Accepted", value: funnel.accepted, tone: "success" },
                  { label: "Rejected", value: funnel.rejected, tone: "danger" },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-400">No offers yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Cumulative contracted value</h2>
            <LineChart points={valueTrend} valuePrefix="₹" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

async function FarmerDashboard({ farmerId }: { farmerId: string }) {
  await ensureAdvisoriesForFarmer(farmerId);

  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: {
      plots: { include: { cropCycles: { include: { crop: true } } } },
      memberships: { include: { fpo: true } },
    },
  });

  if (!farmer) return null;

  const advisories = await prisma.advisory.findMany({
    where: { acknowledged: false, cropCycle: { plot: { farmerId } } },
    include: { cropCycle: { include: { crop: true } } },
    orderBy: { actionDateStart: "asc" },
    take: 3,
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="My plots" value={farmer.plots.length} icon={<Icon name="map" />} />
        <StatCard
          label="Active crop cycles"
          value={farmer.plots.reduce((n, p) => n + p.cropCycles.length, 0)}
          icon={<Icon name="chart" />}
        />
        <StatCard
          label="FPO membership"
          value={farmer.memberships[0]?.fpo.legalName ?? "None"}
          icon={<Icon name="directory" />}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Today&rsquo;s advisory
        </h2>
        {advisories.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
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
          </div>
        ) : (
          <EmptyState message="No active advisories right now." />
        )}
      </div>
    </div>
  );
}

async function BuyerDashboard({ buyerId }: { buyerId: string }) {
  const [offerCount, contracts] = await Promise.all([
    prisma.offer.count({ where: { buyerId } }),
    prisma.contract.findMany({
      where: { buyerId },
      include: { payments: true },
    }),
  ]);

  const outstandingRs = contracts.reduce(
    (sum, c) => sum + (c.totalValueRs - c.payments.reduce((s, p) => s + p.amountRs, 0)),
    0,
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Offers made" value={offerCount} icon={<Icon name="offers" />} />
      <StatCard label="Contracts" value={contracts.length} icon={<Icon name="contract" />} />
      <StatCard
        label="Outstanding across contracts"
        value={`₹${outstandingRs.toLocaleString("en-IN")}`}
        icon={<Icon name="price" />}
      />
    </div>
  );
}

function GovernmentDashboardTeaser() {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="landmark" className="h-6 w-6" />
        </div>
        <p className="max-w-sm text-sm text-slate-500">
          Sown area, production estimates and FPO performance analytics.
        </p>
        <Link
          href="/government"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Open Government Dashboard →
        </Link>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} />

      {(user.role === "FPO_STAFF" ||
        user.role === "FPO_ADMIN" ||
        user.role === "ADMIN") && <StaffDashboard scope={fpoScopeFilter(user)} />}

      {user.role === "FARMER" && user.farmerId && (
        <FarmerDashboard farmerId={user.farmerId} />
      )}

      {user.role === "BUYER" && user.buyerId && (
        <BuyerDashboard buyerId={user.buyerId} />
      )}

      {user.role === "GOVERNMENT" && <GovernmentDashboardTeaser />}
    </div>
  );
}
