import { describe, it, expect } from 'vitest';
import bank from '../../../content/oir-items.json' with { type: 'json' };
import { OIR_CHAPTERS, chapterBySlug } from '../chapters.ts';
import { chapterProgress, parsePracticeAnswer, pickSet, practiceQueue, practiceRefusal } from '../practice.ts';
import type { PracticeAnswer } from '../practice.ts';

/**
 * Chapter practice (D26): which chapters exist, how far a candidate has got
 * in one, and which questions come next.
 */

describe('the chapters', () => {
  it('gives every reasoning type in the bank a chapter, so a seeded chapter cannot be invisible', () => {
    const types = new Set(bank.items.map((i) => i.payload.reasoningType));
    for (const t of types) expect(OIR_CHAPTERS.map((c) => c.reasoningType), t).toContain(t);
  });

  it('has unique, URL-safe slugs and finds a chapter by its slug', () => {
    const slugs = OIR_CHAPTERS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(chapterBySlug('series')?.title).toBe('Series');
    expect(chapterBySlug('nope')).toBeUndefined();
    expect(chapterBySlug('__proto__')).toBeUndefined();
  });
});

const at = (min: number) => new Date(Date.UTC(2026, 9, 12, 10, min)).toISOString();
const ITEMS = ['q1', 'q2', 'q3', 'q4', 'q5'];

describe('progress in a chapter', () => {
  it('counts an untouched chapter as nothing answered', () => {
    expect(chapterProgress(ITEMS, [])).toEqual({ total: 5, answered: 0, right: 0, wrong: 0 });
  });

  it('judges each question by its latest answer, so a retry that lands moves it to right', () => {
    const answers: PracticeAnswer[] = [
      { item_id: 'q1', correct: false, answered_at: at(1) },
      { item_id: 'q1', correct: true, answered_at: at(5) },
      { item_id: 'q2', correct: true, answered_at: at(2) },
      { item_id: 'q2', correct: false, answered_at: at(6) },
      { item_id: 'q3', correct: true, answered_at: at(3) },
    ];
    expect(chapterProgress(ITEMS, answers)).toEqual({ total: 5, answered: 3, right: 2, wrong: 1 });
  });

  it('reads the latest by time, not by the order rows arrive in', () => {
    const answers: PracticeAnswer[] = [
      { item_id: 'q1', correct: true, answered_at: at(9) },
      { item_id: 'q1', correct: false, answered_at: at(1) },
    ];
    expect(chapterProgress(ITEMS, answers)).toMatchObject({ right: 1, wrong: 0 });
  });

  it('ignores answers to questions no longer in the chapter (a retired item)', () => {
    expect(chapterProgress(ITEMS, [{ item_id: 'gone', correct: true, answered_at: at(1) }])).toMatchObject({ answered: 0 });
  });
});

describe('which questions come next', () => {
  const answers: PracticeAnswer[] = [
    { item_id: 'q2', correct: true, answered_at: at(1) },
    { item_id: 'q4', correct: false, answered_at: at(2) },
  ];

  it('"new" is the unanswered questions, in book order', () => {
    expect(practiceQueue(ITEMS, answers, 'new')).toEqual(['q1', 'q3', 'q5']);
  });

  it('"wrong" is the questions whose latest answer was wrong', () => {
    expect(practiceQueue(ITEMS, answers, 'wrong')).toEqual(['q4']);
  });

  it('"all" is every question, from the start', () => {
    expect(practiceQueue(ITEMS, answers, 'all')).toEqual(ITEMS);
  });
});

describe('the set a chapter opens on', () => {
  const p = (answered: number, wrong: number) => ({ total: 5, answered, right: answered - wrong, wrong });

  it('honours a set named in the address', () => {
    expect(pickSet('wrong', p(0, 0))).toBe('wrong');
    expect(pickSet('all', p(1, 0))).toBe('all');
  });

  it('otherwise opens on what is left, then what was missed, then everything', () => {
    expect(pickSet(undefined, p(2, 1))).toBe('new');
    expect(pickSet(undefined, p(5, 1))).toBe('wrong');
    expect(pickSet(undefined, p(5, 0))).toBe('all');
  });

  it('ignores anything that is not a set', () => {
    expect(pickSet('bogus', p(0, 0))).toBe('new');
    expect(pickSet(['wrong', 'all'], p(0, 0))).toBe('new');
  });
});

describe('an answer at the boundary', () => {
  it('accepts a real item id and a choice A-D in either case', () => {
    expect(parsePracticeAnswer('oir-agx-ch11-q001', 'b')).toEqual({ itemId: 'oir-agx-ch11-q001', chosen: 'B' });
  });

  it('refuses anything else before the database is asked', () => {
    expect(parsePracticeAnswer('oir-agx-ch11-q001', 'E')).toBeNull();
    expect(parsePracticeAnswer('oir-agx-ch11-q001', '')).toBeNull();
    expect(parsePracticeAnswer('Bad Id;', 'A')).toBeNull();
    expect(parsePracticeAnswer(42, 'A')).toBeNull();
    expect(parsePracticeAnswer('oir-agx-ch11-q001', null)).toBeNull();
  });
});

describe('the words for a refusal', () => {
  it('says what to do about consent and a missing date of birth', () => {
    expect(practiceRefusal('consent_required')).toMatch(/guardian/i);
    expect(practiceRefusal('dob_required')).toMatch(/date of birth/i);
  });

  it('falls back to a retry for anything else', () => {
    expect(practiceRefusal('network')).toMatch(/try again/i);
  });
});
