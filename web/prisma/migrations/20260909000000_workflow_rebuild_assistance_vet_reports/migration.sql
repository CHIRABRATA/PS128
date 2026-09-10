-- CreateEnum
CREATE TYPE "AssistanceRequestStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AssistanceRequest" (
    "id" TEXT NOT NULL,
    "farmerUserId" TEXT NOT NULL,
    "animalId" TEXT,
    "farmId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AssistanceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "assignedAgentUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeterinaryReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "vetUserId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "action" "VetAction" NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "instructions" TEXT,
    "prescription" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeterinaryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistanceRequest_caseId_key" ON "AssistanceRequest"("caseId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_farmerUserId_idx" ON "AssistanceRequest"("farmerUserId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_assignedAgentUserId_idx" ON "AssistanceRequest"("assignedAgentUserId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_villageId_idx" ON "AssistanceRequest"("villageId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_status_idx" ON "AssistanceRequest"("status");

-- CreateIndex
CREATE INDEX "VeterinaryReport_caseId_idx" ON "VeterinaryReport"("caseId");

-- CreateIndex
CREATE INDEX "VeterinaryReport_animalId_idx" ON "VeterinaryReport"("animalId");

-- CreateIndex
CREATE INDEX "VeterinaryReport_vetUserId_idx" ON "VeterinaryReport"("vetUserId");

-- CreateIndex
CREATE INDEX "VeterinaryReport_createdAt_idx" ON "VeterinaryReport"("createdAt");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");

-- CreateIndex
CREATE INDEX "InAppNotification_read_idx" ON "InAppNotification"("read");

-- CreateIndex
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_farmerUserId_fkey" FOREIGN KEY ("farmerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_assignedAgentUserId_fkey" FOREIGN KEY ("assignedAgentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryReport" ADD CONSTRAINT "VeterinaryReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryReport" ADD CONSTRAINT "VeterinaryReport_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeterinaryReport" ADD CONSTRAINT "VeterinaryReport_vetUserId_fkey" FOREIGN KEY ("vetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
