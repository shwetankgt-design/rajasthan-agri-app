import Link from "next/link";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferDecisionButtons } from "@/components/OfferDecisionButtons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

const STATUS_TONE = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
} as const;

export default async function MyOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["BUYER"]);
  const user = await getCurrentUser();
  if (!user?.buyerId) return null;
  const { status } = await searchParams;

  const allOffers = await prisma.offer.findMany({
    where: { buyerId: user.buyerId, status: { not: "countered" } },
    include: { lot: { include: { fpo: true, crop: true } }, contract: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    all: allOffers.length,
    pending: allOffers.filter((o) => o.status === "pending").length,
    accepted: allOffers.filter((o) => o.status === "accepted").length,
    rejected: allOffers.filter((o) => o.status === "rejected").length,
  };
  const activeStatus = status && ["pending", "accepted", "rejected"].includes(status) ? status : "all";
  const offers = activeStatus === "all" ? allOffers : allOffers.filter((o) => o.status === activeStatus);

  return (
    <div>
      <PageHeader
        title="My Offers"
        description="Offers you have made against FPO lots. Negotiation is capped at 3 rounds before a final accept/reject."
      />

      <FilterTabs
        basePath="/buyer/offers"
        active={activeStatus}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "accepted", label: "Accepted", count: counts.accepted },
          { value: "rejected", label: "Rejected", count: counts.rejected },
        ]}
      />

      <TableCard>
        <Table>
          <Thead>
            <Th>FPO</Th>
            <Th>Crop</Th>
            <Th>Quantity (kg)</Th>
            <Th>Price/kg (Rs)</Th>
            <Th>Round</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </Thead>
          <Tbody>
            {offers.map((offer) => {
              const isBuyerTurn = offer.status === "pending" && offer.proposedBy === "fpo";
              const isFpoTurn = offer.status === "pending" && offer.proposedBy === "buyer";
              return (
                <Tr key={offer.id}>
                  <Td>
                    <Link href={`/buyer/fpos/${offer.lot.fpoId}`} className="text-brand-700 hover:underline">
                      {offer.lot.fpo.legalName}
                    </Link>
                  </Td>
                  <Td>{offer.lot.crop.name}</Td>
                  <Td className="font-mono tabular-nums">{offer.quantityKg.toLocaleString("en-IN")}</Td>
                  <Td className="font-mono tabular-nums">₹{offer.pricePerKgRs.toFixed(2)}</Td>
                  <Td>
                    <span className="font-mono text-xs text-slate-500">{offer.roundNumber} / 3</span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[offer.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                      {offer.status}
                    </Badge>
                  </Td>
                  <Td>
                    {isBuyerTurn ? (
                      <OfferDecisionButtons
                        offerId={offer.id}
                        canCounter={offer.roundNumber < 3}
                        currentQuantityKg={offer.quantityKg}
                        currentPricePerKgRs={offer.pricePerKgRs}
                      />
                    ) : isFpoTurn ? (
                      <span className="text-xs text-slate-400">Awaiting FPO response</span>
                    ) : offer.contract ? (
                      <Link href={`/buyer/contracts/${offer.contract.id}`} className="font-medium text-brand-700 hover:underline">
                        View contract
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
            {offers.length === 0 && <EmptyRow colSpan={7} message="You haven't made any offers yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
