import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

const paymentSchema = z.object({
  amountRs: z.coerce.number().positive(),
  method: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !["FPO_STAFF", "FPO_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (user.role !== "ADMIN" && contract.fpoId !== user.fpoId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  const alreadyPaid = contract.payments.reduce((sum, p) => sum + p.amountRs, 0);
  if (alreadyPaid + parsed.data.amountRs > contract.totalValueRs + 0.01) {
    return NextResponse.json(
      { error: "Payment would exceed contracted value" },
      { status: 409 },
    );
  }

  await prisma.payment.create({
    data: {
      contractId: contract.id,
      amountRs: parsed.data.amountRs,
      method: parsed.data.method,
    },
  });

  await recordAudit({
    actor: user,
    action: "record_payment",
    purpose: "Contract settlement",
    targetType: "Contract",
    targetId: contract.id,
  });

  const newTotal = alreadyPaid + parsed.data.amountRs;
  if (newTotal >= contract.totalValueRs - 0.01) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: "completed" },
    });
  }

  return NextResponse.json({ ok: true });
}
