import type { Locale } from '../locale.ts';
import type { RoutineSchedule } from './schedule.ts';

export interface RoutineContext {
  readonly owner: string;
  readonly locale: Locale;
  readonly now: Date;
}

export interface RoutineResult {
  readonly title: string;
  readonly body: string;
  readonly href?: string;
}

export interface RoutineDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Wer die Routine bekommt. `media-users` = Owner mit Seerr-Zuordnung. */
  readonly audience: 'media-users';
  readonly schedule: RoutineSchedule;
  run(context: RoutineContext): Promise<RoutineResult | null>;
}
