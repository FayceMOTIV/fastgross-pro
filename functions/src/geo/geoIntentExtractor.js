/**
 * geoIntentExtractor.js
 * Utilise Groq pour extraire l'intention geographique depuis
 * un message en langage naturel envoye par un client FMF.
 *
 * Ex: "Je veux prospecter les electriciens dans l'Ain et le Rhone"
 * -> { zones: ['Ain', 'Rhone'], naf: '4321A', secteur: 'electriciens' }
 */

import Groq from 'groq-sdk';
import { resolveGeoZone } from './geoZoneResolver.js';

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

const SECTEURS_NAF = {
  'plombier': '4322A', 'plomberie': '4322A',
  'electricien': '4321A', 'electricite': '4321A',
  'restaurant': '5610A', 'restauration': '5610A',
  'coiffeur': '9602A', 'coiffure': '9602A', 'salon de coiffure': '9602A',
  'boulanger': '1071A', 'boulangerie': '1071A',
  'menuisier': '4332A', 'menuiserie': '4332A',
  'carreleur': '4333Z', 'carrelage': '4333Z',
  'peintre': '4334Z', 'peinture': '4334Z',
  'macon': '4120A', 'maconnerie': '4120A',
  'comptable': '6920Z', 'expert-comptable': '6920Z',
  'avocat': '6910Z',
  'medecin': '8621Z',
  'dentiste': '8623Z',
  'kine': '8690A', 'kinesitherapeute': '8690A',
  'architecte': '7111Z',
  'agence immobiliere': '6831Z', 'immobilier': '6831Z',
  'auto-ecole': '8553Z',
  'garage': '4520A', 'garagiste': '4520A',
  'fleuriste': '4776Z',
  'pharmacie': '4773Z',
  'pressing': '9601A', 'nettoyage': '8121Z',
  'traiteur': '5621Z',
  'pizzeria': '5610A',
  'brasserie': '5630Z',
  'hotel': '5510Z',
};

async function callGroqWithFallback(messages) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  for (const model of MODELS) {
    try {
      const comp = await groq.chat.completions.create({
        model,
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages
      });
      return comp.choices[0]?.message?.content || '{}';
    } catch (e) {
      if (e.status === 429 && model !== MODELS[MODELS.length - 1]) continue;
      throw e;
    }
  }
  return '{}';
}

export async function extractGeoIntent(message) {
  const prompt = `Analyse ce message d'un utilisateur de FMF (outil de prospection B2B).
Extrais les informations de ciblage geographique et sectoriel.

Message : "${message}"

Reponds en JSON strict :
{
  "zones_texte": ["liste des zones geographiques mentionnees en texte brut"],
  "secteur": "secteur d'activite principal mentionne (null si absent)",
  "naf_suggere": "code NAF 5 caracteres si tu peux le deduire (null sinon)",
  "volume": null,
  "intention_geo": true,
  "intention_secteur": true
}

Exemples :
- "plombiers dans l'Ain" -> zones_texte:["Ain"], secteur:"plombier", naf_suggere:"4322A"
- "restaurants Paris 11e" -> zones_texte:["Paris 11e"], secteur:"restaurant", naf_suggere:"5610A"
- "100 electriciens en Auvergne" -> zones_texte:["Auvergne"], secteur:"electricien", volume:100
- "je veux prospecter" -> intention_geo:false, intention_secteur:false`;

  try {
    const raw = await callGroqWithFallback([{ role: 'user', content: prompt }]);
    const parsed = JSON.parse(raw);

    const resolvedZones = [];
    for (const zoneText of (parsed.zones_texte || [])) {
      const resolved = await resolveGeoZone(zoneText);
      resolvedZones.push(resolved);
    }

    const nafCode = parsed.naf_suggere
      || SECTEURS_NAF[parsed.secteur?.toLowerCase()] || null;

    return {
      zones: resolvedZones,
      secteur: parsed.secteur,
      nafCode,
      volume: parsed.volume || null,
      intentionGeo: parsed.intention_geo || false,
      intentionSecteur: parsed.intention_secteur || false,
      raw: parsed
    };
  } catch (e) {
    return { zones: [], secteur: null, nafCode: null, error: e.message };
  }
}
