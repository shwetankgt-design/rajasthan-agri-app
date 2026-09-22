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
  const offer = await prisma.offer.findUnique({ where: { id }, include: { lot: true } });
  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const isFpoTurn = offer.proposedBy === "buyer";
  if (isFpoTurn) {
    if (!["FPO_STAFF", "FPO_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }
    if (user.role !== "ADMIN" && offer.lot.fpoId !== user.fpoId) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }
  } else if (user.role !== "BUYER" || user.buyerId !== offer.buyerId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  if (offer.status !== "pending") {
    return NextResponse.json({ error: "Offer already decided" }, { status: 409 });
  }

  await prisma.offer.update({ where: { id }, data: { status: "rejected" } });

  if (isFpoTurn) {
    const buyer = await prisma.buyer.findUnique({ where: { id: offer.buyerId } });
    if (buyer) {
      await createNotification({
        userId: buyer.userId,
        title: "Your offer was declined",
        body: `Your offer on this lot (${offer.quantityKg.toLocaleString("en-IN")} kg @ ₹${offer.pricePerKgRs}/kg) was declined.`,
        relatedUrl: "/buyer/offers",
      });
    }
  } else {
    const fpoUsers = await prisma.user.findMany({
      where: { fpoId: offer.lot.fpoId, role: { in: ["FPO_STAFF", "FPO_ADMIN"] } },
      select: { id: true },
    });
    for (const u of fpoUsers) {
      await createNotification({
        userId: u.id,
        title: "Buyer declined the counter-offer",
        body: `The buyer declined the terms (${offer.quantityKg.toLocaleString("en-IN")} kg @ ₹${offer.pricePerKgRs}/kg).`,
        relatedUrl: "/fpo/offers",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
