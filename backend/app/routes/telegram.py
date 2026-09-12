import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from fastapi import APIRouter, Header, HTTPException, Request, status
except ImportError:
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class APIRouter:
        def __init__(self, *args, **kwargs):
            pass

        def post(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

    def Header(default=None, **kwargs):
        return default

    class status:
        HTTP_401_UNAUTHORIZED = 401

    class Request:
        pass

from app.config import settings
from app.services.telegram_client import telegram_client
from app.services.telegram_db import telegram_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])

# Standardized Telegram User Messages
MSG_WELCOME_PROMPT = (
    "<b>Welcome to Maitri!</b>\n\n"
    "To receive real-time livestock health notifications, please click "
    "<b>'Connect Telegram'</b> on your Maitri Profile page to link this chat."
)
MSG_INVALID_TOKEN = "Sorry, this Telegram connection link is invalid."
MSG_EXPIRED_TOKEN = (
    "This Telegram connection link has expired. Please generate a new link from your Maitri profile."
)
MSG_USED_TOKEN = "This Telegram connection link has already been used."
MSG_ALREADY_CONNECTED = "This Telegram account is already connected to a Maitri account."
MSG_INTERNAL_FAILURE = (
    "Something went wrong while connecting your Telegram account. Please try again from Maitri."
)
MSG_SUCCESS_CONNECTED = (
    "<b>Maitri Telegram Connected</b>\n\n"
    "Your Telegram account has been successfully connected to your Maitri account.\n\n"
    "You will now receive important Maitri notifications here."
)


def verify_secret_header(header_secret: Optional[str]) -> bool:
    """
    Validates incoming webhook secret token using timing-safe comparison.
    """
    expected_secret = settings.TELEGRAM_WEBHOOK_SECRET
    if not expected_secret:
        return True

    if not header_secret:
        return False

    return hmac.compare_digest(header_secret, expected_secret)


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None, alias="X-Telegram-Bot-Api-Secret-Token"),
):
    """
    Authoritative Telegram Webhook endpoint for the Maitri platform.
    Processes incoming Telegram Bot Updates, parses /start <token>, and links accounts.
    """
    # 1. Webhook Secret Security Validation
    if not verify_secret_header(x_telegram_bot_api_secret_token):
        logger.warning("[Telegram Webhook] Unauthorized request: secret token mismatch.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized webhook request",
        )

    try:
        update: Dict[str, Any] = await request.json()
    except Exception:
        return {"ok": True, "status": "invalid_json"}

    # 2. Extract Message & Chat Info
    message = update.get("message")
    if not message:
        return {"ok": True, "status": "ignored_non_message"}

    chat = message.get("chat")
    text = (message.get("text") or "").strip()

    if not chat or not chat.get("id") or not text:
        return {"ok": True, "status": "ignored_empty_content"}

    chat_id = str(chat["id"])
    username = message.get("from", {}).get("username")

    # 3. Handle /start command
    if not text.startswith("/start"):
        return {"ok": True, "status": "ignored_command"}

    # Case A: User sent /start without a linking token
    if text == "/start" or text == "/start ":
        await telegram_client.send_message(chat_id=chat_id, text=MSG_WELCOME_PROMPT)
        return {"ok": True, "status": "welcome_prompt_sent"}

    # Case B: User sent /start <token>
    token = text[7:].strip()
    if not token:
        await telegram_client.send_message(chat_id=chat_id, text=MSG_WELCOME_PROMPT)
        return {"ok": True, "status": "empty_token"}

    # 4. Hash Token (SHA-256)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    try:
        # 5. Find TelegramLinkToken by hash
        link_record = await telegram_db.get_link_token_by_hash(token_hash)
        if not link_record:
            await telegram_client.send_message(chat_id=chat_id, text=MSG_INVALID_TOKEN)
            return {"ok": True, "status": "token_not_found"}

        # 6. Check single-use status
        if link_record.get("usedAt") is not None:
            await telegram_client.send_message(chat_id=chat_id, text=MSG_USED_TOKEN)
            return {"ok": True, "status": "token_already_used"}

        # 7. Check expiration status
        expires_at = link_record.get("expiresAt")
        if expires_at:
            if isinstance(expires_at, str):
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            else:
                expires_dt = expires_at

            if expires_dt.tzinfo is None:
                expires_dt = expires_dt.replace(tzinfo=timezone.utc)

            now_utc = datetime.now(timezone.utc)
            if expires_dt < now_utc:
                await telegram_client.send_message(chat_id=chat_id, text=MSG_EXPIRED_TOKEN)
                return {"ok": True, "status": "token_expired"}

        user_id = link_record["userId"]

        # 8. Anti-hijacking: Check if chat ID is already connected to another user
        existing_connection = await telegram_db.get_connection_by_chat_id(chat_id)
        if existing_connection and existing_connection.get("userId") != user_id:
            await telegram_client.send_message(chat_id=chat_id, text=MSG_ALREADY_CONNECTED)
            return {"ok": True, "status": "chat_already_claimed_by_other_user"}

        # 9. Atomically link connection and mark token as used
        await telegram_db.link_account_atomically(
            token_id=link_record["id"],
            user_id=user_id,
            telegram_chat_id=chat_id,
            telegram_username=username,
        )

        # 10. Send Confirmation Message
        reply_markup = None
        if settings.FRONTEND_URL:
            reply_markup = {
                "inline_keyboard": [
                    [{"text": "Open Maitri", "url": settings.FRONTEND_URL}]
                ]
            }

        await telegram_client.send_message(
            chat_id=chat_id,
            text=MSG_SUCCESS_CONNECTED,
            reply_markup=reply_markup,
        )

        return {
            "ok": True,
            "status": "account_linked",
            "userId": user_id,
            "telegramChatId": chat_id,
        }

    except Exception as err:
        link_record_found = "link_record" in locals() and link_record is not None
        logger.error(
            f"[Telegram Webhook Error] Failed to process link token (token_hash={token_hash}, link_record_found={link_record_found}): {err}"
        )
        try:
            await telegram_client.send_message(chat_id=chat_id, text=MSG_INTERNAL_FAILURE)
        except Exception:
            pass
        return {"ok": True, "status": "internal_error"}
