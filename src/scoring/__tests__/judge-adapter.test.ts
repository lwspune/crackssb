import { describe, it, expect, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createJudge } from '../judge/adapter.ts';
import { buildRubric, buildUserMessage, STIMULI } from '../judge/rubric.ts';

const goodVerdict = {
  quality: { grade: 'Just Avg', evidence: ['Theme resolved but thinly detailed'] },
  olq: { courage: { score: 4, confidence: 0.6, evidence: ['Hero acts only after help arrives'] } },
  flags: { themes: [], traits: [], perceptionMismatch: null },
};

describe('rubric', () => {
  it('is byte-identical across calls for the same instrument', () => {
    // D5 requires prompt caching, which requires a stable prefix.
    expect(buildRubric('tat')).toBe(buildRubric('tat'));
  });

  it('differs between instruments', () => {
    expect(buildRubric('tat')).not.toBe(buildRubric('srt'));
  });

  it('states the assessor closed grade vocabulary', () => {
    const r = buildRubric('tat');
    for (const g of ['LOW', 'Just Avg', 'AVG', 'Good', 'V. good']) expect(r).toContain(g);
  });

  it('names only the OLQs the instrument is entitled to', () => {
    const wat = buildRubric('wat');
    expect(wat).toContain('powerOfExpression');
    expect(wat).not.toContain('courage');
  });

  it('carries the forbidden themes the corpus established', () => {
    const r = buildRubric('tat');
    expect(r).toMatch(/alcohol/i);
    expect(r).toMatch(/lift/i);
    expect(r).toMatch(/depression/i);
  });

  it('warns that the phobia labels are stimulus-driven, not dispositional', () => {
    expect(buildRubric('tat')).toMatch(/stimulus-driven/i);
  });

  it('does not leak candidate text into the cacheable prefix', () => {
    expect(buildRubric('tat')).not.toMatch(/cand-\d|Priya was once cleaning/);
  });

  // Real names live only in the gitignored records (D21), so this guard reads them there.
  it.skipIf(!existsSync('corpus/records'))('does not leak any candidate name into the rubric (local only)', () => {
    const rubric = buildRubric('tat');
    for (const file of readdirSync('corpus/records').filter((f) => f.endsWith('.json'))) {
      const name: unknown = JSON.parse(readFileSync(`corpus/records/${file}`, 'utf8')).candidate?.name;
      if (typeof name !== 'string') continue;
      for (const part of name.split(/\s+/).filter((p) => p.length > 2)) expect(rubric, file).not.toContain(part);
    }
  });
});

describe('stimulus descriptions', () => {
  it('knows every slide we have a description for', () => {
    for (const slide of [1, 2, 3, 4, 6, 7, 10, 11]) {
      expect(STIMULI[slide]?.description).toBeTruthy();
    }
  });

  it('records the juice bottle on slide 6, which is the whole point', () => {
    expect(STIMULI[6].description).toMatch(/juice bottle/i);
  });

  it('says whether each description came from the image or from the marking', () => {
    // A description read off the actual slide is worth more than one
    // reconstructed from what the assessor wrote in the margin.
    for (const slide of Object.keys(STIMULI)) {
      expect(['image', 'assessor_description']).toContain(STIMULI[Number(slide)].source);
    }
  });

  it('has the four slides we have images for', () => {
    for (const slide of [1, 2, 3, 4]) {
      expect(STIMULI[slide].source).toBe('image');
    }
  });

  it('carries the details that demonstrably drive responses', () => {
    // Each of these is in the picture and shows up across the corpus:
    // slide 1's clock reads 10:10 and three candidates wrote exactly that;
    // slide 2's TV GUIDE sign put a television in 5 of 11 stories;
    // slide 3's drowsy posture put sleep in 7 of 10.
    expect(STIMULI[1].description).toMatch(/10[:.]10/);
    expect(STIMULI[2].description).toMatch(/TV GUIDE/i);
    expect(STIMULI[3].description).toMatch(/drows|asleep|sleep/i);
  });

  it('puts the stimulus in the user message when the slide is known', () => {
    const msg = buildUserMessage({ instrument: 'tat', responseText: 'A story.', slide: 6 });
    expect(msg).toMatch(/juice bottle/i);
    expect(msg).toContain('A story.');
  });

  it('omits the stimulus block for an unknown slide rather than inventing one', () => {
    const msg = buildUserMessage({ instrument: 'tat', responseText: 'A story.', slide: 3 });
    expect(msg).not.toMatch(/the picture shows/i);
    expect(msg).toContain('A story.');
  });
});

describe('createJudge', () => {
  it('passes the rubric as system and the response as user', async () => {
    const provider = vi.fn().mockResolvedValue(goodVerdict);
    const judge = createJudge(provider);
    await judge({ instrument: 'tat', responseText: 'Ram, 24, led his team.', slide: 1 });

    const call = provider.mock.calls[0][0];
    expect(call.system).toBe(buildRubric('tat'));
    expect(call.user).toContain('Ram, 24, led his team.');
  });

  it('returns the validated verdict', async () => {
    const judge = createJudge(async () => goodVerdict);
    const v = await judge({ instrument: 'tat', responseText: 'x' });
    expect(v.quality.grade).toBe('Just Avg');
  });

  it('rejects a verdict that breaches the entitlement map', async () => {
    const bad = {
      ...goodVerdict,
      olq: { speedOfDecision: { score: 5, confidence: 0.5, evidence: ['x'] } },
    };
    const judge = createJudge(async () => bad);
    await expect(judge({ instrument: 'tat', responseText: 'x' })).rejects.toThrow(/not entitled/i);
  });

  it('rejects malformed provider output rather than passing it downstream', async () => {
    const judge = createJudge(async () => ({ quality: { grade: 'Amazing', evidence: ['x'] } }));
    await expect(judge({ instrument: 'tat', responseText: 'x' })).rejects.toThrow(/grade/i);
  });

  it('parses a JSON string, since most providers return text', async () => {
    const judge = createJudge(async () => JSON.stringify(goodVerdict));
    const v = await judge({ instrument: 'tat', responseText: 'x' });
    expect(v.quality.grade).toBe('Just Avg');
  });

  it('strips a markdown code fence before parsing', async () => {
    const judge = createJudge(async () => '```json\n' + JSON.stringify(goodVerdict) + '\n```');
    const v = await judge({ instrument: 'tat', responseText: 'x' });
    expect(v.quality.grade).toBe('Just Avg');
  });

  it('reports unparseable output clearly', async () => {
    const judge = createJudge(async () => 'I think this story is quite good actually');
    await expect(judge({ instrument: 'tat', responseText: 'x' })).rejects.toThrow(/could not parse/i);
  });

  it('refuses an empty response rather than asking the model to grade nothing', async () => {
    const judge = createJudge(async () => goodVerdict);
    await expect(judge({ instrument: 'tat', responseText: '   ' })).rejects.toThrow(/empty/i);
  });
});
