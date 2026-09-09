-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'FIELD_AGENT', 'VETERINARIAN', 'DISTRICT_AUTHORITY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('FIELD_AGENT', 'FARMER', 'IVR');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('PENDING_REVIEW', 'UNDER_EXAMINATION', 'LAB_REFERRAL', 'CONFIRMED', 'CLOSED_HARMLESS');

-- CreateEnum
CREATE TYPE "VetAction" AS ENUM ('ISOLATE', 'TREAT', 'MONITOR', 'REFER_LAB', 'NONE');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('COLLECTED', 'SENT', 'RESULT_PENDING', 'RESULT_RECEIVED');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('CATTLE', 'BUFFALO', 'GOAT', 'SHEEP', 'PIG', 'POULTRY', 'OTHER', 'COW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FARMER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "telegramChatId" TEXT,
    "telegramLinkToken" TEXT,
    "districtId" TEXT,
    "blockId" TEXT,
    "villageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "farmerUserId" TEXT,
    "fieldAgentUserId" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Herd" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Herd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "herdId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "breed" TEXT,
    "ageMonths" INTEGER,
    "iotDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reportSource" "ReportSource" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "symptoms" TEXT[],
    "mortalityCount" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "affectedCount" INTEGER NOT NULL DEFAULT 1,
    "gpsLat" DECIMAL(10,8),
    "gpsLng" DECIMAL(11,8),
    "analysisResult" JSONB,
    "visionResult" JSONB,
    "vetDiagnosis" TEXT,
    "vetRecommendedAction" "VetAction",
    "vetFollowUpDate" TIMESTAMP(3),
    "vetNotes" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccinationRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "dateGiven" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "administeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaccinationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "caseId" TEXT,
    "medication" TEXT NOT NULL,
    "dateGiven" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "administeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "collectedByUserId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "labName" TEXT,
    "sentAt" TIMESTAMP(3),
    "resultReceivedAt" TIMESTAMP(3),
    "resultSummary" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "diseaseName" TEXT,
    "caseCount" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- CreateIndex
CREATE INDEX "User_blockId_idx" ON "User"("blockId");

-- CreateIndex
CREATE INDEX "User_villageId_idx" ON "User"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE INDEX "Block_districtId_idx" ON "Block"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_districtId_name_key" ON "Block"("districtId", "name");

-- CreateIndex
CREATE INDEX "Village_blockId_idx" ON "Village"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "Village_blockId_name_key" ON "Village"("blockId", "name");

-- CreateIndex
CREATE INDEX "Farm_villageId_idx" ON "Farm"("villageId");

-- CreateIndex
CREATE INDEX "Farm_farmerUserId_idx" ON "Farm"("farmerUserId");

-- CreateIndex
CREATE INDEX "Farm_fieldAgentUserId_idx" ON "Farm"("fieldAgentUserId");

-- CreateIndex
CREATE INDEX "Herd_farmId_idx" ON "Herd"("farmId");

-- CreateIndex
CREATE INDEX "Animal_herdId_idx" ON "Animal"("herdId");

-- CreateIndex
CREATE INDEX "Animal_iotDeviceId_idx" ON "Animal"("iotDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_herdId_tag_key" ON "Animal"("herdId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_animalId_idx" ON "Case"("animalId");

-- CreateIndex
CREATE INDEX "Case_createdByUserId_idx" ON "Case"("createdByUserId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_reportedAt_idx" ON "Case"("reportedAt");

-- CreateIndex
CREATE INDEX "Case_reviewedAt_idx" ON "Case"("reviewedAt");

-- CreateIndex
CREATE INDEX "Case_confirmedAt_idx" ON "Case"("confirmedAt");

-- CreateIndex
CREATE INDEX "VaccinationRecord_animalId_idx" ON "VaccinationRecord"("animalId");

-- CreateIndex
CREATE INDEX "VaccinationRecord_administeredByUserId_idx" ON "VaccinationRecord"("administeredByUserId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_animalId_idx" ON "TreatmentRecord"("animalId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_caseId_idx" ON "TreatmentRecord"("caseId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_administeredByUserId_idx" ON "TreatmentRecord"("administeredByUserId");

-- CreateIndex
CREATE INDEX "Sample_caseId_idx" ON "Sample"("caseId");

-- CreateIndex
CREATE INDEX "Sample_collectedByUserId_idx" ON "Sample"("collectedByUserId");

-- CreateIndex
CREATE INDEX "Alert_villageId_idx" ON "Alert"("villageId");

-- CreateIndex
CREATE INDEX "Alert_active_idx" ON "Alert"("active");

-- CreateIndex
CREATE INDEX "Alert_windowStart_windowEnd_idx" ON "Alert"("windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "ChatConversation_animalId_idx" ON "ChatConversation"("animalId");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_farmerUserId_fkey" FOREIGN KEY ("farmerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_fieldAgentUserId_fkey" FOREIGN KEY ("fieldAgentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Herd" ADD CONSTRAINT "Herd_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_herdId_fkey" FOREIGN KEY ("herdId") REFERENCES "Herd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccinationRecord" ADD CONSTRAINT "VaccinationRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccinationRecord" ADD CONSTRAINT "VaccinationRecord_administeredByUserId_fkey" FOREIGN KEY ("administeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_administeredByUserId_fkey" FOREIGN KEY ("administeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
