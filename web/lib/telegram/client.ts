/**
 * Server-only Telegram Bot API Client
 * NEVER import this file in client components.
 */

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
    };
    date: number;
    text?: string;
  };
  description?: string;
  error_code?: number;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN is not configured in environment variables",
    };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await res.json()) as TelegramSendMessageResponse;

    if (!res.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `Telegram API HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Telegram API call timed out after 5000ms"
          : err.message
        : "Unknown network error calling Telegram API";

    return {
      success: false,
      error: errorMessage,
    };
  }
}
