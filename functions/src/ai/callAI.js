/**
 * Shared AI call utility with automatic fallback
 * Priority: Groq (fastest) → OpenRouter (flexible) → Gemini (backup)
 *
 * Usage:
 *   import { callAI } from '../ai/callAI.js'
 *   const text = await callAI('Your prompt here', 500)
 */

import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const PROVIDERS = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile'
  },
  {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
    model: 'nvidia/nemotron-3-nano-30b-a3b:free'
  },
  {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    envKey: 'GEMINI_API_KEY',
    model: 'gemini-2.0-flash'
  }
]

/**
 * Call AI with automatic Groq → OpenRouter → Gemini fallback
 * @param {string} prompt - The prompt to send
 * @param {number} maxTokens - Max tokens in response (default: 1000)
 * @returns {Promise<string>} The generated text
 * @throws {Error} If all providers fail
 */
export async function callAI(prompt, maxTokens = 1000) {
  const errors = []

  for (const provider of PROVIDERS) {
    const key = process.env[provider.envKey]
    if (!key) continue

    try {
      if (provider.name === 'gemini') {
        const response = await fetch(`${provider.url}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens }
          })
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || 'Gemini API error')
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Empty response from Gemini')
        return text
      } else {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            ...(provider.name === 'openrouter' && {
              'HTTP-Referer': 'https://face-media-factory.web.app',
              'X-Title': 'Face Media Factory'
            })
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
          })
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || `${provider.name} API error`)
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error(`Empty response from ${provider.name}`)
        return content
      }
    } catch (error) {
      console.warn(`[callAI] ${provider.name} failed:`, error.message)
      errors.push(`${provider.name}: ${error.message}`)
      continue
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(' | ')}`)
}

/**
 * Extract JSON from AI response text
 * @param {string} text - Raw AI response
 * @returns {object|null} Parsed JSON or null
 */
export function extractJSON(text) {
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return safeParseLLMJson(match[0])
  } catch {
    return null
  }
}
