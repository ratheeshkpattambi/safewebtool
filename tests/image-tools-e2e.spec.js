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
  await expect(page.locator('#processBtn')).toBeEnabled();
}

async function expectProcessedResult(page, { outputSelector = '#output-image' }) {
  await expect.poll(async () => {
    const previewSrc = await page.locator('#preview').getAttribute('src').catch(() => '');
    const logs = await page.locator('#logContent').inputValue().catch(() => '');
    return Boolean(previewSrc) || /Image loaded:/i.test(logs);
  }, { timeout: 10000, intervals: [200, 500, 1000] }).toBeTruthy();

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

  test('image/crop loads directly and crops sample image', async ({ page }) => {
    await expectImageToolReady(page, '/image/crop');
    await page.fill('#cropX', '80');
    await page.fill('#cropY', '60');
    await page.fill('#cropWidth', '280');
    await page.fill('#cropHeight', '180');
    await expectProcessedResult(page, { outputSelector: '#output-image' });
  });
});
