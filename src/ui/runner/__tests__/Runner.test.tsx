// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { Runner } from '../Runner.tsx';
import { createMemoryStore } from '../session-store.ts';
import type { SessionRecord, SessionStore, SyncState } from '../session-store.ts';

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

/** Typing is kept but not offered (D38); these tests switch it back on to keep that path working. */
function renderRunner(offerTyped = true) {
  return render(<Runner instrument="wat" title="Word Association Test" store={store} content={content} offerTyped={offerTyped} photoHref={() => '/results/wat/s-1'} />);
}

/** Begin waits on the store (in the app, the server issues the start time). */
async function clickBegin() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
  });
}

async function begin() {
  renderRunner();
  await clickBegin();
}

/** A session already under way, as a reload finds it on the server. */
const record = (startedAtMs: number, over: Partial<SessionRecord> = {}): SessionRecord => ({
  instrument: 'wat', input: 'typed', code: null, startedAtMs, saved: {}, endedBy: null, ...over,
});

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const input = () => screen.getByLabelText(/your sentence/i) as HTMLInputElement;

describe('before the clock starts', () => {
  it('shows the brief and no stimulus until the candidate begins', async () => {
    renderRunner();
    expect(screen.getByRole('button', { name: /begin/i })).toBeTruthy();
    expect(screen.queryByText('WORD0')).toBeNull();
    expect(store.load('wat')).toBeNull();
  });

  it('fixes the start time at Begin, not at page load', async () => {
    renderRunner();
    advance(60_000);
    await clickBegin();
    expect(store.load('wat')?.startedAtMs).toBe(T0 + 60_000);
  });
});

describe('forced sequence', () => {
  it('shows the first word once begun', async () => {
    await begin();
    expect(screen.getByText('WORD0')).toBeTruthy();
  });

  it('never shows how far through the sixty the candidate is', async () => {
    await begin();
    advance(WORD_MS * 3);
    expect(document.body.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*60\b/i);
  });

  it('offers no way back', async () => {
    await begin();
    advance(WORD_MS);
    expect(screen.queryByRole('button', { name: /back|previous/i })).toBeNull();
  });

  it('saves the response as it is typed', async () => {
    await begin();
    fireEvent.change(input(), { target: { value: 'Courage is quiet' } });
    expect(store.load('wat')?.saved['0']).toBe('Courage is quiet');
  });

  it('advances on expiry whether or not anything was typed, sealing the blank', async () => {
    await begin();
    advance(WORD_MS);
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(store.load('wat')?.saved['0']).toBe('');
  });

  it('keeps what was typed when the word advances, and gives the next word an empty field', async () => {
    await begin();
    fireEvent.change(input(), { target: { value: 'kept' } });
    advance(WORD_MS);
    expect(store.load('wat')?.saved['0']).toBe('kept');
    expect(input().value).toBe('');
  });

  it('counts down in whole seconds against the fixed timeline', async () => {
    await begin();
    advance(4_000);
    expect(screen.getByRole('timer').textContent).toContain('0:11');
  });

  it('announces each new word for screen readers', async () => {
    await begin();
    advance(WORD_MS);
    expect(screen.getByRole('status').textContent).toContain('WORD1');
  });
});

describe('the clock never pauses (UI.md §3.2)', () => {
  it('resumes a reloaded session at the word the clock says, with saved text intact', async () => {
    store = createMemoryStore({ initial: record(T0 - (WORD_MS * 2 + 3_000), { saved: { '2': 'mid-thought' } }) });
    renderRunner();
    expect(screen.getByText('WORD2')).toBeTruthy();
    expect(input().value).toBe('mid-thought');
  });

  it('ends a session whose time ran out while the candidate was away', async () => {
    store = createMemoryStore({ initial: record(T0 - WORD_MS * 61) });
    renderRunner();
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
    expect(store.load('wat')?.endedBy).toBe('expiry');
  });

  it('submits on expiry after the last word', async () => {
    await begin();
    advance(WORD_MS * 60);
    expect(store.load('wat')?.endedBy).toBe('expiry');
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
  });
});

describe('abandoning', () => {
  it('asks before ending, and carries on if the candidate keeps going', async () => {
    await begin();
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep going/i }));
    expect(screen.getByText('WORD0')).toBeTruthy();
    expect(store.load('wat')?.endedBy).toBeNull();
  });

  it('ends the session and keeps what was saved when confirmed', async () => {
    await begin();
    fireEvent.change(input(), { target: { value: 'kept' } });
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    fireEvent.click(screen.getByRole('button', { name: /end the test/i }));
    expect(store.load('wat')).toMatchObject({ endedBy: 'abandon', saved: { '0': 'kept' } });
  });

  it('does not stop the clock while the confirmation is open', async () => {
    await begin();
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    advance(WORD_MS);
    fireEvent.click(screen.getByRole('button', { name: /keep going/i }));
    expect(screen.getByText('WORD1')).toBeTruthy();
  });
});

