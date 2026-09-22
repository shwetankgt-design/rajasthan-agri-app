import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findActiveContractBlockingErasure } from "@/lib/dataSubjectRights";
import { recordAudit } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const request = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 });
  }

  if (request.requestType === "erasure") {
    const blocker = await findActiveContractBlockingErasure(request.farmerId);
    if (blocker) {
      await prisma.dataSubjectRequest.update({
        where: { id },
        data: {
          status: "blocked",
          blockedReason: `Referenced by an active contract (${blocker.contractId}) with ${blocker.buyerLegalName} — cannot erase until settled.`,
          resolvedAt: new Date(),
        },
      });
      await recordAudit({
        actor: user,
        action: "data_subject_request_blocked",
        purpose: "Erasure blocked by retention exception",
        targetType: "Farmer",
        targetId: request.farmerId,
      });
      return NextResponse.json({ status: "blocked" });
    }
  }

  await prisma.dataSubjectRequest.update({
    where: { id },
    data: { status: "completed", resolvedAt: new Date() },
  });

  await recordAudit({
    actor: user,
    action: `data_subject_request_${request.requestType}_completed`,
    purpose: "Data subject rights request resolved",
    targetType: "Farmer",
    targetId: request.farmerId,
  });

  return NextResponse.json({ status: "completed" });
}
