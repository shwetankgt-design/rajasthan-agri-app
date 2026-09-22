import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const offerSchema = z.object({
  lotId: z.string().min(1),
  quantityKg: z.coerce.number().int().positive(),
  pricePerKgRs: z.coerce.number().positive(),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUYER" || !user.buyerId) {
    return NextResponse.json({ error: "Only buyers can make offers" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer details" }, { status: 400 });
  }

  const lot = await prisma.lot.findUnique({ where: { id: parsed.data.lotId } });
  if (!lot) {
    return NextResponse.json({ error: "Lot not found" }, { status: 404 });
  }

  const offer = await prisma.offer.create({
    data: {
      lotId: lot.id,
      buyerId: user.buyerId,
      quantityKg: parsed.data.quantityKg,
      pricePerKgRs: parsed.data.pricePerKgRs,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ id: offer.id }, { status: 201 });
}
