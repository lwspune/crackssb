// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { PpdtRunner } from '../PpdtRunner.tsx';
import type { PpdtPictureMeta } from '../PpdtRunner.tsx';
import { createMemoryStore } from '../../runner/session-store.ts';
import type { SessionRecord, SessionStore } from '../../runner/session-store.ts';
import { parseNote } from '../../../ppdt/note.ts';

/**
 * The Stimulus → write contract (UI.md §3.1) through the PPDT screen (D33):
 * the picture for 30 s and never again, the character box for a minute, the
 * story for four; each answer saved in its own window; on to the result when
 * the time is up. On paper the screen keeps time and the sheet takes the ink.
 */

const T0 = 1_800_000_000_000;
const picture: PpdtPictureMeta = { id: 'ppdt-04', title: 'An office table', image: '/ppdt/ppdt-04.jpg', difficulty: 'hazy' };

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

const show = () => render(<PpdtRunner picture={picture} store={store} onDone={onDone} />);
const later = async (seconds: number) => {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000);
  });
};
async function begin(paper = false) {
  show();
  if (paper) fireEvent.click(screen.getByLabelText(/write on paper/i));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
  });
}
const saved = () => store.load('ppdt')?.saved ?? {};

describe('PpdtRunner', () => {
  it('briefs before the clock starts: 30 s to look, 1 min to note, 4 min to write', () => {
    show();
    for (const label of ['Look', 'Note', 'Write']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('30 s')).toBeTruthy();
    expect(screen.getByText('1 min')).toBeTruthy();
    expect(screen.getByText('4 min')).toBeTruthy();
    // The picture is not shown before the clock starts.
    expect(screen.queryByRole('img', { name: /picture/i })).toBeNull();
  });

  it('shows the picture for 30 seconds, as an attempt at this picture', async () => {
    await begin();
    const img = screen.getByRole('img', { name: /picture/i }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/ppdt/ppdt-04.jpg');
    expect(screen.getByRole('timer').textContent).toBe('0:30');
    expect(store.load('ppdt')).toMatchObject({ itemId: 'ppdt-04', startedAtMs: T0 });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('then hides it and asks for the character box, saved as it is filled', async () => {
    await begin();
    await later(30);
    expect(screen.queryByRole('img', { name: /picture/i })).toBeNull();
    expect(screen.getByRole('timer').textContent).toBe('1:00');
    fireEvent.change(screen.getByLabelText(/characters seen/i), { target: { value: '2' } });
    const rows = screen.getAllByRole('group', { name: /^person \d/i });
    expect(rows).toHaveLength(2);
    fireEvent.change(within(rows[0]).getByLabelText(/sex/i), { target: { value: 'M' } });
    fireEvent.change(within(rows[0]).getByLabelText(/age/i), { target: { value: '30' } });
    fireEvent.click(within(rows[0]).getByRole('radio', { name: /positive/i }));
    fireEvent.change(screen.getByLabelText(/action/i), { target: { value: 'A meeting about a plan' } });
    expect(parseNote(saved()['0:note'])).toEqual({
      count: 2,
      people: [{ sex: 'M', age: '30', mood: '+' }, { sex: '', age: '', mood: '' }],
      action: 'A meeting about a plan',
    });
  });

  it('then asks for the story, with a word count, and never shows the picture again', async () => {
    await begin();
    await later(90);
    expect(screen.queryByRole('img', { name: /picture/i })).toBeNull();
    expect(screen.getByRole('timer').textContent).toBe('4:00');
    fireEvent.change(screen.getByLabelText(/your story/i), { target: { value: 'Ravi had planned the meeting for weeks.' } });
    expect(saved()['0:write']).toBe('Ravi had planned the meeting for weeks.');
    expect(screen.getByText(/7 words/)).toBeTruthy();
  });

  it('ends when the four minutes are up, and goes to the result', async () => {
    await begin();
    await later(330);
    expect(store.load('ppdt')?.endedBy).toBe('expiry');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('on paper, gives the code and the sheet, keeps time, and takes nothing typed', async () => {
    show();
    fireEvent.click(screen.getByLabelText(/write on paper/i));
    expect(screen.getByTestId('session-code').textContent).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect((screen.getByRole('link', { name: /print the sheet/i }) as HTMLAnchorElement).getAttribute('href')).toMatch(/^\/sheets\/ppdt\?code=/);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    });
    await later(30);
    expect(screen.getByText(/character box on your sheet/i)).toBeTruthy();
    expect(screen.queryByLabelText(/characters seen/i)).toBeNull();
    await later(60);
    expect(screen.getByText(/story on your sheet/i)).toBeTruthy();
    expect(screen.queryByLabelText(/your story/i)).toBeNull();
  });

  it('resumes a reload where the clock is, with the box as it was left, and no picture', () => {
    const running: SessionRecord = {
      instrument: 'ppdt', input: 'typed', code: null, startedAtMs: T0 - 45_000, endedBy: null, itemId: 'ppdt-04',
      saved: { '0:note': JSON.stringify({ count: 3, people: [], action: 'Three at a table' }) },
    };
    store = createMemoryStore({ initial: running });
    show();
    expect(screen.queryByRole('img', { name: /picture/i })).toBeNull();
    expect(screen.getByRole('timer').textContent).toBe('0:45');
    expect((screen.getByLabelText(/characters seen/i) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/action/i) as HTMLInputElement).value).toBe('Three at a table');
  });

  it('says so, rather than mixing them, when a different picture is the one running', () => {
    const other: SessionRecord = { instrument: 'ppdt', input: 'typed', code: null, startedAtMs: T0 - 10_000, saved: {}, endedBy: null, itemId: 'ppdt-09' };
    store = createMemoryStore({ initial: other });
    show();
    expect(screen.getByText(/another picture is running/i)).toBeTruthy();
    expect((screen.getByRole('link', { name: /go to it/i }) as HTMLAnchorElement).getAttribute('href')).toBe('/picture/ppdt-09');
  });
});
