/** Under 18 on `today`. The database applies the same rule when a test starts (start_session, 0001). */
export function isMinor(dob: string, today = new Date()): boolean {
  const d = new Date(`${dob}T00:00:00Z`);
  const eighteenth = new Date(Date.UTC(d.getUTCFullYear() + 18, d.getUTCMonth(), d.getUTCDate()));
  return today < eighteenth;
}
