/*
 * Die Wissensbibliothek: lesen, ordnen, filtern.
 *
 * Ein Artikel gehört dem Wiki, nicht einem Dienst. `services` ist ein
 * optionaler Querverweis; `visibility` entscheidet, ob ein Artikel auch ohne
 * Anmeldung gelesen werden darf. Beide Fragen werden hier beantwortet, damit
 * Liste, Suche und Direktadresse dieselbe Antwort geben.
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { MessageKey } from '../i18n/index.ts';
import type { Identity } from './identity.ts';
import type { Locale } from './locale.ts';
import { canRead, isPublic } from './visibility.ts';

export type Article = CollectionEntry<'knowledge'>;

/** Die Art eines Artikels als Übersetzungsschlüssel - einmal abgebildet. */
export const KIND_KEY: Readonly<Record<Article['data']['kind'], MessageKey>> = {
  guide: 'knowledgeKindGuide',
  explanation: 'knowledgeKindExplanation',
  troubleshooting: 'knowledgeKindTroubleshooting',
  reference: 'knowledgeKindReference',
};

export const articleLang = (article: Article): Locale => (article.id.startsWith('en/') ? 'en' : 'de');

export const articleSlug = (article: Article): string => article.id.split('/').slice(1).join('/');

export const isPublicArticle = (article: Article): boolean => isPublic(article.data.visibility);

/** Ob diese Identität den Artikel lesen darf. */
export const canReadArticle = (article: Article, identity: Identity | null): boolean =>
  canRead(article.data.visibility, identity !== null);

/** Alle Artikel einer Sprache, in redaktioneller Reihenfolge. */
export async function articlesFor(locale: Locale): Promise<readonly Article[]> {
  const all = await getCollection('knowledge');
  return all
    .filter((article) => articleLang(article) === locale)
    .sort(
      (a, b) => a.data.order - b.data.order || articleSlug(a).localeCompare(articleSlug(b), locale),
    );
}

export async function findArticle(locale: Locale, slug: string): Promise<Article | undefined> {
  return getEntry('knowledge', `${locale}/${slug}`);
}

/** Artikel, die einen Dienst als Kontext nennen. */
export function articlesForService(articles: readonly Article[], serviceId: string): readonly Article[] {
  return articles.filter((article) => article.data.services.includes(serviceId));
}

/** Was die Suche durchsucht: Titel, Kurzantwort, Thema, Art und der Text selbst. */
export function searchText(article: Article): string {
  return [
    article.data.title,
    article.data.summary,
    article.data.outcome ?? '',
    article.data.kind,
    article.data.topics.join(' '),
    article.data.services.join(' '),
    article.body ?? '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('de');
}
