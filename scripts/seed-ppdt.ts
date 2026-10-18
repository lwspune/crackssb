/**
 * Load the PPDT pictures into `items` (D33), from content/ppdt/pictures.json.
 *
 *   npm run ppdt:seed              dry run: what would be added or changed
 *   npm run ppdt:seed -- --apply   write it
 *
 * Upsert by id: a picture's title or slide path can be corrected in place.
 * The slide itself is served from public/ppdt/ (npm run ppdtslides makes it).
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { pictureRows } from '../src/ppdt/pictures.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}
const apply = process.argv.includes('--apply');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const rows = pictureRows();
const { data: existing, error } = await service.from('items').select('id, payload, difficulty, active, source, source_ref').eq('assessment_type', 'ppdt');
if (error) throw new Error(error.message);
const have = new Map(existing.map((r) => [r.id, JSON.stringify(r)]));
const added = rows.filter((r) => !have.has(r.id));
const changed = rows.filter((r) => have.has(r.id) && have.get(r.id) !== JSON.stringify({ id: r.id, payload: r.payload, difficulty: r.difficulty, active: r.active, source: r.source, source_ref: r.source_ref }));

console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${rows.length} PPDT pictures · new ${added.length} · changed ${changed.length}`);
// No process.exit: on Windows it can fire while a fetch handle is still closing, and Node asserts.
if (!apply) {
  console.log('Nothing written. Re-run with -- --apply to write.');
} else {
  const { error: upsertError } = await service.from('items').upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'id' });
  if (upsertError) throw new Error(upsertError.message);
  const { count } = await service.from('items').select('*', { count: 'exact', head: true }).eq('assessment_type', 'ppdt').eq('active', true);
  console.log(`Written and read back: ${count} active PPDT pictures.`);
}
