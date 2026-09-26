/*
 * Die Katalog-Projektion aus der Nix-Konfiguration.
 *
 * Dies ist die einzige Stelle, die die Datei liest. Sie liegt zur Laufzeit
 * neben dem Prozess und erreicht **nie** den Browser: der Server liest sie,
 * prüft die Berechtigung und gibt nur die sichtbaren Felder weiter.
 *
 * Das Schema ist die Schnittstelle zwischen nixfiles und dieser App. Eine
 * unbekannte Form wird abgelehnt (nicht geraten) - die Seite sagt dann
 * ehrlich, dass keine Projektion vorliegt.
 */

import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';
import { isDevBuild } from './env.ts';

const localizedText = z.object({
  de: z.string().min(1),
  en: z.string().min(1),
});

const scopeSchema = z.enum(['public', 'internal', 'mesh', 'isolated']);

const categorySchema = z.object({
  id: z.string().min(1),
  label: localizedText,
  order: z.number().int().default(0),
});

export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'service ids are lowercase slugs'),
  name: localizedText,
  summary: localizedText,
  categoryId: z.string().min(1),
  /** Ein Symbolname aus der Projektion; unbekannt heißt: das neutrale Symbol. */
  icon: z.string().min(1).optional(),
  scope: scopeSchema,
  /** Leer heißt: für alle sichtbar. Sonst genügt eine passende Gruppe. */
  accessGroups: z.array(z.string()).default([]),
  /** Gruppen, die diesen Dienst verwalten dürfen (nicht: sehen). */
  adminGroups: z.array(z.string()).default([]),
  /** Wer für diesen Dienst verantwortlich ist - eine Aussage über Menschen, keine Rolle. */
  owners: z.array(z.string()).default([]),
  /** Kennungen anderer Dienste, von denen dieser abhängt (Wirkung, nicht Topologie). */
  dependsOn: z.array(z.string()).default([]),
  /** Was man mit diesem Dienst tun kann; die Kennungen gehören zum Vertrag. */
  actions: z.array(z.string()).default([]),
  url: z.url(),
  monitored: z.boolean().default(false),
});

export const fleetSchema = z.object({
  schema: z.literal(1),
  revision: z.string().min(1),
  generatedAt: z.string().min(1),
  locales: z.array(z.enum(['de', 'en'])).default(['de', 'en']),
  adminGroups: z.array(z.string()).default([]),
  categories: z.array(categorySchema),
  services: z.array(serviceSchema),
});

export type Fleet = z.infer<typeof fleetSchema>;
export type FleetService = z.infer<typeof serviceSchema>;
export type FleetCategory = z.infer<typeof categorySchema>;
export type Scope = z.infer<typeof scopeSchema>;
export type LocalizedText = z.infer<typeof localizedText>;

let cache: { source: string; mtimeMs: number; value: Fleet | null } | null = null;

function source(): string | null {
  if (process.env.PORTAL_FLEET) return resolve(process.env.PORTAL_FLEET);
  // Nur in der Entwicklung gibt es einen Ersatz. Im Betrieb ohne Projektion
  // bleibt der Katalog leer und die Seite sagt das - kein stilles Fixture.
  if (isDevBuild()) return resolve('fixtures/fleet.example.json');
  return null;
}

/** Die Projektion, oder `null`, wenn keine gültige vorliegt. */
export function loadFleet(): Fleet | null {
  const path = source();
  if (!path) return null;
  try {
    const mtimeMs = statSync(path).mtimeMs;
    if (cache && cache.source === path && cache.mtimeMs === mtimeMs) return cache.value;
    const parsed = fleetSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    const value = parsed.success ? parsed.data : null;
    cache = { source: path, mtimeMs, value };
    return value;
  } catch {
    cache = { source: path, mtimeMs: 0, value: null };
    return null;
  }
}

/** Der Text in der gewünschten Sprache, mit Deutsch als Rückfall. */
export function text(value: LocalizedText, locale: 'de' | 'en'): string {
  return value[locale] || value.de;
}
