import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Database tests: `npm run test:db`. Separate from `npm test` because they
 * write fixtures into the live Supabase project (the user's choice — see
 * CLAUDE.md § Supabase). Every fixture is tagged with the run id and removed
 * in afterAll; the suite then fails if anything tagged is left behind.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.db.test.ts'],
    setupFiles: ['./src/db/__tests__/helpers/env.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // One file at a time: fixtures share a project, and auth sign-ins are rate limited per IP.
    fileParallelism: false,
  },
});
