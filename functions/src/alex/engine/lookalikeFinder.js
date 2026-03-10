/**
 * lookalikeFinder.js — "Trouve-moi des prospects comme celui-ci"
 * Alex analyse un prospect de reference et cherche des entreprises avec un profil SIMILAIRE.
 */
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

/**
 * Trouve des prospects similaires a un prospect de reference.
 */
export async function findLookalikes(referenceProspectId, organizationId, maxResults = 20) {
  const db = getDb();

  // 1. Charger le prospect de reference avec son diagnostic complet
  const refDoc = await db.doc(`organizations/${organizationId}/prospects/${referenceProspectId}`).get();
  if (!refDoc.exists) throw new Error('Prospect de reference introuvable');

  const reference = refDoc.data();

  // 2. Charger le scan du prospect de reference (s'il existe)
  let refScan = null;
  if (reference.scanResultId) {
    const scanDoc = await db.doc(`scanResults/${reference.scanResultId}`).get();
    if (scanDoc.exists) refScan = scanDoc.data();
  }

  // 3. Extraire le profil type
  const profile = {
    sector: reference.sector || reference.codeNaf,
    location: reference.city || reference.codePostal,
    sizeRange: estimateSizeRange(reference.effectif),
    hasWebsite: !!reference.website,
    cms: refScan?.techStack?.cms || null,
    googleRating: refScan?.googleBusiness?.rating || null,
    socialPresence: {
      instagram: !!refScan?.social?.instagram?.handle,
      facebook: !!refScan?.social?.facebook,
    },
    signals: reference.signals?.map(s => s.type) || [],
  };

  // 4. Construire la requete de recherche lookalike
  // Chercher dans SIRENE si disponible, sinon dans les prospects existants
  let candidates = [];
  try {
    const { searchSirene } = await import('../../sourcing/sireneSearch.js');
    candidates = await searchSirene({
      codeNaf: profile.sector,
      location: profile.location,
      radius: 25,
    });
  } catch {
    // sireneSearch pas encore implemente — fallback sur prospects existants
    console.warn('[Lookalike] sireneSearch indisponible, fallback sur prospects existants');
    const snap = await db.collection(`organizations/${organizationId}/prospects`)
      .where('sector', '==', profile.sector)
      .limit(100)
      .get();
    candidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // 5. Scorer chaque candidat par similarite avec le prospect de reference
  const scored = [];

  for (const candidate of candidates) {
    // Ne pas inclure le prospect de reference lui-meme
    if (candidate.siret === reference.siret) continue;
    if (candidate.id === referenceProspectId) continue;

    // Ne pas inclure les prospects deja dans le CRM
    if (!candidate.id) {
      const exists = await db.collection(`organizations/${organizationId}/prospects`)
        .where('siret', '==', candidate.siret)
        .limit(1)
        .get();
      if (!exists.empty) continue;
    }

    let similarityScore = 0;
    const matchReasons = [];

    // Meme secteur exact
    if (candidate.codeNaf === profile.sector || candidate.sector === profile.sector) {
      similarityScore += 30;
      matchReasons.push('Meme secteur d\'activite');
    }

    // Taille similaire
    if (candidate.effectif && profile.sizeRange) {
      if (candidate.effectif >= profile.sizeRange.min && candidate.effectif <= profile.sizeRange.max) {
        similarityScore += 20;
        matchReasons.push('Taille d\'entreprise similaire');
      }
    }

    // Meme zone geographique
    const candidateCP = candidate.codePostal || candidate.city;
    const profileCP = profile.location;
    if (candidateCP && profileCP && candidateCP.substring(0, 2) === profileCP.substring(0, 2)) {
      similarityScore += 15;
      matchReasons.push('Meme zone geographique');
    }

    // A un site web (comme le referent)
    if (profile.hasWebsite && candidate.website) {
      similarityScore += 10;
      matchReasons.push('Possede un site web');
    }

    // Entreprise du meme age approximatif
    if (candidate.dateCreation && reference.dateCreation) {
      const ageDiff = Math.abs(
        new Date(candidate.dateCreation).getFullYear() - new Date(reference.dateCreation).getFullYear()
      );
      if (ageDiff <= 3) {
        similarityScore += 10;
        matchReasons.push('Anciennete similaire');
      }
    }

    if (similarityScore >= 40) {
      scored.push({
        ...candidate,
        similarityScore,
        matchReasons,
        isLookalike: true,
        referenceProspectId,
      });
    }
  }

  // 6. Trier par score de similarite et retourner les meilleurs
  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, maxResults);
}

function estimateSizeRange(effectif) {
  if (!effectif) return null;
  if (effectif <= 5) return { min: 1, max: 10 };
  if (effectif <= 20) return { min: 5, max: 30 };
  if (effectif <= 50) return { min: 20, max: 80 };
  return { min: 50, max: 200 };
}
