import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(12000)
});

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  projectId: z.string().optional().nullable(),
  provider: z.string().trim().min(1).max(80).default("magz"),
  model: z.string().trim().max(120).optional().nullable(),
  messages: z.array(messageSchema).min(1).max(100)
});

export async function GET() {
  const session = await requireCurrentSession();

  const conversations = await prisma.aIConversation.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      provider: true,
      model: true,
      status: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = createConversationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation payload." }, { status: 400 });
  }

  const project = parsed.data.projectId
    ? await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          organizationId: session.organizationId
        }
      })
    : null;

  if (parsed.data.projectId && !project) {
    return NextResponse.json({ error: "Project was not found." }, { status: 404 });
  }

  const conversation = await prisma.aIConversation.create({
    data: {
      organizationId: session.organizationId,
      projectId: project?.id,
      userId: session.userId,
      title: parsed.data.title,
      provider: parsed.data.provider,
      model: parsed.data.model,
      messages: parsed.data.messages
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "AI_CONVERSATION_CREATED",
      entityType: "ai_conversation",
      entityId: conversation.id,
      metadata: {
        title: conversation.title,
        messageCount: parsed.data.messages.length
      }
    }
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
