import { BRAND } from '../brand.ts';

/**
 * The message staff send a login over WhatsApp (D31): where, then what to
 * type. Built where the password is shown, which is the only time it exists.
 */

export interface LoginToSend {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  /** An under-18 without guardian consent: signs in, but cannot start a test. */
  readonly needsConsent: boolean;
}

export function loginMessage({ fullName, email, password, needsConsent }: LoginToSend): string {
  const first = fullName.trim().split(/\s+/)[0];
  const lines = [`Hi ${first}, your ${BRAND.name} login:`, `${BRAND.domain}/login`, `Email: ${email}`, `Password: ${password}`];
  if (needsConsent) lines.push('Tests unlock once your academy records guardian consent.');
  return lines.join('\n');
}

/** WhatsApp with the message filled in: that person's chat if there is a number, otherwise WhatsApp asks who to send it to. */
export function whatsappHref(text: string, phone: string | null): string {
  return `https://wa.me/${phone ? phone.replace(/^\+/, '') : ''}?text=${encodeURIComponent(text)}`;
}
