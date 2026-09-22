import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(1),
  audience: z.enum(["farmer", "fpo", "buyer", "all"]),
  category: z.enum(["agronomy", "governance"]),
  cropCode: z.string().optional(),
  operation: z.string().optional(),
  season: z.string().optional(),
  contentBody: z.string().min(1),
  sourceAttribution: z.string().optional(),
  approvingAuthority: z.string().optional(),
  effectiveDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  const item = await prisma.sopContent.create({
    data: {
      title: parsed.data.title,
      audience: parsed.data.audience,
      category: parsed.data.category,
      cropCode: parsed.data.cropCode || null,
      operation: parsed.data.operation || null,
      season: parsed.data.season || null,
      contentBody: parsed.data.contentBody,
      sourceAttribution: parsed.data.sourceAttribution || null,
      approvingAuthority: parsed.data.approvingAuthority || null,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null,
      status: "draft",
    },
  });

  return NextResponse.json({ id: item.id }, { status: 201 });
}
