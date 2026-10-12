import { describe, it, expect } from 'vitest';
import { start, reduce, resume } from '../engine.ts';
import type { Effect, RunnerEvent } from '../engine.ts';
import { INSTRUMENT_CONFIGS } from '../modes.ts';
import type { RunnerConfig } from '../modes.ts';

const T0 = 1_700_000_000_000;

/** Drive a fresh engine through a scripted sequence, returning final state and every effect in order. */
function run(config: RunnerConfig, steps: Array<[number, RunnerEvent]>) {
  const s0 = start(config, T0);
  let state = s0.state;
  const effects: Effect[] = [...s0.effects];
  for (const [at, event] of steps) {
    const r = reduce(state, event, at);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

type Persist = Extract<Effect, { type: 'persist' }>;
type Submitted = Extract<Effect, { type: 'submitted' }>;

const persists = (effects: Effect[]) => effects.filter((e): e is Persist => e.type === 'persist');
const persisted = (effects: Effect[]) => Object.fromEntries(persists(effects).map((e) => [e.key, e.text]));

// ---------------------------------------------------------------------------
// Forced sequence — WAT
// ---------------------------------------------------------------------------

describe('forced sequence (WAT)', () => {
  const wat = INSTRUMENT_CONFIGS.wat;

  it('start releases only the first item', () => {
    const { effects } = start(wat, T0);
    expect(effects).toEqual([{ type: 'release', item: 0 }]);
  });

  it('navigation is a no-op in either direction', () => {
    const s0 = start(wat, T0).state;
    const back = reduce(s0, { type: 'navigate', item: -1 }, T0 + 1_000);
    const fwd = reduce(s0, { type: 'navigate', item: 1 }, T0 + 1_000);
    expect(back.effects).toEqual([]);
    expect(fwd.effects).toEqual([]);
    expect(back.state.currentItem).toBe(0);
    expect(fwd.state.currentItem).toBe(0);
  });

  it('input persists to the live item immediately', () => {
    const { effects } = run(wat, [[T0 + 1_000, { type: 'input', text: 'always' }]]);
    expect(effects.at(-1)).toEqual({ type: 'persist', key: '0', item: 0, phase: null, text: 'always', final: false });
  });

  it('a tick before the boundary does nothing', () => {
    const { effects } = run(wat, [[T0 + 14_999, { type: 'tick' }]]);
    expect(effects).toHaveLength(1); // only the initial release
  });

  it('advances on expiry with nothing typed: blank is sealed, then the next item is released — in that order', () => {
    const { state, effects } = run(wat, [[T0 + 15_000, { type: 'tick' }]]);
    expect(effects.slice(1)).toEqual([
      { type: 'persist', key: '0', item: 0, phase: null, text: '', final: true },
      { type: 'release', item: 1 },
    ]);
    expect(state.currentItem).toBe(1);
  });

  it('seals what was typed before advancing', () => {
    const { effects } = run(wat, [
      [T0 + 1_000, { type: 'input', text: 'hello' }],
      [T0 + 15_000, { type: 'tick' }],
    ]);
    const seal = persists(effects).find((e) => e.final);
    expect(seal).toMatchObject({ item: 0, text: 'hello' });
  });

  it('input after an advance goes to the new item', () => {
    const { effects, state } = run(wat, [
      [T0 + 15_000, { type: 'tick' }],
      [T0 + 16_000, { type: 'input', text: 'second' }],
    ]);
    expect(effects.at(-1)).toMatchObject({ type: 'persist', item: 1, text: 'second' });
    expect(state.saved['1']).toBe('second');
  });

  it('a long gap (refresh) seals every skipped item and releases the live one', () => {
    const { state, effects } = run(wat, [[T0 + 5 * 15_000 + 1, { type: 'tick' }]]);
    expect(persists(effects).map((e) => e.item)).toEqual([0, 1, 2, 3, 4]);
    expect(effects.at(-1)).toEqual({ type: 'release', item: 5 });
    expect(state.currentItem).toBe(5);
  });

  it('expiry submits everything saved, blanks included', () => {
    const { state, effects } = run(wat, [
      [T0 + 1_000, { type: 'input', text: 'first' }],
      [T0 + 900_000, { type: 'tick' }],
    ]);
    const done = effects.at(-1) as Submitted;
    expect(done.type).toBe('submitted');
    expect(Object.keys(done.responses)).toHaveLength(60);
    expect(done.responses['0']).toBe('first');
    expect(done.responses['59']).toBe('');
    expect(state.status).toBe('ended');
    expect(state.endedBy).toBe('expiry');
  });

  it('after ending, every event is a no-op', () => {
    const { state } = run(wat, [[T0 + 900_000, { type: 'tick' }]]);
    const events: RunnerEvent[] = [{ type: 'tick' }, { type: 'input', text: 'x' }, { type: 'submit' }, { type: 'abandon' }];
    for (const ev of events) {
      const r = reduce(state, ev, T0 + 999_999);
      expect(r.effects).toEqual([]);
      expect(r.state).toBe(state);
    }
  });

  it('abandon ends the session with what was saved — an abandoned sheet is still marked', () => {
    const { state, effects } = run(wat, [
      [T0 + 1_000, { type: 'input', text: 'kept' }],
      [T0 + 2_000, { type: 'abandon' }],
    ]);
    expect(effects.at(-1)).toMatchObject({ type: 'abandoned', responses: { '0': 'kept' } });
    expect(state.endedBy).toBe('abandon');
  });

  it('never pauses: a fresh engine resumed from persisted state equals one that ran continuously', () => {
    const continuous = run(wat, [
      [T0 + 1_000, { type: 'input', text: 'a' }],
      [T0 + 16_000, { type: 'tick' }],
      [T0 + 17_000, { type: 'input', text: 'b' }],
      [T0 + 40_000, { type: 'tick' }],
    ]);
    // Everything the server would hold after those persists.
    const saved = persisted(continuous.effects);
    const resumed = resume(wat, T0, saved, T0 + 40_000);

    expect(resumed.state.currentItem).toBe(2);
    expect(resumed.state.currentItem).toBe(continuous.state.currentItem);
    expect(resumed.state.saved).toEqual(continuous.state.saved);
    expect(resumed.state.status).toBe(continuous.state.status);
    expect(resumed.effects).toEqual([{ type: 'release', item: 2 }]);
  });

  it('resume after the end submits, it does not reopen', () => {
    const resumed = resume(wat, T0, { '0': 'a' }, T0 + 900_000);
    expect(resumed.state.status).toBe('ended');
    expect(resumed.effects.at(-1)?.type).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// Booklet — SRT / OIR
// ---------------------------------------------------------------------------

describe('booklet (SRT)', () => {
  const srt = INSTRUMENT_CONFIGS.srt;

  it('start releases the whole booklet, in order', () => {
    const { effects } = start(srt, T0);
    expect(effects).toHaveLength(60);
    expect(effects.map((e) => (e as { item: number }).item)).toEqual([...Array(60).keys()]);
  });

  it('a release carries the item reference and nothing else — no key, no answer', () => {
    const { effects } = start(srt, T0);
    for (const e of effects) expect(Object.keys(e).sort()).toEqual(['item', 'type']);
  });

  it('free navigation: answer 6, then 1, both persisted', () => {
    const { state, effects } = run(srt, [
      [T0 + 1_000, { type: 'navigate', item: 6 }],
      [T0 + 2_000, { type: 'input', text: 'six' }],
      [T0 + 3_000, { type: 'navigate', item: 1 }],
      [T0 + 4_000, { type: 'input', text: 'one' }],
    ]);
    expect(persisted(effects)).toEqual({ '6': 'six', '1': 'one' });
    expect(state.currentItem).toBe(1);
    expect(state.saved).toEqual({ '6': 'six', '1': 'one' });
  });

  it('navigating out of range is a no-op', () => {
    const s0 = start(srt, T0).state;
    expect(reduce(s0, { type: 'navigate', item: 60 }, T0).state.currentItem).toBe(0);
    expect(reduce(s0, { type: 'navigate', item: -1 }, T0).state.currentItem).toBe(0);
  });

  it('ticks inside the window do nothing; the limit submits whatever is saved', () => {
    const { state, effects } = run(srt, [
      [T0 + 1_000, { type: 'input', text: 'x' }],
      [T0 + 1_799_999, { type: 'tick' }],
      [T0 + 1_800_000, { type: 'tick' }],
    ]);
    const done = effects.at(-1) as Submitted;
    expect(done.type).toBe('submitted');
    expect(done.responses['0']).toBe('x');
    expect(Object.keys(done.responses)).toHaveLength(60); // unanswered items submit as blank
    expect(state.endedBy).toBe('expiry');
  });

  it('explicit submit ends the session early', () => {
    const { state, effects } = run(srt, [
      [T0 + 1_000, { type: 'input', text: 'x' }],
      [T0 + 2_000, { type: 'submit' }],
    ]);
    expect(effects.at(-1)).toMatchObject({ type: 'submitted', responses: expect.objectContaining({ '0': 'x' }) });
    expect(state.endedBy).toBe('submit');
  });
});

// ---------------------------------------------------------------------------
// Stimulus → write — TAT / PPDT
// ---------------------------------------------------------------------------

describe('stimulus → write (TAT)', () => {
  const tat = INSTRUMENT_CONFIGS.tat;

  it('start releases item 0; the stimulus is visible', () => {
    const { state, effects } = start(tat, T0);
    expect(effects).toEqual([{ type: 'release', item: 0 }]);
    expect(state.position).toMatchObject({ item: 0, phase: 'show', stimulusVisible: true });
  });

  it('input during the show phase is ignored — you look, you do not write', () => {
    const { effects, state } = run(tat, [[T0 + 10_000, { type: 'input', text: 'early' }]]);
    expect(effects).toHaveLength(1);
    expect(state.saved).toEqual({});
  });

  it('cannot skip ahead', () => {
    const s0 = start(tat, T0).state;
    const r = reduce(s0, { type: 'navigate', item: 1 }, T0 + 5_000);
    expect(r.effects).toEqual([]);
    expect(r.state.currentItem).toBe(0);
  });

  it('entering the write phase hides the stimulus and emits nothing', () => {
    const { state, effects } = run(tat, [[T0 + 30_000, { type: 'tick' }]]);
    expect(effects).toHaveLength(1);
    expect(state.position).toMatchObject({ item: 0, phase: 'write', stimulusVisible: false });
  });

  it('input in the write phase persists under the item + phase key', () => {
    const { effects } = run(tat, [
      [T0 + 30_000, { type: 'tick' }],
      [T0 + 31_000, { type: 'input', text: 'Ravi, 24, ...' }],
    ]);
    expect(effects.at(-1)).toEqual({ type: 'persist', key: '0:write', item: 0, phase: 'write', text: 'Ravi, 24, ...', final: false });
  });

  it('item boundary seals the write phase, then releases the next slide', () => {
    const { effects, state } = run(tat, [
      [T0 + 31_000, { type: 'input', text: 'story' }],
      [T0 + 270_000, { type: 'tick' }],
    ]);
    expect(effects.slice(-2)).toEqual([
      { type: 'persist', key: '0:write', item: 0, phase: 'write', text: 'story', final: true },
      { type: 'release', item: 1 },
    ]);
    expect(state.position).toMatchObject({ item: 1, phase: 'show', stimulusVisible: true });
  });

  it('PPDT seals both the note and the story', () => {
    const { effects } = run(INSTRUMENT_CONFIGS.ppdt, [
      [T0 + 31_000, { type: 'input', text: '2 chars, positive' }],
      [T0 + 91_000, { type: 'input', text: 'the story' }],
      [T0 + 330_000, { type: 'tick' }],
    ]);
    expect(persists(effects).filter((e) => e.final)).toEqual([
      { type: 'persist', key: '0:note', item: 0, phase: 'note', text: '2 chars, positive', final: true },
      { type: 'persist', key: '0:write', item: 0, phase: 'write', text: 'the story', final: true },
    ]);
    expect(effects.at(-1)?.type).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// Free-write — SDT · Form — PIQ
// ---------------------------------------------------------------------------

describe('free-write (SDT)', () => {
  it('behaves as a five-prompt booklet with a 15-minute window', () => {
    const sdt = INSTRUMENT_CONFIGS.sdt;
    expect(start(sdt, T0).effects).toHaveLength(5);
    const { effects, state } = run(sdt, [
      [T0 + 1_000, { type: 'navigate', item: 4 }],
      [T0 + 2_000, { type: 'input', text: 'I would like to be ...' }],
      [T0 + 900_000, { type: 'tick' }],
    ]);
    expect(effects.at(-1)).toMatchObject({ type: 'submitted', responses: expect.objectContaining({ '4': 'I would like to be ...' }) });
    expect(state.endedBy).toBe('expiry');
  });
});

describe('form (PIQ)', () => {
  const piq = INSTRUMENT_CONFIGS.piq;

  it('has no clock — a tick a year later changes nothing', () => {
    const { state, effects } = run(piq, [[T0 + 365 * 86_400_000, { type: 'tick' }]]);
    expect(state.status).toBe('live');
    expect(effects.filter((e) => e.type !== 'release')).toEqual([]);
  });

  it('every input persists; submit ends it', () => {
    const { state, effects } = run(piq, [
      [T0 + 1_000, { type: 'navigate', item: 2 }],
      [T0 + 2_000, { type: 'input', text: 'Pune' }],
      [T0 + 3_000, { type: 'submit' }],
    ]);
    expect(persisted(effects)).toEqual({ '2': 'Pune' });
    expect(effects.at(-1)).toMatchObject({ type: 'submitted', responses: expect.objectContaining({ '2': 'Pune' }) });
    expect(state.endedBy).toBe('submit');
  });
});

// ---------------------------------------------------------------------------
// Boundary validation
// ---------------------------------------------------------------------------

describe('start — rejects at the boundary', () => {
  it('zero items', () => {
    expect(() => start({ ...INSTRUMENT_CONFIGS.srt, itemCount: 0 }, T0)).toThrow(/itemCount/);
  });

  it('speak mode is declared, not runnable', () => {
    expect(() => start({ mode: 'speak', prepSeconds: 180, speakSeconds: 180 }, T0)).toThrow(/not implemented/i);
  });

  it('state is never mutated — reduce returns a new object', () => {
    const s0 = start(INSTRUMENT_CONFIGS.wat, T0).state;
    const frozen = JSON.stringify(s0);
    reduce(s0, { type: 'input', text: 'x' }, T0 + 1);
    reduce(s0, { type: 'tick' }, T0 + 15_000);
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});
