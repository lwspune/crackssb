import source from '../../../content/oir/agrawal-examcart/ch25-mirror-water.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';
import { figureBounds, straightRuns } from './figure.ts';
import type { Figure } from './figure.ts';
import { reflectFigure, sameFigure } from './fold.ts';
import type { KeyEntry } from './key.ts';
import { imageOf, sameGlyphs } from './mirror.ts';
import type { Glyph } from './mirror.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 25 "Mirror and Water
 * Images" (pages 109-113), computed by code (D29). Questions printed as text
 * are transcribed glyph by glyph, and the key is the one option whose glyphs
 * are the mirror or water image of the printed text (`mirror.ts`). Drawn
 * questions are redrawn as figures, each checked against its photo on an
 * overlay, and the key is the one option whose drawing is the question's
 * drawing reflected (`fold.ts`). The file fails to load if a keyed question
 * has no such option, or more than one. Drawings that cannot be redrawn
 * faithfully (turned letters, curves, marks below the photo's resolution)
 * are held. Shipped with `key_basis = 'derived'` until the book's key is
 * compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch25-mirror-water.source.json
 */

type Where = 'mirror' | 'water';

/** The text each text question prints, and whether its image is in a mirror (on the right) or in water (below). */
export const PRINTED: Readonly<Record<number, { readonly text: string; readonly where: Where }>> = {
  11: { text: 'hiEraRchY', where: 'mirror' },
  12: { text: 'fORmuLAtiOn', where: 'mirror' },
  13: { text: 'hmFa42', where: 'mirror' },
  14: { text: 'Pardt32', where: 'mirror' },
  15: { text: 'yd46A5', where: 'mirror' },
  16: { text: '47RaNe', where: 'mirror' },
  22: { text: '14693', where: 'mirror' },
  23: { text: 'HOTEL', where: 'mirror' },
  24: { text: 'BURGER', where: 'mirror' },
  25: { text: 'LION', where: 'mirror' },
  26: { text: 'TOY', where: 'mirror' },
  27: { text: 'T1CXZ', where: 'mirror' },
  29: { text: 'Lj3r4pa', where: 'mirror' },
  30: { text: 'Dh57erk', where: 'mirror' },
  32: { text: 'L27Acf', where: 'mirror' },
  33: { text: 'RkgEyw', where: 'mirror' },
  35: { text: '7GJ3de', where: 'mirror' },
  36: { text: 'Jawpe3s', where: 'mirror' },
  37: { text: 'Rp37aw', where: 'mirror' },
  38: { text: 'GwB74A', where: 'mirror' },
  52: { text: '5374', where: 'water' },
  53: { text: 'SEARCH', where: 'water' },
  54: { text: 'HR2642O', where: 'water' },
  58: { text: 'SHARE', where: 'mirror' },
  59: { text: 'A1M3b', where: 'water' },
  60: { text: 'ANS43Q12', where: 'mirror' },
  64: { text: 'TOM', where: 'mirror' },
  71: { text: 'CROP', where: 'mirror' },
  73: { text: 'BEND', where: 'mirror' },
  76: { text: '↑↓△▽', where: 'mirror' },
};

type SourceQuestion = { n: number; options: Record<OptionLabel, string>; figure?: Figure; answerPanels?: Record<OptionLabel, { glyphs?: Glyph[]; figure?: Figure }> };
const questionOf = (n: number) => source.questions[n - 1] as unknown as SourceQuestion;

/** The options whose printed glyphs are the image of the printed text. */
export function matchingOptions(n: number): OptionLabel[] {
  const q = questionOf(n);
  const printed = PRINTED[n];
  if (!printed || !q.answerPanels || q.n !== n) throw new Error(`Q${n}: not a transcribed text question`);
  const image = imageOf(printed.text, printed.where);
  return OPTION_LABELS.filter((l) => sameGlyphs(q.answerPanels![l].glyphs!, image));
}

/**
 * The redrawn questions, and where their mirror stands. Every one has its
 * mirror on the right (or names it so), so the image is the drawing turned
 * left to right.
 */
export const REDRAWN: Readonly<Record<number, Where>> = Object.fromEntries(
  [2, 4, 5, 6, 7, 8, 10, 17, 18, 19, 20, 21, 28, 34, 40, 45, 47, 48, 49, 50, 51, 55, 56, 57, 61, 62, 63, 65, 69, 70, 72, 74].map((n) => [n, 'mirror' as Where]),
);

/**
 * How far a drawing may sit from the image and still be it: 6% of the
 * drawing's longer side. The wrong options of every keyed question sit at
 * least 10% away; the right ones within 2-6% (the photos are skewed and curved).
 */
export const FIGURE_TOL = 0.06;

/**
 * A drawing without its box. The box is not part of the figure: question and
 * option boxes are printed at different sizes with differing margins, and
 * `sameFigure` sizes a drawing by its bounds. Drops each straight run that is
 * a whole side of the box the lines span (a dot may poke past the box).
 */
function withoutBox(f: Figure): Figure {
  const { x, y, width, height } = figureBounds({ lines: f.lines });
  const eps = 1e-6 * Math.max(width, height);
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const cornerAt = (px: number, py: number) => corners.findIndex(([cx, cy]) => Math.abs(cx - px) <= eps && Math.abs(cy - py) <= eps);
  const isSide = ([a, b, c, d]: readonly number[]) => {
    const [i, j] = [cornerAt(a, b), cornerAt(c, d)];
    return i >= 0 && j >= 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === 3);
  };
  return { ...f, lines: straightRuns(f).filter((r) => !isSide(r)) };
}

