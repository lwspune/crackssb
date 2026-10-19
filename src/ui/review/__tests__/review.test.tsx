// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { ReviewForm } from '../ReviewForm.tsx';
import { ReviewMarks } from '../ReviewMarks.tsx';
import { ReviewQueue } from '../ReviewQueue.tsx';
import type { Review } from '../../../ppdt/rubric.ts';

afterEach(cleanup);

/**
 * A mentor's review of a PPDT attempt (D34): the form that marks it, the
 * marks the candidate then sees, and the queue it is picked from.
 */
const REVIEW: Review = {
  story: { hero: 4, action: 3, outcome: 4, outlook: 5 },
  narration: { clarity: 3, confidence: 4, timing: 5 },
  wentWell: 'A clear hero.',
  focusOn: 'Say how it ends.',
  at: '2026-10-19T08:00:00Z',
};

const choose = (heading: string, n: number) => fireEvent.click(within(screen.getByRole('group', { name: new RegExp(heading, 'i') })).getByRole('radio', { name: new RegExp(`^${n}`) }));

describe('ReviewForm', () => {
  const props = (over: Partial<Parameters<typeof ReviewForm>[0]> = {}) => ({
    hasNarration: true,
    initial: null,
    save: vi.fn(async () => ({ kind: 'ok' as const })),
    onDone: vi.fn(),
    ...over,
  });

  it('marks the narration only when there is one', () => {
    render(<ReviewForm {...props({ hasNarration: false })} />);
    expect(screen.getByRole('group', { name: /hero/i })).toBeTruthy();
    expect(screen.queryByRole('group', { name: /clarity/i })).toBeNull();
  });

  it('will not save until every heading is marked and something is written', async () => {
    const p = props();
    render(<ReviewForm {...p} />);
    choose('hero', 4);
    fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/mark action/i);
    expect(p.save).not.toHaveBeenCalled();
    // Once the mentor changes something, the old list goes: it no longer describes the form.
    choose('action', 3);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sends whole marks and the notes', async () => {
    const p = props();
    render(<ReviewForm {...p} />);
    for (const [h, n] of [['hero', 4], ['action', 3], ['outcome', 4], ['outlook', 5], ['clarity', 3], ['confidence', 4], ['within the minute', 5]] as const) choose(h, n);
    fireEvent.change(screen.getByLabelText(/went well/i), { target: { value: ' A clear hero. ' } });
    fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    await waitFor(() => expect(p.onDone).toHaveBeenCalled());
    expect(p.save).toHaveBeenCalledWith({
      story: { hero: 4, action: 3, outcome: 4, outlook: 5 },
      narration: { clarity: 3, confidence: 4, timing: 5 },
      wentWell: 'A clear hero.',
      focusOn: '',
    });
  });

  it('opens on the marks already given, to change them', () => {
    render(<ReviewForm {...props({ initial: REVIEW })} />);
    const hero = within(screen.getByRole('group', { name: /hero/i })).getByRole('radio', { name: /^4/ }) as HTMLInputElement;
    expect(hero.checked).toBe(true);
    expect((screen.getByLabelText(/work on/i) as HTMLTextAreaElement).value).toBe('Say how it ends.');
    expect(screen.getByRole('button', { name: /update marks/i })).toBeTruthy();
  });

  it('says so when the server refuses', async () => {
    const p = props({ initial: REVIEW, save: vi.fn(async () => ({ kind: 'refused' as const, reason: 'not_submitted' })) });
    render(<ReviewForm {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /update marks/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot be marked/i));
    expect(p.onDone).not.toHaveBeenCalled();
  });
});

describe('ReviewMarks', () => {
  it('shows each mark out of five, the notes, and when', () => {
    render(<ReviewMarks review={REVIEW} />);
    expect(screen.getByText('Hero').closest('li')?.textContent).toMatch(/4\s*\/\s*5/);
    expect(screen.getByText('Within the minute')).toBeTruthy();
    expect(screen.getByText('Say how it ends.')).toBeTruthy();
    expect(screen.getByText(/19 Oct 2026/)).toBeTruthy();
  });

  it('leaves the narration out when there was none', () => {
    render(<ReviewMarks review={{ ...REVIEW, narration: null }} />);
    expect(screen.queryByText('Clarity')).toBeNull();
  });
});

describe('ReviewQueue', () => {
  const row = (id: string, reviewedAt: string | null) => ({
    sessionId: id,
    name: `Cadet ${id}`,
    label: 'PPDT · Picture 3',
    input: 'typed' as const,
    submittedAt: '2026-10-18T08:00:00Z',
    hasNarration: true,
    reviewedAt,
  });

  it('names what was sent: a PPDT picture or a TAT set (D36), and says narration only for PPDT', () => {
    render(<ReviewQueue rows={[row('a', null), { ...row('b', null), label: 'TAT set 1', input: 'paper' as const, hasNarration: null }]} />);
    expect(screen.getByText('PPDT · Picture 3')).toBeTruthy();
    expect(screen.getByText('TAT set 1')).toBeTruthy();
    expect(screen.getByText('Narrated')).toBeTruthy();
    expect(screen.queryByText('No narration')).toBeNull();
  });

  it('puts the waiting first, each a link to mark it', () => {
    render(<ReviewQueue rows={[row('a', null), row('b', '2026-10-19T08:00:00Z')]} />);
    const waiting = screen.getByRole('region', { name: /waiting/i });
    expect(within(waiting).getByRole('link', { name: /cadet a/i }).getAttribute('href')).toBe('/staff/review/a');
    expect(within(screen.getByRole('region', { name: /reviewed/i })).getByRole('link', { name: /cadet b/i })).toBeTruthy();
  });

  it('says when nothing is waiting', () => {
    render(<ReviewQueue rows={[]} />);
    expect(screen.getByText(/nothing waiting/i)).toBeTruthy();
  });
});
