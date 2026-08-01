// @ts-check
import { test, expect } from '@playwright/test';

async function clickProcess(page) {
  const button = page.locator('#processBtn');
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await button.click({ timeout: 5000 });
  } catch {
    await button.click({ force: true });
  }
}

async function expectImageToolReady(page, route) {
  await page.goto(route);
  await expect(page.locator('.tool-page')).toBeVisible();
  await expect(page.locator('.file-select-btn').first()).toBeVisible();
  await expect(page.locator('#logHeader')).toBeVisible();
  await expect(page.locator('#logContent')).toHaveCount(1);
  await expect(page.locator('#progress')).toHaveCount(1);
  await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

  // Process starts disabled until an image is loaded — that is the intended UX. Load the
  // tool's own built-in sample (the button this suite is named for) to enable it.
  await expect(page.locator('#processBtn')).toBeDisabled();
  await page.locator('#sampleImageBtn').click();
  await expect(page.locator('#processBtn')).toBeEnabled();
}

async function expectProcessedResult(page, { outputSelector = '#output-image' }) {
  // No "is an image loaded yet" poll here: expectImageToolReady already proved it by
  // asserting #processBtn went from disabled to enabled. The old poll looked for a
  // #preview element and an "Image loaded:" log line, neither of which the crop tool
  // produces when using its built-in sample, so it just burned a 10s timeout.
  const initialLogs = await page.locator('#logContent').inputValue().catch(() => '');
  await clickProcess(page);

  await expect.poll(async () => {
    const logs = await page.locator('#logContent').inputValue().catch(() => '');
    return logs.length > initialLogs.length;
  }, { timeout: 10000, intervals: [250, 500, 1000] }).toBeTruthy();

  await expect.poll(async () => {
    const logs = await page.locator('#logContent').inputValue().catch(() => '');
    if (/error/i.test(logs) && !/Loaded built-in sample image/i.test(logs)) {
      if (/Compression error|Error:|✗ ERROR:/i.test(logs)) return `failed:${logs.slice(-400)}`;
    }

    const outputVisible = await page.locator(outputSelector).isVisible().catch(() => false);
    const downloadReady = await page.locator('#downloadContainer a[download]').count().then(c => c > 0);
    return outputVisible && downloadReady ? 'success' : 'pending';
  }, { timeout: 20000, intervals: [250, 500, 1000] }).toBe('success');

  await expect(page.locator(outputSelector)).toBeVisible();
  await expect(page.locator('#downloadContainer a[download]')).toBeVisible();
}

test.describe('Image Tools E2E (direct URL + built-in sample)', () => {
  test.describe.configure({ mode: 'serial' });

  test('image/resize loads directly and resizes sample image', async ({ page }) => {
    await expectImageToolReady(page, '/image/resize');
    await page.fill('#width', '320');
    await expectProcessedResult(page, { outputSelector: '#output-image' });
  });

  test('image/compressor loads directly and compresses sample image', async ({ page }) => {
    await expectImageToolReady(page, '/image/compressor');
    await page.fill('#quality', '0.55');
    await page.dispatchEvent('#quality', 'input');
    await expectProcessedResult(page, { outputSelector: '#compressed-image' });
  });

  test('image/crop loads directly and crops sample image via canvas drag', async ({ page }) => {
    await expectImageToolReady(page, '/image/crop');

    const canvas = page.locator('#cropCanvas');
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();

    const initialWidth = parseInt(await page.locator('#cropReadout').getAttribute('data-crop-width'), 10);

    // The default selection covers the centered 80% of the image, so its
    // south-east handle sits at 90%/90% of the canvas. Drag it toward the centre.
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.9);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
    await page.mouse.up();

    const newWidth = parseInt(await page.locator('#cropReadout').getAttribute('data-crop-width'), 10);
    const newHeight = parseInt(await page.locator('#cropReadout').getAttribute('data-crop-height'), 10);
    expect(newWidth).toBeLessThan(initialWidth);
    expect(newHeight).toBeGreaterThan(0);

    await expectProcessedResult(page, { outputSelector: '#output-image' });
  });
});
