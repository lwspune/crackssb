import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { ENTITLEMENTS, GRADES } from '../contract.ts';
import type { Provider } from '../adapter.ts';
import type { Instrument } from '../../thresholds.ts';

/**
 * Anthropic provider for the judge (D5).
 *
 * Three things D5 requires, all present here:
 *
 *  1. **Strict structured output.** The verdict schema is generated per
 *     instrument from the entitlement map, so the model physically cannot
 *     return an OLQ the instrument is not entitled to observe. `validateVerdict`
 *     still runs afterwards — schema generation and boundary validation are
 *     independent safeguards, and the adapter must hold even if a future
 *     provider has no structured-output support.
 *  2. **Prompt caching.** The rubric is byte-identical for a given instrument,
 *     so it goes in `system` behind a cache breakpoint. Across a 99-story eval
 *     run that is 98 cache reads.
 *  3. **Swappability.** Nothing above this file knows Anthropic is involved.
 */

const olqEntry = z.object({
  score: z.number().int().min(1).max(9),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).min(1),
});

/** Schema whose OLQ keys ARE the entitlement map. */
function verdictSchemaFor(instrument: Instrument) {
  const olqShape: Record<string, z.ZodOptional<typeof olqEntry>> = {};
  for (const olq of ENTITLEMENTS[instrument]) olqShape[olq] = olqEntry.optional();

  return z.object({
    quality: z.object({
      grade: z.enum(GRADES as unknown as [string, ...string[]]),
      evidence: z.array(z.string()).min(1),
    }),
    olq: z.object(olqShape),
    flags: z.object({
      themes: z.array(z.string()),
      traits: z.array(z.string()),
      perceptionMismatch: z.string().nullable(),
    }),
  });
}

export interface AnthropicProviderOptions {
  /**
   * Which model to evaluate. D5 selects the provider by measured agreement,
   * so this is deliberately a parameter — running the bake-off means running
   * this provider several times with different values.
   */
  readonly model?: string;
  readonly effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  readonly maxTokens?: number;
  readonly instrument: Instrument;
  /** Called with per-call token usage, for the cost tracking ARCHITECTURE asks for. */
  readonly onUsage?: (usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  }) => void;
}

export function anthropicProvider(options: AnthropicProviderOptions): Provider {
  const client = new Anthropic();
  const schema = verdictSchemaFor(options.instrument);
  const model = options.model ?? 'claude-opus-5';

  return async ({ system, user }) => {
    const response = await client.messages.parse({
      model,
      max_tokens: options.maxTokens ?? 4000,
      thinking: { type: 'adaptive' },
      // Array form so the rubric can carry a cache breakpoint. It is identical
      // on every call for a given instrument; the candidate text is in `user`,
      // after the breakpoint.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      output_config: {
        format: zodOutputFormat(schema),
        ...(options.effort ? { effort: options.effort } : {}),
      },
    });

    options.onUsage?.({
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    });

    if (response.stop_reason === 'refusal') {
      throw new Error(
        `Model declined to grade this response (${response.stop_details?.category ?? 'unknown'})`,
      );
    }

    // parsed_output is null when parsing failed; the adapter's validation will
    // reject a null just as loudly, but say so here where the cause is visible.
    if (response.parsed_output == null) {
      throw new Error('Structured output did not parse — no parsed_output returned');
    }
    return response.parsed_output;
  };
}
