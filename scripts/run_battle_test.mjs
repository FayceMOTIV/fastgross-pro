/**
 * ORCHESTRATEUR — Lance tous les tests dans l'ordre
 * Usage : node scripts/run_battle_test.mjs
 */
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

const START_TIME = Date.now();

console.log(`
╔══════════════════════════════════════════════════════════╗
║         FMF BATTLE TEST — DÉMARRAGE                      ║
║         5 avatars · 7 pièges · Conversations simulées    ║
╚══════════════════════════════════════════════════════════╝
`);

mkdirSync('/tmp/fmf_battle_test/conversations', { recursive: true });
mkdirSync('/tmp/fmf_battle_test/dscore', { recursive: true });
mkdirSync('/tmp/fmf_battle_test/messages', { recursive: true });

function runScript(name, path) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🚀 LANCEMENT : ${name}`);
  console.log(`${'─'.repeat(60)}\n`);

  try {
    execSync(`node ${path}`, {
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 300000
    });
    console.log(`\n✅ ${name} : TERMINÉ`);
  } catch (err) {
    console.error(`\n❌ ${name} : ÉCHOUÉ — ${err.message}`);
  }
}

const dir = new URL('.', import.meta.url).pathname;

runScript('Phase 1 — DScore 5 avatars',         `${dir}/battle_test_dscore.mjs`);
runScript('Phase 2 — Messages Alex',             `${dir}/battle_test_messages.mjs`);
runScript('Phase 3 — Conversations + Pièges',    `${dir}/battle_test_conversations.mjs`);
runScript('Phase 4 — Pipeline complet',          `${dir}/battle_test_pipeline.mjs`);
runScript('Phase 5 — Rapport final',             `${dir}/battle_test_report.mjs`);

const elapsed = ((Date.now() - START_TIME) / 1000 / 60).toFixed(1);
console.log(`\n╔══════════════════════════════════════════════════════════╗`);
console.log(`║  BATTLE TEST TERMINÉ en ${elapsed} minutes`);
console.log(`║  Rapport : /tmp/fmf_battle_test/RAPPORT_FINAL.md`);
console.log(`╚══════════════════════════════════════════════════════════╝\n`);
