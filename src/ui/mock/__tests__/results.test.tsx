// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { AttemptList } from '../AttemptList.tsx';
import { MockGrid } from '../MockGrid.tsx';
import { MockReview } from '../MockReview.tsx';
import type { MockMeta } from '../BookletRunner.tsx';
import type { Attempt, ResultRow } from '../../../oir/mock-result.ts';
import type { PracticeItem } from '../../practice/PracticeRunner.tsx';

afterEach(cleanup);

const meta = (n: number): MockMeta => ({ id: `oir-mock-0${n}`, title: `OIR Mock ${n}`, itemCount: 40, timeLimitSeconds: 1200 });
const attempt = (over: Partial<Attempt>): Attempt => ({
  sessionId: 's1', testId: 'oir-mock-01', startedAt: '2026-10-18T05:00:00Z', endedAt: '2026-10-18T05:18:00Z', over: true, answered: 36, correct: 31, ...over,
});

describe('MockGrid', () => {
  it('shows every mock with where the viewer stands on it, each opening the mock', () => {
    const standing = new Map([
      ['oir-mock-01', { best: 31, tries: 2, live: null }],
      ['oir-mock-02', { best: null, tries: 0, live: 's9' }],
    ]);
    render(<MockGrid mocks={[meta(1), meta(2), meta(3)]} standing={standing} />);
    expect(screen.getByRole('link', { name: 'OIR Mock 1, best 31 of 40, taken 2 times' }).getAttribute('href')).toBe('/mock/oir-mock-01');
    expect(screen.getByRole('link', { name: 'OIR Mock 2, in progress' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'OIR Mock 3, not taken' })).toBeTruthy();
  });
});

describe('AttemptList', () => {
  it('lists attempts newest first: a finished one opens its result, a running one its mock', () => {
    render(
      <AttemptList
        attempts={[attempt({ sessionId: 's2', testId: 'oir-mock-02', over: false, correct: null, endedAt: null }), attempt({})]}
        mocks={[meta(1), meta(2)]}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/mock/oir-mock-02');
    expect(within(links[0]).getByText(/in progress/i)).toBeTruthy();
    expect(links[1].getAttribute('href')).toBe('/results/mock/s1');
    expect(within(links[1]).getByText('31/40')).toBeTruthy();
  });
});

describe('MockReview', () => {
  const items: PracticeItem[] = [0, 1, 2].map((i) => ({ id: `q${i}`, stem: `Stem ${i}`, options: { A: `a${i}`, B: `b${i}`, C: `c${i}`, D: `d${i}` } }));
  const rows: ResultRow[] = [
    { ordinal: 0, item_id: 'q0', chosen: 'A', key: 'A', rule: 'Add 2 each time.', reasoning_type: 'series' },
    { ordinal: 1, item_id: 'q1', chosen: 'B', key: 'C', rule: 'Each letter moves on 3.', reasoning_type: 'coding' },
    { ordinal: 2, item_id: 'q2', chosen: '', key: 'D', rule: null, reasoning_type: 'series' },
  ];

  it('shows each question with the answer, the one chosen, and the rule', () => {
    render(<MockReview items={items} rows={rows} show="all" />);
    const wrong = screen.getByRole('article', { name: /question 2/i });
    expect(within(wrong).getByText('Wrong')).toBeTruthy();
    expect(within(wrong).getByText(/each letter moves on 3/i)).toBeTruthy();
    expect(within(wrong).getByRole('listitem', { name: /option c, c1 — the answer/i })).toBeTruthy();
    expect(within(wrong).getByRole('listitem', { name: /option b, b1 — your answer/i })).toBeTruthy();
    expect(within(screen.getByRole('article', { name: /question 3/i })).getByText('Left blank')).toBeTruthy();
    expect(within(screen.getByRole('article', { name: /question 1/i })).getByRole('listitem', { name: /option a, a0 — your answer, the answer/i })).toBeTruthy();
  });

  it('shows only the wrong ones, or only the blank ones, when asked', () => {
    const { rerender } = render(<MockReview items={items} rows={rows} show="wrong" />);
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Question 2']);
    rerender(<MockReview items={items} rows={rows} show="skipped" />);
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Question 3']);
  });
});
