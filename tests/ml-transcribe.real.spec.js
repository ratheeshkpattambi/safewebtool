// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Real transcription for ml/transcribe. Downloads real Whisper weights and transcribes
 * the tool's own default sample (JFK's inaugural address excerpt, auto-loaded and
 * auto-enabled on init), so this is slower than a fast smoke test.
 *
 * Before this spec, ml/transcribe had no dedicated test at all — only the generic
 * per-tool checks in all.spec.js, which for an `ml` category tool assert nothing more
 * than ".tool-page" being visible. Per CLAUDE.md, an ML tool needs a real end-to-end
 * test asserting on real output; a passing page with no verified inference is exactly
 * the trap that has shipped dead ML tools here twice before.
 */
test.describe.configure({ timeout: 300000 });

test.describe('Audio/Video Transcription — real inference', () => {
  test('transcribes the default sample into recognizable text', async ({ page }) => {
    await page.goto('/ml/transcribe');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    // The tool auto-loads a default sample URL and enables Process on init.
    await expect(page.locator('#transcribe-process-btn')).toBeEnabled({ timeout: 15000 });
    await page.locator('#transcribe-process-btn').click();

    await expect
      .poll(
        async () => {
          const log = await page.locator('#logContent').inputValue();
          if (/error/i.test(log)) throw new Error(`Tool reported an error:\n${log}`);
          return page.locator('#transcribe-result-text').textContent();
        },
        { timeout: 280000, message: 'transcription never completed' }
      )
      .not.toBe('');

    const text = ((await page.locator('#transcribe-result-text').textContent()) || '').toLowerCase();

    expect(text.length).toBeGreaterThan(20);
    // The default sample is JFK's "ask not what your country can do for you" excerpt.
    expect(text).toMatch(/country|ask|fellow/);
  });
});
