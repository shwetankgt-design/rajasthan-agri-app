import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/distance";

const schema = z.object({
  fromFacilityId: z.string().min(1),
  toFacilityId: z.string().min(1),
  transporterId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [from, to, transporter] = await Promise.all([
    prisma.facility.findUnique({ where: { id: parsed.data.fromFacilityId } }),
    prisma.facility.findUnique({ where: { id: parsed.data.toFacilityId } }),
    prisma.transporter.findUnique({ where: { id: parsed.data.transporterId } }),
  ]);
  if (!from || !to || !transporter) {
    return NextResponse.json({ error: "Facility or transporter not found" }, { status: 404 });
  }

  const distanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
  const costRs = distanceKm * transporter.ratePerKmRs;

  return NextResponse.json({
    distanceKm: Math.round(distanceKm * 10) / 10,
    costRs: Math.round(costRs),
    // Reproducibility (FR-M8-06): the rate actually used is echoed back, not
    // just the transporter ID, so a later rate-card change doesn't silently
    // change the meaning of a previously shown quote.
    rateUsedRsPerKm: transporter.ratePerKmRs,
    transporterName: transporter.name,
  });
}
