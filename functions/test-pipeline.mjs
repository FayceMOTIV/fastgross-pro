import { readFileSync } from 'fs'
import axios from 'axios'
import * as cheerio from 'cheerio'

// Load .env manually (no dotenv dependency needed)
try {
  const envContent = readFileSync('.env', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch { /* no .env file */ }

const SERPER_KEY = process.env.SERPER_API_KEY

async function test() {
  console.log('SERPER_API_KEY set:', !!SERPER_KEY)
  console.log('')

  // 1. SIRENE
  console.log('=== 1. SIRENE: restaurants lyon ===')
  const { data: sirene } = await axios.get('https://recherche-entreprises.api.gouv.fr/search', {
    params: { q: 'lyon', activite_principale: '56.10A', departement: '69', etat_administratif: 'A', per_page: 5 },
    timeout: 15000
  })
  console.log('Total found:', sirene.total_results, '| Returned:', sirene.results.length)

  const leads = []
  for (const r of sirene.results) {
    const etab = r.matching_etablissements?.[0] || r.siege
    leads.push({
      name: r.nom_complet,
      city: etab?.libelle_commune || 'Lyon',
      postalCode: etab?.code_postal || '',
      siret: etab?.siret
    })
    console.log('-', r.nom_complet, '|', etab?.libelle_commune, '|', etab?.code_postal)
  }

  // 2. Find website via Serper
  console.log('')
  console.log('=== 2. Serper: find website for', leads[0].name, '===')
  const testBiz = leads[0]
  if (SERPER_KEY) {
    try {
      const { data: serp } = await axios.post('https://google.serper.dev/search', {
        q: `"${testBiz.name}" ${testBiz.city} site web`,
        gl: 'fr', hl: 'fr', num: 3
      }, {
        headers: { 'X-API-KEY': SERPER_KEY },
        timeout: 5000
      })
      const excluded = ['pagesjaunes.fr', 'societe.com', 'infogreffe.fr', 'pappers.fr', 'google.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'yelp.fr', 'tripadvisor.fr']
      for (const result of (serp.organic || [])) {
        const link = result.link || ''
        const isExcluded = excluded.some(d => link.includes(d))
        if (!isExcluded) {
          try {
            testBiz.website = new URL(link).origin
            console.log('Website found:', testBiz.website)
            break
          } catch { continue }
        }
      }
      if (!testBiz.website) console.log('No website found (all excluded)')
    } catch (e) { console.log('Serper error:', e.message) }
  } else {
    console.log('SERPER_API_KEY not set, skipping')
  }

  // 3. Scrape email
  if (testBiz.website) {
    console.log('')
    console.log('=== 3. Scrape email from', testBiz.website, '===')
    try {
      const { data: html } = await axios.get(testBiz.website, {
        timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' }, maxRedirects: 3
      })
      const $ = cheerio.load(html)
      const emails = new Set()
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href')?.replace('mailto:', '').split('?')[0]?.trim()
        if (href) emails.add(href.toLowerCase())
      })
      const regex = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      regex.forEach(e => emails.add(e.toLowerCase()))
      const valid = [...emails].filter(e => {
        return !e.startsWith('noreply') && !e.startsWith('no-reply') && !e.includes('example.com') && !e.includes('sentry.io')
      })
      console.log('Emails found:', valid.length > 0 ? valid.slice(0, 3) : 'none')
      if (valid.length > 0) testBiz.email = valid[0]
    } catch (e) { console.log('Scrape error:', e.message) }

    // 4. Scrape phone
    console.log('')
    console.log('=== 4. Scrape phone from', testBiz.website, '===')
    try {
      const { data: html } = await axios.get(testBiz.website, {
        timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' }
      })
      const phones = html.match(/(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/g) || []
      const normalized = phones.map(p => {
        let c = p.replace(/[\s.\-]/g, '')
        if (c.startsWith('+33')) c = '0' + c.slice(3)
        if (c.startsWith('0033')) c = '0' + c.slice(4)
        return c
      }).filter(p => p.length === 10)
      console.log('Phones found:', normalized.length > 0 ? [...new Set(normalized)].slice(0, 3) : 'none')
    } catch (e) { console.log('Phone scrape error:', e.message) }
  }

  // 5. Verify email
  console.log('')
  console.log('=== 5. Verify email ===')
  const emailToVerify = testBiz.email || 'contact@lyon.fr'
  try {
    const { data: v } = await axios.get(`https://api.mailcheck.ai/email/${encodeURIComponent(emailToVerify)}`, { timeout: 5000 })
    console.log(`${emailToVerify}: mx=${v.mx}, disposable=${v.disposable}, status=${v.status}`)
  } catch (e) { console.log('Verify error:', e.message) }

  console.log('')
  console.log('=== ALL TESTS COMPLETE ===')
}

test().catch(e => console.error('FATAL:', e.message))
