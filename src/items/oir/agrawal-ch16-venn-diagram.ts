import source from '../../../content/oir/agrawal-examcart/ch16-venn-diagram.source.json' with { type: 'json' };
import type { OptionLabel } from '../bank.ts';
import { circleRelations } from './figure.ts';
import type { CircleRelation, Figure } from './figure.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 16 "Ven Diagram"
 * (pages 59-61). Each question's classes are related in words (the rule) and
 * as code: every pair is apart, overlapping, or one inside the other. The key
 * is the one option whose drawing shows exactly those relations under some
 * way of naming its shapes (D29); printed labels fix the naming. The file
 * fails to load if no option, or more than one, matches. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * How a drawing is read: its circles are the classes, and any lines are a
 * frame round them (the whole page, not a class). A drawing with no circles
 * is read as rectangles, four lines each (Q39-40). A label belongs to the
 * smallest shape that holds it.
 *
 * Source: content/oir/agrawal-examcart/ch16-venn-diagram.source.json
 */

type Rect = readonly [number, number, number, number];

/** Rectangles drawn as four lines each, in turn: throws unless every four lines close an upright rectangle. */
function rectangles(figure: Figure): Rect[] {
  const { lines } = figure;
  if (lines.length % 4 !== 0) throw new Error(`${lines.length} lines do not make whole rectangles`);
  const out: Rect[] = [];
  for (let i = 0; i < lines.length; i += 4) {
    const four = lines.slice(i, i + 4);
    const xs = four.flatMap(([x1, , x2]) => [x1, x2]), ys = four.flatMap(([, y1, , y2]) => [y1, y2]);
    const r: Rect = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const sides = [[r[0], r[1], r[2], r[1]], [r[2], r[1], r[2], r[3]], [r[2], r[3], r[0], r[3]], [r[0], r[3], r[0], r[1]]];
    const same = (a: readonly number[], b: readonly number[]) => a.every((v, k) => v === b[k]) || (a[0] === b[2] && a[1] === b[3] && a[2] === b[0] && a[3] === b[1]);
    if (!sides.every((s) => four.some((l) => same(l, s)))) throw new Error(`lines ${i}-${i + 3} are not one upright rectangle`);
    out.push(r);
  }
  return out;
}

/** Each pair of rectangles, as circleRelations gives circles. Touching counts as apart. */
function rectRelations(rs: readonly Rect[]): CircleRelation[] {
  const out: CircleRelation[] = [];
  const within = (a: Rect, b: Rect) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const [a, b] = [rs[i], rs[j]];
    if (a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]) out.push(['apart', i, j]);
    else if (within(a, b)) out.push(['inside', i, j]);
    else if (within(b, a)) out.push(['inside', j, i]);
    else out.push(['overlap', i, j]);
  }
  return out;
}

/** The classes a drawing shows: how many shapes, how each pair relates, and which shape each label names. */
export function shapeRelations(figure: Figure): { shapes: number; rels: CircleRelation[]; labelled: Record<string, number> } {
  const circles = figure.circles ?? [];
  const byRect = circles.length === 0;
  const rects = byRect ? rectangles(figure) : [];
  const shapes = byRect ? rects.length : circles.length;
  const holds = (k: number, x: number, y: number) =>
    byRect ? x > rects[k][0] && x < rects[k][2] && y > rects[k][1] && y < rects[k][3] : Math.hypot(x - circles[k][0], y - circles[k][1]) < circles[k][2];
  const size = (k: number) => (byRect ? (rects[k][2] - rects[k][0]) * (rects[k][3] - rects[k][1]) : circles[k][2]);
  const labelled: Record<string, number> = {};
  for (const [x, y, text] of figure.labels ?? []) {
    const holding = Array.from({ length: shapes }, (_, k) => k).filter((k) => holds(k, x, y));
    if (holding.length === 0) throw new Error(`label ${text} sits in no shape`);
    labelled[text] = holding.reduce((a, b) => (size(b) < size(a) ? b : a));
  }
  if (new Set(Object.values(labelled)).size !== Object.keys(labelled).length) throw new Error('two labels name one shape');
  return { shapes, rels: byRect ? rectRelations(rects) : circleRelations(figure), labelled };
}

