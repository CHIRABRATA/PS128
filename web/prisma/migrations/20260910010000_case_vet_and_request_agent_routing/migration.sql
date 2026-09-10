-- AlterTable AssistanceRequest
ALTER TABLE "AssistanceRequest" RENAME COLUMN "assignedAgentUserId" TO "assignedFieldAgentUserId";
ALTER TABLE "AssistanceRequest" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "AssistanceRequest" ADD COLUMN "assignmentLevel" TEXT;

-- Recreate index and foreign key constraint for assignedFieldAgentUserId
DROP INDEX IF EXISTS "AssistanceRequest_assignedAgentUserId_idx";
CREATE INDEX "AssistanceRequest_assignedFieldAgentUserId_idx" ON "AssistanceRequest"("assignedFieldAgentUserId");

ALTER TABLE "AssistanceRequest" DROP CONSTRAINT IF EXISTS "AssistanceRequest_assignedAgentUserId_fkey";
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_assignedFieldAgentUserId_fkey" FOREIGN KEY ("assignedFieldAgentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Case
ALTER TABLE "Case" ADD COLUMN "assignedVeterinarianUserId" TEXT;
ALTER TABLE "Case" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN "assignmentLevel" TEXT;

-- CreateIndex
CREATE INDEX "Case_assignedVeterinarianUserId_idx" ON "Case"("assignedVeterinarianUserId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedVeterinarianUserId_fkey" FOREIGN KEY ("assignedVeterinarianUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
