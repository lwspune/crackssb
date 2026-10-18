import { describe, it, expect } from 'vitest';
import { EMPTY_NOTE, parseNote, serialiseNote, withCount } from '../note.ts';
import type { PpdtNote } from '../note.ts';

/**
 * The PPDT character box (D33), as the sheet prints it: how many people, then
 * each one's sex, age and mood (+, 0, −), then the action. Saved as one text
 * answer ('0:note'); read back tolerantly, because the feedback must never
 * fail on what a candidate typed.
 */
describe('the character box', () => {
  const note: PpdtNote = {
    count: 2,
    people: [
      { sex: 'M', age: '25', mood: '+' },
      { sex: 'F', age: '40', mood: '-' },
    ],
    action: 'A man helps a woman onto the train',
  };

  it('round-trips through the saved text', () => {
    expect(parseNote(serialiseNote(note))).toEqual(note);
  });

  it('reads nothing, or anything garbled, as an empty box', () => {
    expect(parseNote('')).toEqual(EMPTY_NOTE);
    expect(parseNote('not json')).toEqual(EMPTY_NOTE);
    expect(parseNote('{"count":"lots","people":"x"}')).toEqual(EMPTY_NOTE);
  });

  it('keeps only what fits each field', () => {
    expect(parseNote('{"count":3,"people":[{"sex":"X","age":"abc","mood":"?"},{"sex":"F","age":"200","mood":"0"}],"action":7}')).toEqual({
      count: 3,
      people: [
        { sex: '', age: '', mood: '' },
        { sex: 'F', age: '', mood: '0' },
      ],
      action: '',
    });
  });

  it('gives one row per person counted, keeping rows already filled, up to eight', () => {
    expect(withCount(note, 3).people).toEqual([...note.people, { sex: '', age: '', mood: '' }]);
    expect(withCount(note, 1).people).toEqual([note.people[0]]);
    expect(withCount(note, 20)).toMatchObject({ count: 20 });
    expect(withCount(note, 20).people).toHaveLength(8);
    expect(withCount(note, null)).toMatchObject({ count: null, people: [] });
  });
});
