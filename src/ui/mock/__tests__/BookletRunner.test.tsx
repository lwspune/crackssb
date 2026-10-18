// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { BookletRunner } from '../BookletRunner.tsx';
import type { MockMeta } from '../BookletRunner.tsx';
import { createMemoryStore } from '../../runner/session-store.ts';
import type { SessionRecord, SessionStore } from '../../runner/session-store.ts';
import type { PracticeItem } from '../../practice/PracticeRunner.tsx';

/**
 * The Booklet contract (UI.md §3.1) through the screen a candidate uses for an
 * OIR mock (D32): the whole booklet served keyless, answers in any order and
 * changeable, one server clock that never pauses, submit on expiry with
 * whatever is saved, and nothing about correctness until it is over.
 */

const T0 = 1_800_000_000_000;
const mock: MockMeta = { id: 'oir-mock-03', title: 'OIR Mock 3', itemCount: 40, timeLimitSeconds: 1200 };
const items: PracticeItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `q${i}`,
  stem: `Question text ${i + 1}`,
  options: { A: `a${i}`, B: `b${i}`, C: `c${i}`, D: `d${i}` },
}));

let store: SessionStore;
let onDone: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(T0);
  store = createMemoryStore();
  onDone = vi.fn();
  // Flags are kept per attempt on the device; every test's attempt starts at T0.
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = () => render(<BookletRunner mock={mock} items={items} store={store} onDone={onDone} />);

async function begin() {
  show();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
  });
}

const grid = () => screen.getByRole('navigation', { name: /questions/i });
const saved = () => store.load('oir')?.saved ?? {};
const option = (label: string) => screen.getByRole('button', { name: new RegExp(`^Option ${label},`) });

describe('BookletRunner', () => {
  it('briefs before the clock starts: how many, how long, any order', () => {
    show();
    expect(screen.getByRole('heading', { name: 'OIR Mock 3' })).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('20 min')).toBeTruthy();
    expect(screen.getByText(/any order/i)).toBeTruthy();
  });

  it('begins on question 1 with the full time, as an attempt at this mock', async () => {
    await begin();
    expect(screen.getByText('Question 1 of 40')).toBeTruthy();
    expect(screen.getByText('Question text 1')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('20:00');
    expect(store.load('oir')).toMatchObject({ testId: 'oir-mock-03', startedAtMs: T0 });
  });

  it('saves the answer chosen and marks it on the question grid', async () => {
    await begin();
    fireEvent.click(option('B'));
    expect(saved()['0']).toBe('B');
    expect(option('B').getAttribute('aria-pressed')).toBe('true');
    expect(within(grid()).getByRole('button', { name: 'Question 1, answered' })).toBeTruthy();
  });

  it('lets an answer be changed or cleared', async () => {
    await begin();
    fireEvent.click(option('B'));
    fireEvent.click(option('D'));
    expect(saved()['0']).toBe('D');
    fireEvent.click(screen.getByRole('button', { name: /clear answer/i }));
    expect(saved()['0']).toBe('');
    expect(within(grid()).getByRole('button', { name: 'Question 1, not answered' })).toBeTruthy();
  });

  it('moves freely: next, previous, and straight to any question from the grid', async () => {
    await begin();
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));
    expect(screen.getByText('Question 2 of 40')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^previous/i }));
    expect(screen.getByText('Question 1 of 40')).toBeTruthy();
    fireEvent.click(within(grid()).getByRole('button', { name: /^Question 27,/ }));
    expect(screen.getByText('Question 27 of 40')).toBeTruthy();
    expect(within(grid()).getByRole('button', { name: /^Question 27,/ }).getAttribute('aria-current')).toBe('true');
  });

  it('answers and moves from the keyboard', async () => {
    await begin();
    fireEvent.keyDown(window, { key: 'c' });
    expect(saved()['0']).toBe('C');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Question 2 of 40')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Question 1 of 40')).toBeTruthy();
  });

  it('flags a question to come back to', async () => {
    await begin();
    fireEvent.click(screen.getByRole('button', { name: /flag for review/i }));
    expect(within(grid()).getByRole('button', { name: 'Question 1, not answered, flagged' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^flagged$/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('asks before submitting, saying what is unanswered and flagged, then submits', async () => {
    await begin();
    fireEvent.click(option('A'));
    fireEvent.click(screen.getByRole('button', { name: /flag for review/i }));
    fireEvent.click(screen.getByRole('button', { name: /^submit/i }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/39 unanswered · 1 flagged/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /keep going/i }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^submit/i }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /submit now/i }));
    });
    expect(store.load('oir')?.endedBy).toBe('submit');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('submits by itself when time runs out, with whatever is saved', async () => {
    await begin();
    fireEvent.click(option('A'));
    await act(async () => {
      vi.advanceTimersByTime(1200 * 1000 + 500);
    });
    expect(store.load('oir')).toMatchObject({ endedBy: 'expiry', saved: { '0': 'A' } });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('resumes after a reload where the clock is, with the answers kept', () => {
    const running: SessionRecord = { instrument: 'oir', input: 'typed', code: null, startedAtMs: T0 - 5 * 60_000, saved: { '2': 'C' }, endedBy: null, testId: 'oir-mock-03' };
    store = createMemoryStore({ initial: running });
    show();
    expect(screen.getByRole('timer').textContent).toBe('15:00');
    expect(within(grid()).getByRole('button', { name: 'Question 3, answered' })).toBeTruthy();
  });

  it('says so, rather than mixing them, when a different mock is the one running', () => {
    const other: SessionRecord = { instrument: 'oir', input: 'typed', code: null, startedAtMs: T0 - 60_000, saved: {}, endedBy: null, testId: 'oir-mock-07' };
    store = createMemoryStore({ initial: other });
    show();
    expect(screen.getByText(/another mock is running/i)).toBeTruthy();
    expect((screen.getByRole('link', { name: /go to it/i }) as HTMLAnchorElement).getAttribute('href')).toBe('/mock/oir-mock-07');
  });
});
