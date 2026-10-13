// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { PracticeRunner } from '../PracticeRunner.tsx';
import type { PracticeItem, PracticeResult } from '../PracticeRunner.tsx';

/**
 * Chapter practice (D26) through the component a candidate uses: answer, and
 * only then see the key and its rule; move on; see the tally at the end.
 */

const ITEMS: PracticeItem[] = [
  { id: 'q1', direction: 'Find the missing number.', stem: '2, 4, 6, ?', options: { A: '7', B: '8', C: '9', D: '10' } },
  { id: 'q2', stem: 'A, C, E, ?', options: { A: 'F', B: 'G', C: 'H', D: 'I' } },
];
const KEYS: Record<string, { key: 'A' | 'B' | 'C' | 'D'; rule: string }> = {
  q1: { key: 'B', rule: 'Add 2 each time.' },
  q2: { key: 'B', rule: 'Skip one letter.' },
};

const fakeAnswer = () =>
  vi.fn(async (itemId: string, chosen: string): Promise<PracticeResult> => ({
    ok: true,
    correct: chosen === KEYS[itemId].key,
    key: KEYS[itemId].key,
    rule: KEYS[itemId].rule,
  }));

afterEach(cleanup);

async function pick(label: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

describe('chapter practice', () => {
  it('shows the question with its direction, and no answer before one is chosen', () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByText('Find the missing number.')).toBeTruthy();
    expect(screen.getByText('2, 4, 6, ?')).toBeTruthy();
    expect(screen.getByText(/1 of 2/)).toBeTruthy();
    expect(screen.queryByText('Add 2 each time.')).toBeNull();
  });

  it('a right answer says so and shows the rule; the options lock', async () => {
    const answer = fakeAnswer();
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    expect(answer).toHaveBeenCalledWith('q1', 'B');
    expect(screen.getByRole('status').textContent).toMatch(/right/i);
    expect(screen.getByText('Add 2 each time.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /^Option A/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a wrong answer names the right one', async () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    await pick(/^Option C/);
    expect(screen.getByRole('status').textContent).toMatch(/wrong.*B/i);
    expect(screen.getByText('Add 2 each time.')).toBeTruthy();
  });

  it('a refused answer explains itself and leaves the question open', async () => {
    const answer = vi.fn(async (): Promise<PracticeResult> => ({ ok: false, message: 'A guardian has to consent.' }));
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    expect(screen.getByRole('alert').textContent).toMatch(/guardian/);
    expect((screen.getByRole('button', { name: /^Option B/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('moves to the next question and ends on the tally', async () => {
    render(<PracticeRunner items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    await pick(/^Option B/);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /next/i })));
    expect(screen.getByText('A, C, E, ?')).toBeTruthy();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    await pick(/^Option A/);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /finish/i })));
    expect(screen.getByText(/1 of 2 right/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /chapters/i }).getAttribute('href')).toBe('/practise/oir');
  });

  it('answers from the keyboard: a letter picks, Enter moves on', async () => {
    const answer = fakeAnswer();
    render(<PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />);
    await act(async () => fireEvent.keyDown(window, { key: 'c' }));
    expect(answer).toHaveBeenCalledWith('q1', 'C');
    await act(async () => fireEvent.keyDown(window, { key: 'Enter' }));
    expect(screen.getByText('A, C, E, ?')).toBeTruthy();
  });

  it('ignores letters typed into a field elsewhere on the page', async () => {
    const answer = fakeAnswer();
    render(
      <>
        <input aria-label="search" />
        <PracticeRunner items={ITEMS} answer={answer} doneHref="/practise/oir" />
      </>,
    );
    await act(async () => fireEvent.keyDown(screen.getByLabelText('search'), { key: 'a' }));
    expect(answer).not.toHaveBeenCalled();
  });

  it('stacks options one per row on a phone when a word is too long for half the width, and keeps short ones in a 2×2 grid', () => {
    const long: PracticeItem = { id: 'w1', stem: 'NATIONALISATION', options: { A: 'NOTATION', B: 'SALINATION', C: 'INSTALLATION', D: 'SANITATION' } };
    const { rerender } = render(<PracticeRunner items={[long]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByRole('group', { name: 'Options' }).className).toMatch(/(^|\s)grid-cols-1(\s|$)/);
    expect(screen.getByText('NATIONALISATION').className).toMatch(/text-xl/);
    rerender(<PracticeRunner key="short" items={ITEMS} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByRole('group', { name: 'Options' }).className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
    expect(screen.getByText('2, 4, 6, ?').className).toMatch(/text-2xl/);
  });

  it('sets a sentence-length question at reading size, not display size', () => {
    const prose: PracticeItem = { id: 's1', stem: 'Which letter is seventh to the right of the thirteenth letter from the left end?', options: { A: 'S', B: 'T', C: 'U', D: 'V' } };
    render(<PracticeRunner items={[prose]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const stem = screen.getByText(prose.stem).className;
    expect(stem).toMatch(/text-lg/);
    expect(stem).not.toMatch(/text-2xl|text-3xl/);
  });

  it('shows the passage a question shares with others, after its direction and before the question, as the book prints it', () => {
    const withPassage: PracticeItem = { ...ITEMS[0], passage: 'A, B and C sit in a row facing north.' };
    render(<PracticeRunner items={[withPassage]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const passage = screen.getByText('A, B and C sit in a row facing north.');
    const direction = screen.getByText('Find the missing number.');
    expect(direction.compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(passage.compareDocumentPosition(screen.getByText(ITEMS[0].stem)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps a long puzzle that is not a sentence at display size', () => {
    const puzzle: PracticeItem = { id: 'p1', stem: 'S O _ _ T A S _ _ A T A _ _ N A T _ _ O N A _ _', options: { A: 'a', B: 'b', C: 'c', D: 'd' } };
    render(<PracticeRunner items={[puzzle]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByText(puzzle.stem).className).not.toMatch(/text-lg/);
  });

  it('draws a number-grid question as its printed tables, in place of the flattened stem', () => {
    const grid: PracticeItem = {
      id: 'g1',
      stem: '13 26 39 / 30 42 ? / 17 16 15',
      tables: [[['13', '26', '39'], ['30', '42', '?'], ['17', '16', '15']]],
      options: { A: '40', B: '54', C: '45', D: '60' },
    };
    render(<PracticeRunner items={[grid]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const table = screen.getByRole('table');
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['13', '26', '39', '30', '42', '?', '17', '16', '15']);
    expect(table.querySelector('[data-missing]')?.textContent).toBe('?');
    expect(screen.queryByText(grid.stem)).toBeNull();
  });

  it('labels each of several tables, and leaves a blank cell of a cross undrawn', () => {
    const crosses: PracticeItem = {
      id: 'g2',
      stem: 'cross',
      tables: [
        [['', '4', ''], ['4', '10', '9'], ['', '16', '']],
        [['', '1', ''], ['2', '?', '8'], ['', '9', '']],
      ],
      options: { A: '12', B: '6', C: '5', D: '7' },
    };
    render(<PracticeRunner items={[crosses]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const tables = screen.getAllByRole('table');
    expect(tables.map((t) => t.getAttribute('aria-label'))).toEqual(['Figure 1 of 2', 'Figure 2 of 2']);
    const blanks = tables[0].querySelectorAll('td[data-blank]');
    expect(blanks).toHaveLength(4);
    for (const b of blanks) expect(b.className).not.toMatch(/(^|\s)border(\s|$)/);
  });

  it('keeps the line breaks of a stem that sets an equation or a figure on lines of its own', () => {
    const lines: PracticeItem = { id: 'l1', stem: 'Which two signs should be interchanged?\n26 + 2 ÷ 4 − 8 × 25 = 30', options: { A: 'a', B: 'b', C: 'c', D: 'd' } };
    render(<PracticeRunner items={[lines]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByText(/Which two signs/).className).toMatch(/whitespace-pre-line/);
  });

  it('draws a redrawn figure in place of the stem, described by it for screen readers, in the text colour (D29)', () => {
    const drawn: PracticeItem = {
      id: 'f1',
      stem: 'A triangle split by one line from its apex.',
      figure: { lines: [[0, 10, 10, 10], [0, 10, 5, 0], [10, 10, 5, 0], [5, 0, 4, 10]], circles: [[5, 6, 3]] },
      options: { A: '3', B: '4', C: '5', D: '6' },
    };
    render(<PracticeRunner items={[drawn]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const img = screen.getByRole('img', { name: drawn.stem });
    expect(img.querySelectorAll('line')).toHaveLength(4);
    expect(img.querySelectorAll('circle')).toHaveLength(1);
    expect(img.getAttribute('stroke')).toBe('currentColor');
    expect(screen.queryByText(drawn.stem)).toBeNull();
  });

  it('draws dice views and nets in place of the stem, described by it, with pips as dots and captions (D29)', () => {
    const dice: PracticeItem = {
      id: 'd1',
      stem: 'Two views of a die, and a net.',
      dice: {
        views: [
          { top: '1', left: 'pips:3', right: 'Ear', caption: '(a)' },
          { top: 'fill', left: '', right: 'cross', caption: '(b)' },
        ],
        nets: [{ cells: [{ r: 0, c: 0, face: 'A' }, { r: 0, c: 1, face: 'B' }], caption: 'Sheet' }],
      },
      options: { A: '1', B: '2', C: '3', D: '4' },
    };
    render(<PracticeRunner items={[dice]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const img = screen.getByRole('img', { name: dice.stem });
    expect(img.querySelectorAll('[data-view]')).toHaveLength(2);
    expect(img.querySelectorAll('[data-pip]')).toHaveLength(3);
    expect(img.querySelectorAll('[data-net-cell]')).toHaveLength(2);
    expect(img.textContent).toContain('Ear');
    expect(img.textContent).toContain('(a)');
    expect(img.textContent).toContain('Sheet');
    expect(img.querySelector('[data-face="fill"]')?.getAttribute('fill')).toBe('currentColor');
    expect(screen.queryByText(dice.stem)).toBeNull();
  });

  it('draws picture answers inside the option buttons, keeping each option described in words for screen readers (D29)', async () => {
    const pictures: PracticeItem = {
      id: 'pa1',
      stem: 'Which is the mirror image of "ba"?',
      options: { A: 'a b, both mirrored', B: 'b a, as printed', C: 'a circle', D: 'a die' },
      answerPanels: {
        A: { glyphs: [{ ch: 'a', flip: 'x' }, { ch: 'b', flip: 'x' }] },
        B: { glyphs: [{ ch: 'b' }, { ch: 'a' }] },
        C: { figure: { lines: [], circles: [[0, 0, 1]], labels: [[0, 0, 'P']] } },
        D: { dice: { views: [{ top: '1', left: '2', right: '3' }] } },
      },
    };
    render(<PracticeRunner items={[pictures]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const a = screen.getByRole('button', { name: 'Option A, a b, both mirrored' });
    const flipped = a.querySelectorAll('[data-glyph][data-flip="x"]');
    expect(flipped).toHaveLength(2);
    expect((flipped[0] as HTMLElement).style.transform).toBe('scaleX(-1)');
    expect(screen.getByRole('button', { name: /^Option C/ }).querySelector('svg circle')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Option C/ }).textContent).toContain('P');
    expect(screen.getByRole('button', { name: /^Option D/ }).querySelector('[data-view]')).toBeTruthy();
    expect(screen.queryByText('a b, both mirrored')).toBeNull();
    expect(screen.getByRole('group', { name: 'Options' }).className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
  });

  it('never wraps a row of mirrored glyphs, and stacks long ones one per row on a phone', () => {
    const word = (w: string) => ({ glyphs: [...w].map((ch) => ({ ch, flip: 'x' as const })) });
    const long: PracticeItem = {
      id: 'g9',
      stem: 'hiEraRchY',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      answerPanels: { A: word('YhcRaREih'), B: word('YhcRareih'), C: word('YHcRaREih'), D: word('YHcRareih') },
    };
    const { container, rerender } = render(<PracticeRunner items={[long]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByRole('group', { name: 'Options' }).className).toMatch(/(^|\s)grid-cols-1(\s|$)/);
    expect(container.querySelector('[data-glyph]')!.parentElement!.className).toMatch(/whitespace-nowrap/);
    expect(container.querySelector('[data-glyph]')!.parentElement!.className).not.toMatch(/flex-wrap/);
    const short: PracticeItem = { ...long, id: 'g10', answerPanels: { A: word('TOM'), B: word('MOT'), C: word('OTM'), D: word('MTO') } };
    rerender(<PracticeRunner key="s" items={[short]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    expect(screen.getByRole('group', { name: 'Options' }).className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
  });

  it('draws folds dashed, fold arrows with a head, and punched shapes filled or outlined', () => {
    const folded: PracticeItem = {
      id: 'fd1',
      stem: 'A square folded in half, and punched.',
      figure: { lines: [[0, 0, 6, 0]], dashed: [[6, 0, 12, 0]], arrows: [[2, 2, 8, 2]], polygons: [{ points: [[1, 1], [2, 1], [1, 2]], fill: true }, { points: [[3, 3], [4, 3], [3, 4]] }] },
      options: { A: '1', B: '2', C: '3', D: '4' },
    };
    render(<PracticeRunner items={[folded]} answer={fakeAnswer()} doneHref="/practise/oir" />);
    const img = screen.getByRole('img', { name: folded.stem });
    expect(img.querySelectorAll('line[stroke-dasharray]')).toHaveLength(1);
    expect(img.querySelectorAll('[data-arrow]')).toHaveLength(1);
    const shapes = img.querySelectorAll('polygon[data-shape]');
    expect([...shapes].map((p) => p.getAttribute('fill'))).toEqual(['currentColor', 'none']);
  });
});
