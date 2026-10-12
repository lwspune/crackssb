import { validateItem } from '../bank.ts';
import { splitKey } from './check.ts';
import type { ItemRow, KeyBasis, KeyRow } from './check.ts';

/** The shape of content/oir-items.json, as far as seeding reads it. */
export interface OirBankFile {
  readonly items: readonly (Record<string, unknown> & {
    id: string;
    source_ref: string;
    key_basis: string;
    rule: string;
  })[];
}

/**
 * content/oir-items.json → the rows `items` and `item_keys` hold. Every item is
 * validated again here, so a hand-edited file cannot reach the database
 * malformed. Bookkeeping in the file (confidence, note, printedStem) stays in
 * the file.
 */
export function bankToRows(bank: OirBankFile): { items: ItemRow[]; keys: KeyRow[] } {
  const items: ItemRow[] = [];
  const keys: KeyRow[] = [];
  for (const raw of bank.items) {
    const { itemRow, keyRow } = splitKey(validateItem(raw), {
      sourceRef: raw.source_ref,
      keyBasis: raw.key_basis as KeyBasis,
      rule: raw.rule,
    });
    items.push(itemRow);
    keys.push(keyRow);
  }
  return { items, keys };
}
