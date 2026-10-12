/**
 * Renders the two Word deliverables for every candidate in corpus/report-findings.json (gitignored).
 *
 *   node scripts/build-reports.mjs            # all candidates
 *   node scripts/build-reports.mjs cand-11  # one
 *
 * GROUNDING CONSTRAINT (DECISIONS.md D16) — the findings this renders may use
 * only the candidate's own responses, the known stimulus, the rubric, and
 * Layer 1/2 output. Never the human assessor's marks. Never a comparison with
 * another candidate. The renderer enforces the second of those below.
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, convertInchesToTwip,
} from 'docx';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFindings, assertGrounded } from '../src/scoring/report/findings.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'corpus', 'reports');
mkdirSync(outDir, { recursive: true });
const RAW = JSON.parse(readFileSync(join(root, 'corpus', 'report-findings.json'), 'utf8'));
// Validated at the boundary — shape and D16 — before anything is rendered.
const DATA = { ...RAW, candidates: Object.fromEntries(Object.entries(RAW.candidates).map(([k, v]) => [k, parseFindings(v)])) };

const INK = '1E2761', MUTED = '5A6472', RULE = 'C9D2DC';
const PAGE = { size: { width: 12240, height: 15840 }, margin: {
  top: convertInchesToTwip(0.9), bottom: convertInchesToTwip(0.9),
  left: convertInchesToTwip(0.95), right: convertInchesToTwip(0.95) } };
const numbering = { config: [{ reference: 'bullets', levels: [{
  level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } } }] }] };
const styles = {
  default: { document: { run: { font: 'Calibri', size: 21 }, paragraph: { spacing: { after: 120, line: 276 } } } },
  paragraphStyles: [
    { id: 'Title', name: 'Title', basedOn: 'Normal', quickFormat: true,
      run: { font: 'Cambria', size: 32, bold: true, color: INK },
      paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 60 } } },
    { id: 'Sub', name: 'Sub', basedOn: 'Normal', run: { font: 'Calibri', size: 19, color: MUTED },
      paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 320 } } },
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Cambria', size: 26, bold: true, color: INK },
      paragraph: { spacing: { before: 320, after: 140 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Calibri', size: 22, bold: true, color: INK },
      paragraph: { spacing: { before: 240, after: 100 } } },
    { id: 'Note', name: 'Note', basedOn: 'Normal', run: { font: 'Calibri', size: 18, color: MUTED, italics: true },
      paragraph: { spacing: { before: 60, after: 120 } } },
    { id: 'Quote', name: 'Quote', basedOn: 'Normal',
      run: { font: 'Cambria', size: 21, italics: true, color: '33415C' },
      paragraph: { indent: { left: convertInchesToTwip(0.35) }, spacing: { before: 120, after: 140 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: RULE, space: 10 } } } },
  ],
};

const runs = (t, b = {}) => t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) =>
  p.startsWith('**') ? new TextRun({ ...b, text: p.slice(2, -2), bold: true }) : new TextRun({ ...b, text: p }));
const P = (t) => new Paragraph({ children: runs(t) });
const Bullet = (t) => new Paragraph({ children: runs(t), numbering: { reference: 'bullets', level: 0 } });
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const Quote = (t) => new Paragraph({ children: runs(t), style: 'Quote' });
const Note = (t) => new Paragraph({ children: runs(t), style: 'Note' });

function table(headers, rows, widths) {
  const cell = (text, { head = false, w } = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: 'EDF1F7' } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({ children: runs(text, head ? { bold: true, color: INK } : {}), spacing: { after: 0 } })],
  });
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { head: true, w: widths[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i] })) })),
    ],
  });
}

const count = (c) => (c ? `${c[0]} of ${c[1]}` : null);
const list = (a) => a.length === 1 ? String(a[0]) : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

/**
 * D16 guard over the RENDERED document. The findings were already checked on
 * parse; this catches prose the renderer itself adds. One regex, owned by
 * src/scoring/report/findings.ts.
 */
function guard(children, who) {
  assertGrounded(JSON.stringify(children), who);
}

/* --------------------------------------------------------------- assessment */

function assessment(f) {
  const themes = f.themeIssues.length;
  const unfinished = f.incomplete.length;
  const blank = f.blank.length;
  const body = [];

  body.push(H2('TAT — Thematic Apperception Test'));
  body.push(P(`${count(f.counts.tat)} stories attempted. ${f.strengths.length} stories present a named character who meets a problem and resolves it through their own action, with specific supporting detail.`));

  const faults = [];
  if (themes) faults.push(`**${themes} stories rest on themes that score poorly** in SSB assessment`);
  if (unfinished) faults.push(`**${unfinished} stop before resolving** (stories ${list(f.incomplete)})`);
  if (blank) faults.push(`**${blank} left blank** (${list(f.blank)})`);
  if (faults.length) body.push(P(faults.join('; ') + '.'));

  if (f.perception) {
    body.push(P(`One story does not match its picture: the candidate wrote about ${f.perception.wrote}, where the slide shows ${f.perception.shows}. Perception is assessed before content, so the quality of the reasoning does not recover it.`));
  }
  body.push(P(f.craft[0]));

  if (f.counts.wat || f.watNote) {
    body.push(H2('WAT — Word Association Test'));
    body.push(P(f.counts.wat
      ? `${count(f.counts.wat)} attempted. ${f.watNote ?? 'Sentence construction is adequate.'}`
      : f.watNote));
  }

  body.push(H2('SRT — Situation Reaction Test'));
  body.push(P(f.counts.srt
    ? `**${count(f.counts.srt)} situations attempted** against an expected standard of 45+. ${f.srtNote ?? ''}`
    : (f.srtNote ?? 'Not assessed — item-level data not available.')));

  body.push(H2('Self-Description'));
  body.push(P(f.counts.sdt
    ? `${count(f.counts.sdt)} opinions written.`
    : 'Not assessed — item-level data not available.'));

  body.push(H2('Summary'));
  body.push(P(f.oneLine));
  body.push(P('Priorities, in order: ' + f.priorities.map((p) => p.replace(/\*\*/g, '')).join(' ')));

  body.push(H1('How this assessment was produced'));
  const derivations = [
    ['Story-level theme assessment', 'The candidate’s own story texts, assessed against the theme standard'],
    ['Unfinished stories', 'Stories ending mid-narrative without resolution'],
    ['Attempt counts', 'Count of non-blank responses against the expected standard'],
  ];
  if (f.perception) derivations.push(['Picture mismatch', 'The story’s content compared against the known content of that slide']);
  derivations.push(['Language findings', 'Lexical scan of the response text']);
  body.push(table(['Finding', 'Derived from'], derivations, [3400, 6000]));
  body.push(Note('No selection band or recommendation is stated. This describes performance on the psychology tests only.'));
  return body;
}

