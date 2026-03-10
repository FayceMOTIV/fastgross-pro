import asyncio
import os
from datetime import datetime
from telethon import TelegramClient
from dotenv import load_dotenv

load_dotenv('/root/.env')

API_ID = int(os.environ.get('TELEGRAM_API_ID', '0'))
API_HASH = os.environ.get('TELEGRAM_API_HASH', '')
SESSION_FILE = '/root/fmf-sessions/fmf_telegram_watcher'


class TelegramWatcher:
    _client = None

    async def _get_client(self) -> TelegramClient:
        if not TelegramWatcher._client:
            TelegramWatcher._client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
            await TelegramWatcher._client.start()
        return TelegramWatcher._client

    async def scan_group(self, group_username: str, keywords: list[str], limit: int = 100) -> list[dict]:
        if not API_ID or not API_HASH:
            return [{'error': 'TELEGRAM_API_ID ou TELEGRAM_API_HASH manquants'}]

        signals = []
        client = await self._get_client()
        try:
            entity = await client.get_entity(group_username)
            async for message in client.iter_messages(entity, limit=limit):
                if not message.text:
                    continue
                text_lower = message.text.lower()
                matched = [kw for kw in keywords if kw.lower() in text_lower]
                if not matched:
                    continue
                sender = await message.get_sender()
                signals.append({
                    'source': 'telegram_group',
                    'group': group_username,
                    'text': message.text[:500],
                    'author': getattr(sender, 'first_name', '') or getattr(sender, 'title', 'Inconnu'),
                    'author_username': getattr(sender, 'username', None),
                    'message_id': message.id,
                    'matched_keywords': matched,
                    'intent_score': min(100, len(matched) * 35 + 15),
                    'dedup_key': f'tg_{group_username}_{message.id}',
                    'detected_at': message.date.isoformat(),
                })
        except Exception as e:
            return [{'error': str(e), 'platform': 'telegram'}]
        return signals

    async def reply_to_message(self, group_username: str, message_id: int, reply_text: str) -> bool:
        client = await self._get_client()
        try:
            entity = await client.get_entity(group_username)
            await client.send_message(entity, reply_text, reply_to=message_id)
            return True
        except Exception as e:
            print(f'Telegram reply error: {e}')
            return False

    async def send_dm(self, username: str, message: str) -> bool:
        client = await self._get_client()
        try:
            await client.send_message(username, message)
            return True
        except Exception as e:
            print(f'Telegram DM error: {e}')
            return False
