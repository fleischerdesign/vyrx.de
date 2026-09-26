/*
 * Der eigene Speicher des Portals.
 *
 * Es gibt genau einen: eine SQLite-Datei mit einer Schemaversion. Alles andere
 * wird gelesen, nicht geschrieben. Das ist die Entscheidung E-0009, hier
 * ausgeführt.
 *
 * Zwei Regeln gelten für jede Abfrage in dieser Datei:
 *
 *   1. **Der Eigentümer ist Teil der Abfrage.** Es gibt keine Funktion, die
 *      Zeilen ohne `owner` liest. Fremde Daten sind damit nicht "gefiltert",
 *      sondern unerreichbar.
 *   2. **Hier steht kein Name, keine Adresse, kein Text aus der Außenwelt.**
 *      Gespeichert werden Kennungen; wie etwas heißt, weiß die Darstellung.
 *
 * Der Zugriff ist synchron. Der Prozess ist ein einzelner und die Abfragen
 * sind winzig - eine Ereignisschleife, die auf eine lokale Datei wartet, wäre
 * die teurere Antwort.
 */

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 3;

export interface Report {
  readonly id: number;
  readonly serviceId: string | null;
  readonly body: string;
  readonly state: 'open' | 'done';
  readonly createdAt: string;
}

/** Ein geplantes Fenster: es verschwindet von selbst, wenn seine Zeit vorbei ist. */
export interface Maintenance {
  readonly id: number;
  /** `null` heißt: alle Angebote. */
  readonly serviceId: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly note: string | null;
}

/** Ein Eingriff, der stattgefunden hat - oder abgelehnt wurde. Kein Eingriff ohne Spur. */
export interface AuditEntry {
  readonly id: number;
  readonly actor: string;
  readonly serviceId: string;
  readonly actionId: string;
  readonly outcome: 'accepted' | 'refused' | 'failed';
  readonly at: string;
}

let database: DatabaseSync | null = null;

const file = (): string => resolve(process.env.PORTAL_STORE ?? '.data/portal.sqlite');

function migrate(db: DatabaseSync): void {
  const current = Number((db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined)?.user_version ?? 0);
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    db.exec(`
      CREATE TABLE favorite (
        owner       TEXT NOT NULL,
        service_id  TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        PRIMARY KEY (owner, service_id)
      );

      CREATE TABLE report (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        owner       TEXT NOT NULL,
        service_id  TEXT,
        body        TEXT NOT NULL,
        state       TEXT NOT NULL DEFAULT 'open',
        created_at  TEXT NOT NULL
      );

      CREATE INDEX report_by_owner ON report (owner, created_at DESC);
    `);
  }

  if (current < 2) {
    // Wartungsfenster sind Betriebswissen, nicht Personendaten: alle lesen sie,
    // nur Berechtigte setzen sie. Sie brauchen keinen Eigentümer, sondern eine
    // Zeit - danach sind sie von selbst vorbei.
    db.exec(`
      CREATE TABLE maintenance (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id  TEXT,
        starts_at   TEXT NOT NULL,
        ends_at     TEXT NOT NULL,
        note        TEXT,
        created_by  TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );

      CREATE INDEX maintenance_by_time ON maintenance (ends_at);
    `);
  }

  if (current < 3) {
    // Eine Aktion ohne Spur gibt es nicht. Was hier steht, ist keine Meinung:
    // wer, was, wann und mit welchem Ergebnis.
    db.exec(`
      CREATE TABLE audit (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        actor       TEXT NOT NULL,
        service_id  TEXT NOT NULL,
        action_id   TEXT NOT NULL,
        outcome     TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );

      CREATE INDEX audit_by_time ON audit (created_at DESC);
    `);
  }

  // Kein Platzhalter möglich: PRAGMA kennt keine Parameter. Der Wert ist eine Konstante.
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

function open(): DatabaseSync {
  if (database) return database;
  const target = file();
  mkdirSync(dirname(target), { recursive: true });
  const db = new DatabaseSync(target);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  database = db;
  return db;
}

const now = (): string => new Date().toISOString();

// ------------------------------------------------------------------------------------------------
// Favoriten: der Eigentümer ist der Schlüssel, nicht ein Filter
// ------------------------------------------------------------------------------------------------

export function favoritesOf(owner: string): readonly string[] {
  const rows = open()
    .prepare('SELECT service_id FROM favorite WHERE owner = ? ORDER BY created_at DESC')
    .all(owner) as { service_id: string }[];
  return rows.map((row) => row.service_id);
}

