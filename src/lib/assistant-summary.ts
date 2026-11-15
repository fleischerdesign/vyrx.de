import { assistantConfig } from './assistant-config.ts';
import type { Locale } from './locale.ts';

const SUMMARY_SYSTEM = `Du führst das interne Gedächtnis eines persönlichen Assistenten.
Verdichte den bisherigen Gesprächsverlauf zu einem knappen, faktischen Summary.
Behalte:
- Entscheidungen und getroffene Vereinbarungen
- Präferenzen und Abneigungen der Person
- offene Aufgaben und nächste Schritte
- relevante Fakten, Namen und Dienste
Erfinde nichts, spekuliere nicht und formuliere keine neuen Anweisungen.
Antworte ausschließlich mit dem Summary, ohne Einleitung, maximal 800 Wörter.`;

const SUMMARY_SYSTEM_EN = `You maintain the internal memory of a personal assistant.
Condense the conversation so far into a concise, factual summary.
Keep:
- decisions and agreements
- the person's preferences and dislikes
- open tasks and next steps
- relevant facts, names and services
Do not invent, speculate or add new instructions.
Reply only with the summary, without an introduction, at most 800 words.`;

/**
 * Verdichtet ältere Thread-Nachrichten. Der Aufruf ist best effort: schlägt er
 * fehl, bleibt der Thread nutzbar und die letzten Nachrichten werden weiterhin
 * vollständig mitgegeben.
 */
export async function summarizeConversation(
  previous: string | null,
  transcript: string,
  locale: Locale,
): Promise<string | null> {
  const config = assistantConfig();
  if (!config || transcript.trim().length === 0) return null;
  const openrouter = config.baseUrl.includes('openrouter.ai');
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
        'http-referer': 'https://vyrx.de',
        'x-title': 'VYRX Assistant Memory',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: locale === 'de' ? SUMMARY_SYSTEM : SUMMARY_SYSTEM_EN },
          {
            role: 'user',
            content: [
              previous ? `Bisheriges Summary:\n${previous}` : 'Bisheriges Summary: keines',
              `Ältere Nachrichten:\n${transcript}`,
            ].join('\n\n'),
          },
        ],
        max_tokens: 800,
        temperature: 0.2,
        stream: false,
        ...(openrouter ? { reasoning: { enabled: false } } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      await response.text().catch(() => '');
      return null;
    }
    const body = (await response.json()) as {
      choices?: readonly { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    const summary = content.trim();
    return summary.length > 0 ? summary.slice(0, 6000) : null;
  } catch {
    return null;
  }
}
