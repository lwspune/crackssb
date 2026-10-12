import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // tsconfig says `jsx: react-jsx` for Next; esbuild needs telling directly.
  esbuild: { jsx: 'automatic' },
  test: { exclude: ['**/node_modules/**', '.next/**'] },
});
