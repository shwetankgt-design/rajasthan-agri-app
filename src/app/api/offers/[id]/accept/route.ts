import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notificationService";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const contract = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { lot: true },
      });
      if (!offer) throw new Error("NOT_FOUND");
      if (offer.status !== "pending") throw new Error("ALREADY_DECIDED");

      // Turn-taking: whoever did NOT propose this round's terms is the one
      // who may accept them — an FPO accepts a buyer's proposal, a buyer
      // accepts an FPO counter-offer.
      const isFpoTurn = offer.proposedBy === "buyer";
      if (isFpoTurn) {
        if (!["FPO_STAFF", "FPO_ADMIN", "ADMIN"].includes(user.role)) throw new Error("FORBIDDEN");
        if (user.role !== "ADMIN" && offer.lot.fpoId !== user.fpoId) throw new Error("FORBIDDEN");
      } else {
        if (user.role !== "BUYER" || user.buyerId !== offer.buyerId) throw new Error("FORBIDDEN");
      }

      // Quantity guard: sum quantity already committed via accepted contracts on
      // this lot, reject if this offer would push the total past what's declared
      // available. Runs inside the transaction so two concurrent accepts can't
      // both succeed against the same remaining quantity (FR-M5-20 in miniature —
      // application-level here, not a DB constraint; see module summary).
      const existingContracts = await tx.contract.findMany({
        where: { offer: { lotId: offer.lotId }, status: { not: "disputed" } },
      });
      const alreadyCommittedKg = existingContracts.reduce(
        (sum, c) => sum + c.quantityKg,
        0,
      );
      if (alreadyCommittedKg + offer.quantityKg > offer.lot.quantityKg) {
        throw new Error("OVER_CAPACITY");
      }

      await tx.offer.update({
        where: { id: offer.id },
        data: { status: "accepted" },
      });

      return tx.contract.create({
        data: {
          offerId: offer.id,
          fpoId: offer.lot.fpoId,
          buyerId: offer.buyerId,
          cropId: offer.lot.cropId,
          quantityKg: offer.quantityKg,
          pricePerKgRs: offer.pricePerKgRs,
          totalValueRs: offer.quantityKg * offer.pricePerKgRs,
        },
      });
    });

    // Notify whichever side did NOT just click accept.
    if (user.role === "BUYER") {
      const fpoUsers = await prisma.user.findMany({
        where: { fpoId: contract.fpoId, role: { in: ["FPO_STAFF", "FPO_ADMIN"] } },
        select: { id: true },
      });
      for (const u of fpoUsers) {
        await createNotification({
          userId: u.id,
          title: "Buyer accepted your counter-offer",
          body: `A contract worth ₹${contract.totalValueRs.toLocaleString("en-IN")} has been created.`,
          relatedUrl: `/fpo/contracts/${contract.id}`,
        });
      }
    } else {
      const buyer = await prisma.buyer.findUnique({ where: { id: contract.buyerId } });
      if (buyer) {
        await createNotification({
          userId: buyer.userId,
          title: "Your offer was accepted",
          body: `A contract worth ₹${contract.totalValueRs.toLocaleString("en-IN")} has been created.`,
          relatedUrl: `/buyer/contracts/${contract.id}`,
        });
      }
    }

    return NextResponse.json({ contractId: contract.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status =
      message === "NOT_FOUND"
        ? 404
        : message === "FORBIDDEN"
          ? 403
          : message === "ALREADY_DECIDED" || message === "OVER_CAPACITY"
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
