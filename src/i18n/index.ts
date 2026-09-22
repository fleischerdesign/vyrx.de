import de from './de.json';
import en from './en.json';

export type Locale = 'de' | 'en';

export const translations = {
  de,
  en
} as const;

// A missing key used to render as nothing: `esc(undefined)` is `String('')`, so an undeclared key
// showed up as an empty label and was indistinguishable from a deliberate blank - which is how
// `statusNodes` went missing from two views without anybody noticing. The lookup is the only place
// that knows a key is absent, so it answers with the key itself: visible in the page, greppable in
// the source. The alternative, throwing, would turn a typo into a blank screen for a real user.
export function useTranslations(locale: Locale) {
  const table = (translations[locale] || translations.de) as Record<string, string>;
  return new Proxy(table, {
    get: (target: Record<string, string>, key: string | symbol) => {
      // Symbol lookups (`Symbol.toPrimitive`, inspection, ...) are the language's, not ours.
      if (typeof key === 'symbol') return undefined;
      return key in target ? target[key] : `\u27e8${key}\u27e9`;
    },
  });
}
