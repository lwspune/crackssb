import { describe, it, expect } from 'vitest';
import { pictureStandings } from '../attempts.ts';
import type { PpdtAttempt } from '../attempts.ts';

/** Where a candidate stands on each PPDT picture (D33): not tried, tried n times, or running now. */
const at = (itemId: string, over: boolean, sessionId = `${itemId}-${Math.random()}`): PpdtAttempt => ({
  sessionId, itemId, startedAt: '2026-10-18T05:00:00Z', over, input: 'typed',
});

describe('pictureStandings', () => {
  it('counts finished attempts per picture and marks one still running', () => {
    const s = pictureStandings([at('ppdt-01', true), at('ppdt-01', true), at('ppdt-02', false, 'live-1'), at('ppdt-02', true)]);
    expect(s.get('ppdt-01')).toEqual({ tries: 2, live: null, last: expect.any(String) });
    expect(s.get('ppdt-02')).toEqual({ tries: 1, live: 'live-1', last: expect.any(String) });
    expect(s.get('ppdt-03')).toBeUndefined();
  });

  it('keeps the newest finished attempt, for the link to its result', () => {
    const s = pictureStandings([
      { ...at('ppdt-01', true, 'new'), startedAt: '2026-10-18T06:00:00Z' },
      { ...at('ppdt-01', true, 'old'), startedAt: '2026-10-17T06:00:00Z' },
    ]);
    expect(s.get('ppdt-01')?.last).toBe('new');
  });
});
