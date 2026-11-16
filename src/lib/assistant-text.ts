import type { Locale } from './locale.ts';

const RAW_BLOCKS: readonly RegExp[] = [
  /<render_ui\b[^>]*>[\s\S]*?<\/render_ui>/gi,
  /<tool_calls?\b[^>]*>[\s\S]*?<\/tool_calls?>/gi,
  /<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi,
  /<function_calls?\b[^>]*>[\s\S]*?<\/function_calls?>/gi,
  /```(?:json|xml)?\s*\{\s*"name"\s*:\s*"(?:render_ui|media_[a-z_]+|get_[a-z_]+|search_[a-z_]+|open_page|ask_step)"[\s\S]*?\}\s*```/gi,
];

const OPEN_RAW = /<(?:render_ui|tool_calls?|tool_call|function_calls?)\b[^>]*>[\s\S]*$/i;

export interface SanitizedAssistantText {
  readonly text: string;
  readonly stripped: boolean;
}

/**
 * Entfernt rohe Werkzeug-Syntax, die ein Anbieter versehentlich als Text
 * ausgibt. Normale Antworten und normale Codeblöcke bleiben unangetastet.
 */
export function sanitizeAssistantText(raw: string, locale: Locale): SanitizedAssistantText {
  let text = raw;
  let stripped = false;
  for (const pattern of RAW_BLOCKS) {
    if (pattern.test(text)) {
      stripped = true;
      text = text.replace(pattern, '');
    }
    pattern.lastIndex = 0;
  }
  if (OPEN_RAW.test(text)) {
    stripped = true;
    text = text.replace(OPEN_RAW, '');
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (stripped && text.length === 0) {
    return {
      text:
        locale === 'de'
          ? 'Die Darstellung konnte nicht erzeugt werden. Frag mich bitte noch einmal.'
          : 'The visual could not be rendered. Please ask again.',
      stripped: true,
    };
  }
  return { text, stripped };
}
