import type { Provider } from '../adapter.ts';
import type { Grade } from '../contract.ts';

/**
 * Non-model providers, for establishing what a judge has to beat.
 *
 * The corpus grade distribution is LOW 50 / Just Avg 37 / AVG 5 / Good 1, so a
 * constant "LOW" answer scores 54%. Running that through the real harness — not
 * computing it on paper — is the only way to be sure the harness itself is not
 * flattering the model.
 */

export function constantProvider(grade: Grade): Provider {
  return async () => ({
    quality: { grade, evidence: [`Constant baseline: always answers "${grade}"`] },
    olq: {},
    flags: { themes: [], traits: [], perceptionMismatch: null },
  });
}

/**
 * Deterministic pseudo-random grade, seeded by response length. Establishes the
 * floor: a judge that does not beat THIS is not reading the text at all.
 */
export function randomProvider(grades: readonly Grade[]): Provider {
  return async ({ user }) => {
    let h = 0;
    for (let i = 0; i < user.length; i++) h = (h * 31 + user.charCodeAt(i)) | 0;
    const grade = grades[Math.abs(h) % grades.length];
    return {
      quality: { grade, evidence: ['Random baseline — ignores content'] },
      olq: {},
      flags: { themes: [], traits: [], perceptionMismatch: null },
    };
  };
}
