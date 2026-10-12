import { describe, it, expect } from 'vitest';
import { actingAcademy } from '../acting.ts';

/**
 * Which academy the staff area shows (D25). Staff: always their own — a
 * cookie cannot move them. Superadmin: the one they picked, if it exists;
 * otherwise none, and the staff area asks them to pick.
 */
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('actingAcademy', () => {
  it('gives staff their own academy, whatever the cookie says', () => {
    expect(actingAcademy({ role: 'mentor', orgId: A }, B, [A, B])).toBe(A);
    expect(actingAcademy({ role: 'org_admin', orgId: A }, null, [A, B])).toBe(A);
  });

  it('gives the superadmin the academy they picked', () => {
    expect(actingAcademy({ role: 'superadmin', orgId: null }, B, [A, B])).toBe(B);
  });

  it('ignores a pick that is not a real academy', () => {
    expect(actingAcademy({ role: 'superadmin', orgId: null }, 'not-a-uuid', [A, B])).toBeNull();
    expect(actingAcademy({ role: 'superadmin', orgId: null }, '33333333-3333-4333-8333-333333333333', [A, B])).toBeNull();
  });

  it('has no academy for a superadmin who has not picked one', () => {
    expect(actingAcademy({ role: 'superadmin', orgId: null }, null, [A, B])).toBeNull();
  });

  it('never gives a candidate an academy to act in', () => {
    expect(actingAcademy({ role: 'candidate', orgId: A }, A, [A])).toBeNull();
  });
});
