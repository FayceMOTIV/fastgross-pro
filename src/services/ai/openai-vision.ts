import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Catalogue DISTRAM avec prix réels
const CATALOGUE_DISTRAM = {
  viandes: [
    { ref: 'VIA-001', nom: 'Broche kebab boeuf/veau 10kg', prix: 75, unite: 'pièce' },
    { ref: 'VIA-002', nom: 'Broche kebab poulet 10kg', prix: 65, unite: 'pièce' },
    { ref: 'VIA-010', nom: 'Escalope de poulet 2.5kg', prix: 22, unite: 'sachet' },
    { ref: 'VIA-050', nom: 'Steak haché 100g x50', prix: 42, unite: 'carton' },
    { ref: 'VIA-051', nom: 'Steak haché 150g x30', prix: 45, unite: 'carton' },
    { ref: 'VIA-060', nom: 'Merguez x50', prix: 35, unite: 'carton' },
    { ref: 'VIA-070', nom: 'Nuggets poulet 1kg', prix: 12, unite: 'sachet' },
    { ref: 'VIA-080', nom: 'Cordon bleu x20', prix: 18, unite: 'carton' },
  ],
  pains: [
    { ref: 'PAI-001', nom: 'Pain pita 16cm x100', prix: 18, unite: 'carton' },
    { ref: 'PAI-002', nom: 'Pain pita 20cm x50', prix: 15, unite: 'carton' },
    { ref: 'PAI-010', nom: 'Tortilla tacos 30cm x72', prix: 24, unite: 'carton' },
    { ref: 'PAI-011', nom: 'Tortilla wrap 25cm x100', prix: 22, unite: 'carton' },
    { ref: 'PAI-020', nom: 'Pain burger sésame x48', prix: 12, unite: 'carton' },
    { ref: 'PAI-021', nom: 'Pain burger géant x24', prix: 10, unite: 'carton' },
    { ref: 'PAI-030', nom: 'Baguette précuite x25', prix: 15, unite: 'carton' },
    { ref: 'PAI-040', nom: 'Pâte à pizza 33cm x20', prix: 18, unite: 'carton' },
  ],
  sauces: [
    { ref: 'SAU-001', nom: 'Sauce blanche 5L', prix: 12, unite: 'bidon' },
    { ref: 'SAU-002', nom: 'Sauce samouraï 5L', prix: 14, unite: 'bidon' },
    { ref: 'SAU-003', nom: 'Sauce algérienne 5L', prix: 14, unite: 'bidon' },
    { ref: 'SAU-004', nom: 'Sauce harissa 5L', prix: 13, unite: 'bidon' },
    { ref: 'SAU-010', nom: 'Sauce fromagère 5L', prix: 16, unite: 'bidon' },
    { ref: 'SAU-020', nom: 'Ketchup 5L', prix: 10, unite: 'bidon' },
    { ref: 'SAU-021', nom: 'Mayonnaise 5L', prix: 11, unite: 'bidon' },
    { ref: 'SAU-030', nom: 'Sauce burger 5L', prix: 15, unite: 'bidon' },
  ],
  fromages: [
    { ref: 'FRO-001', nom: 'Emmental râpé 2.5kg', prix: 14, unite: 'sachet' },
    { ref: 'FRO-002', nom: 'Mozzarella râpée 2.5kg', prix: 16, unite: 'sachet' },
    { ref: 'FRO-010', nom: 'Cheddar tranches x200', prix: 18, unite: 'boîte' },
    { ref: 'FRO-011', nom: 'Cheddar cuite tranches x120', prix: 15, unite: 'boîte' },
    { ref: 'FRO-020', nom: 'Fromage burger tranches x200', prix: 20, unite: 'boîte' },
  ],
  legumes: [
    { ref: 'LEG-001', nom: 'Salade iceberg x6', prix: 8, unite: 'carton' },
    { ref: 'LEG-002', nom: 'Tomates fraîches 5kg', prix: 12, unite: 'cagette' },
    { ref: 'LEG-003', nom: 'Oignons émincés 2.5kg', prix: 9, unite: 'sachet' },
    { ref: 'LEG-010', nom: 'Cornichons tranches 5kg', prix: 15, unite: 'seau' },
    { ref: 'LEG-011', nom: 'Jalapeños tranches 3kg', prix: 12, unite: 'boîte' },
  ],
  frites: [
    { ref: 'FRI-001', nom: 'Frites 9mm surgelées 10kg', prix: 14, unite: 'carton' },
    { ref: 'FRI-002', nom: 'Frites 7mm surgelées 10kg', prix: 15, unite: 'carton' },
    { ref: 'FRI-010', nom: 'Potatoes 10kg', prix: 16, unite: 'carton' },
    { ref: 'FRI-011', nom: 'Onion rings 1kg', prix: 8, unite: 'sachet' },
  ],
  boissons: [
    { ref: 'BOI-001', nom: 'Coca-Cola 33cl x24', prix: 18, unite: 'pack' },
    { ref: 'BOI-002', nom: 'Coca-Cola 50cl x12', prix: 15, unite: 'pack' },
    { ref: 'BOI-010', nom: 'Eau 50cl x24', prix: 6, unite: 'pack' },
    { ref: 'BOI-020', nom: 'Orangina 33cl x24', prix: 20, unite: 'pack' },
    { ref: 'BOI-030', nom: 'Ice Tea 33cl x24', prix: 18, unite: 'pack' },
  ],
};

