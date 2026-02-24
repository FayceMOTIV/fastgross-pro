/**
 * Postal Template Generator
 *
 * Generation de contenu HTML pour courrier:
 * - Templates personnalisables
 * - Variables dynamiques
 * - Format impression (8.5x11, A4)
 * - QR codes integres
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// DIMENSIONS STANDARD
// ============================================
const PAGE_SIZES = {
  LETTER: { width: '8.5in', height: '11in', margins: '0.5in' },
  A4: { width: '210mm', height: '297mm', margins: '15mm' },
  POSTCARD_4X6: { width: '6in', height: '4in', margins: '0.25in' },
  POSTCARD_6X9: { width: '9in', height: '6in', margins: '0.25in' }
};

// ============================================
// TEMPLATES PAR DEFAUT
// ============================================
export const DEFAULT_POSTAL_TEMPLATES = {
  introduction_letter: {
    id: 'introduction_letter',
    name: 'Lettre Introduction',
    type: 'letter',
    category: 'intro',
    pageSize: 'LETTER',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Georgia', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0.5in;
    }
    .header {
      text-align: right;
      margin-bottom: 40px;
    }
    .header .company {
      font-weight: bold;
      font-size: 14pt;
    }
    .date {
      margin-bottom: 30px;
    }
    .recipient {
      margin-bottom: 30px;
    }
    .subject {
      font-weight: bold;
      margin-bottom: 20px;
    }
    .body {
      text-align: justify;
    }
    .body p {
      margin-bottom: 15px;
    }
    .signature {
      margin-top: 40px;
    }
    .qr-section {
      margin-top: 30px;
      text-align: center;
    }
    .qr-section img {
      width: 80px;
      height: 80px;
    }
    .qr-section p {
      font-size: 9pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">{entreprise_source}</div>
    <div>{adresse_source}</div>
    <div>{ville_source}</div>
  </div>

  <div class="date">{ville_source}, le {date}</div>

  <div class="recipient">
    <strong>{civilite} {prenom} {nom}</strong><br>
    {entreprise}<br>
    {adresse}<br>
    {code_postal} {ville}
  </div>

  <div class="subject">Objet : {objet}</div>

  <div class="body">
    <p>{civilite} {nom},</p>

    <p>{paragraphe_1}</p>

    <p>{paragraphe_2}</p>

    <p>{paragraphe_3}</p>

    <p>Je reste a votre disposition pour en discuter lors d'un echange telephonique ou d'une visioconference a votre convenance.</p>

    <p>Je vous prie d'agreer, {civilite} {nom}, l'expression de mes salutations distinguees.</p>
  </div>

  <div class="signature">
    <strong>{commercial}</strong><br>
    {poste_commercial}<br>
    {email_commercial}<br>
    {telephone_commercial}
  </div>

  <div class="qr-section">
    <img src="{qr_code_url}" alt="QR Code" />
    <p>Scannez pour prendre rendez-vous</p>
  </div>
</body>
</html>
`,
    variables: ['entreprise_source', 'adresse_source', 'ville_source', 'date', 'civilite',
                'prenom', 'nom', 'entreprise', 'adresse', 'code_postal', 'ville', 'objet',
                'paragraphe_1', 'paragraphe_2', 'paragraphe_3', 'commercial', 'poste_commercial',
                'email_commercial', 'telephone_commercial', 'qr_code_url']
  },

  follow_up_letter: {
    id: 'follow_up_letter',
    name: 'Lettre Relance',
    type: 'letter',
    category: 'follow_up',
    pageSize: 'LETTER',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Georgia', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0.5in;
    }
    .highlight-box {
      background: #f5f5f5;
      border-left: 4px solid #4F6EF7;
      padding: 15px;
      margin: 20px 0;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #4F6EF7;
      color: white;
    }
    .cta a {
      color: white;
      font-size: 14pt;
    }
  </style>
</head>
<body>
  <div style="text-align: right; margin-bottom: 30px;">
    {date}
  </div>

  <p>{civilite} {nom},</p>

  <p>Je me permets de revenir vers vous suite a mon precedent courrier/email concernant {sujet}.</p>

  <div class="highlight-box">
    <strong>Rappel de notre proposition :</strong><br>
    {proposition_valeur}
  </div>

  <p>{paragraphe_relance}</p>

  <div class="cta">
    Prenez rendez-vous : {purl}
  </div>

  <p>Cordialement,</p>
  <p><strong>{commercial}</strong><br>{entreprise_source}</p>
</body>
</html>
`,
    variables: ['date', 'civilite', 'nom', 'sujet', 'proposition_valeur',
                'paragraphe_relance', 'purl', 'commercial', 'entreprise_source']
  },

  postcard_promo: {
    id: 'postcard_promo',
    name: 'Carte Postale Promo',
    type: 'postcard',
    category: 'promo',
    pageSize: 'POSTCARD_4X6',
    frontHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 6in;
      height: 4in;
      background: linear-gradient(135deg, #4F6EF7 0%, #7C3AED 100%);
      color: white;
      font-family: 'Arial', sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .headline {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .subheadline {
      font-size: 14pt;
      margin-bottom: 20px;
    }
    .offer {
      font-size: 32pt;
      font-weight: bold;
      background: white;
      color: #4F6EF7;
      padding: 10px 30px;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="headline">{headline}</div>
  <div class="subheadline">{subheadline}</div>
  <div class="offer">{offre}</div>
</body>
</html>
`,
    backHtml: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0.25in;
      width: 6in;
      height: 4in;
      font-family: 'Arial', sans-serif;
      box-sizing: border-box;
      display: flex;
    }
    .left {
      width: 50%;
      padding-right: 15px;
      border-right: 1px solid #ddd;
    }
    .right {
      width: 50%;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .message {
      font-size: 10pt;
      line-height: 1.4;
    }
    .qr {
      text-align: center;
    }
    .qr img {
      width: 60px;
      height: 60px;
    }
    .qr p {
      font-size: 8pt;
      color: #666;
      margin: 5px 0 0 0;
    }
    .address {
      font-size: 10pt;
    }
    .stamp-area {
      width: 80px;
      height: 60px;
      border: 1px dashed #ccc;
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="left">
    <div class="message">
      <p>{message}</p>
      <p style="margin-top: 15px;"><strong>{commercial}</strong><br>{entreprise_source}</p>
    </div>
    <div class="qr">
      <img src="{qr_code_url}" />
      <p>Scannez-moi !</p>
    </div>
  </div>
  <div class="right">
    <div class="stamp-area">Affranchissement</div>
    <div class="address">
      <strong>{prenom} {nom}</strong><br>
      {entreprise}<br>
      {adresse}<br>
      {code_postal} {ville}
    </div>
  </div>
</body>
</html>
`,
    variables: ['headline', 'subheadline', 'offre', 'message', 'commercial',
                'entreprise_source', 'qr_code_url', 'prenom', 'nom', 'entreprise',
                'adresse', 'code_postal', 'ville']
  },

  event_invitation: {
    id: 'event_invitation',
    name: 'Invitation Evenement',
    type: 'letter',
    category: 'event',
    pageSize: 'LETTER',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Helvetica', sans-serif;
      margin: 0;
      padding: 0.5in;
    }
    .banner {
      background: #4F6EF7;
      color: white;
      padding: 30px;
      text-align: center;
      margin: -0.5in -0.5in 30px -0.5in;
    }
    .banner h1 {
      margin: 0;
      font-size: 28pt;
    }
    .event-details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .event-details h3 {
      color: #4F6EF7;
      margin-top: 0;
    }
    .detail-row {
      display: flex;
      margin: 10px 0;
    }
    .detail-label {
      font-weight: bold;
      width: 100px;
    }
    .rsvp-box {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      border: 2px solid #4F6EF7;
      border-radius: 8px;
    }
    .rsvp-box h3 {
      color: #4F6EF7;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="banner">
    <h1>{nom_evenement}</h1>
    <p>{slogan_evenement}</p>
  </div>

  <p>{civilite} {nom},</p>

  <p>{introduction}</p>

  <div class="event-details">
    <h3>Details de l'evenement</h3>
    <div class="detail-row">
      <span class="detail-label">Date :</span>
      <span>{date_evenement}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Heure :</span>
      <span>{heure_evenement}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Lieu :</span>
      <span>{lieu_evenement}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Adresse :</span>
      <span>{adresse_evenement}</span>
    </div>
  </div>

  <p>{description_evenement}</p>

  <div class="rsvp-box">
    <h3>Confirmez votre presence</h3>
    <p>Scannez le QR code ou visitez :</p>
    <img src="{qr_code_url}" style="width: 100px; height: 100px;" />
    <p><strong>{purl}</strong></p>
  </div>

  <p>Au plaisir de vous y retrouver,</p>
  <p><strong>{commercial}</strong><br>{entreprise_source}</p>
</body>
</html>
`,
    variables: ['nom_evenement', 'slogan_evenement', 'civilite', 'nom', 'introduction',
                'date_evenement', 'heure_evenement', 'lieu_evenement', 'adresse_evenement',
                'description_evenement', 'qr_code_url', 'purl', 'commercial', 'entreprise_source']
  }
};

// ============================================
// GENERER HTML POSTAL
// ============================================
export async function generatePostalHTML(orgId, templateId, data = {}) {
  try {
    // 1. Recuperer le template
    let template;

    // Chercher dans les templates custom
    const customRef = getDb().collection('organizations').doc(orgId)
      .collection('postalTemplates').doc(templateId);
    const customSnap = await customRef.get();

    if (customSnap.exists) {
      template = customSnap.data();
    } else if (DEFAULT_POSTAL_TEMPLATES[templateId]) {
      template = DEFAULT_POSTAL_TEMPLATES[templateId];
    } else {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 2. Recuperer infos organisation
    const orgRef = getDb().collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    const org = orgSnap.exists ? orgSnap.data() : {};

    // 3. Construire les variables
    const prospect = data.prospect || {};
    const variables = {
      // Prospect
      civilite: prospect.gender === 'female' ? 'Madame' : 'Monsieur',
      prenom: prospect.firstName || '',
      nom: prospect.lastName || '',
      entreprise: prospect.company || '',
      adresse: prospect.address?.line1 || '',
      code_postal: prospect.address?.postalCode || '',
      ville: prospect.address?.city || '',

      // Organisation
      entreprise_source: org.name || 'Face Media Factory',
      adresse_source: org.address?.line1 || '',
      ville_source: `${org.address?.postalCode || ''} ${org.address?.city || ''}`.trim(),
      commercial: org.commercialName || '',
      poste_commercial: org.commercialTitle || '',
      email_commercial: org.commercialEmail || '',
      telephone_commercial: org.phoneNumber || '',

      // Date
      date: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),

      // Tracking
      qr_code_url: data.qrCode || '',
      purl: data.purl || '',
      tracking_code: data.trackingCode?.code || '',

      // Custom
      ...data.customVariables
    };

    // 4. Remplacer les variables
    let html;
    if (data.side === 'front' && template.frontHtml) {
      html = template.frontHtml;
    } else if (data.side === 'back' && template.backHtml) {
      html = template.backHtml;
    } else {
      html = template.html;
    }

    for (const [key, value] of Object.entries(variables)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{${escapedKey}\\}`, 'gi');
      html = html.replace(regex, value || '');
    }

    // 5. Nettoyer les variables non remplacees
    html = html.replace(/\{[a-z_]+\}/gi, '');

    return html;

  } catch (error) {
    console.error('generatePostalHTML error:', error);
    throw error;
  }
}

// ============================================
// CREER TEMPLATE PERSONNALISE
// ============================================
export async function createPostalTemplate(orgId, templateData) {
  try {
    const { name, type, category, html, frontHtml, backHtml, pageSize } = templateData;

    // Valider
    if (!name || !type) {
      return { success: false, error: 'Name and type required' };
    }

    if (type === 'letter' && !html) {
      return { success: false, error: 'HTML content required for letter' };
    }

    if (type === 'postcard' && (!frontHtml || !backHtml)) {
      return { success: false, error: 'Front and back HTML required for postcard' };
    }

    // Extraire variables
    const content = html || `${frontHtml || ''} ${backHtml || ''}`;
    const variables = (content.match(/\{(\w+)\}/g) || [])
      .map(v => v.replace(/[{}]/g, ''))
      .filter((v, i, arr) => arr.indexOf(v) === i);

    const ref = await getDb().collection('organizations').doc(orgId)
      .collection('postalTemplates').add({
        name,
        type,
        category: category || 'custom',
        pageSize: pageSize || (type === 'letter' ? 'LETTER' : 'POSTCARD_4X6'),
        html,
        frontHtml,
        backHtml,
        variables,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

    return {
      success: true,
      templateId: ref.id
    };

  } catch (error) {
    console.error('createPostalTemplate error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LISTER TEMPLATES
// ============================================
export async function listPostalTemplates(orgId, type = null) {
  try {
    let query = getDb().collection('organizations').doc(orgId)
      .collection('postalTemplates');

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    const customTemplates = snapshot.docs.map(doc => ({
      id: doc.id,
      isCustom: true,
      ...doc.data()
    }));

    // Ajouter templates par defaut
    const defaultTemplates = Object.values(DEFAULT_POSTAL_TEMPLATES)
      .filter(t => !type || t.type === type)
      .map(t => ({ ...t, isCustom: false }));

    return [...customTemplates, ...defaultTemplates];

  } catch (error) {
    console.error('listPostalTemplates error:', error);
    return Object.values(DEFAULT_POSTAL_TEMPLATES);
  }
}

// ============================================
// PREVISUALISER TEMPLATE
// ============================================
export async function previewTemplate(orgId, templateId, sampleData = {}) {
  try {
    // Donnees exemple
    const defaultSample = {
      prospect: {
        firstName: 'Jean',
        lastName: 'Dupont',
        company: 'Entreprise Example',
        gender: 'male',
        address: {
          line1: '123 Rue de la Paix',
          postalCode: '75001',
          city: 'Paris'
        }
      },
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=preview',
      purl: 'https://example.com/rdv/preview',
      customVariables: {
        objet: 'Proposition de partenariat',
        paragraphe_1: 'Je me permets de vous contacter car votre entreprise correspond parfaitement a notre cible.',
        paragraphe_2: 'Nous proposons des solutions innovantes qui ont permis a nos clients d\'augmenter leur chiffre d\'affaires de 30% en moyenne.',
        paragraphe_3: 'Je serais ravi de vous presenter notre approche lors d\'un court entretien telephonique.'
      }
    };

    const data = { ...defaultSample, ...sampleData };
    const html = await generatePostalHTML(orgId, templateId, data);

    return {
      success: true,
      html,
      pageSize: PAGE_SIZES[DEFAULT_POSTAL_TEMPLATES[templateId]?.pageSize || 'LETTER']
    };

  } catch (error) {
    console.error('previewTemplate error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SUPPRIMER TEMPLATE
// ============================================
export async function deletePostalTemplate(orgId, templateId) {
  try {
    // Ne pas supprimer les templates par defaut
    if (DEFAULT_POSTAL_TEMPLATES[templateId]) {
      return { success: false, error: 'Cannot delete default template' };
    }

    await getDb().collection('organizations').doc(orgId)
      .collection('postalTemplates').doc(templateId)
      .delete();

    return { success: true };

  } catch (error) {
    console.error('deletePostalTemplate error:', error);
    return { success: false, error: error.message };
  }
}

export { PAGE_SIZES };
