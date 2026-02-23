// @ts-check
import { test, expect } from '@playwright/test';

const SAMPLE_FILE = '/tmp/bunny-small.mp4';

async function clickProcessButton(page, selector = '#processBtn') {
  const button = page.locator(selector);
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded().catch(() => {});

  try {
    await button.click({ timeout: 5000 });
  } catch {
    await button.click({ force: true });
  }
}

async function uploadAndWaitForSuccess(page, {
  route,
  inputSelector = '#fileInput',
  processSelector = '#processBtn',
  outputSelector = '#output-video',
  downloadSelector = '#downloadContainer a[download]',
  beforeProcess
}) {
  await page.goto(route);
  await expect(page.locator('.tool-page')).toBeVisible();
  await expect(page.locator('.file-select-btn').first()).toBeVisible();
  await expect(page.locator('#logHeader')).toBeVisible();
  await expect(page.locator('#logContent')).toHaveCount(1);
  await expect(page.locator('#progress')).toHaveCount(1);
  await expect(page.locator('.tool-container[data-tool-ready=\"true\"]')).toBeVisible();
  await page.setInputFiles(inputSelector, SAMPLE_FILE);
  await expect.poll(async () => {
    const inputSrc = await page.locator('#input-video').getAttribute('src').catch(() => '');
    const logs = await page.locator('#logContent').inputValue().catch(() => '');
    return (inputSrc && inputSrc.startsWith('blob:')) || logs.includes('Loaded video:');
  }, { timeout: 5000, intervals: [100, 250, 500] }).toBeTruthy();

  if (beforeProcess) {
    await beforeProcess(page);
  }

  const initialLogs = await page.locator('#logContent').inputValue().catch(() => '');
  await clickProcessButton(page, processSelector);

  await expect.poll(async () => {
    const logs = await page.locator('#logContent').inputValue().catch(() => '');
    return logs.length > initialLogs.length || /Writing input file|Processing|Executing FFmpeg/i.test(logs);
  }, { timeout: 10000, intervals: [250, 500, 1000] }).toBeTruthy();

  await expect.poll(async () => {
    const progressStyle = await page.locator('#progress').getAttribute('style').catch(() => '');
    const progressText = await page.locator('#progress').textContent().catch(() => '');
    return (progressStyle && !progressStyle.includes('display: none')) || /[1-9]\d?%|100%/.test(progressText || '');
  }, { timeout: 15000, intervals: [250, 500, 1000] }).toBeTruthy();

  const logContent = page.locator('#logContent');
  await expect.poll(async () => {
    const logs = await logContent.inputValue().catch(() => '');
    if (/FFmpeg command failed|Error: FFmpeg exited|Error: FFmpeg aborted/i.test(logs)) {
      return `failed:${logs.slice(-500)}`;
    }

    const visible = await page.locator(outputSelector).isVisible().catch(() => false);
    const hasDownload = await page.locator(downloadSelector).count().then(c => c > 0);
    return visible && hasDownload ? 'success' : 'pending';
  }, { timeout: 120000, intervals: [500, 1000, 2000] }).toBe('success');

  await expect(page.locator(outputSelector)).toBeVisible();
  await expect(page.locator(downloadSelector)).toBeVisible();
}

test.describe('Video Ops E2E (Big Buck Bunny small sample)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(async () => {
    // Ensure the Bunny sample exists for these local e2e checks.
    // Playwright will surface a clear error if missing when setInputFiles runs.
  });

  test('reencode default (MP4)', async ({ page }) => {
    test.setTimeout(180000);
    await uploadAndWaitForSuccess(page, {
      route: '/video/reencode',
      beforeProcess: async (p) => {
        await p.selectOption('#format', 'mp4');
        await p.fill('#bitrate', '900');
      }
    });
  });

  test('convert to MP4 tool (default settings)', async ({ page }) => {
    test.setTimeout(180000);
    await uploadAndWaitForSuccess(page, {
      route: '/video/mp4',
      beforeProcess: async (p) => {
        await p.fill('#bitrate', '900');
      }
    });
  });

  test('resize video', async ({ page }) => {
    test.setTimeout(180000);
    await uploadAndWaitForSuccess(page, {
      route: '/video/resize',
      beforeProcess: async (p) => {
        await p.waitForFunction(() => {
          const w = document.getElementById('width');
          return w && !w.disabled;
        });
        await p.fill('#width', '320');
      }
    });
  });

  test('trim video short clip', async ({ page }) => {
    test.setTimeout(180000);
    await uploadAndWaitForSuccess(page, {
      route: '/video/trim',
      beforeProcess: async (p) => {
        await p.waitForFunction(() => {
          const start = document.getElementById('startTime');
          const end = document.getElementById('endTime');
          return start && end && !start.disabled && !end.disabled;
        });
        await p.fill('#startTime', '0:00');
        await p.dispatchEvent('#startTime', 'change');
        await p.fill('#endTime', '0:01');
        await p.dispatchEvent('#endTime', 'change');
      }
    });
  });

  test('reverse video short clip (audio removed default)', async ({ page }) => {
    test.setTimeout(180000);
    await uploadAndWaitForSuccess(page, {
      route: '/video/reverse',
      beforeProcess: async (p) => {
        await p.waitForFunction(() => {
          const start = document.getElementById('startTime');
          const end = document.getElementById('endTime');
          const removeAudio = document.getElementById('removeAudio');
          return start && end && removeAudio && !start.disabled && !end.disabled && !removeAudio.disabled;
        });
        await p.fill('#startTime', '0:00');
        await p.dispatchEvent('#startTime', 'change');
        await p.fill('#endTime', '0:01');
        await p.dispatchEvent('#endTime', 'change');
      }
    });
  });
});
