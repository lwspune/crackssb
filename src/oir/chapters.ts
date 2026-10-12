/**
 * The OIR chapters a candidate practises by (D26). A chapter is a reasoning
 * type, not a page range of one book: a second source's series questions land
 * in the same chapter. Order is the order the practice page lists them in.
 *
 * Every reasoning type in the seeded bank must appear here (practice.test.ts),
 * so seeding a new chapter without listing it fails a test.
 */
export interface OirChapter {
  readonly slug: string;
  readonly title: string;
  /** `OirPayload.reasoningType` — what joins a chapter to its items. */
  readonly reasoningType: string;
  readonly summary: string;
}

export const OIR_CHAPTERS: readonly OirChapter[] = [
  { slug: 'series', title: 'Series', reasoningType: 'series', summary: 'Number and letter series' },
];

export function chapterBySlug(slug: string): OirChapter | undefined {
  return OIR_CHAPTERS.find((c) => c.slug === slug);
}
