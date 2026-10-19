import { PROMPTS } from '../../sdt/prompts.ts';
import { RUNNABLE } from '../runner/registry.ts';
import type { PaperBooklet } from './PaperBookletRunner.tsx';

/** What the SRT (D39) and SDT (D40) runners are given: the registry's brief, and the list to read. */

export function srtBooklet(set: { id: string; title: string; situations: readonly string[] }): PaperBooklet {
  const r = RUNNABLE.srt!;
  return {
    instrument: 'srt',
    testId: set.id,
    title: 'Situation Reaction Test',
    heading: set.title,
    facts: r.facts,
    instruction: r.instruction,
    items: set.situations,
    sheet: '/sheets/srt',
    back: '/practise/srt',
  };
}

export function sdtBooklet(): PaperBooklet {
  const r = RUNNABLE.sdt!;
  return {
    instrument: 'sdt',
    testId: null,
    title: 'Self Description Test',
    heading: 'SDT',
    facts: r.facts,
    instruction: r.instruction,
    items: PROMPTS.map((p) => p.text),
    sheet: '/sheets/sdt',
    back: '/practise',
  };
}
