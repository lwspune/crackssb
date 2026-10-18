/**
 * Load content/oir-mocks.json into `tests` and `test_items` (D32).
 *
 *   npm run tests:seed              dry run: what would be added
 *   npm run tests:seed -- --apply   write it
 *
 * Insert-only. A mock already in the database must match the file exactly;
 * if it does not, nothing is written and the difference is printed — a mock
 * is fixed once published (and the database refuses to change one anyone has
 * sat, 0009). Run `npm run items:seed` first: every question must be there.
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { Mock } from '../src/oir/mocks.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}
const apply = process.argv.includes('--apply');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { mocks } = JSON.parse(readFileSync('content/oir-mocks.json', 'utf8')) as { mocks: Mock[] };

const { data: tests, error } = await service.from('tests').select('id, title, item_count, time_limit_seconds').like('id', 'oir-mock-%');
if (error) throw new Error(`tests: ${error.message}`);
const { data: rows, error: rowsError } = await service.from('test_items').select('test_id, ordinal, item_id').like('test_id', 'oir-mock-%').order('ordinal').range(0, 9999);
if (rowsError) throw new Error(`test_items: ${rowsError.message}`);

const inDb = new Map(tests.map((t) => [t.id, t]));
const itemsInDb = new Map<string, string[]>();
for (const r of rows) itemsInDb.set(r.test_id, [...(itemsInDb.get(r.test_id) ?? []), r.item_id]);

const differs: string[] = [];
for (const m of mocks) {
  const t = inDb.get(m.id);
  if (!t) continue;
  if (t.item_count !== m.itemIds.length || t.time_limit_seconds !== m.timeLimitSeconds) differs.push(`${m.id}: length or time limit`);
  if ((itemsInDb.get(m.id) ?? []).join() !== m.itemIds.join()) differs.push(`${m.id}: questions or their order`);
}
const added = mocks.filter((m) => !inDb.has(m.id));

console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${mocks.length} mocks in content/oir-mocks.json`);
console.log(`  new        ${added.length}${added.length ? `  (${added[0].id} … ${added[added.length - 1].id})` : ''}`);
console.log(`  unchanged  ${mocks.length - added.length - differs.length}`);
if (differs.length) {
  console.error(`  DIFFERENT from the database — a published mock never changes; add a new one instead:\n    ${differs.join('\n    ')}`);
  process.exit(1);
}
if (!apply) {
  console.log('Nothing written. Re-run with -- --apply to write.');
  process.exit(0);
}

for (const m of added) {
  const { error: e1 } = await service.from('tests').insert({ id: m.id, assessment_type: 'oir', title: m.title, item_count: m.itemIds.length, time_limit_seconds: m.timeLimitSeconds });
  if (e1) throw new Error(`${m.id}: ${e1.message}`);
  const { error: e2 } = await service.from('test_items').insert(m.itemIds.map((item_id, ordinal) => ({ test_id: m.id, ordinal, item_id })));
  if (e2) throw new Error(`${m.id} questions: ${e2.message}`);
}

const { count } = await service.from('test_items').select('*', { count: 'exact', head: true }).like('test_id', 'oir-mock-%');
const expected = mocks.reduce((n, m) => n + m.itemIds.length, 0);
if (count !== expected) {
  console.error(`Written, but ${count} questions read back, expected ${expected}.`);
  process.exit(1);
}
console.log(`Written and read back: ${mocks.length} mocks, ${expected} questions.`);
