import os
import asyncio
import logging
import uuid
from typing import Dict, Optional, Any
import httpx
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    PasswordHashInvalidError
)

logger = logging.getLogger("telegram_bridge")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class TelegramBridgeManager:
    def __init__(self):
        # Map account_id -> TelegramClient
        self.active_clients: Dict[str, TelegramClient] = {}
        # Pending login sessions auth_id -> dict
        self.pending_auths: Dict[str, dict] = {}
        # Webhook configuration
        self.webhook_url = os.getenv("LARAVEL_WEBHOOK_URL", "http://127.0.0.1:8000/api/internal/telegram/webhook")
        self.webhook_secret = os.getenv("BRIDGE_WEBHOOK_SECRET", "bridge-internal-secret-key-2026")
        self.media_dir = os.getenv("MEDIA_DIR", "/Users/mizanurrahman/Telegram auto responder/storage/media")
        os.makedirs(self.media_dir, exist_ok=True)

    async def initiate_login(self, phone: str, api_id: int, api_hash: str) -> dict:
        auth_id = str(uuid.uuid4())
        session = StringSession()
        client = TelegramClient(session, api_id, api_hash)
        await client.connect()

        try:
            sent_code = await client.send_code_request(phone)
            self.pending_auths[auth_id] = {
                "client": client,
                "phone": phone,
                "api_id": api_id,
                "api_hash": api_hash,
                "phone_code_hash": sent_code.phone_code_hash,
            }
            logger.info(f"OTP code requested successfully for phone {phone} (auth_id: {auth_id})")
            return {
                "auth_id": auth_id,
                "phone_code_hash": sent_code.phone_code_hash,
                "is_password_needed": False,
                "message": "OTP code sent to Telegram or SMS"
            }
        except Exception as e:
            await client.disconnect()
            logger.error(f"Failed to request code for {phone}: {e}")
            raise e

    async def complete_login(self, auth_id: str, code: str, password: Optional[str] = None) -> dict:
        if auth_id not in self.pending_auths:
            raise ValueError("Invalid or expired authentication session")

        auth_data = self.pending_auths[auth_id]
        client: TelegramClient = auth_data["client"]
        phone = auth_data["phone"]
        phone_code_hash = auth_data["phone_code_hash"]

        try:
            try:
                await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
            except SessionPasswordNeededError:
                if not password:
                    return {
                        "auth_id": auth_id,
                        "is_password_needed": True,
                        "message": "2FA Two-Step Verification password is required"
                    }
                await client.sign_in(password=password)

            me = await client.get_me()
            session_string = client.session.save()
            logger.info(f"Successfully logged in Telegram user {me.id} (@{me.username})")

            # Clean up pending auth
            del self.pending_auths[auth_id]

            return {
                "telegram_id": me.id,
                "username": me.username or "",
                "first_name": me.first_name or "",
                "last_name": me.last_name or "",
                "phone": me.phone or phone,
                "session_string": session_string,
                "is_password_needed": False,
                "message": "Connected successfully"
            }
        except (PhoneCodeInvalidError, PhoneCodeExpiredError, PasswordHashInvalidError) as e:
            raise e
        except Exception as e:
            logger.error(f"Sign-in error: {e}")
            raise e

    async def start_account_listener(self, account_id: str, api_id: int, api_hash: str, session_string: str) -> bool:
        # Disconnect existing if already running
        if account_id in self.active_clients:
            try:
                await self.active_clients[account_id].disconnect()
            except Exception:
                pass

        session = StringSession(session_string)
        client = TelegramClient(session, api_id, api_hash)
        await client.connect()

        if not await client.is_user_authorized():
            logger.warning(f"Account {account_id} session is expired or unauthorized")
            await client.disconnect()
            return False

        # Register incoming message handler
        @client.on(events.NewMessage(incoming=True))
        async def incoming_message_handler(event):
            # Only listen to private messages
            if not event.is_private:
                return

            try:
                sender = await event.get_sender()
                if not sender:
                    return

                msg = event.message
                message_type = "text"
                saved_media_path = None

                # Determine message type and download media if present
                if msg.photo:
                    message_type = "photo"
                elif msg.video:
                    message_type = "video"
                elif msg.voice:
                    message_type = "voice"
                elif msg.audio:
                    message_type = "audio"
                elif msg.sticker:
                    message_type = "sticker"
                elif msg.gif:
                    message_type = "gif"
                elif msg.document:
                    message_type = "document"

                # If media, download locally
                if message_type != "text" and msg.media:
                    try:
                        ext = ".bin"
                        if message_type == "photo":
                            ext = ".jpg"
                        elif message_type == "video":
                            ext = ".mp4"
                        elif message_type == "voice":
                            ext = ".ogg"
                        elif message_type == "audio":
                            ext = ".mp3"
                        elif message_type == "document":
                            ext = f"_{msg.file.name}" if msg.file and msg.file.name else ".doc"

                        filename = f"inbound_{account_id}_{msg.id}_{uuid.uuid4().hex[:6]}{ext}"
                        target_path = os.path.join(self.media_dir, filename)
                        await client.download_media(msg, file=target_path)
                        saved_media_path = f"media/{filename}"
                    except Exception as media_err:
                        logger.warning(f"Could not download incoming media: {media_err}")

                payload = {
                    "account_id": account_id,
                    "telegram_id": sender.id,
                    "username": getattr(sender, "username", None) or "",
                    "first_name": getattr(sender, "first_name", None) or "",
                    "last_name": getattr(sender, "last_name", None) or "",
                    "phone": getattr(sender, "phone", None) or "",
                    "message_id": msg.id,
                    "message_type": message_type,
                    "text": msg.message or "",
                    "media_path": saved_media_path,
                    "date": msg.date.isoformat() if msg.date else None
                }

                # 1. Immediately mark incoming message as read on Telegram (seen / double checkmark)
                try:
                    await client.send_read_acknowledge(msg.chat_id, max_id=msg.id)
                    logger.info(f"Marked message {msg.id} as read for peer {msg.chat_id}")
                except Exception as read_err:
                    logger.warning(f"Could not mark message as read: {read_err}")

                logger.info(f"Incoming {message_type} message from {sender.id} to account {account_id}")

                # Dispatch to Laravel internal webhook
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    headers = {
                        "Content-Type": "application/json",
                        "X-Bridge-Secret": self.webhook_secret
                    }
                    response = await http_client.post(self.webhook_url, json=payload, headers=headers)
                    if response.status_code >= 400:
                        logger.warning(f"Laravel webhook returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Error handling incoming message for account {account_id}: {e}", exc_info=True)

        self.active_clients[account_id] = client
        logger.info(f"Account listener started for account_id: {account_id}")
        return True

    async def stop_account_listener(self, account_id: str) -> bool:
        if account_id in self.active_clients:
            client = self.active_clients[account_id]
            try:
                await client.disconnect()
            except Exception:
                pass
            del self.active_clients[account_id]
            logger.info(f"Account listener stopped for {account_id}")
            return True
        return False

    async def send_message(
        self,
        account_id: str,
        recipient_id: int,
        content: Optional[str] = None,
        media_path: Optional[str] = None,
        message_type: str = "text"
    ) -> dict:
        if account_id not in self.active_clients:
            raise ValueError(f"Account {account_id} is not connected or listener is not running")

        client: TelegramClient = self.active_clients[account_id]
        if not await client.is_user_authorized():
            raise ValueError(f"Account {account_id} session is unauthorized")

        # Resolve full media path if relative
        full_file_path = None
        if media_path:
            if os.path.isabs(media_path):
                full_file_path = media_path
            else:
                full_file_path = os.path.join(self.media_dir, os.path.basename(media_path))

            if not os.path.exists(full_file_path):
                logger.warning(f"Media file not found at {full_file_path}, falling back to content only")
                full_file_path = None

        try:
            # Mark chat as read so user sees it was seen
            try:
                await client.send_read_acknowledge(recipient_id)
            except Exception:
                pass

            # Simulate realistic typing indicator for 1.5 seconds
            try:
                action_type = "record-audio" if message_type == "voice" else "typing"
                async with client.action(recipient_id, action_type):
                    await asyncio.sleep(1.5)
            except Exception:
                pass

            if full_file_path:
                sent = await client.send_file(
                    entity=recipient_id,
                    file=full_file_path,
                    caption=content or "",
                    voice_note=(message_type == "voice")
                )
            else:
                sent = await client.send_message(
                    entity=recipient_id,
                    message=content or ""
                )

            logger.info(f"Outbound message sent to {recipient_id} (msg_id: {sent.id}) via account {account_id}")
            return {
                "success": True,
                "message_id": sent.id,
                "date": sent.date.isoformat() if sent.date else None
            }
        except Exception as e:
            logger.error(f"Error sending message to {recipient_id}: {e}")
            raise e

    def get_status(self) -> dict:
        return {
            "active_accounts": list(self.active_clients.keys()),
            "pending_auth_count": len(self.pending_auths)
        }

manager = TelegramBridgeManager()
