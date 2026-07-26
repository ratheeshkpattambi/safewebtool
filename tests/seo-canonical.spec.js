// @ts-check
import { test, expect } from '@playwright/test';
import { baseUrl, categories, getCanonicalPathForToolPath, tools } from '../src/common/metadata.js';
import { generateSitemap } from '../src/common/sitemap.js';

/**
 * Search Console reported "Duplicate without user-selected canonical" and left 23 of 30
 * tool pages unindexed. The cause: the prerenderer wrote each route to
 * <route>/index.html, which Netlify only serves at the trailing-slash URL — the bare
 * path 301s to it. Since the sitemap and every <link rel="canonical"> pointed at the
 * bare path, every canonical URL Google was given was a redirect, and a redirect cannot
 * be indexed as a canonical.
 *
 * Routes are now written as flat <route>.html files, which Netlify serves directly at
 * the short extensionless URL with a 200. These tests pin that invariant: the URL a page
 * declares as canonical is the short form, is self-referential, and is exactly what the
 * sitemap lists.
 */
test.describe('SEO canonical URLs', () => {
  const sitemapLocs = generateSitemap(baseUrl)
    .split('\n')
    .map(line => line.match(/<loc>(.*)<\/loc>/)?.[1])
    .filter(Boolean);

  test('sitemap URLs use the short form, never a trailing slash', () => {
    expect(sitemapLocs.length).toBeGreaterThan(0);
    // The site root is the one legitimate trailing slash.
    const offenders = sitemapLocs.filter(loc => loc.endsWith('/') && loc !== `${baseUrl}/`);
    expect(offenders, `sitemap URLs with a redirecting trailing slash: ${offenders.join(', ')}`).toEqual([]);
  });

  test('sitemap lists each page exactly once, by its canonical URL only', () => {
    expect(new Set(sitemapLocs).size).toBe(sitemapLocs.length);

    // image/passport-photo canonicalises to the shorter /image/passport, so only that
    // alias belongs in the sitemap — listing both hands Google two URLs for one page.
    for (const toolPath of Object.keys(tools)) {
      const canonical = `${baseUrl}${getCanonicalPathForToolPath(toolPath)}`;
      expect(sitemapLocs).toContain(canonical);
      const bare = `${baseUrl}/${toolPath}`;
      if (bare !== canonical) {
        expect(sitemapLocs).not.toContain(bare);
      }
    }
  });

  test('sitemap covers the home page and every category', () => {
    expect(sitemapLocs).toContain(`${baseUrl}/`);
    for (const categoryId of Object.keys(categories)) {
      expect(sitemapLocs).toContain(`${baseUrl}/${categoryId}`);
    }
  });

  // A representative page per kind: tool, category, alias, home.
  const pages = [
    { url: '/video/mp4', canonical: `${baseUrl}/video/mp4` },
    { url: '/time/timer', canonical: `${baseUrl}/time/timer` },
    { url: '/image', canonical: `${baseUrl}/image` },
    { url: '/', canonical: `${baseUrl}/` },
    // Both spellings of the passport tool must agree on the one canonical URL.
    { url: '/image/passport', canonical: `${baseUrl}/image/passport` },
    { url: '/image/passport-photo', canonical: `${baseUrl}/image/passport` }
  ];

  for (const { url, canonical } of pages) {
    test(`${url} declares canonical ${canonical}`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    });
  }

  test('trailing-slash URLs still resolve and point back at the short canonical', async ({ page }) => {
    await page.goto('/video/mp4/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseUrl}/video/mp4`);
    await expect(page.locator('.tool-page')).toBeVisible();
  });
});
