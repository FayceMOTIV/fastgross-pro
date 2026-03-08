/**
 * ORCHESTRATEUR — Lance tous les tests dans l'ordre
 * Usage : node scripts/run_battle_test.mjs
 */
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, existsSync } from 'fs';

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

// Resolve functions env and node_modules
const projectRoot = new URL('..', import.meta.url).pathname;
const functionsNodeModules = `${projectRoot}functions/node_modules`;

// Load functions/.env into environment for Groq, Firebase, etc.
const functionsEnvPath = `${projectRoot}functions/.env`;
if (existsSync(functionsEnvPath)) {
  const envContent = readFileSync(functionsEnvPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
  console.log('✅ Loaded functions/.env');
}

function runScript(name, path) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🚀 LANCEMENT : ${name}`);
  console.log(`${'─'.repeat(60)}\n`);

  try {
    execSync(`node ${path}`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_PATH: functionsNodeModules },
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
