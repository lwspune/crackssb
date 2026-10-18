/**
 * A password typed by staff for someone, or by a person for themselves (D31).
 * It travels over WhatsApp and is typed on a phone, so the rules are few and
 * each says what to change. Pure: the screen and the server share it. 72 is
 * where the auth server's hashing stops reading.
 */

/** No 0/O/o, 1/l/I — the password is read off a screen and typed by someone else. */
export const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Web Crypto, so the server and the "Generate" button share it. Rejection sampling keeps every character equally likely. */
export function generatePassword(length = 16): string {
  const n = PASSWORD_ALPHABET.length;
  const limit = 256 - (256 % n);
  let out = '';
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit && out.length < length) out += PASSWORD_ALPHABET[b % n];
    }
  }
  return out;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const squash = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, '');

export function passwordProblem(password: string, who: { readonly email: string; readonly fullName: string }): string | null {
  if (password.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `At most ${PASSWORD_MAX} characters.`;
  if (password.trim() !== password) return 'No spaces at the start or end.';
  const p = squash(password);
  const email = who.email.toLowerCase();
  const guessable = [email, email.split('@')[0], who.fullName].map(squash).filter((s) => s.length > 0);
  if (guessable.includes(p)) return 'Too easy to guess: it is the name or email.';
  return null;
}
