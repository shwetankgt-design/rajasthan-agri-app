import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);
const ISSUER = "rajasthan-agri-app";
export const SESSION_COOKIE = "raa_session";
const SESSION_HOURS = 12;

export type SessionClaims = {
  sub: string; // userId
  role: string;
};

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(SECRET);
}

export async function verifySession(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER });
    return {
      sub: payload.sub as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  farmerId: string | null;
  fpoId: string | null;
  buyerId: string | null;
};

export async function requireRole(
  allowedRoles: string[],
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySession(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { farmer: true, buyer: true },
  });
  if (!user || user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    farmerId: user.farmer?.id ?? null,
    fpoId: user.fpoId,
    buyerId: user.buyer?.id ?? null,
  };
}
