import { describe, it, expect } from 'vitest';
import { SITE_URL, jsonLd, siteJsonLd } from '../site.ts';

describe('SITE_URL', () => {
  it('is the live address over https, with no trailing slash', () => {
    expect(SITE_URL).toBe('https://cadetprep.in');
  });
});

describe('jsonLd — structured data as a script body', () => {
  it('cannot close its own script tag, whatever the data holds', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});

describe('siteJsonLd — who runs the site, for search and AI engines', () => {
  it('names the organisation and the website at the live address', () => {
    const graph = siteJsonLd()['@graph'];
    expect(graph.map((n) => n['@type'])).toEqual(['Organization', 'WebSite']);
    for (const n of graph) {
      expect(n.name).toBe('CadetPrep');
      expect(n.url).toBe(SITE_URL);
    }
  });
});
