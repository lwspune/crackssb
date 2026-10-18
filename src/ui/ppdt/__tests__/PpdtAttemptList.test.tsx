// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { PpdtAttemptList } from '../PpdtAttemptList.tsx';

afterEach(cleanup);

describe('PpdtAttemptList', () => {
  it('lists PPDT attempts newest first: a finished one opens its result, a running one its picture', () => {
    render(
      <PpdtAttemptList
        attempts={[
          { sessionId: 's2', itemId: 'ppdt-07', startedAt: '2026-10-18T06:00:00Z', over: false, input: 'typed' },
          { sessionId: 's1', itemId: 'ppdt-03', startedAt: '2026-10-17T06:00:00Z', over: true, input: 'paper' },
        ]}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/picture/ppdt-07');
    expect(within(links[0]).getByText(/in progress/i)).toBeTruthy();
    expect(links[1].getAttribute('href')).toBe('/results/ppdt/s1');
    expect(within(links[1]).getByText('Picture 3')).toBeTruthy();
    expect(within(links[1]).getByText(/on paper/i)).toBeTruthy();
  });
});
