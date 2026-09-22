import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phone and password are required" },
      { status: 400 },
    );
  }

  const { phone, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Invalid phone number or password" },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid phone number or password" },
      { status: 401 },
    );
  }

  const token = await signSession({ sub: user.id, role: user.role });
  await setSessionCookie(token);

  return NextResponse.json({ role: user.role });
}
