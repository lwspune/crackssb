// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { WatReviewForm } from '../WatReviewForm.tsx';

/** A mentor marks a WAT (D41): words answered, then positive, practical, own voice. No total. */
afterEach(cleanup);

describe('WatReviewForm', () => {
  it('takes the count answered and the three headings, and saves them', async () => {
    const save = vi.fn().mockResolvedValue({ kind: 'ok' });
    const onDone = vi.fn();
    render(<WatReviewForm initial={null} save={save} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText(/words answered/i), { target: { value: '55' } });
    for (const [heading, n] of [['Positive', 4], ['Practical', 3], ['Own voice', 2]] as const) {
      fireEvent.click(within(screen.getByRole('group', { name: heading })).getByRole('radio', { name: `${n} of 5` }));
    }
    fireEvent.change(screen.getByLabelText(/work on/i), { target: { value: 'Fewer "should"s.' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(save).toHaveBeenCalledWith({ answered: 55, marks: { positive: 4, practical: 3, own: 2 }, wentWell: '', focusOn: 'Fewer "should"s.' });
    expect(onDone).toHaveBeenCalled();
  });

  it('says what is missing before saving', async () => {
    const save = vi.fn();
    render(<WatReviewForm initial={null} save={save} onDone={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/count the words answered/i);
    expect(save).not.toHaveBeenCalled();
  });

  it('opens with an earlier review filled in', () => {
    render(
      <WatReviewForm
        initial={{ answered: 50, marks: { positive: 4, practical: 3, own: 2 }, wentWell: 'Quick.', focusOn: null, at: '2026-10-19T10:00:00Z' }}
        save={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/words answered/i) as HTMLInputElement).value).toBe('50');
    expect((within(screen.getByRole('group', { name: 'Own voice' })).getByRole('radio', { name: '2 of 5' }) as HTMLInputElement).checked).toBe(true);
  });
});
