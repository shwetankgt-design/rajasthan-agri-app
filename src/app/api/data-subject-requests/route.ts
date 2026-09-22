import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  requestType: z.enum(["access", "erasure", "portability"]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FARMER" || !user.farmerId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }

  const request = await prisma.dataSubjectRequest.create({
    data: { farmerId: user.farmerId, requestType: parsed.data.requestType },
  });

  await recordAudit({
    actor: user,
    action: `data_subject_request_${parsed.data.requestType}`,
    purpose: "Farmer-initiated data subject rights request",
    targetType: "Farmer",
    targetId: user.farmerId,
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}
