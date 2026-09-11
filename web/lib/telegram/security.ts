import crypto from "crypto";

/**
 * Generates a cryptographically secure, URL-safe random token for Telegram account linking.
 * Generates at least 32 random bytes (64 hex characters).
 */
export function generateSecureLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes deterministic SHA-256 hash of a raw link token.
 * Raw tokens are NEVER stored in the database — only tokenHash is persisted.
 */
export function hashLinkToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Timing-safe validation of the Telegram Webhook secret header against TELEGRAM_WEBHOOK_SECRET.
 * Returns true if valid or if no secret is configured (optional secret mode).
 * Returns false if header does not match the configured secret.
 */
export function verifyWebhookSecret(secretHeader: string | null | undefined): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // If no secret configured in environment, permit in development/fallback
  if (!expectedSecret) {
    return true;
  }

  if (!secretHeader) {
    return false;
  }

  try {
    const headerBuffer = Buffer.from(secretHeader, "utf-8");
    const secretBuffer = Buffer.from(expectedSecret, "utf-8");

    if (headerBuffer.length !== secretBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(headerBuffer, secretBuffer);
  } catch {
    return false;
  }
}
