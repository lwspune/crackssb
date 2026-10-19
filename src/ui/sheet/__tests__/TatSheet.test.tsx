// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { TatSheet } from '../TatSheet.tsx';

afterEach(cleanup);

/**
 * The TAT answer sheet (D36, D38): twelve numbered story boxes, two to an A4
 * page, the twelfth for the blank slide. Built to be read back from phone
 * photos: the session code on every page, no name (D21), and no more pages
 * than the upload takes (eight).
 */
describe('TatSheet', () => {
  it('is six pages, each with the session code and its page number, and no name field', () => {
    render(<TatSheet code="ACD-EFG" />);
    const pages = screen.getAllByTestId('sheet-page');
    expect(pages).toHaveLength(6);
    expect(screen.getAllByTestId('code-box').map((c) => c.textContent)).toEqual(Array(6).fill('ACD-EFG'));
    expect(within(pages[5]).getByText(/page 6 of 6/i)).toBeTruthy();
    expect(screen.queryByText(/name/i)).toBeNull();
  });

  it('leaves the code boxes empty on a sheet printed before any session', () => {
    render(<TatSheet code={null} />);
    for (const box of screen.getAllByTestId('code-box')) expect(box.textContent).toBe('');
  });

  it('numbers twelve stories in order, the last for the blank slide, each with room to write', () => {
    render(<TatSheet code={null} />);
    const stories = screen.getAllByTestId('story-box');
    expect(stories.map((s) => within(s).getByRole('heading').textContent)).toEqual(Array.from({ length: 12 }, (_, i) => `Story ${i + 1}${i === 11 ? ' · blank slide' : ''}`));
    for (const s of stories) expect(within(s).getAllByTestId('story-line').length).toBeGreaterThanOrEqual(12);
  });
});
