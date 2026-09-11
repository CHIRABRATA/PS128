-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TelegramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramNotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "telegramConnectionId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "telegramMessageId" INTEGER,
    "status" "NotificationStatus" NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "TelegramNotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramConnection_userId_key" ON "TelegramConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramConnection_telegramChatId_key" ON "TelegramConnection"("telegramChatId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramConnection_telegramChatId_idx" ON "TelegramConnection"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkToken_tokenHash_key" ON "TelegramLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_userId_idx" ON "TelegramLinkToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramNotificationDelivery_notificationId_idx" ON "TelegramNotificationDelivery"("notificationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramNotificationDelivery_telegramConnectionId_idx" ON "TelegramNotificationDelivery"("telegramConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramNotificationDelivery_notificationId_telegramConnect_key" ON "TelegramNotificationDelivery"("notificationId", "telegramConnectionId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TelegramConnection_userId_fkey'
    ) THEN
        ALTER TABLE "TelegramConnection" ADD CONSTRAINT "TelegramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TelegramLinkToken_userId_fkey'
    ) THEN
        ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TelegramNotificationDelivery_notificationId_fkey'
    ) THEN
        ALTER TABLE "TelegramNotificationDelivery" ADD CONSTRAINT "TelegramNotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "InAppNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TelegramNotificationDelivery_telegramConnectionId_fkey'
    ) THEN
        ALTER TABLE "TelegramNotificationDelivery" ADD CONSTRAINT "TelegramNotificationDelivery_telegramConnectionId_fkey" FOREIGN KEY ("telegramConnectionId") REFERENCES "TelegramConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