/** The options whose drawing is the question's drawing reflected, boxes left out. */
export function figureMatches(n: number): OptionLabel[] {
  const q = questionOf(n);
  const where = REDRAWN[n];
  if (!where || !q.figure || !q.answerPanels || q.n !== n) throw new Error(`Q${n}: not a redrawn figure question`);
  const image = reflectFigure(withoutBox(q.figure), where);
  return OPTION_LABELS.filter((l) => sameFigure(image, withoutBox(q.answerPanels![l].figure!), FIGURE_TOL));
}

/** A key: the one option whose drawing is the image, as code finds it. `why` says how the other options fail. */
function reflected(n: number, key: OptionLabel, why: string, note?: string): KeyEntry {
  const hits = figureMatches(n);
  if (hits.length !== 1) throw new Error(`Q${n}: ${hits.length} options are the ${REDRAWN[n]} image of the drawing`);
  return {
    key,
    confidence: note ? 'medium' : 'high',
    rule: `In a mirror on the right, left and right swap and top and bottom stay. ${why}`,
    ...(note ? { note } : {}),
    check: { kind: 'computed', answer: questionOf(n).options[hits[0]] },
  };
}

const LETTERS = (what: string) => `${what} printed in the figure turn with it and decide between the options; a redrawn figure cannot carry turned letters, so it is not redrawn.`;
const CURVES = (what: string) => `${what}: its curves decide between the options, and a redrawn figure is drawn in straight lines, so it is not redrawn.`;

const HOW: Readonly<Record<Where, string>> = {
  mirror: 'In a mirror the order reverses and each character turns left to right.',
  water: 'In water the order stays and each character turns upside down.',
};

/** A key: the one option that is the image, as code finds it. `why` says how the other options fail. */
function imaged(n: number, key: OptionLabel, why: string, note?: string): KeyEntry {
  const hits = matchingOptions(n);
  if (hits.length !== 1) throw new Error(`Q${n}: ${hits.length} options are the ${PRINTED[n].where} image of ${PRINTED[n].text}`);
  return {
    key,
    confidence: note ? 'medium' : 'high',
    rule: `${HOW[PRINTED[n].where]} ${why}`,
    ...(note ? { note } : {}),
    check: { kind: 'computed', answer: questionOf(n).options[hits[0]] },
  };
}


