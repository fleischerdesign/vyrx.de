/*
 * Themen sind Wege durch das Wissen, keine Ordner. Sie werden hier einmal
 * benannt, damit Beschriftung und Reihenfolge nicht je Artikel neu entstehen.
 * Ein Artikel darf in mehreren Themen stehen.
 */

import type { Locale } from './locale.ts';

export interface Topic {
  readonly id: string;
  readonly label: Record<Locale, string>;
  readonly order: number;
}

export const TOPICS: readonly Topic[] = [
  { id: 'start', label: { de: 'Einstieg & Zugang', en: 'Getting started' }, order: 10 },
  { id: 'devices', label: { de: 'Geräte', en: 'Devices' }, order: 20 },
  { id: 'media', label: { de: 'Medien', en: 'Media' }, order: 30 },
  { id: 'everyday', label: { de: 'Zuhause & Alltag', en: 'Home & everyday' }, order: 40 },
  { id: 'problems', label: { de: 'Wenn etwas hakt', en: 'When something fails' }, order: 50 },
];

export const topicById = (id: string): Topic | undefined => TOPICS.find((topic) => topic.id === id);

export function topicLabel(id: string, locale: Locale): string {
  return topicById(id)?.label[locale] ?? id;
}
