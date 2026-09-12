-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IoTDeviceSource') THEN
        CREATE TYPE "IoTDeviceSource" AS ENUM ('REAL', 'SIMULATED');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IoTDeviceStatus') THEN
        CREATE TYPE "IoTDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'SIMULATING');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IoTDevice" (
    "id" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "animalId" TEXT,
    "source" "IoTDeviceSource" NOT NULL DEFAULT 'SIMULATED',
    "status" "IoTDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "lastTemperature" DOUBLE PRECISION,
    "lastActivity" INTEGER,
    "lastAnomalyState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IoTReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "animalId" TEXT,
    "source" "IoTDeviceSource" NOT NULL DEFAULT 'SIMULATED',
    "temperature" DOUBLE PRECISION NOT NULL,
    "activityIndex" INTEGER NOT NULL,
    "hasAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IoTReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IoTDevice_deviceIdentifier_key" ON "IoTDevice"("deviceIdentifier");
CREATE INDEX IF NOT EXISTS "IoTDevice_animalId_idx" ON "IoTDevice"("animalId");
CREATE INDEX IF NOT EXISTS "IoTDevice_deviceIdentifier_idx" ON "IoTDevice"("deviceIdentifier");
CREATE INDEX IF NOT EXISTS "IoTDevice_source_idx" ON "IoTDevice"("source");
CREATE INDEX IF NOT EXISTS "IoTDevice_status_idx" ON "IoTDevice"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IoTReading_deviceId_idx" ON "IoTReading"("deviceId");
CREATE INDEX IF NOT EXISTS "IoTReading_animalId_idx" ON "IoTReading"("animalId");
CREATE INDEX IF NOT EXISTS "IoTReading_recordedAt_idx" ON "IoTReading"("recordedAt");
CREATE INDEX IF NOT EXISTS "IoTReading_hasAnomaly_idx" ON "IoTReading"("hasAnomaly");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IoTDevice_animalId_fkey'
    ) THEN
        ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IoTReading_deviceId_fkey'
    ) THEN
        ALTER TABLE "IoTReading" ADD CONSTRAINT "IoTReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "IoTDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IoTReading_animalId_fkey'
    ) THEN
        ALTER TABLE "IoTReading" ADD CONSTRAINT "IoTReading_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
