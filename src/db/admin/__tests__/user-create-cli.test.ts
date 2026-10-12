import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

/**
 * Runs `scripts/user-create.ts` the way `npm run user:create` does: plain Node
 * stripping types. Vitest compiles TypeScript with esbuild, which accepts
 * syntax Node's strip-only mode rejects (a parameter property, an enum), so a
 * module the CLI imports can pass every unit test and still break the CLI.
 * That happened once (2026-10-12); this keeps it from happening again.
 * Bad input exits before any network call, so this never touches the database.
 */
describe('npm run user:create', () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/user-create.ts', ...args], { encoding: 'utf8', timeout: 30_000 });

  it('loads under Node’s type stripping and refuses bad input with a usage error', () => {
    const r = run('--name', 'No Email');
    expect(r.stderr).not.toMatch(/ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError/);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/valid --email/);
  });
});
