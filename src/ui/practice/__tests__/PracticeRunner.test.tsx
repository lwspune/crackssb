// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { PracticeRunner } from '../PracticeRunner.tsx';
import type { PracticeItem, PracticeResult } from '../PracticeRunner.tsx';

/**
 * Chapter practice (D26) through the component a candidate uses: answer, and
 * only then see the key and its rule; move on; see the tally at the end.
 */

const ITEMS: PracticeItem[] = [
  { id: 'q1', direction: 'Find the missing number.', stem: '2, 4, 6, ?', options: { A: '7', B: '8', C: '9', D: '10' } },
  { id: 'q2', stem: 'A, C, E, ?', options: { A: 'F', B: 'G', C: 'H', D: 'I' } },
];
const KEYS: Record<string, { key: 'A' | 'B' | 'C' | 'D'; rule: string }> = {
  q1: { key: 'B', rule: 'Add 2 each time.' },
  q2: { key: 'B', rule: 'Skip one letter.' },
};

const fakeAnswer = () =>
  vi.fn(async (itemId: string, chosen: string): Promise<PracticeResult> => ({
    ok: true,
    correct: chosen === KEYS[itemId].key,
    key: KEYS[itemId].key,
    rule: KEYS[itemId].rule,
  }));

afterEach(cleanup);

async function pick(label: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

describe('chapter practice', () => {
  it('shows the question with its direction, and no answer before one is chosen', () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByText('Find the missing number.')).toBeTruthy();
    expect(screen.getByText('2, 4, 6, ?')).toBeTruthy();
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
    expect(screen.queryByText('Add 2 each time.')).toBeNull();
  });

  it('a right answer says so and shows the rule; the options lock', async () => {
    const answer = fakeAnswer();
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    expect(answer).toHaveBeenCalledWith('q1', 'B');
    expect(screen.getByRole('status').textContent).toMatch(/right/i);
    expect(screen.getByText('Add 2 each time.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /^Option A/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a wrong answer names the right one', async () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    await pick(/^Option C/);
    expect(screen.getByRole('status').textContent).toMatch(/wrong.*B/i);
    expect(screen.getByText('Add 2 each time.')).toBeTruthy();
  });

  it('a refused answer explains itself and leaves the question open', async () => {
    const answer = vi.fn(async (): Promise<PracticeResult> => ({ ok: false, message: 'A guardian has to consent.' }));
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    expect(screen.getByRole('alert').textContent).toMatch(/guardian/);
    expect((screen.getByRole('button', { name: /^Option B/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('moves to the next question and ends on the tally', async () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /next/i })));
    expect(screen.getByText('A, C, E, ?')).toBeTruthy();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    await pick(/^Option A/);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /finish/i })));
    expect(screen.getByText(/1 of 2 right/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /chapters/i }).getAttribute('href')).toBe('/practise/oir');
  });

  it('answers from the keyboard: a letter picks, Enter moves on', async () => {
    const answer = fakeAnswer();
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await act(async () => fireEvent.keyDown(window, { key: 'c' }));
    expect(answer).toHaveBeenCalledWith('q1', 'C');
    await act(async () => fireEvent.keyDown(window, { key: 'Enter' }));
    expect(screen.getByText('A, C, E, ?')).toBeTruthy();
  });

  it('ignores letters typed into a field elsewhere on the page', async () => {
    const answer = fakeAnswer();
    render(
      <>
        <input aria-label="search" />
        <PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />
      </>,
    );
    await act(async () => fireEvent.keyDown(screen.getByLabelText('search'), { key: 'a' }));
    expect(answer).not.toHaveBeenCalled();
  });
});
