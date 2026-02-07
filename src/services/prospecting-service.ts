/**
 * Prospecting Service - Scraping & Sourcing Prospects
 * Sources: Google Maps, Annuaires, CSV Import, Manual
 */

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// Types
export interface ProspectSource {
  id: string;
  name: string;
  type: "google_maps" | "annuaire" | "linkedin" | "manual" | "referral";
  query: string;
  location?: string;
  lastRun: Date;
  prospectsFound: number;
  status: "idle" | "running" | "completed" | "error";
}

export interface ScrapedProspect {
  id?: string;
  name: string;
  type: string;
  address: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  googleRating?: number;
  googleReviews?: number;
  openingHours?: string;
  source: string;
  sourceUrl?: string;
  qualityScore?: number;
  enriched: boolean;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  assignedTo?: string;
  tags?: string[];
}

export interface SearchFilters {
  type?: string;
  location?: string;
  radius?: number;
  minRating?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  source?: string;
}

// Restaurant types for search
export const RESTAURANT_TYPES = [
  { value: "kebab", label: "Kebab" },
  { value: "pizza", label: "Pizzeria" },
  { value: "fast-food", label: "Fast-food" },
  { value: "burger", label: "Burger" },
  { value: "tacos", label: "Tacos" },
  { value: "snack", label: "Snack" },
  { value: "friterie", label: "Friterie" },
  { value: "restaurant", label: "Restaurant" },
  { value: "brasserie", label: "Brasserie" },
  { value: "traiteur", label: "Traiteur" },
  { value: "food-truck", label: "Food Truck" },
];

// French cities for search
export const MAJOR_CITIES = [
  "Paris",
  "Marseille",
  "Lyon",
  "Toulouse",
  "Nice",
  "Nantes",
  "Montpellier",
  "Strasbourg",
  "Bordeaux",
  "Lille",
  "Rennes",
  "Reims",
  "Saint-Etienne",
  "Toulon",
  "Le Havre",
  "Grenoble",
  "Dijon",
  "Angers",
  "Nîmes",
  "Aix-en-Provence",
];

