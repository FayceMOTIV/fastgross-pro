/**
 * Service pour l'historique des scans menu - Firebase
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/services/firebase/config';
import { ScanHistoryItem, ScanHistoryStats, ScanHistoryFilters } from '@/types/scan-history';

const COLLECTION_NAME = 'scan_history';

/**
 * Sauvegarder un nouveau scan dans l'historique
 */
export async function saveScanToHistory(
  scanData: Omit<ScanHistoryItem, 'id' | 'dateCreation'>,
  imageBase64?: string
): Promise<string> {
  try {
    const scanId = `SCAN-${Date.now()}`;
    let imageUrl: string | undefined;
    let imageThumbnailUrl: string | undefined;

    // Upload l'image vers Firebase Storage si fournie
    if (imageBase64) {
      const imageRef = ref(storage, `scans/${scanId}/menu.jpg`);

      // Convertir base64 en blob
      const response = await fetch(`data:image/jpeg;base64,${imageBase64}`);
      const blob = await response.blob();

      await uploadBytes(imageRef, blob);
      imageUrl = await getDownloadURL(imageRef);

      // Pour le thumbnail, on utilise la même image pour l'instant
      // En production, on pourrait utiliser Cloud Functions pour redimensionner
      imageThumbnailUrl = imageUrl;
    }

    const scanDoc: ScanHistoryItem = {
      ...scanData,
      id: scanId,
      dateCreation: new Date(),
      imageUrl,
      imageThumbnailUrl,
    };

    // Sauvegarder dans Firestore
    await setDoc(doc(db, COLLECTION_NAME, scanId), {
      ...scanDoc,
      dateCreation: Timestamp.fromDate(scanDoc.dateCreation),
    });

    console.log(`Scan sauvegardé: ${scanId}`);
    return scanId;
  } catch (error) {
    console.error('Erreur sauvegarde scan:', error);
    throw error;
  }
}

/**
 * Récupérer l'historique des scans avec filtres
 */
export async function getScanHistory(
  filters?: ScanHistoryFilters,
  maxResults: number = 50
): Promise<ScanHistoryItem[]> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy('dateCreation', 'desc'),
      limit(maxResults)
    );

    // Appliquer les filtres
    if (filters?.depot) {
      q = query(q, where('depot', '==', filters.depot));
    }
    if (filters?.commercialId) {
      q = query(q, where('commercialId', '==', filters.commercialId));
    }
    if (filters?.type) {
      q = query(q, where('restaurant.type', '==', filters.type));
    }
    if (filters?.devisGenere !== undefined) {
      q = query(q, where('devisGenere', '==', filters.devisGenere));
    }

    const snapshot = await getDocs(q);
    const scans: ScanHistoryItem[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      scans.push({
        ...data,
        id: doc.id,
        dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation),
      } as ScanHistoryItem);
    });

    // Filtrer par recherche texte côté client
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return scans.filter(scan =>
        scan.client?.nom?.toLowerCase().includes(searchLower) ||
        scan.restaurant.type.toLowerCase().includes(searchLower) ||
        scan.platsDetectes.some(p => p.nom.toLowerCase().includes(searchLower))
      );
    }

    return scans;
  } catch (error) {
    console.error('Erreur récupération historique:', error);

    // Retourner des données mock en cas d'erreur
    return getMockScanHistory();
  }
}

/**
 * Récupérer un scan par ID
 */
export async function getScanById(scanId: string): Promise<ScanHistoryItem | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, scanId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      dateCreation: data.dateCreation?.toDate?.() || new Date(data.dateCreation),
    } as ScanHistoryItem;
  } catch (error) {
    console.error('Erreur récupération scan:', error);
    return null;
  }
}

/**
 * Mettre à jour un scan (ex: quand un devis est généré)
 */
export async function updateScan(
  scanId: string,
  updates: Partial<ScanHistoryItem>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, scanId);
    await updateDoc(docRef, updates);
    console.log(`Scan mis à jour: ${scanId}`);
  } catch (error) {
    console.error('Erreur mise à jour scan:', error);
    throw error;
  }
}

/**
 * Supprimer un scan
 */
export async function deleteScan(scanId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, scanId));
    console.log(`Scan supprimé: ${scanId}`);
  } catch (error) {
    console.error('Erreur suppression scan:', error);
    throw error;
  }
}

/**
 * Calculer les statistiques des scans
 */
