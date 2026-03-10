import httpx
from datetime import datetime, timedelta

BODACC_API = (
    'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets'
    '/annonces-commerciales/records'
)

class BodaccReader:

    async def fetch_recent_creations(self, days_back: int = 7, naf_codes: list[str] = None) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        cutoff_str = cutoff.strftime('%Y-%m-%d')

        params = {
            'where': f"typeavis='CREATION' AND dateparution>=date'{cutoff_str}'",
            'limit': 100,
            'order_by': 'dateparution DESC'
        }

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(BODACC_API, params=params)
                resp.raise_for_status()
            except Exception as e:
                print(f'BODACC error: {e}')
                return []

            signals = []
            for r in resp.json().get('results', []):
                activite = r.get('activiteentreprise', '') or ''
                if naf_codes and not any(naf in activite for naf in naf_codes):
                    continue

                siren = r.get('siren', '') or ''
                if not siren:
                    continue

                signals.append({
                    'source': 'bodacc_creation',
                    'denomination': r.get('denomination', '') or r.get('commercant', ''),
                    'siren': siren,
                    'ville': r.get('ville', ''),
                    'code_postal': r.get('codepostal', ''),
                    'activite': activite,
                    'date_publication': r.get('dateparution', ''),
                    'intent_type': 'new_business',
                    'intent_score': 90,
                    'dedup_key': f'bodacc_creation_{siren}',
                    'detected_at': datetime.utcnow().isoformat()
                })
            return signals

    async def fetch_recent_radiations(self, days_back: int = 7) -> list[dict]:
        cutoff_str = (datetime.utcnow() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        params = {
            'where': f"typeavis='RADIATION' AND dateparution>=date'{cutoff_str}'",
            'limit': 100,
            'order_by': 'dateparution DESC'
        }
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(BODACC_API, params=params)
                resp.raise_for_status()
            except Exception:
                return []

            signals = []
            for r in resp.json().get('results', []):
                siren = r.get('siren', '') or ''
                if not siren:
                    continue
                signals.append({
                    'source': 'bodacc_radiation',
                    'denomination': r.get('denomination', ''),
                    'siren': siren,
                    'ville': r.get('ville', ''),
                    'date_publication': r.get('dateparution', ''),
                    'intent_type': 'business_closing',
                    'intent_score': 60,
                    'dedup_key': f'bodacc_radiation_{siren}',
                    'detected_at': datetime.utcnow().isoformat()
                })
            return signals
