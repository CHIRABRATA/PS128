import { prisma } from "@/lib/db/prisma";
import { NotificationStatus, NotificationChannel, UserRole, UserStatus } from "@prisma/client";
import { getDictionary, Locale } from "@/lib/i18n";
import { sendTelegramMessage } from "./client";

/**
 * PHASE 9: Telegram Notification Worker & Delivery State Machine
 *
 * CRASH EDGE CASE DOCUMENTATION:
 * The atomic PENDING -> SENDING claim guarantees that concurrent workers do not
 * simultaneously dispatch the same delivery.
 *
 * Edge case: If a worker successfully dispatches a Telegram message, but crashes
 * before updating the NotificationDelivery record from SENDING to SENT, a later
 * stale-claim recovery loop (SENDING > 5 mins) will re-claim and retry sending
 * the message. This may result in duplicate Telegram calls in crash scenarios.
 * This is an inherent limitation of external provider delivery without two-phase commit.
 */

export async function dispatchOutbreakAlertNotifications(alertId: string): Promise<{ createdCount: number }> {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        village: {
          include: {
            block: {
              include: {
                district: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      return { createdCount: 0 };
    }

    const districtId = alert.village?.block?.districtId;

    // Find eligible authority and vet users with telegramChatId configured
    const targetUsers = await prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        telegramChatId: { not: null },
        OR: [
          ...(districtId ? [{ role: UserRole.DISTRICT_AUTHORITY, districtId }] : [{ role: UserRole.DISTRICT_AUTHORITY }]),
          ...(districtId
            ? [{ role: UserRole.VETERINARIAN, OR: [{ districtId }, { districtId: null }] }]
            : [{ role: UserRole.VETERINARIAN }]),
        ],
      },
    });

    let createdCount = 0;
    for (const user of targetUsers) {
      try {
        await prisma.notificationDelivery.create({
          data: {
            alertId: alert.id,
            userId: user.id,
            channel: NotificationChannel.TELEGRAM,
            status: NotificationStatus.PENDING,
          },
        });
        createdCount++;
      } catch {
        // Unique constraint @@unique([alertId, userId, channel]) prevents duplicate records
      }
    }

    // Mark Alert.notifiedAt if not already set (indicates initial dispatch cycle was attempted)
    if (!alert.notifiedAt) {
      await prisma.alert.update({
        where: { id: alertId },
        data: { notifiedAt: new Date() },
      });
    }

    // Trigger processing worker
    await processPendingNotificationDeliveries();

    return { createdCount };
  } catch (error) {
    console.error("[Telegram Notifications] Error dispatching outbreak alert notifications:", error);
    return { createdCount: 0 };
  }
}

export async function processPendingNotificationDeliveries(): Promise<{ processedCount: number; successCount: number }> {
  let processedCount = 0;
  let successCount = 0;

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find deliveries that need dispatch: PENDING, FAILED (< 3 attempts), or stale SENDING (> 5 mins)
    const candidates = await prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.TELEGRAM,
        attemptCount: { lt: 3 },
        OR: [
          { status: NotificationStatus.PENDING },
          { status: NotificationStatus.FAILED },
          { status: NotificationStatus.SENDING, updatedAt: { lt: fiveMinutesAgo } },
        ],
      },
      include: {
        alert: {
          include: {
            village: {
              include: {
                block: {
                  include: {
                    district: true,
                  },
                },
              },
            },
          },
        },
        user: true,
      },
      take: 50,
    });

    for (const delivery of candidates) {
      if (!delivery.user.telegramChatId) {
        continue;
      }

      // ATOMIC WORKER CLAIM: PENDING / FAILED / stale SENDING -> SENDING
      const claim = await prisma.notificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: delivery.status,
          updatedAt: delivery.updatedAt,
        },
        data: {
          status: NotificationStatus.SENDING,
          attemptCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // Skip if another worker claimed this delivery concurrently
      if (claim.count !== 1) {
        continue;
      }

      processedCount++;

      // Render localized message
      const locale = (delivery.user.preferredLanguage === "hi" ? "hi" : "en") as Locale;
      const dict = getDictionary(locale);
      const districtName = delivery.alert.village?.block?.district?.name || "Unknown";

      const riskLevel = delivery.alert.caseCount >= 5 ? "CRITICAL" : "HIGH";

      const messageText = [
        dict.notifications.outbreakAlertTitle,
        "",
        `📍 ${dict.notifications.district}: ${districtName}`,
        `⚡ ${dict.notifications.riskLevel}: ${riskLevel}`,
        `📊 ${dict.notifications.qualifyingCases}: ${delivery.alert.caseCount}`,
        `🩺 ${dict.notifications.recommendedActions}: Immediate field inspection & quarantine protocol.`,
      ].join("\n");

      // Dispatch Telegram API call
      const sendResult = await sendTelegramMessage(delivery.user.telegramChatId, messageText);

      if (sendResult.success) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            lastError: null,
          },
        });
        successCount++;
      } else {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationStatus.FAILED,
            lastError: sendResult.error || "Failed to deliver message via Telegram",
          },
        });
      }
    }
  } catch (error) {
    console.error("[Telegram Worker] Error processing pending notification deliveries:", error);
  }

  return { processedCount, successCount };
}
