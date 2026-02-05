// Catalogue produits DISTRAM - 46+ produits

export interface CatalogueProduct {
  ref: string;
  nom: string;
  prix: number;
  unite: string;
  categorie: 'viandes' | 'pains' | 'sauces' | 'fromages' | 'legumes' | 'frites' | 'boissons';
  stockMinimum?: number;
  dlcJours?: number;
  actif: boolean;
}

export const CATALOGUE_DISTRAM: CatalogueProduct[] = [
  // VIANDES
  { ref: 'VIA-001', nom: 'Broche kebab boeuf/veau 10kg', prix: 75.00, unite: 'pièce', categorie: 'viandes', stockMinimum: 5, dlcJours: 30, actif: true },
  { ref: 'VIA-002', nom: 'Broche kebab boeuf/veau 15kg', prix: 105.00, unite: 'pièce', categorie: 'viandes', stockMinimum: 3, dlcJours: 30, actif: true },
  { ref: 'VIA-003', nom: 'Broche kebab poulet 10kg', prix: 68.00, unite: 'pièce', categorie: 'viandes', stockMinimum: 5, dlcJours: 30, actif: true },
  { ref: 'VIA-010', nom: 'Filet de poulet mariné 5kg', prix: 32.00, unite: 'carton', categorie: 'viandes', stockMinimum: 10, dlcJours: 14, actif: true },
  { ref: 'VIA-011', nom: 'Viande hachée halal 5kg', prix: 28.00, unite: 'barquette', categorie: 'viandes', stockMinimum: 8, dlcJours: 7, actif: true },
  { ref: 'VIA-020', nom: 'Merguez halal barquette 2kg', prix: 18.50, unite: 'barquette', categorie: 'viandes', stockMinimum: 15, dlcJours: 14, actif: true },
  { ref: 'VIA-030', nom: 'Cordon bleu halal 1kg', prix: 9.50, unite: 'sachet', categorie: 'viandes', stockMinimum: 20, dlcJours: 60, actif: true },
  { ref: 'VIA-040', nom: 'Escalope de poulet halal 5kg', prix: 35.00, unite: 'carton', categorie: 'viandes', stockMinimum: 8, dlcJours: 14, actif: true },
  { ref: 'VIA-050', nom: 'Steak haché 100g x50', prix: 42.00, unite: 'carton', categorie: 'viandes', stockMinimum: 10, dlcJours: 30, actif: true },
  { ref: 'VIA-060', nom: 'Saucisse de poulet halal 2kg', prix: 16.00, unite: 'barquette', categorie: 'viandes', stockMinimum: 12, dlcJours: 21, actif: true },

  // PAINS
  { ref: 'PAI-001', nom: 'Pain pita 16cm x100', prix: 18.00, unite: 'carton', categorie: 'pains', stockMinimum: 15, dlcJours: 21, actif: true },
  { ref: 'PAI-002', nom: 'Pain pita 20cm x80', prix: 22.00, unite: 'carton', categorie: 'pains', stockMinimum: 10, dlcJours: 21, actif: true },
  { ref: 'PAI-003', nom: 'Galette durum 30cm x72', prix: 20.00, unite: 'carton', categorie: 'pains', stockMinimum: 12, dlcJours: 30, actif: true },
  { ref: 'PAI-010', nom: 'Tortilla tacos 30cm x72', prix: 24.00, unite: 'carton', categorie: 'pains', stockMinimum: 20, dlcJours: 60, actif: true },
  { ref: 'PAI-020', nom: 'Pain burger sésame x48', prix: 12.00, unite: 'carton', categorie: 'pains', stockMinimum: 15, dlcJours: 14, actif: true },
  { ref: 'PAI-021', nom: 'Pain panini x40', prix: 14.00, unite: 'carton', categorie: 'pains', stockMinimum: 10, dlcJours: 14, actif: true },
  { ref: 'PAI-030', nom: 'Pain baguette précuit x20', prix: 10.00, unite: 'carton', categorie: 'pains', stockMinimum: 8, dlcJours: 30, actif: true },
  { ref: 'PAI-040', nom: 'Pain naan nature x50', prix: 16.00, unite: 'carton', categorie: 'pains', stockMinimum: 6, dlcJours: 21, actif: true },

  // SAUCES
  { ref: 'SAU-001', nom: 'Sauce blanche 5L', prix: 12.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 20, dlcJours: 120, actif: true },
  { ref: 'SAU-002', nom: 'Sauce samouraï 5L', prix: 14.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 15, dlcJours: 120, actif: true },
  { ref: 'SAU-003', nom: 'Sauce algérienne 5L', prix: 13.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 15, dlcJours: 120, actif: true },
  { ref: 'SAU-004', nom: 'Sauce harissa 5L', prix: 11.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 10, dlcJours: 180, actif: true },
  { ref: 'SAU-010', nom: 'Sauce fromagère 5L', prix: 16.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 25, dlcJours: 90, actif: true },
  { ref: 'SAU-020', nom: 'Ketchup 5L', prix: 8.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 20, dlcJours: 180, actif: true },
  { ref: 'SAU-021', nom: 'Mayonnaise 5L', prix: 10.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 15, dlcJours: 120, actif: true },
  { ref: 'SAU-030', nom: 'Sauce tomate pizza 5L', prix: 9.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 15, dlcJours: 180, actif: true },
  { ref: 'SAU-040', nom: 'Sauce Biggy Burger 5L', prix: 13.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 10, dlcJours: 120, actif: true },
  { ref: 'SAU-050', nom: 'Sauce BBQ 5L', prix: 12.00, unite: 'bidon', categorie: 'sauces', stockMinimum: 10, dlcJours: 180, actif: true },

  // FROMAGES
  { ref: 'FRO-001', nom: 'Emmental râpé 2.5kg', prix: 14.00, unite: 'sachet', categorie: 'fromages', stockMinimum: 20, dlcJours: 60, actif: true },
  { ref: 'FRO-002', nom: 'Mozzarella pizza 2.5kg', prix: 16.00, unite: 'sachet', categorie: 'fromages', stockMinimum: 25, dlcJours: 45, actif: true },
  { ref: 'FRO-010', nom: 'Cheddar tranches x200', prix: 18.00, unite: 'boîte', categorie: 'fromages', stockMinimum: 15, dlcJours: 90, actif: true },
  { ref: 'FRO-020', nom: 'Feta cubes 2kg', prix: 22.00, unite: 'seau', categorie: 'fromages', stockMinimum: 8, dlcJours: 60, actif: true },
  { ref: 'FRO-030', nom: 'Raclette tranches 1kg', prix: 12.00, unite: 'sachet', categorie: 'fromages', stockMinimum: 10, dlcJours: 45, actif: true },

  // LÉGUMES
  { ref: 'LEG-001', nom: 'Oignons frits 2kg', prix: 9.00, unite: 'sachet', categorie: 'legumes', stockMinimum: 25, dlcJours: 180, actif: true },
  { ref: 'LEG-002', nom: 'Salade iceberg émincée 6kg', prix: 12.00, unite: 'carton', categorie: 'legumes', stockMinimum: 15, dlcJours: 7, actif: true },
  { ref: 'LEG-003', nom: 'Tomates rondelles 5kg', prix: 14.00, unite: 'carton', categorie: 'legumes', stockMinimum: 12, dlcJours: 7, actif: true },
  { ref: 'LEG-010', nom: 'Cornichons tranchés 5kg', prix: 16.00, unite: 'seau', categorie: 'legumes', stockMinimum: 10, dlcJours: 365, actif: true },
  { ref: 'LEG-020', nom: 'Olives noires dénoyautées 5kg', prix: 24.00, unite: 'seau', categorie: 'legumes', stockMinimum: 6, dlcJours: 365, actif: true },
  { ref: 'LEG-030', nom: 'Poivrons grillés 2kg', prix: 18.00, unite: 'bocal', categorie: 'legumes', stockMinimum: 8, dlcJours: 180, actif: true },
  { ref: 'LEG-040', nom: 'Champignons émincés 3kg', prix: 14.00, unite: 'boîte', categorie: 'legumes', stockMinimum: 10, dlcJours: 365, actif: true },

  // FRITES ET ACCOMPAGNEMENTS
  { ref: 'FRI-001', nom: 'Frites 9mm surgelées 10kg', prix: 14.00, unite: 'carton', categorie: 'frites', stockMinimum: 30, dlcJours: 365, actif: true },
  { ref: 'FRI-002', nom: 'Frites allumettes 7mm 10kg', prix: 15.00, unite: 'carton', categorie: 'frites', stockMinimum: 25, dlcJours: 365, actif: true },
  { ref: 'FRI-003', nom: 'Potatoes surgelées 10kg', prix: 16.00, unite: 'carton', categorie: 'frites', stockMinimum: 15, dlcJours: 365, actif: true },
  { ref: 'FRI-010', nom: 'Nuggets poulet halal 1kg', prix: 8.00, unite: 'sachet', categorie: 'frites', stockMinimum: 30, dlcJours: 180, actif: true },
  { ref: 'FRI-011', nom: 'Tenders poulet halal 1kg', prix: 9.50, unite: 'sachet', categorie: 'frites', stockMinimum: 25, dlcJours: 180, actif: true },
  { ref: 'FRI-020', nom: 'Onion rings 1kg', prix: 7.50, unite: 'sachet', categorie: 'frites', stockMinimum: 15, dlcJours: 180, actif: true },
  { ref: 'FRI-030', nom: 'Mozzarella sticks 1kg', prix: 11.00, unite: 'sachet', categorie: 'frites', stockMinimum: 12, dlcJours: 180, actif: true },

  // BOISSONS
  { ref: 'BOI-001', nom: 'Coca-Cola 33cl x24', prix: 18.00, unite: 'pack', categorie: 'boissons', stockMinimum: 40, dlcJours: 180, actif: true },
  { ref: 'BOI-002', nom: 'Eau minérale 50cl x24', prix: 6.00, unite: 'pack', categorie: 'boissons', stockMinimum: 50, dlcJours: 365, actif: true },
  { ref: 'BOI-010', nom: 'Ice Tea 33cl x24', prix: 16.00, unite: 'pack', categorie: 'boissons', stockMinimum: 30, dlcJours: 180, actif: true },
  { ref: 'BOI-020', nom: 'Ayran 25cl x24', prix: 14.00, unite: 'pack', categorie: 'boissons', stockMinimum: 25, dlcJours: 30, actif: true },
  { ref: 'BOI-030', nom: 'Fanta Orange 33cl x24', prix: 17.00, unite: 'pack', categorie: 'boissons', stockMinimum: 30, dlcJours: 180, actif: true },
  { ref: 'BOI-040', nom: 'Sprite 33cl x24', prix: 17.00, unite: 'pack', categorie: 'boissons', stockMinimum: 25, dlcJours: 180, actif: true },
];

// Exporter par catégorie
export const getProductsByCategory = (category: string): CatalogueProduct[] => {
  return CATALOGUE_DISTRAM.filter(p => p.categorie === category && p.actif);
};

// Rechercher un produit par référence
export const getProductByRef = (ref: string): CatalogueProduct | undefined => {
  return CATALOGUE_DISTRAM.find(p => p.ref === ref);
};

// Stats du catalogue
export const getCatalogueStats = () => {
  const categories = [...new Set(CATALOGUE_DISTRAM.map(p => p.categorie))];
  return {
    totalProducts: CATALOGUE_DISTRAM.length,
    activeProducts: CATALOGUE_DISTRAM.filter(p => p.actif).length,
    categories: categories.length,
    byCategory: categories.map(cat => ({
      category: cat,
      count: CATALOGUE_DISTRAM.filter(p => p.categorie === cat).length,
    })),
  };
};

export default CATALOGUE_DISTRAM;
