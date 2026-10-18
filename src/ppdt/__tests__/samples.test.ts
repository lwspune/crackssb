import { describe, it, expect } from 'vitest';
import { sampleFor } from '../samples.ts';
import { PICTURES } from '../pictures.ts';
import { checkAttempt } from '../feedback.ts';
import { EMPTY_NOTE } from '../note.ts';

/** The sample stories (D33): one per picture, and each passes the checks the candidate's story is held to. */
describe('sample stories', () => {
  it('give every picture one, of a length four minutes allows, that reaches an outcome', () => {
    for (const p of PICTURES) {
      const s = sampleFor(p.id);
      expect(s, p.id).toBeTruthy();
      // Held to the same quick checks as the candidate's own story.
      const checks = Object.fromEntries(checkAttempt(p, EMPTY_NOTE, s!).map((c) => [c.kind, c]));
      expect(checks.length.ok, `${p.id}: ${checks.length.line}`).toBe(true);
      expect(checks.ending.ok, `${p.id}: ${checks.ending.line}`).toBe(true);
    }
  });

  it('has none for a picture that does not exist', () => {
    expect(sampleFor('ppdt-99')).toBeNull();
  });
});
