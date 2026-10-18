import { describe, it, expect } from 'vitest';
import { checkAttempt } from '../feedback.ts';
import { pictureById } from '../pictures.ts';
import type { PpdtNote } from '../note.ts';

/**
 * PPDT quick checks (D33): what can be said honestly with no model — the
 * character box against the picture's ground truth, whether the action was
 * noted, the story's length, and whether it reaches an ending. Each says what
 * it found in a line; none pretends to judge the story's quality.
 */
const office = pictureById('ppdt-04')!; // 3 people, 3–3; any mood
const laptop = pictureById('ppdt-07')!; // 1 person; moods negative or neutral
const note = (over: Partial<PpdtNote> = {}): PpdtNote => ({
  count: 3,
  people: [
    { sex: 'M', age: '35', mood: '-' },
    { sex: 'F', age: '28', mood: '+' },
    { sex: 'M', age: '40', mood: '0' },
  ],
  action: 'A heated discussion at work',
  ...over,
});
const story =
  'Rakesh, a young engineer, had found a fault in the bridge design. He called his team together and showed them the drawings. ' +
  'They argued at first, but he explained the risk calmly with numbers and offered to stay late to check every joint himself. ' +
  'In the end they agreed to redesign the support, and the bridge opened safely a month later.';

const byKind = (checks: ReturnType<typeof checkAttempt>) => Object.fromEntries(checks.map((c) => [c.kind, c]));

describe('checkAttempt', () => {
  it('passes a full box and a whole story', () => {
    const c = byKind(checkAttempt(office, note(), story));
    expect(c.count).toMatchObject({ ok: true, line: 'You saw 3. The picture has 3.' });
    expect(c.described).toMatchObject({ ok: true });
    expect(c.moods).toMatchObject({ ok: true });
    expect(c.action).toMatchObject({ ok: true });
    expect(c.length.ok).toBe(true);
    expect(c.ending.ok).toBe(true);
  });

  it('says how the count was off, and accepts any count in the range', () => {
    expect(byKind(checkAttempt(office, note({ count: 2 }), story)).count).toMatchObject({ ok: false, line: 'You saw 2. The picture has 3.' });
    expect(byKind(checkAttempt(office, note({ count: null }), story)).count).toMatchObject({ ok: false, line: 'You did not count the people. The picture has 3.' });
    const well = pictureById('ppdt-05')!; // 4–9, typically 6
    expect(byKind(checkAttempt(well, note({ count: 8, people: [] }), story)).count).toMatchObject({ ok: true, line: 'You saw 8. The picture has about 6 (4–9 is fair).' });
  });

  it('counts the people described in full — sex, age and mood', () => {
    const half = note({ people: [{ sex: 'M', age: '35', mood: '-' }, { sex: 'F', age: '', mood: '+' }, { sex: '', age: '', mood: '' }] });
    expect(byKind(checkAttempt(office, half, story)).described).toMatchObject({ ok: false, line: 'You described 1 of 3 in full: sex, age and mood.' });
  });

  it('flags a mood the picture does not support', () => {
    const c = byKind(checkAttempt(laptop, note({ count: 1, people: [{ sex: 'F', age: '25', mood: '+' }] }), story));
    expect(c.moods).toMatchObject({ ok: false });
    expect(c.moods.line).toMatch(/most read her as low or neutral/i);
  });

  it('wants the action in a few words', () => {
    expect(byKind(checkAttempt(office, note({ action: '' }), story)).action).toMatchObject({ ok: false });
    expect(byKind(checkAttempt(office, note({ action: 'work' }), story)).action).toMatchObject({ ok: false });
  });

  it('judges length against four minutes of writing', () => {
    expect(byKind(checkAttempt(office, note(), 'Too short to be a story.')).length).toMatchObject({ ok: false });
    expect(byKind(checkAttempt(office, note(), story)).length.line).toMatch(/^\d+ words/);
    expect(byKind(checkAttempt(office, note(), '')).length).toMatchObject({ ok: false, line: 'No story written.' });
  });

  it('looks for an ending', () => {
    expect(byKind(checkAttempt(office, note(), 'Rakesh found a fault. He called the team. They argued about it.')).ending).toMatchObject({ ok: false });
  });

  it('says plainly these are quick checks', () => {
    for (const c of checkAttempt(office, note(), story)) expect(c.line.length).toBeGreaterThan(0);
  });
});
