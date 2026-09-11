"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { generateSecureLinkToken, hashLinkToken } from "@/lib/telegram/security";

export interface TelegramLinkTokenResult {
  success: boolean;
  error?: string;
  token?: string;
  botUsername?: string;
  linkUrl?: string;
  expiresAt?: string;
}

export interface TelegramStatusResult {
  success: boolean;
  error?: string;
  isLinked: boolean;
  username?: string;
  connectedAt?: string;
}

export interface TelegramUnlinkResult {
  success: boolean;
  error?: string;
}

/**
 * Generates a single-use, short-lived (10-minute) Telegram linking token for the authenticated user.
 * 
 * Security rules:
 * 1. Generates 32 cryptographically secure random bytes.
 * 2. Raw token is NEVER stored in the database — only its SHA-256 hash is saved.
 * 3. Invalidates previous unused tokens for the user.
 * 4. Generates deep link: https://t.me/<BOT_USERNAME>?start=<RAW_TOKEN>
 */
export async function generateTelegramLinkTokenAction(): Promise<TelegramLinkTokenResult> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Unauthenticated: Please log in." };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "User record not found." };
    }

    // Generate secure 32-byte (64 hex chars) token and compute its SHA-256 hash
    const rawToken = generateSecureLinkToken();
    const tokenHash = hashLinkToken(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10-minute expiration

    // Atomically invalidate previous unused tokens for this user and store the new token hash
    await prisma.$transaction([
      prisma.telegramLinkToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      prisma.telegramLinkToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "MaitriAlertBot";
    const linkUrl = `https://t.me/${botUsername}?start=${rawToken}`;

    return {
      success: true,
      token: rawToken,
      botUsername,
      linkUrl,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (err: unknown) {
    console.error("[Generate Telegram Link Token Error]:", err);
    return {
      success: false,
      error: "Unable to generate Telegram link token. Please try again.",
    };
  }
}

/**
 * Retrieves the Telegram connection status for the authenticated user.
 * 
 * Returns only safe user-facing connection state:
 * - isLinked: boolean
 * - username: optional Telegram username (e.g. @janedoe)
 * - connectedAt: optional ISO date string
 * 
 * Never returns bot tokens, link tokens, hashes, or chat IDs.
 */
export async function getTelegramStatusAction(): Promise<TelegramStatusResult> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Unauthenticated", isLinked: false };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        telegramConnection: {
          select: {
            isActive: true,
            telegramUsername: true,
            connectedAt: true,
          },
        },
        telegramChatId: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found", isLinked: false };
    }

    const connection = user.telegramConnection;
    const isLinked = Boolean(connection && connection.isActive);

    return {
      success: true,
      isLinked,
      username: connection?.telegramUsername || undefined,
      connectedAt: connection?.connectedAt ? connection.connectedAt.toISOString() : undefined,
    };
  } catch (err: unknown) {
    console.error("[Get Telegram Status Error]:", err);
    return {
      success: false,
      error: "Failed to retrieve Telegram connection status.",
      isLinked: false,
    };
  }
}

/**
 * Disconnects / unlinks the authenticated user's Telegram connection.
 * 
 * Strictly operates on the current user's connection:
 * - Sets TelegramConnection.isActive = false (or deletes it)
 * - Invalidates active unused link tokens
 * - Prevents future Telegram notifications from delivering to this account
 */
export async function unlinkTelegramAccountAction(): Promise<TelegramUnlinkResult> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Unauthenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Atomically deactivate user's Telegram connection and clean up active link tokens
    await prisma.$transaction([
      prisma.telegramConnection.updateMany({
        where: { userId: user.id },
        data: {
          isActive: false,
        },
      }),
      prisma.telegramLinkToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: null,
          telegramLinkToken: null,
          telegramLinkTokenCreatedAt: null,
        },
      }),
    ]);

    return { success: true };
  } catch (err: unknown) {
    console.error("[Unlink Telegram Error]:", err);
    return {
      success: false,
      error: "Unable to disconnect Telegram account.",
    };
  }
}
