import { notFound } from "next/navigation";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferForm } from "@/components/OfferForm";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/Table";

const STATE_TONE = {
  forecast: "neutral",
  committed: "warning",
  in_stock: "success",
} as const;
const STATE_LABEL: Record<string, string> = {
  forecast: "Forecast",
  committed: "Committed",
  in_stock: "In Stock",
};

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["BUYER", "ADMIN"]);
  const user = await getCurrentUser();
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      fpo: true,
      crop: true,
      offers: { include: { contract: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!lot) notFound();

  const contracts = await prisma.contract.findMany({
    where: { offer: { lotId: lot.id }, status: { not: "disputed" } },
  });
  const committedKg = contracts.reduce((sum, c) => sum + c.quantityKg, 0);
  const remainingKg = Math.max(0, lot.quantityKg - committedKg);

  const myOffers = user?.buyerId ? lot.offers.filter((o) => o.buyerId === user.buyerId) : [];

  return (
    <div>
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {lot.crop.name} — {lot.fpo.legalName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{lot.fpo.district} district</p>
            </div>
            <Badge tone={STATE_TONE[lot.availabilityState as keyof typeof STATE_TONE] ?? "neutral"}>
              {STATE_LABEL[lot.availabilityState] ?? lot.availabilityState}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-slate-500">Declared quantity</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
                {lot.quantityKg.toLocaleString("en-IN")} kg
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Already committed</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
                {committedKg.toLocaleString("en-IN")} kg
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Remaining</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand-700">
                {remainingKg.toLocaleString("en-IN")} kg
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {myOffers.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Your offers on this lot
          </h2>
          <TableCard>
            <Table>
              <Thead>
                <Th>Quantity (kg)</Th>
                <Th>Price/kg (Rs)</Th>
                <Th>Status</Th>
              </Thead>
              <Tbody>
                {myOffers.map((offer) => (
                  <Tr key={offer.id}>
                    <Td className="font-mono tabular-nums">{offer.quantityKg.toLocaleString("en-IN")}</Td>
                    <Td className="font-mono tabular-nums">₹{offer.pricePerKgRs.toFixed(2)}</Td>
                    <Td>
                      <Badge
                        tone={
                          offer.status === "accepted" ? "success" : offer.status === "rejected" ? "danger" : "warning"
                        }
                      >
                        {offer.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableCard>
        </div>
      )}

      {remainingKg > 0 ? (
        <Card className="max-w-md">
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Make an offer</h2>
            <OfferForm lotId={lot.id} maxKg={remainingKg} />
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">This lot is fully committed — no remaining quantity to offer against.</p>
      )}
    </div>
  );
}
