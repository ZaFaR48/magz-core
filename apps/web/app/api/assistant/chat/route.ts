import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { AssistantError, sendAssistantMessage } from "@/lib/ai/service";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  conversationId: z.string().trim().min(1).optional().nullable(),
  routeKey: z.string().trim().min(1).max(120).optional().nullable()
});

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assistant chat payload." }, { status: 400 });
  }

  // TODO: add per-organization and per-user rate limits before public launch.
  try {
    const result = await sendAssistantMessage({
      session,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      routeKey: parsed.data.routeKey
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AssistantError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Assistant provider failed." }, { status: 502 });
  }
}
