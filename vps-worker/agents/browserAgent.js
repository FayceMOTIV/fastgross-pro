/**
 * Browser Agent — Actions Instagram non disponibles via API officielle
 * Inspiré de l'architecture Manus (system-prompts-and-models-of-ai-tools)
 *
 * Prérequis : npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

// ─── USER AGENTS MOBILES RÉELS ────────────────────────────────────────────────
const MOBILE_UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram/312.0.0.0',
];

function randomUA() {
  return MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)];
}

// Délai humain : pause aléatoire entre min et max ms
async function humanDelay(min = 1000, max = 4000) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  await new Promise(r => setTimeout(r, ms));
}

// Typing humain : tape lettre par lettre avec délai variable
async function humanType(page, selector, text) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char);
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 100) + 50)); // 50-150ms/char
  }
}

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

async function saveSession(accountId, cookies) {
  await redis.setex(`ig_session:${accountId}`, 7 * 24 * 3600, JSON.stringify(cookies));
}

async function loadSession(accountId) {
  const data = await redis.get(`ig_session:${accountId}`);
  return data ? JSON.parse(data) : null;
}

async function getPage(accountId) {
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: randomUA(),
    viewport: { width: 390, height: 844 }, // iPhone 15 Pro
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });

  // Restaurer la session si elle existe
  const savedCookies = await loadSession(accountId);
  if (savedCookies) {
    await context.addCookies(savedCookies);
  }

  const page = await context.newPage();

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  });

  return { browser, context, page };
}

// ─── ACTIONS INSTAGRAM ────────────────────────────────────────────────────────

const BrowserAgent = {
  /**
   * Follow un compte Instagram
   */
  async followUser(username, accountId) {
    const { browser, page } = await getPage(accountId);

    try {
      await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });
      await humanDelay(2000, 5000);

      // Chercher le bouton "Suivre"
      const followBtn = await page.$('[data-testid="follow-button"], button:has-text("Suivre")');
      if (!followBtn) throw new Error('Bouton Suivre non trouvé — déjà suivi ou compte privé');

      await humanDelay(500, 1500);
      await followBtn.click();
      await humanDelay(1000, 3000);

      // Sauvegarder session
      const cookies = await page.context().cookies();
      await saveSession(accountId, cookies);

      return { success: true, username };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  },

  /**
   * Like les N derniers posts d'un compte
   */
  async likeRecentPosts(username, accountId, count = 3) {
    const { browser, page } = await getPage(accountId);

    try {
      await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });
      await humanDelay(2000, 4000);

      // Obtenir les liens des posts
      const postLinks = await page.$$eval('a[href*="/p/"]', links =>
        links.slice(0, 6).map(l => l.href)
      );

      const liked = [];
      for (const link of postLinks.slice(0, count)) {
        await page.goto(link, { waitUntil: 'networkidle' });
        await humanDelay(2000, 5000);

        // Trouver et cliquer le bouton like
        const likeBtn = await page.$('[aria-label="J\'aime"], [aria-label="Like"]');
        if (likeBtn) {
          await likeBtn.click();
          liked.push(link);
          await humanDelay(3000, 8000); // Délai entre chaque like
        }
      }

      const cookies = await page.context().cookies();
      await saveSession(accountId, cookies);

      return { success: true, liked: liked.length, username };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  },

  /**
   * Envoie un DM Instagram
   * Utilisé en fallback quand Unipile ne fonctionne pas
   */
  async sendDM(username, message, accountId) {
    const { browser, page } = await getPage(accountId);

    try {
      await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });
      await humanDelay(2000, 4000);

      // Cliquer "Message"
      const msgBtn = await page.$('button:has-text("Message"), [data-testid="send-message-button"]');
      if (!msgBtn) throw new Error('Bouton Message non trouvé');

      await msgBtn.click();
      await humanDelay(2000, 4000);

      // Taper le message avec délai humain
      const textArea = await page.$('textarea[placeholder], div[role="textbox"]');
      if (!textArea) throw new Error('Zone de texte non trouvée');

      await humanType(page, 'textarea[placeholder], div[role="textbox"]', message);
      await humanDelay(1000, 2000);

      // Envoyer
      await page.keyboard.press('Enter');
      await humanDelay(2000, 4000);

      const cookies = await page.context().cookies();
      await saveSession(accountId, cookies);

      return { success: true, username };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  },

  /**
   * Répond à une story Instagram (très fort signal d'engagement)
   */
  async replyToStory(username, storyId, replyText, accountId) {
    const { browser, page } = await getPage(accountId);

    try {
      // Naviguer vers les stories du compte
      await page.goto(`https://www.instagram.com/stories/${username}/${storyId}/`, {
        waitUntil: 'networkidle',
      });
      await humanDelay(3000, 6000);

      // Taper la réponse
      const input = await page.$('textarea[placeholder*="Répondre"], input[placeholder*="reply"]');
      if (!input) throw new Error('Input réponse story non trouvé');

      await humanType(page, 'textarea[placeholder*="Répondre"], input[placeholder*="reply"]', replyText);
      await humanDelay(1000, 2000);
      await page.keyboard.press('Enter');
      await humanDelay(2000, 3000);

      const cookies = await page.context().cookies();
      await saveSession(accountId, cookies);

      return { success: true, username, storyId };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  },

  /**
   * Récupère les stats d'un profil (public)
   */
  async getProfileStats(username) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });

      const stats = await page.evaluate(() => {
        const metas = document.querySelectorAll('meta[property="og:description"]');
        const desc = metas[0]?.content || '';
        const match = desc.match(/(\d[\d,.]*)\s*Followers.*?(\d[\d,.]*)\s*Following.*?(\d[\d,.]*)\s*Posts/);
        return match ? {
          followers: match[1],
          following: match[2],
          posts: match[3],
        } : null;
      });

      return { username, stats };
    } finally {
      await browser.close();
    }
  },
};

module.exports = { BrowserAgent };
