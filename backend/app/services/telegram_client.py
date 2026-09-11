import json
import logging
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


class TelegramClientError(Exception):
    """Base exception for Telegram Bot API errors."""
    pass


class TelegramClient:
    """
    Server-side Telegram Bot API Client for FastAPI backend.
    Interacts directly with https://api.telegram.org/bot<TOKEN>/<METHOD>.
    """

    def __init__(
        self,
        bot_token: Optional[str] = None,
        api_base_url: Optional[str] = None,
        timeout: float = 5.0,
    ):
        self.bot_token = bot_token or settings.TELEGRAM_BOT_TOKEN
        self.api_base_url = (api_base_url or settings.TELEGRAM_API_BASE_URL).rstrip("/")
        self.timeout = timeout

    def _get_url(self, method: str) -> str:
        if not self.bot_token:
            raise TelegramClientError("TELEGRAM_BOT_TOKEN is not configured.")
        return f"{self.api_base_url}/bot{self.bot_token}/{method}"

    async def send_message(
        self,
        chat_id: str | int,
        text: str,
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = True,
        reply_markup: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Sends a text message to a specific Telegram chat ID.
        """
        if not self.bot_token:
            logger.warning("[Telegram Client] Cannot send message: TELEGRAM_BOT_TOKEN is not set.")
            return {"ok": False, "description": "TELEGRAM_BOT_TOKEN not configured"}

        url = self._get_url("sendMessage")
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        if HAS_HTTPX:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, json=payload)
                    data = response.json()
                    if not response.is_success or not data.get("ok"):
                        error_desc = data.get("description", f"HTTP {response.status_code}")
                        logger.error(f"[Telegram Client] sendMessage failed: {error_desc}")
                        return {"ok": False, "description": error_desc}
                    return data
            except httpx.TimeoutException:
                logger.error("[Telegram Client] sendMessage timed out after 5.0s")
                return {"ok": False, "description": "Request timed out"}
            except Exception as err:
                logger.error(f"[Telegram Client] Network error during sendMessage: {err}")
                return {"ok": False, "description": str(err)}
        else:
            # Fallback to standard library urllib
            try:
                data_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=data_bytes,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    return resp_data
            except urllib.error.HTTPError as http_err:
                try:
                    err_payload = json.loads(http_err.read().decode("utf-8"))
                    return err_payload
                except Exception:
                    return {"ok": False, "description": f"HTTP Error {http_err.code}"}
            except Exception as err:
                logger.error(f"[Telegram Client] Network error during sendMessage: {err}")
                return {"ok": False, "description": str(err)}

    async def get_me(self) -> Dict[str, Any]:
        """
        Tests the bot token and returns basic information about the bot.
        """
        if not self.bot_token:
            return {"ok": False, "description": "TELEGRAM_BOT_TOKEN not configured"}

        url = self._get_url("getMe")
        if HAS_HTTPX:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url)
                    return response.json()
            except Exception as err:
                logger.error(f"[Telegram Client] getMe failed: {err}")
                return {"ok": False, "description": str(err)}
        else:
            try:
                req = urllib.request.Request(url, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as err:
                logger.error(f"[Telegram Client] getMe failed: {err}")
                return {"ok": False, "description": str(err)}

    async def set_webhook(
        self,
        webhook_url: str,
        secret_token: Optional[str] = None,
        allowed_updates: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Registers the production webhook URL with Telegram.
        """
        if not self.bot_token:
            return {"ok": False, "description": "TELEGRAM_BOT_TOKEN not configured"}

        url = self._get_url("setWebhook")
        payload: Dict[str, Any] = {"url": webhook_url}
        if secret_token:
            payload["secret_token"] = secret_token
        if allowed_updates:
            payload["allowed_updates"] = allowed_updates

        if HAS_HTTPX:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, json=payload)
                    data = response.json()
                    if not response.is_success or not data.get("ok"):
                        logger.error(f"[Telegram Client] setWebhook failed: {data.get('description')}")
                    return data
            except Exception as err:
                logger.error(f"[Telegram Client] setWebhook error: {err}")
                return {"ok": False, "description": str(err)}
        else:
            try:
                data_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=data_bytes,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10.0) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as err:
                logger.error(f"[Telegram Client] setWebhook error: {err}")
                return {"ok": False, "description": str(err)}

    async def delete_webhook(self) -> Dict[str, Any]:
        """
        Deletes the registered webhook from Telegram.
        """
        if not self.bot_token:
            return {"ok": False, "description": "TELEGRAM_BOT_TOKEN not configured"}

        url = self._get_url("deleteWebhook")
        if HAS_HTTPX:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url)
                    return response.json()
            except Exception as err:
                logger.error(f"[Telegram Client] deleteWebhook error: {err}")
                return {"ok": False, "description": str(err)}
        else:
            try:
                req = urllib.request.Request(url, data=b"", method="POST")
                with urllib.request.urlopen(req, timeout=10.0) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as err:
                logger.error(f"[Telegram Client] deleteWebhook error: {err}")
                return {"ok": False, "description": str(err)}


# Default singleton instance
telegram_client = TelegramClient()
