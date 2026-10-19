import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * A date of birth is optional (0016, D37). Left blank, it is simply not known,
 * and the candidate sits tests as an adult would. A known under-18 still needs
 * a guardian's consent first. Every way into a test checks the same.
 */
describe.skipIf(!hasDatabase)('an optional date of birth', () => {
  let world: World;
  const service = serviceClient();
  let picture = '';

  beforeAll(async () => {
    world = await buildWorld({
      nodob: { role: 'candidate', org: 'a', dob: null },
      minor: { role: 'candidate', org: 'a', dob: yearsAgo(15) },
    });
    picture = `test-${world.run}-pic`;
    const { error } = await service.from('items').insert({ id: picture, assessment_type: 'ppdt', difficulty: 3, payload: { title: 'Fixture', image: '/x.jpg' }, source: 'fixture' });
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    await world?.destroy();
    await service.from('items').delete().eq('id', picture);
    expect(await leftovers(service)).toEqual([]);
  });

  const ways = (who: string) => {
    const c = world.people[who].client;
    return {
      session: () => c.rpc('start_session', { p_assessment_type: 'wat' }),
      ppdt: () => c.rpc('start_ppdt', { p_item_id: picture, p_input_mode: 'typed', p_paper_code: null }),
      // Past the person check, each of these fails on what it was asked for, not on who asked.
      mock: () => c.rpc('start_test', { p_test_id: `test-${world.run}-none` }),
      practice: () => c.rpc('answer_practice', { p_item_id: `test-${world.run}-none`, p_chosen: 'A' }),
    };
  };

  it('lets a candidate with no date of birth start any test', async () => {
    const w = ways('nodob');
    expect((await w.session()).error).toBeNull();
    expect((await w.ppdt()).error).toBeNull();
    expect((await w.mock()).error?.message).toMatch(/unknown_test/);
    expect((await w.practice()).error?.message).toMatch(/unknown_item/);
  });

  it('still stops a known under-18 without a guardian’s consent, everywhere', async () => {
    const w = ways('minor');
    for (const [name, call] of Object.entries(w)) expect((await call()).error?.message, name).toMatch(/consent_required/);
  });
});
