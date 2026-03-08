/**
 * BATTLE TEST — Génère le rapport final consolidé
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const REPORT_PATH = '/tmp/fmf_battle_test/RAPPORT_FINAL.md';

function loadJSON(path) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : null; }
  catch { return null; }
}

const dscoreSummary  = loadJSON('/tmp/fmf_battle_test/dscore/summary.json');
const messagesSummary = loadJSON('/tmp/fmf_battle_test/messages/summary.json');
const convSummary    = loadJSON('/tmp/fmf_battle_test/conversations/summary.json');
const pipeline       = loadJSON('/tmp/fmf_battle_test/pipeline_results.json');

const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
const globalScore = convSummary?.avgScore || 0;
const overallStatus =
  globalScore >= 8 && (pipeline?.summary?.failed || 0) === 0
    ? '🟢 EXCELLENT — FMF est prêt pour la production commerciale'
    : globalScore >= 6 && (pipeline?.summary?.failed || 0) <= 1
    ? '🟡 BON — Quelques ajustements avant déploiement commercial'
    : '🔴 AMÉLIORATIONS REQUISES — Ne pas déployer sur de vrais prospects sans corrections';

let report = `# FMF BATTLE TEST — RAPPORT FINAL
**Date :** ${now}
**Produit :** Face Media Factory v4
**Tests :** 5 avatars · 7 pièges · 5 conversations simulées · 10 étapes pipeline

---

## VERDICT GLOBAL

### ${overallStatus}

---

## 1. DSCORE — COHÉRENCE DES SCORES

| Avatar | Score | Range attendu | Urgency | Résultat |
|--------|-------|--------------|---------|----------|
`;

if (dscoreSummary) {
  dscoreSummary.forEach(r => {
    const ok = r.scorePassed ? '✅' : '❌';
    const uok = r.urgencyPassed ? '✅' : '❌';
    report += `| ${r.companyName || r.avatar} | ${r.dScore}/100 | ${r.expectedRange?.min}-${r.expectedRange?.max} | ${r.urgency} ${uok} | ${ok} |\n`;
  });
}
const dPassed = dscoreSummary?.filter(r => r.overallPassed).length || 0;
const dTotal  = dscoreSummary?.length || 5;
report += `\n**Score DScore : ${dPassed}/${dTotal} avatars PASSED**\n\n`;

report += `---\n\n## 2. MESSAGES ALEX — QUALITÉ ET RÈGLES\n\n`;
if (messagesSummary) {
  messagesSummary.forEach(ctx => {
    report += `### ${ctx.avatar}\n`;
    ctx.messages?.forEach(m => {
      const icon = m.passed ? '✅' : '❌';
      report += `- **${m.channel?.toUpperCase()}** ${icon} : "${m.message?.slice(0, 80)}..." (${m.length} chars)\n`;
      m.issues?.forEach(i => report += `  - ⚠️ ${i}\n`);
    });
    report += '\n';
  });
}

report += `---\n\n## 3. CONVERSATIONS ET PIÈGES\n\n`;
report += `**Score moyen Alex : ${globalScore.toFixed(1)}/10**\n\n`;

if (convSummary?.results) {
  convSummary.results.forEach(r => {
    const s = r.judgment?.globalScore || 0;
    const icon = s >= 7 ? '🟢' : s >= 5 ? '🟡' : '🔴';
    const totalPieges = r.judgment?.checkResults?.length || '?';
    report += `### ${icon} ${r.avatar} (${r.channel})\n`;
    report += `**Score : ${s}/10 — Pièges déjoués : ${r.judgment?.trapsPassed}/${totalPieges}**\n\n`;

    if (r.judgment?.highlights?.length > 0) {
      report += `**Points forts :**\n`;
      r.judgment.highlights.forEach(h => report += `- ✅ ${h}\n`);
    }
    if (r.judgment?.issues?.length > 0) {
      report += `\n**Problèmes :**\n`;
      r.judgment.issues.forEach(i => report += `- ⚠️ ${i}\n`);
    }

    report += `\n**Extrait :**\n\`\`\`\n`;
    r.log?.slice(0, 4).forEach(e => {
      report += `[${e.role.toUpperCase()}]: "${e.message?.slice(0, 120)}"\n\n`;
    });
    report += `\`\`\`\n\n`;
  });
}

report += `---\n\n## 4. PIPELINE TECHNIQUE\n\n`;
if (pipeline) {
  report += `**${pipeline.summary.passed}✅ ${pipeline.summary.warned}⚠️ ${pipeline.summary.failed}❌ / ${pipeline.summary.total} étapes**\n\n`;
  pipeline.steps?.forEach(s => {
    const icon = s.status === 'OK' ? '✅' : s.status === 'WARN' ? '⚠️' : '❌';
    report += `${icon} **${s.name}** : ${s.detail}\n`;
  });
}

report += `\n---\n\n## 5. RECOMMANDATIONS\n\n`;

const issues = [];
if (dPassed < dTotal) issues.push('Calibrer le DScore — certains avatars hors range attendu');
if (globalScore < 7) issues.push("Affiner les instructions système d'Alex — trop de pièges échoués");
if ((pipeline?.summary?.failed || 0) > 0) issues.push('Corriger les étapes pipeline en échec avant mise en prod');

const allConvIssues = convSummary?.results?.flatMap(r => r.judgment?.issues || []) || [];
if (allConvIssues.some(i => i.toLowerCase().includes('prix'))) {
  issues.push('Alex invente des prix — renforcer la règle tarifs dans le system prompt');
}
if (allConvIssues.some(i => i.toLowerCase().includes('rgpd'))) {
  issues.push('Réponse RGPD insuffisante — enrichir la base de connaissances Alex');
}

if (issues.length === 0) {
  report += `✅ **Aucun problème critique. FMF est prêt pour les premiers vrais prospects.**\n\n`;
  report += `**Prochaine étape :** Lancer une campagne réelle sur 10 plombiers lyonnais via FMF.\n`;
} else {
  report += `**${issues.length} points à corriger :**\n\n`;
  issues.forEach((issue, i) => report += `${i + 1}. ${issue}\n`);
}

report += `\n---\n*Rapport généré par FMF Battle Test — ${now}*\n`;

writeFileSync(REPORT_PATH, report);
console.log(`\n📄 Rapport écrit : ${REPORT_PATH}`);
console.log(`\n${'═'.repeat(60)}`);
console.log(report);
