import type { Locale } from './locale.ts';
import { ROUTINES } from './routines/index.ts';
import { nextRoutineRun } from './routines/schedule.ts';
import type { RoutineDefinition } from './routines/types.ts';
import { mediaUserMappings, mediaWatchesOf, routineStateOf, saveRoutineState } from './store.ts';
import { notifyOwner } from './web-push.ts';

export interface RoutineRunStats {
  readonly routines: number;
  readonly owners: number;
  readonly ran: number;
  readonly notifications: number;
  readonly errors: number;
  readonly skipped: boolean;
}

export interface RoutineRunOptions {
  readonly now?: Date;
  readonly routines?: readonly RoutineDefinition[];
  readonly owners?: readonly string[];
}

let running = false;

const withTimeout = async <T>(promise: Promise<T>, milliseconds: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error('routine_timeout')), milliseconds).unref?.();
    }),
  ]);

const ownerLocale = (owner: string): Locale => mediaWatchesOf(owner)[0]?.locale ?? 'de';

/**
 * Führt fällige Routinen aus. Der erste Kontakt mit einer Routine plant nur den
 * nächsten Lauf; dadurch entsteht beim Deployment keine Benachrichtigungswelle.
 */
export async function runDueRoutines(options: RoutineRunOptions = {}): Promise<RoutineRunStats> {
  if (running) return { routines: 0, owners: 0, ran: 0, notifications: 0, errors: 0, skipped: true };
  running = true;
  const stats = { routines: 0, owners: 0, ran: 0, notifications: 0, errors: 0, skipped: false };
  const now = options.now ?? new Date();
  try {
    const routines = options.routines ?? ROUTINES;
    for (const routine of routines) {
      stats.routines += 1;
      const owners = options.owners ?? mediaUserMappings().map((mapping) => mapping.owner);
      for (const owner of owners) {
        stats.owners += 1;
        try {
          const state = routineStateOf(owner, routine.id);
          if (!state) {
            saveRoutineState({
              owner,
              routineId: routine.id,
              nextRunAt: nextRoutineRun(routine.schedule, now).toISOString(),
              lastRunAt: null,
              lastStatus: null,
              lastError: null,
            });
            continue;
          }
          if (new Date(state.nextRunAt).getTime() > now.getTime()) continue;

          stats.ran += 1;
          const result = await withTimeout(
            routine.run({ owner, locale: ownerLocale(owner), now }),
            20_000,
          );
          if (result) {
            notifyOwner(owner, 'routine', result.title, result.body, result.href ?? null);
            stats.notifications += 1;
          }
          saveRoutineState({
            owner,
            routineId: routine.id,
            nextRunAt: nextRoutineRun(routine.schedule, now).toISOString(),
            lastRunAt: now.toISOString(),
            lastStatus: result ? 'ok' : 'empty',
            lastError: null,
          });
        } catch (error) {
          stats.errors += 1;
          saveRoutineState({
            owner,
            routineId: routine.id,
            nextRunAt: nextRoutineRun(routine.schedule, now).toISOString(),
            lastRunAt: now.toISOString(),
            lastStatus: 'error',
            lastError: error instanceof Error ? error.message : 'routine_failed',
          });
        }
      }
    }
  } finally {
    running = false;
  }
  return stats;
}
