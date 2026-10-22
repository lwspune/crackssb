import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES } from '@/lib/auth/routing.ts';
import { SITE_URL } from '@/lib/site.ts';

/** The public pages at the live address. A new public page goes in PUBLIC_PAGES and appears here. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({ url: p === '/' ? SITE_URL : `${SITE_URL}${p}` }));
}
