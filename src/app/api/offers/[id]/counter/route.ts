import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notificationService";

const MAX_ROUNDS = 3;

const counterSchema = z.object({
  quantityKg: z.coerce.number().int().positive(),
  pricePerKgRs: z.coerce.number().positive(),
  message: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = counterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid counter-offer details" }, { status: 400 });
  }

  try {
    const newOffer = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { lot: true, buyer: true },
      });
      if (!offer) throw new Error("NOT_FOUND");
      if (offer.status !== "pending") throw new Error("ALREADY_DECIDED");
      if (offer.roundNumber >= MAX_ROUNDS) throw new Error("MAX_ROUNDS_REACHED");
      if (parsed.data.quantityKg > offer.lot.quantityKg) throw new Error("OVER_CAPACITY");

      // Whichever side did NOT propose this round's terms is the one allowed
      // to counter it back — mirrors the accept/reject turn-taking below.
      const isFpoTurn = offer.proposedBy === "buyer";
      if (isFpoTurn) {
        if (!["FPO_STAFF", "FPO_ADMIN", "ADMIN"].includes(user.role)) throw new Error("FORBIDDEN");
        if (user.role !== "ADMIN" && offer.lot.fpoId !== user.fpoId) throw new Error("FORBIDDEN");
      } else {
        if (user.role !== "BUYER" || user.buyerId !== offer.buyerId) throw new Error("FORBIDDEN");
      }

      await tx.offer.update({ where: { id: offer.id }, data: { status: "countered" } });

      return tx.offer.create({
        data: {
          lotId: offer.lotId,
          buyerId: offer.buyerId,
          quantityKg: parsed.data.quantityKg,
          pricePerKgRs: parsed.data.pricePerKgRs,
          message: parsed.data.message,
          roundNumber: offer.roundNumber + 1,
          proposedBy: isFpoTurn ? "fpo" : "buyer",
          parentOfferId: offer.id,
        },
      });
    });

    // Notify whichever side now needs to respond to the new terms.
    if (newOffer.proposedBy === "fpo") {
      const buyer = await prisma.buyer.findUnique({ where: { id: newOffer.buyerId } });
      if (buyer) {
        await createNotification({
          userId: buyer.userId,
          title: "The FPO countered your offer",
          body: `New terms: ₹${newOffer.pricePerKgRs}/kg for ${newOffer.quantityKg.toLocaleString("en-IN")} kg. Round ${newOffer.roundNumber} of ${MAX_ROUNDS}.`,
          relatedUrl: "/buyer/offers",
        });
      }
    } else {
      const lot = await prisma.lot.findUnique({ where: { id: newOffer.lotId } });
      if (lot) {
        const fpoUsers = await prisma.user.findMany({
          where: { fpoId: lot.fpoId, role: { in: ["FPO_STAFF", "FPO_ADMIN"] } },
          select: { id: true },
        });
        for (const u of fpoUsers) {
          await createNotification({
            userId: u.id,
            title: "Buyer countered with new terms",
            body: `New terms: ₹${newOffer.pricePerKgRs}/kg for ${newOffer.quantityKg.toLocaleString("en-IN")} kg. Round ${newOffer.roundNumber} of ${MAX_ROUNDS}.`,
            relatedUrl: "/fpo/offers",
          });
        }
      }
    }

    return NextResponse.json({ id: newOffer.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status =
      message === "NOT_FOUND"
        ? 404
        : message === "FORBIDDEN"
          ? 403
          : message === "ALREADY_DECIDED" || message === "OVER_CAPACITY" || message === "MAX_ROUNDS_REACHED"
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