/** One stated relation: "X in Y" (every X is a Y), "X overlap Y" (some are, some are not), "X apart Y" (none is). */
export type Stated = readonly [string, 'in' | 'overlap' | 'apart', string];

/** The classes named, checking every pair is stated exactly once. */
function classesOf(rels: readonly Stated[]): string[] {
  const names = [...new Set(rels.flatMap(([a, , b]) => [a, b]))];
  const pair = (a: string, b: string) => [a, b].sort().join(' | ');
  const stated = rels.map(([a, , b]) => pair(a, b));
  if (new Set(stated).size !== stated.length) throw new Error(`a pair is stated twice: ${stated.join('; ')}`);
  if (stated.length !== (names.length * (names.length - 1)) / 2) throw new Error(`not every pair of ${names.join(', ')} is stated`);
  return names;
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}

/** Does this drawing show exactly the stated relations, under some naming of its shapes that respects the labels? */
export function shows(figure: Figure, rels: readonly Stated[], labels?: Readonly<Record<string, string>>): boolean {
  const names = classesOf(rels);
  const drawn = shapeRelations(figure);
  if (drawn.shapes !== names.length) throw new Error(`the drawing has ${drawn.shapes} shapes for ${names.length} classes`);
  const relOf = (i: number, j: number): string => {
    for (const r of drawn.rels) {
      if (r[0] === 'inside') {
        if (r[1] === i && r[2] === j) return 'in';
        if (r[1] === j && r[2] === i) return 'has';
      } else if ((r[1] === i && r[2] === j) || (r[1] === j && r[2] === i)) return r[0];
    }
    throw new Error(`no relation drawn for shapes ${i} and ${j}`);
  };
  return permutations(names.length).some((shape) => {
    if (labels) for (const [name, text] of Object.entries(labels)) {
      if (!(text in drawn.labelled)) throw new Error(`label ${text} is not drawn`);
      if (shape[names.indexOf(name)] !== drawn.labelled[text]) return false;
    }
    return rels.every(([a, how, b]) => relOf(shape[names.indexOf(a)], shape[names.indexOf(b)]) === how);
  });
}

const LABELS: readonly OptionLabel[] = ['A', 'B', 'C', 'D'];
type SourceQ = { n: number; options: Record<OptionLabel, string>; figure?: Figure; answerPanels?: Record<OptionLabel, { figure: Figure }> };
const questionOf = (n: number) => (source.questions as unknown as SourceQ[])[n - 1];

/** The options of a "which diagram" question whose drawing shows these relations. */
export function matchingOptions(n: number, rels: readonly Stated[], labels?: Readonly<Record<string, string>>): OptionLabel[] {
  const q = questionOf(n);
  if (!q.answerPanels) throw new Error(`Q${n} has no drawn answers`);
  return LABELS.filter((l) => shows(q.answerPanels![l].figure, rels, labels));
}

function only(n: number, hits: OptionLabel[], what: string): string {
  if (hits.length !== 1) throw new Error(`Q${n}: ${hits.length} options match ${what} (${hits.join(', ') || 'none'})`);
  return questionOf(n).options[hits[0]];
}

interface Opts {
  readonly labels?: Readonly<Record<string, string>>;
  /** A debatable relation: shipped at medium confidence, with this note. */
  readonly note?: string;
  readonly stemFix?: string;
  readonly direction?: string;
}

/** A "which diagram" question: the classes' relations pick one drawn option. */
function diagram(n: number, key: OptionLabel, rels: readonly Stated[], rule: string, o: Opts = {}): KeyEntry {
  const answer = only(n, matchingOptions(n, rels, o.labels), rels.map((r) => r.join(' ')).join('; '));
  return {
    key,
    rule,
    confidence: o.note ? 'medium' : 'high',
    ...(o.note ? { note: o.note } : {}),
    ...(o.stemFix ? { stemFix: o.stemFix } : {}),
    ...(o.direction ? { direction: o.direction } : {}),
    check: { kind: 'computed', answer },
  };
}

