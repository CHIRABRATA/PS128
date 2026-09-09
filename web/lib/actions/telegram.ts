"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function generateTelegramLinkTokenAction() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Generate secure 32-char token with timestamp for 15-min expiration window
  const token = crypto.randomBytes(16).toString("hex");
  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramLinkToken: token,
      telegramLinkTokenCreatedAt: now,
    },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "MaitriAlertBot";
  const linkUrl = `https://t.me/${botUsername}?start=${token}`;

  return {
    success: true,
    token,
    botUsername,
    linkUrl,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
  };
}

export async function unlinkTelegramAccountAction() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: null,
      telegramLinkToken: null,
      telegramLinkTokenCreatedAt: null,
    },
  });

  return { success: true };
}

export async function getTelegramStatusAction() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthenticated", isLinked: false };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      telegramChatId: true,
      telegramLinkToken: true,
      telegramLinkTokenCreatedAt: true,
    },
  });

  if (!user) {
    return { success: false, error: "User not found", isLinked: false };
  }

  const isLinked = Boolean(user.telegramChatId);
  const now = Date.now();
  const tokenValid =
    Boolean(user.telegramLinkToken) &&
    Boolean(user.telegramLinkTokenCreatedAt) &&
    now - new Date(user.telegramLinkTokenCreatedAt!).getTime() < 15 * 60 * 1000;

  return {
    success: true,
    isLinked,
    telegramChatId: user.telegramChatId,
    activeToken: tokenValid ? user.telegramLinkToken : null,
  };
}
