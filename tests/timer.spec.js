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
});
