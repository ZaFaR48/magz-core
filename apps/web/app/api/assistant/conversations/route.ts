import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import { listAssistantConversations } from "@/lib/ai/service";

export async function GET() {
  const session = await requireCurrentSession();
  const result = await listAssistantConversations(session);

  return NextResponse.json(result);
}
