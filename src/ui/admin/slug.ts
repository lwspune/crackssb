/** An academy's name to the short name in its address: `LWS Pune` → `lws-pune`. Matches organisations.slug's CHECK (0001). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}
