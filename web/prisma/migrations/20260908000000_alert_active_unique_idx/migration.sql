-- CreateUniqueIndex for active alerts per village to prevent duplicate active alerts under concurrent evaluations
CREATE UNIQUE INDEX IF NOT EXISTS "Alert_villageId_active_unique_idx" ON "Alert" ("villageId") WHERE "active" = true;
