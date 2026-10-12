import { existsSync } from 'node:fs';

// Node's own loader; no dotenv. CI will pass the same names as real env vars.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