/** A "which classes" question: each option's classes, related; exactly one fits the printed figure. */
function classes(n: number, key: OptionLabel, perOption: Readonly<Record<OptionLabel, readonly Stated[]>>, rule: string, note?: string): KeyEntry {
  const q = questionOf(n);
  if (!q.figure) throw new Error(`Q${n} has no figure`);
  const answer = only(n, LABELS.filter((l) => shows(q.figure!, perOption[l])), 'the figure');
  return { key, rule, confidence: note ? 'medium' : 'high', ...(note ? { note } : {}), check: { kind: 'computed', answer } };
}

/** Three classes, three statements. */
const s = (...rels: Stated[]): Stated[] => rels;
const ROLES = 'Two jobs or roles are read as distinct classes (none of one is the other), as the book draws them; in life one person can hold both.';
const MAN = '"Man" is read as a male person, boys included, as the book reads it in Q15 and Q44.';
const PART = 'The parts of a whole are drawn inside it, as the book draws a class and its pupils (Q43).';

/**
 * Held questions whose classes can be read two ways, each reading picking a
 * different printed option (or, for Q49, no option at all). The chapter test
 * runs each reading to show it.
 */
export const READINGS: Readonly<Record<number, readonly { reading: string; rels: readonly Stated[]; labels?: Readonly<Record<string, string>> }[]>> = {
  3: [
    { reading: 'colleges and schools as places with students and others in them', rels: s(['College', 'overlap', 'Student'], ['School', 'overlap', 'Student'], ['College', 'apart', 'School']) },
    { reading: 'college and school as the students of each', rels: s(['College', 'in', 'Student'], ['School', 'in', 'Student'], ['College', 'apart', 'School']) },
  ],
  10: [
    { reading: 'three kinds of object', rels: s(['Window', 'apart', 'Door'], ['Window', 'apart', 'House'], ['Door', 'apart', 'House']) },
    { reading: 'windows and doors as parts of a house', rels: s(['Window', 'in', 'House'], ['Door', 'in', 'House'], ['Window', 'apart', 'Door']) },
  ],
  16: [
    { reading: 'three kinds of thing', rels: s(['Industry', 'apart', 'Workers'], ['Industry', 'apart', 'Machines'], ['Workers', 'apart', 'Machines']) },
    { reading: 'workers and machines as parts of an industry', rels: s(['Workers', 'in', 'Industry'], ['Machines', 'in', 'Industry'], ['Workers', 'apart', 'Machines']) },
  ],
  32: [
    { reading: 'statistician and pathologist as distinct professions', rels: s(['Statisticians', 'overlap', 'Men'], ['Pathologists', 'overlap', 'Men'], ['Statisticians', 'apart', 'Pathologists']) },
    { reading: 'one person may be both', rels: s(['Statisticians', 'overlap', 'Men'], ['Pathologists', 'overlap', 'Men'], ['Statisticians', 'overlap', 'Pathologists']) },
  ],
  37: [
    { reading: 'people, and two kinds of vehicle', rels: s(['Travellers', 'apart', 'Train'], ['Travellers', 'apart', 'Bus'], ['Train', 'apart', 'Bus']) },
    { reading: 'travellers on trains and travellers on buses', rels: s(['Travellers', 'overlap', 'Train'], ['Travellers', 'overlap', 'Bus'], ['Train', 'apart', 'Bus']) },
  ],
  49: [
    { reading: 'the statements: markers inside boards inside printers', rels: s(['Markers', 'in', 'Boards'], ['Boards', 'in', 'Printers'], ['Markers', 'in', 'Printers']), labels: { Markers: 'M', Boards: 'B', Printers: 'P' } },
  ],
};

