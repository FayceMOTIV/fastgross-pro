/**
 * Gemini AI utility with Claude fallback
 * Uses Gemini 1.5 Flash (free tier) as primary, Claude as fallback
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

/**
 * Call Gemini 1.5 Flash API
 * @param {string} prompt - The prompt to send
 * @param {object} options - Optional settings
 * @returns {Promise<string>} - The generated text
 */
export async function callGemini(prompt, options = {}) {
  const { maxTokens = 2000, temperature = 0.7 } = options
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('Empty response from Gemini')
    }

    return text
  } catch (error) {
    console.error('Gemini API error:', error.message)
    throw error
  }
}

/**
 * Call AI with Gemini first, Claude as fallback
 * @param {string} prompt - The prompt to send
 * @param {object} options - Optional settings
 * @returns {Promise<string>} - The generated text
 */
export async function callAI(prompt, options = {}) {
  const { useClaude = false } = options

  // If explicitly asking for Claude or Gemini not configured
  if (useClaude || !process.env.GEMINI_API_KEY) {
    return callClaude(prompt, options)
  }

  try {
    // Try Gemini first
    return await callGemini(prompt, options)
  } catch (error) {
    console.warn('Gemini failed, falling back to Claude:', error.message)
    // Fallback to Claude
    return callClaude(prompt, options)
  }
}

/**
 * Call Claude API (fallback)
 */
async function callClaude(prompt, options = {}) {
  const { maxTokens = 2000 } = options

  // Dynamic import to avoid loading if not needed
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].text
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 * @param {string} text - AI response text
 * @returns {object} - Parsed JSON
 */
export function parseJsonResponse(text) {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Try extracting from code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    }

    // Try finding JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error('Could not parse JSON from AI response')
  }
}
