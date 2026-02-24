/**
 * FIRST RUN - Execute the full autopilot pipeline against production Firestore
 * This is a dry run - no emails will be sent
 */

// Load env manually
const fs = require('fs');
const envPath = require('path').join(__dirname, '..', 'functions', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
});

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: 'face-media-factory' });
const db = getFirestore();

const ORG_ID = 'IGtZSfpd8eyoIzn6W0ba';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== FIRST RUN - DRY RUN ===\n');

  // 1. Verify config
  const configDoc = await db.collection('organizations').doc(ORG_ID)
    .collection('autopilotConfig').doc('settings').get();
  const config = configDoc.data();
  console.log('Config:', JSON.stringify(config, null, 2));

  // 2. Test Serper search
  const apiKey = process.env.SERPER_API_KEY;
  console.log('\nSERPER_API_KEY:', apiKey ? 'configured (' + apiKey.substring(0, 8) + '...)' : 'MISSING');

  if (!apiKey) {
    console.error('SERPER_API_KEY is required');
    process.exit(1);
  }

  const keywords = config.keywords || [];
  const location = config.location || 'France';
  const allResults = [];

  console.log('\n=== PHASE 1: SEARCH (Serper.dev) ===');

  for (const keyword of keywords.slice(0, 3)) {
    const query = `${keyword} ${location} contact`;
    console.log(`\nSearching: "${query}"`);

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 10 })
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('ERROR:', data.message || response.statusText);
        continue;
      }

      const items = data.organic || [];
      console.log('Results:', items.length);

      for (const item of items) {
        try {
          const url = new URL(item.link);
          const domain = url.hostname.replace(/^www\./, '');

          // Skip social media and directories
          if (/facebook\.com|instagram\.com|linkedin\.com|twitter\.com|yelp|tripadvisor|pagesjaunes/.test(domain)) {
            continue;
          }

          // Check duplicate in results
          if (allResults.some(r => r.domain === domain)) continue;

          // Check duplicate in Firestore
          const existing = await db.collection('organizations').doc(ORG_ID)
            .collection('prospects').where('domain', '==', domain).limit(1).get();
          if (!existing.empty) {
            console.log('  SKIP (duplicate):', domain);
            continue;
          }

          allResults.push({
            name: item.title ? item.title.replace(/\s*[-|].*/g, '').substring(0, 100) : domain,
            url: item.link,
            domain,
            snippet: item.snippet || '',
            source: 'serper',
            status: 'found',
            foundAt: FieldValue.serverTimestamp()
          });
          console.log('  FOUND:', domain, '-', (item.title || '').substring(0, 60));
        } catch (e) {
          // skip invalid URLs
        }
      }

      await sleep(500);
    } catch (error) {
      console.error('Search error:', error.message);
    }
  }

  console.log('\n>>> TOTAL FOUND:', allResults.length);

  // 3. Save to Firestore
  if (allResults.length > 0) {
    const batch = db.batch();
    for (const prospect of allResults) {
      const ref = db.collection('organizations').doc(ORG_ID).collection('prospects').doc();
      batch.set(ref, {
        ...prospect,
        emails: [],
        contactName: '',
        phone: '',
        score: 0,
        scoreDetails: {},
        generatedEmail: { subject: '', body: '' },
        sentVia: null,
        orgId: ORG_ID,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
    console.log('Saved', allResults.length, 'prospects to Firestore');
  }

  // 4. Scrape emails
  console.log('\n=== PHASE 2: SCRAPING EMAILS ===');
  const toScrape = await db.collection('organizations').doc(ORG_ID)
    .collection('prospects').where('status', '==', 'found').limit(30).get();

  console.log('Prospects to scrape:', toScrape.size);

  let scrapedCount = 0;
  for (const doc of toScrape.docs) {
    const prospect = doc.data();
    console.log('\nScraping:', prospect.domain);

    try {
      const emails = new Set();
      let contactName = '';
      let phone = '';
      const baseUrl = new URL(prospect.url).origin;
      const pages = [prospect.url, baseUrl + '/contact', baseUrl + '/contactez-nous', baseUrl + '/a-propos'];

      for (const pageUrl of pages) {
        try {
          const resp = await fetch(pageUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)' }
          });
          if (!resp.ok) continue;
          const html = await resp.text();

          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const found = html.match(emailRegex) || [];
          const junkPatterns = ['noreply', 'no-reply', 'unsubscribe', 'example.com', 'wix', 'wordpress', '.png', '.jpg', 'sentry', 'webpack', 'cloudflare'];
          found.forEach(e => {
            const lower = e.toLowerCase();
            if (!junkPatterns.some(p => lower.includes(p)) && lower.length < 50) {
              emails.add(lower);
            }
          });

          // Extract phone
          if (!phone) {
            const phoneMatch = html.match(/(?:(?:\+33|0033|0)\s*[1-9])(?:[\s.-]*\d{2}){4}/);
            if (phoneMatch) phone = phoneMatch[0].replace(/[\s.-]/g, '');
          }

          // Extract contact name
          if (!contactName) {
            const nameMatch = html.match(/(?:fondateur|gerant|directeur)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
            if (nameMatch) contactName = nameMatch[1];
          }
        } catch (e) {
          continue;
        }
      }

      const emailList = [...emails];
      console.log('  Emails:', emailList.length > 0 ? emailList.join(', ') : 'none');
      if (phone) console.log('  Phone:', phone);
      if (contactName) console.log('  Contact:', contactName);

      await doc.ref.update({
        emails: emailList,
        contactName,
        phone,
        status: emailList.length > 0 ? 'scraped' : 'no_email',
        scrapedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      if (emailList.length > 0) scrapedCount++;
      await sleep(2000);
    } catch (e) {
      console.log('  Error:', e.message);
    }
  }

  console.log('\n>>> Scraped with emails:', scrapedCount);

  // 5. Score prospects
  console.log('\n=== PHASE 3: SCORING ===');
  const toScore = await db.collection('organizations').doc(ORG_ID)
    .collection('prospects').where('status', '==', 'scraped').limit(50).get();

  console.log('Prospects to score:', toScore.size);
  let scoredCount = 0;

  for (const doc of toScore.docs) {
    const prospect = doc.data();
    let score = 0;
    const details = {};

    // Has website
    if (prospect.url) { score += 10; details.hasWebsite = true; }

    // Has email
    if (prospect.emails && prospect.emails.length > 0) {
      const hasPersonal = prospect.emails.some(e => {
        const prefix = e.split('@')[0];
        return !['contact', 'info', 'hello', 'admin'].includes(prefix);
      });
      score += hasPersonal ? 30 : 20;
      details.emailType = hasPersonal ? 'personal' : 'generic';
    } else {
      await doc.ref.update({ score: 0, scoreDetails: details, status: 'no_email', updatedAt: FieldValue.serverTimestamp() });
      continue;
    }

    // Try to analyze website for scoring
    try {
      const resp = await fetch(prospect.url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await resp.text();

      // No video
      if (!/<video|youtube\.com\/embed|vimeo\.com/i.test(html)) {
        score += 25;
        details.hasVideo = false;
      }

      // Old site
      if (/dreamweaver|frontpage|<table.*bgcolor|<font/i.test(html)) {
        score += 15;
        details.siteModernity = 'old';
      }

      // No YouTube
      if (!/youtube\.com\/(channel|c|@)/i.test(html)) {
        score += 10;
        details.hasYouTube = false;
      }

      // Has Instagram
      if (/instagram\.com\//i.test(html)) {
        score += 5;
        details.hasInstagram = true;
      }
    } catch (e) {
      // Can't analyze - add base score for no video
      score += 25;
      details.hasVideo = false;
    }

    // Contact name
    if (prospect.contactName) { score += 5; details.hasContactName = true; }

    // Score text for email
    const issues = [];
    if (details.hasVideo === false) issues.push('pas de video sur votre site');
    if (details.hasYouTube === false) issues.push('pas de chaine YouTube');
    if (details.siteModernity === 'old') issues.push('un site qui meriterait une modernisation');
    details.scoreVideoText = issues.length > 0 ? issues.join(' et ') : 'peu de contenu video engageant';

    score = Math.min(score, 100);

    await doc.ref.update({
      score,
      scoreDetails: details,
      status: 'scored',
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('  Scored:', prospect.domain, '->', score, 'pts', '(' + details.emailType + ')');
    scoredCount++;
  }

  console.log('\n>>> Scored:', scoredCount);

  // 6. Generate emails (DRY RUN - no sending)
  console.log('\n=== PHASE 4: GENERATE EMAILS (DRY RUN) ===');
  const topProspects = await db.collection('organizations').doc(ORG_ID)
    .collection('prospects').where('status', '==', 'scored')
    .orderBy('score', 'desc').limit(10).get();

  console.log('Top prospects:', topProspects.size);
  let readyCount = 0;
  const generatedEmails = [];

  for (const doc of topProspects.docs) {
    const prospect = doc.data();
    if (!prospect.emails || prospect.emails.length === 0) continue;

    // Extract first name
    let prenom = '';
    if (prospect.contactName) {
      prenom = prospect.contactName.split(' ')[0];
    } else if (prospect.emails[0]) {
      const prefix = prospect.emails[0].split('@')[0];
      if (prefix.includes('.')) prenom = prefix.split('.')[0];
    }
    prenom = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1) : '';

    const entreprise = prospect.name || (prospect.domain ? prospect.domain.replace(/\.[a-z]+$/i, '').replace(/-/g, ' ') : 'votre entreprise');

    const subject = `${entreprise} -- une idee pour booster votre visibilite`;
    const body = `Bonjour ${prenom || 'Bonjour'},

Je m'appelle Faical Kriouar et je realise des videos courtes pour les professionnels du secteur ${config.sector} a ${config.location}.

En visitant votre site, j'ai remarque que vous n'aviez ${prospect.scoreDetails?.scoreVideoText || 'peu de contenu video'}. La video est aujourd'hui le format le plus engageant : +80% de visibilite en ligne en moyenne.

Je pourrais realiser pour ${entreprise} :
- Une video de presentation courte (30-60s)
- Des stories/reels pour vos reseaux sociaux
- Un temoignage client filme

Seriez-vous disponible pour un appel de 15 minutes ?

Bonne journee,
Faical Kriouar`;

    const email = { to: prospect.emails[0], subject, body };

    await doc.ref.update({
      generatedEmail: email,
      status: 'ready',
      updatedAt: FieldValue.serverTimestamp()
    });

    generatedEmails.push({
      domain: prospect.domain,
      name: prospect.name,
      score: prospect.score,
      email: email.to,
      subject: email.subject,
      bodyPreview: body.substring(0, 150) + '...'
    });

    console.log(`\n  [${prospect.domain}] Score: ${prospect.score}`);
    console.log(`  To: ${email.to}`);
    console.log(`  Subject: ${email.subject}`);
    readyCount++;
  }

  // 7. Log stats
  const stats = {
    found: allResults.length,
    scraped: scrapedCount,
    scored: scoredCount,
    ready: readyCount,
    sent: 0,
    errors: [],
    runAt: FieldValue.serverTimestamp(),
    dryRun: true
  };

  await db.collection('organizations').doc(ORG_ID).collection('autopilotLogs').add(stats);

  console.log('\n========================================');
  console.log('         FIRST RUN COMPLETE');
  console.log('========================================');
  console.log('Found:                ', allResults.length);
  console.log('Scraped (with email): ', scrapedCount);
  console.log('Scored:               ', scoredCount);
  console.log('Ready (email gen):    ', readyCount);
  console.log('Sent:                 ', 0, '(dry run)');
  console.log('========================================');

  // Output JSON for report
  const report = {
    runAt: new Date().toISOString(),
    orgId: ORG_ID,
    config,
    stats: { found: allResults.length, scraped: scrapedCount, scored: scoredCount, ready: readyCount, sent: 0 },
    prospects: allResults.map(p => ({ name: p.name, domain: p.domain, url: p.url })),
    generatedEmails
  };

  require('fs').writeFileSync(
    require('path').join(__dirname, '..', 'first-run-results.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\nResults saved to first-run-results.json');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
