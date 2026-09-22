import { prisma } from "./prisma";

export type MatchedBuyer = {
  id: string;
  legalName: string;
  category: string;
  phone: string;
  commoditiesOfInterest: string[];
};

/**
 * Buyers whose declared interest (commodity + operating district) matches a
 * lot, so an FPO can proactively reach out rather than only waiting for an
 * inbound offer. Excludes buyers who have already made an offer on this lot.
 */
export async function getPossibleBuyersForLot(lotId: string): Promise<MatchedBuyer[]> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { crop: true, fpo: true, offers: { select: { buyerId: true } } },
  });
  if (!lot) return [];

  const alreadyOffered = new Set(lot.offers.map((o) => o.buyerId));

  const buyers = await prisma.buyer.findMany({
    include: { user: { select: { phone: true } } },
    orderBy: { legalName: "asc" },
  });

  return buyers
    .filter((b) => !alreadyOffered.has(b.id))
    .filter((b) => (b.commoditiesOfInterest ?? "").split(",").map((c) => c.trim()).includes(lot.crop.code))
    .filter((b) => (b.operatingDistricts ?? "").split(",").map((d) => d.trim()).includes(lot.fpo.district))
    .map((b) => ({
      id: b.id,
      legalName: b.legalName,
      category: b.category,
      phone: b.user.phone,
      commoditiesOfInterest: (b.commoditiesOfInterest ?? "").split(",").map((c) => c.trim()).filter(Boolean),
    }));
}
