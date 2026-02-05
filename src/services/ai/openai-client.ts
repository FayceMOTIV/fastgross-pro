/**
 * OpenAI Client Configuration - DISTRAM by Face Media
 *
 * Centralized OpenAI GPT-4o configuration for all AI services
 */

import OpenAI from 'openai';

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get the OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[OpenAI] API key not found. AI features will use fallback responses.');
    }

    openaiClient = new OpenAI({
      apiKey: apiKey || 'missing-api-key',
      dangerouslyAllowBrowser: true, // Allow client-side usage for demo
    });
  }

  return openaiClient;
}

// Available models
export const OPENAI_MODELS = {
  GPT4O: 'gpt-4o',           // Main model for complex tasks
  GPT4O_MINI: 'gpt-4o-mini', // Faster, cheaper for simple tasks
} as const;

// Default model
export const DEFAULT_MODEL = OPENAI_MODELS.GPT4O;

/**
 * Helper function for simple chat completions
 */
export async function chatCompletion(
  prompt: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const client = getOpenAIClient();

  try {
    const response = await client.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      ...(options?.jsonMode && { response_format: { type: 'json_object' as const } }),
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[OpenAI] Chat completion error:', error);
    throw error;
  }
}

/**
 * Helper function for JSON responses
 */
export async function chatCompletionJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<T> {
  const response = await chatCompletion(prompt, {
    ...options,
    jsonMode: true,
  });

  try {
    // Clean response (remove markdown code blocks if present)
    const cleanResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanResponse) as T;
  } catch {
    throw new Error('Failed to parse JSON response from OpenAI');
  }
}

export default getOpenAIClient;
