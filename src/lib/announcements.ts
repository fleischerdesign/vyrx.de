/*
 * Ankündigungen kommen zuerst aus einer Datei im Repository (Entscheidung 4 in
 * `06-entscheidungen.md`). Die kleinste Sache, die wirkt; ersetzt wird sie,
 * wenn es weh tut, nicht vorher.
 *
 * Eine Ankündigung trägt einen Zeitraum. Abgelaufene verschwinden von selbst,
 * ohne dass jemand aufräumt. Die Zielgruppe folgt derselben Regel wie ein
 * Dienst: leere Liste heißt alle.
 *
 * Beispiel:
 *   {
 *     "id": "2026-10-wartung",
 *     "from": "2026-10-01",
 *     "to": "2026-10-03",
 *     "audience": ["family"],
 *     "text": { "de": "…", "en": "…" },
 *     "href": "/wissen/…",
 *     "hrefLabel": { "de": "Mehr dazu", "en": "More" }
 *   }
 */

import { z } from 'astro/zod';
import raw from '../data/announcements.json';
import { opensFor } from './authz.ts';
import type { Locale } from './locale.ts';

const localized = z.object({ de: z.string().min(1), en: z.string().min(1) });

export const announcementSchema = z.object({
  id: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  audience: z.array(z.string()).default([]),
  text: localized,
  href: z.string().optional(),
  hrefLabel: localized.optional(),
});

export type Announcement = z.infer<typeof announcementSchema>;

const ALL: readonly Announcement[] = z.array(announcementSchema).parse(raw);

export function activeAnnouncements(groups: readonly string[], today = new Date().toISOString().slice(0, 10)): readonly Announcement[] {
  return ALL.filter(
    (entry) => opensFor(entry.audience, groups) && entry.from <= today && today <= entry.to,
  );
}

export const announcementText = (entry: Announcement, locale: Locale): string => entry.text[locale] || entry.text.de;
