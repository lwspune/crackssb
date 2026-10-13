import source from '../../../content/oir/agrawal-examcart/ch18-cubes-dice.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import type { AnswerPanel, OptionLabel } from '../bank.ts';
import { adjacent, cubesFromViews, foldNet, netShows, opposite, oppositeBySight } from './dice.ts';
import type { DiceFigure, DiceView, NetCell } from './dice.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 18 "Cubes and Dice"
 * (pages 69-74). Every answer is worked out by the cube solver (`dice.ts`) from
 * the drawing that ships (D29), and the rules are written from what the solver
 * found, not by hand:
 * - views keep only the labellings of a real cube that show them all, each the
 *   right way round; where a book draws views no real cube can show (one in
 *   mirror image of another), the exam's method is used instead (a face's
 *   opposite is the one never seen beside it) and the key is marked medium;
 * - nets are folded printed side out and turned to each cube.
 * Shipped with `key_basis = 'derived'` until the book's key is compared.
 *
 * Source: content/oir/agrawal-examcart/ch18-cubes-dice.source.json
 */

interface Q {
  readonly options: Readonly<Record<OptionLabel, string>>;
  readonly dice?: DiceFigure;
  readonly answerPanels?: Readonly<Record<OptionLabel, AnswerPanel>>;
}
const question = (n: number) => source.questions[n - 1] as unknown as Q;
const views = (n: number) => question(n).dice!.views!;
const sheet = (n: number): readonly NetCell[] => question(n).dice!.nets![0].cells;
const optionViews = (n: number) => Object.fromEntries(OPTION_LABELS.map((l) => [l, question(n).answerPanels![l].dice!.views![0]])) as Record<OptionLabel, DiceView>;
const captioned = (n: number) => new Map(views(n).map((v) => [v.caption!, v]));
const optionText = (n: number, l: OptionLabel) => question(n).options[l];

/** A mark as an option prints it, and as a rule says it. */
const SAY: Readonly<Record<string, string>> = { fill: 'a black face', '': 'a blank face', cross: 'a crossed face' };
const say = (mark: string) => (mark.startsWith('pips:') ? mark.slice(5) : SAY[mark] ?? mark);
const dots = (mark: string) => (mark.startsWith('pips:') ? `${mark.slice(5)} dots` : say(mark));
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function one<T>(xs: readonly T[], what: string): T {
  if (xs.length !== 1) throw new Error(`${what}: ${xs.length} answers, not one (${xs.join(', ')})`);
  return xs[0];
}
const computed = (answer: string | number) => ({ kind: 'computed', answer }) as const;

/**
 * The face opposite `face`, from the views: a real cube first; where no real
 * cube shows every view as drawn, the exam's method.
 */
function fromViews(n: number, labels: readonly string[], face: string, key: OptionLabel, extraNote?: string): KeyEntry {
  const cubes = cubesFromViews(labels, views(n));
  const strict = cubes.length ? opposite(cubes, face) : [];
  const sight = oppositeBySight(labels, views(n), face);
  if (strict.length === 1 && sight.length === 1 && strict[0] !== sight[0]) throw new Error(`Q${n}: the cube and the exam's method disagree`);
  const answer = one(strict.length === 1 ? strict : sight, `Q${n}`);
  const besides = [...new Set(views(n).flatMap((v) => ([v.top, v.left, v.right].includes(face) ? [v.top, v.left, v.right] : [])))].filter((f) => f !== face);
  const shown = answer === '?' ? 'the sixth face, which the question does not name' : dots(answer);
  const how = strict.length === 1 ? 'turning the views onto one die' : 'striking out every face seen with it';
  const rule = `${dots(face)} is seen beside ${list(besides.map(dots))}; ${how} leaves ${shown} across from it.`;
  const printed =
    answer === '?'
      ? optionText(n, one(OPTION_LABELS.filter((l) => !labels.some((m) => m.toLowerCase() === optionText(n, l).toLowerCase())), `Q${n}`))
      : say(answer);
  const note =
    strict.length === 1
      ? extraNote
      : `No real cube shows every view as drawn (one is in mirror image of another), so the face never seen beside ${dots(face)} is keyed, as the exam reads it.${extraNote ? ` ${extraNote}` : ''}`;
  return { key, confidence: note ? 'medium' : 'high', rule, ...(note ? { note } : {}), check: computed(printed) };
}

