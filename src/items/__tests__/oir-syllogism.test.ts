import { describe, it, expect } from 'vitest';
import { optionMeaning, pickOption, verdicts } from '../oir/syllogism.ts';

/**
 * The syllogism solver behind Chapter 17's keys. Statements and conclusions
 * are written formally ("all cats dogs", "some dogs birds", "no x y",
 * "somenot x y", "few x y" for "only a few", "never x y" for "all x can never
 * be y", "canall"/"cansome" for possibilities). Every class named is taken to
 * have members, as the exam convention has it.
 */

describe('verdicts', () => {
  it('follows a chain of alls, and the some that their members give', () => {
    const v = verdicts(['all animals dogs', 'all dogs birds'], ['all animals birds', 'all birds animals', 'some birds animals']);
    expect(v.follows).toEqual([true, false, true]);
  });

  it('refuses a some drawn through a some', () => {
    expect(verdicts(['some roads streets', 'some streets ways'], ['some roads ways']).follows).toEqual([false]);
  });

  it('carries a no through an all, but not the other way round', () => {
    expect(verdicts(['all machines tools', 'no tools computers'], ['no machines computers', 'some computers tools']).follows).toEqual([true, false]);
    expect(verdicts(['no cats monkeys', 'no monkeys cows'], ['no cats cows']).follows).toEqual([false]);
  });

  it('gives "some not" from a some and a no', () => {
    expect(verdicts(['some tasks jobs', 'no jobs duties'], ['never tasks duties', 'some tasks duties']).follows).toEqual([true, false]);
  });

  it('reads "only a few" as some are and some are not', () => {
    expect(verdicts(['few b q', 'few q v'], ['some b v', 'never q v']).follows).toEqual([false, true]);
  });

  it('judges a possibility by whether any arrangement allows it', () => {
    expect(verdicts(['all tables woods', 'all woods paints', 'no paints steels'], ['canall steels woods']).follows).toEqual([false]);
    expect(verdicts(['some a b', 'some b c'], ['cansome a c', 'canall a c']).follows).toEqual([true, true]);
  });

  it('pairs two conclusions as either-or when neither follows and exactly one must be true', () => {
    expect(verdicts(['some a b', 'some b c'], ['some a c', 'no a c']).either).toEqual([[0, 1]]);
    expect(verdicts(['all x y', 'some y z'], ['all x z', 'somenot x z']).either).toEqual([[0, 1]]);
    expect(verdicts(['all x y'], ['some x y', 'no x y']).either).toEqual([]);
  });

  it('refuses statements that contradict each other, and a word it does not know', () => {
    expect(() => verdicts(['all a b', 'no a b'], ['some a b'])).toThrow(/contradict/);
    expect(() => verdicts(['many a b'], [])).toThrow(/many/);
  });
});

describe('optionMeaning', () => {
  it('reads which conclusions an option says follow', () => {
    expect(optionMeaning('Only conclusion II follows.', 2)).toEqual({ kind: 'set', set: [1] });
    expect(optionMeaning('Both conclusions (I) and (II) follow', 2)).toEqual({ kind: 'set', set: [0, 1] });
    expect(optionMeaning('I and III only', 3)).toEqual({ kind: 'set', set: [0, 2] });
    expect(optionMeaning('Only conclusion 2 follows.', 2)).toEqual({ kind: 'set', set: [1] });
    expect(optionMeaning('All three conclusion follow.', 3)).toEqual({ kind: 'set', set: [0, 1, 2] });
    expect(optionMeaning('All the conclusions are true', 3)).toEqual({ kind: 'set', set: [0, 1, 2] });
    expect(optionMeaning('Both the conclusions follow.', 2)).toEqual({ kind: 'set', set: [0, 1] });
  });

  it('reads neither, none and "do not follow" as an empty set', () => {
    for (const t of ['Neither conclusion I nor II follows', 'None of the conclusions is correct.', 'Both conclusion I and II do not follow.', 'Neither I nor II', 'none is correct']) {
      expect(optionMeaning(t, 3), t).toEqual({ kind: 'set', set: [] });
    }
  });

  it('reads an either-or option, and gives up on one that names no conclusion', () => {
    expect(optionMeaning('Either conclusion I or II follows.', 2)).toEqual({ kind: 'either', pair: [0, 1] });
    expect(optionMeaning('Conclusion I or II is true', 2)).toEqual({ kind: 'either', pair: [0, 1] });
    expect(optionMeaning('Only conclusion follows.', 2)).toBeNull();
  });
});

describe('pickOption', () => {
  it('names the one option that says what the solver found, preferring either-or to neither', () => {
    const opts = { A: 'Only conclusion I follows', B: 'Neither conclusion I nor II follows', C: 'Either conclusion I or II follows', D: 'Both conclusions I and II follow' };
    expect(pickOption(opts, ['some a b', 'some b c'], ['some a c', 'no a c'])).toBe(opts.C);
    expect(pickOption(opts, ['all a b', 'all b c'], ['some c a', 'all a c'])).toBe(opts.D);
  });

  it('throws when no option, or more than one, says it', () => {
    const opts = { A: 'Only conclusion I follows', B: 'Only conclusion I follows', C: 'Only conclusion II follows', D: 'Both conclusions I and II follow' };
    expect(() => pickOption(opts, ['all a b'], ['some a b', 'no a c'])).toThrow();
    expect(() => pickOption({ ...opts, B: 'Neither I nor II' }, ['all a b'], ['some a b', 'all b a'])).not.toThrow();
  });
});
