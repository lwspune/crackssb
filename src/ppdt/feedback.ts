import type { PpdtNote } from './note.ts';
import type { Mood, PpdtPicture } from './pictures.ts';

/**
 * PPDT quick checks (D33): what can be said honestly with no model. The
 * character box against the picture's ground truth, whether the action was
 * noted, the story's length, whether it reaches an ending. Each check says
 * what it found in one line. None judges the story's quality — that needs an
 * assessor or the judgement layer (D5), and the page says so. Pure.
 */

export type CheckKind = 'count' | 'described' | 'moods' | 'action' | 'length' | 'ending';

export interface Check {
  readonly kind: CheckKind;
  readonly ok: boolean;
  readonly line: string;
}

/** Four minutes of handwriting runs to roughly this; fewer is thin, more is rushed. */
export const STORY_WORDS = { min: 60, max: 180 } as const;

const MOOD_OF = { '+': 'positive', '0': 'neutral', '-': 'negative' } as const;
const MOOD_WORDS: Readonly<Record<Mood, string>> = { positive: 'positive', neutral: 'neutral', negative: 'low' };

/** Words that close a story: an outcome reached, or what happens next. */
const ENDING =
  /\b(finally|eventually|in the end|at last|at the end|later|soon|afterwards|since then|from then on|ever since|by the next|the next (?:day|week|month|year|season|monsoon|morning)|within (?:a|an|the|\d+|two|three|ten) \w+|succeeded|successfully|managed to|was saved|were saved|won|achieved|resolved|decided to|went on to|thanked|recovered|reached)\b/i;

const wordCount = (text: string) => (text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
const range = (p: PpdtPicture) => (p.people.min === p.people.max ? `${p.people.typical}` : `about ${p.people.typical} (${p.people.min}–${p.people.max} is fair)`);

export function checkAttempt(picture: PpdtPicture, note: PpdtNote, story: string): Check[] {
  const checks: Check[] = [];
  const { min, max } = picture.people;

  checks.push(
    note.count === null
      ? { kind: 'count', ok: false, line: `You did not count the people. The picture has ${range(picture)}.` }
      : { kind: 'count', ok: note.count >= min && note.count <= max, line: `You saw ${note.count}. The picture has ${range(picture)}.` },
  );

  const shouldDescribe = Math.min(note.count ?? 0, picture.characters.length || (note.count ?? 0), note.people.length || (note.count ?? 0));
  const full = note.people.filter((p) => p.sex !== '' && p.age !== '' && p.mood !== '').length;
  if (shouldDescribe > 0) {
    checks.push({ kind: 'described', ok: full >= shouldDescribe, line: `You described ${full} of ${shouldDescribe} in full: sex, age and mood.` });
  }

  const marked = note.people.map((p) => (p.mood === '' ? null : MOOD_OF[p.mood])).filter((m): m is Mood => m !== null);
  if (marked.length > 0) {
    const off = marked.filter((m) => !picture.moods.includes(m));
    const accepted = picture.moods.map((m) => MOOD_WORDS[m]).join(' or ');
    const who = picture.people.max === 1 ? (picture.characters[0]?.sex === 'F' ? 'her' : picture.characters[0]?.sex === 'M' ? 'him' : 'them') : 'them';
    checks.push(
      off.length === 0
        ? { kind: 'moods', ok: true, line: 'The moods you marked fit the picture.' }
        : { kind: 'moods', ok: false, line: `You marked a ${MOOD_WORDS[off[0]]} mood; most read ${who} as ${accepted}.` },
    );
  }

  const actionWords = wordCount(note.action);
  checks.push(
    actionWords >= 3
      ? { kind: 'action', ok: true, line: 'You noted the action.' }
      : { kind: 'action', ok: false, line: actionWords === 0 ? 'You did not note the action.' : 'Say the action in a few more words: who is doing what.' },
  );

  const n = wordCount(story);
  checks.push(
    n === 0
      ? { kind: 'length', ok: false, line: 'No story written.' }
      : {
          kind: 'length',
          ok: n >= STORY_WORDS.min && n <= STORY_WORDS.max,
          line:
            n < STORY_WORDS.min
              ? `${n} words — thin for four minutes; aim for ${STORY_WORDS.min}–${STORY_WORDS.max}.`
              : n > STORY_WORDS.max
                ? `${n} words — long for four minutes; at the SSB you write by hand.`
                : `${n} words — right for four minutes.`,
        },
  );

  if (n > 0) {
    checks.push(
      ENDING.test(story)
        ? { kind: 'ending', ok: true, line: 'Your story reaches an outcome.' }
        : { kind: 'ending', ok: false, line: 'Your story stops without an outcome: say how it ends.' },
    );
  }
  return checks;
}