/** The face opposite `face` once the sheet is folded. */
function fromNet(n: number, face: string, key: OptionLabel, rename: Readonly<Record<string, string>> = {}, note?: string): KeyEntry {
  const across = one(opposite([foldNet(sheet(n))], face), `Q${n}`);
  const rule = `Folded, the sheet puts ${dots(face)} across from ${dots(across)}.`;
  return { key, confidence: note ? 'medium' : 'high', rule, ...(note ? { note } : {}), check: computed(rename[across] ?? say(across)) };
}

/** The one option whose cube the sheet does (or does not) fold into. */
function cubeOption(n: number, can: boolean, key: OptionLabel): KeyEntry {
  const v = optionViews(n);
  const hit = one(OPTION_LABELS.filter((l) => netShows(sheet(n), v[l]) === can), `Q${n}`);
  const corner = `${say(v[hit].top)} on top, ${say(v[hit].left)} in front and ${say(v[hit].right)} on the right`;
  const rule = can
    ? `Fold the sheet and turn it every way: only ${corner} comes out, the right way round; the other cubes put together faces that fold apart, or show them the wrong way round.`
    : `Fold the sheet and turn it every way: ${corner} never comes out; the other three do.`;
  return { key, confidence: 'high', rule, check: computed(optionText(n, hit)) };
}

/** Which of the captioned cubes the sheet folds into, matched to an option listing them ("I and IV", "None"). */
function listed(n: number, key: OptionLabel): KeyEntry {
  const names = [...captioned(n).keys()];
  const can = names.filter((c) => netShows(sheet(n), captioned(n).get(c)!));
  const said = (text: string) => {
    if (/\bnone\b/i.test(text)) return [];
    if (/^\s*all\b/i.test(text)) return names;
    return names.filter((c) => new RegExp(`(?<![A-Za-z0-9])${c}(?![A-Za-z0-9])`).test(text));
  };
  const hit = one(
    OPTION_LABELS.filter((l) => said(optionText(n, l)).sort().join() === [...can].sort().join()),
    `Q${n}: the cubes that fold are ${can.join(', ') || 'none'}`,
  );
  const rest = names.filter((c) => !can.includes(c));
  const rule = can.length
    ? `Fold the sheet and turn it to each cube: ${list(can)} come${can.length === 1 ? 's' : ''} out the right way round${rest.length ? `; ${list(rest)} cannot` : ''}.`
    : 'Fold the sheet and turn it to each cube: none comes out the right way round.';
  return { key, confidence: 'high', rule, check: computed(optionText(n, hit)) };
}

/** Two printed faces from an option like "$ and #" or "4, 3". */
const pairOf = (text: string) => text.split(/\s*(?:,|\band\b|\bOR\b)\s*/i).map((s) => s.trim()).filter(Boolean);

/** The one option naming a pair that is (or is not) opposite on the folded sheet. */
function oppositeOption(n: number, want: boolean, key: OptionLabel): KeyEntry {
  const cube = foldNet(sheet(n));
  const opp = (a: string) => opposite([cube], a)[0];
  const hit = one(
    OPTION_LABELS.filter((l) => {
      const [a, b] = pairOf(optionText(n, l));
      return (opp(a) === b) === want;
    }),
    `Q${n}`,
  );
  const pairs = [...cube.keys()].filter((a) => a < opp(a)).map((a) => `${a} and ${opp(a)}`);
  return { key, confidence: 'high', rule: `Folded, the sheet puts ${list(pairs)} on opposite faces.`, check: computed(optionText(n, hit)) };
}

const HELD_TURN = 'the solver does not track which way a mark turns on its face';
const PIPS = [1, 2, 3, 4, 5, 6].map((d) => `pips:${d}`);
const ONE_TO_SIX = ['1', '2', '3', '4', '5', '6'];