/* ----------------------------------------------------------------- feedback */

function feedback(f) {
  const body = [];
  body.push(H1('In one minute'));
  body.push(P(f.oneLine));

  const rows = [];
  if (f.counts.srt) rows.push(['Biggest single gap', `You attempted **${count(f.counts.srt)}** SRT situations`]);
  if (f.themeIssues.length) rows.push(['Biggest quick win', `${f.themeIssues.length} of your stories chose themes that score poorly`]);
  rows.push(['Already strong', f.strengths.map((s) => `story ${s.story}`).join(', ')]);
  body.push(table(['', ''], rows, [2700, 6700]));

  body.push(H1('TAT — Thematic Apperception Test'));
  body.push(H2('What went well'));
  f.strengths.forEach((s, i) => {
    body.push(P(`**${i + 1}. Story ${s.story}.**`));
    body.push(Quote(s.quote));
    body.push(P(s.why));
  });

  body.push(H2('What to work on'));
  if (f.themeIssues.length) {
    body.push(P(`**${f.themeIssues.length} of your stories chose a theme that scores poorly.** This is pure choice — nothing to do with how well you write.`));
    body.push(table(['Story', 'What happens', 'Why it scores poorly'],
      f.themeIssues.map((t) => [String(t.story), t.what, t.why]), [800, 4300, 4300]));
    body.push(P('**Use a checklist before you start writing.** Your story needs:'));
    body.push(Bullet('A named hero, with an age and an occupation.'));
    body.push(Bullet('A clear problem.'));
    body.push(Bullet('An action the hero personally takes — not the police, not a passer-by, not luck.'));
    body.push(Bullet('An ending where the problem is actually resolved.'));
    body.push(P('Then check it is not about alcohol, giving someone a lift, a character’s looks, romantic trouble, illness as the whole plot, or being unsure of yourself. Those themes score poorly regardless of how well the story is written.'));
  }

  if (f.perception) {
    body.push(P('**One story answers the wrong picture.**'));
    body.push(P(`You wrote about ${f.perception.wrote}. That picture shows ${f.perception.shows}. **However well the story is built, perception is assessed first.** Spend the first twenty seconds naming what is literally in front of you — how many people, their ages, what they are holding, where they are — before deciding what the story is.`));
  }

  body.push(P('**Smaller things, easily fixed.**'));
  f.craft.forEach((c) => body.push(Bullet(c)));

  if (f.counts.srt || f.srtNote) {
    body.push(H1('SRT — Situation Reaction Test'));
    if (f.counts.srt) {
      body.push(Quote(`You attempted ${count(f.counts.srt)}.`));
      body.push(P('An unwritten response scores nothing, whatever you would have said. **This is a speed problem, not a thinking problem** — practise against a clock and aim to add five more per sitting until you are past 30.'));
    }
    if (f.srtNote) body.push(P(f.srtNote));
  }

  if (f.watNote) {
    body.push(H1('WAT — Word Association Test'));
    body.push(P(f.watNote));
  }

  body.push(H1('Your three priorities, in order'));
  f.priorities.forEach((p, i) => body.push(P(`**${i + 1}.** ${p}`)));

  body.push(H1('One thing worth saying plainly'));
  body.push(P(f.closing));
  body.push(Note('This report is based on your own answer papers.'));
  return body;
}

/* --------------------------------------------------------------------- main */

const only = process.argv[2];
const entries = Object.entries(DATA.candidates).filter(([k]) => !only || k === only);
if (!entries.length) { console.error(`No candidate matching "${only}"`); process.exit(1); }

for (const [key, f] of entries) {
  for (const [kind, build, suffix] of [
    ['assessment', assessment, 'Psychology Assessment'],
    ['feedback', feedback, 'Detailed Feedback'],
  ]) {
    const inner = build(f);
    guard(inner, `${key}/${kind}`);
    const children = [
      new Paragraph({ text: kind === 'assessment' ? 'PSYCHOLOGY ASSESSMENT' : 'Your psychology test', style: 'Title' }),
      new Paragraph({
        text: kind === 'assessment'
          ? `${f.name}  ·  31 July 2026`
          : `What went well, and what to work on  ·  ${f.name}  ·  31 July 2026`,
        style: 'Sub',
      }),
      ...inner,
    ];
    const doc = new Document({ styles, numbering, sections: [{ properties: { page: PAGE }, children }] });
    const name = `${f.name} - ${suffix}.docx`;
    writeFileSync(join(outDir, name), await Packer.toBuffer(doc));
    console.log('  wrote', name);
  }
}
console.log(`\n${entries.length} candidate(s), ${entries.length * 2} documents.`);
