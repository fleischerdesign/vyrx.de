import { de } from './de.ts';
import { en } from './en.ts';
import type { Locale } from '../lib/locale.ts';

export type MessageKey = keyof typeof de;
export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

const tables: Record<Locale, Record<MessageKey, string>> = { de, en };

/**
 * Übersetzt einen Schlüssel. Ein Schlüssel, den es nicht gibt, erscheint als
 * `⟨key⟩` – sichtbar und auffindbar, statt als leere Fläche. Werte werden als
 * `{name}` eingesetzt.
 */
export function useTranslations(locale: Locale): Translate {
  const table = tables[locale] ?? tables.de;
  return (key, values) => {
    const template = table[key] ?? `\u27e8${key}\u27e9`;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
    );
  };
}
