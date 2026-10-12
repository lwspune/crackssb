/**
 * Create a login (manual logins, Sprint 1).
 *
 *   npm run user:create -- --email cadet@example.com --name "Cadet One" --dob 2007-03-14 [--org lws-pune] [--guardian-consent]
 *   npm run user:create -- --email mentor@lws.in --name "A Mentor" --role mentor --org lws-pune
 *
 * Prints the password once, here. Pass it to the person by a private channel;
 * it is not stored anywhere else. Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createUser, isMinor, parseNewUser } from '../src/db/admin/users.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}

const parsed = parseNewUser(process.argv.slice(2));
if (!parsed.ok) {
  console.error(parsed.error);
  process.exit(2);
}
const user = parsed.value;

const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { id, password } = await createUser(service, user);
  console.log(`Created ${user.role} ${user.email}${user.org ? ` (${user.org})` : ''}`);
  console.log(`  id        ${id}`);
  console.log(`  password  ${password}`);
  if (user.role === 'candidate' && user.dob && isMinor(user.dob) && !user.guardianConsent) {
    console.log('  NOTE      Under 18 with no guardian consent recorded: tests will not start until it is.');
  }
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
