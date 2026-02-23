// @ts-check
import { test, expect } from '@playwright/test';

async function clickProcessButton(page) {
  const button = page.locator('#processBtn');
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded().catch(() => {});

  try {
    await button.click({ timeout: 5000 });
  } catch {
    await button.click({ force: true });
  }
}

async function generateRecordedWebM(page) {
  const bytes = await page.evaluate(async () => {
    const mimeTypeCandidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    const mimeType = mimeTypeCandidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder is not available in this browser');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];

    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = (event) => reject(new Error(event.error?.message || 'MediaRecorder error'));
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const arr = new Uint8Array(await blob.arrayBuffer());
        resolve(Array.from(arr));
      };
    });

    recorder.start(100);

    const start = performance.now();
    await new Promise(resolve => {
      function draw(now) {
        const t = (now - start) / 1000;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(20 + ((t * 80) % 220), 40, 80, 80);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '20px sans-serif';
        ctx.fillText('SafeWebTool', 80, 150);

        if (t < 1.2) {
          requestAnimationFrame(draw);
        } else {
          resolve(null);
        }
      }
      requestAnimationFrame(draw);
    });

    recorder.stop();
    return await done;
  });

  return Buffer.from(bytes);
}

test.describe('Video Re-encode Real File', () => {
  test('re-encodes a generated WebM file to MP4', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/');
    const inputBuffer = await generateRecordedWebM(page);
    expect(inputBuffer.byteLength).toBeGreaterThan(0);

    await page.goto('/video/reencode');
    await expect(page.locator('.tool-page')).toBeVisible();

    await page.setInputFiles('#fileInput', {
      name: 'recorded.webm',
      mimeType: 'video/webm',
      buffer: inputBuffer
    });

    await page.fill('#bitrate', '1200');
    await page.selectOption('#format', 'mp4');
    await clickProcessButton(page);

    // Wait for either success output or explicit FFmpeg failure to surface.
    const outputVideo = page.locator('#output-video');
    const errorLog = page.locator('#logContent');
    const downloadLink = page.locator('#downloadContainer a[download]');

    await expect.poll(async () => {
      const visible = await outputVideo.isVisible().catch(() => false);
      const hasDownload = await downloadLink.count().then(c => c > 0);
      const logs = (await errorLog.inputValue().catch(() => '')) || '';
      if (logs.includes('FFmpeg command failed') || logs.includes('Error: FFmpeg exited')) {
        return 'failed';
      }
      if (visible && hasDownload) {
        return 'success';
      }
      return 'pending';
    }, { timeout: 120000, intervals: [500, 1000, 2000] }).toBe('success');

    await expect(outputVideo).toBeVisible();
    await expect(downloadLink).toBeVisible();
  });
});
