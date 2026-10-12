import { readFileSync } from 'node:fs';
import type { Provider } from '../adapter.ts';

/**
 * A provider that replays verdicts written ahead of time.
 *
 * Lets a judge that is not reachable over HTTP — a human marker, or a model
 * driven through some other surface — be measured by exactly the same harness:
 * same rubric, same adapter, same validation, same scorer. The verdicts are
 * keyed by story id and looked up from the candidate text in the user message.
 *
 * Every verdict still goes through `validateVerdict`, so a hand-written one is
 * held to the same contract as a model's.
 */
export function verdictsFileProvider(path: string, keyIndexPath: string): Provider {
  const verdicts = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const blind = JSON.parse(readFileSync(keyIndexPath, 'utf8')) as {
    stories: Array<{ id: string; responseText: string }>;
  };

  // The adapter hands the provider a prompt, not an id, so map back via text.
  const byText = new Map<string, string>();
  for (const s of blind.stories) byText.set(s.responseText.trim(), s.id);

  return async ({ user }) => {
    const id = [...byText.entries()].find(([text]) => user.includes(text))?.[1];
    if (!id) throw new Error('No story id matched this prompt');
    const verdict = verdicts[id];
    if (!verdict) throw new Error(`No verdict recorded for ${id}`);
    return verdict;
  };
}
