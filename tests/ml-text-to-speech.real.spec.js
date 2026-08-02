// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Opt-in end-to-end synthesis. Downloads ~98 MB of model weights and runs real
 * inference, so it is NOT part of the fast suite.
 *
 *   npx playwright test tests/ml-text-to-speech.real.spec.js --project=chromium-desktop
 *
 * This exists because the fast tests cannot catch the failures that actually happened
 * while building this tool: a worker that died on startup from an unresolvable bare
 * import, and an "Invalid dtype" rejection from kokoro-js. Both left the UI looking
 * perfectly healthy — exactly the trap CLAUDE.md warns about. Assert on real decoded
 * audio, never on element presence.
 */
test.describe('Text to Speech — real synthesis', () => {
  test.describe.configure({ timeout: 300000 });

  test('generates decodable, non-silent audio', async ({ page }) => {
    await page.goto('/ml/text-to-speech');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#inputText').fill('Hello from SafeWebTool.');
    await page.locator('#processBtn').click();

    // Surface the tool's own error text rather than a bare timeout.
    await expect
      .poll(async () => {
        const log = await page.locator('#logContent').inputValue();
        if (/ERROR/i.test(log)) throw new Error(`Tool reported an error:\n${log}`);
        return page.locator('#outputAudio').getAttribute('data-audio-bytes');
      }, { timeout: 280000, message: 'audio was never produced' })
      .not.toBeNull();

    await expect(page.locator('#audioOutput')).toBeVisible();
    await expect(page.locator('#downloadBtn')).toBeEnabled();

    // Decode the WAV and confirm it is real audio, not an empty or silent buffer.
    const audio = await page.evaluate(async () => {
      const el = /** @type {HTMLAudioElement} */ (document.getElementById('outputAudio'));
      const buf = await (await fetch(el.src)).arrayBuffer();
      const riff = new TextDecoder().decode(buf.slice(0, 4));
      const wave = new TextDecoder().decode(buf.slice(8, 12));
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      const ch = decoded.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < ch.length; i += 1) peak = Math.max(peak, Math.abs(ch[i]));
      return { riff, wave, bytes: buf.byteLength, duration: decoded.duration, peak };
    });

    expect(audio.riff).toBe('RIFF');
    expect(audio.wave).toBe('WAVE');
    expect(audio.bytes).toBeGreaterThan(10000);
    expect(audio.duration).toBeGreaterThan(0.5);
    expect(audio.peak, 'audio is silent — model ran but produced nothing').toBeGreaterThan(0.01);
  });
});
