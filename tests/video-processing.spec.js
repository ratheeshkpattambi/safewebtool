// @ts-check
/**
 * Video processing tests — verifies actual FFmpeg output, not just DOM structure.
 *
 * These tests upload the tiny sample fixture (≤20KB), trigger processing,
 * and assert that a non-empty output file is produced with no ERROR in logs.
 *
 * Run: npm run test:video-fast
 *
 * Each test is isolated but FFmpeg WASM is cached by the browser across tests
 * in the same browser context, so only the first tool pays the full ~20s load cost.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_MP4 = path.join(__dirname, 'fixtures', 'sample.mp4');
const FIXTURE_GIF = path.join(__dirname, 'fixtures', 'sample.gif');

// Max time per tool: 90s covers first-load FFmpeg download + processing.
// Subsequent tools in serial mode benefit from the browser cache.
const TOOL_TIMEOUT = 90_000;
const FFMPEG_LOAD_TIMEOUT = 70_000;

/**
 * Wait for FFmpeg to finish loading (log shows "FFmpeg loaded").
 *
 * IMPORTANT: call this AFTER clickProcess(), never before. Tools load FFmpeg lazily
 * from inside processFile() — selecting a file does not start the download. Waiting for
 * the load before clicking Process waits for a log line that cannot appear yet, which
 * burns the full timeout and (because this describe block is serial) blocks every
 * remaining video test from running at all.
 */
async function waitForFFmpegLoad(page) {
  await expect.poll(
    async () => {
      const logs = await page.locator('#logContent').inputValue().catch(() => '');
      if (/All FFmpeg CDN sources failed/i.test(logs)) throw new Error('FFmpeg CDN failed');
      return /FFmpeg loaded/i.test(logs);
    },
    { timeout: FFMPEG_LOAD_TIMEOUT, intervals: [1000, 2000, 3000] }
  ).toBeTruthy();
}

/** Upload a file to the tool's drop zone via the hidden file input. */
async function uploadFile(page, fixturePath) {
  const input = page.locator('#fileInput').or(page.locator('input[type="file"]')).first();
  await input.setInputFiles(fixturePath);
}

/** Click the process button, tolerating interception on mobile viewports. */
async function clickProcess(page) {
  const btn = page.locator('#processBtn');
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await btn.click({ timeout: 5000 });
  } catch {
    await btn.click({ force: true });
  }
}

/**
 * Wait for a download link to appear in #downloadContainer.
 * Returns true on success, throws with log tail on fatal error.
 */
async function waitForDownload(page, { timeout = 70_000 } = {}) {
  await expect.poll(
    async () => {
      const logs = await page.locator('#logContent').inputValue().catch(() => '');
      // Fail fast on definitive error lines (skip generic FFmpeg verbose messages)
      if (/✗ ERROR:|FFmpeg command failed|All FFmpeg CDN sources failed/i.test(logs)) {
        throw new Error(`Processing failed:\n${logs.slice(-600)}`);
      }
      const count = await page.locator('#downloadContainer a[download]').count();
      return count > 0;
    },
    { timeout, intervals: [500, 1000, 2000] }
  ).toBeTruthy();
}

/** Assert logs have no fatal error markers. */
async function assertNoFatalError(page) {
  const logs = await page.locator('#logContent').inputValue().catch(() => '');
  expect(logs).not.toMatch(/All FFmpeg CDN sources failed/i);
  expect(logs).not.toMatch(/✗ ERROR:.*failed to load FFmpeg/i);
}

// Run all video processing tests serially so the FFmpeg WASM is cached
// by test 2 onward (shared browser context → cache hit).
test.describe('Video processing — actual FFmpeg output', () => {
  test.describe.configure({ mode: 'serial' });

  // ── video/gif ──────────────────────────────────────────────────────────
  // This one caught the multi-threaded-core deadlock: it hung here indefinitely (240s+
  // with no error and no progress) until the core was switched to single-thread.
  test('video/gif: converts sample MP4 to GIF', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/gif');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    const href = await page.locator('#downloadContainer a[download]').getAttribute('href');
    expect(href).toMatch(/^blob:/);
    await assertNoFatalError(page);
  });

  // ── video/mp4 ──────────────────────────────────────────────────────────
  test('video/mp4: converts sample to MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/mp4');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await expect(page.locator('#output-video')).toBeVisible();
    await assertNoFatalError(page);
  });

  // ── video/trim ─────────────────────────────────────────────────────────
  test('video/trim: trims sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/trim');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    // Defaults (0s to end) are fine for the tiny fixture
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await assertNoFatalError(page);
  });

  // ── video/reverse ──────────────────────────────────────────────────────
  test('video/reverse: reverses sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/reverse');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await assertNoFatalError(page);
  });

  // ── video/reencode ─────────────────────────────────────────────────────
  test('video/reencode: re-encodes sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/reencode');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await assertNoFatalError(page);
  });

  // ── video/resize ───────────────────────────────────────────────────────
  test('video/resize: resizes sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/resize');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    // Pick a small preset so it processes quickly
    const preset = page.locator('select[id*="resolution"], select[id*="preset"], select').first();
    if (await preset.count() > 0) {
      // Select 320p or the first option if available
      await preset.selectOption({ index: 0 }).catch(() => {});
    }
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await assertNoFatalError(page);
  });

  // ── video/audio ────────────────────────────────────────────────────────
  test('video/audio: strips audio from sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/audio');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    // Select "remove" mode if available, otherwise default is fine
    const removeBtn = page.locator('button:has-text("Remove"), input[value="remove"], #mode-remove').first();
    if (await removeBtn.count() > 0) await removeBtn.click().catch(() => {});
    await clickProcess(page);
    await waitForFFmpegLoad(page);
    await waitForDownload(page);
    await assertNoFatalError(page);
  });

  // ── video/info ─────────────────────────────────────────────────────────
  // Info tool auto-processes on upload — no processBtn.
  test('video/info: extracts metadata from sample MP4', async ({ page }) => {
    test.setTimeout(TOOL_TIMEOUT);
    await page.goto('/video/info');
    await expect(page.locator('.tool-page')).toBeVisible();
    await uploadFile(page, FIXTURE_MP4);
    // Assert on real decoded metadata, not just "a table exists". The container shows
    // filename/size/type from the File object before FFmpeg runs at all, so polling for
    // any row passed even while the probe was erroring and no codec was ever extracted.
    await expect.poll(
      async () => {
        const logs = await page.locator('#logContent').inputValue().catch(() => '');
        if (/All FFmpeg CDN sources failed/i.test(logs)) throw new Error('FFmpeg CDN failed');
        return page.locator('#videoInfoContainer table tr').count();
      },
      { timeout: FFMPEG_LOAD_TIMEOUT, intervals: [500, 1000, 2000] }
    ).toBeGreaterThan(6);

    const info = await page.locator('#videoInfoContainer').innerText();
    expect(info).toMatch(/h264/i);
    expect(info).toMatch(/320/);
    expect(info).toMatch(/Frame Rate/i);
    await assertNoFatalError(page);
  });
});
