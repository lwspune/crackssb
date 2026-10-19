import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { loadSoloCandidates, loadSoloSessions } from '../../lib/admin/candidates.ts';

/**
 * The owner's view of candidates with no academy (D42). Read as the signed-in
 * user under row level security: the superadmin sees every solo candidate and
 * their attempts; an academy's staff see none of them.
 */
describe.skipIf(!hasDatabase)('candidates with no academy', () => {
  let world: World;
  const service = serviceClient();

  beforeAll(async () => {
    world = await buildWorld({
      solo: { role: 'candidate', org: null, dob: null },
      member: { role: 'candidate', org: 'a', dob: null },
      owner: { role: 'superadmin', org: null, dob: null },
      head: { role: 'org_admin', org: 'a', dob: null },
      mentor: { role: 'mentor', org: 'a', dob: null },
    });
    const { error } = await world.people.solo.client.rpc('start_session', { p_assessment_type: 'wat' });
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    await world?.destroy();
    expect(await leftovers(service)).toEqual([]);
  });

  it('shows the owner every solo candidate, with how they joined, and no one with an academy', async () => {
    const people = await loadSoloCandidates(world.people.owner.client);
    const solo = people.find((p) => p.id === world.people.solo.id);
    expect(solo).toMatchObject({ fullName: 'Fixture solo', email: world.people.solo.email, joinedVia: 'staff', deactivated: false });
    expect(people.some((p) => p.id === world.people.member.id || p.id === world.people.owner.id)).toBe(false);
  });

  it('shows the owner their attempts, and no one else’s', async () => {
    const sessions = await loadSoloSessions(world.people.owner.client);
    expect(sessions.filter((s) => s.candidateId === world.people.solo.id).map((s) => s.type)).toEqual(['wat']);
    expect(sessions.some((s) => s.candidateId === world.people.member.id)).toBe(false);
  });

  it('shows an academy’s owner and mentor none of them', async () => {
    for (const who of ['head', 'mentor']) {
      const c = world.people[who].client;
      expect((await loadSoloCandidates(c)).some((p) => p.id === world.people.solo.id), who).toBe(false);
      expect((await loadSoloSessions(c)).some((s) => s.candidateId === world.people.solo.id), who).toBe(false);
    }
  });
});
