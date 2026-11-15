import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import {
  appendAssistantMessages,
  assistantThreadOf,
  assistantThreadsOf,
  closeStore,
  createAssistantThread,
  deleteAssistantThread,
  pinAssistantThread,
  renameAssistantThread,
} from '../src/lib/store.ts';

let directory = '';
let previous: string | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-threads-'));
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

test('threads persist, search and stay owner-scoped', () => {
  const thread = createAssistantThread('alice', 'Suche Dune.');
  assert.equal(
    appendAssistantMessages(thread.id, 'alice', [
      { role: 'user', content: 'Suche Dune.' },
      { role: 'assistant', content: 'Hier sind die Treffer.', ui: [{ type: 'text', text: 'Dune' }] },
    ]),
    true,
  );

  const list = assistantThreadsOf('alice');
  assert.equal(list.length, 1);
  assert.equal(list[0]!.title, 'Suche Dune.');
  assert.equal(list[0]!.preview, 'Hier sind die Treffer.');

  const detail = assistantThreadOf(thread.id, 'alice');
  assert.equal(detail?.messages.length, 2);
  assert.deepEqual(detail!.messages[1]!.ui, [{ type: 'text', text: 'Dune' }]);

  assert.equal(assistantThreadOf(thread.id, 'bob'), null);
  assert.equal(assistantThreadsOf('bob').length, 0);
  assert.equal(assistantThreadsOf('alice', 50, 'Dune').length, 1);
  assert.equal(assistantThreadsOf('alice', 50, 'nichts').length, 0);
});

test('rename, pin and delete affect exactly one owner', () => {
  const thread = createAssistantThread('alice', 'Alt');
  assert.equal(renameAssistantThread(thread.id, 'bob', 'Fremd'), false);
  assert.equal(renameAssistantThread(thread.id, 'alice', 'Neu'), true);
  assert.equal(pinAssistantThread(thread.id, 'alice', true), true);
  assert.equal(assistantThreadsOf('alice')[0]!.title, 'Neu');
  assert.equal(assistantThreadsOf('alice')[0]!.pinned, true);
  assert.equal(deleteAssistantThread(thread.id, 'bob'), false);
  assert.equal(deleteAssistantThread(thread.id, 'alice'), true);
  assert.equal(assistantThreadOf(thread.id, 'alice'), null);
});

test('messages cannot be appended to another owner thread', () => {
  const thread = createAssistantThread('alice', 'Privat');
  assert.equal(appendAssistantMessages(thread.id, 'bob', [{ role: 'user', content: 'Hallo' }]), false);
  assert.equal(assistantThreadOf(thread.id, 'alice')?.messages.length, 0);
});
