/**
 * The D5 bake-off runner.
 *
 *   npm run eval                      # baselines only, no API key needed
 *   npm run eval -- --model claude-opus-5
 *   npm run eval -- --model claude-opus-5 --effort medium --limit 20
 *
 * Runs a judge over the paired eval set and reports agreement with the human
 * assessor. Per D5 this measurement — not reputation, not cost — is what
 * selects the provider.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJudge } from '../src/scoring/judge/adapter.ts';
import { constantProvider, randomProvider } from '../src/scoring/judge/providers/baseline.ts';
import { scoreAgreement, type AgreementRow } from '../src/scoring/eval/agreement.ts';
import { GRADES, type Grade } from '../src/scoring/judge/contract.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const evalSetPath = join(root, 'corpus', 'eval-set.json');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

if (!existsSync(evalSetPath)) {
  console.error(`No eval set at ${evalSetPath}. Run: npm run evalset`);
  process.exit(1);
}

const evalSet = JSON.parse(readFileSync(evalSetPath, 'utf8'));
const limit = Number(arg('limit') ?? 0);
const pairs = limit > 0 ? evalSet.pairs.slice(0, limit) : evalSet.pairs;
const modelName = arg('model');

console.log(`\nEval set: ${pairs.length} paired TAT stories`);
console.log(`Source:   ${evalSet.source}\n`);

const usage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };

async function run(label: string, provider: Parameters<typeof createJudge>[0]) {
  const judge = createJudge(provider);
  const rows: AgreementRow[] = [];
  let failures = 0;

  for (const p of pairs) {
    try {
      const verdict = await judge({
        instrument: 'tat',
        responseText: p.responseText,
        slide: p.slide,
      });
      rows.push({
        id: p.id,
        slide: p.slide,
        expected: { grade: p.expected.grade },
        actual: { grade: verdict.quality.grade },
      });
    } catch (err) {
      failures += 1;
      rows.push({
        id: p.id,
        slide: p.slide,
        expected: { grade: p.expected.grade },
        actual: { grade: null },
      });
      if (failures <= 3) console.error(`  ! ${p.id}: ${(err as Error).message}`);
    }
  }

  const report = scoreAgreement(rows);
  const pct = (n: number) => `${(100 * n).toFixed(1)}%`;

  console.log(`\n${'='.repeat(64)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(64));
  console.log(`  exact agreement      ${pct(report.exact.rate)}  (${report.exact.hits}/${report.exact.n})`);
  console.log(`  within one grade     ${pct(report.adjacent.rate)}`);
  console.log(`  majority baseline    ${pct(report.baseline.rate)}  (always "${report.baseline.grade}")`);
  console.log(`  beats baseline       ${report.beatsBaseline ? 'YES' : 'NO'}`);
  console.log(`  mean signed error    ${report.meanSignedError >= 0 ? '+' : ''}${report.meanSignedError.toFixed(2)}  ${
    report.meanSignedError > 0.15 ? '(lenient)' : report.meanSignedError < -0.15 ? '(harsh)' : ''
  }`);
  if (report.collapsed) console.log('  ** COLLAPSED — judge returned a single grade for everything');
  if (failures) console.log(`  failures             ${failures}`);
  console.log(`  judge distribution   ${JSON.stringify(report.actualDistribution)}`);

  const slides = Object.entries(report.bySlide).sort((a, b) => Number(a[0]) - Number(b[0]));
  console.log('\n  per slide:');
  for (const [slide, s] of slides) {
    const bar = '#'.repeat(Math.round(s.exact * 20)).padEnd(20, '.');
    console.log(`    ${String(slide).padStart(2)}  ${bar} ${pct(s.exact)}  (n=${s.n})`);
  }
  return { label, report, rows };
}

const results = [];

// Baselines always run: they cost nothing and they are what a model must beat.
results.push(await run('BASELINE — always "LOW"', constantProvider('LOW')));
results.push(await run('BASELINE — random grade', randomProvider(GRADES as readonly Grade[])));

const verdictsPath = arg('verdicts');
if (verdictsPath) {
  const { verdictsFileProvider } = await import('../src/scoring/judge/providers/verdictsFile.ts');
  results.push(
    await run(
      `RECORDED VERDICTS — ${verdictsPath}`,
      verdictsFileProvider(verdictsPath, join(root, 'corpus', 'blind-set.json')),
    ),
  );
} else if (modelName) {
  const { anthropicProvider } = await import('../src/scoring/judge/providers/anthropic.ts');
  const effort = arg('effort') as 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined;
  results.push(
    await run(
      `MODEL — ${modelName}${effort ? ` (effort: ${effort})` : ''}`,
      anthropicProvider({
        instrument: 'tat',
        model: modelName,
        effort,
        onUsage: (u) => {
          usage.input += u.inputTokens;
          usage.output += u.outputTokens;
          usage.cacheRead += u.cacheReadTokens;
          usage.cacheCreation += u.cacheCreationTokens;
        },
      }),
    ),
  );
  console.log(
    `\n  tokens: ${usage.input} in / ${usage.output} out / ` +
      `${usage.cacheRead} cache-read / ${usage.cacheCreation} cache-write`,
  );
  if (usage.cacheRead === 0 && pairs.length > 1) {
    console.log('  ** cache_read is zero across repeated calls — the rubric prefix is being invalidated');
  }
} else {
  console.log('\nNo --model given, so only the baselines ran.');
  console.log('To run the bake-off:  npm run eval -- --model claude-opus-5');
  console.log('Needs ANTHROPIC_API_KEY, or an `ant auth login` profile.\n');
}

const outDir = join(root, 'corpus', 'eval-runs');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(
  outFile,
  JSON.stringify({ generated: new Date().toISOString(), n: pairs.length, usage, results }, null, 2),
);
console.log(`\nwrote ${outFile}\n`);
