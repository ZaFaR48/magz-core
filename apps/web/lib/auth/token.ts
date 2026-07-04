import { jwtVerify, SignJWT } from "jose";
import { assertRole, type MagzRole } from "@magz/core";

export const SESSION_COOKIE = "magz_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: MagzRole;
  email: string;
  name?: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return new TextEncoder().encode(secret ?? "dev-only-change-this-magz-secret");
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("magz.dev")
    .setAudience("magz.core")
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "magz.dev",
      audience: "magz.core"
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.organizationId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: assertRole(payload.role),
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null
    };
  } catch {
    return null;
  }
}
