import feedparser
import hashlib
from datetime import datetime, timedelta
import time

def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8', errors='replace')).hexdigest()[:16]

RSS_SOURCES = {
    'boamp':          'https://www.boamp.fr/avis/flux-rss/flux_avis_marches_publics.xml',
    'batiactu':       'https://www.batiactu.com/flux_rss/index.php',
    'hotellerie_rest':'https://www.lhotellerie-restauration.fr/rss/actualite.rss',
    'lsa':            'https://www.lsa-conso.fr/rss/actualites',
    'decideurs':      'https://www.magazine-decideurs.com/rss/actualites',
    'fusac':          'https://www.fusacq.com/rss/annonces.rss',
    'trustpilot_fr':  'https://fr.trustpilot.com/review/.rss',
    'indeed_fr':      'https://fr.indeed.com/rss?q=&l=France&sort=date',
    'seloger':        'https://www.seloger.com/flux-rss',
    'presse_locale':  None,
}

class RssReader:

    @staticmethod
    async def fetch_feed(source_id: str, custom_url: str = None, days_back: int = 3) -> list[dict]:
        url = custom_url or RSS_SOURCES.get(source_id)
        if not url:
            return []

        signals = []
        try:
            feed = feedparser.parse(url)
            cutoff = datetime.utcnow() - timedelta(days=days_back)

            for i, entry in enumerate(feed.entries[:50]):
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime.fromtimestamp(time.mktime(entry.published_parsed))
                if published and published < cutoff:
                    continue

                link = entry.get('link', '')
                title = entry.get('title', '')
                summary = entry.get('summary', '')[:500]

                signals.append({
                    'source': f'rss_{source_id}',
                    'title': title,
                    'summary': summary,
                    'link': link,
                    'published': published.isoformat() if published else '',
                    'intent_score': 40,
                    'dedup_key': f'rss_{source_id}_{_stable_hash(link or title)}',
                    'detected_at': datetime.utcnow().isoformat()
                })
        except Exception as e:
            print(f'RSS {source_id} error: {e}')
        return signals
