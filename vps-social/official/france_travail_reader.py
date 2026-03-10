import httpx
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv('/root/.env')

FT_TOKEN_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token'
FT_OFFERS_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search'

class FranceTravailReader:

    def __init__(self):
        self.client_id = os.environ.get('FRANCE_TRAVAIL_CLIENT_ID', '')
        self.client_secret = os.environ.get('FRANCE_TRAVAIL_CLIENT_SECRET', '')

    async def _get_token(self) -> str:
        if not self.client_id:
            raise ValueError('FRANCE_TRAVAIL_CLIENT_ID non configure')
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(FT_TOKEN_URL, data={
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'api_offresdemploiv2 o2dsoffre'
            })
            return resp.json().get('access_token', '')

    async def fetch_offers(self, commune: str, naf_codes: list[str] = None, days_back: int = 7) -> list[dict]:
        try:
            token = await self._get_token()
        except ValueError as e:
            print(f'France Travail: {e}')
            return []

        params = {'commune': commune, 'publieeDepuis': min(days_back, 31), 'nombreResultats': 100}
        if naf_codes:
            params['codeNAF'] = ','.join(naf_codes)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                FT_OFFERS_URL, params=params,
                headers={'Authorization': f'Bearer {token}'}
            )
            if resp.status_code != 200:
                return []

            signals = []
            for offer in resp.json().get('resultats', []):
                offer_id = offer.get('id', '')
                entreprise = offer.get('entreprise', {})
                signals.append({
                    'source': 'france_travail',
                    'entreprise': entreprise.get('nom', ''),
                    'siret': entreprise.get('siret', ''),
                    'poste': offer.get('intitule', ''),
                    'commune': offer.get('lieuTravail', {}).get('libelle', ''),
                    'date_creation': offer.get('dateCreation', ''),
                    'intent_type': 'hiring_growth',
                    'intent_score': 75,
                    'dedup_key': f'ft_offer_{offer_id}',
                    'detected_at': datetime.utcnow().isoformat()
                })
            return signals
