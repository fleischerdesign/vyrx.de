import { readFileSync } from 'node:fs';
import webpush from 'web-push';
import {
  createNotification,
  inQuietHours,
  notificationPreferencesOf,
  pushSubscriptionsOf,
  removePushSubscription,
} from './store.ts';

interface VapidConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
}

let config: VapidConfig | null | undefined;

const readSecret = (fileEnv: string, valueEnv: string): string | null => {
  const file = process.env[fileEnv];
  if (file) {
    try {
      return readFileSync(file, 'utf8').trim() || null;
    } catch {
      return null;
    }
  }
  return process.env[valueEnv]?.trim() || null;
};

const vapid = (): VapidConfig | null => {
  if (config !== undefined) return config;
  const publicKey = readSecret('PORTAL_VAPID_PUBLIC_KEY_FILE', 'PORTAL_VAPID_PUBLIC_KEY');
  const privateKey = readSecret('PORTAL_VAPID_PRIVATE_KEY_FILE', 'PORTAL_VAPID_PRIVATE_KEY');
  const subject = process.env.PORTAL_VAPID_SUBJECT?.trim() || 'mailto:noreply@vyrx.de';
  if (!publicKey || !privateKey) {
    config = null;
    return config;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    config = { publicKey, privateKey, subject };
    return config;
  } catch {
    config = null;
    return config;
  }
};

export const pushConfigured = (): boolean => vapid() !== null;

export const publicVapidKey = (): string | null => vapid()?.publicKey ?? null;

export interface PushPayload {
  readonly title: string;
  readonly body: string | null;
  readonly href: string | null;
  readonly locale?: 'de' | 'en';
}

export async function pushOwner(owner: string, kind: string, payload: PushPayload): Promise<void> {
  if (!vapid()) return;
  const preferences = notificationPreferencesOf(owner);
  if (!preferences.push || inQuietHours(preferences)) return;
  if (kind === 'request' && !preferences.request) return;
  if (kind === 'routine' && !preferences.routine) return;
  const subscriptions = pushSubscriptionsOf(owner);
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 86_400, urgency: 'normal' },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) removePushSubscription(owner, subscription.endpoint);
      }
    }),
  );
}

export async function flushPushDigest(
  owner: string,
  kind: string,
  entries: readonly PushPayload[],
): Promise<void> {
  if (entries.length === 0) return;
  if (entries.length === 1) {
    const entry = entries[0];
    if (entry) await pushOwner(owner, kind, entry);
    return;
  }
  const locale = entries[0]?.locale ?? 'de';
  const titles = entries.slice(0, 5).map((entry) => entry.body ?? entry.title).filter(Boolean);
  const title = locale === 'de' ? `${entries.length} Medien-Updates` : `${entries.length} media updates`;
  const body =
    locale === 'de'
      ? `${titles.join(', ')}${entries.length > titles.length ? ' …' : ''}`
      : `${titles.join(', ')}${entries.length > titles.length ? ' …' : ''}`;
  await pushOwner(owner, kind, { title, body, href: entries[0]?.href ?? null, locale });
}

/** In-App-Eintrag plus best-effort Push; ein Push-Fehler kippt den Aufrufer nie. */
export interface NotifyOptions {
  readonly deferPush?: boolean;
}

export function notifyOwner(
  owner: string,
  kind: string,
  title: string,
  body: string | null = null,
  href: string | null = null,
  options: NotifyOptions = {},
): number {
  const preferences = notificationPreferencesOf(owner);
  if (kind === 'request' && !preferences.request) return 0;
  if (kind === 'routine' && !preferences.routine) return 0;
  const id = createNotification(owner, kind, title, body, href);
  if (!options.deferPush) void pushOwner(owner, kind, { title, body, href }).catch(() => undefined);
  return id;
}
