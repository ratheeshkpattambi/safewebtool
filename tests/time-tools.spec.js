// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Time tools', () => {
  test('time zone converter renders converted results', async ({ page }) => {
    await page.goto('/time/timezone-converter');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#sourceDateTime').fill('2026-01-15T09:00');
    await page.locator('#sourceZone').selectOption('America/New_York');
    await page.locator('#convertBtn').scrollIntoViewIfNeeded();
    await page.locator('#convertBtn').click({ force: true });

    await expect(page.locator('#results')).toContainText('America/New_York');
    await expect(page.locator('#results')).toContainText('Europe/London');
  });

  test('meeting planner finds overlap windows', async ({ page }) => {
    await page.goto('/time/meeting-planner');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#meetingDate').fill('2026-01-15');
    await page.locator('#workStart').fill('0');
    await page.locator('#workEnd').fill('24');
    await page.locator('#zone0').selectOption('America/New_York');
    await page.locator('#zone1').selectOption('Europe/London');
    await page.locator('#zone2').selectOption('UTC');
    await page.locator('#findBtn').scrollIntoViewIfNeeded();
    await page.locator('#findBtn').click({ force: true });

    await expect(page.locator('#results')).toContainText('Option 1');
    await expect(page.locator('#results')).toContainText('America/New_York');
  });

  test('business days calculator skips weekends', async ({ page }) => {
    await page.goto('/time/business-days');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#startDate').fill('2026-01-02');
    await page.locator('#days').fill('1');
    await page.locator('#calculateBtn').scrollIntoViewIfNeeded();
    await page.locator('#calculateBtn').click({ force: true });

    await expect(page.locator('#result')).toContainText('Monday, January 5, 2026');
  });

  test('date duration calculator returns day and weekday counts', async ({ page }) => {
    await page.goto('/time/date-difference');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

    await page.locator('#startDate').fill('2026-01-01');
    await page.locator('#endDate').fill('2026-01-08');
    await page.locator('#calculateBtn').scrollIntoViewIfNeeded();
    await page.locator('#calculateBtn').click({ force: true });

    await expect(page.locator('#result')).toContainText('7 days');
    await expect(page.locator('#result')).toContainText('5 weekdays');
  });
});
