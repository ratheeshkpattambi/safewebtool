// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Scalable tool directory UI', () => {
  test('home page search and generated navigation expose tools cleanly', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('nav a[href="/image"]')).toBeVisible();
    await expect(page.locator('nav li.group')).toHaveCount(0);

    // The home page has its own prominent search, so the header one is hidden here to
    // avoid showing two identical search boxes.
    await expect(page.locator('[data-nav-search]')).toBeHidden();

    await page.locator('#homeToolSearch').fill('timer');
    await expect(page.locator('[data-tool-card][data-tool-path="time/timer"]').first()).toBeVisible();
  });

  test('header search is available off the home page and links canonical URLs', async ({ page }) => {
    await page.goto('/image');

    await expect(page.locator('#globalToolSearch')).toBeVisible();
    await page.locator('#globalToolSearch').fill('passport');
    await expect(page.locator('#globalToolSearchResults')).toBeVisible();
    await expect(page.locator('#globalToolSearchResults a[href="/image/passport"]')).toContainText('Passport Photo Maker');
  });

  test('category pages link tools by their canonical URL', async ({ page }) => {
    await page.goto('/image');

    // Cards must point at the short canonical URL, which the prerendered flat file
    // serves with a 200 — no redirect hop for crawlers or users.
    const passportCard = page.locator('[data-tool-card][data-tool-path="image/passport-photo"]');
    await expect(passportCard).toHaveAttribute('href', '/image/passport');
    await expect(passportCard).toBeVisible();
    await expect(page.locator('[data-tool-card][data-tool-path="image/compressor"]')).toBeVisible();

    // Search and category pills live in the header/home page only; the category page
    // itself is just the heading plus the grid.
    await expect(page.locator('#categoryToolFilter')).toHaveCount(0);
  });

  test('single HTML publishes site-level social preview metadata', async ({ request }) => {
    const htmlResponse = await request.get('/');
    expect(htmlResponse.ok()).toBe(true);
    const html = await htmlResponse.text();
    expect(html).toContain('property="og:image" content="https://safewebtool.com/og/safewebtool.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');

    const imageResponse = await request.get('/og/safewebtool.png');
    expect(imageResponse.ok()).toBe(true);
    expect(imageResponse.headers()['content-type']).toContain('image/png');
  });
});
