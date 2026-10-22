import { BRAND } from '@/ui/brand.ts';

/** The live address (D30): canonical links, the sitemap and structured data all point here. */
export const SITE_URL = `https://${BRAND.domain}`;

/** Structured data as a `<script type="application/ld+json">` body. `<` is escaped so the data can never close the tag (Next.js's JSON-LD guide). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Who runs the site, for search and AI engines: schema.org Organization and WebSite. */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: BRAND.name, url: SITE_URL, logo: `${SITE_URL}/apple-icon` },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: BRAND.name, url: SITE_URL, inLanguage: 'en-IN', publisher: { '@id': `${SITE_URL}/#org` } },
    ],
  };
}
