/**
 * Paper mode (D22): the app keeps the stimulus and the clock; the candidate
 * writes on a sheet and uploads photos of it. Pure helpers.
 */

/** No 0/O, 1/I/L, 5/S, 8/B, 2/Z — the pairs a hurried hand and a phone photo blur together. */
/**
 * Whether a test offers typing at all (D38). The owner's call: candidates
 * write by hand and photograph the sheet, as at the SSB. The typed path stays
 * built and tested; this one switch hides it on every brief.
 */
export const OFFER_TYPED = false;

export const CODE_ALPHABET ='ACDEFGHJKMNPQRTUVWXY34679';

const CODE = new RegExp(`^[${CODE_ALPHABET}]{3}-[${CODE_ALPHABET}]{3}$`);

/** The code written at the top of the sheet, linking its scan to this session. `random` is injected for tests. */
export function sessionCode(random: () => number): string {
  const pick = () => CODE_ALPHABET[Math.min(CODE_ALPHABET.length - 1, Math.floor(random() * CODE_ALPHABET.length))];
  const half = () => Array.from({ length: 3 }, pick).join('');
  return `${half()}-${half()}`;
}

export function isSessionCode(value: string): boolean {
  return CODE.test(value);
}

/** Line numbers 1…total, in pages of `perPage`, for the printable sheet. */
export function sheetPages(total: number, perPage: number): number[][] {
  const pages: number[][] = [];
  for (let start = 1; start <= total; start += perPage) {
    pages.push(Array.from({ length: Math.min(perPage, total - start + 1) }, (_, i) => start + i));
  }
  return pages;
}
