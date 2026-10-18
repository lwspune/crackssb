import { describe, it, expect } from 'vitest';
import { passwordProblem } from '../password.ts';

/**
 * A password staff type for someone, or someone sets for themselves (D31).
 * It is read off WhatsApp and typed on a phone, so the rules are few and
 * each one says what to change.
 */
const who = { email: 'arjun.mehta@example.com', fullName: 'Arjun Mehta' };

describe('passwordProblem', () => {
  it('accepts an ordinary password', () => {
    expect(passwordProblem('Cadet@2026', who)).toBeNull();
    expect(passwordProblem('kx7mpq2r', who)).toBeNull();
  });

  it('needs 8 to 72 characters', () => {
    expect(passwordProblem('Ab3$xyz', who)).toMatch(/at least 8/i);
    expect(passwordProblem('a'.repeat(73), who)).toMatch(/at most 72/i);
    expect(passwordProblem('a1'.repeat(36), who)).toBeNull();
  });

  it('refuses spaces at either end, which copy and paste add without anyone seeing', () => {
    expect(passwordProblem(' Cadet@2026', who)).toMatch(/space/i);
    expect(passwordProblem('Cadet@2026 ', who)).toMatch(/space/i);
    expect(passwordProblem('Cadet 2026', who)).toBeNull();
  });

  it('refuses the person’s own email or name, in any case', () => {
    expect(passwordProblem('arjun.mehta@example.com', who)).toMatch(/name or email/i);
    expect(passwordProblem('ARJUN.MEHTA', who)).toMatch(/name or email/i);
    expect(passwordProblem('ArjunMehta', who)).toMatch(/name or email/i);
    expect(passwordProblem('arjun mehta', who)).toMatch(/name or email/i);
  });

  it('works without a name, for checks made before one is typed', () => {
    expect(passwordProblem('Cadet@2026', { email: 'x@example.com', fullName: '' })).toBeNull();
  });
});
