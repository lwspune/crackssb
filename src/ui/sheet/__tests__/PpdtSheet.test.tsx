// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PpdtSheet } from '../PpdtSheet.tsx';

afterEach(cleanup);

/**
 * The PPDT answer sheet (D33, D22): one A4 page, laid out as the SSB's — the
 * character box first, then the story — and built to be read back from a
 * phone photo: the session code on it, no name (D21).
 */
describe('PpdtSheet', () => {
  it('is one page with the session code, and no name field', () => {
    render(<PpdtSheet code="ACD-EFG" />);
    expect(screen.getAllByTestId('sheet-page')).toHaveLength(1);
    expect(screen.getByTestId('code-box').textContent).toBe('ACD-EFG');
    expect(screen.queryByText(/name/i)).toBeNull();
  });

  it('leaves the code box empty on a sheet printed before any session', () => {
    render(<PpdtSheet code={null} />);
    expect(screen.getByTestId('code-box').textContent).toBe('');
  });

  it('has the character box: a count, six people by sex, age and mood, and the action', () => {
    render(<PpdtSheet code={null} />);
    expect(screen.getByText(/characters seen/i)).toBeTruthy();
    const rows = screen.getAllByTestId('character-row');
    expect(rows).toHaveLength(6);
    for (const heading of ['Sex', 'Age', 'Mood']) expect(screen.getByRole('columnheader', { name: new RegExp(heading) })).toBeTruthy();
    expect(screen.getByText(/^Action/)).toBeTruthy();
  });

  it('has room for the story: at least twenty ruled lines', () => {
    render(<PpdtSheet code={null} />);
    expect(screen.getAllByTestId('story-line').length).toBeGreaterThanOrEqual(20);
  });
});
