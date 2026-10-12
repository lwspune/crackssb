import { describe, it, expect } from 'vitest';
import { buildSchedule, positionAt } from '../schedule.ts';
import { INSTRUMENT_CONFIGS } from '../modes.ts';
import type { RunnerConfig } from '../modes.ts';

const T0 = 1_700_000_000_000;

describe('buildSchedule — forced sequence (WAT)', () => {
  const s = buildSchedule(INSTRUMENT_CONFIGS.wat, T0);

  it('lays out one contiguous 15 s segment per word', () => {
    expect(s.segments).toHaveLength(60);
    for (let i = 0; i < 60; i++) {
      expect(s.segments[i]).toMatchObject({
        item: i,
        phase: null,
        startMs: T0 + i * 15_000,
        endMs: T0 + (i + 1) * 15_000,
      });
    }
  });

  it('ends exactly at start + 60 × 15 s', () => {
    expect(s.endMs).toBe(T0 + 900_000);
  });
});

describe('buildSchedule — stimulus → write (TAT, PPDT)', () => {
  it('TAT: 12 items × [show 30 s, write 240 s], stimulus visible only while showing', () => {
    const s = buildSchedule(INSTRUMENT_CONFIGS.tat, T0);
    expect(s.segments).toHaveLength(24);
    expect(s.segments[0]).toMatchObject({ item: 0, phase: 'show', startMs: T0, endMs: T0 + 30_000, stimulusVisible: true });
    expect(s.segments[1]).toMatchObject({ item: 0, phase: 'write', startMs: T0 + 30_000, endMs: T0 + 270_000, stimulusVisible: false });
    expect(s.segments[23]).toMatchObject({ item: 11, phase: 'write' });
    expect(s.endMs).toBe(T0 + 12 * 270_000);
  });

  it('PPDT: one item × [show 30 s, note 60 s, write 240 s]', () => {
    const s = buildSchedule(INSTRUMENT_CONFIGS.ppdt, T0);
    expect(s.segments.map((x) => x.phase)).toEqual(['show', 'note', 'write']);
    expect(s.segments.map((x) => x.stimulusVisible)).toEqual([true, false, false]);
    expect(s.endMs).toBe(T0 + 330_000);
  });
});

describe('buildSchedule — global-window modes', () => {
  it('booklet (SRT) is a single window; item is not determined by time', () => {
    const s = buildSchedule(INSTRUMENT_CONFIGS.srt, T0);
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0]).toMatchObject({ item: null, phase: null, startMs: T0, endMs: T0 + 1_800_000 });
    expect(s.endMs).toBe(T0 + 1_800_000);
  });

  it('form (PIQ) has no end', () => {
    const s = buildSchedule(INSTRUMENT_CONFIGS.piq, T0);
    expect(s.endMs).toBeNull();
    expect(positionAt(s, T0 + 10 ** 12)).toEqual({ status: 'untimed' });
  });
});

describe('positionAt — boundaries', () => {
  const s = buildSchedule(INSTRUMENT_CONFIGS.wat, T0);

  it('at start: item 0 with the full window remaining', () => {
    expect(positionAt(s, T0)).toMatchObject({ status: 'live', item: 0, remainingMs: 15_000 });
  });

  it('exactly on a boundary belongs to the next item (half-open intervals)', () => {
    expect(positionAt(s, T0 + 15_000)).toMatchObject({ status: 'live', item: 1, remainingMs: 15_000 });
  });

  it('last millisecond before the end is still the last item', () => {
    expect(positionAt(s, T0 + 900_000 - 1)).toMatchObject({ status: 'live', item: 59, remainingMs: 1 });
  });

  it('at the end is expired', () => {
    expect(positionAt(s, T0 + 900_000)).toEqual({ status: 'expired' });
  });

  it('clock skew — now before start clamps to the start, it does not crash', () => {
    expect(positionAt(s, T0 - 5_000)).toMatchObject({ status: 'live', item: 0, remainingMs: 15_000 });
  });

  it('TAT: inside item 3 write phase reports phase, remaining and hidden stimulus', () => {
    const tat = buildSchedule(INSTRUMENT_CONFIGS.tat, T0);
    const now = T0 + 3 * 270_000 + 30_000 + 1_000;
    expect(positionAt(tat, now)).toMatchObject({
      status: 'live',
      item: 3,
      phase: 'write',
      stimulusVisible: false,
      remainingMs: 239_000,
    });
  });
});

describe('buildSchedule — rejects invalid config at the boundary', () => {
  it('zero items', () => {
    const bad = { ...INSTRUMENT_CONFIGS.wat, itemCount: 0 } as RunnerConfig;
    expect(() => buildSchedule(bad, T0)).toThrow(/itemCount/);
  });

  it('non-positive duration', () => {
    const bad = { ...INSTRUMENT_CONFIGS.wat, secondsPerItem: 0 } as RunnerConfig;
    expect(() => buildSchedule(bad, T0)).toThrow(/seconds/);
  });

  it('speak and room are declared but not runnable yet', () => {
    expect(() => buildSchedule({ mode: 'speak', prepSeconds: 180, speakSeconds: 180 }, T0)).toThrow(/not implemented/i);
  });
});
