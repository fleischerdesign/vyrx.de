import de from './de.json';
import en from './en.json';

export type Locale = 'de' | 'en';

export const translations = {
  de,
  en
} as const;

export function useTranslations(locale: Locale) {
  return translations[locale] || translations.de;
}
