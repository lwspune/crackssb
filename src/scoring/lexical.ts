import { isBlank, specFor, type Instrument } from './thresholds.ts';

/**
 * Layer 2 — lexical rules. Deterministic, no model.
 *
 * Each rule is one the LWS Pune assessor applied by hand, in red pen, across the
 * 11-sheet corpus. Two of them have direct behavioural evidence: cand-03
 * wrote "He will" throughout his SRT and received zero style corrections, while
 * cand-04 is the only candidate graded "V. good" on WAT and the only one
 * writing impersonal responses.
 *
 * Each finding declares a `basis` (DECISIONS.md D14). The assessor applies the
 * SRT tense rule inconsistently between sheets, and LWS confirmed there was only
 * one marker — so that inconsistency is one person's situational preference, and
 * candidates are not scored on it. Only `doctrine` findings are scored.
 */

/**
 * Why a rule exists, which decides whether a finding is scored or merely advised.
 *
 * LWS Pune confirmed a single assessor and no second marker (DECISIONS.md D14),
 * so where he applies a rule inconsistently it is one person's situational
 * heuristic rather than a standard — and candidates should not be scored on it.
 *
 *  - `doctrine`    reflects a quality actually being assessed. Score it.
 *  - `house_style` a surface-form preference of this academy. Advise, don't score.
 *  - `grammar`     plainly incorrect English, independent of SSB at all.
 */
export type FindingBasis = 'doctrine' | 'house_style' | 'grammar';

export type LexicalRule =
  | 'srt_modal_obligation'
  | 'srt_non_future'
  | 'tentative_verb'
  | 'wat_personal_pronoun'
  | 'whatsapp_abbreviation'
  | 'definite_article_before_name';

export interface LexicalFinding {
  readonly rule: LexicalRule;
  readonly basis: FindingBasis;
  /** 1-based index of the offending response. */
  readonly ordinal: number;
  /** Window around the match, so a human reviewer can audit it. */
  readonly excerpt: string;
  readonly message: string;
  readonly suggestion?: string;
}

const RULE_BASIS: Readonly<Record<LexicalRule, FindingBasis>> = {
  // Obligation verbs prescribe what someone ought to do instead of committing to
  // an action. The assessor wrote this instruction out twice, and both times
  // paired it with "Shows authoritarian Behaviour" — a real signal about manner.
  srt_modal_obligation: 'doctrine',
  // "Avoid TRY / TRIED" on three separate sheets. Decisiveness is assessed.
  tentative_verb: 'doctrine',
  // Corrected 15/16 times on one candidate and not at all on two others writing
  // the same way. A preference, not a standard.
  srt_non_future: 'house_style',
  wat_personal_pronoun: 'house_style',
  whatsapp_abbreviation: 'house_style',
  // "the Ram" is simply wrong English, SSB or not.
  definite_article_before_name: 'grammar',
};

export interface LexicalInput {
  readonly instrument: Instrument;
  readonly responses: readonly (string | null | undefined)[];
  /**
   * Character names the candidate introduced, when the caller knows them.
   * Makes the definite-article rule exact instead of heuristic.
   */
  readonly characterNames?: readonly string[];
}

/** "He must" / "He should" — the assessor reads these as authoritarian. */
const MODAL_OBLIGATION = /\b(?:must|should)\b/i;

/** The target form. Word-bounded so "willing" does not count. */
const FUTURE_AUXILIARY = /\bwill\b/i;

/** "Avoid TRY / TRIED" — word-bounded so "industry" and "country" do not match. */
const TENTATIVE_VERB = /\b(?:try|tries|tried|trying)\b/i;

/** "Avoid writing I, me, myself, he/she, Her, His, Him, Your etc." */
const PERSONAL_PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|you|your|yours|he|him|his|himself|she|her|hers|herself)\b/i;

/** "Pls Restrict using WHATSAPP short-cut abbreviated words." */
const WHATSAPP_ABBREVIATION =
  /\b(?:bcoz|becoz|coz|cuz|abt|plz|pls|thx|tnx|b4|gud|w8|msg|luv|dis|dat|u|ur|r|n|k|tc|brb)\b/gi;

/**
 * "THE is a definite Article, cannot be prefixed to Standard Names (Noun)."
 *
 * Heuristic when no character list is supplied: "the" followed by a capitalised
 * word. Sentence position is not used — the assessor flagged "The Geeta" at the
 * start of a sentence — so the capitalisation of the following word carries the
 * rule. Demonyms and capitalised adjectives are excluded, because "the Indian
 * army" is correct English and the assessor never marked it.
 */
