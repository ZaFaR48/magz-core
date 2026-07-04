import { PageHeader } from "@/components/ui/page-header";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AssistantWorkspace } from "@/modules/ai-assistant";

export const metadata = {
  title: "AI Assistant"
};

export default async function AssistantPage() {
  const session = await requireCurrentSession();
  const initialConversationCount = await prisma.aIConversation.count({
    where: { organizationId: session.organizationId }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI"
        title="AI Assistant"
        description="A governed workspace for organization-aware assistant conversations and future AI tool calls."
      />
      <AssistantWorkspace initialConversationCount={initialConversationCount} />
    </div>
  );
}
