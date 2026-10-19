import { describe, it, expect } from 'vitest';
import { CATALOG, SSB_DAYS, entriesForDay } from '../catalog.ts';
import { OLQ_GROUPS, olqLabel } from '../olq.ts';
import { RUNNABLE } from '../runner/registry.ts';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { OLQS } from '../../scoring/judge/contract.ts';
import { PICTURES } from '../../ppdt/pictures.ts';

/**
 * The student's map of the product (UI.md §5.1). Three rules make it honest:
 * nothing is "ready" that cannot be run, nothing is hidden because it is not
 * built, and the candidate navigates by SSB day — never by our sprints.
 */
describe('the practise catalogue', () => {
  it('lists the five SSB days in order', () => {
    expect(SSB_DAYS.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it('gives every day at least one entry', () => {
    for (const { day } of SSB_DAYS) expect(entriesForDay(day).length).toBeGreaterThan(0);
  });

  it('places every instrument the runner knows somewhere on the map', () => {
    const placed = new Set(CATALOG.flatMap((e) => e.instruments));
    for (const instrument of Object.keys(INSTRUMENT_CONFIGS)) expect(placed).toContain(instrument);
  });

  it('marks an entry ready exactly when it can be run', () => {
    for (const entry of CATALOG) {
      const runnable = entry.instruments.length > 0 && entry.instruments.every((i) => i in RUNNABLE);
      expect({ id: entry.id, ready: entry.availability === 'ready' }).toEqual({ id: entry.id, ready: runnable });
    }
  });

  it('shows the GTO outdoor tasks as not simulated rather than hiding them (ARCHITECTURE.md §9.2)', () => {
    const outdoor = ['pgt', 'hgt', 'fgt', 'command_task', 'individual_obstacles', 'snake_race'];
    for (const id of outdoor) {
      const entry = CATALOG.find((e) => e.id === id);
      expect(entry, id).toBeDefined();
      expect(entry?.availability).toBe('not_simulated');
      expect(entry?.day).toBe(3);
    }
  });

  it('never shows the candidate our sprint or phase numbers', () => {
    const copy = JSON.stringify([SSB_DAYS, CATALOG]);
    expect(copy).not.toMatch(/\b(sprint|phase \d)/i);
  });

  it('opens OIR as timed mocks, chosen on the OIR page beside chapter practice (D26, D32)', () => {
    const oir = CATALOG.find((e) => e.id === 'oir');
    expect(oir?.practice).toEqual({ href: '/practise/oir', label: 'Chapter practice' });
    expect(oir?.availability).toBe('ready');
    expect(RUNNABLE.oir?.start).toBe('/practise/oir');
  });

  it('opens PPDT as its pictures, chosen on its own page, and counts them right (D33, D35)', () => {
    const ppdt = CATALOG.find((e) => e.id === 'ppdt');
    expect(ppdt?.availability).toBe('ready');
    expect(ppdt?.summary).toMatch(new RegExp(`^${PICTURES.length} pictures · `));
    expect(RUNNABLE.ppdt?.start).toBe('/practise/ppdt');
  });

  it('links practice only inside the practise area', () => {
    for (const e of CATALOG) if (e.practice) expect(e.practice.href).toMatch(/^\/practise\/[a-z-]+$/);
  });

  it('gives every entry a unique id', () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('OLQ labels', () => {
  it('covers all fifteen qualities, each in exactly one factor', () => {
    const grouped = OLQ_GROUPS.flatMap((g) => g.olqs);
    expect([...grouped].sort()).toEqual([...OLQS].sort());
  });

  it('labels each quality in words', () => {
    expect(olqLabel('abilityToInfluenceTheGroup')).toBe('Ability to Influence the Group');
    expect(olqLabel('effectiveIntelligence')).toBe('Effective Intelligence');
  });
});
