/*
 * Die Betriebsquelle: was außerhalb des Dienstekatalogs über den Betrieb
 * bekannt ist - Sicherungen, Zertifikate, Baumgesundheit.
 *
 * Sie ist bewusst **kein** Live-Blick auf die Flotte: sie liest eine Ableitung,
 * die ihren eigenen Zeitpunkt mitbringt. Jede Zeile kann damit sagen, wie alt
 * sie ist. Im Entwicklungsbetrieb kommt sie aus einer Datei, später aus
 * `nixfiles` und dem Kollektor - die Form bleibt dieselbe.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';
import { isDevBuild } from './env.ts';

const backupSchema = z.object({
  target: z.string().min(1),
  lastRunAt: z.string().min(1),
  state: z.enum(['ok', 'overdue', 'failed']),
});

const certificateSchema = z.object({
  name: z.string().min(1),
  expiresAt: z.string().min(1),
  issuer: z.string().optional(),
});

export const operationsSchema = z.object({
  schema: z.literal(1),
  revision: z.string().min(1),
  generatedAt: z.string().min(1),
  backups: z.array(backupSchema).default([]),
  certificates: z.array(certificateSchema).default([]),
  tree: z
    .object({
      lastCheckAt: z.string().min(1),
      checkState: z.enum(['ok', 'failed']),
      lastDeployAt: z.string().optional(),
    })
    .optional(),
});

export type Operations = z.infer<typeof operationsSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type Certificate = z.infer<typeof certificateSchema>;

function source(): string | null {
  const explicit = process.env.PORTAL_OPERATIONS?.trim();
  if (explicit) return resolve(explicit);
  if (isDevBuild()) return resolve('fixtures/operations.example.json');
  return null;
}

export function loadOperations(): Operations | null {
  const path = source();
  if (!path) return null;
  try {
    const parsed = operationsSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Wie viele Tage ein Zertifikat noch gilt; negativ heißt abgelaufen. */
export function daysLeft(expiresAt: string, now = Date.now()): number {
  const at = Date.parse(expiresAt);
  return Number.isFinite(at) ? Math.floor((at - now) / 86_400_000) : Number.NaN;
}

/** Wie viele Stunden eine Sicherung alt ist. */
export function hoursSince(isoDate: string, now = Date.now()): number {
  const at = Date.parse(isoDate);
  return Number.isFinite(at) ? Math.floor((now - at) / 3_600_000) : Number.NaN;
}

/** Die Schwelle, ab der ein Zertifikat Aufmerksamkeit verdient (14 Tage). */
export const CERTIFICATE_WARN_DAYS = 14;
