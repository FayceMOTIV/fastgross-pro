import os
import json
import base64
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv('/root/.env')

SESSIONS_DIR = Path('/root/fmf-sessions')
SESSIONS_DIR.mkdir(mode=0o700, exist_ok=True)

_RAW_KEY = os.environ.get('COOKIE_ENCRYPTION_KEY', '')
ENCRYPTION_KEY = bytes.fromhex(_RAW_KEY) if _RAW_KEY else None


def _encrypt(data: dict) -> str:
    if not ENCRYPTION_KEY:
        raise RuntimeError('COOKIE_ENCRYPTION_KEY non configuré')
    aesgcm = AESGCM(ENCRYPTION_KEY)
    nonce = os.urandom(12)
    plaintext = json.dumps(data, ensure_ascii=False).encode('utf-8')
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ciphertext).decode('utf-8')


def _decrypt(encrypted_b64: str) -> dict:
    if not ENCRYPTION_KEY:
        raise RuntimeError('COOKIE_ENCRYPTION_KEY non configuré')
    raw = base64.b64decode(encrypted_b64)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(ENCRYPTION_KEY)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode('utf-8'))


class SessionStore:

    @staticmethod
    def save_session(org_id: str, platform: str, cookies: list, token_data: dict = None):
        session_file = SESSIONS_DIR / f'{org_id}_{platform}.enc'
        payload = {
            'org_id': org_id,
            'platform': platform,
            'cookies': cookies,
            'token_data': token_data or {},
            'saved_at': __import__('time').time()
        }
        encrypted = _encrypt(payload)
        session_file.write_text(encrypted)
        session_file.chmod(0o600)

    @staticmethod
    def load_session(org_id: str, platform: str) -> dict | None:
        session_file = SESSIONS_DIR / f'{org_id}_{platform}.enc'
        if not session_file.exists():
            return None
        try:
            return _decrypt(session_file.read_text())
        except Exception:
            session_file.unlink(missing_ok=True)
            return None

    @staticmethod
    def save_oauth_tokens(org_id: str, platform: str, access_token: str,
                          refresh_token: str = None, expires_at: float = None):
        existing = SessionStore.load_session(org_id, platform) or {}
        existing['token_data'] = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_at': expires_at
        }
        SessionStore.save_session(org_id, platform,
                                  existing.get('cookies', []),
                                  existing['token_data'])

    @staticmethod
    def has_session(org_id: str, platform: str) -> bool:
        return (SESSIONS_DIR / f'{org_id}_{platform}.enc').exists()

    @staticmethod
    def delete_session(org_id: str, platform: str):
        path = SESSIONS_DIR / f'{org_id}_{platform}.enc'
        if path.exists():
            path.write_bytes(os.urandom(path.stat().st_size))
            path.unlink()

    @staticmethod
    def list_sessions(org_id: str) -> list[str]:
        return [
            f.stem.replace(f'{org_id}_', '')
            for f in SESSIONS_DIR.glob(f'{org_id}_*.enc')
        ]
