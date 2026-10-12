import { describe, it, expect } from 'vitest';
import { WAT_CONTENT } from '../content.ts';
import { RUNNABLE } from '../registry.ts';
import watItems from '../../../../content/wat-items.json';

describe('WAT content', () => {
  const count = RUNNABLE.wat?.config.mode === 'forced_sequence' ? RUNNABLE.wat.config.itemCount : 0;

  it('has a word for every item the runner will show', () => {
    expect(count).toBe(60);
    for (let i = 0; i < count; i++) expect(WAT_CONTENT.stimulus(i), `item ${i}`).toMatch(/\S/);
  });

  it('serves the words in deck order, not file order', () => {
    const first = watItems.items.find((it) => it.ordinal === 1)?.payload.word;
    const last = watItems.items.find((it) => it.ordinal === 60)?.payload.word;
    expect(WAT_CONTENT.stimulus(0)).toBe(first);
    expect(WAT_CONTENT.stimulus(59)).toBe(last);
  });
});
