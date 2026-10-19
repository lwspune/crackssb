// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { SetList } from '../SetList.tsx';
import { TatResult } from '../TatResult.tsx';
import { TatReviewForm } from '../TatReviewForm.tsx';
import { TatReviewMarks } from '../TatReviewMarks.tsx';
import type { TatSetMeta } from '../TatRunner.tsx';
import { pictureById } from '../../../tat/pictures.ts';
import type { TatReview } from '../../../tat/rubric.ts';

/**
 * The TAT screens around the runner (D36, D38): the sets to choose from, the
 * result — every slide at last with what is in it, and the sheet's photos —
 * the mentor's marks per story, and those marks as the candidate reads them.
 */
afterEach(cleanup);

const set = (id: string, from: number): TatSetMeta => ({
  id,
  title: `TAT set ${from === 1 ? 1 : 2}`,
  slides: [
    ...Array.from({ length: 11 }, (_, i) => {
      const pid = `tat-${String(i + from).padStart(2, '0')}`;
      return { id: pid, image: `/tat/${pid}.jpg`, title: pictureById(pid)!.title };
    }),
    { id: 'tat-blank', image: null, title: 'Blank' },
  ],
});
const one = set('tat-set-01', 1);

describe('SetList', () => {
  it('lists each set by name only, never a picture, with where the viewer stands', () => {
    render(<SetList base="tat" sets={[one, set('tat-set-02', 12)].map((x) => ({ id: x.id, title: x.title, detail: '11 pictures and a blank · 54 min' }))} standing={new Map([['tat-set-01', { tries: 2, live: null, last: 's-9' }]])} />);
    const first = screen.getByRole('link', { name: /tat set 1, tried 2 times/i });
    expect(first.getAttribute('href')).toBe('/tat/tat-set-01');
    expect(screen.getByRole('link', { name: /tat set 2, not tried/i }).getAttribute('href')).toBe('/tat/tat-set-02');
    expect(screen.getByRole('link', { name: /last result for tat set 1/i }).getAttribute('href')).toBe('/results/tat/s-9');
    expect(screen.queryByRole('img')).toBeNull();
    expect(document.body.textContent).not.toMatch(/managing director/i);
  });
});

describe('TatResult', () => {
  const pictures = one.slides.slice(0, 11).map((s) => pictureById(s.id)!);

  it('shows every slide at last, with what is in it, and the blank as your own', () => {
    render(<TatResult set={one} pictures={pictures} paperCode="ACD-EFG" sheet={<p>photos here</p>} />);
    const slides = screen.getAllByRole('listitem');
    expect(slides).toHaveLength(12);
    expect(within(slides[0]).getByRole('img').getAttribute('src')).toBe('/tat/tat-01.jpg');
    expect(within(slides[0]).getByText(pictures[0].shows)).toBeTruthy();
    expect(within(slides[11]).queryByRole('img')).toBeNull();
    expect(within(slides[11]).getByText(/blank slide/i)).toBeTruthy();
  });

  it('gives the code, then the sheet, and offers no model stories', () => {
    render(<TatResult set={one} pictures={pictures} paperCode="ACD-EFG" sheet={<p>photos here</p>} />);
    expect(screen.getByText('ACD-EFG')).toBeTruthy();
    expect(screen.getByText('photos here')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/strong reading|sample story/i);
  });

  it('puts each story’s mark beside its slide once a mentor has marked it', () => {
    const review: TatReview = { stories: Array.from({ length: 12 }, (_, i) => ({ mark: i === 0 ? 4 : null, note: i === 0 ? 'Clear hero.' : null })), wentWell: 'x', focusOn: null, at: '2026-10-19T10:00:00Z' };
    render(<TatResult set={one} pictures={pictures} paperCode="ACD-EFG" review={review} />);
    const slides = screen.getAllByRole('listitem');
    expect(within(slides[0]).getByText('4 / 5')).toBeTruthy();
    expect(within(slides[0]).getByText('Clear hero.')).toBeTruthy();
    expect(within(slides[1]).getByText(/not marked/i)).toBeTruthy();
  });
});

describe('TatReviewForm', () => {
  it('marks each story 1-5 or not written, with a note, and saves the twelve', async () => {
    const save = vi.fn().mockResolvedValue({ kind: 'ok' });
    const onDone = vi.fn();
    render(<TatReviewForm initial={null} save={save} onDone={onDone} />);
    const rows = screen.getAllByRole('group', { name: /^story \d+$/i });
    expect(rows).toHaveLength(12);
    fireEvent.click(within(rows[0]).getByRole('radio', { name: /^4 of 5$/ }));
    fireEvent.change(within(rows[0]).getByLabelText(/note/i), { target: { value: 'Clear hero.' } });
    fireEvent.click(within(rows[11]).getByRole('radio', { name: /not written/i }));
    fireEvent.change(screen.getByLabelText(/went well/i), { target: { value: 'Heroes act.' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(save).toHaveBeenCalledTimes(1);
    const sent = save.mock.calls[0][0];
    expect(sent.stories).toHaveLength(12);
    expect(sent.stories[0]).toEqual({ mark: 4, note: 'Clear hero.' });
    expect(sent.stories[11]).toEqual({ mark: null, note: null });
    expect(sent).toMatchObject({ wentWell: 'Heroes act.', focusOn: '' });
    expect(onDone).toHaveBeenCalled();
  });

  it('says what is missing before saving', async () => {
    const save = vi.fn();
    render(<TatReviewForm initial={null} save={save} onDone={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save marks/i }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/mark at least one story/i);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('TatReviewMarks', () => {
  it('reads the mentor’s word on the set, with no total', () => {
    const review: TatReview = { stories: Array.from({ length: 12 }, () => ({ mark: 3, note: null })), wentWell: 'Heroes act.', focusOn: 'End each story.', at: '2026-10-19T10:00:00Z' };
    render(<TatReviewMarks review={review} />);
    expect(screen.getByText('Heroes act.')).toBeTruthy();
    expect(screen.getByText('End each story.')).toBeTruthy();
    expect(screen.getByText(/12 of 12 stories marked/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/total|average|\/ 60/i);
  });
});
