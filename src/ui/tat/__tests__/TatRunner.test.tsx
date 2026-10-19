// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { TatRunner } from '../TatRunner.tsx';
import type { TatSetMeta } from '../TatRunner.tsx';
import { createMemoryStore } from '../../runner/session-store.ts';
import type { SessionRecord, SessionStore } from '../../runner/session-store.ts';

/**
 * The Stimulus → write contract (UI.md §3.1) through TAT (D36), on paper only
 * (D38): twelve slides back to back, each 30 s to look and 4 min to write on
 * the sheet, the twelfth blank; a picture never comes back; on to the result,
 * where the sheet is photographed, when the set is over.
 */

const T0 = 1_800_000_000_000;
const SLIDE = 270;
const set: TatSetMeta = {
  id: 'tat-set-01',
  title: 'TAT set 1',
  slides: [
    ...Array.from({ length: 11 }, (_, i) => ({ id: `tat-${String(i + 1).padStart(2, '0')}`, image: `/tat/tat-${String(i + 1).padStart(2, '0')}.jpg`, title: `Picture ${i + 1}` })),
    { id: 'tat-blank', image: null, title: 'Blank' },
  ],
};

let store: SessionStore;
let onDone: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(T0);
  store = createMemoryStore();
  onDone = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = () => render(<TatRunner set={set} store={store} onDone={onDone} />);
const later = async (seconds: number) => {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000);
  });
};
async function begin() {
  show();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
  });
}
const picture = () => screen.queryByRole('img', { name: /picture/i }) as HTMLImageElement | null;

describe('TatRunner', () => {
  it('briefs before the clock starts: twelve slides, 30 s to look, 4 min to write, 54 minutes', () => {
    show();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('30 s')).toBeTruthy();
    expect(screen.getByText('4 min')).toBeTruthy();
    expect(screen.getByText(/54 minutes/)).toBeTruthy();
    expect(picture()).toBeNull();
  });

  it('is on paper: a code for the sheet and the sheet to print, no typing offered', () => {
    show();
    const code = screen.getByTestId('session-code').textContent ?? '';
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect((screen.getByRole('link', { name: /print the sheet/i }) as HTMLAnchorElement).getAttribute('href')).toBe(`/sheets/tat?code=${code}`);
    expect(screen.queryByLabelText(/type on screen/i)).toBeNull();
  });

  it('shows the first picture for 30 seconds, as a paper attempt at this set', async () => {
    show();
    const code = screen.getByTestId('session-code').textContent ?? '';
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    });
    expect(picture()?.getAttribute('src')).toBe('/tat/tat-01.jpg');
    expect(screen.getByRole('timer').textContent).toBe('0:30');
    expect(screen.getByText(/slide 1 of 12/i)).toBeTruthy();
    expect(store.load('tat')).toMatchObject({ testId: 'tat-set-01', startedAtMs: T0, input: 'paper', code });
  });

  it('then hides it and keeps four minutes for the story on the sheet', async () => {
    await begin();
    await later(30);
    expect(picture()).toBeNull();
    expect(screen.getByRole('timer').textContent).toBe('4:00');
    expect(screen.getByText(/write story 1 on your sheet/i)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('moves to the next picture when the four minutes are up', async () => {
    await begin();
    await later(SLIDE);
    expect(picture()?.getAttribute('src')).toBe('/tat/tat-02.jpg');
    expect(screen.getByText(/slide 2 of 12/i)).toBeTruthy();
    await later(30);
    expect(screen.getByText(/write story 2 on your sheet/i)).toBeTruthy();
  });

  it('ends on a blank twelfth slide: no picture, a story of your own', async () => {
    await begin();
    await later(11 * SLIDE);
    expect(screen.getByText(/slide 12 of 12/i)).toBeTruthy();
    expect(picture()).toBeNull();
    expect(screen.getByText(/blank slide/i)).toBeTruthy();
    await later(30);
    expect(screen.getByText(/write story 12 on your sheet/i)).toBeTruthy();
  });

  it('ends when the last four minutes are up, and goes to the result', async () => {
    await begin();
    await later(12 * SLIDE);
    expect(store.load('tat')?.endedBy).toBe('expiry');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('resumes a reload where the clock is, with no picture', () => {
    const running: SessionRecord = {
      instrument: 'tat', input: 'paper', code: 'ACD-EFG', startedAtMs: T0 - (2 * SLIDE + 100) * 1000, endedBy: null, testId: 'tat-set-01', saved: {},
    };
    store = createMemoryStore({ initial: running });
    show();
    expect(picture()).toBeNull();
    expect(screen.getByText(/slide 3 of 12/i)).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('2:50');
    expect(screen.getByText(/write story 3 on your sheet/i)).toBeTruthy();
  });

  it('says so, rather than mixing them, when a different set is the one running', () => {
    const other: SessionRecord = { instrument: 'tat', input: 'paper', code: 'ACD-EFG', startedAtMs: T0 - 10_000, saved: {}, endedBy: null, testId: 'tat-set-02' };
    store = createMemoryStore({ initial: other });
    show();
    expect(screen.getByText(/another set is running/i)).toBeTruthy();
    expect((screen.getByRole('link', { name: /go to it/i }) as HTMLAnchorElement).getAttribute('href')).toBe('/tat/tat-set-02');
  });
});
