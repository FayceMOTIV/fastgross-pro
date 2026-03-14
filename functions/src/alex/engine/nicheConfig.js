/**
 * nicheConfig.js — Moteur de niche universelle
 * Chaque tenant configure sa niche (NAF, keywords, signals, templates)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js';

const getDb = () => getFirestore();

const NICHE_PRESETS = {
  restaurant: {
    nicheName: 'Restaurants & Restauration',
    codesNaf: ['5610A', '5610C', '5629A', '5629B', '5621Z'],
    keywords: {
      google_maps: ['restaurant', 'brasserie', 'pizzeria', 'bistrot', 'traiteur'],
      france_travail: ['chef de cuisine', 'serveur', 'commis'],
      social: ['#restaurant', '#foodie', '#gastronomie'],
    },
    customSignals: [
      { id: 'no_menu_online', score: 20, message: 'Pas de menu visible en ligne' },
      { id: 'no_reservation', score: 25, message: 'Pas de reservation en ligne' },
    ],
  },
  artisan_btp: {
    nicheName: 'Artisans BTP',
    codesNaf: ['4321A', '4322A', '4322B', '4329A', '4331Z', '4332A', '4333Z', '4334Z', '4339Z'],
    keywords: {
      google_maps: ['plombier', 'electricien', 'menuisier', 'macon', 'peintre', 'couvreur'],
      france_travail: ['plombier', 'electricien', 'chef de chantier'],
      social: ['#artisan', '#renovation', '#travaux'],
    },
    customSignals: [
      { id: 'no_portfolio', score: 20, message: 'Pas de galerie de realisations' },
      { id: 'no_devis_form', score: 25, message: 'Pas de formulaire devis' },
    ],
  },
  salon_coiffure: {
    nicheName: 'Salons de coiffure & Beaute',
    codesNaf: ['9602A', '9602B', '9604Z'],
    keywords: {
      google_maps: ['coiffeur', 'salon de coiffure', 'barbier', 'estheticienne'],
      france_travail: ['coiffeur', 'estheticienne', 'coloriste'],
      social: ['#coiffure', '#hairsalon', '#beaute'],
    },
    customSignals: [
      { id: 'no_booking', score: 30, message: 'Pas de prise de RDV en ligne' },
    ],
  },
  professions_liberales: {
    nicheName: 'Professions liberales',
    codesNaf: ['6920Z', '6910Z', '8622A', '8622B', '8623Z', '7111Z', '7112B'],
    keywords: {
      google_maps: ['avocat', 'dentiste', 'architecte', 'expert comptable'],
      france_travail: ['secretaire medicale', 'assistant juridique'],
    },
    customSignals: [
      { id: 'no_doctolib', score: 25, message: 'Pas sur Doctolib (medecins/dentistes)' },
    ],
  },
  commerce_detail: {
    nicheName: 'Commerces de detail',
    codesNaf: ['4711A', '4711B', '4719A', '4721Z', '4722Z', '4723Z', '4724Z', '4725Z'],
    keywords: {
      google_maps: ['boutique', 'magasin', 'epicerie', 'boulangerie', 'patisserie'],
      france_travail: ['vendeur', 'responsable magasin'],
      social: ['#commerce', '#boutique', '#artisanal'],
    },
    customSignals: [
      { id: 'no_ecommerce', score: 30, message: 'Pas de vente en ligne' },
      { id: 'no_click_collect', score: 20, message: 'Pas de Click & Collect' },
    ],
  },
  agence_immobiliere: {
    nicheName: 'Agences immobilieres',
    codesNaf: ['6831Z', '6832A', '6832B'],
    keywords: {
      google_maps: ['agence immobiliere', 'immobilier', 'gestion locative'],
      france_travail: ['agent immobilier', 'negociateur immobilier'],
    },
    customSignals: [
      { id: 'no_virtual_tour', score: 20, message: 'Pas de visites virtuelles' },
    ],
  },
  auto_garage: {
    nicheName: 'Garages & Reparation auto',
    codesNaf: ['4520A', '4520B', '4511Z', '4532Z'],
    keywords: {
      google_maps: ['garage', 'reparation auto', 'carrosserie', 'controle technique'],
      france_travail: ['mecanicien', 'carrossier', 'technicien automobile'],
    },
    customSignals: [
      { id: 'no_rdv_online', score: 25, message: 'Pas de prise de RDV en ligne' },
    ],
  },
  formation_coaching: {
    nicheName: 'Formation & Coaching',
    codesNaf: ['8559A', '8559B', '8560Z'],
    keywords: {
      google_maps: ['centre de formation', 'coach', 'consulting'],
      france_travail: ['formateur', 'coach', 'consultant'],
      social: ['#formation', '#coaching'],
    },
    customSignals: [],
  },
};

export const updateNicheConfig = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis');

    const { organizationId, presetKey, customConfig } = request.data;
    if (!organizationId) throw new HttpsError('invalid-argument', 'organizationId requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();

    let config;
    if (presetKey && NICHE_PRESETS[presetKey]) {
      config = { ...NICHE_PRESETS[presetKey], ...customConfig, preset: presetKey };
    } else {
      config = {
        nicheName: customConfig?.nicheName || 'Custom',
        codesNaf: customConfig?.codesNaf || [],
        keywords: customConfig?.keywords || { google_maps: [], france_travail: [], social: [] },
        customSignals: customConfig?.customSignals || [],
        seasonalRules: customConfig?.seasonalRules || [],
        preset: 'custom',
      };
    }

    config.updatedAt = new Date();
    config.updatedBy = uid;

    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('settings')
      .doc('niche')
      .set(config, { merge: true });

    return { success: true, nicheName: config.nicheName };
  }
);

export const getNicheConfig = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis');

    const { organizationId } = request.data;
    if (!organizationId) throw new HttpsError('invalid-argument', 'organizationId requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();
    const doc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('settings')
      .doc('niche')
      .get();

    return {
      config: doc.exists ? doc.data() : null,
      presets: Object.entries(NICHE_PRESETS).map(([key, val]) => ({
        key,
        nicheName: val.nicheName,
        codesNafCount: val.codesNaf.length,
        signalsCount: val.customSignals?.length || 0,
      })),
    };
  }
);

export { NICHE_PRESETS };
