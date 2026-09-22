import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  toStatus: z.enum(["draft", "technical_review", "approved", "published", "expired"]),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["technical_review"],
  technical_review: ["approved", "draft"],
  approved: ["published", "technical_review"],
  published: ["expired"],
  expired: [],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const item = await prisma.sopContent.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const allowed = VALID_TRANSITIONS[item.status] ?? [];
  if (!allowed.includes(parsed.data.toStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${item.status} to ${parsed.data.toStatus}` },
      { status: 409 },
    );
  }

  // Content workflow cannot publish an item lacking source attribution or an
  // approver — enforced here, not left to convention (FR-M9-02/03).
  if (parsed.data.toStatus === "published") {
    if (!item.sourceAttribution || !item.approvingAuthority || !item.effectiveDate) {
      return NextResponse.json(
        {
          error:
            "Cannot publish without source attribution, an approving authority and an effective date",
        },
        { status: 422 },
      );
    }
  }

  await prisma.sopContent.update({
    where: { id },
    data: { status: parsed.data.toStatus },
  });

  return NextResponse.json({ ok: true });
}
