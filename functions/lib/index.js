"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanMenu = void 0;
const https_1 = require("firebase-functions/v2/https");
const openai_1 = require("openai");
const CATALOGUE_DISTRAM = [
    // VIANDES - Kebab
    { ref: 'VIA001', nom: 'Broche Kebab Boeuf/Veau Halal 10kg', nomCourt: 'Broche Kebab B/V 10kg', categorie: 'Viandes', sousCategorie: 'Kebab', unite: 'piece', contenance: '10kg', prixVenteHT: 78.50, tags: ['kebab', 'broche', 'boeuf', 'veau', 'halal', 'doner'] },
    { ref: 'VIA002', nom: 'Broche Kebab Poulet Halal 10kg', nomCourt: 'Broche Kebab Poulet 10kg', categorie: 'Viandes', sousCategorie: 'Kebab', unite: 'piece', contenance: '10kg', prixVenteHT: 68.00, tags: ['kebab', 'broche', 'poulet', 'halal', 'doner', 'chicken'] },
    { ref: 'VIA003', nom: 'Broche Kebab Mixte 10kg', nomCourt: 'Broche Kebab Mixte 10kg', categorie: 'Viandes', sousCategorie: 'Kebab', unite: 'piece', contenance: '10kg', prixVenteHT: 74.00, tags: ['kebab', 'broche', 'mixte', 'halal', 'doner'] },
    // VIANDES - Burger
    { ref: 'VIA010', nom: 'Steak Hache Pur Boeuf 100g x50 Halal', nomCourt: 'Steak 100g x50', categorie: 'Viandes', sousCategorie: 'Burger', unite: 'carton', contenance: '50 pieces (5kg)', prixVenteHT: 45.90, tags: ['steak', 'burger', 'hache', 'boeuf', '100g', 'halal'] },
    { ref: 'VIA011', nom: 'Steak Hache Pur Boeuf 120g x40 Halal', nomCourt: 'Steak 120g x40', categorie: 'Viandes', sousCategorie: 'Burger', unite: 'carton', contenance: '40 pieces (4.8kg)', prixVenteHT: 49.90, tags: ['steak', 'burger', 'hache', 'boeuf', '120g', 'halal'] },
    { ref: 'VIA012', nom: 'Steak Hache Pur Boeuf 150g x30 Halal', nomCourt: 'Steak 150g x30', categorie: 'Viandes', sousCategorie: 'Burger', unite: 'carton', contenance: '30 pieces (4.5kg)', prixVenteHT: 54.90, tags: ['steak', 'burger', 'hache', 'boeuf', '150g', 'xl', 'double', 'halal'] },
    // VIANDES - Poulet
    { ref: 'VIA020', nom: 'Filet de Poulet Nature 2.5kg Halal', nomCourt: 'Filet Poulet 2.5kg', categorie: 'Viandes', sousCategorie: 'Poulet', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 24.90, tags: ['poulet', 'filet', 'nature', 'halal', 'grille'] },
    { ref: 'VIA021', nom: 'Emince de Poulet Marine 2.5kg Halal', nomCourt: 'Emince Poulet 2.5kg', categorie: 'Viandes', sousCategorie: 'Poulet', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 26.50, tags: ['poulet', 'emince', 'marine', 'tacos', 'halal'] },
    { ref: 'VIA022', nom: 'Nuggets de Poulet x100 Halal', nomCourt: 'Nuggets x100', categorie: 'Viandes', sousCategorie: 'Poulet', unite: 'carton', contenance: '100 pieces (2kg)', prixVenteHT: 19.90, tags: ['nuggets', 'poulet', 'pane', 'enfant', 'halal'] },
    { ref: 'VIA023', nom: 'Tenders Poulet Crispy x50 Halal', nomCourt: 'Tenders x50', categorie: 'Viandes', sousCategorie: 'Poulet', unite: 'carton', contenance: '50 pieces (1.5kg)', prixVenteHT: 21.90, tags: ['tenders', 'poulet', 'crispy', 'pane', 'halal'] },
    // VIANDES - Charcuterie
    { ref: 'VIA030', nom: 'Bacon de Dinde Fume Tranche 1kg Halal', nomCourt: 'Bacon Dinde 1kg', categorie: 'Viandes', sousCategorie: 'Charcuterie', unite: 'paquet', contenance: '1kg', prixVenteHT: 15.90, tags: ['bacon', 'dinde', 'fume', 'halal', 'burger'] },
    { ref: 'VIA031', nom: 'Bacon de Boeuf Fume Tranche 500g Halal', nomCourt: 'Bacon Boeuf 500g', categorie: 'Viandes', sousCategorie: 'Charcuterie', unite: 'paquet', contenance: '500g', prixVenteHT: 12.50, tags: ['bacon', 'boeuf', 'fume', 'halal', 'burger', 'premium'] },
    // VIANDES - Saucisses
    { ref: 'VIA040', nom: 'Merguez Boeuf/Mouton x50 Halal', nomCourt: 'Merguez x50', categorie: 'Viandes', sousCategorie: 'Saucisses', unite: 'carton', contenance: '50 pieces (2.5kg)', prixVenteHT: 36.90, tags: ['merguez', 'boeuf', 'mouton', 'epice', 'halal', 'grille'] },
    // PAINS - Pita
    { ref: 'PAI001', nom: 'Pain Pita Blanc 16cm x100', nomCourt: 'Pita 16cm x100', categorie: 'Pains', sousCategorie: 'Pita', unite: 'carton', contenance: '100 pieces', prixVenteHT: 18.90, tags: ['pita', 'pain', 'kebab', 'grec', '16cm'] },
    { ref: 'PAI002', nom: 'Pain Pita Blanc 20cm x50', nomCourt: 'Pita 20cm x50', categorie: 'Pains', sousCategorie: 'Pita', unite: 'carton', contenance: '50 pieces', prixVenteHT: 15.90, tags: ['pita', 'pain', 'kebab', 'grec', '20cm', 'grand'] },
    // PAINS - Tortilla
    { ref: 'PAI010', nom: 'Tortilla Ble 25cm x72 (French Tacos)', nomCourt: 'Tortilla 25cm x72', categorie: 'Pains', sousCategorie: 'Tortilla', unite: 'carton', contenance: '72 pieces', prixVenteHT: 24.50, tags: ['tortilla', 'tacos', 'french tacos', '25cm', 'wrap'] },
    { ref: 'PAI011', nom: 'Tortilla Ble 30cm x48 (XL)', nomCourt: 'Tortilla 30cm x48', categorie: 'Pains', sousCategorie: 'Tortilla', unite: 'carton', contenance: '48 pieces', prixVenteHT: 22.90, tags: ['tortilla', 'tacos', 'french tacos', '30cm', 'xl', 'wrap'] },
    // PAINS - Burger
    { ref: 'PAI020', nom: 'Pain Burger Sesame Classic x48', nomCourt: 'Bun Sesame x48', categorie: 'Pains', sousCategorie: 'Burger', unite: 'carton', contenance: '48 pieces', prixVenteHT: 12.90, tags: ['pain', 'burger', 'bun', 'sesame', 'classique'] },
    { ref: 'PAI021', nom: 'Pain Burger Brioche Premium x36', nomCourt: 'Bun Brioche x36', categorie: 'Pains', sousCategorie: 'Burger', unite: 'carton', contenance: '36 pieces', prixVenteHT: 14.90, tags: ['pain', 'burger', 'bun', 'brioche', 'premium'] },
    { ref: 'PAI022', nom: 'Pain Burger XL Sesame x24', nomCourt: 'Bun XL x24', categorie: 'Pains', sousCategorie: 'Burger', unite: 'carton', contenance: '24 pieces', prixVenteHT: 11.50, tags: ['pain', 'burger', 'bun', 'xl', 'double', 'grand'] },
    // FROMAGES - Tranches
    { ref: 'FRO001', nom: 'Cheddar Orange Tranches x200', nomCourt: 'Cheddar x200', categorie: 'Fromages', sousCategorie: 'Tranches', unite: 'boite', contenance: '200 tranches (2.5kg)', prixVenteHT: 19.90, tags: ['cheddar', 'fromage', 'tranche', 'burger', 'orange'] },
    { ref: 'FRO002', nom: 'Fromage Fondu Burger Tranches x200', nomCourt: 'Fondu Burger x200', categorie: 'Fromages', sousCategorie: 'Tranches', unite: 'boite', contenance: '200 tranches (2.5kg)', prixVenteHT: 21.90, tags: ['fromage', 'fondu', 'tranche', 'burger', 'american'] },
    // FROMAGES - Rapes
    { ref: 'FRO010', nom: 'Emmental Rape 2.5kg', nomCourt: 'Emmental Rape 2.5kg', categorie: 'Fromages', sousCategorie: 'Rape', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 15.90, tags: ['emmental', 'fromage', 'rape', 'gratine', 'pizza'] },
    { ref: 'FRO011', nom: 'Mozzarella Rapee 2.5kg', nomCourt: 'Mozza Rapee 2.5kg', categorie: 'Fromages', sousCategorie: 'Rape', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 18.50, tags: ['mozzarella', 'fromage', 'rape', 'pizza', 'filant'] },
    { ref: 'FRO012', nom: 'Mix 3 Fromages Rapes 2.5kg', nomCourt: 'Mix 3 Fromages 2.5kg', categorie: 'Fromages', sousCategorie: 'Rape', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 20.90, tags: ['mix', 'fromage', 'rape', 'pizza', 'tacos', 'gratine'] },
    // FROMAGES - Speciaux
    { ref: 'FRO020', nom: 'Bleu d\'Auvergne Emiette 1kg', nomCourt: 'Bleu Emiette 1kg', categorie: 'Fromages', sousCategorie: 'Speciaux', unite: 'barquette', contenance: '1kg', prixVenteHT: 24.50, tags: ['bleu', 'fromage', 'emiette', 'burger', 'gourmet', 'roquefort'] },
    { ref: 'FRO021', nom: 'Chevre Buche Affine 1kg', nomCourt: 'Chevre Buche 1kg', categorie: 'Fromages', sousCategorie: 'Speciaux', unite: 'piece', contenance: '1kg', prixVenteHT: 19.90, tags: ['chevre', 'fromage', 'buche', 'burger', 'salade'] },
    { ref: 'FRO022', nom: 'Raclette Tranches 1kg', nomCourt: 'Raclette 1kg', categorie: 'Fromages', sousCategorie: 'Speciaux', unite: 'paquet', contenance: '1kg', prixVenteHT: 17.50, tags: ['raclette', 'fromage', 'tranche', 'burger', 'fondu', 'montagnard'] },
    // SAUCES - Kebab
    { ref: 'SAU001', nom: 'Sauce Blanche Kebab 5L', nomCourt: 'Sauce Blanche 5L', categorie: 'Sauces', sousCategorie: 'Kebab', unite: 'bidon', contenance: '5L', prixVenteHT: 12.90, tags: ['sauce', 'blanche', 'kebab', 'yaourt', 'ail'] },
    { ref: 'SAU002', nom: 'Sauce Samourai 5L', nomCourt: 'Sauce Samourai 5L', categorie: 'Sauces', sousCategorie: 'Kebab', unite: 'bidon', contenance: '5L', prixVenteHT: 14.90, tags: ['sauce', 'samourai', 'epice', 'kebab', 'pimente'] },
    { ref: 'SAU003', nom: 'Sauce Algerienne 5L', nomCourt: 'Sauce Algerienne 5L', categorie: 'Sauces', sousCategorie: 'Kebab', unite: 'bidon', contenance: '5L', prixVenteHT: 14.50, tags: ['sauce', 'algerienne', 'kebab', 'epice'] },
    { ref: 'SAU004', nom: 'Sauce Harissa 5L', nomCourt: 'Harissa 5L', categorie: 'Sauces', sousCategorie: 'Kebab', unite: 'bidon', contenance: '5L', prixVenteHT: 13.90, tags: ['sauce', 'harissa', 'piment', 'kebab', 'epice'] },
    // SAUCES - Tacos
    { ref: 'SAU010', nom: 'Sauce Fromagere 5L', nomCourt: 'Fromagere 5L', categorie: 'Sauces', sousCategorie: 'Tacos', unite: 'bidon', contenance: '5L', prixVenteHT: 16.90, tags: ['sauce', 'fromagere', 'tacos', 'cheese', 'cheddar'] },
    { ref: 'SAU011', nom: 'Sauce Poivre 5L', nomCourt: 'Sauce Poivre 5L', categorie: 'Sauces', sousCategorie: 'Tacos', unite: 'bidon', contenance: '5L', prixVenteHT: 15.90, tags: ['sauce', 'poivre', 'tacos', 'creme'] },
    // SAUCES - Classiques
    { ref: 'SAU020', nom: 'Ketchup 5L', nomCourt: 'Ketchup 5L', categorie: 'Sauces', sousCategorie: 'Classiques', unite: 'bidon', contenance: '5L', prixVenteHT: 10.50, tags: ['ketchup', 'sauce', 'tomate', 'burger', 'frites'] },
    { ref: 'SAU021', nom: 'Mayonnaise 5L', nomCourt: 'Mayonnaise 5L', categorie: 'Sauces', sousCategorie: 'Classiques', unite: 'bidon', contenance: '5L', prixVenteHT: 11.90, tags: ['mayonnaise', 'mayo', 'sauce', 'burger', 'frites'] },
    { ref: 'SAU022', nom: 'Sauce Burger Speciale 5L', nomCourt: 'Sauce Burger 5L', categorie: 'Sauces', sousCategorie: 'Burger', unite: 'bidon', contenance: '5L', prixVenteHT: 15.50, tags: ['sauce', 'burger', 'speciale', 'bigmac'] },
    { ref: 'SAU023', nom: 'Sauce BBQ 5L', nomCourt: 'Sauce BBQ 5L', categorie: 'Sauces', sousCategorie: 'Burger', unite: 'bidon', contenance: '5L', prixVenteHT: 14.50, tags: ['sauce', 'bbq', 'barbecue', 'fume', 'burger'] },
    // LEGUMES
    { ref: 'LEG001', nom: 'Salade Iceberg x6', nomCourt: 'Iceberg x6', categorie: 'Legumes', sousCategorie: 'Frais', unite: 'carton', contenance: '6 pieces', prixVenteHT: 8.90, tags: ['salade', 'iceberg', 'frais', 'laitue'] },
    { ref: 'LEG002', nom: 'Tomates Fraiches 5kg', nomCourt: 'Tomates 5kg', categorie: 'Legumes', sousCategorie: 'Frais', unite: 'cagette', contenance: '5kg', prixVenteHT: 12.50, tags: ['tomate', 'frais', 'legume'] },
    { ref: 'LEG003', nom: 'Oignons Eminces 2.5kg', nomCourt: 'Oignons Eminces 2.5kg', categorie: 'Legumes', sousCategorie: 'Prepare', unite: 'sachet', contenance: '2.5kg', prixVenteHT: 9.50, tags: ['oignon', 'emince', 'prepare'] },
    { ref: 'LEG004', nom: 'Oignons Frits Crispy 1kg', nomCourt: 'Oignons Frits 1kg', categorie: 'Legumes', sousCategorie: 'Prepare', unite: 'sachet', contenance: '1kg', prixVenteHT: 13.50, tags: ['oignon', 'frit', 'crispy', 'burger'] },
    { ref: 'LEG010', nom: 'Cornichons Tranches 5kg', nomCourt: 'Cornichons 5kg', categorie: 'Legumes', sousCategorie: 'Conserves', unite: 'seau', contenance: '5kg', prixVenteHT: 16.50, tags: ['cornichon', 'pickle', 'burger', 'tranche'] },
    { ref: 'LEG011', nom: 'Jalapenos Tranches 3kg', nomCourt: 'Jalapenos 3kg', categorie: 'Legumes', sousCategorie: 'Conserves', unite: 'boite', contenance: '3kg', prixVenteHT: 13.50, tags: ['jalapeno', 'piment', 'epice', 'tex-mex'] },
    // FRITES
    { ref: 'FRI001', nom: 'Frites 9mm Surgelees 10kg', nomCourt: 'Frites 9mm 10kg', categorie: 'Frites', sousCategorie: 'Classiques', unite: 'carton', contenance: '10kg', prixVenteHT: 14.50, tags: ['frites', '9mm', 'surgele', 'standard'] },
    { ref: 'FRI002', nom: 'Frites 7mm Fines Surgelees 10kg', nomCourt: 'Frites 7mm 10kg', categorie: 'Frites', sousCategorie: 'Classiques', unite: 'carton', contenance: '10kg', prixVenteHT: 15.90, tags: ['frites', '7mm', 'fines', 'surgele'] },
    { ref: 'FRI010', nom: 'Potatoes Surgelees 10kg', nomCourt: 'Potatoes 10kg', categorie: 'Frites', sousCategorie: 'Speciales', unite: 'carton', contenance: '10kg', prixVenteHT: 17.90, tags: ['potatoes', 'quartiers', 'epice', 'surgele'] },
    { ref: 'FRI011', nom: 'Onion Rings Surgeles 1kg', nomCourt: 'Onion Rings 1kg', categorie: 'Frites', sousCategorie: 'Speciales', unite: 'sachet', contenance: '1kg', prixVenteHT: 8.90, tags: ['onion rings', 'oignon', 'pane', 'surgele'] },
    // BOISSONS
    { ref: 'BOI001', nom: 'Coca-Cola 33cl x24', nomCourt: 'Coca 33cl x24', categorie: 'Boissons', sousCategorie: 'Sodas', unite: 'pack', contenance: '24 x 33cl', prixVenteHT: 19.90, tags: ['coca', 'cola', 'soda', 'canette'] },
    { ref: 'BOI002', nom: 'Eau Minerale 50cl x24', nomCourt: 'Eau 50cl x24', categorie: 'Boissons', sousCategorie: 'Eaux', unite: 'pack', contenance: '24 x 50cl', prixVenteHT: 6.50, tags: ['eau', 'minerale', 'bouteille'] },
    // EMBALLAGES
    { ref: 'EMB001', nom: 'Boite Burger Carton x200', nomCourt: 'Boite Burger x200', categorie: 'Emballages', sousCategorie: 'Boites', unite: 'carton', contenance: '200 pieces', prixVenteHT: 24.90, tags: ['boite', 'burger', 'carton', 'emballage'] },
    { ref: 'EMB002', nom: 'Boite Burger XL Carton x100', nomCourt: 'Boite Burger XL x100', categorie: 'Emballages', sousCategorie: 'Boites', unite: 'carton', contenance: '100 pieces', prixVenteHT: 19.50, tags: ['boite', 'burger', 'xl', 'carton', 'double'] },
    { ref: 'EMB003', nom: 'Boite Kebab Alu x500', nomCourt: 'Boite Kebab x500', categorie: 'Emballages', sousCategorie: 'Boites', unite: 'carton', contenance: '500 pieces', prixVenteHT: 38.90, tags: ['boite', 'kebab', 'alu', 'aluminium', 'barquette'] },
    { ref: 'EMB004', nom: 'Boite Tacos Carton x200', nomCourt: 'Boite Tacos x200', categorie: 'Emballages', sousCategorie: 'Boites', unite: 'carton', contenance: '200 pieces', prixVenteHT: 27.50, tags: ['boite', 'tacos', 'carton', 'wrap'] },
    { ref: 'EMB010', nom: 'Papier Burger Ingraissable x1000', nomCourt: 'Papier Burger x1000', categorie: 'Emballages', sousCategorie: 'Papiers', unite: 'carton', contenance: '1000 pieces', prixVenteHT: 15.50, tags: ['papier', 'burger', 'ingraissable', 'wrap'] },
    { ref: 'EMB011', nom: 'Papier Alu Kebab 200m', nomCourt: 'Alu Kebab 200m', categorie: 'Emballages', sousCategorie: 'Papiers', unite: 'rouleau', contenance: '200m', prixVenteHT: 17.50, tags: ['papier', 'alu', 'aluminium', 'kebab', 'rouleau'] },
    { ref: 'EMB020', nom: 'Barquette Frites Carton x500', nomCourt: 'Barquette Frites x500', categorie: 'Emballages', sousCategorie: 'Barquettes', unite: 'carton', contenance: '500 pieces', prixVenteHT: 22.50, tags: ['barquette', 'frites', 'carton'] },
    { ref: 'EMB030', nom: 'Sac Kraft Petit x500', nomCourt: 'Sac Kraft S x500', categorie: 'Emballages', sousCategorie: 'Sacs', unite: 'carton', contenance: '500 pieces', prixVenteHT: 12.90, tags: ['sac', 'kraft', 'petit', 'emporter'] },
    { ref: 'EMB031', nom: 'Sac Kraft Moyen x300', nomCourt: 'Sac Kraft M x300', categorie: 'Emballages', sousCategorie: 'Sacs', unite: 'carton', contenance: '300 pieces', prixVenteHT: 14.90, tags: ['sac', 'kraft', 'moyen', 'menu'] },
    { ref: 'EMB050', nom: 'Serviettes Blanches x5000', nomCourt: 'Serviettes x5000', categorie: 'Emballages', sousCategorie: 'Divers', unite: 'carton', contenance: '5000 pieces', prixVenteHT: 19.50, tags: ['serviette', 'papier', 'blanc'] },
    { ref: 'EMB051', nom: 'Pot Sauce 30ml x1000', nomCourt: 'Pot Sauce x1000', categorie: 'Emballages', sousCategorie: 'Divers', unite: 'carton', contenance: '1000 pieces', prixVenteHT: 25.90, tags: ['pot', 'sauce', '30ml', 'couvercle'] },
];
// ═══════════════════════════════════════════════════════════════════════════
// MAPPING PRODUITS - QUANTITE = 1
// ═══════════════════════════════════════════════════════════════════════════
function mapToDistramProducts(plats, typeRestaurant) {
    const produitsRecommandes = [];
    const emballagesRecommandes = [];
    const produitsAjoutes = new Set();
    const emballagesAjoutes = new Set();
    // Collecter tous les ingredients
    const tousIngredients = [];
    plats.forEach(plat => {
        if (plat.ingredients) {
            tousIngredients.push(...plat.ingredients);
        }
        tousIngredients.push(plat.categorie);
    });
    // Fonction pour ajouter un produit avec QUANTITE = 1
    const ajouterProduit = (ref, raison, obligatoire = true) => {
        if (produitsAjoutes.has(ref))
            return;
        const produit = CATALOGUE_DISTRAM.find(p => p.ref === ref);
        if (!produit)
            return;
        produitsAjoutes.add(ref);
        produitsRecommandes.push({
            ref: produit.ref,
            nom: produit.nomCourt,
            categorie: produit.categorie,
            quantite: 1, // TOUJOURS 1
            unite: produit.unite,
            prixUnitaire: produit.prixVenteHT,
            totalHT: produit.prixVenteHT, // quantite = 1 donc total = prix unitaire
            raison,
            obligatoire,
            contenance: produit.contenance,
        });
    };
    // Fonction pour ajouter un emballage avec QUANTITE = 1
    const ajouterEmballage = (ref, raison, obligatoire = true) => {
        if (emballagesAjoutes.has(ref))
            return;
        const produit = CATALOGUE_DISTRAM.find(p => p.ref === ref);
        if (!produit)
            return;
        emballagesAjoutes.add(ref);
        emballagesRecommandes.push({
            ref: produit.ref,
            nom: produit.nomCourt,
            categorie: produit.categorie,
            quantite: 1, // TOUJOURS 1
            unite: produit.unite,
            prixUnitaire: produit.prixVenteHT,
            totalHT: produit.prixVenteHT,
            raison,
            obligatoire,
            contenance: produit.contenance,
        });
    };
    const ingredientsLower = tousIngredients.map(i => i.toLowerCase());
    const hasIngredient = (keywords) => ingredientsLower.some(ing => keywords.some(kw => ing.includes(kw)));
    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPING PAR INGREDIENTS
    // ═══════════════════════════════════════════════════════════════════════════
    // VIANDES
    if (hasIngredient(['kebab', 'broche', 'doner', 'doener'])) {
        ajouterProduit('VIA001', 'Broche kebab boeuf/veau - base kebab', true);
    }
    if (hasIngredient(['steak', 'burger', 'boeuf', 'hache'])) {
        ajouterProduit('VIA010', 'Steaks haches 100g - burgers classiques', true);
        if (hasIngredient(['double', 'xl', '150g', '200g'])) {
            ajouterProduit('VIA012', 'Steaks 150g XL - burgers doubles', true);
        }
    }
    if (hasIngredient(['poulet', 'chicken', 'crispy', 'grille'])) {
        ajouterProduit('VIA020', 'Filet de poulet nature', true);
    }
    if (hasIngredient(['emince', 'marine', 'fajita'])) {
        ajouterProduit('VIA021', 'Emince de poulet marine', true);
    }
    if (hasIngredient(['nugget'])) {
        ajouterProduit('VIA022', 'Nuggets de poulet', true);
    }
    if (hasIngredient(['tenders', 'crispy chicken'])) {
        ajouterProduit('VIA023', 'Tenders poulet crispy', true);
    }
    if (hasIngredient(['bacon'])) {
        ajouterProduit('VIA030', 'Bacon de dinde halal', true);
    }
    if (hasIngredient(['merguez'])) {
        ajouterProduit('VIA040', 'Merguez boeuf/mouton', true);
    }
    // PAINS
    if (typeRestaurant === 'kebab' || hasIngredient(['pita', 'grec'])) {
        ajouterProduit('PAI001', 'Pain pita 16cm - kebabs', true);
    }
    if (typeRestaurant === 'tacos' || hasIngredient(['tortilla', 'tacos', 'wrap'])) {
        ajouterProduit('PAI010', 'Tortillas 25cm - French Tacos', true);
    }
    if (typeRestaurant === 'burger' || hasIngredient(['burger', 'bun'])) {
        ajouterProduit('PAI020', 'Pain burger sesame classique', true);
        if (hasIngredient(['brioche', 'premium'])) {
            ajouterProduit('PAI021', 'Pain burger brioche premium', false);
        }
        if (hasIngredient(['xl', 'double', 'geant'])) {
            ajouterProduit('PAI022', 'Pain burger XL pour doubles', true);
        }
    }
    // FROMAGES
    if (hasIngredient(['cheddar'])) {
        ajouterProduit('FRO001', 'Cheddar tranches - burgers', true);
    }
    if (hasIngredient(['emmental', 'rape']) && !hasIngredient(['bleu', 'chevre'])) {
        ajouterProduit('FRO010', 'Emmental rape', true);
    }
    if (hasIngredient(['mozzarella'])) {
        ajouterProduit('FRO011', 'Mozzarella rapee', true);
    }
    if (hasIngredient(['bleu', 'roquefort', 'gorgonzola'])) {
        ajouterProduit('FRO020', 'Bleu emiette - burgers gourmet', true);
    }
    if (hasIngredient(['chevre'])) {
        ajouterProduit('FRO021', 'Chevre buche', true);
    }
    if (hasIngredient(['raclette', 'montagnard'])) {
        ajouterProduit('FRO022', 'Raclette tranches', true);
    }
    if (hasIngredient(['fromage', 'cheese']) && !hasIngredient(['cheddar', 'bleu', 'chevre', 'raclette'])) {
        ajouterProduit('FRO001', 'Cheddar (fromage standard)', true);
    }
    // SAUCES
    if (typeRestaurant === 'kebab' || hasIngredient(['blanche', 'yaourt'])) {
        ajouterProduit('SAU001', 'Sauce blanche kebab', true);
    }
    if (hasIngredient(['samourai', 'pimente'])) {
        ajouterProduit('SAU002', 'Sauce samourai', true);
    }
    if (hasIngredient(['algerienne'])) {
        ajouterProduit('SAU003', 'Sauce algerienne', true);
    }
    if (hasIngredient(['harissa'])) {
        ajouterProduit('SAU004', 'Sauce harissa', true);
    }
    if (typeRestaurant === 'tacos' || hasIngredient(['fromagere', 'cheese sauce'])) {
        ajouterProduit('SAU010', 'Sauce fromagere tacos', true);
    }
    if (hasIngredient(['poivre'])) {
        ajouterProduit('SAU011', 'Sauce poivre', true);
    }
    if (typeRestaurant === 'burger' || hasIngredient(['ketchup'])) {
        ajouterProduit('SAU020', 'Ketchup', true);
    }
    if (hasIngredient(['mayo', 'mayonnaise'])) {
        ajouterProduit('SAU021', 'Mayonnaise', true);
    }
    if (hasIngredient(['bbq', 'barbecue'])) {
        ajouterProduit('SAU023', 'Sauce BBQ', true);
    }
    if (typeRestaurant === 'burger') {
        ajouterProduit('SAU022', 'Sauce burger speciale', true);
    }
    // LEGUMES
    if (hasIngredient(['salade', 'laitue', 'iceberg'])) {
        ajouterProduit('LEG001', 'Salade iceberg', true);
    }
    if (hasIngredient(['tomate'])) {
        ajouterProduit('LEG002', 'Tomates fraiches', true);
    }
    if (hasIngredient(['oignon']) && !hasIngredient(['oignon frit', 'crispy'])) {
        ajouterProduit('LEG003', 'Oignons eminces', true);
    }
    if (hasIngredient(['oignon frit', 'crispy onion', 'oignons frits'])) {
        ajouterProduit('LEG004', 'Oignons frits crispy', true);
    }
    if (hasIngredient(['cornichon', 'pickle'])) {
        ajouterProduit('LEG010', 'Cornichons tranches', true);
    }
    if (hasIngredient(['jalapeno', 'piment vert'])) {
        ajouterProduit('LEG011', 'Jalapenos tranches', true);
    }
    // FRITES - quasi-obligatoires
    ajouterProduit('FRI001', 'Frites 9mm standard', true);
    if (hasIngredient(['potatoes', 'quartiers'])) {
        ajouterProduit('FRI010', 'Potatoes epices', true);
    }
    if (hasIngredient(['onion ring'])) {
        ajouterProduit('FRI011', 'Onion rings', true);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EMBALLAGES
    // ═══════════════════════════════════════════════════════════════════════════
    if (typeRestaurant === 'burger' || hasIngredient(['burger'])) {
        ajouterEmballage('EMB001', 'Boites burger carton', true);
        ajouterEmballage('EMB010', 'Papier burger ingraissable', true);
        if (hasIngredient(['double', 'xl'])) {
            ajouterEmballage('EMB002', 'Boites burger XL pour doubles', true);
        }
    }
    if (typeRestaurant === 'kebab' || hasIngredient(['kebab'])) {
        ajouterEmballage('EMB011', 'Papier alu kebab', true);
        ajouterEmballage('EMB003', 'Boites kebab alu (assiettes)', true);
    }
    if (typeRestaurant === 'tacos' || hasIngredient(['tacos'])) {
        ajouterEmballage('EMB004', 'Boites tacos carton', true);
    }
    // Communs a tous
    ajouterEmballage('EMB020', 'Barquettes frites', true);
    ajouterEmballage('EMB030', 'Sacs kraft petit', true);
    ajouterEmballage('EMB031', 'Sacs kraft moyen', true);
    ajouterEmballage('EMB050', 'Serviettes', true);
    ajouterEmballage('EMB051', 'Pots sauce individuels', true);
    return { produitsRecommandes, emballagesRecommandes };
}
// ═══════════════════════════════════════════════════════════════════════════
// CLOUD FUNCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════
exports.scanMenu = (0, https_1.onRequest)({
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 120,
}, async (request, response) => {
    var _a, _b, _c;
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const startTime = Date.now();
    try {
        const { image } = request.body;
        if (!image) {
            response.status(400).json({ error: 'Image manquante' });
            return;
        }
        const base64Image = image.includes('base64,') ? image.split('base64,')[1] : image;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            response.status(500).json({ error: 'Configuration OpenAI manquante' });
            return;
        }
        const openai = new openai_1.default({ apiKey });
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert en restauration rapide avec 20 ans d'experience chez un grossiste alimentaire.

MISSION : Analyser ce menu de restaurant et identifier PRECISEMENT :
1. Le type de restaurant (burger, kebab, tacos, pizza, mixte...)
2. CHAQUE plat visible avec ses ingredients
3. Les prix si visibles
4. Estimer les ventes hebdomadaires par plat

REGLES STRICTES :
- Lis TOUT le texte visible sur l'image (noms des plats, descriptions, ingredients)
- Ne devine JAMAIS - si tu ne vois pas clairement, indique confiance faible
- Analyse les PHOTOS des plats pour deduire les ingredients
- Si c'est un menu burger, ne parle PAS de kebab
- Sois precis sur les fromages speciaux (bleu, chevre, raclette...)
- Note les garnitures speciales (bacon, oignons frits, jalapenos...)

RETOURNE UNIQUEMENT ce JSON (pas de texte avant/apres) :
{
  "restaurant": {
    "type": "burger|kebab|tacos|pizza|mixte",
    "specialite": "description courte si visible"
  },
  "plats": [
    {
      "nom": "Nom exact lu sur le menu",
      "description": "Description/ingredients si visible",
      "categorie": "burger|kebab|tacos|pizza|sandwich|salade|autre",
      "ingredients": ["pain burger", "steak", "cheddar", "salade", "tomate", "oignon", "sauce burger"],
      "prix": 9.90,
      "ventesEstimees": 60,
      "confiance": 0.95
    }
  ],
  "notes": ["Ce restaurant semble specialise en burgers premium", "Plusieurs fromages speciaux detectes"]
}`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analyse ce menu en detail. Lis tous les textes, descriptions et identifie chaque plat avec ses ingredients. Retourne le JSON demande.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4000,
            temperature: 0.2,
        });
        const content = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
        let analysisData;
        try {
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysisData = JSON.parse(cleanContent);
        }
        catch (parseError) {
            console.error('Erreur parsing JSON:', parseError, content);
            response.status(500).json({ error: 'Reponse IA invalide' });
            return;
        }
        const { produitsRecommandes, emballagesRecommandes } = mapToDistramProducts(analysisData.plats || [], ((_c = analysisData.restaurant) === null || _c === void 0 ? void 0 : _c.type) || 'mixte');
        const totalProduitsHT = produitsRecommandes.reduce((sum, p) => sum + p.totalHT, 0);
        const totalEmballagesHT = emballagesRecommandes.reduce((sum, p) => sum + p.totalHT, 0);
        const totalHT = totalProduitsHT + totalEmballagesHT;
        const totalTTC = Math.round(totalHT * 1.2 * 100) / 100;
        const tempsAnalyse = (Date.now() - startTime) / 1000;
        response.json({
            success: true,
            tempsAnalyse,
            restaurant: analysisData.restaurant || { type: 'mixte' },
            platsDetectes: analysisData.plats || [],
            produitsRecommandes,
            emballagesRecommandes,
            totalProduitsHT: Math.round(totalProduitsHT * 100) / 100,
            totalEmballagesHT: Math.round(totalEmballagesHT * 100) / 100,
            totalHT: Math.round(totalHT * 100) / 100,
            totalTTC,
            margeEstimee: 68,
            notes: analysisData.notes || [],
        });
    }
    catch (error) {
        console.error('Erreur scan menu:', error);
        response.status(500).json({
            success: false,
            tempsAnalyse: (Date.now() - startTime) / 1000,
            error: error.message || 'Erreur serveur',
        });
    }
});
//# sourceMappingURL=index.js.map