export const AGRAWAL_CH25_MIRROR_WATER: Readonly<Record<number, KeyEntry>> = {
  1: { held: true, reason: LETTERS('The letters P, q and d') },
  2: reflected(2, 'B', 'A keeps the diagonal from the top left and points both triangles down; C points the top-left triangle down; D keeps the upper circle\'s line as it was.'),
  3: { held: true, reason: 'The rows of small hooked marks in the box are curved and about five pixels high in the photo; which way each one turns decides between the options, so they cannot be redrawn with certainty.' },
  4: reflected(4, 'B', 'A, C and D turn the bottom black triangle the wrong way; C also turns the black triangle on the left upside down.'),
  5: reflected(5, 'B', 'A leaves the base line running out to the left; C and D cut the wrong quarters from the circles.'),
  6: reflected(6, 'C', 'A and D move the squares on the sides; B puts the upper circle\'s black slice at its lower left.'),
  7: reflected(7, 'B', 'A and C turn the top half discs the wrong way; D leaves the bottom right half disc facing left.', 'The redraw matches B only near the edge of the tolerance used (6% of the drawing): the half discs are printed small and uneven.'),
  8: reflected(8, 'C', 'A and B move the half circles on the rectangle\'s sides; D shades the bottom-left triangle on the wrong side.'),
  9: { held: true, reason: 'Counted on the photo, the question figure has five slanting stripes and every option four, so no option is its image as printed.' },
  10: reflected(10, 'D', 'The figure is the same both ways round, so its image is itself. A, B and C put arrowheads on the crossbar.', 'The mark on the crossbar is a small dark blob in the question and in D, read as a black square; A, B and C show arrowheads. Read at the limit of the photo.'),
  11: imaged(11, 'A', 'B prints a small y for the Y; C and D print a capital H for the h, and C a capital R for the r.'),
  12: imaged(12, 'C', 'A prints an l where the word has i; B prints small o and a; D small o for both Os.', 'A and C differ only in one letter: A\'s reads as an undotted l, C\'s as a dotted i, at the limit of the photo.'),
  13: { held: true, lean: 'A', reason: 'MN is drawn as a mirror on the right, but no option is the mirror image: A is the water image (each character upside down, order kept). The print seems to mix a water-image question with a mirror line.' },
  14: { held: true, reason: 'No option is the mirror image: A keeps the order, B is the water image, C turns P, a and r half round, D leaves the 3 and the P unturned.' },
  15: imaged(15, 'D', 'A turns the d half round and leaves the y; B is upside down throughout; C turns the 5 and the A upside down.'),
  16: { held: true, reason: 'No option is the mirror image: A and C turn letters half round, B turns the 4 and 7 upside down, D leaves the e and a unturned.' },
  17: reflected(17, 'C', 'A and B redraw the lines; D keeps the V on the left.'),
  18: { held: true, lean: 'D', reason: 'Redrawn line for line, D has the image\'s arrangement, but its line across sits lower (at 70 of 100 against the question\'s 62) and its V is wider: it is 14% of the drawing away, beyond the 6% used, so no option matches as printed.' },
  19: reflected(19, 'D', 'A puts the block above the line; B and C keep the V on the left.'),
  20: reflected(20, 'A', 'B keeps the upright on the right; C and D move the line across to the bottom.'),
  21: reflected(21, 'B', 'A and D swap the dot and the block; C keeps the high tread on the left.'),
  22: imaged(22, 'D', 'A and C keep the order; B leaves the 3, 9, 6 and 1 unturned.', 'D\'s 1 shows no flag on its left, read as turned; the flag is at the limit of the photo.'),
  23: imaged(23, 'C', 'A and B keep the order; D leaves the L unturned.'),
  24: imaged(24, 'C', 'A leaves the E unturned; B keeps the order, turned half round; D swaps letters and leaves the Bs unturned.'),
  25: imaged(25, 'A', 'B leaves the N unturned; C and D keep the order with the L turned half round.'),
  26: imaged(26, 'C', 'T, O and Y look the same in a mirror, so only the order changes. A and D turn the T upside down; B keeps the order.'),
  27: { held: true, reason: 'Options A, B and D read the same glyph for glyph in the photo (each the mirror image); whatever tells them apart is below its resolution.' },
  28: { held: true, lean: 'D', reason: 'Redrawn line for line, the question drawing is taller than it is wide (about 0.8) while every option drawing is about square; D has the image\'s arrangement but is 12% of the drawing away, beyond the 6% used, so no option matches as printed.' },
  29: imaged(29, 'A', 'B turns the p half round and leaves the r; C leaves the 4 and 3 unturned; D swaps the p and a.'),
  30: imaged(30, 'C', 'A turns the r half round; B turns the h half round; D leaves the 7 and 5 unturned.'),
  31: { held: true, reason: 'A grid of six letters (G, J, D, Y, T, R) whose turn decides the water image; a redrawn figure cannot carry turned letters, so it is not redrawn.' },
  32: imaged(32, 'D', 'A leaves the 2 and 7 unturned and in order; B turns the A upside down; C turns most characters half round.'),
  33: imaged(33, 'A', 'B is turned half round; C leaves the E unturned and turns the w upside down; D swaps y and w and leaves the R unturned.'),
  34: reflected(34, 'D', 'A and B keep the bent arm on the right; C has two triangle feelers and box legs.'),
  35: { held: true, reason: 'Options A and D read the same glyph for glyph and both are the mirror image; whatever tells them apart is below the resolution of the photo.' },
  36: { held: true, lean: 'D', reason: 'No option is the mirror image: D comes closest but leaves the J unturned; A misorders the letters, B and C leave the 3 unturned.' },
  37: imaged(37, 'A', 'B and C turn the w and a upside down; D leaves the 3 and 7 unturned and in order.', 'The small a\'s left-right turn cannot be seen in the photo; it is read as turned across in A, the option that turns every other character.'),
  38: imaged(38, 'B', 'A keeps B before 7 and leaves the 7 unturned; C and D turn the A upside down.', 'First read with a plain B in every option, which matched none; at 22 times zoom B\'s B shows its stem on the right (turned) and A\'s on the left. Read at the limit of the photo.'),
  39: { held: true, reason: CURVES('A coiled spring with curled ends') },
  40: reflected(40, 'D', 'A, B and C keep the zigzag or the arrows the wrong way round.', 'The redraw matches D near the edge of the tolerance used (5% of the drawing): the cylinder\'s ends are printed as uneven ellipses.'),
  41: { held: true, reason: LETTERS('A triangle and the characters 2, P and B') },
  42: { held: true, reason: 'The small three-pronged marks at the ends of the arms, about four pixels across in the photo, are what tells A, B and C apart; they cannot be read with certainty.' },
  43: { held: true, reason: LETTERS('The letters P, Z, D and S') },
  44: { held: true, reason: LETTERS('The letters P and N') },
  45: reflected(45, 'D', 'A and B turn the triangle point down; C blackens the bottom piece instead of the small triangle.'),
  46: { held: true, reason: CURVES('A curved arrow ending in a curl') },
  47: reflected(47, 'D', 'A puts the bottom-right group\'s corner triangle on the inner side; B and C arrange the groups with the long triangle on top.'),
  48: reflected(48, 'D', 'A stands the bars upright; B moves a ring; C swaps the dots and the rings.'),
  49: reflected(49, 'C', 'A keeps the top-right group as it was; B keeps the top-left group; D colours the groups differently.', 'The option drawings are the question\'s groups turned and placed (each checked on its overlay against the photo), so the match rests on reading each group\'s colours and turn, which are clear in the photo.'),
  50: reflected(50, 'B', 'A and C (which read the same in the photo) leave the diamond\'s left half black; D moves the dot beside the diamond.'),
  51: reflected(51, 'C', 'A, B and D keep the long line running up to the right.', 'The redraw matches C near the edge of the tolerance used (5.5% of the drawing).'),
  52: imaged(52, 'C', 'A turns only the 5 and 3; B is the mirror image; D is turned half round.'),
  53: { held: true, lean: 'B', reason: 'No option is the water image: B comes closest but leaves the R upright; A leaves S and A upright; C and D are turned half round. The frame shaped like an arrow is not transcribed.' },
  54: imaged(54, 'D', 'A and C are mirror images; B turns the R half round instead of upside down.'),
  55: { held: true, reason: 'Options C and D both name figure d, and figure d is the image of X (redrawn, both match): two options are right as printed.' },
  56: reflected(56, 'A', 'B keeps the strip\'s corner on the left; figure d (C and D) turns the circle\'s lines upwards.'),
  57: { held: true, reason: 'Redrawn, the nearest of the four figures to the image of X is figure c (6.5% of the drawing away, just past the 6% used), and no option names c: the options print (a), (b), (d), (d). Figures a, b and d are 30% or more away.' },
  58: imaged(58, 'A', 'B prints another series (HR2642O); C swaps H and A; D prints S for the R.'),
  59: imaged(59, 'C', 'A, B and D print an I for the 1; D also reverses the 3.', 'C\'s second character shows the 1\'s flag turned down; A, B and D print a serifed I. Read at the limit of the photo.'),
  60: imaged(60, 'B', 'A keeps the order and ends in 3; C and D print other characters (S, 3, W) in the series.'),
  61: reflected(61, 'A', 'B keeps the arrow pointing left; C and D shade the wrong half of the small square.', 'The small square\'s black half is about six pixels across in the photo, read at 14 times zoom.'),
  62: reflected(62, 'A', 'B keeps the arc on the left; C has none; D has two.'),
  63: reflected(63, 'C', 'A and B draw the U another way; D turns the arms inwards in the squares.', 'The redraw matches C near the edge of the tolerance used (5.5% of the drawing).'),
  64: imaged(64, 'A', 'T, O and M look the same in a mirror, so only the order changes: MOT. B is the water image; C turns the T upside down, D the M.'),
  65: reflected(65, 'D', 'A and B swap the triangle and the square; C closes both corners with triangles.'),
  66: { held: true, reason: 'The marks inside the kite (a dot, a plus sign, short stripes) are two to four pixels across in the photo; which side each sits on decides between the options, so they cannot be read with certainty.' },
  67: { held: true, reason: CURVES('An outlined band curved like a question mark') },
  68: { held: true, reason: CURVES('A capital P drawn as an outlined band, its bowl curved') },
  69: reflected(69, 'C', 'A is the tube as it is; B is it turned half round; D is it upside down.', 'The option drawings are the question\'s tube turned and placed (each checked on its overlay against the photo).'),
  70: reflected(70, 'B', 'A points the middle arrow away from the stem; C puts the half circle inside; D turns the top and bottom arrows inwards.'),
  71: imaged(71, 'B', 'A reverses the order without turning the letters; C misorders them; D turns the letters back to front but leaves the order.'),
  72: reflected(72, 'A', 'D is the figure as it is; B and C put the black square in a bottom corner.'),
  73: imaged(73, 'A', 'B leaves N and E unturned; C turns only the N; D swaps the B and D.'),
  74: reflected(74, 'C', 'A splits the circle in four; B keeps the triangle on the left; D runs the upright right across the circle.'),
  75: { held: true, lean: 'A', reason: 'The shaded quarter is drawn with lines printed at different spacing in the question (about eight) and in the options (about six), so a faithful redraw matches no option; in arrangement A is the image.' },
  76: imaged(76, 'D', 'Arrows and triangles pointing up or down look the same reversed, so only the order turns round: ▽△↓↑.'),
};
