import httpx
from datetime import datetime, timedelta

class SitadelReader:

    async def fetch_permits(self, department: str, days_back: int = 30) -> list[dict]:
        url = 'https://data.statistiques.developpement-durable.gouv.fr/api/explore/v2.1/catalog/datasets/sit1-2011-1-pc-ouverts/records'
        cutoff = (datetime.utcnow() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        dept_prefix = department[:2]

        params = {
            'where': f"dep_r like '{dept_prefix}%' AND date_ref_a >= date'{cutoff}'",
            'limit': 100,
            'order_by': 'date_ref_a DESC'
        }

        signals = []
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                for r in resp.json().get('results', []):
                    permit_id = r.get('num_permis', '') or r.get('id', '') or f"{r.get('com_r','')}_{r.get('date_ref_a','')}"
                    signals.append({
                        'source': 'sitadel_permit',
                        'department': department,
                        'commune': r.get('com_r', ''),
                        'type_construction': r.get('dest_r', ''),
                        'nb_logements': r.get('nb_lgts_autorises_total', 0),
                        'date_autorisation': r.get('date_ref_a', ''),
                        'intent_type': 'construction_permit',
                        'intent_score': 85,
                        'dedup_key': f'sitadel_{permit_id}',
                        'detected_at': datetime.utcnow().isoformat()
                    })
            except Exception as e:
                print(f'SITADEL error: {e}')
        return signals
