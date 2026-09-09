import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getDictionary, Locale } from "@/lib/i18n";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    // 0. Webhook Rate Limit: 60 requests / min
    const ip = req.headers.get("x-forwarded-for") || "telegram_webhook";
    const rateLimit = checkRateLimit(`telegram_webhook:${ip}`, 60, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many webhook requests" }, { status: 429 });
    }

    // 1. Verify Secret Header
    const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secretHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
    }

    const update = await req.json();

    // Handle Telegram message update
    const message = update?.message;
    if (!message || !message.text || !message.chat?.id) {
      return NextResponse.json({ ok: true, status: "ignored_non_message" });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Check if command is /start <token>
    if (text.startsWith("/start ")) {
      const token = text.substring(7).trim();

      if (!token) {
        return NextResponse.json({ ok: true, status: "missing_token" });
      }

      // Find user with matching token
      const user = await prisma.user.findFirst({
        where: { telegramLinkToken: token },
      });

      const now = Date.now();
      const isExpired =
        !user ||
        !user.telegramLinkTokenCreatedAt ||
        now - new Date(user.telegramLinkTokenCreatedAt).getTime() > 15 * 60 * 1000;

      if (!user || isExpired) {
        // Send expired notification back to chat
        const dict = getDictionary("en");
        await sendTelegramMessage(chatId, dict.notifications.linkExpired);
        return NextResponse.json({ ok: true, status: "token_expired_or_invalid" });
      }

      // Valid token -> Link Telegram Chat ID & clear token
      const locale = (user.preferredLanguage === "hi" ? "hi" : "en") as Locale;
      const dict = getDictionary(locale);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: String(chatId),
          telegramLinkToken: null,
          telegramLinkTokenCreatedAt: null,
        },
      });

      await sendTelegramMessage(chatId, dict.notifications.linkSuccess);

      return NextResponse.json({ ok: true, status: "account_linked", userId: user.id });
    }

    return NextResponse.json({ ok: true, status: "ignored_command" });
  } catch (error) {
    console.error("[Telegram Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
