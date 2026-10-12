/**
 * Load content/oir-items.json into `items` and `item_keys`.
 *
 *   npm run items:seed              dry run: what would be added or changed
 *   npm run items:seed -- --apply   write it
 *
 * Upserts by item id, so a re-run adds nothing and a corrected key or stem
 * replaces the old one in place (an id, once seeded, never changes). Items
 * dropped from the file are reported, never deleted: retire one by setting
 * `active: false`. Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { bankToRows } from '../src/items/oir/seed.ts';
import type { OirBankFile } from '../src/items/oir/seed.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}
const apply = process.argv.includes('--apply');

const bank = JSON.parse(readFileSync('content/oir-items.json', 'utf8')) as OirBankFile;
const { items, keys } = bankToRows(bank);
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Every row, paged: PostgREST stops at 1000 without saying so. */
async function readAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service.from(table).select(columns).order(table === 'items' ? 'id' : 'item_id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data as T[]));
    if (data.length < 1000) return out;
  }
}

const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));

const existingItems = new Map((await readAll<Record<string, unknown>>('items', 'id, assessment_type, difficulty, payload, asset_path, active, source, source_ref')).map((r) => [r.id as string, r]));
const existingKeys = new Map((await readAll<Record<string, unknown>>('item_keys', 'item_id, key, key_basis, rule')).map((r) => [r.item_id as string, r]));

const added = items.filter((r) => !existingItems.has(r.id));
const changed = items.filter((r) => existingItems.has(r.id) && stable(existingItems.get(r.id)) !== stable(r));
const keyChanged = keys.filter((k) => existingKeys.has(k.item_id) && stable(existingKeys.get(k.item_id)) !== stable(k));
const inFile = new Set(items.map((r) => r.id));
const onlyInDb = [...existingItems.keys()].filter((id) => !inFile.has(id) && !id.startsWith('test-'));

console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${items.length} items in content/oir-items.json`);
console.log(`  new          ${added.length}`);
console.log(`  changed      ${changed.length}${changed.length ? `  (${changed.slice(0, 10).map((r) => r.id).join(', ')}${changed.length > 10 ? ', ...' : ''})` : ''}`);
console.log(`  key changed  ${keyChanged.length}${keyChanged.length ? `  (${keyChanged.map((k) => `${k.item_id} ${existingKeys.get(k.item_id)!.key}->${k.key}`).join(', ')})` : ''}`);
console.log(`  unchanged    ${items.length - added.length - changed.length}`);
if (onlyInDb.length) console.log(`  in the database but not the file (left alone): ${onlyInDb.join(', ')}`);

if (!apply) {
  console.log('Nothing written. Re-run with -- --apply to write.');
  process.exit(0);
}

const now = new Date().toISOString();
for (let i = 0; i < items.length; i += 200) {
  const chunk = items.slice(i, i + 200).map((r) => ({ ...r, updated_at: now }));
  const { error } = await service.from('items').upsert(chunk, { onConflict: 'id' });
  if (error) throw new Error(`items upsert: ${error.message}`);
}
for (let i = 0; i < keys.length; i += 200) {
  const chunk = keys.slice(i, i + 200).map((k) => ({ ...k, updated_at: now }));
  const { error } = await service.from('item_keys').upsert(chunk, { onConflict: 'item_id' });
  if (error) throw new Error(`item_keys upsert: ${error.message}`);
}

// Read back: every item in the file is present with its key.
const afterItems = new Set((await readAll<{ id: string }>('items', 'id')).map((r) => r.id));
const afterKeys = new Set((await readAll<{ item_id: string }>('item_keys', 'item_id')).map((r) => r.item_id));
const missing = items.filter((r) => !afterItems.has(r.id) || !afterKeys.has(r.id)).map((r) => r.id);
if (missing.length) {
  console.error(`Written, but not read back: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Written and read back: ${items.length} items, each with its key.`);
