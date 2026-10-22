import { describe, it, expect } from 'vitest';
import robots from '../robots.ts';
import sitemap from '../sitemap.ts';
import { PUBLIC_PAGES } from '@/lib/auth/routing.ts';
import { SITE_URL } from '@/lib/site.ts';

/** What crawlers and AI search engines are told about the site. */
describe('robots.txt', () => {
  it('lets every crawler in, AI ones included, and points at the sitemap', () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe('sitemap.xml', () => {
  it('lists every public page at the live address, and nothing else', () => {
    expect(sitemap().map((e) => e.url)).toEqual(PUBLIC_PAGES.map((p) => (p === '/' ? SITE_URL : `${SITE_URL}${p}`)));
  });
});
