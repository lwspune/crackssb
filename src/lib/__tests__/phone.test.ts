import { describe, it, expect } from 'vitest';
import { formatPhone, parsePhone } from '../phone.ts';

/**
 * A mobile number as staff type it, stored the one way the database accepts
 * (`+` and digits, 0008) so the WhatsApp link can be built from it. Indian
 * numbers are the default; another country needs its `+` code.
 */
describe('parsePhone', () => {
  it('reads an Indian mobile number however it is written', () => {
    for (const raw of ['9876543210', '98765 43210', '098765-43210', '+91 98765 43210', '919876543210', '(+91) 98765.43210']) {
      expect(parsePhone(raw), raw).toEqual({ ok: true, phone: '+919876543210' });
    }
  });

  it('is optional', () => {
    expect(parsePhone('')).toEqual({ ok: true, phone: null });
    expect(parsePhone('   ')).toEqual({ ok: true, phone: null });
  });

  it('keeps another country’s number given with its code', () => {
    expect(parsePhone('+44 7911 123456')).toEqual({ ok: true, phone: '+447911123456' });
    expect(parsePhone('+971 50 123 4567')).toEqual({ ok: true, phone: '+971501234567' });
  });

  it('refuses what is not a mobile number', () => {
    for (const raw of ['12345', '5876543210', '+91 5876543210', '+91 98765 4321', 'call me', '98765432101', '+0 123456789']) {
      expect(parsePhone(raw).ok, raw).toBe(false);
    }
  });
});

describe('formatPhone', () => {
  it('spaces an Indian number the way it is read aloud', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
  });

  it('leaves another country’s number as stored', () => {
    expect(formatPhone('+447911123456')).toBe('+447911123456');
  });
});
