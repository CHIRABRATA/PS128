-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "iotTelemetry" JSONB,
ADD COLUMN     "submissionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Case_submissionId_key" ON "Case"("submissionId");
