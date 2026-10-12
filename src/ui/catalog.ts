import type { RunnerInstrument } from '../runner/modes.ts';

/**
 * The student's map: every SSB test, on the day it happens, with an honest
 * status. UI.md §5.1 — navigate by SSB day, never by our phase — and §7 rule
 * 3: a feature that is not built says so; it is not hidden.
 *
 * `ready` is not a free choice: the catalogue test requires it to match
 * `RUNNABLE`, so this file cannot claim a test the runner cannot run.
 */

export type SsbDay = 1 | 2 | 3 | 4 | 5;
export type Availability = 'ready' | 'coming' | 'not_simulated';

export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  /** Abbreviation as candidates say it — "WAT", "PPDT". */
  readonly short?: string;
  readonly day: SsbDay;
  readonly instruments: readonly RunnerInstrument[];
  readonly availability: Availability;
  readonly summary: string;
  /** Untimed practice that is open even while the test itself is coming (D26). */
  readonly practice?: { readonly href: string; readonly label: string };
}

export const SSB_DAYS: readonly { readonly day: SsbDay; readonly title: string; readonly summary: string }[] = [
  { day: 1, title: 'Screening', summary: 'Reasoning and a picture story' },
  { day: 2, title: 'Psychology', summary: 'Four written tests, one sitting' },
  { day: 3, title: 'Group testing', summary: 'Two days with the GTO' },
  { day: 4, title: 'Interview', summary: 'One conversation, built from your PIQ' },
  { day: 5, title: 'Conference', summary: 'Every assessor, one room' },
];

export const CATALOG: readonly CatalogEntry[] = [
  { id: 'oir', name: 'Officer Intelligence Rating', short: 'OIR', day: 1, instruments: ['oir_verbal', 'oir_nonverbal'], availability: 'coming', summary: 'Verbal and non-verbal reasoning · 2 booklets', practice: { href: '/practise/oir', label: 'Chapter practice' } },
  { id: 'ppdt', name: 'Picture Perception & Discussion Test', short: 'PPDT', day: 1, instruments: ['ppdt'], availability: 'coming', summary: '30 s picture · 4 min story' },

  { id: 'tat', name: 'Thematic Apperception Test', short: 'TAT', day: 2, instruments: ['tat'], availability: 'coming', summary: '12 pictures · 4 min each' },
  { id: 'wat', name: 'Word Association Test', short: 'WAT', day: 2, instruments: ['wat'], availability: 'ready', summary: '60 words · 15 s each' },
  { id: 'srt', name: 'Situation Reaction Test', short: 'SRT', day: 2, instruments: ['srt'], availability: 'coming', summary: '60 situations · 30 min' },
  { id: 'sdt', name: 'Self Description Test', short: 'SDT', day: 2, instruments: ['sdt'], availability: 'coming', summary: '5 paragraphs · 15 min' },

  { id: 'gd', name: 'Group Discussion', short: 'GD', day: 3, instruments: [], availability: 'coming', summary: 'Live, with your group' },
  { id: 'gpe', name: 'Group Planning Exercise', short: 'GPE', day: 3, instruments: [], availability: 'coming', summary: 'Terrain model · group plan' },
  { id: 'lecturette', name: 'Lecturette', day: 3, instruments: ['lecturette'], availability: 'coming', summary: '3 min prep · 3 min talk' },
  { id: 'pgt', name: 'Progressive Group Task', short: 'PGT', day: 3, instruments: [], availability: 'not_simulated', summary: 'Group obstacles, rules of ground' },
  { id: 'hgt', name: 'Half Group Task', short: 'HGT', day: 3, instruments: [], availability: 'not_simulated', summary: 'Half the group, one obstacle' },
  { id: 'individual_obstacles', name: 'Individual Obstacles', short: 'IO', day: 3, instruments: [], availability: 'not_simulated', summary: '10 obstacles · 3 min' },
  { id: 'command_task', name: 'Command Task', day: 3, instruments: [], availability: 'not_simulated', summary: 'You lead two candidates' },
  { id: 'snake_race', name: 'Snake Race', day: 3, instruments: [], availability: 'not_simulated', summary: 'Whole group, one load' },
  { id: 'fgt', name: 'Final Group Task', short: 'FGT', day: 3, instruments: [], availability: 'not_simulated', summary: 'The last group obstacle' },

  { id: 'piq', name: 'Personal Information Questionnaire', short: 'PIQ', day: 4, instruments: ['piq'], availability: 'coming', summary: 'The form your interview is built from' },
  { id: 'interview', name: 'Personal Interview', day: 4, instruments: [], availability: 'coming', summary: 'Built from your PIQ' },

  { id: 'conference', name: 'Conference', day: 5, instruments: [], availability: 'coming', summary: 'The full board, a few minutes' },
];

export function entriesForDay(day: SsbDay): readonly CatalogEntry[] {
  return CATALOG.filter((e) => e.day === day);
}

export function entryById(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

export const AVAILABILITY_LABEL: Readonly<Record<Availability, string>> = {
  ready: 'Ready',
  coming: 'Coming',
  not_simulated: 'Not simulated',
};
