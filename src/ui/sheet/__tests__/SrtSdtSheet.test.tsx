// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { SdtSheet, SrtSheet } from '../SrtSdtSheet.tsx';

afterEach(cleanup);

/**
 * The SRT (D39) and SDT (D40) answer sheets, for paper (D22, D38). Built to be
 * read back from phone photos: the session code on every page, no name (D21),
 * and no more pages than the upload takes (four).
 */
describe('SrtSheet', () => {
  it('numbers sixty answers, fifteen to a page over four, each with two lines, the code on every page', () => {
    render(<SrtSheet code="ACD-EFG" />);
    const pages = screen.getAllByTestId('sheet-page');
    expect(pages).toHaveLength(4);
    expect(screen.getAllByTestId('code-box').map((c) => c.textContent)).toEqual(Array(4).fill('ACD-EFG'));
    const answers = screen.getAllByTestId('answer');
    expect(answers).toHaveLength(60);
    expect(within(pages[0]).getAllByTestId('answer')).toHaveLength(15);
    expect(answers[59].textContent).toMatch(/^60/);
    for (const a of answers) expect(within(a).getAllByTestId('answer-line')).toHaveLength(2);
    expect(screen.queryByText(/name/i)).toBeNull();
  });
});

describe('SdtSheet', () => {
  it('gives each of the five paragraphs its heading and room, over two pages, the code on each', () => {
    render(<SdtSheet code={null} />);
    expect(screen.getAllByTestId('sheet-page')).toHaveLength(2);
    for (const box of screen.getAllByTestId('code-box')) expect(box.textContent).toBe('');
    const paragraphs = screen.getAllByTestId('paragraph');
    expect(paragraphs).toHaveLength(5);
    expect(within(paragraphs[0]).getByRole('heading').textContent).toMatch(/parents/i);
    for (const p of paragraphs) expect(within(p).getAllByTestId('answer-line').length).toBeGreaterThanOrEqual(8);
  });
});
