import source from '../../../content/oir/agrawal-examcart/ch28-counting-figures.source.json' with { type: 'json' };
import type { OptionLabel } from '../bank.ts';
import { countCircles, countLines, countQuadrilaterals, countRectangles, countSemicircles, countSquares, countTriangles } from './figure.ts';
import type { Figure } from './figure.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 28 "Counting Figures"
 * (pages 125-127). Each figure is redrawn (D29) and the answer is counted from
 * the figure that ships, by code (`figure.ts`): a figure drawn wrong changes
 * the count, which then matches no option and fails the chapter test.
 * Shipped with `key_basis = 'derived'` until the book's key is compared
 * against it.
 *
 * Source: content/oir/agrawal-examcart/ch28-counting-figures.source.json
 */

type Ask = 'triangles' | 'squares' | 'rectangles' | 'quadrilaterals' | 'circles' | 'semicircles' | 'lines';
const COUNT: Readonly<Record<Ask, (f: Figure) => number>> = {
  triangles: countTriangles,
  squares: countSquares,
  rectangles: countRectangles,
  quadrilaterals: countQuadrilaterals,
  circles: countCircles,
  semicircles: countSemicircles,
  lines: countLines,
};
const NOUN: Readonly<Record<Ask, string>> = {
  triangles: 'triangles',
  squares: 'squares',
  rectangles: 'rectangles',
  quadrilaterals: 'four-sided figures',
  circles: 'circles',
  semicircles: 'semicircles',
  lines: 'straight lines',
};

const figureOf = (n: number) => (source.questions[n - 1] as { figure?: Figure }).figure!;

/** A key counted from the shipped figure. `over` names an option like "more than 17" that a count above it reads as. */
function counted(n: number, ask: Ask, key: OptionLabel, how: string, over?: number): KeyEntry {
  const count = COUNT[ask](figureOf(n));
  return {
    key,
    confidence: 'high',
    rule: `${count} ${NOUN[ask]}. ${how}`,
    check: { kind: 'computed', answer: over !== undefined && count > over ? `more than ${over}` : count },
  };
}

const NO_OPTION = (count: string) =>
  `The redraw follows the photo line for line and counts ${count}, which is not among the options. Either the photo hides a line or the book's answer is off; waiting for the book key.`;

