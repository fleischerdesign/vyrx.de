import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { runMediaWatchScan } from '../../../lib/media-watch-worker.ts';
import { runDueRoutines } from '../../../lib/routine-runner.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const scanSecret = (): string | null => {
  const file = process.env.PORTAL_SCAN_SECRET_FILE?.trim();
  if (file) {
    try {
      return readFileSync(file, 'utf8').trim() || null;
    } catch {
      return null;
    }
  }
  return process.env.PORTAL_SCAN_SECRET?.trim() || null;
};

const matches = (provided: string, expected: string): boolean => {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const POST: APIRoute = async ({ request }) => {
  const expected = scanSecret();
  if (!expected) return reply(503, { error: 'scan_not_configured' });
  const provided = request.headers.get('x-vyrx-scan');
  if (!provided || !matches(provided, expected)) return reply(403, { error: 'forbidden' });
  const stats = await runMediaWatchScan();
  const routines = await runDueRoutines();
  return reply(200, { ...stats, routines });
};
