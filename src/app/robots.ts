import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site.ts';

/**
 * Every crawler is welcome, AI search and answer engines included: they are how
 * candidates find the site. Pages behind sign-in redirect to /login, so there is
 * nothing private to block here.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${SITE_URL}/sitemap.xml` };
}
