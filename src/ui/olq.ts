import type { Olq } from '../scoring/judge/contract.ts';

/** The fifteen OLQs as a candidate reads them, by factor (ARCHITECTURE.md §3). */
export const OLQ_GROUPS: readonly { readonly factor: string; readonly olqs: readonly Olq[] }[] = [
  { factor: 'Planning & Organising', olqs: ['effectiveIntelligence', 'reasoningAbility', 'organisingAbility', 'powerOfExpression'] },
  { factor: 'Social Adjustment', olqs: ['socialAdaptability', 'cooperation', 'senseOfResponsibility'] },
  { factor: 'Social Effectiveness', olqs: ['initiative', 'selfConfidence', 'speedOfDecision', 'abilityToInfluenceTheGroup', 'liveliness'] },
  { factor: 'Dynamic', olqs: ['determination', 'courage', 'stamina'] },
];

const LABELS: Readonly<Record<Olq, string>> = {
  effectiveIntelligence: 'Effective Intelligence',
  reasoningAbility: 'Reasoning Ability',
  organisingAbility: 'Organising Ability',
  powerOfExpression: 'Power of Expression',
  socialAdaptability: 'Social Adaptability',
  cooperation: 'Cooperation',
  senseOfResponsibility: 'Sense of Responsibility',
  initiative: 'Initiative',
  selfConfidence: 'Self Confidence',
  speedOfDecision: 'Speed of Decision',
  abilityToInfluenceTheGroup: 'Ability to Influence the Group',
  liveliness: 'Liveliness',
  determination: 'Determination',
  courage: 'Courage',
  stamina: 'Stamina',
};

export function olqLabel(olq: Olq): string {
  return LABELS[olq];
}
