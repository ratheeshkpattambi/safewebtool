// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Scalable tool directory UI', () => {
  test('home page search and generated navigation expose tools cleanly', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('nav a[href="/image"]')).toBeVisible();
    await expect(page.locator('nav li.group')).toHaveCount(0);
    await expect(page.locator('#globalToolSearch')).toBeVisible();

    await page.locator('#globalToolSearch').fill('passport');
    await expect(page.locator('#globalToolSearchResults')).toBeVisible();
    await expect(page.locator('#globalToolSearchResults a[href="/image/passport"]')).toContainText('Passport Photo Maker');

    await page.locator('#homeToolSearch').fill('timer');
    await expect(page.locator('[data-tool-card][data-tool-path="time/timer"]').first()).toBeVisible();
  });

  test('category pages use canonical direct tool URLs and local filtering', async ({ page }) => {
    await page.goto('/image');

    const passportCard = page.locator('[data-tool-card][data-tool-path="image/passport-photo"]');
    await expect(passportCard).toHaveAttribute('href', '/image/passport');

    await page.locator('#categoryToolFilter').fill('passport');
    await expect(passportCard).toBeVisible();
    await expect(page.locator('[data-tool-card][data-tool-path="image/compressor"]')).toBeHidden();
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
