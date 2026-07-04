import { PageHeader } from "@/components/ui/page-header";
import { listAssistantConversations } from "@/lib/ai/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { AssistantWorkspace } from "@/modules/ai-assistant";

export const metadata = {
  title: "AI Assistant"
};

export default async function AssistantPage() {
  const session = await requireCurrentSession();
  const initialState = await listAssistantConversations(session);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI"
        title="AI Assistant"
        description="A governed workspace for provider-agnostic assistant conversations, route selection, and future AI tool calls."
      />
      <AssistantWorkspace initialState={initialState} />
    </div>
  );
}
