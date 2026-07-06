import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import {
  AssistantError,
  deleteAssistantConversation,
  getAssistantConversation,
  updateAssistantConversation
} from "@/lib/ai/service";
import { z } from "zod";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional()
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  try {
    const result = await getAssistantConversation(id, session);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AssistantError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Conversation could not be loaded." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  try {
    await deleteAssistantConversation(id, session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AssistantError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Conversation could not be deleted." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateConversationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation update." }, { status: 400 });
  }

  try {
    const conversation = await updateAssistantConversation({
      conversationId: id,
      session,
      title: parsed.data.title,
      isPinned: parsed.data.isPinned,
      isFavorite: parsed.data.isFavorite
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof AssistantError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Conversation could not be updated." }, { status: 500 });
  }
}
