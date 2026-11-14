/*
 * Wer liest gerade? Die Identität kommt aus dem Reverse Proxy, der den
 * Authentik-Outpost ausführt und die Kopfzeilen setzt.
 *
 * Der Browser hält kein Token. Der Proxy löscht die Kopfzeilen aus der
 * eingehenden Anfrage, bevor er sie neu setzt, deshalb kann der Aufrufer sie
 * nicht fälschen - und nur der Proxy erreicht diesen Prozess.
 *
 * In der Entwicklung kann eine Identität ausdrücklich vorgetäuscht werden
 * (`PORTAL_DEV_USER`), damit Ansichten ohne Authentik prüfbar sind. Dieser Weg
 * ist an `import.meta.env.DEV` gebunden und existiert im gebauten Server nicht.
 */

import { isDevBuild } from './env.ts';

export interface Identity {
  readonly username: string;
  readonly name: string;
  readonly email: string | null;
  readonly uid: string | null;
  readonly groups: readonly string[];
}

function devIdentity(): Identity | null {
  const username = process.env.PORTAL_DEV_USER?.trim();
  if (!username) return null;
  const groups = (process.env.PORTAL_DEV_GROUPS ?? '')
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
  return {
    username,
    name: process.env.PORTAL_DEV_NAME?.trim() || username,
    email: process.env.PORTAL_DEV_EMAIL?.trim() || null,
    uid: process.env.PORTAL_DEV_UID?.trim() || null,
    groups,
  };
}

export function readIdentity(request: Request): Identity | null {
  if (isDevBuild()) {
    const dev = devIdentity();
    if (dev) return dev;
  }
  const username = request.headers.get('x-authentik-username')?.trim();
  if (!username) return null;
  const groups = (request.headers.get('x-authentik-groups') ?? '')
    .split('|')
    .map((group) => group.trim())
    .filter(Boolean);
  return {
    username,
    name: request.headers.get('x-authentik-name')?.trim() || username,
    email: request.headers.get('x-authentik-email')?.trim() || null,
    uid: request.headers.get('x-authentik-uid')?.trim() || null,
    groups,
  };
}
