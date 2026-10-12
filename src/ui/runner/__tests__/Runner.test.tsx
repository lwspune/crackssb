// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { Runner } from '../Runner.tsx';
import { createMemoryStore } from '../session-store.ts';
import type { SessionStore } from '../session-store.ts';

/**
 * The forced-sequence contract (UI.md §3.1) asserted through the component a
 * candidate actually uses. The engine's own tests prove the reducer; these
 * prove the React wrapper does not undo it — no back, no count, advance on
 * expiry, persist before advancing, resume on reload, submit on expiry.
 */

const T0 = 1_800_000_000_000;
const WORD_MS = 15_000;
const content = { stimulus: (item: number) => `WORD${item}` };

let store: SessionStore;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(T0);
  store = createMemoryStore();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderRunner() {
  return render(<Runner instrument="wat" title="Word Association Test" store={store} content={content} />);
}

function begin() {
  renderRunner();
  fireEvent.click(screen.getByRole('button', { name: /begin/i }));
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const input = () => screen.getByLabelText(/your sentence/i) as HTMLInputElement;

describe('before the clock starts', () => {
  it('shows the brief and no stimulus until the candidate begins', () => {
    renderRunner();
    expect(screen.getByRole('button', { name: /begin/i })).toBeTruthy();
    expect(screen.queryByText('WORD0')).toBeNull();
    expect(store.load('wat')).toBeNull();
  });

  it('fixes the start time at Begin, not at page load', () => {
    renderRunner();
    advance(60_000);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    expect(store.load('wat')?.startedAtMs).toBe(T0 + 60_000);
  });
});

describe('forced sequence', () => {
  it('shows the first word once begun', () => {
    begin();
    expect(screen.getByText('WORD0')).toBeTruthy();
  });

  it('never shows how far through the sixty the candidate is', () => {
    begin();
    advance(WORD_MS * 3);
    expect(document.body.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*60\b/i);
  });

  it('offers no way back', () => {
    begin();
    advance(WORD_MS);
    expect(screen.queryByRole('button', { name: /back|previous/i })).toBeNull();
  });

  it('saves the response as it is typed', () => {
    begin();
    fireEvent.change(input(), { target: { value: 'Courage is quiet' } });
    expect(store.load('wat')?.saved['0']).toBe('Courage is quiet');
  });

  it('advances on expiry whether or not anything was typed, sealing the blank', () => {
    begin();
    advance(WORD_MS);
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(store.load('wat')?.saved['0']).toBe('');
  });

  it('keeps what was typed when the word advances, and gives the next word an empty field', () => {
    begin();
    fireEvent.change(input(), { target: { value: 'kept' } });
    advance(WORD_MS);
    expect(store.load('wat')?.saved['0']).toBe('kept');
    expect(input().value).toBe('');
  });

  it('counts down in whole seconds against the fixed timeline', () => {
    begin();
    advance(4_000);
    expect(screen.getByRole('timer').textContent).toContain('0:11');
  });

  it('announces each new word for screen readers', () => {
    begin();
    advance(WORD_MS);
    expect(screen.getByRole('status').textContent).toContain('WORD1');
  });
});

describe('the clock never pauses (UI.md §3.2)', () => {
  it('resumes a reloaded session at the word the clock says, with saved text intact', () => {
    store.create('wat', T0 - (WORD_MS * 2 + 3_000));
    store.persist('wat', '2', 'mid-thought');
    renderRunner();
    expect(screen.getByText('WORD2')).toBeTruthy();
    expect(input().value).toBe('mid-thought');
  });

  it('ends a session whose time ran out while the candidate was away', () => {
    store.create('wat', T0 - WORD_MS * 61);
    renderRunner();
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
    expect(store.load('wat')?.endedBy).toBe('expiry');
  });

  it('submits on expiry after the last word', () => {
    begin();
    advance(WORD_MS * 60);
    expect(store.load('wat')?.endedBy).toBe('expiry');
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
  });
});

describe('abandoning', () => {
  it('asks before ending, and carries on if the candidate keeps going', () => {
    begin();
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep going/i }));
    expect(screen.getByText('WORD0')).toBeTruthy();
    expect(store.load('wat')?.endedBy).toBeNull();
  });

  it('ends the session and keeps what was saved when confirmed', () => {
    begin();
    fireEvent.change(input(), { target: { value: 'kept' } });
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    fireEvent.click(screen.getByRole('button', { name: /end the test/i }));
    expect(store.load('wat')).toMatchObject({ endedBy: 'abandon', saved: { '0': 'kept' } });
  });

  it('does not stop the clock while the confirmation is open', () => {
    begin();
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    advance(WORD_MS);
    fireEvent.click(screen.getByRole('button', { name: /keep going/i }));
    expect(screen.getByText('WORD1')).toBeTruthy();
  });
});

describe('paper mode (D22) — the app keeps the clock, the candidate writes on a sheet', () => {
  function beginOnPaper() {
    renderRunner();
    fireEvent.click(screen.getByRole('radio', { name: /write on paper/i }));
    const code = screen.getByTestId('session-code').textContent ?? '';
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    return code;
  }

  it('offers typing or paper before the clock starts, typing by default', () => {
    renderRunner();
    expect((screen.getByRole('radio', { name: /type on screen/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /write on paper/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('gives a paper session a code to write on the sheet, and a sheet to print', () => {
    renderRunner();
    fireEvent.click(screen.getByRole('radio', { name: /write on paper/i }));
    const code = screen.getByTestId('session-code').textContent ?? '';
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect(screen.getByRole('link', { name: /print/i }).getAttribute('href')).toBe(`/sheets/wat?code=${code}`);
  });

  it('records the session as paper, with the code that was shown', () => {
    const code = beginOnPaper();
    expect(store.load('wat')).toMatchObject({ input: 'paper', code });
  });

  it('shows the word and its line number, but no field and never the total', () => {
    beginOnPaper();
    expect(screen.getByText('WORD0')).toBeTruthy();
    expect(screen.getByText(/line 1$/i)).toBeTruthy();
    expect(screen.queryByLabelText(/your sentence/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*60\b/i);
  });

  it('moves to the next line on the clock, like the typed runner', () => {
    beginOnPaper();
    advance(WORD_MS);
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(screen.getByText(/line 2$/i)).toBeTruthy();
  });

  it('ends by keeping the code in view and saying where the photos go', () => {
    const code = beginOnPaper();
    advance(WORD_MS * 60);
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
    expect(screen.getByText(code)).toBeTruthy();
    expect(screen.getByText(/upload/i)).toBeTruthy();
  });

  it('resumes a paper session after a reload, still on paper', () => {
    store.create('wat', T0 - (WORD_MS + 2_000), { input: 'paper', code: 'ACD-EFG' });
    renderRunner();
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(screen.queryByLabelText(/your sentence/i)).toBeNull();
  });
});

describe('after the test', () => {
  it('lets the candidate read back every word against what they wrote', () => {
    begin();
    fireEvent.change(input(), { target: { value: 'first answer' } });
    advance(WORD_MS * 60);
    expect(screen.getByText('first answer')).toBeTruthy();
    expect(screen.getByText('WORD59')).toBeTruthy();
  });
});
