#!/usr/bin/env python3
"""
Telegram Webhook Registration CLI Utility for Maitri Platform.

Usage:
  python -m scripts.register_webhook --url https://<DEPLOYED_FASTAPI_URL>/api/telegram/webhook

Environment Variables:
  TELEGRAM_BOT_TOKEN      : Required. Telegram Bot Token from @BotFather.
  TELEGRAM_WEBHOOK_SECRET : Optional. Webhook verification secret token.
  TELEGRAM_WEBHOOK_URL    : Optional. Default webhook URL if --url argument omitted.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.services.telegram_client import TelegramClient


async def main():
    parser = argparse.ArgumentParser(description="Register Telegram Webhook for Maitri Platform")
    parser.add_argument(
        "--url",
        type=str,
        default=settings.TELEGRAM_WEBHOOK_URL or os.environ.get("TELEGRAM_WEBHOOK_URL", ""),
        help="Full HTTPS Webhook URL (e.g. https://api.yourdomain.com/api/telegram/webhook)",
    )
    parser.add_argument(
        "--secret",
        type=str,
        default=settings.TELEGRAM_WEBHOOK_SECRET or os.environ.get("TELEGRAM_WEBHOOK_SECRET", ""),
        help="Webhook secret token for X-Telegram-Bot-Api-Secret-Token verification",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete the currently registered webhook",
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Get current bot and webhook info",
    )

    args = parser.parse_args()

    client = TelegramClient()
    if not client.bot_token:
        print("[ERROR] TELEGRAM_BOT_TOKEN is not set in environment or settings.")
        sys.exit(1)

    if args.info:
        print("Fetching Telegram Bot Info...")
        me_info = await client.get_me()
        print(f"Bot Info: {me_info}")
        return

    if args.delete:
        print("Deleting Telegram Webhook...")
        res = await client.delete_webhook()
        print(f"Result: {res}")
        return

    webhook_url = args.url.strip()
    if not webhook_url:
        print("[ERROR] Webhook URL must be provided via --url argument or TELEGRAM_WEBHOOK_URL env var.")
        sys.exit(1)

    if not webhook_url.startswith("https://"):
        print("[WARNING] Telegram Bot API requires HTTPS webhook URLs (except local testing tunnels).")

    print(f"Registering Telegram Webhook URL: {webhook_url}")
    res = await client.set_webhook(
        webhook_url=webhook_url,
        secret_token=args.secret.strip() or None,
        allowed_updates=["message"],
    )

    if res.get("ok"):
        print(f"[SUCCESS] Telegram webhook registered successfully: {res.get('description', 'OK')}")
    else:
        print(f"[ERROR] Failed to register webhook: {res.get('description')}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
