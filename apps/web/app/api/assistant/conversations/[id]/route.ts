import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import {
  AssistantError,
  deleteAssistantConversation,
  getAssistantConversation
} from "@/lib/ai/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
