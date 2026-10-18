/**
 * content/oir-items.json -> content/oir-mocks.json (D32).
 *
 *   npm run oirmocks              keep every mock already in the file, add new ones up to MOCKS
 *
 * Append-only: a mock in the file is never rebuilt, so "Mock 3" stays Mock 3.
 * To add mocks later, raise MOCKS and re-run; the new ones use only questions
 * no mock has yet. `npm run tests:seed` then loads them.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { checkMocks, extendMocks } from '../src/oir/mocks.ts';
import type { BankItem, Mock } from '../src/oir/mocks.ts';

const MOCKS = 20;
const SEED = 32;
const OUT = 'content/oir-mocks.json';

const bank = (JSON.parse(readFileSync('content/oir-items.json', 'utf8')) as { items: BankItem[] }).items;
const existing: Mock[] = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as { mocks: Mock[] }).mocks : [];

const mocks = extendMocks(bank, existing, Math.max(MOCKS, existing.length), SEED);
const problems = checkMocks(bank, mocks);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

writeFileSync(
  OUT,
  `${JSON.stringify({ note: 'Append-only. Built by npm run oirmocks from content/oir-items.json (D32).', mocks }, null, 1)}\n`,
);

const typeOf = new Map(bank.map((b) => [b.id, b.payload.reasoningType]));
const types = new Set(bank.map((b) => b.payload.reasoningType));
console.log(`${OUT}: ${mocks.length} mocks (${mocks.length - existing.length} new), ${mocks.reduce((n, m) => n + m.itemIds.length, 0)} questions`);
for (const m of mocks.slice(existing.length)) {
  const covered = new Set(m.itemIds.map((id) => typeOf.get(id)));
  const missing = [...types].filter((t) => !covered.has(t));
  console.log(`  ${m.id}  ${covered.size} types${missing.length ? `  (no ${missing.join(', ')})` : ''}`);
}
