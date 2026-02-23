// @ts-check
import { test, expect } from '@playwright/test';
import { tools } from '../src/common/metadata.js';

const videoToolPaths = Object.keys(tools).filter(path => path.startsWith('video/'));

test.describe('Video Tool UI Consistency', () => {
  test('all video tools show logs and a progress UI', async ({ page }) => {
    test.setTimeout(120000);

    for (const toolPath of videoToolPaths) {
      await page.goto(`/${toolPath}`);
      await expect(page.locator('.tool-page')).toBeVisible();
      await expect(page.locator('#logHeader')).toBeVisible();
      await expect(page.locator('#logContent')).toHaveCount(1);

      const progressCount = await page.locator('#progress, #videoProgress').count();
      expect(progressCount).toBeGreaterThan(0);
    }
  });
});
