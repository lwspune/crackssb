// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AttemptRows } from '../AttemptRows.tsx';
import type { AttemptRow } from '../AttemptRows.tsx';

afterEach(cleanup);

const row = (over: Partial<AttemptRow>): AttemptRow => ({ key: 'k', href: '/results/tat/1', title: 'Set A', startedAt: '2026-10-19T06:00:00Z', live: false, paper: false, ...over });

describe('AttemptRows', () => {
  it('links a finished attempt to its result', () => {
    render(<AttemptRows rows={[row({})]} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/results/tat/1');
  });

  it('shows an attempt with nowhere to go as a plain row, not a link', () => {
    render(<AttemptRows rows={[row({ href: null, live: true })]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('In progress')).toBeTruthy();
  });

  it('shows a score when it has one', () => {
    render(<AttemptRows rows={[row({ score: '31/40' })]} />);
    expect(screen.getByText('31/40')).toBeTruthy();
  });
});
