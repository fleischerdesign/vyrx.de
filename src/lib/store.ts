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

import { randomBytes } from 'node:crypto';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 14;

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

  if (current < 4) {
    // Die Seerr-User-ID ist die Brücke zu einem externen System, keine
    // Personendatenkopie. E-Mail/Benutzername stehen nur als Diagnose daneben;
    // jede Anfrage läuft über X-Api-User mit dieser ID.
    db.exec(`
      CREATE TABLE media_user (
        owner            TEXT PRIMARY KEY,
        seerr_user_id    INTEGER NOT NULL,
        seerr_email      TEXT,
        seerr_username   TEXT,
        verified_at      TEXT NOT NULL
      );
    `);
  }

  if (current < 5) {
    // Ein Vorschlag ist noch keine Anfrage. Er ist an eine Person gebunden,
    // läuft nach zehn Minuten ab und kann genau einmal ausgeführt werden.
    db.exec(`
      CREATE TABLE media_proposal (
        id            TEXT PRIMARY KEY,
        actor         TEXT NOT NULL,
        service_id    TEXT NOT NULL,
        action_id     TEXT NOT NULL,
        payload_json  TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        expires_at    TEXT NOT NULL,
        consumed_at   TEXT,
        outcome       TEXT,
        result_json   TEXT
      );

      CREATE INDEX media_proposal_by_actor ON media_proposal (actor, created_at DESC);
    `);
  }

  if (current < 6) {
    // Der Chatverlauf ist personenbezogener Inhalt und wird deshalb pro
    // Eigentümer gespeichert. Das ist die bewusste Ausnahme von der Regel,
    // dass hier kein Text aus der Außenwelt liegt: der Text gehört der Person,
    // die ihn geschrieben hat, und ist ohne deren owner nicht erreichbar.
    db.exec(`
      CREATE TABLE assistant_thread (
        id          TEXT PRIMARY KEY,
        owner       TEXT NOT NULL,
        title       TEXT NOT NULL,
        pinned      INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE INDEX assistant_thread_by_owner ON assistant_thread (owner, pinned DESC, updated_at DESC);

      CREATE TABLE assistant_message (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id       TEXT NOT NULL REFERENCES assistant_thread(id) ON DELETE CASCADE,
        owner           TEXT NOT NULL,
        role            TEXT NOT NULL,
        content         TEXT NOT NULL,
        ui_json         TEXT,
        sources_json    TEXT,
        navigations_json TEXT,
        created_at      TEXT NOT NULL
      );

      CREATE INDEX assistant_message_by_thread ON assistant_message (thread_id, id);
    `);
  }

  if (current < 7) {
    // Benachrichtigungen sind personenbezogen und werden wie Threads über den
    // Owner gelesen. media_status_seen verhindert, dass derselbe Übergang
    // mehrfach benachrichtigt wird.
    db.exec(`
      CREATE TABLE notification (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        owner       TEXT NOT NULL,
        kind        TEXT NOT NULL,
        title       TEXT NOT NULL,
        body        TEXT,
        href        TEXT,
        created_at  TEXT NOT NULL,
        read_at     TEXT
      );

      CREATE INDEX notification_by_owner ON notification (owner, read_at, created_at DESC);

      CREATE TABLE media_status_seen (
        owner       TEXT NOT NULL,
        media_type  TEXT NOT NULL,
        tmdb_id     INTEGER NOT NULL,
        status      TEXT NOT NULL,
        seen_at     TEXT NOT NULL,
        PRIMARY KEY (owner, media_type, tmdb_id)
      );
    `);
  }

  if (current < 8) {
    // Web-Push-Endpunkte sind Geräte, keine Personen. Der Owner bleibt Teil
    // jedes Zugriffs; ein Gerät kann nur seine eigenen Endpunkte abmelden.
    db.exec(`
      CREATE TABLE push_subscription (
        endpoint    TEXT PRIMARY KEY,
        owner       TEXT NOT NULL,
        p256dh      TEXT NOT NULL,
        auth        TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        user_agent  TEXT
      );

      CREATE INDEX push_subscription_by_owner ON push_subscription (owner);
    `);
  }

  if (current < 9) {
    // Ruhezeit und Kategorien sind eine Meinung pro Person, kein globaler Schalter.
    db.exec(`
      CREATE TABLE notification_preference (
        owner        TEXT PRIMARY KEY,
        push         INTEGER NOT NULL DEFAULT 1,
        quiet_start  TEXT,
        quiet_end    TEXT,
        request      INTEGER NOT NULL DEFAULT 1,
        routine      INTEGER NOT NULL DEFAULT 1,
        updated_at   TEXT NOT NULL
      );
    `);
  }

  if (current < 10) {
    // Ein Watch ist die kleinste Einheit, die einen Statusübergang genau einmal
    // erzeugen kann: Owner + Medientyp + TMDB-ID + Qualität.
    db.exec(`
      CREATE TABLE media_watch (
        owner               TEXT NOT NULL,
        media_type          TEXT NOT NULL,
        tmdb_id             INTEGER NOT NULL,
        is4k                INTEGER NOT NULL DEFAULT 0,
        title               TEXT NOT NULL,
        locale              TEXT NOT NULL DEFAULT 'de',
        seasons_json        TEXT,
        request_ids_json    TEXT,
        last_status         TEXT NOT NULL,
        last_request_status TEXT,
        active              INTEGER NOT NULL DEFAULT 1,
        misses              INTEGER NOT NULL DEFAULT 0,
        failures            INTEGER NOT NULL DEFAULT 0,
        last_checked_at     TEXT,
        next_check_at       TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL,
        PRIMARY KEY (owner, media_type, tmdb_id, is4k)
      );

      CREATE INDEX media_watch_active ON media_watch (active, next_check_at);

      CREATE TABLE media_watch_event (
        owner       TEXT NOT NULL,
        media_type  TEXT NOT NULL,
        tmdb_id     INTEGER NOT NULL,
        is4k        INTEGER NOT NULL,
        event       TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        PRIMARY KEY (owner, media_type, tmdb_id, is4k, event)
      );
    `);
  }

  if (current < 11) {
    // Einmalige stille Baseline für Anfragen, die vor dem Watch-Feature existierten.
    db.exec(`
      CREATE TABLE media_scan_state (
        owner         TEXT PRIMARY KEY,
        backfilled_at TEXT NOT NULL
      );
    `);
  }

  if (current < 12) {
    // Compaction: ältere Turns werden zu einem geprüften Summary verdichtet,
    // die letzten Nachrichten bleiben vollständig. Der Client schickt nie den
    // gesamten Thread an das Modell.
    db.exec(`
      ALTER TABLE assistant_thread ADD COLUMN summary TEXT;
      ALTER TABLE assistant_thread ADD COLUMN summary_until_id INTEGER;
      ALTER TABLE assistant_thread ADD COLUMN summary_updated_at TEXT;
    `);
  }

  if (current < 13) {
    // Routinen sind Code, ihr Laufzustand ist Daten. Eine Zeile pro Owner und
    // Routine; der nächste Lauf wird beim ersten Sehen geplant, nie sofort
    // ausgelöst.
    db.exec(`
      CREATE TABLE routine_state (
        owner        TEXT NOT NULL,
        routine_id   TEXT NOT NULL,
        next_run_at  TEXT NOT NULL,
        last_run_at  TEXT,
        last_status  TEXT,
        last_error   TEXT,
        PRIMARY KEY (owner, routine_id)
      );
    `);
  }

  if (current < 14) {
    // Onboarding ist ein einmaliger, serverseitig gespeicherter Zustand. Ein
    // Cookie reicht nicht: derselbe Account kann auf mehreren Geräten öffnen.
    db.exec(`
      CREATE TABLE onboarding_state (
        owner              TEXT PRIMARY KEY,
        welcome_seen_at    TEXT,
        favorites_done_at  TEXT,
        assistant_done_at  TEXT,
        dismissed_at       TEXT,
        completed_at       TEXT,
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL
      );
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
// Medien: Portal-Identität -> Seerr-Identität
// ------------------------------------------------------------------------------------------------

export interface MediaUserMapping {
  readonly seerrUserId: number;
  readonly seerrEmail: string | null;
  readonly seerrUsername: string | null;
  readonly verifiedAt: string;
}

export function mediaUserOf(owner: string): MediaUserMapping | null {
  const row = open()
    .prepare('SELECT seerr_user_id, seerr_email, seerr_username, verified_at FROM media_user WHERE owner = ?')
    .get(owner) as
    | { seerr_user_id: number; seerr_email: string | null; seerr_username: string | null; verified_at: string }
    | undefined;
  return row
    ? {
        seerrUserId: row.seerr_user_id,
        seerrEmail: row.seerr_email,
        seerrUsername: row.seerr_username,
        verifiedAt: row.verified_at,
      }
    : null;
}

export function saveMediaUser(input: {
  owner: string;
  seerrUserId: number;
  seerrEmail: string | null;
  seerrUsername: string | null;
}): void {
  open()
    .prepare(
      `INSERT INTO media_user (owner, seerr_user_id, seerr_email, seerr_username, verified_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET
         seerr_user_id = excluded.seerr_user_id,
         seerr_email = excluded.seerr_email,
         seerr_username = excluded.seerr_username,
         verified_at = excluded.verified_at`
    )
    .run(input.owner, input.seerrUserId, input.seerrEmail, input.seerrUsername, now());
}

export function removeMediaUser(owner: string): void {
  open().prepare('DELETE FROM media_user WHERE owner = ?').run(owner);
}

// ------------------------------------------------------------------------------------------------
// Medien-Vorschläge: vorbereitet, noch nicht geschrieben
// ------------------------------------------------------------------------------------------------

export interface MediaProposalPayload {
  readonly mediaType: 'movie' | 'tv';
  readonly tmdbId: number;
  readonly title: string;
  readonly year: string | null;
  readonly seerrUserId: number;
  readonly seasons: readonly number[] | null;
  readonly is4k: boolean;
}

export interface MediaProposal {
  readonly id: string;
  readonly actor: string;
  readonly serviceId: string;
  readonly actionId: string;
  readonly payload: MediaProposalPayload;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly outcome: string | null;
  readonly result: unknown;
}

export function createMediaProposal(input: {
  actor: string;
  serviceId: string;
  actionId: string;
  payload: MediaProposalPayload;
  expiresAt: string;
}): string {
  const id = randomBytes(16).toString('base64url');
  open()
    .prepare(
      'INSERT INTO media_proposal (id, actor, service_id, action_id, payload_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(id, input.actor, input.serviceId, input.actionId, JSON.stringify(input.payload), now(), input.expiresAt);
  return id;
}

export function mediaProposalOf(id: string, actor: string): MediaProposal | null {
  const row = open()
    .prepare(
      'SELECT id, actor, service_id, action_id, payload_json, created_at, expires_at, consumed_at, outcome, result_json FROM media_proposal WHERE id = ? AND actor = ?',
    )
    .get(id, actor) as
    | {
        id: string;
        actor: string;
        service_id: string;
        action_id: string;
        payload_json: string;
        created_at: string;
        expires_at: string;
        consumed_at: string | null;
        outcome: string | null;
        result_json: string | null;
      }
    | undefined;
  if (!row) return null;
  let payload: MediaProposalPayload;
  try {
    payload = JSON.parse(row.payload_json) as MediaProposalPayload;
  } catch {
    return null;
  }
  let result: unknown = null;
  if (row.result_json) {
    try {
      result = JSON.parse(row.result_json);
    } catch {
      result = null;
    }
  }
  return {
    id: row.id,
    actor: row.actor,
    serviceId: row.service_id,
    actionId: row.action_id,
    payload,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    outcome: row.outcome,
    result,
  };
}

/** Nach dem Claim: Ergebnis festhalten, ohne den Claim erneut zu öffnen. */
export function finishMediaProposal(id: string, outcome: string, result: unknown): boolean {
  const changed = open()
    .prepare('UPDATE media_proposal SET outcome = ?, result_json = ? WHERE id = ? AND outcome = ?')
    .run(outcome, JSON.stringify(result), id, 'pending');
  return Number(changed.changes) === 1;
}

export function countRecentMediaProposals(actor: string, since: string): number {
  const row = open()
    .prepare(
      'SELECT COUNT(*) AS n FROM media_proposal WHERE actor = ? AND consumed_at IS NOT NULL AND consumed_at >= ?',
    )
    .get(actor, since) as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

/** Genau einmal: Der Vergleich auf consumed_at passiert in der UPDATE-Anweisung. */
export function consumeMediaProposal(
  id: string,
  actor: string,
  outcome: string,
  result: unknown,
): boolean {
  const changed = open()
    .prepare(
      'UPDATE media_proposal SET consumed_at = ?, outcome = ?, result_json = ? WHERE id = ? AND actor = ? AND consumed_at IS NULL',
    )
    .run(now(), outcome, JSON.stringify(result), id, actor);
  return Number(changed.changes) === 1;
}

// ------------------------------------------------------------------------------------------------
// Assistenten-Threads: Text gehört der Person, nicht dem Dienst
// ------------------------------------------------------------------------------------------------

export interface AssistantThreadSummary {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly pinned: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AssistantThreadMessage {
  readonly id: number;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly ui: readonly unknown[] | null;
  readonly sources: readonly unknown[] | null;
  readonly navigations: readonly unknown[] | null;
  readonly createdAt: string;
}

export interface AssistantThreadDetail extends AssistantThreadSummary {
  readonly messages: readonly AssistantThreadMessage[];
  readonly summary: string | null;
  readonly summaryUntilId: number | null;
}

const cleanTitle = (value: string): string => {
  const title = value.replace(/\s+/g, ' ').trim().slice(0, 120);
  return title || 'Neue Unterhaltung';
};

const parseJson = (value: string | null): readonly unknown[] | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const summaryFromRow = (row: {
  id: string;
  title: string;
  preview: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}): AssistantThreadSummary => ({
  id: row.id,
  title: row.title,
  preview: (row.preview ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
  pinned: row.pinned === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createAssistantThread(owner: string, title: string): AssistantThreadSummary {
  const db = open();
  const id = randomBytes(16).toString('base64url');
  const at = now();
  const clean = cleanTitle(title);
  db.prepare('INSERT INTO assistant_thread (id, owner, title, pinned, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(
    id,
    owner,
    clean,
    at,
    at,
  );
  return { id, title: clean, preview: '', pinned: false, createdAt: at, updatedAt: at };
}

export function assistantThreadsOf(owner: string, limit = 50, query = ''): readonly AssistantThreadSummary[] {
  const capped = Math.max(1, Math.min(100, Math.trunc(limit)));
  const search = query.trim().slice(0, 120);
  const rows = search
    ? (open()
        .prepare(
          `SELECT t.id, t.title, t.pinned, t.created_at, t.updated_at,
             (SELECT m.content FROM assistant_message m WHERE m.thread_id = t.id AND m.owner = t.owner ORDER BY m.id DESC LIMIT 1) AS preview
           FROM assistant_thread t
           WHERE t.owner = ?
             AND (t.title LIKE ? ESCAPE '\\' OR EXISTS (
               SELECT 1 FROM assistant_message m
               WHERE m.thread_id = t.id AND m.owner = t.owner AND m.content LIKE ? ESCAPE '\\'
             ))
           ORDER BY t.pinned DESC, t.updated_at DESC
           LIMIT ?`,
        )
        .all(owner, `%${search}%`, `%${search}%`, capped) as unknown as {
        id: string;
        title: string;
        preview: string | null;
        pinned: number;
        created_at: string;
        updated_at: string;
      }[])
    : (open()
        .prepare(
          `SELECT t.id, t.title, t.pinned, t.created_at, t.updated_at,
             (SELECT m.content FROM assistant_message m WHERE m.thread_id = t.id AND m.owner = t.owner ORDER BY m.id DESC LIMIT 1) AS preview
           FROM assistant_thread t
           WHERE t.owner = ?
           ORDER BY t.pinned DESC, t.updated_at DESC
           LIMIT ?`,
        )
        .all(owner, capped) as unknown as {
        id: string;
        title: string;
        preview: string | null;
        pinned: number;
        created_at: string;
        updated_at: string;
      }[]);
  return rows.map(summaryFromRow);
}

export function assistantThreadOf(id: string, owner: string): AssistantThreadDetail | null {
  const db = open();
  const row = db
    .prepare('SELECT id, title, pinned, created_at, updated_at, summary, summary_until_id FROM assistant_thread WHERE id = ? AND owner = ?')
    .get(id, owner) as
    | {
        id: string;
        title: string;
        pinned: number;
        created_at: string;
        updated_at: string;
        summary: string | null;
        summary_until_id: number | null;
      }
    | undefined;
  if (!row) return null;
  const messages = db
    .prepare(
      `SELECT id, role, content, ui_json, sources_json, navigations_json, created_at
       FROM assistant_message WHERE thread_id = ? AND owner = ? ORDER BY id ASC`,
    )
    .all(id, owner) as {
    id: number;
    role: string;
    content: string;
    ui_json: string | null;
    sources_json: string | null;
    navigations_json: string | null;
    created_at: string;
  }[];
  const preview = messages.at(-1)?.content ?? '';
  return {
    ...summaryFromRow({ ...row, preview }),
    summary: row.summary,
    summaryUntilId: row.summary_until_id,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
      ui: parseJson(message.ui_json),
      sources: parseJson(message.sources_json),
      navigations: parseJson(message.navigations_json),
      createdAt: message.created_at,
    })),
  };
}

export interface AssistantThreadSummaryState {
  readonly summary: string | null;
  readonly summaryUntilId: number | null;
}

export function assistantThreadSummaryOf(id: string, owner: string): AssistantThreadSummaryState | null {
  const row = open()
    .prepare('SELECT summary, summary_until_id FROM assistant_thread WHERE id = ? AND owner = ?')
    .get(id, owner) as { summary: string | null; summary_until_id: number | null } | undefined;
  return row ? { summary: row.summary, summaryUntilId: row.summary_until_id } : null;
}

export function setAssistantThreadSummary(
  id: string,
  owner: string,
  summary: string,
  untilId: number,
): boolean {
  const changed = open()
    .prepare(
      'UPDATE assistant_thread SET summary = ?, summary_until_id = ?, summary_updated_at = ? WHERE id = ? AND owner = ?',
    )
    .run(summary.slice(0, 6000), untilId, now(), id, owner);
  return Number(changed.changes) === 1;
}

export function renameAssistantThread(id: string, owner: string, title: string): boolean {
  const changed = open()
    .prepare('UPDATE assistant_thread SET title = ?, updated_at = ? WHERE id = ? AND owner = ?')
    .run(cleanTitle(title), now(), id, owner);
  return Number(changed.changes) === 1;
}

export function pinAssistantThread(id: string, owner: string, pinned: boolean): boolean {
  const changed = open()
    .prepare('UPDATE assistant_thread SET pinned = ?, updated_at = ? WHERE id = ? AND owner = ?')
    .run(pinned ? 1 : 0, now(), id, owner);
  return Number(changed.changes) === 1;
}

export function deleteAssistantThread(id: string, owner: string): boolean {
  const changed = open().prepare('DELETE FROM assistant_thread WHERE id = ? AND owner = ?').run(id, owner);
  return Number(changed.changes) === 1;
}

export function appendAssistantMessages(
  threadId: string,
  owner: string,
  messages: readonly {
    readonly role: 'user' | 'assistant';
    readonly content: string;
    readonly ui?: readonly unknown[] | null;
    readonly sources?: readonly unknown[] | null;
    readonly navigations?: readonly unknown[] | null;
  }[],
): boolean {
  if (messages.length === 0) return false;
  const db = open();
  const ownerRow = db.prepare('SELECT 1 AS there FROM assistant_thread WHERE id = ? AND owner = ?').get(threadId, owner);
  if (!ownerRow) return false;
  const at = now();
  db.exec('BEGIN IMMEDIATE');
  try {
    const insert = db.prepare(
      'INSERT INTO assistant_message (thread_id, owner, role, content, ui_json, sources_json, navigations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    for (const message of messages) {
      insert.run(
        threadId,
        owner,
        message.role,
        message.content.slice(0, 20_000),
        message.ui ? JSON.stringify(message.ui) : null,
        message.sources ? JSON.stringify(message.sources) : null,
        message.navigations ? JSON.stringify(message.navigations) : null,
        at,
      );
    }
    db.prepare('UPDATE assistant_thread SET updated_at = ? WHERE id = ? AND owner = ?').run(at, threadId, owner);
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export interface MediaUserMappingEntry extends MediaUserMapping {
  readonly owner: string;
}

export function mediaUserMappings(): readonly MediaUserMappingEntry[] {
  const rows = open()
    .prepare('SELECT owner, seerr_user_id, seerr_email, seerr_username, verified_at FROM media_user ORDER BY owner ASC')
    .all() as unknown as {
    owner: string;
    seerr_user_id: number;
    seerr_email: string | null;
    seerr_username: string | null;
    verified_at: string;
  }[];
  return rows.map((row) => ({
    owner: row.owner,
    seerrUserId: row.seerr_user_id,
    seerrEmail: row.seerr_email,
    seerrUsername: row.seerr_username,
    verifiedAt: row.verified_at,
  }));
}

export function mediaScanBackfilled(owner: string): boolean {
  return Boolean(open().prepare('SELECT 1 AS there FROM media_scan_state WHERE owner = ?').get(owner));
}

export function markMediaScanComplete(owner: string): void {
  open()
    .prepare(
      `INSERT INTO media_scan_state (owner, backfilled_at) VALUES (?, ?)
       ON CONFLICT(owner) DO UPDATE SET backfilled_at = excluded.backfilled_at`,
    )
    .run(owner, now());
}

// ------------------------------------------------------------------------------------------------
// Benachrichtigungen: ein Ereignis, ein Owner, ein Lesestatus
// ------------------------------------------------------------------------------------------------

export interface NotificationSummary {
  readonly id: number;
  readonly kind: string;
  readonly title: string;
  readonly body: string | null;
  readonly href: string | null;
  readonly createdAt: string;
  readonly readAt: string | null;
}

const notificationFromRow = (row: {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
}): NotificationSummary => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  href: row.href,
  createdAt: row.created_at,
  readAt: row.read_at,
});

export function createNotification(
  owner: string,
  kind: string,
  title: string,
  body: string | null = null,
  href: string | null = null,
): number {
  const changed = open()
    .prepare('INSERT INTO notification (owner, kind, title, body, href, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(owner, kind.slice(0, 40), title.slice(0, 160), body?.slice(0, 400) ?? null, href?.slice(0, 300) ?? null, now());
  return Number(changed.lastInsertRowid);
}

export function notificationsOf(owner: string, limit = 30): readonly NotificationSummary[] {
  const capped = Math.max(1, Math.min(100, Math.trunc(limit)));
  const rows = open()
    .prepare(
      `SELECT id, kind, title, body, href, created_at, read_at
       FROM notification WHERE owner = ?
       ORDER BY (read_at IS NULL) DESC, created_at DESC
       LIMIT ?`,
    )
    .all(owner, capped) as unknown as {
    id: number;
    kind: string;
    title: string;
    body: string | null;
    href: string | null;
    created_at: string;
    read_at: string | null;
  }[];
  return rows.map(notificationFromRow);
}

export function unreadNotificationCount(owner: string): number {
  const row = open()
    .prepare('SELECT COUNT(*) AS n FROM notification WHERE owner = ? AND read_at IS NULL')
    .get(owner) as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

export function markNotificationRead(id: number, owner: string): boolean {
  const changed = open()
    .prepare('UPDATE notification SET read_at = ? WHERE id = ? AND owner = ? AND read_at IS NULL')
    .run(now(), id, owner);
  return Number(changed.changes) === 1;
}

export function markAllNotificationsRead(owner: string): number {
  const changed = open()
    .prepare('UPDATE notification SET read_at = ? WHERE owner = ? AND read_at IS NULL')
    .run(now(), owner);
  return Number(changed.changes);
}

/** Vorherigen Status zurückgeben und den neuen festhalten. */
export function recordMediaStatusSeen(
  owner: string,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  status: string,
): string | null {
  const db = open();
  const row = db
    .prepare('SELECT status FROM media_status_seen WHERE owner = ? AND media_type = ? AND tmdb_id = ?')
    .get(owner, mediaType, tmdbId) as { status?: string } | undefined;
  const previous = row?.status ?? null;
  db.prepare(
    `INSERT INTO media_status_seen (owner, media_type, tmdb_id, status, seen_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(owner, media_type, tmdb_id) DO UPDATE SET status = excluded.status, seen_at = excluded.seen_at`,
  ).run(owner, mediaType, tmdbId, status.slice(0, 40), now());
  return previous;
}

// ------------------------------------------------------------------------------------------------
// Push-Abonnements: Geräteadressen, keine Personen
// ------------------------------------------------------------------------------------------------

export interface PushSubscriptionRecord {
  readonly endpoint: string;
  readonly owner: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly createdAt: string;
  readonly userAgent: string | null;
}

export function savePushSubscription(
  owner: string,
  subscription: { readonly endpoint: string; readonly p256dh: string; readonly auth: string; readonly userAgent?: string | null },
): void {
  open()
    .prepare(
      `INSERT INTO push_subscription (endpoint, owner, p256dh, auth, created_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET owner = excluded.owner, p256dh = excluded.p256dh,
         auth = excluded.auth, user_agent = excluded.user_agent`,
    )
    .run(
      subscription.endpoint,
      owner,
      subscription.p256dh,
      subscription.auth,
      now(),
      subscription.userAgent?.slice(0, 300) ?? null,
    );
}

export function pushSubscriptionsOf(owner: string): readonly PushSubscriptionRecord[] {
  const rows = open()
    .prepare('SELECT endpoint, owner, p256dh, auth, created_at, user_agent FROM push_subscription WHERE owner = ?')
    .all(owner) as unknown as {
    endpoint: string;
    owner: string;
    p256dh: string;
    auth: string;
    created_at: string;
    user_agent: string | null;
  }[];
  return rows.map((row) => ({
    endpoint: row.endpoint,
    owner: row.owner,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: row.created_at,
    userAgent: row.user_agent,
  }));
}

export function removePushSubscription(owner: string, endpoint: string): boolean {
  const changed = open().prepare('DELETE FROM push_subscription WHERE owner = ? AND endpoint = ?').run(owner, endpoint);
  return Number(changed.changes) === 1;
}

// ------------------------------------------------------------------------------------------------
// Benachrichtigungs-Einstellungen: Ruhezeit und Kategorien pro Person
// ------------------------------------------------------------------------------------------------

export interface NotificationPreferences {
  readonly push: boolean;
  readonly quietStart: string | null;
  readonly quietEnd: string | null;
  readonly request: boolean;
  readonly routine: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push: true,
  quietStart: null,
  quietEnd: null,
  request: true,
  routine: true,
};

export function notificationPreferencesOf(owner: string): NotificationPreferences {
  const row = open()
    .prepare(
      'SELECT push, quiet_start, quiet_end, request, routine FROM notification_preference WHERE owner = ?',
    )
    .get(owner) as
    | { push: number; quiet_start: string | null; quiet_end: string | null; request: number; routine: number }
    | undefined;
  if (!row) return DEFAULT_PREFERENCES;
  return {
    push: row.push === 1,
    quietStart: row.quiet_start,
    quietEnd: row.quiet_end,
    request: row.request === 1,
    routine: row.routine === 1,
  };
}

export function saveNotificationPreferences(
  owner: string,
  patch: Partial<NotificationPreferences>,
): NotificationPreferences {
  const current = notificationPreferencesOf(owner);
  const next: NotificationPreferences = {
    push: patch.push ?? current.push,
    quietStart: patch.quietStart !== undefined ? patch.quietStart : current.quietStart,
    quietEnd: patch.quietEnd !== undefined ? patch.quietEnd : current.quietEnd,
    request: patch.request ?? current.request,
    routine: patch.routine ?? current.routine,
  };
  open()
    .prepare(
      `INSERT INTO notification_preference (owner, push, quiet_start, quiet_end, request, routine, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET push = excluded.push, quiet_start = excluded.quiet_start,
         quiet_end = excluded.quiet_end, request = excluded.request, routine = excluded.routine,
         updated_at = excluded.updated_at`,
    )
    .run(
      owner,
      next.push ? 1 : 0,
      next.quietStart,
      next.quietEnd,
      next.request ? 1 : 0,
      next.routine ? 1 : 0,
      now(),
    );
  return next;
}

const minutesOf = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** Ruhezeit gilt in Europe/Berlin, unabhängig von der Serverzeitzone. */
export function inQuietHours(preferences: NotificationPreferences, at = new Date()): boolean {
  if (!preferences.quietStart || !preferences.quietEnd) return false;
  const start = minutesOf(preferences.quietStart);
  const end = minutesOf(preferences.quietEnd);
  if (start === null || end === null || start === end) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  const current = hour * 60 + minute;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

// ------------------------------------------------------------------------------------------------
// Media-Watches: Statusübergänge genau einmal
// ------------------------------------------------------------------------------------------------

export interface MediaWatch {
  readonly owner: string;
  readonly mediaType: 'movie' | 'tv';
  readonly tmdbId: number;
  readonly is4k: boolean;
  readonly title: string;
  readonly locale: 'de' | 'en';
  readonly seasons: readonly number[] | null;
  readonly requestIds: readonly number[];
  readonly lastStatus: string;
  readonly lastRequestStatus: string | null;
  readonly active: boolean;
  readonly misses: number;
  readonly failures: number;
  readonly lastCheckedAt: string | null;
  readonly nextCheckAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const parseNumberArray = (value: string | null): readonly number[] | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is number => typeof entry === 'number') : null;
  } catch {
    return null;
  }
};

const watchFromRow = (row: {
  owner: string;
  media_type: string;
  tmdb_id: number;
  is4k: number;
  title: string;
  locale: string;
  seasons_json: string | null;
  request_ids_json: string | null;
  last_status: string;
  last_request_status: string | null;
  active: number;
  misses: number;
  failures: number;
  last_checked_at: string | null;
  next_check_at: string | null;
  created_at: string;
  updated_at: string;
}): MediaWatch => ({
  owner: row.owner,
  mediaType: row.media_type === 'tv' ? 'tv' : 'movie',
  tmdbId: row.tmdb_id,
  is4k: row.is4k === 1,
  title: row.title,
  locale: row.locale === 'en' ? 'en' : 'de',
  seasons: parseNumberArray(row.seasons_json),
  requestIds: parseNumberArray(row.request_ids_json) ?? [],
  lastStatus: row.last_status,
  lastRequestStatus: row.last_request_status,
  active: row.active === 1,
  misses: row.misses,
  failures: row.failures,
  lastCheckedAt: row.last_checked_at,
  nextCheckAt: row.next_check_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function upsertMediaWatch(input: {
  readonly owner: string;
  readonly mediaType: 'movie' | 'tv';
  readonly tmdbId: number;
  readonly is4k: boolean;
  readonly title: string;
  readonly locale: 'de' | 'en';
  readonly seasons: readonly number[] | null;
  readonly requestId: number | null;
  readonly lastStatus?: string;
  readonly lastRequestStatus?: string | null;
}): MediaWatch {
  const db = open();
  const at = now();
  const existing = db
    .prepare('SELECT * FROM media_watch WHERE owner = ? AND media_type = ? AND tmdb_id = ? AND is4k = ?')
    .get(input.owner, input.mediaType, input.tmdbId, input.is4k ? 1 : 0) as
    | Parameters<typeof watchFromRow>[0]
    | undefined;
  const mergedSeasons = [...new Set([...(parseNumberArray(existing?.seasons_json ?? null) ?? []), ...(input.seasons ?? [])])].sort(
    (a, b) => a - b,
  );
  const mergedRequests = [...new Set([...(parseNumberArray(existing?.request_ids_json ?? null) ?? []), ...(input.requestId ? [input.requestId] : [])])].sort(
    (a, b) => a - b,
  );
  const seasonsJson = mergedSeasons.length > 0 ? JSON.stringify(mergedSeasons) : null;
  const requestsJson = mergedRequests.length > 0 ? JSON.stringify(mergedRequests) : null;
  if (existing) {
    db.prepare(
      `UPDATE media_watch SET title = ?, locale = ?, seasons_json = ?, request_ids_json = ?,
       active = 1, misses = 0, failures = 0, next_check_at = ?, updated_at = ?
       WHERE owner = ? AND media_type = ? AND tmdb_id = ? AND is4k = ?`,
    ).run(
      input.title || existing.title,
      input.locale,
      seasonsJson,
      requestsJson,
      at,
      at,
      input.owner,
      input.mediaType,
      input.tmdbId,
      input.is4k ? 1 : 0,
    );
  } else {
    db.prepare(
      `INSERT INTO media_watch (owner, media_type, tmdb_id, is4k, title, locale, seasons_json,
        request_ids_json, last_status, last_request_status, active, created_at, updated_at, next_check_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    ).run(
      input.owner,
      input.mediaType,
      input.tmdbId,
      input.is4k ? 1 : 0,
      input.title,
      input.locale,
      seasonsJson,
      requestsJson,
      input.lastStatus ?? 'unknown',
      input.lastRequestStatus ?? null,
      at,
      at,
      at,
    );
  }
  const row = db
    .prepare('SELECT * FROM media_watch WHERE owner = ? AND media_type = ? AND tmdb_id = ? AND is4k = ?')
    .get(input.owner, input.mediaType, input.tmdbId, input.is4k ? 1 : 0) as Parameters<typeof watchFromRow>[0];
  return watchFromRow(row);
}

export function mediaWatchOf(
  owner: string,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  is4k: boolean,
): MediaWatch | null {
  const row = open()
    .prepare('SELECT * FROM media_watch WHERE owner = ? AND media_type = ? AND tmdb_id = ? AND is4k = ?')
    .get(owner, mediaType, tmdbId, is4k ? 1 : 0) as Parameters<typeof watchFromRow>[0] | undefined;
  return row ? watchFromRow(row) : null;
}

export function activeMediaWatches(): readonly MediaWatch[] {
  const rows = open()
    .prepare('SELECT * FROM media_watch WHERE active = 1 ORDER BY owner ASC, updated_at ASC')
    .all() as unknown as Parameters<typeof watchFromRow>[0][];
  return rows.map(watchFromRow);
}

export function recordMediaWatchEvent(watch: MediaWatch, event: string): boolean {
  const changed = open()
    .prepare('INSERT OR IGNORE INTO media_watch_event (owner, media_type, tmdb_id, is4k, event, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(watch.owner, watch.mediaType, watch.tmdbId, watch.is4k ? 1 : 0, event, now());
  return Number(changed.changes) === 1;
}

export function updateMediaWatchObservation(
  watch: MediaWatch,
  observation: {
    readonly status: string;
    readonly requestStatus: string | null;
    readonly active: boolean;
    readonly misses: number;
    readonly failures?: number;
  },
): void {
  const at = now();
  open()
    .prepare(
      `UPDATE media_watch SET last_status = ?, last_request_status = ?, active = ?, misses = ?,
       failures = ?, last_checked_at = ?, updated_at = ?, next_check_at = ?
       WHERE owner = ? AND media_type = ? AND tmdb_id = ? AND is4k = ?`,
    )
    .run(
      observation.status,
      observation.requestStatus,
      observation.active ? 1 : 0,
      observation.misses,
      observation.failures ?? 0,
      at,
      at,
      at,
      watch.owner,
      watch.mediaType,
      watch.tmdbId,
      watch.is4k ? 1 : 0,
    );
}

// ------------------------------------------------------------------------------------------------
// Routinen: Laufzustand, keine Definitionen
// ------------------------------------------------------------------------------------------------

export interface RoutineState {
  readonly owner: string;
  readonly routineId: string;
  readonly nextRunAt: string;
  readonly lastRunAt: string | null;
  readonly lastStatus: string | null;
  readonly lastError: string | null;
}

export function routineStateOf(owner: string, routineId: string): RoutineState | null {
  const row = open()
    .prepare(
      'SELECT owner, routine_id, next_run_at, last_run_at, last_status, last_error FROM routine_state WHERE owner = ? AND routine_id = ?',
    )
    .get(owner, routineId) as
    | {
        owner: string;
        routine_id: string;
        next_run_at: string;
        last_run_at: string | null;
        last_status: string | null;
        last_error: string | null;
      }
    | undefined;
  return row
    ? {
        owner: row.owner,
        routineId: row.routine_id,
        nextRunAt: row.next_run_at,
        lastRunAt: row.last_run_at,
        lastStatus: row.last_status,
        lastError: row.last_error,
      }
    : null;
}

export function saveRoutineState(state: RoutineState): void {
  open()
    .prepare(
      `INSERT INTO routine_state (owner, routine_id, next_run_at, last_run_at, last_status, last_error)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner, routine_id) DO UPDATE SET next_run_at = excluded.next_run_at,
         last_run_at = excluded.last_run_at, last_status = excluded.last_status, last_error = excluded.last_error`,
    )
    .run(
      state.owner,
      state.routineId,
      state.nextRunAt,
      state.lastRunAt,
      state.lastStatus,
      state.lastError?.slice(0, 400) ?? null,
    );
}

export function mediaWatchesOf(owner: string): readonly MediaWatch[] {
  const rows = open()
    .prepare('SELECT * FROM media_watch WHERE owner = ? ORDER BY updated_at DESC')
    .all(owner) as unknown as Parameters<typeof watchFromRow>[0][];
  return rows.map(watchFromRow);
}

// ------------------------------------------------------------------------------------------------
// Onboarding
// ------------------------------------------------------------------------------------------------

export interface OnboardingState {
  readonly owner: string;
  readonly welcomeSeenAt: string | null;
  readonly favoritesDoneAt: string | null;
  readonly assistantDoneAt: string | null;
  readonly dismissedAt: string | null;
  readonly completedAt: string | null;
}

export function onboardingStateOf(owner: string): OnboardingState | null {
  const row = open()
    .prepare(
      'SELECT owner, welcome_seen_at, favorites_done_at, assistant_done_at, dismissed_at, completed_at FROM onboarding_state WHERE owner = ?',
    )
    .get(owner) as
    | {
        owner: string;
        welcome_seen_at: string | null;
        favorites_done_at: string | null;
        assistant_done_at: string | null;
        dismissed_at: string | null;
        completed_at: string | null;
      }
    | undefined;
  return row
    ? {
        owner: row.owner,
        welcomeSeenAt: row.welcome_seen_at,
        favoritesDoneAt: row.favorites_done_at,
        assistantDoneAt: row.assistant_done_at,
        dismissedAt: row.dismissed_at,
        completedAt: row.completed_at,
      }
    : null;
}

const ensureOnboarding = (owner: string): void => {
  const timestamp = now();
  open()
    .prepare(
      'INSERT INTO onboarding_state (owner, created_at, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner) DO NOTHING',
    )
    .run(owner, timestamp, timestamp);
};

export function markOnboarding(
  owner: string,
  field: 'welcomeSeenAt' | 'favoritesDoneAt' | 'assistantDoneAt' | 'dismissedAt' | 'completedAt',
): OnboardingState {
  ensureOnboarding(owner);
  const column = {
    welcomeSeenAt: 'welcome_seen_at',
    favoritesDoneAt: 'favorites_done_at',
    assistantDoneAt: 'assistant_done_at',
    dismissedAt: 'dismissed_at',
    completedAt: 'completed_at',
  }[field];
  const timestamp = now();
  open()
    .prepare(`UPDATE onboarding_state SET ${column} = ?, updated_at = ? WHERE owner = ?`)
    .run(timestamp, timestamp, owner);
  const state = onboardingStateOf(owner);
  if (!state) throw new Error('onboarding_state_missing');
  return state;
}

export function setFavorites(owner: string, serviceIds: readonly string[]): void {
  const db = open();
  const insert = db.prepare('INSERT OR IGNORE INTO favorite (owner, service_id, created_at) VALUES (?, ?, ?)');
  const timestamp = now();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM favorite WHERE owner = ?').run(owner);
    for (const id of serviceIds) insert.run(owner, id, timestamp);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
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
