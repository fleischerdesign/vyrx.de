import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeConversation } from '../src/lib/assistant-summary.ts';

test('summarizeConversation sends previous summary and transcript and returns only the summary', async () => {
  const original = globalThis.fetch;
  process.env.PORTAL_ASSISTANT_BASE_URL = 'https://assistant.example/v1';
  process.env.PORTAL_ASSISTANT_MODEL = 'test-model';
  process.env.PORTAL_ASSISTANT_API_KEY = 'test-key';
  let captured = '';
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    captured = String(init?.body ?? '');
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '  Die Person möchte Dune anfragen.  ' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  try {
    const summary = await summarizeConversation('Früher ging es um Filme.', 'Person: Suche Dune.\n\nAssistent: Ich habe Dune gefunden.', 'de');
    assert.equal(summary, 'Die Person möchte Dune anfragen.');
    assert.match(captured, /Früher ging es um Filme/);
    assert.match(captured, /Suche Dune/);
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_ASSISTANT_BASE_URL;
    delete process.env.PORTAL_ASSISTANT_MODEL;
    delete process.env.PORTAL_ASSISTANT_API_KEY;
  }
});
