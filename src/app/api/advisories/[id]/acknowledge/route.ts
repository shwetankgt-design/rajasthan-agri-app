import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FARMER" || !user.farmerId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const advisory = await prisma.advisory.findUnique({
    where: { id },
    include: { cropCycle: { include: { plot: true } } },
  });
  if (!advisory || advisory.cropCycle.plot.farmerId !== user.farmerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.advisory.update({
    where: { id },
    data: { acknowledged: true, acknowledgedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
