import feedparser
import hashlib
from datetime import datetime, timedelta
import time

def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8', errors='replace')).hexdigest()[:16]

class GoogleAlertsReader:

    @staticmethod
    async def fetch_alert(rss_url: str, days_back: int = 1) -> list[dict]:
        signals = []
        try:
            feed = feedparser.parse(rss_url)
            cutoff = datetime.utcnow() - timedelta(days=days_back)

            for entry in feed.entries:
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime.fromtimestamp(time.mktime(entry.published_parsed))
                if published and published < cutoff:
                    continue

                link = entry.get('link', '')
                title = entry.get('title', '')
                signals.append({
                    'source': 'google_alerts',
                    'title': title,
                    'summary': entry.get('summary', '')[:500],
                    'link': link,
                    'published': published.isoformat() if published else '',
                    'intent_score': 50,
                    'dedup_key': f'galert_{_stable_hash(link or title)}',
                    'detected_at': datetime.utcnow().isoformat()
                })
        except Exception as e:
            print(f'Google Alerts RSS error: {e}')
        return signals