export interface AnalyseMenuResult {
  success: boolean;
  tempsAnalyse: number;
  platsDetectes: PlatDetecte[];
  produitsRecommandes: ProduitRecommande[];
  totalHT: number;
  totalTTC: number;
  margeEstimee: number;
  erreur?: string;
}

export interface PlatDetecte {
  nom: string;
  categorie: string;
  ventesEstimees: number;
  confiance: number;
}

export interface ProduitRecommande {
  ref: string;
  nom: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  totalHT: number;
}

export async function analyzeMenuWithGPT4o(imageBase64: string): Promise<AnalyseMenuResult> {
  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en restauration rapide et grossiste alimentaire.

Tu analyses des photos de menus de restaurants (kebab, tacos, burger, pizza, etc.) pour identifier les plats proposés et recommander les produits grossiste nécessaires.

IMPORTANT:
- Analyse UNIQUEMENT ce que tu vois réellement sur l'image
- Ne devine pas, n'invente pas de plats qui ne sont pas visibles
- Si tu vois un menu burger, parle de burgers, pas de kebabs
- Estime les ventes hebdomadaires de manière réaliste (petit resto: 30-80/semaine, moyen: 80-150, grand: 150-300)

Tu dois retourner un JSON avec cette structure exacte:
{
  "platsDetectes": [
    {
      "nom": "Nom exact du plat visible sur le menu",
      "categorie": "burger|kebab|tacos|pizza|sandwich|autre",
      "ventesEstimees": 80,
      "confiance": 0.95
    }
  ],
  "ingredients_necessaires": ["pain burger", "steak haché", "cheddar", "salade", "tomate", "sauce"]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse ce menu de restaurant et identifie tous les plats visibles. Retourne le JSON demandé.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parser le JSON de la réponse
    let analysisData;
    try {
      // Nettoyer la réponse (enlever les backticks markdown si présents)
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erreur parsing JSON GPT-4o:', parseError);
      throw new Error('Réponse IA invalide');
    }

    // Mapper les ingrédients vers les produits DISTRAM
    const produitsRecommandes = mapIngredientsToProducts(
      analysisData.ingredients_necessaires || [],
      analysisData.platsDetectes || []
    );

    // Calculer les totaux
    const totalHT = produitsRecommandes.reduce((sum, p) => sum + p.totalHT, 0);
    const totalTTC = Math.round(totalHT * 1.2 * 100) / 100;
    const margeEstimee = 68; // Marge moyenne restauration rapide

    const tempsAnalyse = (Date.now() - startTime) / 1000;

    return {
      success: true,
      tempsAnalyse,
      platsDetectes: analysisData.platsDetectes || [],
      produitsRecommandes,
      totalHT,
      totalTTC,
      margeEstimee,
    };

  } catch (error: any) {
    console.error('Erreur GPT-4o Vision:', error);
    return {
      success: false,
      tempsAnalyse: (Date.now() - startTime) / 1000,
      platsDetectes: [],
      produitsRecommandes: [],
      totalHT: 0,
      totalTTC: 0,
      margeEstimee: 0,
      erreur: error.message || 'Erreur lors de l\'analyse',
    };
  }
}

