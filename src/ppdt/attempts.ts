/** A candidate's PPDT attempts (D33) and where they stand on each picture. Pure. */

export interface PpdtAttempt {
  readonly sessionId: string;
  readonly itemId: string;
  readonly startedAt: string;
  /** Submitted, or past its clock. */
  readonly over: boolean;
  readonly input: 'typed' | 'paper';
}

export interface PictureStanding {
  /** Attempts that are over. */
  readonly tries: number;
  /** The session still running on this picture, if any. */
  readonly live: string | null;
  /** The newest finished attempt, for a link to its result. */
  readonly last: string | null;
}

export function pictureStandings(attempts: readonly PpdtAttempt[]): Map<string, PictureStanding> {
  const out = new Map<string, PictureStanding & { lastAt: string }>();
  for (const a of attempts) {
    const s = out.get(a.itemId) ?? { tries: 0, live: null, last: null, lastAt: '' };
    if (!a.over) out.set(a.itemId, { ...s, live: a.sessionId });
    else {
      const newer = a.startedAt > s.lastAt;
      out.set(a.itemId, { ...s, tries: s.tries + 1, last: newer ? a.sessionId : s.last, lastAt: newer ? a.startedAt : s.lastAt });
    }
  }
  return new Map([...out].map(([k, { tries, live, last }]) => [k, { tries, live, last }]));
}
