/**
 * ORCHESTRATEUR BATTLE TEST V2 — Stress Test Extreme
 * Usage : cd functions && node run_battle_test_v2.mjs
 */
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from functions directory
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
  console.log(`✅ .env loaded (GROQ_API_KEY: ${process.env.GROQ_API_KEY?.slice(0, 10)}...)`);
}
const START = Date.now();

console.log(`
\u2554${'='.repeat(64)}\u2557
\u2551     FMF BATTLE TEST V2 — STRESS TEST EXTREME                     \u2551
\u2551     7 avatars adversariaux \u00b7 10 edge cases \u00b7 Sans pitie            \u2551
\u255a${'='.repeat(64)}\u255d
`);

// Clean stale data from previous runs
if (existsSync('/tmp/fmf_battle_test_v2')) {
  rmSync('/tmp/fmf_battle_test_v2', { recursive: true, force: true });
}
['conversations', 'messages', 'stress', 'edge_cases'].forEach(d =>
  mkdirSync(`/tmp/fmf_battle_test_v2/${d}`, { recursive: true })
);

function run(name, file) {
  console.log(`\n${'─'.repeat(65)}\n\ud83d\ude80 ${name}\n${'─'.repeat(65)}\n`);
  try {
    execSync(`node ${__dirname}/${file}`, { stdio: 'inherit', env: { ...process.env }, timeout: 600000 });
    console.log(`\n\u2705 ${name} TERMINE`);
  } catch (err) {
    console.error(`\n\u274c ${name} ECHOUE — ${err.message.slice(0, 200)}`);
  }
}

run('Phase 1 — Messages 7 avatars',          'battle_test_v2_messages.mjs');
run('Phase 2 — Conversations adversariales',  'battle_test_v2_conversations.mjs');
run('Phase 3 — Edge Cases',                   'battle_test_v2_edge_cases.mjs');
run('Phase 4 — Rapport Final V2',             'battle_test_v2_report.mjs');

const min = ((Date.now() - START) / 60000).toFixed(1);
console.log(`\n\u2554${'='.repeat(64)}\u2557`);
console.log(`\u2551  TERMINE en ${min} minutes`);
console.log(`\u2551  Rapport : /tmp/fmf_battle_test_v2/RAPPORT_FINAL_V2.md`);
console.log(`\u255a${'='.repeat(64)}\u255d\n`);
