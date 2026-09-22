import { prisma } from "./prisma";

/**
 * FR-M12-04's retention exception: erasure is blocked, not silently failed
 * or silently allowed, when the farmer's produce is referenced by an active
 * (not yet settled) contract — i.e. their plots feed a lot that has been
 * contracted to a buyer and the contract isn't completed/disputed yet.
 */
export async function findActiveContractBlockingErasure(
  farmerId: string,
): Promise<{ contractId: string; buyerLegalName: string } | null> {
  const activeContract = await prisma.contract.findFirst({
    where: {
      status: "active",
      offer: {
        lot: {
          lotComponents: { some: { plot: { farmerId } } },
        },
      },
    },
    include: { buyer: true },
  });

  if (!activeContract) return null;
  return { contractId: activeContract.id, buyerLegalName: activeContract.buyer.legalName };
}
