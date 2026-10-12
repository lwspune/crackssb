import { validateVerdict, type JudgeRequest, type JudgeVerdict } from './contract.ts';
import { buildRubric, buildUserMessage } from './rubric.ts';

/**
 * The provider seam (D5).
 *
 * A provider takes a system prompt and a user message and returns the model's
 * output — an object, or the raw text. It knows nothing about OLQs, and the
 * judge knows nothing about which model it is talking to. Swapping provider is
 * a one-line change, and the Sprint X vision path can use a different one.
 */
export type Provider = (call: {
  readonly system: string;
  readonly user: string;
}) => Promise<unknown>;

/** Strip a ```json fence if the model wrapped its output in one. */
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : text).trim();
}

function coerce(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const text = unfence(raw);
  try {
    return JSON.parse(text);
  } catch {
    // Some models prepend a sentence. Take the first balanced-looking object.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new SyntaxError(
      `Could not parse provider output as JSON: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
    );
  }
}

/**
 * Builds a judge over a provider. Text in, validated partial OLQ vector out.
 *
 * Validation is not optional and not configurable: an unvalidated verdict must
 * never reach `olq_snapshots`, because a silently corrupted rollup is far worse
 * than a loud failure.
 */
export function createJudge(provider: Provider) {
  return async function judge(request: JudgeRequest): Promise<JudgeVerdict> {
    if (!request.responseText || !request.responseText.trim()) {
      throw new Error('Cannot judge an empty response — that is a Layer 1 finding');
    }
    const system = buildRubric(request.instrument);
    const user = buildUserMessage(request);
    const raw = await provider({ system, user });
    return validateVerdict(request.instrument, coerce(raw));
  };
}