/** Kehrt den Zustand um und sagt, wie er danach ist. */
export function toggleFavorite(owner: string, serviceId: string): boolean {
  const db = open();
  const existing = db.prepare('SELECT 1 AS there FROM favorite WHERE owner = ? AND service_id = ?').get(owner, serviceId);
  if (existing) {
    db.prepare('DELETE FROM favorite WHERE owner = ? AND service_id = ?').run(owner, serviceId);
    return false;
  }
  db.prepare('INSERT INTO favorite (owner, service_id, created_at) VALUES (?, ?, ?)').run(owner, serviceId, now());
  return true;
}

// ------------------------------------------------------------------------------------------------
// Meldungen: ein Anliegen, das diese Person selbst gestellt hat
// ------------------------------------------------------------------------------------------------

export function createReport(input: {
  owner: string;
  body: string;
  serviceId?: string | null;
}): number {
  const result = open()
    .prepare('INSERT INTO report (owner, service_id, body, state, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(input.owner, input.serviceId ?? null, input.body, 'open', now());
  return Number(result.lastInsertRowid);
}

export function reportsOf(owner: string): readonly Report[] {
  const rows = open()
    .prepare('SELECT id, service_id, body, state, created_at FROM report WHERE owner = ? ORDER BY created_at DESC')
    .all(owner) as { id: number; service_id: string | null; body: string; state: string; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    serviceId: row.service_id,
    body: row.body,
    state: row.state === 'done' ? 'done' : 'open',
    createdAt: row.created_at,
  }));
}

// ------------------------------------------------------------------------------------------------
// Wartungsfenster: Betriebswissen mit einer Zeit, kein Personendatum
// ------------------------------------------------------------------------------------------------

export function addMaintenance(input: {
  serviceId: string | null;
  startsAt: string;
  endsAt: string;
  note: string | null;
  createdBy: string;
}): number {
  const db = open();
  // Abgelaufenes von vorgestern muss niemand mehr sehen.
  db.prepare('DELETE FROM maintenance WHERE ends_at < ?').run(new Date(Date.now() - 7 * 86_400_000).toISOString());
  const result = db
    .prepare('INSERT INTO maintenance (service_id, starts_at, ends_at, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.serviceId, input.startsAt, input.endsAt, input.note, input.createdBy, now());
  return Number(result.lastInsertRowid);
}

export function removeMaintenance(id: number): void {
  open().prepare('DELETE FROM maintenance WHERE id = ?').run(id);
}

/** Die Fenster, die noch nicht vorbei sind - laufende zuerst. */
export function maintenanceFrom(at = new Date().toISOString()): readonly Maintenance[] {
  const rows = open()
    .prepare('SELECT id, service_id, starts_at, ends_at, note FROM maintenance WHERE ends_at >= ? ORDER BY starts_at')
    .all(at) as { id: number; service_id: string | null; starts_at: string; ends_at: string; note: string | null }[];
  return rows.map((row) => ({
    id: row.id,
    serviceId: row.service_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    note: row.note,
  }));
}

// ------------------------------------------------------------------------------------------------
// Eingriffe: eine Zeile je Versuch, nicht je Erfolg
// ------------------------------------------------------------------------------------------------

export function recordAction(input: {
  actor: string;
  serviceId: string;
  actionId: string;
  outcome: AuditEntry['outcome'];
}): void {
  open()
    .prepare('INSERT INTO audit (actor, service_id, action_id, outcome, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(input.actor, input.serviceId, input.actionId, input.outcome, now());
}

export function recentActions(limit = 10): readonly AuditEntry[] {
  const rows = open()
    .prepare('SELECT id, actor, service_id, action_id, outcome, created_at FROM audit ORDER BY created_at DESC LIMIT ?')
    .all(limit) as { id: number; actor: string; service_id: string; action_id: string; outcome: string; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    actor: row.actor,
    serviceId: row.service_id,
    actionId: row.action_id,
    outcome: row.outcome === 'refused' || row.outcome === 'failed' ? row.outcome : 'accepted',
    at: row.created_at,
  }));
}

// ------------------------------------------------------------------------------------------------
// Gesundheit: der Speicher ist eine Abhängigkeit wie jede andere
// ------------------------------------------------------------------------------------------------

export function storeHealth(): 'ok' | 'down' {
  try {
    open().prepare('SELECT 1 AS ok').get();
    return 'ok';
  } catch {
    return 'down';
  }
}

/** Nur für Prüfungen und Tests: vergisst die geöffnete Datei. */
export function closeStore(): void {
  database?.close();
  database = null;
}

export type { StatementSync };
