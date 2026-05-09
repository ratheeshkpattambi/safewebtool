// @ts-check
import { test, expect } from '@playwright/test';

async function createSyntheticPortraitFile(page) {
  // Synthetic fixture keeps validation repeatable without storing real biometric photos.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#dbeafe');
    ctx.fillStyle = gradient;
    ctx.fillRect(130, 80, 640, 1040);

    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.ellipse(450, 930, 230, 220, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f2c9a5';
    ctx.beginPath();
    ctx.ellipse(450, 515, 155, 205, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#33251d';
    ctx.beginPath();
    ctx.ellipse(450, 350, 170, 95, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(395, 505, 12, 0, Math.PI * 2);
    ctx.arc(505, 505, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(450, 570, 58, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fillRect(150, 100, 600, 980);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    const buffer = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });

  return {
    name: 'synthetic-passport-source.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(bytes)
  };
}

async function uploadSyntheticPortrait(page) {
  await page.setInputFiles('#fileInput', await createSyntheticPortraitFile(page));
  await expect(page.locator('#emptyState')).toBeHidden();
  await expect(page.locator('#downloadDigitalBtn')).toBeEnabled();
}

test.describe('Passport Photo Maker acceptance criteria', () => {
  test('loads as a local-only image tool with context and privacy copy', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.locator('.tool-page')).toBeVisible();
    await expect(page.locator('.tool-page h1').first()).toContainText(/Passport Photo/i);
    await expect(page.getByText(/processed locally and never uploaded/i)).toBeVisible();
    await expect(page.getByText('No upload', { exact: true })).toBeVisible();
  });

  test('defaults to a US passport 2x2 preset and exposes official-size guidance', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.locator('[data-testid="preset-select"]')).toHaveValue('us-passport');
    await expect(page.locator('[data-testid="preset-select"]')).toContainText(/US Passport/i);
    await expect(page.locator('[data-testid="output-size"]')).toContainText('600 x 600');
    await expect(page.locator('[data-testid="crop-canvas"]')).toBeVisible();
    await expect(page.getByText(/2 x 2/i)).toBeVisible();
  });

  test('keeps the first version manual and does not default to AI retouching', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await expect(page.getByRole('button', { name: /retouch|beautify|enhance/i })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: /remove background/i })).toHaveCount(0);
    await expect(page.getByText(/do not guarantee government acceptance/i)).toBeVisible();
  });

  test('renders a local preview from an uploaded image without network upload', async ({ page }) => {
    const requests = [];

    await page.goto('/image/passport-photo');
    page.on('request', request => requests.push(request.url()));
    await uploadSyntheticPortrait(page);

    await expect(page.locator('[data-testid="crop-canvas"]')).toBeVisible();

    const origin = new URL(page.url()).origin;
    const uploadRequests = requests.filter(url => !url.startsWith(origin) && /upload|api|photo|passport/i.test(url));
    expect(uploadRequests).toEqual([]);
  });

  test('exports a US visa JPEG at 600x600 under the 240KB target', async ({ page }) => {
    await page.goto('/image/passport-photo');
    await uploadSyntheticPortrait(page);
    await page.locator('[data-testid="preset-select"]').selectOption('us-visa-digital');
    await page.getByRole('button', { name: /download digital/i }).click();
    await expect(page.locator('[data-testid="last-export"]')).toHaveAttribute('data-mime', 'image/jpeg');

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
    await uploadSyntheticPortrait(page);
    await page.getByRole('button', { name: /download print sheet/i }).click();
    await expect(page.locator('[data-testid="last-print-sheet"]')).toHaveAttribute('data-width', '1200');

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
