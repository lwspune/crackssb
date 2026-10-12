import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The build checks app code only. `npm run typecheck` checks everything,
  // tests included — four pre-existing test-file errors are logged in SUGGESTIONS.md.
  typescript: { tsconfigPath: 'tsconfig.build.json' },
};

export default nextConfig;
