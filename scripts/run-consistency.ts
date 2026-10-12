/**
 * Runs Layer 4 over the real corpus.
 *
 *   npm run consistency
 *
 * Builds a candidate profile from each record's marks and self-descriptions,
 * then reports cross-instrument contradictions and corroborations.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findInconsistencies,
  type CandidateProfile,
  type InstrumentFindings,
} from '../src/scoring/consistency/engine.ts';
import { SIGNAL_LABELS } from '../src/scoring/consistency/signals.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recordsDir = join(root, 'corpus', 'records');

type Mark = { type?: string; raw?: string };

const collect = (node: unknown, out: Mark[] = []): Mark[] => {
  if (Array.isArray(node)) node.forEach((n) => collect(n, out));
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.type === 'string' && typeof o.raw === 'string') out.push(o as Mark);
    Object.values(o).forEach((v) => collect(v, out));
  }
  return out;
};

function profileFrom(file: string): CandidateProfile {
  const d = JSON.parse(readFileSync(join(recordsDir, file), 'utf8'));
  const instruments: InstrumentFindings[] = [];

  for (const key of ['tat', 'wat', 'srt', 'sdt'] as const) {
    const inst = d.instruments?.[key];
    if (!inst) continue;
    const marks = collect(inst);
    const selfClaims =
      key === 'sdt'
        ? (inst.items ?? [])
            .map((i: { response_text?: string }) => i.response_text)
            .filter((t: string | undefined): t is string => Boolean(t))
        : undefined;

    instruments.push({
      instrument: key,
      selfClaims,
      traits: marks.filter((m) => m.type === 'trait').map((m) => m.raw!),
      olqCodes: marks
        .filter((m) => m.type === 'olq_code' || m.type === 'verdict')
        .map((m) => m.raw!),
    });
  }

  // Global marks belong to the whole dossier; attribute them to TAT, which is
  // where the assessor writes them.
  const globals = (d.global_marks ?? []) as Mark[];
  const tat = instruments.find((i) => i.instrument === 'tat');
  if (tat && globals.length) {
    instruments[instruments.indexOf(tat)] = {
      ...tat,
      traits: [...(tat.traits ?? []), ...globals.filter((m) => m.type === 'trait').map((m) => m.raw!)],
      olqCodes: [...(tat.olqCodes ?? []), ...globals.filter((m) => m.type === 'olq_code').map((m) => m.raw!)],
    };
  }

  return { candidateId: d.candidate?.name ?? file, instruments };
}

const files = readdirSync(recordsDir).filter((f) => f.endsWith('.json')).sort();
let totalC = 0;
let totalK = 0;
let withClaims = 0;

console.log(`\nLayer 4 — cross-instrument consistency, ${files.length} candidates\n`);

for (const file of files) {
  const p = profileFrom(file);
  const hasClaims = p.instruments.some((i) => (i.selfClaims?.length ?? 0) > 0);
  if (hasClaims) withClaims += 1;

  const findings = findInconsistencies(p);
  if (findings.length === 0) {
    console.log(`${p.candidateId}\n  ${hasClaims ? 'no cross-instrument findings' : 'no SDT text transcribed — cannot compare'}\n`);
    continue;
  }

  console.log(`${p.candidateId}`);
  for (const f of findings) {
    const tag = f.kind === 'contradiction' ? 'CONTRADICTION' : 'corroboration';
    if (f.kind === 'contradiction') totalC += 1;
    else totalK += 1;
    console.log(`  [${tag}] ${SIGNAL_LABELS[f.signal]}  (${f.confidence} confidence)`);
    console.log(`     claims:   "${f.claim.text.slice(0, 96)}${f.claim.text.length > 96 ? '…' : ''}"`);
    for (const e of f.evidence.slice(0, 4)) {
      console.log(`     ${e.instrument.toUpperCase().padEnd(4)} marks: "${e.text}"`);
    }
    console.log(`     -> ${f.explanation}`);
  }
  console.log('');
}

console.log('='.repeat(66));
console.log(`  ${withClaims} of ${files.length} candidates have SDT text to compare against`);
console.log(`  ${totalC} contradictions, ${totalK} corroborations`);
console.log('='.repeat(66) + '\n');
