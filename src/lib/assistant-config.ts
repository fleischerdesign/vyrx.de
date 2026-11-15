import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AssistantConfig {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly maxTokens: number;
  readonly timeoutMs: number;
}

const number = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
};

function keyFromFile(): string | null {
  const explicit = process.env.PORTAL_ASSISTANT_API_KEY_FILE?.trim();
  const credentials = process.env.CREDENTIALS_DIRECTORY?.trim();
  const path = explicit || (credentials ? resolve(credentials, 'assistant-key') : null);
  if (!path) return null;
  try {
    return readFileSync(path, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/** `null` heißt: für diesen Bau ist kein Anbieter eingerichtet. */
export function assistantConfig(): AssistantConfig | null {
  const baseUrl = process.env.PORTAL_ASSISTANT_BASE_URL?.trim();
  const model = process.env.PORTAL_ASSISTANT_MODEL?.trim();
  const apiKey = process.env.PORTAL_ASSISTANT_API_KEY?.trim() || keyFromFile();
  if (!baseUrl || !model || !apiKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
    apiKey,
    maxTokens: number(process.env.PORTAL_ASSISTANT_MAX_TOKENS, 1500, 100, 2000),
    timeoutMs: number(process.env.PORTAL_ASSISTANT_TIMEOUT_MS, 30_000, 5_000, 60_000),
  };
}
