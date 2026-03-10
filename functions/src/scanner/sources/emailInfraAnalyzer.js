/**
 * emailInfraAnalyzer.js — MX/SPF/DKIM/DMARC analysis via DNS
 */
import { Resolver } from 'dns/promises';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

export async function analyzeEmailInfra(domain) {
  const [mx, spf, dkim, dmarc] = await Promise.allSettled([
    resolveMX(domain),
    resolveSPF(domain),
    resolveDKIM(domain),
    resolveDMARC(domain),
  ]);

  const mxRecords = mx.status === 'fulfilled' ? mx.value : [];
  const spfRecord = spf.status === 'fulfilled' ? spf.value : null;
  const dkimRecord = dkim.status === 'fulfilled' ? dkim.value : null;
  const dmarcRecord = dmarc.status === 'fulfilled' ? dmarc.value : null;

  let mxProvider = null;
  if (mxRecords.length > 0) {
    const mxHost = mxRecords[0].exchange.toLowerCase();
    if (mxHost.includes('google') || mxHost.includes('gmail')) mxProvider = 'Google Workspace';
    else if (mxHost.includes('outlook') || mxHost.includes('microsoft')) mxProvider = 'Microsoft 365';
    else if (mxHost.includes('ovh')) mxProvider = 'OVH';
    else if (mxHost.includes('ionos') || mxHost.includes('1and1')) mxProvider = 'IONOS';
    else if (mxHost.includes('gandi')) mxProvider = 'Gandi';
    else if (mxHost.includes('icloud') || mxHost.includes('apple')) mxProvider = 'iCloud';
    else if (mxHost.includes('protonmail') || mxHost.includes('proton')) mxProvider = 'ProtonMail';
    else mxProvider = mxHost;
  }

  return {
    hasMX: mxRecords.length > 0,
    mxProvider,
    mxRecords: mxRecords.map(r => ({ exchange: r.exchange, priority: r.priority })),
    hasSPF: !!spfRecord,
    spfValid: spfRecord ? !spfRecord.includes('~all') : false,
    spfRecord,
    hasDKIM: !!dkimRecord,
    dkimRecord,
    hasDMARC: !!dmarcRecord,
    dmarcPolicy: dmarcRecord ? extractDMARCPolicy(dmarcRecord) : null,
    dmarcRecord,
    usesFreeMail: false,
  };
}

async function resolveMX(domain) {
  try { return await resolver.resolveMx(domain); }
  catch { return []; }
}

async function resolveSPF(domain) {
  try {
    const records = await resolver.resolveTxt(domain);
    for (const record of records) {
      const txt = record.join('');
      if (txt.startsWith('v=spf1')) return txt;
    }
    return null;
  } catch { return null; }
}

async function resolveDKIM(domain) {
  const selectors = ['default', 'google', 'k1', 'selector1', 'selector2', 'mail', 'dkim'];
  for (const selector of selectors) {
    try {
      const records = await resolver.resolveTxt(`${selector}._domainkey.${domain}`);
      if (records.length > 0) return records[0].join('');
    } catch { continue; }
  }
  return null;
}

async function resolveDMARC(domain) {
  try {
    const records = await resolver.resolveTxt(`_dmarc.${domain}`);
    for (const record of records) {
      const txt = record.join('');
      if (txt.startsWith('v=DMARC1')) return txt;
    }
    return null;
  } catch { return null; }
}

function extractDMARCPolicy(record) {
  const match = record.match(/p=(\w+)/);
  return match ? match[1] : null;
}
