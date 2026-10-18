import { describe, it, expect } from 'vitest';
import { loginMessage, whatsappHref } from '../login-message.ts';

/**
 * The message staff send a new login over WhatsApp (D31). Terse, and in the
 * order the reader needs it: where, then what to type.
 */
const login = { fullName: 'Arjun Mehta', email: 'arjun@example.com', password: 'Cadet@2026', needsConsent: false };

describe('loginMessage', () => {
  it('greets by first name and gives the address, email and password, one per line', () => {
    expect(loginMessage(login)).toBe(
      ['Hi Arjun, your CadetPrep login:', 'cadetprep.in/login', 'Email: arjun@example.com', 'Password: Cadet@2026'].join('\n'),
    );
  });

  it('says tests are locked until guardian consent is recorded, for an under-18 without it', () => {
    expect(loginMessage({ ...login, needsConsent: true })).toMatch(/\nTests unlock once your academy records guardian consent\.$/);
  });

  it('greets a one-word name as it is', () => {
    expect(loginMessage({ ...login, fullName: '  Zorawar ' })).toMatch(/^Hi Zorawar, /);
  });
});

describe('whatsappHref', () => {
  it('opens the chat with that number, message filled in', () => {
    const href = whatsappHref('Hi there\nLine 2', '+919876543210');
    expect(href).toBe('https://wa.me/919876543210?text=Hi%20there%0ALine%202');
  });

  it('lets the sender pick the chat when there is no number', () => {
    expect(whatsappHref('Hi', null)).toBe('https://wa.me/?text=Hi');
  });
});