export async function getScanStats(depot?: string): Promise<ScanHistoryStats> {
  try {
    const scans = await getScanHistory({ depot }, 1000);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculer les stats
    const scansAujourdhui = scans.filter(s => new Date(s.dateCreation) >= todayStart).length;
    const scansCetteSemaine = scans.filter(s => new Date(s.dateCreation) >= weekStart).length;
    const scansCeMois = scans.filter(s => new Date(s.dateCreation) >= monthStart).length;

    const scansAvecDevis = scans.filter(s => s.devisGenere).length;
    const scansAvecCommande = scans.filter(s => s.commandeConvertie).length;

    // Types de restaurants
    const typeCounts: Record<string, number> = {};
    scans.forEach(s => {
      const type = s.restaurant.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typesRestaurants = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        pourcentage: Math.round((count / scans.length) * 100) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    // CA généré (somme des totaux des scans convertis en commande)
    const totalCAGenere = scans
      .filter(s => s.commandeConvertie)
      .reduce((sum, s) => sum + s.totalTTC, 0);

    return {
      totalScans: scans.length,
      scansAujourdhui,
      scansCetteSemaine,
      scansCeMois,
      tauxConversion: scans.length > 0 ? Math.round((scansAvecDevis / scans.length) * 100) : 0,
      tauxCommande: scansAvecDevis > 0 ? Math.round((scansAvecCommande / scansAvecDevis) * 100) : 0,
      typesRestaurants,
      totalCAGenere,
      topProduits: [], // À implémenter si nécessaire
    };
  } catch (error) {
    console.error('Erreur calcul stats:', error);
    return getMockScanStats();
  }
}

/**
 * Données mock pour la démo
 */
function getMockScanHistory(): ScanHistoryItem[] {
  const types = ['kebab', 'burger', 'tacos', 'pizza', 'snack'];
  const depots = ['lyon', 'montpellier', 'bordeaux'];
  const noms = [
    'Istanbul Kebab', 'O\'Tacos Bellecour', 'Big Fernand', 'Pizza Napoli',
    'Burger King Part-Dieu', 'Kebab Express', 'Tacos Avenue', 'La Pita Doree',
    'Burger Factory', 'Chez Ali', 'Le Grec Lyon', 'Snack Milano',
    'Fast Kebab', 'American Burger', 'Mexican Tacos'
  ];

  const scans: ScanHistoryItem[] = [];
  const now = Date.now();

  for (let i = 0; i < 25; i++) {
    const type = types[i % types.length];
    const devisGenere = Math.random() > 0.3;
    const commandeConvertie = devisGenere && Math.random() > 0.5;
    const depot = depots[i % depots.length];

    scans.push({
      id: `SCAN-MOCK-${1000 + i}`,
      dateCreation: new Date(now - i * 24 * 60 * 60 * 1000 * Math.random() * 3),
      tempsAnalyse: 2 + Math.random() * 3,
      restaurant: {
        type,
        specialite: type === 'kebab' ? 'Döner authentique' : undefined,
      },
      platsDetectes: [
        { nom: `${type.charAt(0).toUpperCase() + type.slice(1)} Classic`, categorie: type, confiance: 0.92, ventesEstimees: 45 },
        { nom: `${type.charAt(0).toUpperCase() + type.slice(1)} Special`, categorie: type, confiance: 0.88, ventesEstimees: 32 },
        { nom: 'Menu Enfant', categorie: 'menu', confiance: 0.85, ventesEstimees: 18 },
      ],
      nbProduits: 8 + Math.floor(Math.random() * 8),
      nbEmballages: 4 + Math.floor(Math.random() * 4),
      totalHT: 300 + Math.random() * 500,
      totalTTC: 360 + Math.random() * 600,
      margeEstimee: 30 + Math.random() * 15,
      client: {
        nom: noms[i % noms.length],
        adresse: `${10 + i} Rue de la République, ${depot === 'lyon' ? '69001 Lyon' : depot === 'montpellier' ? '34000 Montpellier' : '33000 Bordeaux'}`,
        telephone: `06 ${String(Math.floor(Math.random() * 90 + 10))} ${String(Math.floor(Math.random() * 90 + 10))} ${String(Math.floor(Math.random() * 90 + 10))} ${String(Math.floor(Math.random() * 90 + 10))}`,
        email: `contact@${noms[i % noms.length].toLowerCase().replace(/[^a-z]/g, '')}.fr`,
      },
      devisGenere,
      devisId: devisGenere ? `DEV-2026-${String(100 + i).padStart(5, '0')}` : undefined,
      devisNumero: devisGenere ? `DEV-2026-${String(100 + i).padStart(5, '0')}` : undefined,
      commandeConvertie,
      commandeId: commandeConvertie ? `CMD-${1000 + i}` : undefined,
      commercialId: `comm-${(i % 6) + 1}`,
      commercialNom: ['Karim Benzema', 'Sophie Martin', 'Lucas Dupont', 'Aïcha Benmoussa', 'Thomas Leroy', 'Nadia Khelifi'][i % 6],
      depot,
      source: Math.random() > 0.3 ? 'mobile' : 'desktop',
    });
  }

  return scans.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
}

function getMockScanStats(): ScanHistoryStats {
  return {
    totalScans: 156,
    scansAujourdhui: 8,
    scansCetteSemaine: 42,
    scansCeMois: 156,
    tauxConversion: 72,
    tauxCommande: 65,
    typesRestaurants: [
      { type: 'kebab', count: 58, pourcentage: 37 },
      { type: 'burger', count: 42, pourcentage: 27 },
      { type: 'tacos', count: 31, pourcentage: 20 },
      { type: 'pizza', count: 15, pourcentage: 10 },
      { type: 'snack', count: 10, pourcentage: 6 },
    ],
    totalCAGenere: 45680,
    topProduits: [
      { nom: 'Viande Kebab Premium 5kg', ref: 'DIS-001', count: 89 },
      { nom: 'Frites Surgelées 10kg', ref: 'DIS-100', count: 78 },
      { nom: 'Sauce Blanche 5L', ref: 'DIS-040', count: 72 },
    ],
  };
}
