/**
 * The OIR chapters a candidate practises by (D26). A chapter is a reasoning
 * type, not a page range of one book: a second source's series questions land
 * in the same chapter. Order is the order the practice page lists them in.
 *
 * Every reasoning type in the seeded bank must appear here (practice.test.ts),
 * so seeding a new chapter without listing it fails a test. Listed in the
 * book's chapter order.
 */
export interface OirChapter {
  readonly slug: string;
  readonly title: string;
  /** `OirPayload.reasoningType` — what joins a chapter to its items. */
  readonly reasoningType: string;
  readonly summary: string;
}

export const OIR_CHAPTERS: readonly OirChapter[] = [
  { slug: 'analogy', title: 'Analogy', reasoningType: 'analogy', summary: 'Words, numbers and letters in pairs' },
  { slug: 'odd-one-out', title: 'Odd One Out', reasoningType: 'classification', summary: 'Words, numbers and letters that do not belong' },
  { slug: 'coding', title: 'Coding-Decoding', reasoningType: 'coding', summary: 'Crack the code from its examples' },
  { slug: 'word-formation', title: 'Word Formation', reasoningType: 'word_formation', summary: 'Words hidden in a longer word' },
  { slug: 'word-order', title: 'Word Order', reasoningType: 'word_order', summary: 'Dictionary order and logical sequence' },
  { slug: 'alphabet', title: 'Alphabet Positions', reasoningType: 'alphabet', summary: 'Letters by place, forwards and reversed' },
  { slug: 'blood-relation', title: 'Blood Relation', reasoningType: 'blood_relation', summary: 'Family trees from a sentence or a code' },
  { slug: 'directions', title: 'Directions', reasoningType: 'directions', summary: 'Walks, turns and where things lie' },
  { slug: 'ranking', title: 'Ranking', reasoningType: 'ranking', summary: 'Places in a row, ranks in a class' },
  { slug: 'seating', title: 'Seating Arrangement', reasoningType: 'seating', summary: 'Rows, tables and who sits where' },
  { slug: 'series', title: 'Series', reasoningType: 'series', summary: 'Number and letter series' },
  { slug: 'missing-term', title: 'Missing Term', reasoningType: 'missing_term', summary: 'Grids and figures with one number gone' },
  { slug: 'math-operations', title: 'Mathematical Operations', reasoningType: 'mathematical_operations', summary: 'Swapped signs, coded sums, number rules' },
  { slug: 'calendar-clock', title: 'Calendar and Clock', reasoningType: 'calendar_clock', summary: 'Weekdays from dates, angles between the hands' },
  { slug: 'arithmetic', title: 'Arithmetic Reasoning', reasoningType: 'arithmetic', summary: 'Ages, speeds, shares and percentages' },
  { slug: 'venn', title: 'Venn Diagrams', reasoningType: 'venn', summary: 'Circles that show how classes relate' },
  { slug: 'syllogism', title: 'Syllogism', reasoningType: 'syllogism', summary: 'What follows from all, some and no' },
  { slug: 'cubes-dice', title: 'Cubes and Dice', reasoningType: 'cubes_dice', summary: 'Opposite faces, folded sheets, which cube fits' },
  { slug: 'mirror-water', title: 'Mirror and Water Images', reasoningType: 'mirror_water', summary: 'Words and numbers as a mirror or water shows them' },
  { slug: 'counting-figures', title: 'Counting Figures', reasoningType: 'counting_figures', summary: 'Triangles, squares and circles in a drawing' },
];

export function chapterBySlug(slug: string): OirChapter | undefined {
  return OIR_CHAPTERS.find((c) => c.slug === slug);
}
