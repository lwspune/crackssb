// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { WatResult } from '../WatResult.tsx';

afterEach(cleanup);

/**
 * A WAT attempt's result (D38): on paper, the code, the sheet's photos (or the
 * upload, for the candidate who took it) and the sixty words to check the
 * sheet against. Review by a mentor or the AI comes later.
 */
const words = Array.from({ length: 60 }, (_, i) => `WORD${i}`);

describe('WatResult', () => {
  it('on paper: the code, the sheet, and every word in order to check it against', () => {
    render(<WatResult words={words} paperCode="ACD-EFG" responses={null} sheet={<p>photos here</p>} />);
    expect(screen.getByText('ACD-EFG')).toBeTruthy();
    expect(screen.getByText('photos here')).toBeTruthy();
    const rows = within(screen.getByRole('list', { name: /the words/i })).getAllByRole('listitem');
    expect(rows).toHaveLength(60);
    expect(rows[0].textContent).toMatch(/1\s*WORD0/);
  });

  it('typed (kept for attempts made before D38): each response beside its word, blanks marked', () => {
    render(<WatResult words={words} paperCode={null} responses={{ '0': 'A first thought', '1': '' }} />);
    const rows = within(screen.getByRole('list', { name: /the words/i })).getAllByRole('listitem');
    expect(rows[0].textContent).toMatch(/A first thought/);
    expect(rows[1].textContent).toMatch(/Blank/);
  });
});
