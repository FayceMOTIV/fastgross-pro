/**
 * safeParseLLMJson.js — Parse JSON securise pour les reponses LLM
 *
 * Les modeles LLM (Groq, Gemini, OpenRouter) retournent parfois du JSON
 * contenant des caracteres de controle (\n non echappe, tabs, etc.)
 * qui font echouer JSON.parse.
 *
 * Ce module sanitize le contenu avant parsing.
 */

/**
 * Sanitize et parse du JSON provenant d'un LLM.
 *
 * Etapes :
 * 1. Supprimer les caracteres de controle (0x00-0x1F, 0x7F) hors des strings JSON
 * 2. Extraire le JSON si entoure de markdown code blocks
 * 3. Parser avec JSON.parse
 *
 * @param {string} raw - Le texte brut du LLM (peut contenir du JSON + du texte)
 * @returns {any} L'objet parse
 * @throws {SyntaxError} Si le JSON est invalide meme apres sanitization
 */
export function safeParseLLMJson(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new SyntaxError('safeParseLLMJson: input is empty or not a string');
  }

  let text = raw.trim();

  // Supprimer les code blocks markdown
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Essayer le parse direct d'abord (fast path)
  try {
    return JSON.parse(text);
  } catch {
    // Continue avec sanitization
  }

  // Sanitize : remplacer les caracteres de controle par des espaces
  // Garde \n et \t dans les strings JSON echappes (\n, \t) mais supprime les raw control chars
  const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  // Remplacer les newlines non echappes dans les valeurs string JSON
  // Strategie : remplacer \n par \\n seulement a l'interieur des strings JSON
  const fixedNewlines = sanitized.replace(
    /"(?:[^"\\]|\\.)*"/g,
    (match) => match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );

  try {
    return JSON.parse(fixedNewlines);
  } catch {
    // Dernier essai : extraire le premier objet/tableau JSON du texte
  }

  // Extraire le premier objet JSON {...} ou tableau [...]
  const jsonMatch = fixedNewlines.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Nettoyage agressif : supprimer TOUS les control chars y compris \n
      const aggressive = jsonMatch[1].replace(/[\x00-\x1F\x7F]/g, ' ');
      return JSON.parse(aggressive);
    }
  }

  throw new SyntaxError(`safeParseLLMJson: could not parse JSON from LLM response (length=${raw.length})`);
}