const DEFINITE_ARTICLE_NAME = /\b[Tt]he\s+([A-Z][a-z]{2,})\b/g;

const NOT_A_NAME = new Set([
  'indian', 'american', 'british', 'chinese', 'russian', 'english', 'hindi',
  'pakistani', 'japanese', 'german', 'french', 'european', 'african', 'asian',
  'picture', 'police', 'army', 'navy', 'hospital', 'doctor', 'captain',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

function excerptAround(response: string, match: RegExpExecArray, radius = 28): string {
  const start = Math.max(0, match.index - radius);
  const end = Math.min(response.length, match.index + match[0].length + radius);
  const lead = start > 0 ? '…' : '';
  const tail = end < response.length ? '…' : '';
  return `${lead}${response.slice(start, end).trim()}${tail}`;
}

export function assessLexical({
  instrument,
  responses,
  characterNames,
}: LexicalInput): LexicalFinding[] {
  specFor(instrument); // fail fast on an unknown instrument
  const findings: LexicalFinding[] = [];
  const knownNames = characterNames?.length
    ? new Set(characterNames.map((n) => n.toLowerCase()))
    : null;

  responses.forEach((raw, index) => {
    if (isBlank(raw)) return; // blanks belong to Layer 1
    const response = raw as string;
    const ordinal = index + 1;

    if (instrument === 'srt') {
      const modal = MODAL_OBLIGATION.exec(response);
      if (modal) {
        // Deliberately exclusive with srt_non_future: one response, one tense
        // finding, so the two never double-count into the same OLQ score.
        findings.push({
          rule: 'srt_modal_obligation',
          basis: RULE_BASIS.srt_modal_obligation,
          ordinal,
          excerpt: excerptAround(response, modal),
          message: `Response ${ordinal} uses "${modal[0]}". The assessor reads obligation verbs as authoritarian.`,
          suggestion: 'Start the response with "He will …".',
        });
      } else if (!FUTURE_AUXILIARY.test(response)) {
        findings.push({
          rule: 'srt_non_future',
          basis: RULE_BASIS.srt_non_future,
          ordinal,
          excerpt: response.slice(0, 60).trim() + (response.length > 60 ? '…' : ''),
          message: `Response ${ordinal} is not in the future form.`,
          suggestion: 'Start the response with "He will …".',
        });
      }
    }

    if (instrument === 'wat') {
      const pronoun = PERSONAL_PRONOUN.exec(response);
      if (pronoun) {
        findings.push({
          rule: 'wat_personal_pronoun',
          basis: RULE_BASIS.wat_personal_pronoun,
          ordinal,
          excerpt: excerptAround(response, pronoun),
          message: `Response ${ordinal} uses the personal pronoun "${pronoun[0]}".`,
          suggestion: 'Write an impersonal, general statement instead.',
        });
      }
    }

    const tentative = TENTATIVE_VERB.exec(response);
    if (tentative) {
      findings.push({
        rule: 'tentative_verb',
        basis: RULE_BASIS.tentative_verb,
        ordinal,
        excerpt: excerptAround(response, tentative),
        message: `Response ${ordinal} uses "${tentative[0]}".`,
        suggestion: 'State the action directly — avoid TRY / TRIED.',
      });
    }

    // Report each distinct abbreviation once, in order of first appearance.
    const seenAbbreviations = new Set<string>();
    for (const m of response.matchAll(WHATSAPP_ABBREVIATION)) {
      const token = m[0].toLowerCase();
      if (seenAbbreviations.has(token)) continue;
      seenAbbreviations.add(token);
      findings.push({
        rule: 'whatsapp_abbreviation',
        basis: RULE_BASIS.whatsapp_abbreviation,
        ordinal,
        excerpt: excerptAround(response, m as RegExpExecArray),
        message: `Response ${ordinal} uses the short-cut "${m[0]}".`,
        suggestion: 'Write the word in full — avoid WhatsApp abbreviations.',
      });
    }

    for (const m of response.matchAll(DEFINITE_ARTICLE_NAME)) {
      const name = m[1];
      const isName = knownNames
        ? knownNames.has(name.toLowerCase())
        : !NOT_A_NAME.has(name.toLowerCase());
      if (!isName) continue;
      findings.push({
        rule: 'definite_article_before_name',
        basis: RULE_BASIS.definite_article_before_name,
        ordinal,
        excerpt: excerptAround(response, m as RegExpExecArray),
        message: `Response ${ordinal} writes "the ${name}".`,
        suggestion: '"The" is a definite article and cannot precede a proper name.',
      });
    }
  });

  return findings;
}
