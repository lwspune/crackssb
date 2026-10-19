// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { PaperResult } from '../PaperResult.tsx';
import { PaperReviewMarks } from '../PaperReviewMarks.tsx';
import { SdtReviewForm } from '../SdtReviewForm.tsx';
import { SrtReviewForm } from '../SrtReviewForm.tsx';

/**
 * The SRT (D39) and SDT (D40) screens around the runner: the result — the
 * code, the sheet's photos, and what was asked, to check the sheet against —
 * the mentor's forms, and the marks as the candidate reads them. No total.
 */
afterEach(cleanup);

describe('PaperResult', () => {
  it('gives the code, the sheet, and every item asked, numbered, to check the sheet against', () => {
    render(<PaperResult heading="The situations" items={['He is lost.', 'He sees a fire.']} paperCode="ACD-EFG" sheet={<p>photos here</p>} />);
    expect(screen.getByText('ACD-EFG')).toBeTruthy();
    expect(screen.getByText('photos here')).toBeTruthy();
    const rows = within(screen.getByRole('list', { name: /the situations/i })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['1He is lost.', '2He sees a fire.']);
  });

  it('puts a mark beside each item when there is one (SDT paragraphs)', () => {
    render(<PaperResult heading="The paragraphs" items={['Parents?', 'Teachers?']} paperCode="ACD-EFG" marks={[4, null]} />);
    const rows = within(screen.getByRole('list', { name: /the paragraphs/i })).getAllByRole('listitem');
    expect(within(rows[0]).getByText('4 / 5')).toBeTruthy();
    expect(within(rows[1]).getByText(/not written/i)).toBeTruthy();
  });
});

describe('SrtReviewForm', () => {
  it('takes the count answered and the three headings, and saves them', async () => {
    const save = vi.fn().mockResolvedValue({ kind: 'ok' });
    render(<SrtReviewForm initial={null} save={save} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/situations answered/i), { target: { value: '42' } });
    for (const [heading, n] of [['Practical', 4], ['Quick', 3], ['Complete', 4]] as const) {
      fireEvent.click(within(screen.getByRole('group', { name: heading })).getByRole('radio', { name: `${n} of 5` }));
    }
    fireEvent.change(screen.getByLabelText(/went well/i), { target: { value: 'Acts at once.' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(save).toHaveBeenCalledWith({ answered: 42, marks: { practical: 4, quick: 3, complete: 4 }, wentWell: 'Acts at once.', focusOn: '' });
  });

  it('says what is missing before saving', async () => {
    const save = vi.fn();
    render(<SrtReviewForm initial={null} save={save} onDone={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/count the situations answered/i);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('SdtReviewForm', () => {
  it('marks each paragraph 1-5 or not written, and the two headings', async () => {
    const save = vi.fn().mockResolvedValue({ kind: 'ok' });
    render(<SdtReviewForm prompts={['Parents?', 'Teachers?', 'Friends?', 'Yourself?', 'Become?']} initial={null} save={save} onDone={vi.fn()} />);
    const paragraphs = screen.getAllByRole('group', { name: /^paragraph \d$/i });
    expect(paragraphs).toHaveLength(5);
    fireEvent.click(within(paragraphs[0]).getByRole('radio', { name: '4 of 5' }));
    fireEvent.click(within(paragraphs[4]).getByRole('radio', { name: /not written/i }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Honest' })).getByRole('radio', { name: '4 of 5' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Consistent' })).getByRole('radio', { name: '3 of 5' }));
    fireEvent.change(screen.getByLabelText(/work on/i), { target: { value: 'Name a weakness.' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(save).toHaveBeenCalledWith({ paragraphs: [4, null, null, null, null], marks: { honest: 4, consistent: 3 }, wentWell: '', focusOn: 'Name a weakness.' });
  });
});

describe('PaperReviewMarks', () => {
  it('reads the mentor’s marks, each out of five, with no total', () => {
    render(
      <PaperReviewMarks
        summary="42 of 60 situations answered."
        rows={[{ label: 'Practical', mark: 4 }, { label: 'Quick', mark: 3 }]}
        wentWell="Acts at once."
        focusOn={null}
        at="2026-10-19T10:00:00Z"
      />,
    );
    expect(screen.getByText('42 of 60 situations answered.')).toBeTruthy();
    expect(screen.getByText('4 / 5')).toBeTruthy();
    expect(screen.getByText('Acts at once.')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/total|average/i);
  });
});
