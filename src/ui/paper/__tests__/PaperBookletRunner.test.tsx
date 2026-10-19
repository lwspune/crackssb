// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { PaperBookletRunner } from '../PaperBookletRunner.tsx';
import type { PaperBooklet } from '../PaperBookletRunner.tsx';
import { createMemoryStore } from '../../runner/session-store.ts';
import type { SessionRecord, SessionStore } from '../../runner/session-store.ts';

/**
 * SRT (D39) and SDT (D40) on paper (D38): the whole list to read, in any
 * order, one clock on the server's time; the answers go on the sheet. The
 * candidate can hand in early; otherwise the clock ends it. Then on to the
 * result, where the sheet is photographed.
 */

const T0 = 1_800_000_000_000;
const srt: PaperBooklet = {
  instrument: 'srt',
  testId: 'srt-set-01',
  title: 'Situation Reaction Test',
  heading: 'SRT set 1',
  facts: [
    { value: '60', label: 'Situations' },
    { value: '30 min', label: 'In all' },
    { value: 'Any', label: 'Order' },
  ],
  instruction: 'Read each situation and write what he does, in a line or two.',
  items: Array.from({ length: 60 }, (_, i) => `Situation ${i + 1}.`),
  sheet: '/sheets/srt',
  back: '/practise/srt',
};
const sdt: PaperBooklet = { ...srt, instrument: 'sdt', testId: null, title: 'Self Description Test', heading: 'SDT', items: ['Parents?', 'Teachers?', 'Friends?', 'Yourself?', 'Become?'], sheet: '/sheets/sdt', back: '/practise' };

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

const show = (b = srt) => render(<PaperBookletRunner booklet={b} store={store} onDone={onDone} />);
const later = async (seconds: number) => {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000);
  });
};
async function begin(b = srt) {
  show(b);
  const code = screen.getByTestId('session-code').textContent ?? '';
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
  });
  return code;
}

describe('PaperBookletRunner', () => {
  it('briefs on paper: the figures, a code for the sheet, the sheet to print, and nothing to read yet', () => {
    show();
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    const code = screen.getByTestId('session-code').textContent ?? '';
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect(screen.getByRole('link', { name: /print the sheet/i }).getAttribute('href')).toBe(`/sheets/srt?code=${code}`);
    expect(screen.queryByText('Situation 1.')).toBeNull();
  });

  it('starts a paper attempt at this set and shows every situation, numbered, with the clock', async () => {
    const code = await begin();
    expect(store.load('srt')).toMatchObject({ input: 'paper', code, testId: 'srt-set-01', startedAtMs: T0 });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(60);
    expect(items[59].textContent).toMatch(/60.*Situation 60\./);
    expect(screen.getByRole('timer').textContent).toBe('30:00');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('hands in early only after a confirm, then goes to the result', async () => {
    await begin();
    await later(600);
    fireEvent.click(screen.getByRole('button', { name: /hand in/i }));
    expect(store.load('srt')?.endedBy).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /yes, hand in/i }));
    });
    expect(store.load('srt')?.endedBy).toBe('submit');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ends when the time is up', async () => {
    await begin();
    await later(1800);
    expect(store.load('srt')?.endedBy).toBe('expiry');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('runs SDT the same way: five prompts, no set', async () => {
    await begin(sdt);
    expect(store.load('sdt')).toMatchObject({ input: 'paper', testId: null });
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('resumes a reload where the clock is', () => {
    const running: SessionRecord = { instrument: 'srt', input: 'paper', code: 'ACD-EFG', startedAtMs: T0 - 300_000, saved: {}, endedBy: null, testId: 'srt-set-01' };
    store = createMemoryStore({ initial: running });
    show();
    expect(screen.getByRole('timer').textContent).toBe('25:00');
    expect(screen.getAllByRole('listitem')).toHaveLength(60);
  });

  it('says so, rather than mixing them, when a different set is running', () => {
    const other: SessionRecord = { instrument: 'srt', input: 'paper', code: 'ACD-EFG', startedAtMs: T0 - 10_000, saved: {}, endedBy: null, testId: 'srt-set-02' };
    store = createMemoryStore({ initial: other });
    show();
    expect(screen.getByText(/another set is running/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /go to it/i }).getAttribute('href')).toBe('/srt/srt-set-02');
  });
});