describe('paper mode (D22) — the app keeps the clock, the candidate writes on a sheet', () => {
  async function beginOnPaper() {
    renderRunner();
    fireEvent.click(screen.getByRole('radio', { name: /write on paper/i }));
    const code = screen.getByTestId('session-code').textContent ?? '';
    await clickBegin();
    return code;
  }

  it('offers typing or paper before the clock starts, typing by default', async () => {
    renderRunner();
    expect((screen.getByRole('radio', { name: /type on screen/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /write on paper/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('gives a paper session a code to write on the sheet, and a sheet to print', async () => {
    renderRunner();
    fireEvent.click(screen.getByRole('radio', { name: /write on paper/i }));
    const code = screen.getByTestId('session-code').textContent ?? '';
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect(screen.getByRole('link', { name: /print/i }).getAttribute('href')).toBe(`/sheets/wat?code=${code}`);
  });

  it('records the session as paper, with the code that was shown', async () => {
    const code = await beginOnPaper();
    expect(store.load('wat')).toMatchObject({ input: 'paper', code });
  });

  it('shows the word and its line number, but no field and never the total', async () => {
    await beginOnPaper();
    expect(screen.getByText('WORD0')).toBeTruthy();
    expect(screen.getByText(/line 1$/i)).toBeTruthy();
    expect(screen.queryByLabelText(/your sentence/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*60\b/i);
  });

  it('moves to the next line on the clock, like the typed runner', async () => {
    await beginOnPaper();
    advance(WORD_MS);
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(screen.getByText(/line 2$/i)).toBeTruthy();
  });

  it('ends by keeping the code in view and going on to photograph the sheet', async () => {
    const code = await beginOnPaper();
    advance(WORD_MS * 60);
    expect(screen.getByRole('heading', { name: /time is up/i })).toBeTruthy();
    expect(screen.getByText(code)).toBeTruthy();
    expect(screen.getByRole('link', { name: /photograph your sheet/i }).getAttribute('href')).toBe('/results/wat/s-1');
  });

  it('resumes a paper session after a reload, still on paper', async () => {
    store = createMemoryStore({ initial: record(T0 - (WORD_MS + 2_000), { input: 'paper', code: 'ACD-EFG' }) });
    renderRunner();
    expect(screen.getByText('WORD1')).toBeTruthy();
    expect(screen.queryByLabelText(/your sentence/i)).toBeNull();
  });
});

describe('paper only, as at the SSB (D38)', () => {
  it('offers no typing: the code and the sheet are there from the start', () => {
    renderRunner(false);
    expect(screen.queryByRole('radio', { name: /type on screen/i })).toBeNull();
    const code = screen.getByTestId('session-code').textContent ?? '';
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect(screen.getByRole('link', { name: /print/i }).getAttribute('href')).toBe(`/sheets/wat?code=${code}`);
  });

  it('starts every session on paper', async () => {
    renderRunner(false);
    const code = screen.getByTestId('session-code').textContent ?? '';
    await clickBegin();
    expect(store.load('wat')).toMatchObject({ input: 'paper', code });
    expect(screen.queryByLabelText(/your sentence/i)).toBeNull();
  });
});

describe('after the test', () => {
  it('lets the candidate read back every word against what they wrote', async () => {
    await begin();
    fireEvent.change(input(), { target: { value: 'first answer' } });
    advance(WORD_MS * 60);
    expect(screen.getByText('first answer')).toBeTruthy();
    expect(screen.getByText('WORD59')).toBeTruthy();
  });
});

describe('the server is the clock (Sprint 1)', () => {
  /** A store whose clock runs `offset` ms ahead of this device, and whose sync state the test sets. */
  function skewedStore(offset: number, initial: SessionRecord | null) {
    const inner = createMemoryStore({ initial, now: () => Date.now() + offset });
    let state: SyncState = 'saved';
    const listeners = new Set<() => void>();
    const s: SessionStore & { setSync(next: SyncState): void } = {
      ...inner,
      clockOffsetMs: () => offset,
      syncState: () => state,
      subscribe: (fn) => (listeners.add(fn), () => void listeners.delete(fn)),
      setSync(next) {
        state = next;
        for (const l of listeners) l();
      },
    };
    return s;
  }

  it('counts down on the store’s clock, so a phone set wrong gets the real 15 seconds', async () => {
    // The server started this session 4 s ago by ITS clock, which runs 10 minutes ahead of this phone.
    const AHEAD = 10 * 60_000;
    store = skewedStore(AHEAD, record(T0 + AHEAD - 4_000));
    renderRunner();
    expect(screen.getByRole('timer').textContent).toContain('0:11');
    expect(screen.getByText('WORD0')).toBeTruthy();
  });

  it('says so when answers are not reaching the server, and stops saying so when they are', async () => {
    const s = skewedStore(0, null);
    store = s;
    await begin();
    expect(screen.queryByText(/not saved/i)).toBeNull();
    act(() => s.setSync('offline'));
    expect(screen.getByText(/not saved/i)).toBeTruthy();
    act(() => s.setSync('saved'));
    expect(screen.queryByText(/not saved/i)).toBeNull();
  });

  it('explains a start the server refuses, and stays on the brief', async () => {
    store = { ...createMemoryStore(), create: async () => { throw new Error('consent_required'); } };
    renderRunner();
    await clickBegin();
    expect(screen.getByRole('alert').textContent).toMatch(/guardian/i);
    expect(screen.getByRole('button', { name: /begin/i })).toBeTruthy();
  });
});
