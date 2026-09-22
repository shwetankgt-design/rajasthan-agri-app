import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeEventHash } from "@/lib/custodyChain";

const eventSchema = z.object({
  eventType: z.enum([
    "delivery",
    "aggregation",
    "grading",
    "storage",
    "dispatch",
    "gate_in",
  ]),
  quantityInKg: z.coerce.number().int().min(0).default(0),
  quantityOutKg: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
  actor: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !["FPO_STAFF", "FPO_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id: lotId } = await params;
  const lot = await prisma.lot.findUnique({ where: { id: lotId } });
  if (!lot) {
    return NextResponse.json({ error: "Lot not found" }, { status: 404 });
  }
  if (user.role !== "ADMIN" && lot.fpoId !== user.fpoId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid custody event" }, { status: 400 });
  }

  const lastEvent = await prisma.custodyEvent.findFirst({
    where: { lotId },
    orderBy: { occurredAt: "desc" },
  });

  const occurredAt = new Date();
  const eventHash = computeEventHash(lastEvent?.eventHash ?? null, {
    lotId,
    eventType: parsed.data.eventType,
    quantityInKg: parsed.data.quantityInKg,
    quantityOutKg: parsed.data.quantityOutKg,
    location: parsed.data.location ?? null,
    actor: parsed.data.actor ?? null,
    occurredAt: occurredAt.toISOString(),
  });

  await prisma.custodyEvent.create({
    data: {
      lotId,
      eventType: parsed.data.eventType,
      quantityInKg: parsed.data.quantityInKg,
      quantityOutKg: parsed.data.quantityOutKg,
      location: parsed.data.location,
      actor: parsed.data.actor,
      occurredAt,
      prevEventHash: lastEvent?.eventHash ?? null,
      eventHash,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
