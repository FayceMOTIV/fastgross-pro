/**
 * BATTLE TEST V2 — Phase 1 : Messages de prospection 7 avatars x 3 canaux
 */
import { writeFileSync, mkdirSync } from 'fs';
import Groq from 'groq-sdk';
import { AVATARS_V2, SYSTEM_ALEX } from './battle_test_v2_avatars.mjs';

mkdirSync('/tmp/fmf_battle_test_v2/messages', { recursive: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const channels = ['whatsapp', 'sms', 'email'];
const channelInstr = {
  sms: 'SMS ultra-court max 155 chars. Accroche directe. UNE question.',
  whatsapp: 'WhatsApp naturel max 220 chars. Ton humain. Emoji si approprie.',
  email: 'Email : Objet percutant + corps 3 phrases max. Professionnel. Max 500 chars.'
};

const results = [];
for (const avatar of AVATARS_V2) {
  console.log(`\n\u270d\ufe0f  ${avatar.entreprise} (${avatar.id})`);
  const avatarResult = { avatar: avatar.id, messages: [] };

  for (const channel of channels) {
    try {
      const comp = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        temperature: 0.7,
        messages: [{
          role: 'system', content: SYSTEM_ALEX
        }, {
          role: 'user',
          content: `Genere le premier message de prospection pour :
- ${avatar.nom}, ${avatar.entreprise} (NAF ${avatar.naf}), ${avatar.ville}
- Canal : ${channel.toUpperCase()}
- Instructions : ${channelInstr[channel]}
UNIQUEMENT le message, rien d'autre.`
        }]
      });

      const msg = comp.choices[0]?.message?.content?.trim() || '';
      const limits = { sms: 155, whatsapp: 220, email: 500 };
      const passed = msg.length <= (limits[channel] || 220);

      console.log(`  [${channel.toUpperCase()}] ${passed ? '\u2705' : '\u274c'} ${msg.length}c : "${msg.slice(0, 80)}..."`);
      avatarResult.messages.push({ channel, message: msg, length: msg.length, passed });
    } catch (err) {
      console.error(`  [${channel.toUpperCase()}] \u274c ${err.message.slice(0, 120)}`);
      avatarResult.messages.push({ channel, passed: false, error: err.message.slice(0, 200) });
    }
    await new Promise(r => setTimeout(r, 600));
  }

  results.push(avatarResult);
  writeFileSync(`/tmp/fmf_battle_test_v2/messages/${avatar.id}.json`, JSON.stringify(avatarResult, null, 2));
}

const totalPassed = results.flatMap(r => r.messages).filter(m => m.passed).length;
const total = results.flatMap(r => r.messages).length;
console.log(`\n\ud83d\udcca Messages : ${totalPassed}/${total} conformes`);
writeFileSync('/tmp/fmf_battle_test_v2/messages/summary.json', JSON.stringify({ totalPassed, total, results }, null, 2));
