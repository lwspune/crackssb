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
  { slug: 'coding', title: 'Coding-Decoding', reasoningType: 'coding', summary: 'Crack the code from its examples' },
  { slug: 'word-formation', title: 'Word Formation', reasoningType: 'word_formation', summary: 'Words hidden in a longer word' },
  { slug: 'word-order', title: 'Word Order', reasoningType: 'word_order', summary: 'Dictionary order and logical sequence' },
  { slug: 'alphabet', title: 'Alphabet Positions', reasoningType: 'alphabet', summary: 'Letters by place, forwards and reversed' },
  { slug: 'blood-relation', title: 'Blood Relation', reasoningType: 'blood_relation', summary: 'Family trees from a sentence or a code' },
  { slug: 'directions', title: 'Directions', reasoningType: 'directions', summary: 'Walks, turns and where things lie' },
  { slug: 'ranking', title: 'Ranking', reasoningType: 'ranking', summary: 'Places in a row, ranks in a class' },
  { slug: 'seating', title: 'Seating Arrangement', reasoningType: 'seating', summary: 'Rows, tables and who sits where' },
  { slug: 'series', title: 'Series', reasoningType: 'series', summary: 'Number and letter series' },
];

export function chapterBySlug(slug: string): OirChapter | undefined {
  return OIR_CHAPTERS.find((c) => c.slug === slug);
}
