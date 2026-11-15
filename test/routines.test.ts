import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { runDueRoutines } from '../src/lib/routine-runner.ts';
import { nextRoutineRun } from '../src/lib/routines/schedule.ts';
import type { RoutineDefinition } from '../src/lib/routines/types.ts';
import {
  closeStore,
  notificationsOf,
  routineStateOf,
  saveRoutineState,
  saveMediaUser,
  upsertMediaWatch,
} from '../src/lib/store.ts';

let directory = '';
let previous: string | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-routines-'));
  previous = process.env.PORTAL_STORE;
  process.env.PORTAL_STORE = join(directory, 'portal.sqlite');
  closeStore();
});

afterEach(() => {
  closeStore();
  if (previous === undefined) delete process.env.PORTAL_STORE;
  else process.env.PORTAL_STORE = previous;
  rmSync(directory, { recursive: true, force: true });
});

test('weekly schedules use Europe/Berlin and roll to the next week after the local time', () => {
  const sunday = new Date('2026-11-15T10:00:00.000Z');
  const next = nextRoutineRun({ kind: 'weekly', weekday: 7, hour: 18, minute: 0 }, sunday);
  assert.equal(next.toISOString(), '2026-11-15T17:00:00.000Z');

  const after = nextRoutineRun({ kind: 'weekly', weekday: 7, hour: 18, minute: 0 }, new Date('2026-11-15T18:30:00.000Z'));
  assert.equal(after.toISOString(), '2026-11-22T17:00:00.000Z');
});

test('the first routine contact only schedules, then a due run notifies once', async () => {
  saveMediaUser({ owner: 'alice', seerrUserId: 2, seerrEmail: null, seerrUsername: 'alice' });
  upsertMediaWatch({
    owner: 'alice',
    mediaType: 'movie',
    tmdbId: 438631,
    is4k: false,
    title: 'Dune',
    locale: 'de',
    seasons: null,
    requestId: 263,
    lastStatus: 'processing',
  });
  const routine: RoutineDefinition = {
    id: 'test-digest',
    title: 'Test',
    description: 'Test',
    audience: 'media-users',
    schedule: { kind: 'daily', hour: 8, minute: 0 },
    async run() {
      return { title: 'Digest', body: 'Eine Nachricht', href: '/overview/' };
    },
  };
  const now = new Date('2026-11-15T10:00:00.000Z');
  const first = await runDueRoutines({ now, routines: [routine], owners: ['alice'] });
  assert.equal(first.ran, 0);
  assert.equal(notificationsOf('alice').length, 0);
  const scheduled = routineStateOf('alice', 'test-digest');
  assert.ok(scheduled);
  saveRoutineState({
    ...scheduled,
    nextRunAt: new Date(now.getTime() - 1000).toISOString(),
  });

  const due = await runDueRoutines({ now, routines: [routine], owners: ['alice'] });
  assert.equal(due.ran, 1);
  assert.equal(due.notifications, 1);
  assert.equal(notificationsOf('alice')[0]?.title, 'Digest');
  assert.equal(routineStateOf('alice', 'test-digest')?.lastStatus, 'ok');
});