// OpenAI API for AI enrichment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Mock data for Google Maps search (in production, use official Places API)
const mockGoogleMapsResults: Record<string, ScrapedProspect[]> = {
  "kebab marseille": [
    {
      name: "Istanbul Kebab",
      type: "kebab",
      address: "45 Rue de Rome, 13001 Marseille",
      city: "Marseille",
      postalCode: "13001",
      phone: "04 91 XX XX XX",
      googleRating: 4.2,
      googleReviews: 234,
      openingHours: "11:00-23:00",
      source: "google_maps",
      sourceUrl: "https://maps.google.com/?cid=123",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "King Kebab",
      type: "kebab",
      address: "12 Boulevard Longchamp, 13001 Marseille",
      city: "Marseille",
      postalCode: "13001",
      phone: "04 91 XX XX XX",
      website: "https://kingkebab.fr",
      googleRating: 4.5,
      googleReviews: 456,
      openingHours: "10:00-00:00",
      source: "google_maps",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Antalya Grill",
      type: "kebab",
      address: "78 Cours Julien, 13006 Marseille",
      city: "Marseille",
      postalCode: "13006",
      googleRating: 4.0,
      googleReviews: 89,
      source: "google_maps",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  "pizza nice": [
    {
      name: "Pizza Nissa",
      type: "pizza",
      address: "23 Rue Masséna, 06000 Nice",
      city: "Nice",
      postalCode: "06000",
      phone: "04 93 XX XX XX",
      website: "https://pizzanissa.fr",
      googleRating: 4.6,
      googleReviews: 567,
      source: "google_maps",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Mamma Mia Pizzeria",
      type: "pizza",
      address: "56 Promenade des Anglais, 06000 Nice",
      city: "Nice",
      postalCode: "06000",
      phone: "04 93 XX XX XX",
      googleRating: 4.3,
      googleReviews: 234,
      source: "google_maps",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  "fast-food lyon": [
    {
      name: "Lyon Express Burger",
      type: "fast-food",
      address: "34 Rue de la République, 69001 Lyon",
      city: "Lyon",
      postalCode: "69001",
      phone: "04 72 XX XX XX",
      googleRating: 4.1,
      googleReviews: 345,
      source: "google_maps",
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

/**
 * Search Google Maps for prospects
 * In production, this would use Google Places API
 */
export async function searchGoogleMaps(
  query: string,
  location: string
): Promise<ScrapedProspect[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const searchKey = `${query.toLowerCase()} ${location.toLowerCase()}`;

  // Check for mock data
  const exactMatch = mockGoogleMapsResults[searchKey];
  if (exactMatch) {
    return exactMatch.map((p) => ({
      ...p,
      qualityScore: calculateQualityScore(p),
    }));
  }

  // Generate mock results for any query
  const numResults = Math.floor(Math.random() * 8) + 3;
  const results: ScrapedProspect[] = [];

  for (let i = 0; i < numResults; i++) {
    const rating = 3.5 + Math.random() * 1.5;
    const reviews = Math.floor(Math.random() * 500) + 10;
    const hasPhone = Math.random() > 0.3;
    const hasWebsite = Math.random() > 0.5;

    const prospect: ScrapedProspect = {
      name: `${query.charAt(0).toUpperCase() + query.slice(1)} ${location} ${i + 1}`,
      type: query.toLowerCase(),
      address: `${Math.floor(Math.random() * 200)} Rue Example, ${location}`,
      city: location,
      postalCode: generatePostalCode(location),
      phone: hasPhone ? generatePhone() : undefined,
      website: hasWebsite ? `https://${query.toLowerCase().replace(/\s/g, "")}${i + 1}.fr` : undefined,
      googleRating: Math.round(rating * 10) / 10,
      googleReviews: reviews,
      openingHours: "11:00-22:00",
      source: "google_maps",
      sourceUrl: `https://maps.google.com/?q=${encodeURIComponent(query + " " + location)}`,
      enriched: false,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prospect.qualityScore = calculateQualityScore(prospect);
    results.push(prospect);
  }

  return results;
}

/**
 * Search French business directories
 */
export async function searchAnnuaire(
  type: string,
  location: string
): Promise<ScrapedProspect[]> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const numResults = Math.floor(Math.random() * 5) + 2;
  const results: ScrapedProspect[] = [];

  for (let i = 0; i < numResults; i++) {
    const hasEmail = Math.random() > 0.4;
    const prospect: ScrapedProspect = {
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} du ${location} ${i + 1}`,
      type: type.toLowerCase(),
      address: `${Math.floor(Math.random() * 100)} Avenue Principale, ${location}`,
      city: location,
      postalCode: generatePostalCode(location),
      phone: generatePhone(),
      email: hasEmail ? `contact@${type.toLowerCase().replace(/\s/g, "")}${i + 1}.fr` : undefined,
      source: "annuaire",
      sourceUrl: "https://www.pagesjaunes.fr",
      enriched: hasEmail,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prospect.qualityScore = calculateQualityScore(prospect);
    results.push(prospect);
  }

  return results;
}

/**
 * Enrich prospect data using AI and web scraping
 */
export async function enrichProspectData(
  prospect: ScrapedProspect
): Promise<ScrapedProspect> {
  const enriched = { ...prospect };

  // Try to find email from website
  if (prospect.website && !prospect.email) {
    const email = await findEmailFromWebsite(prospect.website);
    if (email) {
      enriched.email = email;
    }
  }

  // Use AI to analyze and enrich data
  if (OPENAI_API_KEY) {
    try {
      const prompt = `Analyse ce prospect pour un grossiste alimentaire B2B:
Nom: ${prospect.name}
Type: ${prospect.type}
Adresse: ${prospect.address}
Note Google: ${prospect.googleRating || "N/A"}/5
Avis: ${prospect.googleReviews || 0}

Génère un JSON avec:
- estimatedMonthlyPurchases: estimation achats mensuels en euros
- potentialProducts: liste de 3 produits pertinents
- bestContactTime: meilleur moment pour contacter
- notes: une remarque utile pour le commercial

Réponds uniquement en JSON valide.`;

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "Tu es un assistant commercial B2B expert en restauration." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 256,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiData = JSON.parse(jsonMatch[0]);
            enriched.notes = aiData.notes || enriched.notes;
            enriched.tags = aiData.potentialProducts || [];
          }
        } catch {
          // JSON parsing failed, ignore
        }
      }
    } catch {
      // AI enrichment failed, continue without
    }
  }

  enriched.enriched = true;
  enriched.updatedAt = new Date();
  enriched.qualityScore = calculateQualityScore(enriched);

  return enriched;
}

/**
 * Find email from website
 */
export async function findEmailFromWebsite(website: string): Promise<string | null> {
  // Simulate finding email
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In production, this would scrape the website for email addresses
  // For demo, generate realistic email based on domain
  if (Math.random() > 0.4) {
    try {
      const url = new URL(website);
      const domain = url.hostname.replace("www.", "");
      const prefixes = ["contact", "info", "commande", "direction"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${prefix}@${domain}`;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Detect potential clients from competitors
 */
export async function detectCompetitorClients(): Promise<ScrapedProspect[]> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock data for restaurants that might not have a dedicated supplier
  return [
    {
      name: "Le Petit Snack",
      type: "snack",
      address: "89 Rue Victor Hugo, 13003 Marseille",
      city: "Marseille",
      postalCode: "13003",
      phone: "04 91 XX XX XX",
      googleRating: 3.8,
      googleReviews: 45,
      source: "competitor_analysis",
      enriched: false,
      status: "new",
      qualityScore: 65,
      notes: "Petit établissement, potentiellement sans fournisseur attitré",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Chez Ali",
      type: "kebab",
      address: "156 Avenue des Chartreux, 13004 Marseille",
      city: "Marseille",
      postalCode: "13004",
      phone: "04 91 XX XX XX",
      googleRating: 4.1,
      googleReviews: 123,
      source: "competitor_analysis",
      enriched: false,
      status: "new",
      qualityScore: 72,
      notes: "Nouveau sur le marché, opportunité de premier fournisseur",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

/**
 * Import prospects from CSV file
 */
export async function importFromCSV(file: File): Promise<ScrapedProspect[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

        const prospects: ScrapedProspect[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length < 2) continue;

          const prospect: ScrapedProspect = {
            name: getValue(headers, values, ["nom", "name", "entreprise", "business"]) || `Import ${i}`,
            type: getValue(headers, values, ["type", "categorie", "category"]) || "restaurant",
            address: getValue(headers, values, ["adresse", "address"]) || "",
            city: getValue(headers, values, ["ville", "city"]) || "",
            postalCode: getValue(headers, values, ["cp", "code_postal", "postal_code", "zip"]) || "",
            phone: getValue(headers, values, ["telephone", "phone", "tel"]) || undefined,
            email: getValue(headers, values, ["email", "mail", "courriel"]) || undefined,
            website: getValue(headers, values, ["site", "website", "url"]) || undefined,
            source: "csv_import",
            enriched: false,
            status: "new",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          prospect.qualityScore = calculateQualityScore(prospect);
          prospects.push(prospect);
        }

        resolve(prospects);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsText(file);
  });
}

/**
 * Helper to get value from CSV
 */
function getValue(headers: string[], values: string[], possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    const index = headers.indexOf(name);
    if (index !== -1 && values[index]) {
      return values[index].replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
}

/**
 * Calculate quality score for a prospect
 */
export function calculateQualityScore(prospect: ScrapedProspect): number {
  let score = 0;

  // Base score
  score += 20;

  // Has phone (+15)
  if (prospect.phone) score += 15;

  // Has email (+20)
  if (prospect.email) score += 20;

  // Has website (+10)
  if (prospect.website) score += 10;

  // Google rating (+0-15 based on rating)
  if (prospect.googleRating) {
    score += Math.min(15, Math.floor(prospect.googleRating * 3));
  }

  // Number of reviews (+0-10)
  if (prospect.googleReviews) {
    score += Math.min(10, Math.floor(prospect.googleReviews / 50));
  }

  // Has address (+5)
  if (prospect.address && prospect.address.length > 10) score += 5;

  // Has city (+5)
  if (prospect.city) score += 5;

  return Math.min(100, score);
}

/**
 * Generate French phone number
 */
function generatePhone(): string {
  const prefixes = ["04", "01", "03", "05"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Generate postal code based on city
 */
function generatePostalCode(city: string): string {
  const cityPostals: Record<string, string> = {
    Paris: "75",
    Marseille: "13",
    Lyon: "69",
    Toulouse: "31",
    Nice: "06",
    Nantes: "44",
    Montpellier: "34",
    Strasbourg: "67",
    Bordeaux: "33",
    Lille: "59",
  };

  const prefix = cityPostals[city] || "75";
  return `${prefix}0${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
}

/**
 * Save prospect to Firestore
 */
export async function saveProspect(prospect: ScrapedProspect): Promise<string> {
  const docRef = await addDoc(collection(db, "prospects"), {
    ...prospect,
    createdAt: Timestamp.fromDate(prospect.createdAt),
    updatedAt: Timestamp.fromDate(prospect.updatedAt),
  });
  return docRef.id;
}

/**
 * Save multiple prospects
 */
export async function saveProspects(prospects: ScrapedProspect[]): Promise<string[]> {
  const ids: string[] = [];
  for (const prospect of prospects) {
    const id = await saveProspect(prospect);
    ids.push(id);
  }
  return ids;
}

/**
 * Update prospect status
 */
export async function updateProspectStatus(
  prospectId: string,
  status: ScrapedProspect["status"]
): Promise<void> {
  await updateDoc(doc(db, "prospects", prospectId), {
    status,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get prospects with filters
 */
export async function getProspects(filters?: SearchFilters): Promise<ScrapedProspect[]> {
  let q = query(collection(db, "prospects"), orderBy("createdAt", "desc"));

  if (filters?.type) {
    q = query(q, where("type", "==", filters.type));
  }
  if (filters?.source) {
    q = query(q, where("source", "==", filters.source));
  }
  if (filters?.hasEmail) {
    q = query(q, where("email", "!=", null));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ScrapedProspect[];
}

/**
 * Get prospect sources stats
 */
export async function getSourcesStats(): Promise<{ source: string; count: number }[]> {
  const prospects = await getProspects();
  const stats: Record<string, number> = {};

  for (const p of prospects) {
    stats[p.source] = (stats[p.source] || 0) + 1;
  }

  return Object.entries(stats).map(([source, count]) => ({ source, count }));
}

/**
 * Bulk enrich prospects
 */
export async function bulkEnrichProspects(
  prospectIds: string[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < prospectIds.length; i++) {
    // In production, fetch and enrich each prospect
    await new Promise((r) => setTimeout(r, 500));
    onProgress?.(i + 1, prospectIds.length);
  }
}

/**
 * Search all sources at once
 */
export async function searchAllSources(
  type: string,
  location: string
): Promise<{ source: string; results: ScrapedProspect[] }[]> {
  const [googleResults, annuaireResults, competitorResults] = await Promise.all([
    searchGoogleMaps(type, location),
    searchAnnuaire(type, location),
    detectCompetitorClients(),
  ]);

  return [
    { source: "Google Maps", results: googleResults },
    { source: "Annuaires", results: annuaireResults },
    { source: "Analyse Concurrence", results: competitorResults.filter((p) => p.city?.toLowerCase() === location.toLowerCase()) },
  ];
}
