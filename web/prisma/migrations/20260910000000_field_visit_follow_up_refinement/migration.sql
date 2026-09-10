-- AlterTable
ALTER TABLE "AssistanceRequest" ALTER COLUMN "villageId" DROP NOT NULL;
ALTER TABLE "AssistanceRequest" ADD COLUMN "blockId" TEXT;
ALTER TABLE "AssistanceRequest" ADD COLUMN "districtId" TEXT;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "followUpCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN "followUpCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VeterinaryReport" ADD COLUMN "followUpCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VeterinaryReport" ADD COLUMN "followUpCompletedAt" TIMESTAMP(3);
ALTER TABLE "VeterinaryReport" ADD COLUMN "followUpNotes" TEXT;

-- CreateTable
CREATE TABLE "FieldVisit" (
    "id" TEXT NOT NULL,
    "assistanceRequestId" TEXT NOT NULL,
    "fieldAgentUserId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "observations" TEXT,
    "measurements" JSONB,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldVisit_assistanceRequestId_key" ON "FieldVisit"("assistanceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldVisit_caseId_key" ON "FieldVisit"("caseId");

-- CreateIndex
CREATE INDEX "FieldVisit_fieldAgentUserId_idx" ON "FieldVisit"("fieldAgentUserId");

-- CreateIndex
CREATE INDEX "FieldVisit_createdAt_idx" ON "FieldVisit"("createdAt");

-- CreateIndex
CREATE INDEX "AssistanceRequest_blockId_idx" ON "AssistanceRequest"("blockId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_districtId_idx" ON "AssistanceRequest"("districtId");

-- CreateIndex
CREATE INDEX "Case_vetFollowUpDate_idx" ON "Case"("vetFollowUpDate");

-- CreateIndex
CREATE INDEX "VeterinaryReport_followUpDate_idx" ON "VeterinaryReport"("followUpDate");

-- CreateIndex
CREATE INDEX "VeterinaryReport_followUpCompleted_idx" ON "VeterinaryReport"("followUpCompleted");

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_assistanceRequestId_fkey" FOREIGN KEY ("assistanceRequestId") REFERENCES "AssistanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_fieldAgentUserId_fkey" FOREIGN KEY ("fieldAgentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVisit" ADD CONSTRAINT "FieldVisit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
