import { TelegramInlineKeyboardMarkup } from "./client";

/**
 * Escapes characters for Telegram HTML mode:
 * & -> &amp;
 * < -> &lt;
 * > -> &gt;
 * " -> &quot;
 */
export function escapeHtml(unsafeText: string): string {
  if (!unsafeText) return "";
  return unsafeText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Resolves the application base URL for Telegram deep-linking.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://maitri.gov.in";
}

/**
 * Determines an appropriate, concise button label based on notification type.
 */
export function getActionButtonLabel(type: string): string {
  switch (type) {
    case "CASE_ASSIGNED":
      return "📋 Open Case";
    case "ASSISTANCE_ASSIGNED":
      return "🧑‍🌾 Open Request";
    case "ASSISTANCE_ACCEPTED":
      return "🔍 View Request";
    case "VISIT_IN_PROGRESS":
      return "🔍 View Status";
    case "VISIT_COMPLETED":
      return "📄 View Report";
    case "VET_REPORT_SUBMITTED":
      return "📄 View Vet Report";
    case "DIAGNOSIS_CONFIRMED":
      return "🩺 View Diagnosis";
    case "LAB_REFERRAL":
      return "🔬 View Lab Referral";
    case "CASE_CLOSED":
      return "📋 View Case Details";
    case "FOLLOW_UP_COMPLETED":
      return "🩺 View Follow-Up";
    case "CRITICAL_ALERT":
    case "OUTBREAK_ALERT":
      return "⚠️ View Outbreak Alert";
    default:
      return "🔗 Open in Maitri";
  }
}

export interface FormattedTelegramNotification {
  text: string;
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

/**
 * Formats an InAppNotification for delivery via Telegram Bot API with HTML escaping
 * and an inline keyboard button if an authorized route is present.
 */
export function formatTelegramNotification(notification: {
  title: string;
  message: string;
  type: string;
  link?: string | null;
}): FormattedTelegramNotification {
  const safeTitle = escapeHtml(notification.title);
  const safeMessage = escapeHtml(notification.message);

  const text = `<b>${safeTitle}</b>\n\n${safeMessage}`;

  let replyMarkup: TelegramInlineKeyboardMarkup | undefined;

  if (notification.link && notification.link.trim().length > 0) {
    let targetUrl = notification.link.trim();
    if (targetUrl.startsWith("/")) {
      const baseUrl = getAppBaseUrl();
      targetUrl = `${baseUrl}${targetUrl}`;
    }

    // Telegram Bot API requires full HTTP/HTTPS URLs for inline keyboard buttons
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      const buttonLabel = getActionButtonLabel(notification.type);
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: buttonLabel,
              url: targetUrl,
            },
          ],
        ],
      };
    }
  }

  return {
    text,
    replyMarkup,
  };
}
