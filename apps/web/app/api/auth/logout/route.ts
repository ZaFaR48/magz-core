import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const session = await getCurrentSession();

  if (session) {
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: "AUTH_LOGOUT",
        entityType: "user",
        entityId: session.userId
      }
    });
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
