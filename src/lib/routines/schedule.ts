export type RoutineSchedule =
  | { readonly kind: 'daily'; readonly hour: number; readonly minute: number }
  | {
      readonly kind: 'weekly';
      /** 1 = Montag … 7 = Sonntag */
      readonly weekday: number;
      readonly hour: number;
      readonly minute: number;
    };

const ZONE = 'Europe/Berlin';

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

const weekdayNumber: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function berlinParts(date: Date): LocalParts {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayNumber[parts.weekday ?? ''] ?? 1,
  };
}

/**
 * Ein lokales Datum/Uhrzeit nach Europe/Berlin in einen UTC-Zeitpunkt
 * überführen. Die Iteration fängt Sommerzeit und den Wechsel im Oktober ab.
 */
function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = desired;
  for (let index = 0; index < 4; index += 1) {
    const actual = berlinParts(new Date(guess));
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
    const delta = desired - actualUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

const addLocalDays = (parts: LocalParts, days: number): LocalParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    weekday: parts.weekday,
  };
};

export function nextRoutineRun(schedule: RoutineSchedule, from: Date): Date {
  const local = berlinParts(from);
  if (schedule.kind === 'daily') {
    let candidate = zonedToUtc(local.year, local.month, local.day, schedule.hour, schedule.minute);
    if (candidate.getTime() <= from.getTime()) {
      const next = addLocalDays(local, 1);
      candidate = zonedToUtc(next.year, next.month, next.day, schedule.hour, schedule.minute);
    }
    return candidate;
  }

  const delta = (schedule.weekday - local.weekday + 7) % 7;
  let candidate = zonedToUtc(local.year, local.month, local.day + delta, schedule.hour, schedule.minute);
  if (candidate.getTime() <= from.getTime()) {
    candidate = zonedToUtc(local.year, local.month, local.day + delta + 7, schedule.hour, schedule.minute);
  }
  return candidate;
}
