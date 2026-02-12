/**
 * Voice Clone Manager - Drop Cowboy AI
 *
 * Gestion des voix clonees:
 * - Creation de clone depuis audio (30 sec)
 * - Gestion des voix par organisation
 * - Variables dynamiques dans TTS
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// DROP COWBOY VOICE API
// ============================================
const DROP_COWBOY_API_BASE = 'https://api.dropcowboy.com/v1';

// ============================================
// OBTENIR CONFIG
// ============================================
async function getConfig(orgId) {
  try {
    const configRef = db.collection('organizations').doc(orgId)
      .collection('integrations').doc('voicemail');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        teamId: process.env.DROPCOWBOY_TEAM_ID,
        secret: process.env.DROPCOWBOY_SECRET
      };
    }

    return configSnap.data();
  } catch (error) {
    return {
      teamId: process.env.DROPCOWBOY_TEAM_ID,
      secret: process.env.DROPCOWBOY_SECRET
    };
  }
}

// ============================================
// CREER UN CLONE VOCAL
// ============================================
export async function createVoiceClone(orgId, audioData, metadata = {}) {
  const result = {
    success: false,
    voiceId: null,
    error: null
  };

  try {
    const config = await getConfig(orgId);

    // Valider l'audio (minimum 30 secondes recommande)
    if (audioData.duration && audioData.duration < 10) {
      result.error = 'Audio too short (minimum 10 seconds, 30 recommended)';
      return result;
    }

    // Preparer la requete
    const formData = new FormData();
    formData.append('name', metadata.name || 'Commercial Voice');
    formData.append('description', metadata.description || '');

    // Audio peut etre un URL ou un blob
    if (audioData.url) {
      formData.append('audio_url', audioData.url);
    } else if (audioData.blob) {
      formData.append('audio', audioData.blob, 'voice_sample.mp3');
    } else {
      result.error = 'No audio provided (url or blob required)';
      return result;
    }

    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices`, {
      method: 'POST',
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      result.error = data.message || 'Failed to create voice clone';
      return result;
    }

    result.success = true;
    result.voiceId = data.id;

    // Sauvegarder localement
    await saveVoiceClone(orgId, {
      voiceId: data.id,
      name: metadata.name || 'Commercial Voice',
      description: metadata.description,
      status: data.status || 'processing',
      createdBy: metadata.createdBy
    });

    return result;

  } catch (error) {
    console.error('createVoiceClone error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// LISTER LES VOIX DISPONIBLES
// ============================================
export async function listVoices(orgId) {
  try {
    // 1. Voix de l'organisation
    const localSnapshot = await db.collection('organizations').doc(orgId)
      .collection('voiceClones')
      .where('status', '==', 'ready')
      .get();

    const orgVoices = localSnapshot.docs.map(doc => ({
      id: doc.id,
      source: 'organization',
      ...doc.data()
    }));

    // 2. Voix par defaut Drop Cowboy
    const config = await getConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices`, {
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    let apiVoices = [];
    if (response.ok) {
      const data = await response.json();
      apiVoices = (data.voices || []).map(v => ({
        id: v.id,
        source: 'dropcowboy',
        name: v.name,
        language: v.language,
        gender: v.gender
      }));
    }

    return {
      organization: orgVoices,
      default: apiVoices,
      all: [...orgVoices, ...apiVoices]
    };

  } catch (error) {
    console.error('listVoices error:', error);
    return { organization: [], default: [], all: [] };
  }
}

// ============================================
// OBTENIR UNE VOIX
// ============================================
export async function getVoice(orgId, voiceId) {
  try {
    // Chercher localement d'abord
    const localRef = db.collection('organizations').doc(orgId)
      .collection('voiceClones').doc(voiceId);
    const localSnap = await localRef.get();

    if (localSnap.exists) {
      return { id: voiceId, ...localSnap.data() };
    }

    // Chercher via API
    const config = await getConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices/${voiceId}`, {
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();

  } catch (error) {
    console.error('getVoice error:', error);
    return null;
  }
}

// ============================================
// SUPPRIMER UNE VOIX
// ============================================
export async function deleteVoice(orgId, voiceId) {
  try {
    const config = await getConfig(orgId);

    // Supprimer via API
    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to delete voice' };
    }

    // Supprimer localement
    await db.collection('organizations').doc(orgId)
      .collection('voiceClones').doc(voiceId)
      .delete();

    return { success: true };

  } catch (error) {
    console.error('deleteVoice error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SAUVEGARDER VOICE CLONE LOCAL
// ============================================
async function saveVoiceClone(orgId, voiceData) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('voiceClones').doc(voiceData.voiceId)
      .set({
        ...voiceData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('saveVoiceClone error:', error);
  }
}

// ============================================
// METTRE A JOUR STATUT VOICE CLONE
// ============================================
export async function updateVoiceStatus(orgId, voiceId) {
  try {
    const config = await getConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices/${voiceId}`, {
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    if (!response.ok) {
      return { error: 'Failed to get voice status' };
    }

    const data = await response.json();

    // Mettre a jour localement
    await db.collection('organizations').doc(orgId)
      .collection('voiceClones').doc(voiceId)
      .update({
        status: data.status,
        updatedAt: FieldValue.serverTimestamp()
      });

    return { status: data.status };

  } catch (error) {
    console.error('updateVoiceStatus error:', error);
    return { error: error.message };
  }
}

// ============================================
// PREVISUALISER TTS
// ============================================
export async function previewTTS(orgId, voiceId, text) {
  try {
    const config = await getConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/voices/${voiceId}/preview`, {
      method: 'POST',
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      return { error: 'Failed to generate preview' };
    }

    const data = await response.json();

    return {
      success: true,
      audioUrl: data.audio_url,
      duration: data.duration
    };

  } catch (error) {
    console.error('previewTTS error:', error);
    return { error: error.message };
  }
}

// ============================================
// VOIX PAR DEFAUT (FALLBACK)
// ============================================
export const DEFAULT_VOICES = {
  fr_male: {
    id: 'fr_male_default',
    name: 'Pierre (Francais)',
    language: 'fr-FR',
    gender: 'male'
  },
  fr_female: {
    id: 'fr_female_default',
    name: 'Marie (Francaise)',
    language: 'fr-FR',
    gender: 'female'
  },
  en_male: {
    id: 'en_male_default',
    name: 'John (English)',
    language: 'en-US',
    gender: 'male'
  },
  en_female: {
    id: 'en_female_default',
    name: 'Sarah (English)',
    language: 'en-US',
    gender: 'female'
  }
};
