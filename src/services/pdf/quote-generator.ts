// Service de génération de devis PDF
// Note: Ce service utilise @react-pdf/renderer côté client

export interface QuoteItem {
  ref: string;
  nom: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  prixTotal: number;
}

export interface QuoteData {
  numero: string;
  date: Date;
  validite: Date;
  client: {
    nom: string;
    adresse: string;
    telephone?: string;
    email?: string;
    siret?: string;
  };
  commercial: {
    nom: string;
    email: string;
    telephone: string;
  };
  items: QuoteItem[];
  remise?: number;
  commentaire?: string;
}

export interface QuoteCalculation {
  totalHT: number;
  remiseMontant: number;
  netHT: number;
  tva: number;
  totalTTC: number;
}

// Calculer les totaux d'un devis
export function calculateQuoteTotals(items: QuoteItem[], remisePercent: number = 0): QuoteCalculation {
  const totalHT = items.reduce((sum, item) => sum + item.prixTotal, 0);
  const remiseMontant = totalHT * (remisePercent / 100);
  const netHT = totalHT - remiseMontant;
  const tva = netHT * 0.20; // TVA 20%
  const totalTTC = netHT + tva;

  return {
    totalHT: Math.round(totalHT * 100) / 100,
    remiseMontant: Math.round(remiseMontant * 100) / 100,
    netHT: Math.round(netHT * 100) / 100,
    tva: Math.round(tva * 100) / 100,
    totalTTC: Math.round(totalTTC * 100) / 100,
  };
}

// Générer un numéro de devis unique
export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEV-${year}${month}${day}-${random}`;
}

// Formater une date pour l'affichage
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

// Formater un montant pour l'affichage
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Template HTML pour impression/export
export function generateQuoteHTML(quote: QuoteData): string {
  const totals = calculateQuoteTotals(quote.items, quote.remise);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${quote.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #ea580c; }
    .logo span { color: #666; font-weight: normal; }
    .quote-info { text-align: right; }
    .quote-number { font-size: 18px; font-weight: bold; color: #ea580c; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .address-box { width: 45%; }
    .address-box h3 { color: #ea580c; margin-bottom: 10px; font-size: 14px; }
    .address-box p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #ea580c; color: white; padding: 12px 8px; text-align: left; }
    td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals tr td { padding: 8px; }
    .totals .total-row { font-weight: bold; font-size: 14px; background: #ea580c; color: white; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
    .conditions { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
    .conditions h4 { margin-bottom: 10px; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      DISTRAM <span>× DISTRAM</span>
    </div>
    <div class="quote-info">
      <div class="quote-number">DEVIS ${quote.numero}</div>
      <p>Date: ${formatDate(quote.date)}</p>
      <p>Validité: ${formatDate(quote.validite)}</p>
    </div>
  </div>

  <div class="addresses">
    <div class="address-box">
      <h3>ÉMETTEUR</h3>
      <p><strong>DISTRAM</strong></p>
      <p>Zone Industrielle</p>
      <p>69000 Lyon</p>
      <p>Commercial: ${quote.commercial.nom}</p>
      <p>Email: ${quote.commercial.email}</p>
      <p>Tél: ${quote.commercial.telephone}</p>
    </div>
    <div class="address-box">
      <h3>CLIENT</h3>
      <p><strong>${quote.client.nom}</strong></p>
      <p>${quote.client.adresse}</p>
      ${quote.client.telephone ? `<p>Tél: ${quote.client.telephone}</p>` : ''}
      ${quote.client.email ? `<p>Email: ${quote.client.email}</p>` : ''}
      ${quote.client.siret ? `<p>SIRET: ${quote.client.siret}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 80px">Réf.</th>
        <th>Désignation</th>
        <th style="width: 80px" class="text-right">Qté</th>
        <th style="width: 60px">Unité</th>
        <th style="width: 100px" class="text-right">P.U. HT</th>
        <th style="width: 100px" class="text-right">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map(item => `
        <tr>
          <td>${item.ref}</td>
          <td>${item.nom}</td>
          <td class="text-right">${item.quantite}</td>
          <td>${item.unite}</td>
          <td class="text-right">${formatCurrency(item.prixUnitaire)}</td>
          <td class="text-right">${formatCurrency(item.prixTotal)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Total HT</td>
      <td class="text-right">${formatCurrency(totals.totalHT)}</td>
    </tr>
    ${quote.remise && quote.remise > 0 ? `
    <tr>
      <td>Remise (${quote.remise}%)</td>
      <td class="text-right">-${formatCurrency(totals.remiseMontant)}</td>
    </tr>
    <tr>
      <td>Net HT</td>
      <td class="text-right">${formatCurrency(totals.netHT)}</td>
    </tr>
    ` : ''}
    <tr>
      <td>TVA (20%)</td>
      <td class="text-right">${formatCurrency(totals.tva)}</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL TTC</td>
      <td class="text-right">${formatCurrency(totals.totalTTC)}</td>
    </tr>
  </table>

  ${quote.commentaire ? `
  <div class="conditions">
    <h4>Commentaires</h4>
    <p>${quote.commentaire}</p>
  </div>
  ` : ''}

  <div class="conditions">
    <h4>Conditions</h4>
    <p>• Livraison gratuite à partir de 200€ HT</p>
    <p>• Paiement à 30 jours fin de mois</p>
    <p>• Devis valable 15 jours</p>
    <p>• Tous nos produits sont certifiés Halal</p>
  </div>

  <div class="footer">
    <p>DISTRAM - Grossiste alimentaire halal | Lyon - Montpellier - Bordeaux</p>
    <p>SIRET: XXX XXX XXX XXXXX | TVA: FR XX XXX XXX XXX</p>
    <p>Devis généré automatiquement par DISTRAM</p>
  </div>
</body>
</html>
  `;
}

// Créer les données de base pour un nouveau devis
export function createEmptyQuote(_clientId?: string): QuoteData {
  const now = new Date();
  const validite = new Date(now);
  validite.setDate(validite.getDate() + 15); // Validité 15 jours

  return {
    numero: generateQuoteNumber(),
    date: now,
    validite,
    client: {
      nom: '',
      adresse: '',
    },
    commercial: {
      nom: 'Commercial DISTRAM',
      email: 'contact@distram.fr',
      telephone: '04 XX XX XX XX',
    },
    items: [],
    remise: 0,
    commentaire: '',
  };
}
