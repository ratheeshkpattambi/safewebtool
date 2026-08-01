// @ts-check
/**
 * FFmpeg load verification — confirms CDN loading works, MT/ST detection is correct,
 * and loading completes in < 60 seconds with no fatal errors.
 *
 * Run: npm run test:ffmpeg
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_MP4 = path.join(__dirname, 'fixtures', 'sample.mp4');

/** Click Process, tolerating click interception on mobile viewports. */
async function startProcessing(page) {
  const btn = page.locator('#processBtn');
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ timeout: 5000 }).catch(() => btn.click({ force: true }));
}

test.describe('FFmpeg loading', () => {
  test('FFmpeg loads from CDN in < 60 seconds', async ({ page }) => {
    test.setTimeout(75_000);

    const loadStart = Date.now();

    await page.goto('/video/mp4');
    await expect(page.locator('.tool-page')).toBeVisible();

    // Trigger the FFmpeg load. Tools load it lazily from inside processFile(), so the
    // file has to be selected AND Process clicked — selecting alone downloads nothing.
    const input = page.locator('#fileInput').or(page.locator('input[type="file"]')).first();
    await input.setInputFiles(FIXTURE_MP4);
    await startProcessing(page);

    // Poll logs until "FFmpeg loaded" appears or a fatal error is detected
    let mode = '';
    await expect.poll(
      async () => {
        const logs = await page.locator('#logContent').inputValue().catch(() => '');
        if (/All FFmpeg CDN sources failed/i.test(logs)) {
          throw new Error(`All CDN sources failed:\n${logs.slice(-600)}`);
        }
        const match = logs.match(/FFmpeg loaded \((multi-thread|single-thread)\)/i);
        if (match) {
          mode = match[1];
          return true;
        }
        return false;
      },
      { timeout: 65_000, intervals: [1000, 2000, 3000] }
    ).toBeTruthy();

    const elapsed = Date.now() - loadStart;
    expect(elapsed).toBeLessThan(60_000);

    // Mode should be one of the two valid values
    // Must be single-thread: the multi-threaded core deadlocks mid-encode (see the
    // comment in src/video/ffmpeg-utils.js). Catching a silent reintroduction here is
    // the point of asserting the exact mode rather than accepting either.
    expect(mode).toBe('single-thread');

    console.log(`FFmpeg loaded in ${(elapsed / 1000).toFixed(1)}s, mode: ${mode}`);
  });

  test('FFmpeg load log mentions a CDN source (jsDelivr or unpkg)', async ({ page }) => {
    test.setTimeout(75_000);

    await page.goto('/video/mp4');
    const input = page.locator('#fileInput').or(page.locator('input[type="file"]')).first();
    await input.setInputFiles(FIXTURE_MP4);
    await startProcessing(page);

    await expect.poll(
      async () => {
        const logs = await page.locator('#logContent').inputValue().catch(() => '');
        return /Loading FFmpeg.*from (jsDelivr|unpkg)/i.test(logs);
      },
      { timeout: 65_000, intervals: [1000, 2000] }
    ).toBeTruthy();

    const logs = await page.locator('#logContent').inputValue();
    // No local path fallback should appear
    expect(logs).not.toMatch(/Loading FFmpeg.*from \/ffmpeg/i);
    // No silent hang — should not have both "Loading" and then nothing for 3+ minutes
    expect(logs).not.toMatch(/All FFmpeg CDN sources failed/i);
  });
});
