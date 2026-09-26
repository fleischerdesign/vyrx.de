import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Wissen als Inhaltssammlung, nicht als Code.
 *
 * Ein Artikel lebt in `src/content/knowledge/<sprache>/<slug>.md`. Er gehört
 * dem Wiki, nicht einem Dienst: `services` ist ein optionaler Querverweis und
 * darf leer sein. Ein fehlendes Pflichtfeld bricht den Bau - ein Artikel ohne
 * Titel oder Kurzantwort ist kein Artikel.
 */
const knowledge = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/knowledge' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    /** Der Satz, der vor den Schritten sagt, was die Person erreicht. */
    outcome: z.string().min(1).optional(),
    /** Tiefe für Interessierte: erst auf Wunsch sichtbar. */
    technical: z.string().min(1).optional(),
    kind: z.enum(['guide', 'explanation', 'troubleshooting', 'reference']),
    topics: z.array(z.string()).default([]),
    /** Optionale Verweise auf Dienste - der Artikel braucht sie nicht. */
    services: z.array(z.string()).default([]),
    visibility: z.enum(['public', 'internal']).default('internal'),
    /** ISO-Datum der letzten redaktionellen Prüfung; leer heißt „noch nicht geprüft". */
    reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    related: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

export const collections = { knowledge };
