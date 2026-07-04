import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.organizationId,
        userId: session.userId
      }
    },
    include: {
      organization: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      }
    }
  });

  if (!membership) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: membership.user,
    organization: membership.organization,
    role: membership.role
  });
}
