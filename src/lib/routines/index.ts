import { filmPicks } from './film-picks.ts';
import { requestsDigest } from './requests-digest.ts';
import type { RoutineDefinition } from './types.ts';

/**
 * Routinen sind Code. Eine neue Routine ist eine Datei plus ein Eintrag hier;
 * sie bekommt keinen beliebigen Prompt und keine Schreibrechte.
 */
export const ROUTINES: readonly RoutineDefinition[] = [requestsDigest, filmPicks];
