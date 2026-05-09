// @ts-check
import { test, expect } from '@playwright/test';

test.describe.skip('Passport Photo Maker acceptance criteria (pre-implementation)', () => {
  test('loads as a local-only image tool with context and privacy copy', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.locator('.tool-page')).toBeVisible();
    await expect(page.locator('.tool-page h1').first()).toContainText(/Passport Photo/i);
    await expect(page.getByText(/photo stays/i)).toBeVisible();
    await expect(page.getByText(/no upload/i)).toBeVisible();
  });

  test('defaults to a US passport 2x2 preset and exposes official-size guidance', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.locator('[data-testid="preset-select"]')).toContainText(/United States.*Passport/i);
    await expect(page.locator('[data-testid="output-size"]')).toContainText('600 x 600');
    await expect(page.locator('[data-testid="guide-overlay"]')).toBeVisible();
    await expect(page.getByText(/2 x 2/i)).toBeVisible();
  });

  test('keeps the first version manual and does not default to AI retouching', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.getByRole('button', { name: /retouch|beautify|enhance/i })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: /remove background/i })).toHaveCount(0);
    await expect(page.getByText(/guides do not guarantee acceptance/i)).toBeVisible();
  });

  test('renders a local preview from an uploaded image without network upload', async ({ page }) => {
    const requests = [];
    page.on('request', request => requests.push(request.url()));

    await page.goto('/image/passport-photo');
    await page.setInputFiles('#fileInput', 'tests/fixtures/passport-source.jpg');

    await expect(page.locator('[data-testid="crop-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="guide-overlay"]')).toBeVisible();

    const uploadRequests = requests.filter(url => /upload|api|photo|passport/i.test(url) && !url.startsWith(page.url().split('/image/')[0]));
    expect(uploadRequests).toEqual([]);
  });

  test('exports a US visa JPEG at 600x600 under the 240KB target', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await page.setInputFiles('#fileInput', 'tests/fixtures/passport-source.jpg');
    await page.locator('[data-testid="preset-select"]').selectOption('us-visa-digital');
    await page.getByRole('button', { name: /download digital/i }).click();

    const result = await page.locator('[data-testid="last-export"]').evaluate(element => ({
      width: Number(element.getAttribute('data-width')),
      height: Number(element.getAttribute('data-height')),
      mime: element.getAttribute('data-mime'),
      bytes: Number(element.getAttribute('data-bytes'))
    }));

    expect(result).toEqual(expect.objectContaining({
      width: 600,
      height: 600,
      mime: 'image/jpeg'
    }));
    expect(result.bytes).toBeLessThanOrEqual(240 * 1024);
  });

  test('exports a 4x6 print sheet at 300 DPI pixel dimensions', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await page.setInputFiles('#fileInput', 'tests/fixtures/passport-source.jpg');
    await page.getByRole('button', { name: /download print sheet/i }).click();

    const result = await page.locator('[data-testid="last-print-sheet"]').evaluate(element => ({
      width: Number(element.getAttribute('data-width')),
      height: Number(element.getAttribute('data-height')),
      copies: Number(element.getAttribute('data-copies'))
    }));

    expect(result.width).toBe(1200);
    expect(result.height).toBe(1800);
    expect(result.copies).toBeGreaterThanOrEqual(2);
  });

  test('keeps the mobile flow usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/image/passport-photo');

    await expect(page.locator('[data-testid="preset-select"]')).toBeVisible();
    await expect(page.locator('#fileInput')).toBeAttached();
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
