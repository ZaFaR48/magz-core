-- Track Workspace quick-tool source on AI conversations.
ALTER TABLE "public"."AIConversation"
  ADD COLUMN "toolType" TEXT;

CREATE INDEX "AIConversation_organizationId_toolType_updatedAt_idx"
  ON "public"."AIConversation"("organizationId", "toolType", "updatedAt");
