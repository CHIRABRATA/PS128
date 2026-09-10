"use server";

import prisma from "@/lib/db/prisma";
import { requireActiveUser } from "@/lib/auth/session";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  type: string;
}

/**
 * Creates an in-app notification for a user.
 */
export async function createInAppNotification(input: CreateNotificationInput) {
  try {
    return await prisma.inAppNotification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        link: input.link || null,
        type: input.type,
      },
    });
  } catch (err) {
    console.error("[Create Notification Error]:", err);
    return null;
  }
}

/**
 * Retrieves in-app notifications for the authenticated user.
 */
export async function getUserNotificationsAction(limit: number = 20) {
  const appUser = await requireActiveUser();

  const notifications = await prisma.inAppNotification.findMany({
    where: { userId: appUser.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.inAppNotification.count({
    where: { userId: appUser.id, read: false },
  });

  return { notifications, unreadCount };
}

/**
 * Marks a specific in-app notification as read.
 */
export async function markNotificationReadAction(notificationId: string) {
  const appUser = await requireActiveUser();

  await prisma.inAppNotification.updateMany({
    where: {
      id: notificationId,
      userId: appUser.id,
    },
    data: { read: true },
  });

  return { success: true };
}

/**
 * Marks all notifications as read for current user.
 */
export async function markAllNotificationsReadAction() {
  const appUser = await requireActiveUser();

  await prisma.inAppNotification.updateMany({
    where: {
      userId: appUser.id,
      read: false,
    },
    data: { read: true },
  });

  return { success: true };
}
