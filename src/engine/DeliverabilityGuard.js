/**
 * DeliverabilityGuard - Protection anti-spam et gestion de la delivrabilite
 * Assure que les emails sont envoyes de maniere responsable
 */

import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import {
  DELIVERABILITY_CONFIG,
  getEffectiveLimit,
  getRandomDelay,
  sleep
} from './config';
import { pauseAccount } from './EmailAccountManager';

/**
 * Verifier si un email est dans la blacklist
 */
export const isBlacklisted = async (email, orgId) => {
  if (!email) return true;

  const emailLower = email.toLowerCase();
  const blacklistRef = doc(db, 'organizations', orgId, 'blacklist', emailLower);
  const snapshot = await getDoc(blacklistRef);

  return snapshot.exists();
};

/**
 * Ajouter un email a la blacklist
 */
export const addToBlacklist = async (email, orgId, reason = 'unsubscribed') => {
  if (!email) return;

  const emailLower = email.toLowerCase();
  const blacklistRef = doc(db, 'organizations', orgId, 'blacklist', emailLower);

  await setDoc(blacklistRef, {
    email: emailLower,
    reason,
    addedAt: Timestamp.now()
  });
};

/**
 * Verifier si un domaine a ete contacte recemment
 */
export const isDomainRecentlyContacted = async (domain, orgId, days = 7) => {
  const contactsRef = collection(db, 'organizations', orgId, 'domainContacts');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const q = query(
    contactsRef,
    where('domain', '==', domain),
    where('contactedAt', '>', Timestamp.fromDate(cutoffDate))
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Enregistrer un contact de domaine
 */
export const recordDomainContact = async (domain, orgId, email) => {
  const contactRef = doc(db, 'organizations', orgId, 'domainContacts', domain);

  await setDoc(contactRef, {
    domain,
    email,
    contactedAt: Timestamp.now()
  }, { merge: true });
};

/**
 * Verifier toutes les conditions avant d'envoyer un email
 */
export const canSend = async (account, prospect, orgId) => {
  const checks = [];

  // 1. Verifier que le prospect a un email
  if (!prospect.emails || prospect.emails.length === 0) {
    return {
      allowed: false,
      reason: 'no_email',
      message: 'Le prospect n\'a pas d\'email'
    };
  }

  const email = prospect.emails[0];

  // 2. Quota du compte pas depasse
  const effectiveLimit = getEffectiveLimit(account);
  if (account.sentToday >= effectiveLimit) {
    return {
      allowed: false,
      reason: 'quota_reached',
      message: `Quota atteint: ${account.sentToday}/${effectiveLimit}`
    };
  }
  checks.push({ check: 'quota', passed: true });

  // 3. Email pas blackliste
  const blacklisted = await isBlacklisted(email, orgId);
  if (blacklisted) {
    return {
      allowed: false,
      reason: 'blacklisted',
      message: 'Email dans la blacklist'
    };
  }
  checks.push({ check: 'blacklist', passed: true });

  // 4. Domaine pas contacte recemment (1/semaine)
  const domain = email.split('@')[1];
  const recentlyContacted = await isDomainRecentlyContacted(
    domain,
    orgId,
    DELIVERABILITY_CONFIG.domainCooldownDays
  );
  if (recentlyContacted) {
    return {
      allowed: false,
      reason: 'domain_cooldown',
      message: `Domaine ${domain} contacte recemment`
    };
  }
  checks.push({ check: 'domain_cooldown', passed: true });

  // 5. Taux de bounce pas trop eleve (> 5% -> pause)
  if (account.bounceRate > DELIVERABILITY_CONFIG.maxBounceRate) {
    // Mettre le compte en pause automatiquement
    await pauseAccount(account.id, 'Bounce rate trop eleve');
    return {
      allowed: false,
      reason: 'high_bounce_rate',
      message: `Bounce rate trop eleve: ${(account.bounceRate * 100).toFixed(1)}%`
    };
  }
  checks.push({ check: 'bounce_rate', passed: true });

  // 6. Compte en bon etat
  if (account.status === 'paused' || account.status === 'error') {
    return {
      allowed: false,
      reason: 'account_paused',
      message: `Compte ${account.email} en pause ou erreur`
    };
  }
  checks.push({ check: 'account_status', passed: true });

  return {
    allowed: true,
    checks,
    effectiveLimit,
    remaining: effectiveLimit - account.sentToday
  };
};

/**
 * Attendre le delai requis avant le prochain envoi
 */
export const waitBeforeSend = async () => {
  const delay = getRandomDelay();
  console.log(`Attente de ${Math.round(delay)} secondes avant envoi...`);
  await sleep(delay * 1000);
  return delay;
};

/**
 * Enregistrer un envoi reussi
 */
export const recordSuccessfulSend = async (orgId, prospect, account) => {
  const email = prospect.emails[0];
  const domain = email.split('@')[1];

  // Enregistrer le contact du domaine
  await recordDomainContact(domain, orgId, email);

  return {
    recorded: true,
    domain,
    email
  };
};

/**
 * Gerer un bounce
 */
export const handleBounce = async (orgId, accountId, email, bounceType = 'hard') => {
  // Ajouter l'email a la blacklist
  await addToBlacklist(email, orgId, `bounce_${bounceType}`);

  // Mettre a jour les stats de bounce du compte
  const { updateBounceStats } = await import('./EmailAccountManager');
  const newBounceRate = await updateBounceStats(orgId, accountId);

  return {
    blacklisted: true,
    newBounceRate,
    accountPaused: newBounceRate > DELIVERABILITY_CONFIG.maxBounceRate
  };
};

/**
 * Gerer une desinscription
 */
export const handleUnsubscribe = async (email, orgId) => {
  await addToBlacklist(email, orgId, 'unsubscribed');
  return { success: true };
};

/**
 * Obtenir les statistiques de delivrabilite
 */
export const getDeliverabilityStats = async (orgId) => {
  // Compter les emails blacklistes
  const blacklistRef = collection(db, 'organizations', orgId, 'blacklist');
  const blacklistSnapshot = await getDocs(blacklistRef);

  const blacklistReasons = {};
  blacklistSnapshot.docs.forEach(doc => {
    const reason = doc.data().reason || 'unknown';
    blacklistReasons[reason] = (blacklistReasons[reason] || 0) + 1;
  });

  // Compter les domaines contactes cette semaine
  const contactsRef = collection(db, 'organizations', orgId, 'domainContacts');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const q = query(
    contactsRef,
    where('contactedAt', '>', Timestamp.fromDate(cutoffDate))
  );
  const contactsSnapshot = await getDocs(q);

  return {
    blacklistTotal: blacklistSnapshot.size,
    blacklistByReason: blacklistReasons,
    domainsContactedThisWeek: contactsSnapshot.size,
    config: DELIVERABILITY_CONFIG
  };
};

/**
 * Verifier la sante globale de la delivrabilite
 */
export const checkDeliverabilityHealth = async (orgId, accounts) => {
  const issues = [];
  const warnings = [];

  for (const account of accounts) {
    // Verifier le bounce rate
    if (account.bounceRate > 0.03) {
      if (account.bounceRate > DELIVERABILITY_CONFIG.maxBounceRate) {
        issues.push({
          type: 'high_bounce_rate',
          account: account.email,
          value: account.bounceRate
        });
      } else {
        warnings.push({
          type: 'elevated_bounce_rate',
          account: account.email,
          value: account.bounceRate
        });
      }
    }

    // Verifier la reputation
    if (account.reputation < 80) {
      warnings.push({
        type: 'low_reputation',
        account: account.email,
        value: account.reputation
      });
    }

    // Verifier le warmup
    if (account.warmupDay < 7) {
      warnings.push({
        type: 'early_warmup',
        account: account.email,
        warmupDay: account.warmupDay
      });
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
    warnings,
    recommendations: generateRecommendations(issues, warnings)
  };
};

/**
 * Generer des recommandations basees sur les problemes
 */
const generateRecommendations = (issues, warnings) => {
  const recommendations = [];

  issues.forEach(issue => {
    if (issue.type === 'high_bounce_rate') {
      recommendations.push({
        priority: 'high',
        message: `Le compte ${issue.account} a un taux de bounce trop eleve. Nettoyez votre liste et verifiez les emails avant envoi.`
      });
    }
  });

  warnings.forEach(warning => {
    if (warning.type === 'early_warmup') {
      recommendations.push({
        priority: 'medium',
        message: `Le compte ${warning.account} est en phase de warmup (jour ${warning.warmupDay}). Patience, les limites augmenteront progressivement.`
      });
    }
    if (warning.type === 'elevated_bounce_rate') {
      recommendations.push({
        priority: 'medium',
        message: `Surveillez le taux de bounce du compte ${warning.account} (${(warning.value * 100).toFixed(1)}%).`
      });
    }
  });

  return recommendations;
};

/**
 * Module principal de garde
 */
const DeliverabilityGuard = {
  isBlacklisted,
  addToBlacklist,
  isDomainRecentlyContacted,
  recordDomainContact,
  canSend,
  waitBeforeSend,
  recordSuccessfulSend,
  handleBounce,
  handleUnsubscribe,
  getDeliverabilityStats,
  checkDeliverabilityHealth
};

export default DeliverabilityGuard;
