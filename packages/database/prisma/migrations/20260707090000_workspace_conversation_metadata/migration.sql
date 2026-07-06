-- Add persistent workspace conversation metadata.
ALTER TABLE "public"."AIConversation"
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AIConversation_organizationId_isPinned_updatedAt_idx"
  ON "public"."AIConversation"("organizationId", "isPinned", "updatedAt");

CREATE INDEX "AIConversation_organizationId_isFavorite_updatedAt_idx"
  ON "public"."AIConversation"("organizationId", "isFavorite", "updatedAt");