const TWO_WAYS = (n: number, picks: string) =>
  `The classes read two ways and each reading fits a different option: ${READINGS[n].map((r) => r.reading).join(' (one option); ')} (another). ${picks} Waiting for the book's key.`;

export const AGRAWAL_CH16_VENN_DIAGRAM: Readonly<Record<number, KeyEntry>> = {
  1: diagram(1, 'C', s(['Shrimp', 'in', 'Sea animals'], ['Walrus', 'in', 'Sea animals'], ['Shrimp', 'apart', 'Walrus']), 'Shrimps and walruses are both sea animals, and no shrimp is a walrus: two separate circles inside a larger one.'),
  2: diagram(2, 'A', s(['Cardiologist', 'in', 'Doctor'], ['Professor', 'overlap', 'Doctor'], ['Professor', 'overlap', 'Cardiologist']), 'Every cardiologist (2) is a doctor (1); some doctors are professors (3), and some professors are cardiologists: 2 inside 1, and 3 crossing both.', { labels: { Doctor: '1', Cardiologist: '2', Professor: '3' } }),
  3: { held: true, reason: TWO_WAYS(3, 'The first gives the chain (B), the second two circles inside a larger one (D); strictly, students, colleges and schools are three separate classes, which no option draws.') },
  4: diagram(4, 'A', s(['Girls', 'overlap', 'Healthy'], ['Trains', 'apart', 'Girls'], ['Trains', 'apart', 'Healthy']), 'Some girls are healthy and some are not; a train is neither a girl nor healthy: two overlapping circles, and a third apart from both.', { note: 'In option A the third circle meets the other two at a single point in the photo, read as touching (apart), not overlapping; the next closest option, B, has no overlap at all.' }),
  5: diagram(5, 'B', s(['Watt', 'in', 'Unit'], ['Volt', 'in', 'Unit'], ['Watt', 'apart', 'Volt']), 'The watt and the volt are both units, and different ones: two separate circles inside a larger one.'),
  6: diagram(6, 'B', s(['Village people', 'overlap', 'Educated people'], ['Village people', 'overlap', 'Intelligent people'], ['Educated people', 'overlap', 'Intelligent people']), 'Some village people are educated, some intelligent, and some educated people are intelligent; none of the three holds another: three circles each overlapping the other two.'),
  7: diagram(7, 'D', s(['Charcoal', 'in', 'Black'], ['Board', 'overlap', 'Black'], ['Charcoal', 'apart', 'Board']), 'All charcoal is black; some classroom boards are black and some are not (white boards); no board is charcoal: a circle inside another, and a third crossing only the outer one.', { note: '"Black Colour" is read as the class of black things, holding all charcoal and the black boards.' }),
  8: diagram(8, 'B', s(['Student', 'overlap', 'Women'], ['Teacher', 'overlap', 'Women'], ['Student', 'apart', 'Teacher']), 'Some women are students and some are teachers; a student is not the teacher: a chain, with women in the middle.', { note: `${ROLES} No option draws all three overlapping.` }),
  9: classes(9, 'B', {
    A: s(['Furniture', 'overlap', 'Plastic'], ['Bag', 'overlap', 'Plastic'], ['Furniture', 'apart', 'Bag']),
    B: s(['Chair', 'in', 'Furniture'], ['Book', 'apart', 'Furniture'], ['Book', 'apart', 'Chair']),
    C: s(['India', 'overlap', 'Monsoon'], ['India', 'overlap', 'Desert'], ['Monsoon', 'apart', 'Desert']),
    D: s(['Ponds', 'apart', 'Waterfall'], ['Ponds', 'apart', 'River'], ['Waterfall', 'apart', 'River']),
  }, 'A circle inside another and one apart: every chair is furniture, and a book is neither. Plastic furniture and plastic bags make a chain (A); ponds, waterfalls and rivers are three separate things (D); India, the monsoon and deserts share parts but none holds another (C).'),
  10: { held: true, reason: TWO_WAYS(10, 'Three separate circles (C) or two inside a larger one (A); A follows the part-of-a-whole reading the book uses in Q43.'), lean: 'A' },
  11: diagram(11, 'B', s(['Father', 'in', 'Man'], ['Surgeon', 'overlap', 'Man'], ['Surgeon', 'overlap', 'Father']), 'Every father is a man; some men are surgeons (and some surgeons are women); some fathers are surgeons: a circle inside another, and a third crossing both.'),
  12: diagram(12, 'C', s(['Mother', 'in', 'Woman'], ['Father', 'apart', 'Woman'], ['Father', 'apart', 'Mother']), 'Every mother is a woman; no father is either: a circle inside another, and a third apart from both.'),
  13: diagram(13, 'C', s(['Leopard', 'in', 'Animal'], ['Banner', 'apart', 'Animal'], ['Banner', 'apart', 'Leopard']), 'Every leopard is an animal; a banner is neither: a circle inside another, and a third apart from both (A holding C, B apart).', { note: 'The print letters the circles A, B and C without saying which class each is; read as names of circles, only option C draws the relation. Taken as Animal, Leopard, banner in printed order, no option fits.' }),
  14: diagram(14, 'D', s(['Canary', 'in', 'Bird'], ['Tuna', 'apart', 'Bird'], ['Tuna', 'apart', 'Canary']), 'Every canary (C) is a bird (B); a tuna (T) is a fish, neither: C inside B, and T apart.', { labels: { Bird: 'B', Tuna: 'T', Canary: 'C' } }),
  15: diagram(15, 'C', s(['Brother', 'in', 'Man'], ['Pharmacist', 'overlap', 'Man'], ['Pharmacist', 'overlap', 'Brother']), 'Every brother is male; some men are pharmacists (and some pharmacists are women); some brothers are pharmacists: a circle inside another, and a third crossing both.', { note: MAN }),
  16: { held: true, reason: TWO_WAYS(16, 'Three separate circles (A) or two inside a larger one (B).'), lean: 'B' },
  17: diagram(17, 'B', s(['Lion', 'in', 'Carnivore'], ['Elephant', 'apart', 'Carnivore'], ['Elephant', 'apart', 'Lion']), 'Every lion (L) is a carnivore (C); an elephant (E) eats plants, neither: L inside C, and E apart.', { labels: { Carnivore: 'C', Lion: 'L', Elephant: 'E' } }),
  18: diagram(18, 'B', s(['Peach', 'in', 'Fruit'], ['Lychee', 'in', 'Fruit'], ['Peach', 'apart', 'Lychee']), 'Peaches and lychees are both fruits, and different ones: two separate circles inside a larger one.'),
  19: diagram(19, 'C', s(['Computer', 'apart', 'Cycle'], ['Computer', 'apart', 'Forest'], ['Cycle', 'apart', 'Forest']), 'A computer, a cycle and a forest have nothing in common: three separate circles.'),
  20: diagram(20, 'A', s(['Red', 'in', 'Colour'], ['Blue', 'in', 'Colour'], ['Red', 'apart', 'Blue']), 'Red and blue are both colours, and different ones: two separate circles inside a larger one.'),
  21: diagram(21, 'D', s(['Kidney', 'apart', 'Leg'], ['Kidney', 'apart', 'Head'], ['Leg', 'apart', 'Head']), 'Kidney, leg and head are three separate parts of the body, none part of another: three separate circles.'),
  22: diagram(22, 'B', s(['Onion', 'in', 'Vegetables'], ['Vegetables', 'in', 'Food'], ['Onion', 'in', 'Food']), 'An onion is a vegetable, and every vegetable is food: three circles, one inside the next.'),
  23: diagram(23, 'C', s(['Ostrich', 'apart', 'Snake'], ['Ostrich', 'apart', 'Frog'], ['Snake', 'apart', 'Frog']), 'A bird, a reptile and an amphibian: three separate circles.'),
  24: diagram(24, 'A', s(['Psychology', 'in', 'Social Science'], ['Sociology', 'in', 'Social Science'], ['Psychology', 'apart', 'Sociology']), 'Psychology and sociology are both social sciences, and different ones: two separate circles inside a larger one.', { note: 'Psychology is counted a social science, as it usually is in school syllabuses; it is sometimes also classed with the natural sciences.' }),
  25: classes(25, 'D', {
    A: s(['Solid', 'apart', 'Gas'], ['Milk', 'apart', 'Solid'], ['Milk', 'apart', 'Gas']),
    B: s(['Men', 'apart', 'Women'], ['Children', 'apart', 'Men'], ['Children', 'apart', 'Women']),
    C: s(['Father', 'apart', 'Mother'], ['Sibling', 'overlap', 'Father'], ['Sibling', 'overlap', 'Mother']),
    D: s(['Milk', 'in', 'Liquid'], ['Gas', 'apart', 'Liquid'], ['Gas', 'apart', 'Milk']),
  }, 'A circle inside another and one apart: milk is a liquid, and a gas is neither. Solid, gas and milk are three separate things (A), as are men, women and children (B); a sibling can be a father or a mother (C).'),
  26: diagram(26, 'A', s(['Elephant', 'in', 'Animal'], ['Lion', 'in', 'Animal'], ['Elephant', 'apart', 'Lion']), 'Elephants and lions are both animals, and different ones: two separate circles inside a larger one.'),
  27: diagram(27, 'A', s(['Television Set', 'in', 'Electrical Appliances'], ['Refrigerator', 'in', 'Electrical Appliances'], ['Television Set', 'apart', 'Refrigerator']), 'Television sets and refrigerators are both electrical appliances, and different ones: two separate circles inside a larger one.'),
  28: diagram(28, 'D', s(['Wheat', 'in', 'Cereals'], ['Asafoetida', 'apart', 'Cereals'], ['Asafoetida', 'apart', 'Wheat']), 'Wheat is a cereal; asafoetida is a spice, neither: a circle inside another, and a third apart.'),
  29: diagram(29, 'A', s(['Honey', 'apart', 'Milk'], ['Honey', 'apart', 'Dog'], ['Milk', 'apart', 'Dog']), 'Honey, milk and a dog are three separate things: three separate circles.'),
  30: diagram(30, 'D', s(['Honeybee', 'in', 'Insect'], ['Ant', 'in', 'Insect'], ['Honeybee', 'apart', 'Ant']), 'Honeybees and ants are both insects, and different ones: two separate circles inside a larger one.'),
  31: diagram(31, 'C', s(['Parents', 'overlap', 'Graduates'], ['Parents', 'overlap', 'Cricketers'], ['Graduates', 'overlap', 'Cricketers']), 'A parent may be a graduate or a cricketer, and a graduate a cricketer; none holds another: three circles each overlapping the other two.'),
  32: { held: true, reason: TWO_WAYS(32, 'A chain with men in the middle (C), or all three overlapping (D).') },
  33: diagram(33, 'B', s(['Hexagon', 'in', 'Polygon'], ['Parabola', 'apart', 'Polygon'], ['Parabola', 'apart', 'Hexagon']), 'Every hexagon is a polygon; a parabola is a curve, neither: a circle inside another, and a third apart.'),
  34: diagram(34, 'D', s(['Table', 'in', 'Furniture'], ['Chair', 'in', 'Furniture'], ['Table', 'apart', 'Chair']), 'Tables and chairs are both furniture, and different things: two separate circles inside a larger one.'),
  35: diagram(35, 'D', s(['Haryana', 'in', 'India'], ['India', 'in', 'World'], ['Haryana', 'in', 'World']), 'Haryana lies in India, and India in the world: three circles, one inside the next.'),
  36: diagram(36, 'A', s(['Lotus', 'in', 'Flower'], ['Rose', 'in', 'Flower'], ['Lotus', 'apart', 'Rose']), 'Lotuses and roses are both flowers, and different ones: two separate circles inside a larger one.'),
  37: { held: true, reason: TWO_WAYS(37, 'Three separate circles (B) or a chain (C).'), lean: 'C' },
  38: diagram(38, 'A', s(['Nepal', 'in', 'Country'], ['India', 'in', 'Country'], ['Nepal', 'apart', 'India']), 'Nepal and India are both countries, and different ones: two separate circles inside a larger one.'),
  39: diagram(39, 'D', s(['Teachers', 'in', 'Human beings'], ['Pilots', 'in', 'Human beings'], ['Teachers', 'apart', 'Pilots']), 'Teachers and pilots are all human beings, and different jobs: two separate rectangles inside a larger one.', { note: `${ROLES} No option draws them overlapping inside the larger one.` }),
  40: diagram(40, 'C', s(['Oranges', 'in', 'Fruits'], ['Sweets', 'apart', 'Fruits'], ['Sweets', 'apart', 'Oranges']), 'Every orange is a fruit; sweets are neither: a rectangle inside another, and a third apart.'),
  41: diagram(41, 'A', s(['Monitor', 'in', 'Computer hardware'], ['Keyboard', 'in', 'Computer hardware'], ['Monitor', 'apart', 'Keyboard'], ['Operating system', 'apart', 'Computer hardware'], ['Operating system', 'apart', 'Monitor'], ['Operating system', 'apart', 'Keyboard']), 'Monitors and keyboards are both computer hardware, and different parts; an operating system is software: two separate circles inside a larger one, and a fourth apart.', {
    stemFix: 'Computer hardware, Monitor, Keyboard, Operating system.',
    direction: 'Select the venn diagram that best represents the relationship between the following classes.',
    note: 'The print begins "classes." (the end of a sentence it does not print) and names four classes under a direction about three elements. The stray word is dropped from the stem, and the direction is the chapter\'s own first sentence, which ends in that word.',
  }),
  42: diagram(42, 'B', s(['Sister', 'overlap', 'Mother'], ['Brother', 'apart', 'Sister'], ['Brother', 'apart', 'Mother']), 'A sister may be a mother and a mother a sister; a brother is neither: two overlapping circles, and a third apart.'),
  43: diagram(43, 'D', s(['Boys', 'in', 'Class'], ['Girls', 'in', 'Class'], ['Boys', 'apart', 'Girls']), 'A class is made of boys and girls, and no boy is a girl: two separate circles inside a larger one.', { note: `${PART} Read strictly, as three separate classes, no option fits.` }),
  44: classes(44, 'D', {
    A: s(['Black gram', 'in', 'Pulse'], ['Root', 'apart', 'Pulse'], ['Root', 'apart', 'Black gram']),
    B: s(['Doctor', 'apart', 'Nurse'], ['Doctor', 'apart', 'Engineer'], ['Nurse', 'apart', 'Engineer']),
    C: s(['Rupee', 'in', 'Currency'], ['China', 'apart', 'Currency'], ['China', 'apart', 'Rupee']),
    D: s(['Boy', 'in', 'Man'], ['Man', 'in', 'Human'], ['Boy', 'in', 'Human']),
  }, 'Three circles, one inside the next: every boy is male, and every male a human. Black gram is a pulse but a root is neither (A); the rupee is a currency but China is not (C); doctor, nurse and engineer are three jobs (B).', `${MAN} Read as an adult male, boys and men would be two separate circles inside "human", and no option would fit.`),
  45: classes(45, 'A', {
    A: s(['Mothers', 'in', 'Women'], ['Doctors', 'overlap', 'Women'], ['Doctors', 'overlap', 'Mothers']),
    B: s(['Musician', 'overlap', 'Teacher'], ['Musician', 'overlap', 'Engineer'], ['Teacher', 'overlap', 'Engineer']),
    C: s(['Letter', 'overlap', 'Paper'], ['Post office', 'apart', 'Letter'], ['Post office', 'apart', 'Paper']),
    D: s(['Book', 'apart', 'Copy'], ['Student', 'apart', 'Book'], ['Student', 'apart', 'Copy']),
  }, 'A circle inside another, and a third crossing both: every mother is a woman; some women are doctors (and some doctors are men); some mothers are doctors. Musician, teacher and engineer all overlap one another (B); letters overlap paper, and a post office is neither (C); book, copy and student are three things (D).'),
  46: classes(46, 'C', {
    A: s(['Doctor', 'apart', 'Engineer'], ['Doctor', 'apart', 'Carpenter'], ['Engineer', 'apart', 'Carpenter']),
    B: s(['Blue whale', 'in', 'Mammal'], ['Mammal', 'in', 'Animal'], ['Blue whale', 'in', 'Animal']),
    C: s(['Sisters', 'in', 'Women'], ['Mothers', 'in', 'Women'], ['Sisters', 'overlap', 'Mothers']),
    D: s(['Brother', 'in', 'Man'], ['Aunt', 'apart', 'Man'], ['Aunt', 'apart', 'Brother']),
  }, 'Two overlapping circles inside a larger one: sisters and mothers are all women, and some sisters are mothers. Blue whale, mammal, animal nest one inside the next (B); a brother is a man but an aunt is not (D); doctor, engineer and carpenter are three jobs (A).', `${MAN} (Option D.) ${ROLES} (Option A.)`),
  47: classes(47, 'B', {
    A: s(['Police officers', 'apart', 'Doctors'], ['Police officers', 'apart', 'Nurses'], ['Doctors', 'apart', 'Nurses']),
    B: s(['Father', 'overlap', 'Uncle'], ['Father', 'overlap', 'Brother'], ['Uncle', 'overlap', 'Brother']),
    C: s(['Father', 'overlap', 'Artist'], ['Girls', 'overlap', 'Artist'], ['Father', 'apart', 'Girls']),
    D: s(['Brother', 'in', 'Men'], ['Women', 'apart', 'Men'], ['Women', 'apart', 'Brother']),
  }, 'Three circles each overlapping the other two: one man can be a father, an uncle and a brother at once, and none of the three holds another. A father may be an artist and so may a girl, but no girl is a father (C); every brother is male and no woman is (D).', `${ROLES} (Option A.)`),
  48: classes(48, 'D', {
    A: s(['Hindi', 'apart', 'English'], ['Hindi', 'apart', 'Spanish'], ['English', 'apart', 'Spanish']),
    B: s(['Television', 'apart', 'Refrigerator'], ['Television', 'apart', 'Fan'], ['Refrigerator', 'apart', 'Fan']),
    C: s(['Languages', 'apart', 'Social Sciences'], ['Languages', 'apart', 'Scientific'], ['Social Sciences', 'apart', 'Scientific']),
    D: s(['Hindi', 'in', 'Languages'], ['English', 'in', 'Languages'], ['Hindi', 'apart', 'English']),
  }, 'Two separate circles inside a larger one: Hindi and English are both languages, and different ones. Options A and B name three things of one kind with no class holding them; languages, social sciences and "scientific" are three separate fields (C).'),
  49: { held: true, reason: 'The statements put markers inside boards inside printers, and no option draws that: the one option with three nested circles (A) labels them M outside P outside B, the wrong way round. A misprint of the labels is likely.', lean: 'A' },
  50: diagram(50, 'B', s(['Mugs', 'overlap', 'Drones'], ['Drones', 'overlap', 'Robots'], ['Mugs', 'apart', 'Robots']), '"Some mugs are drones" and "some drones are robots": M overlaps D, D overlaps R, and nothing links mugs to robots: a chain with D in the middle.', {
    labels: { Mugs: 'M', Drones: 'D', Robots: 'R' },
    note: 'Each "some" is drawn as an overlap and the unlinked pair (mugs, robots) apart, as statement diagrams are usually drawn; the statements allow other pictures too.',
  }),
};
