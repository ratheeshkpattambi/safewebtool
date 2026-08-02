// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Fast tests only — no model download, so these run in seconds.
 *
 * Real synthesis (an ~92 MB download plus inference) lives in
 * ml-text-to-speech.real.spec.js and is opt-in.
 *
 * Per CLAUDE.md these assert on real derived state, not merely that elements exist:
 * the voice list is rendered from the mirrored-voice list in the module, and the
 * Speak button's enabled state is driven by actual input.
 */
test.describe('Text to Speech', () => {
  test('renders with voices and a disabled Speak button', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    // Speak must start disabled — there is no text to speak yet.
    await expect(page.locator('#processBtn')).toBeDisabled();

    // Audio output must stay hidden until a result exists.
    await expect(page.locator('#audioOutput')).toBeHidden();

    // Voices come from the mirrored-voice list; assert the real content, not a count of 0.
    const voices = page.locator('#voiceSelect option');
    await expect(voices).toHaveCount(10);
    await expect(page.locator('#voiceSelect')).toHaveValue('af_heart');
    await expect(voices.first()).toContainText('American English');
  });

  test('typing enables Speak and updates the character count', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#inputText').fill('Hello from SafeWebTool.');
    await expect(page.locator('#processBtn')).toBeEnabled();
    await expect(page.locator('#charCount')).toHaveText('23');

    await page.locator('#inputText').fill('');
    await expect(page.locator('#processBtn')).toBeDisabled();
    await expect(page.locator('#charCount')).toHaveText('0');
  });

  test('speed slider reflects its value', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await expect(page.locator('#speedValue')).toHaveText('1.0');
    await page.locator('#speedRange').fill('1.5');
    await expect(page.locator('#speedValue')).toHaveText('1.5');
  });

  /**
   * Regression guard for the fetch shim in ml-loader.js.
   *
   * kokoro-js hardcodes its voice URLs to huggingface.co and ignores env.remoteHost.
   * Without the shim, the model would load from our mirror while every voice silently
   * came from the Hub — defeating the point of self-hosting.
   *
   * This asserts on `toMirrorUrl` directly rather than on intercepted requests, for two
   * reasons learned the hard way:
   *   1. Playwright's page.route does NOT intercept Web Worker traffic, so an
   *      "expect no Hub requests" test passes vacuously and proves nothing.
   *   2. The browser Cache API keys on the ORIGINAL Hub URL even when the fetch was
   *      rewritten, so cache contents are not evidence of origin either.
   * ml-loader.js injects this exact function into the worker via .toString(), so what
   * is asserted here is what actually runs.
   */
  test('rewrites Hub URLs to the mirror at the pinned revision', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    const result = await page.evaluate(async () => {
      const m = await import('/src/common/ml-models.js');
      const hubVoice =
        'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin';
      const kokoro = m.MODELS['kokoro-82m'];
      return {
        usingMirror: m.USING_MIRROR,
        modelHost: m.MODEL_HOST,
        rewrittenVoice: m.mirrorUrlFor(hubVoice),
        pinnedRevision: kokoro.revision,
        // Unrelated hosts must pass through untouched.
        untouched: m.mirrorUrlFor('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/x.js'),
        // A Hub repo we do not mirror must pass through untouched.
        unmirrored: m.mirrorUrlFor('https://huggingface.co/some/other-repo/resolve/main/a.json'),
      };
    });

    test.skip(!result.usingMirror, 'VITE_MODEL_HOST is unset — running against the Hub');

    // Host rewritten AND the floating "main" replaced by the pinned SHA.
    expect(result.rewrittenVoice).toBe(
      `${result.modelHost}onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${result.pinnedRevision}/voices/af_heart.bin`
    );
    expect(result.rewrittenVoice).not.toContain('huggingface.co');
    expect(result.rewrittenVoice).not.toContain('/resolve/main/');

    expect(result.untouched).toContain('cdn.jsdelivr.net');
    expect(result.unmirrored).toContain('huggingface.co');
  });

  /**
   * Every voice offered in the UI must actually be mirrored, or picking it 404s at
   * generate time. Cheap check that would otherwise only surface as a user-visible bug.
   */
  test('every offered voice is mirrored to R2', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    const { offered, mirrored } = await page.evaluate(async () => {
      const m = await import('/src/common/ml-models.js');
      return {
        offered: [...document.querySelectorAll('#voiceSelect option')].map((o) => o.value),
        mirrored: m.MODELS['kokoro-82m'].files
          .filter((f) => f.startsWith('voices/'))
          .map((f) => f.replace('voices/', '').replace('.bin', '')),
      };
    });

    expect(offered.length).toBeGreaterThan(0);
    expect(offered.sort()).toEqual(mirrored.sort());
  });
});