function mapIngredientsToProducts(ingredients: string[], plats: PlatDetecte[]): ProduitRecommande[] {
  const produits: ProduitRecommande[] = [];
  const totalVentes = plats.reduce((sum, p) => sum + p.ventesEstimees, 0);

  // Coefficient pour calculer les quantités (basé sur les ventes estimées)
  const coef = Math.max(1, Math.ceil(totalVentes / 100));

  // Détecter les catégories de plats
  const hasKebab = plats.some(p => p.categorie === 'kebab');
  const hasTacos = plats.some(p => p.categorie === 'tacos');
  const hasBurger = plats.some(p => p.categorie === 'burger');
  const hasPizza = plats.some(p => p.categorie === 'pizza');

  // Mapping intelligent des ingrédients vers les produits DISTRAM
  const ingredientLower = ingredients.map(i => i.toLowerCase());

  // VIANDES
  if (hasKebab || ingredientLower.some(i => i.includes('kebab') || i.includes('broche'))) {
    const produit = CATALOGUE_DISTRAM.viandes.find(p => p.ref === 'VIA-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasBurger || ingredientLower.some(i => i.includes('steak') || i.includes('burger') || i.includes('boeuf'))) {
    const produit = CATALOGUE_DISTRAM.viandes.find(p => p.ref === 'VIA-050')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 3),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 3),
    });
  }

  if (ingredientLower.some(i => i.includes('poulet') || i.includes('chicken') || i.includes('nugget'))) {
    const produit = CATALOGUE_DISTRAM.viandes.find(p => p.ref === 'VIA-010')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  // PAINS
  if (hasKebab || ingredientLower.some(i => i.includes('pita'))) {
    const produit = CATALOGUE_DISTRAM.pains.find(p => p.ref === 'PAI-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasTacos || ingredientLower.some(i => i.includes('tortilla') || i.includes('tacos'))) {
    const produit = CATALOGUE_DISTRAM.pains.find(p => p.ref === 'PAI-010')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasBurger || ingredientLower.some(i => i.includes('pain burger') || i.includes('bun'))) {
    const produit = CATALOGUE_DISTRAM.pains.find(p => p.ref === 'PAI-020')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 3),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 3),
    });
  }

  if (hasPizza || ingredientLower.some(i => i.includes('pizza') || i.includes('pâte'))) {
    const produit = CATALOGUE_DISTRAM.pains.find(p => p.ref === 'PAI-040')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  // SAUCES
  if (hasKebab || ingredientLower.some(i => i.includes('sauce blanche') || i.includes('blanche'))) {
    const produit = CATALOGUE_DISTRAM.sauces.find(p => p.ref === 'SAU-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasTacos || ingredientLower.some(i => i.includes('fromagère') || i.includes('fromage') && i.includes('sauce'))) {
    const produit = CATALOGUE_DISTRAM.sauces.find(p => p.ref === 'SAU-010')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasBurger || ingredientLower.some(i => i.includes('ketchup'))) {
    const produit = CATALOGUE_DISTRAM.sauces.find(p => p.ref === 'SAU-020')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 1),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 1),
    });
  }

  if (ingredientLower.some(i => i.includes('mayo') || i.includes('mayonnaise'))) {
    const produit = CATALOGUE_DISTRAM.sauces.find(p => p.ref === 'SAU-021')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 1),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 1),
    });
  }

  // FROMAGES
  if (ingredientLower.some(i => i.includes('cheddar'))) {
    const produit = CATALOGUE_DISTRAM.fromages.find(p => p.ref === 'FRO-010')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (ingredientLower.some(i => i.includes('emmental') || i.includes('râpé'))) {
    const produit = CATALOGUE_DISTRAM.fromages.find(p => p.ref === 'FRO-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (hasPizza || ingredientLower.some(i => i.includes('mozzarella'))) {
    const produit = CATALOGUE_DISTRAM.fromages.find(p => p.ref === 'FRO-002')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  // LÉGUMES
  if (ingredientLower.some(i => i.includes('salade') || i.includes('laitue') || i.includes('iceberg'))) {
    const produit = CATALOGUE_DISTRAM.legumes.find(p => p.ref === 'LEG-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (ingredientLower.some(i => i.includes('tomate'))) {
    const produit = CATALOGUE_DISTRAM.legumes.find(p => p.ref === 'LEG-002')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  if (ingredientLower.some(i => i.includes('oignon'))) {
    const produit = CATALOGUE_DISTRAM.legumes.find(p => p.ref === 'LEG-003')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 1),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 1),
    });
  }

  if (ingredientLower.some(i => i.includes('cornichon') || i.includes('pickle'))) {
    const produit = CATALOGUE_DISTRAM.legumes.find(p => p.ref === 'LEG-010')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 1),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 1),
    });
  }

  // FRITES
  if (ingredientLower.some(i => i.includes('frite') || i.includes('fries'))) {
    const produit = CATALOGUE_DISTRAM.frites.find(p => p.ref === 'FRI-001')!;
    produits.push({
      ref: produit.ref,
      nom: produit.nom,
      quantite: Math.ceil(coef * 2),
      unite: produit.unite,
      prixUnitaire: produit.prix,
      totalHT: produit.prix * Math.ceil(coef * 2),
    });
  }

  return produits;
}

export default analyzeMenuWithGPT4o;
