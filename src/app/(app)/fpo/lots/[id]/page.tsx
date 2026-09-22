import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fpoScopeFilter } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/custodyChain";
import { getPossibleBuyersForLot } from "@/lib/buyerMatch";
import { CustodyEventForm } from "@/components/CustodyEventForm";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const CATEGORY_LABELS: Record<string, string> = {
  processor: "Processor",
  trader: "Trader",
  exporter: "Exporter",
  retailer: "Retailer",
  institutional: "Institutional Buyer",
};

const EVENT_LABELS: Record<string, string> = {
  delivery: "Farmer delivery",
  aggregation: "Aggregation",
  grading: "Grading",
  storage: "Storage",
  dispatch: "Dispatch",
  gate_in: "Buyer gate-in",
};

export default async function FpoLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);
  const scope = fpoScopeFilter(user);
  const { id } = await params;

  const lot = await prisma.lot.findFirst({
    where: scope ? { id, ...scope } : { id },
    include: {
      crop: true,
      fpo: true,
      lotComponents: { include: { plot: { include: { farmer: true } } } },
      custodyEvents: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!lot) notFound();

  const totalIn = lot.custodyEvents.reduce((s, e) => s + e.quantityInKg, 0);
  const totalOut = lot.custodyEvents.reduce((s, e) => s + e.quantityOutKg, 0);
  const onHandKg = totalIn - totalOut;

  const chainBreakIndex = verifyChain(lot.custodyEvents);
  const chainIntact = chainBreakIndex === -1;

  const upstreamPlots = lot.lotComponents;
  const possibleBuyers = await getPossibleBuyersForLot(lot.id);

  return (
    <div>
      <Link href="/fpo/lots" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        ← Back to Lots
      </Link>

      <Card className="mb-6">
        <CardBody>
          <h1 className="text-xl font-semibold text-slate-900">
            {lot.crop.name} — {lot.fpo.legalName}
          </h1>
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Declared quantity</dt>
              <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-800">
                {lot.quantityKg.toLocaleString("en-IN")} kg
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Mass balance (in − out)</dt>
              <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-800">
                {onHandKg.toLocaleString("en-IN")} kg
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Custody chain</dt>
              <dd className="mt-0.5">
                <Badge tone={chainIntact ? "success" : "danger"}>
                  {chainIntact ? "Verified intact" : `Tampering detected at event #${chainBreakIndex + 1}`}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Public trace page</dt>
              <dd className="mt-0.5">
                <Link href={`/trace/${lot.id}`} className="font-medium text-brand-700 hover:underline" target="_blank">
                  View public page →
                </Link>
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {(lot.availabilityState === "in_stock" || lot.availabilityState === "committed") && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Possible Buyers
          </h2>
          {possibleBuyers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {possibleBuyers.map((b) => (
                <Card key={b.id}>
                  <CardBody className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-800">{b.legalName}</div>
                      <div className="text-xs text-slate-500">{CATEGORY_LABELS[b.category] ?? b.category}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-500">
                        <Icon name="inbox" className="h-3.5 w-3.5" />
                        {b.phone}
                      </div>
                    </div>
                    <Badge tone="info">Not yet contacted</Badge>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No unmatched buyers found for this crop and district — everyone who fits has already offered, or no
              buyer's declared interest matches yet.
            </p>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Upstream plots (recall query)
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Plot code</Th>
            <Th>Farmer</Th>
            <Th>Village</Th>
            <Th>Quantity (kg)</Th>
            <Th>Delivered</Th>
          </Thead>
          <Tbody>
            {upstreamPlots.map((lc) => (
              <Tr key={lc.id}>
                <Td className="font-mono text-xs text-slate-500">{lc.plot.plotCode}</Td>
                <Td>
                  <Link href={`/farmers/${lc.plot.farmerId}`} className="text-brand-700 hover:underline">
                    {lc.plot.farmer.name}
                  </Link>
                </Td>
                <Td>{lc.plot.villageName}</Td>
                <Td className="font-mono tabular-nums">{lc.quantityKg.toLocaleString("en-IN")}</Td>
                <Td className="text-xs text-slate-500">{new Date(lc.deliveredAt).toLocaleDateString("en-IN")}</Td>
              </Tr>
            ))}
            {upstreamPlots.length === 0 && <EmptyRow colSpan={5} message="No delivery records linked yet." />}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Custody chain</h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Event</Th>
            <Th>In (kg)</Th>
            <Th>Out (kg)</Th>
            <Th>Location</Th>
            <Th>Actor</Th>
            <Th>When</Th>
            <Th>Hash</Th>
          </Thead>
          <Tbody>
            {lot.custodyEvents.map((e, idx) => (
              <Tr key={e.id} className={idx === chainBreakIndex ? "bg-rose-50" : undefined}>
                <Td className="font-medium text-slate-800">{EVENT_LABELS[e.eventType] ?? e.eventType}</Td>
                <Td className="font-mono tabular-nums">{e.quantityInKg}</Td>
                <Td className="font-mono tabular-nums">{e.quantityOutKg}</Td>
                <Td>{e.location ?? "—"}</Td>
                <Td>{e.actor ?? "—"}</Td>
                <Td className="text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString("en-IN")}</Td>
                <Td className="font-mono text-xs text-slate-400">{e.eventHash.slice(0, 10)}…</Td>
              </Tr>
            ))}
            {lot.custodyEvents.length === 0 && <EmptyRow colSpan={7} message="No custody events recorded yet." />}
          </Tbody>
        </Table>
      </TableCard>

      <Card className="mt-6 max-w-2xl">
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Record custody event</h2>
          <CustodyEventForm lotId={lot.id} />
        </CardBody>
      </Card>
    </div>
  );
}
