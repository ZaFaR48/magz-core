import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/cookies";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/db/prisma";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const membership = user.memberships[0];

  if (!membership) {
    return NextResponse.json({ error: "Account is not attached to an organization." }, { status: 403 });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorId: user.id,
      action: "AUTH_LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent")
    }
  });

  const token = await signSessionToken({
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    email: user.email,
    name: user.name
  });

  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug
    }
  });
}
