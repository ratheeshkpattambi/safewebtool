// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Timer tool', () => {
  test('enables tick sound by default for mobile timer use', async ({ page }) => {
    await page.goto('/time/timer');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();
    await expect(page.locator('#tickToggle')).toBeChecked();
  });

  test('supports phone presets, custom time, and start stop flow', async ({ page }) => {
    await page.goto('/time/timer');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.getByRole('button', { name: '1', exact: true }).click();
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#timerStatus')).toHaveText('Target 01:00');

    await page.getByRole('button', { name: '3', exact: true }).click();
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#timerStatus')).toHaveText('Target 03:00');

    await page.locator('#minutesInput').fill('0');
    await page.locator('#secondsInput').fill('45');
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#timerStatus')).toHaveText('Target 00:45');

    await page.locator('#startPauseBtn').scrollIntoViewIfNeeded();
    await page.locator('#startPauseBtn').click({ force: true });
    await expect(page.locator('#timerStatus')).toContainText('left of 00:45');
    await expect(page.locator('#startPauseBtn')).toHaveText('Stop');
    await expect(page.locator('#minutesInput')).toBeDisabled();

    await page.locator('#startPauseBtn').click({ force: true });
    await expect(page.locator('#timerStatus')).toHaveText('Target 00:45');
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#minutesInput')).toBeEnabled();
  });

  test('keeps reset behavior in the single stop button', async ({ page }) => {
    await page.goto('/time/timer');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.locator('#startPauseBtn').click({ force: true });
    await expect(page.locator('#timerStatus')).toContainText('left of 02:00');
    await page.locator('#startPauseBtn').click({ force: true });
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#timerStatus')).toHaveText('Target 02:00');
  });

  /**
   * Regression test for a real bug: router.js swaps page content via innerHTML on SPA
   * navigation, it does not reload the page. That removes the timer's DOM but does
   * nothing to its JS-level state — a running setInterval/setTimeout and its Audio
   * objects (never attached to the DOM to begin with) kept firing and playing sound
   * after the user navigated away, since nothing ever told the tool to stop. Fixed by
   * adding Tool.destroy() (base.js) and calling it from router.js before every route
   * change; TimerTool.destroy() stops the interval/timeout, releases the wake lock, and
   * detaches its Audio elements. Assert on real Audio.play() calls, not on internal
   * state, since the bug is specifically about resources outliving the DOM.
   */
  test('stops the tick sound after SPA navigation away', async ({ page }) => {
    test.setTimeout(30000);

    // Patch play() before any app code runs so every Audio.play() call is recorded
    // with a timestamp, regardless of which Audio instance made it.
    await page.addInitScript(() => {
      window.__playCalls = [];
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.__playCalls.push(performance.now());
        return originalPlay.apply(this, args);
      };
    });

    await page.goto('/time/timer');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    // Tick sound is on by default; a short timer gets several ticks quickly.
    await page.locator('#minutesInput').fill('0');
    await page.locator('#secondsInput').fill('5');
    await page.locator('#secondsInput').dispatchEvent('change');
    await page.locator('#startPauseBtn').scrollIntoViewIfNeeded();
    await page.locator('#startPauseBtn').click({ force: true });

    await expect
      .poll(() => page.evaluate(() => window.__playCalls.length), { timeout: 5000 })
      .toBeGreaterThan(0);

    // SPA navigation away — the in-app back link, not a full page reload.
    await page.locator('.timer-back-link').click();
    await expect(page).toHaveURL(/\/time$/);

    const navTimestamp = await page.evaluate(() => performance.now());
    await page.waitForTimeout(3000); // past where more ticks would fire if still running

    const playsAfterNav = await page.evaluate(
      (navTs) => window.__playCalls.filter((t) => t > navTs).length,
      navTimestamp
    );
    expect(playsAfterNav).toBe(0);
  });
});
