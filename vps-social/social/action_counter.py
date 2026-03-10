import json
from datetime import date
from pathlib import Path

COUNTER_DIR = Path('/root/fmf-action-counts')
COUNTER_DIR.mkdir(mode=0o700, exist_ok=True)

DAILY_LIMITS = {
    'facebook_comment':    12,
    'facebook_dm':         15,
    'linkedin_comment':     8,
    'linkedin_dm':         10,
    'instagram_comment':   18,
    'instagram_dm':        25,
    'telegram_message':    50,
    'discord_message':     40,
}

class ActionCounter:

    @staticmethod
    def _counter_file(org_id: str) -> Path:
        today = date.today().isoformat()
        return COUNTER_DIR / f'{org_id}_{today}.json'

    @staticmethod
    def _load(org_id: str) -> dict:
        f = ActionCounter._counter_file(org_id)
        if not f.exists():
            return {}
        try:
            return json.loads(f.read_text())
        except Exception:
            return {}

    @staticmethod
    def _save(org_id: str, counts: dict):
        f = ActionCounter._counter_file(org_id)
        f.write_text(json.dumps(counts))

    @staticmethod
    def can_act(org_id: str, action_type: str) -> bool:
        counts = ActionCounter._load(org_id)
        current = counts.get(action_type, 0)
        limit = DAILY_LIMITS.get(action_type, 10)
        return current < limit

    @staticmethod
    def increment(org_id: str, action_type: str) -> int:
        counts = ActionCounter._load(org_id)
        counts[action_type] = counts.get(action_type, 0) + 1
        ActionCounter._save(org_id, counts)
        return counts[action_type]

    @staticmethod
    def get_counts(org_id: str) -> dict:
        return ActionCounter._load(org_id)

    @staticmethod
    def get_remaining(org_id: str, action_type: str) -> int:
        counts = ActionCounter._load(org_id)
        current = counts.get(action_type, 0)
        limit = DAILY_LIMITS.get(action_type, 10)
        return max(0, limit - current)
