/**
 * Load the SRT situations and sets (D39) from content/srt/: the situations
 * into `items`, each set into `tests` + `test_items`.
 *
 *   npm run srt:seed              dry run: what would be added or changed
 *   npm run srt:seed -- --apply   write it
 *
 * Situations upsert by id: a wording can be corrected in place until a set holding it is sat.
 * Sets are insert-only. A set already in the database must match the file
 * exactly; if it does not, nothing is written and the difference is printed —
 * a set is fixed once published (and the database refuses to change one
 * anyone has sat, 0009, 0018). Seed only once the deploy carrying 0018's
 * screens is live.
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { itemRows, testRows } from '../src/srt/situations.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}
const apply = process.argv.includes('--apply');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const items = itemRows();
const { tests, items: setItems } = testRows();

const { data: haveItems, error: e1 } = await service.from('items').select('id, payload').eq('assessment_type', 'srt');
if (e1) throw new Error(`items: ${e1.message}`);
const { data: haveTests, error: e2 } = await service.from('tests').select('id, title, item_count, time_limit_seconds').eq('assessment_type', 'srt');
if (e2) throw new Error(`tests: ${e2.message}`);
const { data: haveSetItems, error: e3 } = await service.from('test_items').select('test_id, ordinal, item_id').like('test_id', 'srt-set-%').order('ordinal').range(0, 9999);
if (e3) throw new Error(`test_items: ${e3.message}`);

// Compared value by value: the database stores a payload's keys in its own order.
const payloadOf = new Map(haveItems.map((r) => [r.id, r.payload as { text: string }]));
const newItems = items.filter((r) => !payloadOf.has(r.id));
const changedItems = items.filter((r) => {
  const p = payloadOf.get(r.id);
  return p && p.text !== r.payload.text;
});

const testInDb = new Map(haveTests.map((t) => [t.id, t]));
const orderInDb = new Map<string, string[]>();
for (const r of haveSetItems) orderInDb.set(r.test_id, [...(orderInDb.get(r.test_id) ?? []), r.item_id]);
const differs: string[] = [];
for (const t of tests) {
  const have = testInDb.get(t.id);
  if (!have) continue;
  if (have.title !== t.title || have.item_count !== t.item_count || have.time_limit_seconds !== t.time_limit_seconds) differs.push(`${t.id}: title, length or time`);
  const want = setItems.filter((i) => i.test_id === t.id).map((i) => i.item_id);
  if ((orderInDb.get(t.id) ?? []).join() !== want.join()) differs.push(`${t.id}: pictures or their order`);
}
const newTests = tests.filter((t) => !testInDb.has(t.id));

console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${items.length} SRT situations · new ${newItems.length} · changed ${changedItems.length}`);
console.log(`  ${tests.length} sets · new ${newTests.length} · unchanged ${tests.length - newTests.length - differs.length}`);
if (differs.length) {
  console.error(`  DIFFERENT from the database — a published set never changes; add a new one instead:\n    ${differs.join('\n    ')}`);
  process.exit(1);
}
// No process.exit on success: on Windows it can fire while a fetch handle is still closing, and Node asserts.
if (!apply) {
  console.log('Nothing written. Re-run with -- --apply to write.');
} else {
  const { error: up } = await service.from('items').upsert(items.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'id' });
  if (up) throw new Error(`items: ${up.message}`);
  for (const t of newTests) {
    const { error: a } = await service.from('tests').insert(t);
    if (a) throw new Error(`${t.id}: ${a.message}`);
    const { error: b } = await service.from('test_items').insert(setItems.filter((i) => i.test_id === t.id));
    if (b) throw new Error(`${t.id} situations: ${b.message}`);
  }
  const { count } = await service.from('test_items').select('*', { count: 'exact', head: true }).like('test_id', 'srt-set-%');
  if (count !== setItems.length) throw new Error(`Written, but ${count} set situations read back, expected ${setItems.length}.`);
  console.log(`Written and read back: ${items.length} situations, ${tests.length} sets of ${setItems.length / tests.length}.`);
}
