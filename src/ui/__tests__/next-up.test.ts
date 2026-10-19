import { describe, it, expect } from 'vitest';
import { nextUp } from '../catalog.ts';

/**
 * Home's "Next up" (D38): the first ready test, in SSB day order, the
 * candidate has not yet taken; once all are taken, back to Day 1. Never a
 * test that cannot be run.
 */
describe('nextUp', () => {
  it('starts a new candidate on Day 1', () => {
    expect(nextUp(new Set())?.id).toBe('oir');
  });

  it('moves on in day order past what has been taken', () => {
    expect(nextUp(new Set(['oir']))?.id).toBe('ppdt');
    expect(nextUp(new Set(['oir', 'ppdt']))?.id).toBe('tat');
    expect(nextUp(new Set(['oir', 'ppdt', 'tat']))?.id).toBe('wat');
  });

  it('goes back to Day 1 once every ready test is taken', () => {
    expect(nextUp(new Set(['oir', 'ppdt', 'tat', 'wat']))?.id).toBe('oir');
  });

  it('only ever offers a ready test', () => {
    expect(nextUp(new Set(['oir', 'ppdt', 'tat', 'wat', 'srt']))?.availability).toBe('ready');
  });
});
