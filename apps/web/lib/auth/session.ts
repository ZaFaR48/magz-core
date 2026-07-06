import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleAtLeast, type MagzRole } from "@magz/core";
import { SESSION_COOKIE, verifySessionToken } from "./token";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return token ? verifySessionToken(token) : null;
}

export async function requireCurrentSession(requiredRole: MagzRole = "USER") {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!roleAtLeast(session.role, requiredRole)) {
    redirect("/workspace");
  }

  return session;
}
