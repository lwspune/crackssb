// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AnswerSheet } from '../AnswerSheet.tsx';

/**
 * The printable answer sheet (D22). What matters is what makes a photo of it
 * readable back into the session: every line numbered once, the session code
 * at the top, and nothing that identifies the candidate.
 */
afterEach(cleanup);

const renderSheet = (code: string | null) => render(<AnswerSheet title="Word Association Test" short="WAT" lines={60} perPage={30} code={code} />);

describe('answer sheet', () => {
  it('numbers every line from 1 to 60, each exactly once', () => {
    renderSheet(null);
    const numbers = screen.getAllByTestId('line-number').map((n) => Number(n.textContent));
    expect(numbers).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  });

  it('splits into printed pages, each carrying the code so a loose page still matches', () => {
    renderSheet('ACD-EFG');
    const pages = screen.getAllByTestId('sheet-page');
    expect(pages).toHaveLength(2);
    for (const page of pages) expect(page.textContent).toContain('ACD-EFG');
  });

  it('leaves a box to write the code in when printed before a session', () => {
    renderSheet(null);
    expect(screen.getAllByTestId('code-box')[0].textContent?.trim()).toBe('');
  });

  it('asks for no name — a scan should not identify the candidate (D21)', () => {
    renderSheet('ACD-EFG');
    expect(document.body.textContent).not.toMatch(/\bname\b/i);
  });

  it('tells the candidate to leave a line blank rather than skip it', () => {
    renderSheet(null);
    expect(document.body.textContent).toMatch(/blank/i);
  });
});