export const AGRAWAL_CH28_COUNTING_FIGURES: Readonly<Record<number, KeyEntry>> = {
  1: counted(1, 'triangles', 'B', 'Count the small ones first, then those made of two or more pieces, side by side.'),
  2: { held: true, reason: 'The figure is too small in the photo to read every line, so it cannot be redrawn or counted.' },
  3: counted(3, 'triangles', 'D', "The V makes triangles with the square's sides; the two crossbars add triangles to each."),
  4: counted(4, 'triangles', 'A', 'Work part by part: each slanting line makes triangles with the crossbar and the verticals.'),
  5: counted(5, 'triangles', 'A', 'Three small ones, and the two larger ones the slanting line makes with the sides.'),
  6: counted(6, 'triangles', 'D', 'Two above the line, three in the triangle below it, and the whole lower triangle.'),
  7: counted(7, 'triangles', 'C', 'The circle adds none; count inside the rectangle, small ones first.'),
  8: counted(8, 'triangles', 'D', 'Four in each diamond, and the V and its crossbar in the middle square.'),
  9: { held: true, reason: NO_OPTION('8 triangles') },
  10: counted(10, 'triangles', 'A', 'The circle adds none; count the small ones first, then the larger ones across the lines.'),
  11: counted(11, 'triangles', 'C', 'Each small square makes two; the rest come where the slanting lines meet the path.'),
  12: counted(12, 'triangles', 'B', 'Two in each end triangle, eight in the crossed rectangle, and the whole end triangles.'),
  13: counted(13, 'triangles', 'C', 'Corner by corner: the slanting lines make triangles with the edges of the smaller squares.'),
  14: counted(14, 'triangles', 'D', 'The diagonal crosses all six parts: count the triangles it cuts off, one part, two, and more.'),
  15: counted(15, 'triangles', 'A', 'Six small ones along the zigzag, and two made of two parts each.'),
  16: { held: true, reason: NO_OPTION('15 triangles') },
  17: { held: true, reason: NO_OPTION('8 triangles') },
  18: counted(18, 'triangles', 'B', 'Count the square and the sloping strip, then the boxes on the right.'),
  19: counted(19, 'triangles', 'D', 'Four in each diamond, and the V in the middle square.'),
  20: counted(20, 'triangles', 'A', 'Three to each arrowhead (two halves and the whole), six arrowheads.'),
  21: counted(21, 'squares', 'D', 'Nine small, four of two by two, the whole, and four at the corners.'),
  22: counted(22, 'squares', 'D', 'Fourteen in the grid, and two tilted squares each with one inside.'),
  23: counted(23, 'squares', 'B', 'The lattice makes tilted squares of two sizes; add the outer square.'),
  24: counted(24, 'squares', 'A', 'Count each grid by size: one by one, two by two, three by three, and those across the joining row.'),
  25: counted(25, 'squares', 'B', 'Nested squares and diamonds, and the small squares the cross makes in each.'),
  26: counted(26, 'squares', 'D', 'Count the small squares, then every two by two and three by three block.'),
  27: counted(27, 'squares', 'C', 'Small squares first, then the larger ones the missing lines leave whole.'),
  28: counted(28, 'squares', 'C', 'The outer square, the diamond, the inner square, and the four small squares the diagonals make inside it.'),
  29: { held: true, reason: NO_OPTION('13 squares (12 upright and 1 tilted)') },
  30: { held: true, reason: 'Some of the overlapping figures are near-squares that the photo cannot tell from rectangles, so the count cannot be fixed.' },
  31: counted(31, 'rectangles', 'B', 'The whole, and the two the line across makes.'),
  32: counted(32, 'rectangles', 'D', 'The low and wide rectangles, the tall one, and those their overlaps make.'),
  33: counted(33, 'rectangles', 'B', 'The five rectangles, and the four small ones where the corners overlap.'),
  34: counted(34, 'rectangles', 'D', 'The three rectangles, and every rectangle their crossings make.', 17),
  35: counted(35, 'quadrilaterals', 'A', 'Every four-sided figure, the slanting pieces on the right included.'),
  36: { held: true, reason: NO_OPTION('14 rectangles') },
  37: { held: true, reason: 'The figure is drawn in arcs, which redrawn figures do not carry yet.' },
  38: counted(38, 'semicircles', 'B', 'The vertical and the horizontal line each cut both circles in half.'),
  39: counted(39, 'circles', 'D', 'The small circle and the one around it, and eight more around them.'),
  40: counted(40, 'circles', 'B', 'Seven in the middle flower, six around it.'),
  41: counted(41, 'triangles', 'B', 'Four in the corners, four in the diamond, and four made of two halves.'),
  42: counted(42, 'triangles', 'C', 'The two end triangles, then each half of the middle, small ones first.'),
  43: counted(43, 'triangles', 'C', 'Eight in each crossed square, four outside, and the larger ones across both squares.'),
  44: counted(44, 'triangles', 'C', 'The lattice makes triangles along every edge and in every cell.'),
  45: counted(45, 'lines', 'B', 'Four sides, three verticals, one horizontal, two diagonals and four sides of the diamond.'),
  46: counted(46, 'triangles', 'D', 'Eight in each crossed square, and four more across neighbouring squares: none of the numbers given.'),
  47: counted(47, 'triangles', 'C', 'Four small ones, and four made of two.'),
  48: counted(48, 'triangles', 'B', 'Eight small ones, and eight made of two.'),
  49: counted(49, 'triangles', 'D', 'Four small ones, and the whole.'),
  50: counted(50, 'squares', 'D', 'Seven small squares, and one of two by two.'),
};
