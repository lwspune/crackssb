/**
 * Verdicts produced by an in-session Claude Code judge, grading from
 * corpus/blind-set.json (story text + slide number only, no ground truth).
 *
 * THIS IS NOT A D5 PROVIDER SELECTION. The judge transcribed the source sheets
 * and has therefore seen the assessor's marks. Blind presentation removes the
 * crudest failure mode but not the contamination. Treat the result as a harness
 * validation and a rubric smoke test.
 *
 * Regenerate: node scripts/my-verdicts.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// id: [grade, one-line rationale]
const G = {
  'cand-01-tat-1': ['Just Avg', 'Resolved but thin; permission-seeking is the whole plot'],
  'cand-01-tat-2': ['Just Avg', 'Named and aged, concrete plan, but ends before any outcome'],
  'cand-01-tat-3': ['Just Avg', 'Coherent and resolved, very low stakes'],
  'cand-01-tat-4': ['LOW', 'Reads a military operation as a mountaineering course'],
  'cand-01-tat-5': ['LOW', 'Ends mid-crisis on "he took the knife"'],
  'cand-01-tat-6': ['LOW', 'Drugs and alcohol theme'],
  'cand-01-tat-7': ['Just Avg', 'Correct setting, generic detail, prize motive is odd'],
  'cand-01-tat-8': ['LOW', 'Plot is retrieving a money bag; characters renamed mid-story'],
  'cand-01-tat-9': ['LOW', 'Resolves by taking a lift'],
  'cand-01-tat-10': ['LOW', 'Parents forbidding a woman to work; resolution is vague'],
  'cand-01-tat-11': ['LOW', 'Hero shouts from a safe place rather than acting'],
  'cand-01-tat-12': ['AVG', 'Named hero, tactics, specific 3-2 comeback'],

  'cand-02-tat-1': ['LOW', 'Ends on panic with the travel problem unresolved'],
  'cand-02-tat-2': ['LOW', 'No lead character; ends on an argument'],
  'cand-02-tat-3': ['LOW', 'Ends with the hero asleep at work'],
  'cand-02-tat-5': ['LOW', 'Explicitly incomplete'],
  'cand-02-tat-6': ['LOW', 'Alcohol and a ghost; incomplete'],
  'cand-02-tat-7': ['Just Avg', 'Correct setting, resolved, no named young hero'],
  'cand-02-tat-8': ['LOW', 'Thin criminal-violence plot'],
  'cand-02-tat-9': ['LOW', 'Resolves by being dropped home'],
  'cand-02-tat-10': ['LOW', 'Incomplete'],
  'cand-02-tat-11': ['LOW', 'Incomplete mid-attack'],
  'cand-02-tat-12': ['Just Avg', 'Resolved with a mixed outcome, some detail'],

  'cand-03-tat-1': ['Just Avg', 'Resolved and coherent, thin'],
  'cand-03-tat-2': ['LOW', 'A description of the picture, no hero'],
  'cand-03-tat-5': ['LOW', 'Two sentences; never engages the situation'],
  'cand-03-tat-6': ['LOW', 'Alcohol; incomplete'],
  'cand-03-tat-7': ['LOW', 'Pure picture description down to the microscope'],
  'cand-03-tat-8': ['LOW', 'Ends on "Then..."'],
  'cand-03-tat-9': ['LOW', 'Giving a lift is the whole plot'],
  'cand-03-tat-10': ['LOW', 'Frustration theme; incomplete'],
  'cand-03-tat-11': ['LOW', 'Incomplete at the moment of danger'],
  'cand-03-tat-12': ['Just Avg', 'Resolved with a score, mostly restates the situation'],

  'cand-04-tat-1': ['Just Avg', 'Coherent and resolved; hero delegates the fetch'],
  'cand-04-tat-2': ['AVG', 'Named, aged, concrete product idea with a rationale'],
  'cand-04-tat-6': ['LOW', 'Fragment'],
  'cand-04-tat-7': ['LOW', 'Fragment'],
  'cand-04-tat-8': ['LOW', 'Fragment'],
  'cand-04-tat-9': ['LOW', 'Fragment'],
  'cand-04-tat-10': ['LOW', 'Fragment'],
  'cand-04-tat-11': ['LOW', 'Fragment'],
  'cand-04-tat-12': ['LOW', 'Fragment'],

  'cand-05-tat-1': ['Just Avg', 'Hero delivers the papers herself; resolved'],
  'cand-05-tat-2': ['Just Avg', 'Hero steadies the team and resolves the situation'],

  'cand-06-tat-1': ['LOW', 'Ends on nervousness; nothing happens'],
  'cand-06-tat-2': ['Just Avg', 'Named manager, but only a discussion'],
  'cand-06-tat-3': ['Just Avg', 'Conditional ending; promotion is the motive'],
  'cand-06-tat-4': ['LOW', 'Correct perception but a description, not a story'],
  'cand-06-tat-5': ['LOW', 'Ends with the knife at her neck'],
  'cand-06-tat-6': ['LOW', 'Ends as the threat is noticed'],
  'cand-06-tat-7': ['Just Avg', 'Named doctor, positive motive, resolved'],
  'cand-06-tat-8': ['LOW', 'Unresolved; hero "tries to escape"'],
  'cand-06-tat-9': ['LOW', 'Lift'],
  'cand-06-tat-10': ['LOW', 'Vacation; ends with her collapsed'],
  'cand-06-tat-11': ['LOW', 'Shouts for help; a car happens to arrive'],
  'cand-06-tat-12': ['Just Avg', 'Self-directed action and a real outcome; weak opening'],

  'cand-07-tat-1': ['LOW', 'Needs permission to leave; ends with the boss angry'],
  'cand-07-tat-2': ['LOW', 'Confused; ends on "we should convince"'],
  'cand-07-tat-5': ['Just Avg', 'Coordinated rescue, resolved, poor English'],
  'cand-07-tat-6': ['Just Avg', 'Wine is incidental; burglary resolved with police'],
  'cand-07-tat-7': ['LOW', 'Reads a medical camp as a forensic crime scene'],
  'cand-07-tat-8': ['LOW', 'Rambling sequence, though resolved'],
  'cand-07-tat-9': ['LOW', 'Lift'],
  'cand-07-tat-10': ['LOW', 'Depression theme and a bitter generalisation'],
  'cand-07-tat-11': ['LOW', 'Escapes rather than acts'],
  'cand-07-tat-12': ['Just Avg', 'Captain selects and trains, but no contest outcome'],

  'cand-08-tat-1': ['Just Avg', 'Concrete 85% outcome; pronoun errors throughout'],
  'cand-08-tat-2': ['LOW', 'Opens as a picture description; hero is rescued'],
  'cand-08-tat-3': ['Just Avg', 'Resolved with a promotion; promotion is the motive'],
  'cand-08-tat-4': ['LOW', 'Invents a Chinese missile attack; description framing'],
  'cand-08-tat-5': ['Just Avg', 'Hero catches the kidnapper; resolved'],
  'cand-08-tat-9': ['LOW', 'Lift, plus a father shouting about it'],
  'cand-08-tat-10': ['LOW', 'Harassment; rescued by a passing man'],

  'cand-09-tat-1': ['AVG', 'Panics, recovers, prepares, wins the lead'],
  'cand-09-tat-2': ['AVG', 'Named and aged, decides, quantified 3x outcome'],
  'cand-09-tat-3': ['AVG', 'Perseveres through no sleep; deal closed'],
  'cand-09-tat-4': ['Just Avg', 'Correct perception and a named lead; opens as description'],
  'cand-09-tat-5': ['AVG', 'Stays calm while others panic; saves a life'],
  'cand-09-tat-6': ['Just Avg', 'Shadow resolved sensibly; low stakes'],
  'cand-09-tat-7': ['AVG', 'Named nurse, specific duties, positive outcome'],
  'cand-09-tat-8': ['LOW', 'Vacation and a dinner-bill race'],
  'cand-09-tat-9': ['LOW', 'Lift, albeit with a safety check'],
  'cand-09-tat-10': ['LOW', 'Invents a lake the picture does not contain'],
  'cand-09-tat-11': ['LOW', 'Saved by her team arriving; no action'],
  'cand-09-tat-12': ['LOW', 'Pure reminiscence; no situation, no action'],

  'cand-10-tat-1': ['AVG', 'Specific mechanism (30 degrees per 10 min) and a real result'],
  'cand-10-tat-2': ['AVG', 'Rejects the suggestion, devises his own, team wins'],
  'cand-10-tat-5': ['Good', 'Distract, disarm, call police; decisive and resolved'],
  'cand-10-tat-6': ['LOW', 'Infidelity; ends abruptly'],

  'cand-11-tat-1': ['LOW', 'No problem and no resolution; WhatsApp abbreviations'],
  'cand-11-tat-2': ['Just Avg', 'A values-based refusal to raise prices; thin'],
  'cand-11-tat-5': ['LOW', 'One sentence'],
  'cand-11-tat-6': ['LOW', 'Drinking; confused pronouns and plot'],
  'cand-11-tat-7': ['LOW', 'Correct setting, but trivial content and no action'],
  'cand-11-tat-8': ['LOW', 'A phoenix; wishful'],
  'cand-11-tat-9': ['LOW', 'Lift, ending on an ominous non-resolution'],
  'cand-11-tat-10': ['Just Avg', 'Resolved and mildly positive; no hero action'],
  'cand-11-tat-11': ['LOW', 'Mauled, then rescued by a passing car'],
  'cand-11-tat-12': ['LOW', 'Self-named candidate imagining his own commissioning'],
};

const verdicts = {};
for (const [id, [grade, why]] of Object.entries(G)) {
  verdicts[id] = {
    quality: { grade, evidence: [why] },
    olq: {},
    flags: { themes: [], traits: [], perceptionMismatch: null },
  };
}

const out = join(root, 'corpus', 'my-verdicts.json');
writeFileSync(out, JSON.stringify(verdicts, null, 2) + '\n');
console.log(`wrote ${out}\n  ${Object.keys(verdicts).length} verdicts`);

const dist = {};
for (const [, [g]] of Object.entries(G)) dist[g] = (dist[g] ?? 0) + 1;
console.log('  distribution:', dist);
