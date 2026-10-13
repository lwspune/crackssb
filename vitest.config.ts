import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // tsconfig says `jsx: react-jsx` for Next; esbuild needs telling directly.
  esbuild: { jsx: 'automatic' },
  // Database tests write to the live project; they run only under `npm run test:db` (vitest.db.config.ts).
  // Agents' git worktrees live under .claude/worktrees: their copies of the tests are theirs to run.
  test: { exclude: ['**/node_modules/**', '.next/**', '**/*.db.test.ts', '.claude/**'] },
});
