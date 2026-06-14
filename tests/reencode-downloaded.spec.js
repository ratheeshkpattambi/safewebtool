// @ts-check
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const SAMPLE_MP4 = fileURLToPath(new URL('./fixtures/sample.mp4', import.meta.url));

async function clickProcessButton(page) {
  const button = page.locator('#processBtn');
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded().catch(() => {});

  try {
    await button.click({ timeout: 5000 });
  } catch {
    await button.click({ force: true });
  }
}

test.describe('Video Re-encode Downloaded File', () => {
  test('re-encodes a downloaded sample MP4 to WebM', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/video/reencode');
    await expect(page.locator('.tool-page')).toBeVisible();

    await page.setInputFiles('#fileInput', SAMPLE_MP4);
    await page.selectOption('#format', 'webm');
    await page.fill('#bitrate', '900');
    await clickProcessButton(page);

    const outputVideo = page.locator('#output-video');
    const downloadLink = page.locator('#downloadContainer a[download]');
    const logContent = page.locator('#logContent');

    await expect.poll(async () => {
      const logs = await logContent.inputValue().catch(() => '');
      if (logs.includes('FFmpeg command failed') || logs.includes('Error: FFmpeg exited')) {
        return `failed:${logs.slice(-300)}`;
      }

      const visible = await outputVideo.isVisible().catch(() => false);
      const hasDownload = await downloadLink.count().then(c => c > 0);
      return visible && hasDownload ? 'success' : 'pending';
    }, { timeout: 120000, intervals: [500, 1000, 2000] }).toBe('success');

    await expect(outputVideo).toBeVisible();
    await expect(downloadLink).toBeVisible();
  });
});
