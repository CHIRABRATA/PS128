-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthorityReportType') THEN
        CREATE TYPE "AuthorityReportType" AS ENUM ('CASE_SUMMARY', 'VACCINATION_COVERAGE', 'OUTBREAK_ALERTS');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportFormat') THEN
        CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'PDF');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuthorityExportAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "reportType" "AuthorityReportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorityExportAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthorityExportAudit_userId_idx" ON "AuthorityExportAudit"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthorityExportAudit_districtId_idx" ON "AuthorityExportAudit"("districtId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthorityExportAudit_createdAt_idx" ON "AuthorityExportAudit"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthorityExportAudit_reportType_idx" ON "AuthorityExportAudit"("reportType");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuthorityExportAudit_userId_fkey'
    ) THEN
        ALTER TABLE "AuthorityExportAudit" ADD CONSTRAINT "AuthorityExportAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuthorityExportAudit_districtId_fkey'
    ) THEN
        ALTER TABLE "AuthorityExportAudit" ADD CONSTRAINT "AuthorityExportAudit_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