export const AGRAWAL_CH18_CUBES_DICE: Readonly<Record<number, KeyEntry>> = {
  1: fromViews(1, ['Ear', 'Eye', 'Nose', 'Mouth', 'Head', 'Hand'], 'Ear', 'C'),
  2: fromViews(2, PIPS, 'pips:5', 'D'),
  3: fromViews(3, ['Life', 'Eat', 'Enjoy', 'Sleep', 'Love', 'Care'], 'Life', 'A'),
  4: fromViews(4, ['U', 'V', 'W', 'X', 'Y', 'Z'], 'U', 'A'),
  5: fromViews(5, ['13', '14', '15', '16', '17', '18'], '16', 'A'),
  6: fromViews(6, PIPS, 'pips:2', 'A'),
  7: fromViews(7, ['@', 'Δ', '□', 'Ω', '∞', '*'], '@', 'C'),
  8: fromViews(8, ['+', '@', 'O', '∞', '€', 'β'], 'O', 'B'),
  9: fromViews(9, ['4', '5', '6', '7', '8', '9'], '9', 'B'),
  10: fromViews(10, PIPS, 'pips:1', 'C'),
  11: fromViews(11, ['Yes', 'NO', 'if', 'It', 'Is'], 'Yes', 'D', 'The die names five words; of the options only In is not one of them, so it is read as the sixth.'),
  12: fromViews(12, PIPS, 'pips:2', 'A'),
  13: {
    key: 'D',
    confidence: 'medium',
    rule: 'Bat and Cat sit in the same places in both views, so the faces above them, Egg and Fog, lie across from each other.',
    note: 'A real cube cannot show Bat and Cat in the same places under two different tops; the book draws it so, and the exam reading (same two faces in place, so the third faces are opposite) is keyed.',
    check: computed(((asked, other) => (asked.left === other.left && asked.right === other.right && asked.top !== other.top ? other.top : '?'))(views(13)[1], views(13)[0])),
  },
  14: fromViews(14, ['€', '₭', '₮', '₴', '₹', '₢'], '₢', 'A'),
  15: fromViews(15, ['11', '12', '13', '14', '15', '16'], '15', 'D'),
  16: fromViews(16, ['€', '₭', '₮', '₴', '₹', '₢'], '€', 'C'),
  17: fromViews(17, ['7', '8', '9', '10', '11', '12'], '8', 'D'),
  18: fromViews(18, ONE_TO_SIX, '1', 'D'),
  19: fromViews(19, ONE_TO_SIX, '5', 'D'),
  20: fromViews(20, ONE_TO_SIX, '4', 'D'),
  21: fromViews(21, ['5', '10', '15', '20', '25', '30'], '15', 'C'),
  22: fromViews(22, ['IX', 'X', 'XI', 'XII', 'XIII', 'XIV'], 'XIV', 'A'),
  23: fromViews(23, ['!', '@', '%', '#', '$', '&'], '!', 'D'),
  24: { held: true, reason: 'All three views put 1 on top, with 5, 4, 2, 3 and 6 round it: five faces round one, which no cube has. The figure cannot be right as printed.' },
  25: fromViews(25, ONE_TO_SIX, '1', 'A'),
  26: {
    key: 'C',
    confidence: 'high',
    rule: '4 is seen beside 3, 5 and 6; 7 never is. Of the pairs, only 6 and 5 are beside 4 on every die the views allow.',
    check: computed(
      ((cubes) =>
        optionText(26, one(OPTION_LABELS.filter((l) => pairOf(optionText(26, l)).every((f) => cubes.every((c) => adjacent([c], '4').includes(f)))), 'Q26')))(
        cubesFromViews(['3', '4', '5', '6', '7'], views(26)),
      ),
    ),
  },
  27: fromViews(27, ['#', '@', '%', '!', '$', '*'], '!', 'D'),
  28: fromViews(28, ONE_TO_SIX, '4', 'B'),
  29: { held: true, reason: 'The fourth cube asks for two faces beside T; the three views allow more than one printed pair there, so no single option can be keyed.' },
  30: { held: true, reason: 'Asks for the faces A and B in a fourth view; several pairs fit, and the options print alternatives ("1 OR 2") that do not say which is A and which is B.' },
  31: fromViews(31, ['M', 'D', 'S', 'Z', 'T', 'R'], 'M', 'B'),
  32: fromViews(32, ['pips:3', 'pips:1', '×', '⊕', '∂', '+'], '×', 'C'),
  33: { held: true, reason: 'The question does not say which face it asks about, and one mark on the second cube cannot be read in the photo.' },
  34: fromViews(34, ['☼', 'O', '△', '□', '@'], 'O', 'B'),
  35: fromViews(35, ONE_TO_SIX, '5', 'D'),
  36: fromViews(36, ONE_TO_SIX, '4', 'A'),
  37: cubeOption(37, false, 'A'),
  38: listed(38, 'B'),
  39: {
    key: 'C',
    confidence: 'high',
    rule: 'On a standard die opposite faces add to 7. Folded as printed, 1 is across from 6, 2 from 4 and 3 from 5; swapping 2 and 3 makes 2 and 5, and 3 and 4, opposite, so every pair adds to 7.',
    check: computed(
      optionText(
        39,
        one(
          OPTION_LABELS.filter((l) => {
            const [a, b] = pairOf(optionText(39, l));
            const cube = foldNet(sheet(39).map((c) => ({ ...c, face: c.face === a ? b : c.face === b ? a : c.face })));
            return ['1', '2', '3'].every((f) => Number(opposite([cube], f)[0]) + Number(f) === 7);
          }),
          'Q39',
        ),
      ),
    ),
  },
  40: fromNet(40, '7', 'A'),
  41: fromNet(41, 'pips:4', 'A', { 'pips:6': 'Six dots', 'pips:5': 'Five dots', 'pips:3': 'Three dots', 'pips:1': 'One dot' }),
  42: { held: true, reason: `The answer cubes show a face with a slanting line the open cube does not have, and ${HELD_TURN}.` },
  43: { held: true, reason: `The half-shaded face points a different way in each option, and ${HELD_TURN}.` },
  44: { held: true, reason: 'Folding the sheet, only cube A comes out the right way round, and no option says "only A"; waiting for the book key.' },
  45: fromNet(45, 'P', 'A'),
  46: oppositeOption(46, false, 'A'),
  47: oppositeOption(47, true, 'C'),
  48: listed(48, 'D'),
  49: fromNet(49, '☆', 'A'),
  50: fromNet(50, '&', 'B', {}, 'The question prints "symbol 8"; the net has no 8, and & is read for it, as the two look alike in this type.'),
  51: fromNet(51, '+', 'B'),
  52: fromNet(52, '◇', 'D'),
  53: cubeOption(53, true, 'B'),
  54: { held: true, reason: 'The sheet has flaps narrower than its faces, so it is not a cube net the solver can fold, and the marks on the flaps cannot be placed.' },
  55: cubeOption(55, true, 'A'),
  56: cubeOption(56, true, 'A'),
  57: cubeOption(57, true, 'B'),
  58: cubeOption(58, true, 'D'),
  59: cubeOption(59, true, 'D'),
  60: cubeOption(60, true, 'D'),
  61: cubeOption(61, true, 'A'),
  62: { held: true, reason: 'One option marks a face with a small rectangle the sheet does not have, and the small marks are too close to tell apart in the photo.' },
  63: listed(63, 'D'),
  64: { held: true, reason: `The faces are half shaded, and ${HELD_TURN}.` },
  65: {
    key: 'A',
    confidence: 'high',
    rule: 'Fold each sheet and turn it to both views: only sheet A shows L with P and O, and L with Q and N, the right way round.',
    check: computed(optionText(65, one(OPTION_LABELS.filter((l) => views(65).every((v) => netShows(question(65).answerPanels![l].dice!.nets![0].cells, v))), 'Q65'))),
  },
  66: {
    key: 'B',
    confidence: 'high',
    rule: 'Fold each sheet and turn it to both views: only sheet B shows $ with & and @, and $ with # and %, the right way round. Sheet C prints $ twice and is no cube.',
    check: computed(
      optionText(
        66,
        one(
          OPTION_LABELS.filter((l) => {
            const cells = question(66).answerPanels![l].dice!.nets![0].cells;
            return new Set(cells.map((c) => c.face)).size === 6 && views(66).every((v) => netShows(cells, v));
          }),
          'Q66',
        ),
      ),
    ),
  },
  67: listed(67, 'B'),
  68: cubeOption(68, true, 'B'),
  69: { held: true, reason: `The sheet has triangular tabs and arrow marks, and ${HELD_TURN}.` },
  70: { held: true, reason: `The sheet has triangular tabs and half-shaded faces, and ${HELD_TURN}.` },
  71: { held: true, reason: `The faces are cut diagonally into black and white halves, and ${HELD_TURN}.` },
  72: {
    key: 'B',
    confidence: 'high',
    rule: '@, #, & and % run round the sides in order, so each lies across from the one two places on: % across from #. Turned so % is on top, # is at the bottom.',
    check: computed(((ring: readonly string[]) => ring[(ring.indexOf('%') + 2) % 4])(['@', '#', '&', '%'])),
  },
  73: { held: true, reason: 'The question does not say about which axis the die rolls, so the position after rolling cannot be fixed.' },
  74: fromViews(74, ONE_TO_SIX, '5', 'D'),
  75: fromViews(75, ONE_TO_SIX, '3', 'D'),
  76: { held: true, reason: `One face is cut diagonally into black and white halves, and ${HELD_TURN}.` },
  77: fromViews(77, ONE_TO_SIX, '1', 'B', 'The third cube is drawn from below; its faces 5, 6 and 1 are read as meeting at one corner.'),
  78: fromNet(78, 'pips:3', 'D'),
  79: cubeOption(79, false, 'D'),
  80: {
    key: 'C',
    confidence: 'high',
    rule: '125 cubes make a 5 × 5 × 5 block; the unpainted ones are the 3 × 3 × 3 inside: 27.',
    check: computed((Math.round(Math.cbrt(125)) - 2) ** 3),
  },
};
