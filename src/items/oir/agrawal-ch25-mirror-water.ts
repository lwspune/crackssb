import source from '../../../content/oir/agrawal-examcart/ch25-mirror-water.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';
import type { KeyEntry } from './key.ts';
import { imageOf, sameGlyphs } from './mirror.ts';
import type { Glyph } from './mirror.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 25 "Mirror and Water
 * Images" (pages 109-113). Only questions printed as text are keyed (D29):
 * each option is transcribed glyph by glyph as printed, and the key is the one
 * option whose glyphs are the mirror or water image of the printed text,
 * computed by `mirror.ts`. The file fails to load if a keyed question has no
 * such option, or more than one. Drawn figures are held. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
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

const questionOf = (n: number) => source.questions[n - 1] as { n: number; options: Record<OptionLabel, string>; answerPanels?: Record<OptionLabel, { glyphs: Glyph[] }> };

/** The options whose printed glyphs are the image of the printed text. */
export function matchingOptions(n: number): OptionLabel[] {
  const q = questionOf(n);
  const printed = PRINTED[n];
  if (!printed || !q.answerPanels || q.n !== n) throw new Error(`Q${n}: not a transcribed text question`);
  const image = imageOf(printed.text, printed.where);
  return OPTION_LABELS.filter((l) => sameGlyphs(q.answerPanels![l].glyphs, image));
}

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

const FIGURE = { held: true, reason: 'A drawn figure, not text: it is not redrawn yet, so no key can be computed from it.' } as const;

export const AGRAWAL_CH25_MIRROR_WATER: Readonly<Record<number, KeyEntry>> = {
  1: FIGURE,
  2: FIGURE,
  3: FIGURE,
  4: FIGURE,
  5: FIGURE,
  6: FIGURE,
  7: FIGURE,
  8: FIGURE,
  9: FIGURE,
  10: FIGURE,
  11: imaged(11, 'A', 'B prints a small y for the Y; C and D print a capital H for the h, and C a capital R for the r.'),
  12: imaged(12, 'C', 'A prints an l where the word has i; B prints small o and a; D small o for both Os.', 'A and C differ only in one letter: A\'s reads as an undotted l, C\'s as a dotted i, at the limit of the photo.'),
  13: { held: true, lean: 'A', reason: 'MN is drawn as a mirror on the right, but no option is the mirror image: A is the water image (each character upside down, order kept). The print seems to mix a water-image question with a mirror line.' },
  14: { held: true, reason: 'No option is the mirror image: A keeps the order, B is the water image, C turns P, a and r half round, D leaves the 3 and the P unturned.' },
  15: imaged(15, 'D', 'A turns the d half round and leaves the y; B is upside down throughout; C turns the 5 and the A upside down.'),
  16: { held: true, reason: 'No option is the mirror image: A and C turn letters half round, B turns the 4 and 7 upside down, D leaves the e and a unturned.' },
  17: FIGURE,
  18: FIGURE,
  19: FIGURE,
  20: FIGURE,
  21: FIGURE,
  22: imaged(22, 'D', 'A and C keep the order; B leaves the 3, 9, 6 and 1 unturned.', 'D\'s 1 shows no flag on its left, read as turned; the flag is at the limit of the photo.'),
  23: imaged(23, 'C', 'A and B keep the order; D leaves the L unturned.'),
  24: imaged(24, 'C', 'A leaves the E unturned; B keeps the order, turned half round; D swaps letters and leaves the Bs unturned.'),
  25: imaged(25, 'A', 'B leaves the N unturned; C and D keep the order with the L turned half round.'),
  26: imaged(26, 'C', 'T, O and Y look the same in a mirror, so only the order changes. A and D turn the T upside down; B keeps the order.'),
  27: { held: true, reason: 'Options A, B and D read the same glyph for glyph in the photo (each the mirror image); whatever tells them apart is below its resolution.' },
  28: FIGURE,
  29: imaged(29, 'A', 'B turns the p half round and leaves the r; C leaves the 4 and 3 unturned; D swaps the p and a.'),
  30: imaged(30, 'C', 'A turns the r half round; B turns the h half round; D leaves the 7 and 5 unturned.'),
  31: { held: true, reason: 'A grid of six letters in three rows and two columns: a figure, not one line of text, so it is not transcribed glyph by glyph.' },
  32: imaged(32, 'D', 'A leaves the 2 and 7 unturned and in order; B turns the A upside down; C turns most characters half round.'),
  33: imaged(33, 'A', 'B is turned half round; C leaves the E unturned and turns the w upside down; D swaps y and w and leaves the R unturned.'),
  34: FIGURE,
  35: { held: true, reason: 'Options A and D read the same glyph for glyph and both are the mirror image; whatever tells them apart is below the resolution of the photo.' },
  36: { held: true, lean: 'D', reason: 'No option is the mirror image: D comes closest but leaves the J unturned; A misorders the letters, B and C leave the 3 unturned.' },
  37: imaged(37, 'A', 'B and C turn the w and a upside down; D leaves the 3 and 7 unturned and in order.', 'The small a\'s left-right turn cannot be seen in the photo; it is read as turned across in A, the option that turns every other character.'),
  38: imaged(38, 'B', 'A keeps B before 7 and leaves the 7 unturned; C and D turn the A upside down.', 'First read with a plain B in every option, which matched none; at 22 times zoom B\'s B shows its stem on the right (turned) and A\'s on the left. Read at the limit of the photo.'),
  39: FIGURE,
  40: FIGURE,
  41: FIGURE,
  42: FIGURE,
  43: FIGURE,
  44: FIGURE,
  45: FIGURE,
  46: FIGURE,
  47: FIGURE,
  48: FIGURE,
  49: FIGURE,
  50: FIGURE,
  51: FIGURE,
  52: imaged(52, 'C', 'A turns only the 5 and 3; B is the mirror image; D is turned half round.'),
  53: { held: true, lean: 'B', reason: 'No option is the water image: B comes closest but leaves the R upright; A leaves S and A upright; C and D are turned half round. The frame shaped like an arrow is not transcribed.' },
  54: imaged(54, 'D', 'A and C are mirror images; B turns the R half round instead of upside down.'),
  55: FIGURE,
  56: FIGURE,
  57: FIGURE,
  58: imaged(58, 'A', 'B prints another series (HR2642O); C swaps H and A; D prints S for the R.'),
  59: imaged(59, 'C', 'A, B and D print an I for the 1; D also reverses the 3.', 'C\'s second character shows the 1\'s flag turned down; A, B and D print a serifed I. Read at the limit of the photo.'),
  60: imaged(60, 'B', 'A keeps the order and ends in 3; C and D print other characters (S, 3, W) in the series.'),
  61: FIGURE,
  62: FIGURE,
  63: FIGURE,
  64: imaged(64, 'A', 'T, O and M look the same in a mirror, so only the order changes: MOT. B is the water image; C turns the T upside down, D the M.'),
  65: FIGURE,
  66: FIGURE,
  67: FIGURE,
  68: FIGURE,
  69: FIGURE,
  70: FIGURE,
  71: imaged(71, 'B', 'A reverses the order without turning the letters; C misorders them; D turns the letters back to front but leaves the order.'),
  72: FIGURE,
  73: imaged(73, 'A', 'B leaves N and E unturned; C turns only the N; D swaps the B and D.'),
  74: FIGURE,
  75: FIGURE,
  76: imaged(76, 'D', 'Arrows and triangles pointing up or down look the same reversed, so only the order turns round: ▽△↓↑.'),
};
