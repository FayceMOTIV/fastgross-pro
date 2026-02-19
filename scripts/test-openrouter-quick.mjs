import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '../functions/.env'), 'utf-8')
const vars = {}
envContent.split('\n').forEach(l => {
  l = l.trim()
  if (!l || l.startsWith('#')) return
  const [k, ...v] = l.split('=')
  vars[k] = v.join('=')
})

const models = [
  'openrouter/auto',
  'nvidia/nemotron-nano-9b-v2:free',
  'stepfun/step-3.5-flash:free',
  'z-ai/glm-4.5-air:free'
]

for (const model of models) {
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + vars.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://face-media-factory.web.app',
        'X-Title': 'Face Media Factory'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Genere 1 message de prospection (3 phrases) pour un restaurant parisien.' }],
        max_tokens: 1000
      })
    })
    const data = await resp.json()
    // Show raw structure for debug
    const choice = data.choices?.[0]
    const content = choice?.message?.content || ''
    const trimmed = content.replace(/\s+/g, ' ').trim()
    const actual_model = data.model || model
    if (data.error) {
      console.log(`[!!] ${model}: ${data.error.message?.substring(0, 120)}`)
    } else if (trimmed.length > 0) {
      console.log(`[OK] ${model} -> ${actual_model} (${trimmed.length} chars)`)
      console.log(`  => "${trimmed.substring(0, 250)}"`)
    } else {
      console.log(`[??] ${model} -> ${actual_model}: empty content, finish_reason=${choice?.finish_reason}`)
    }
  } catch (e) {
    console.log(`[!!] ${model}: ${e.message}`)
  }
  console.log()
}
