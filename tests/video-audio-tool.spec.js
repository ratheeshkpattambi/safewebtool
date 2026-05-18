// @ts-check
import { test, expect } from '@playwright/test';
import { buildVideoAudioCommand } from '../src/video/audio-command.js';

const tinyVideoFile = {
  name: 'source-video.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50])
};

const tinyAudioVideoFile = {
  name: 'audio-source-video.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50])
};

async function createSyntheticWebMFile(page, { name, frequency = 440, durationMs = 800 }) {
  const bytes = await page.evaluate(async ({ frequency, durationMs }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(12);

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(destination);
    stream.addTrack(destination.stream.getAudioTracks()[0]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };

    const done = new Promise(resolve => {
      recorder.onstop = async () => {
        oscillator.stop();
        await audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(Array.from(new Uint8Array(await blob.arrayBuffer())));
      };
    });

    oscillator.start();
    recorder.start();
    const startedAt = performance.now();

    function drawFrame() {
      const elapsed = performance.now() - startedAt;
      ctx.fillStyle = frequency > 500 ? '#1d4ed8' : '#0f766e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText(`${Math.round(frequency)} Hz`, 36, 48);
      if (elapsed < durationMs) requestAnimationFrame(drawFrame);
    }
    drawFrame();

    setTimeout(() => recorder.stop(), durationMs);
    return done;
  }, { frequency, durationMs });

  return {
    name,
    mimeType: 'video/webm',
    buffer: Buffer.from(bytes)
  };
}

async function createSilentWebMFile(page, { name, durationMs = 700 }) {
  const bytes = await page.evaluate(async ({ durationMs }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(12);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };

    const done = new Promise(resolve => {
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(Array.from(new Uint8Array(await blob.arrayBuffer())));
      };
    });

    recorder.start();
    const startedAt = performance.now();

    function drawFrame() {
      const elapsed = performance.now() - startedAt;
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText('Silent', 54, 48);
      if (elapsed < durationMs) requestAnimationFrame(drawFrame);
    }
    drawFrame();

    setTimeout(() => recorder.stop(), durationMs);
    return done;
  }, { durationMs });

  return {
    name,
    mimeType: 'video/webm',
    buffer: Buffer.from(bytes)
  };
}

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

test.describe('Add or Remove Audio from Video UI', () => {
  test('defaults to using a new audio file for silent or already-sounding videos', async ({ page }) => {
    await page.goto('/video/audio');

    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();
    await expect(page.locator('.tool-page h1').first()).toContainText('Add or Remove Audio from Video');
    await expect(page.locator('#modeReplace')).toBeChecked();
    await expect(page.locator('#lengthMatch')).toBeChecked();
    await expect(page.locator('#processBtn')).toContainText('Use New Audio');
    await expect(page.locator('#processBtn')).toBeDisabled();
    await expect(page.getByText('Add sound to a silent video, or replace the sound it already has.')).toBeVisible();
    await expect(page.locator('#modeAdd')).toHaveCount(0);
    await expect(page.getByText('Trim long audio. Pad short audio with silence.')).toBeVisible();
  });

  test('requires an audio source for replace mode and enables processing when both files are present', async ({ page }) => {
    await page.goto('/video/audio');

    await page.setInputFiles('#fileInput', tinyVideoFile);
    await expect(page.locator('#processBtn')).toBeDisabled();
    await expect(page.locator('#videoFileInfo')).toContainText('source-video.mp4');
    await expect(page.locator('#dropZone')).toBeHidden();

    await page.setInputFiles('#audioFileInput', tinyAudioVideoFile);
    await expect(page.locator('#audioFileInfo')).toContainText('audio-source-video.mp4');
    await expect(page.locator('#audioDropZone')).toBeHidden();
    await expect(page.locator('#audioFileInfo [data-change-file]')).toBeVisible();
    await expect(page.locator('#processBtn')).toBeEnabled();

    await page.locator('#lengthLoop').check();
    await expect(page.locator('#modeHelp')).toContainText('Short audio repeats until the video ends');
  });

  test('remove audio mode only needs the source video', async ({ page }) => {
    await page.goto('/video/audio');

    await page.locator('#modeRemove').check();
    await expect(page.locator('#audioSourcePanel')).toBeHidden();
    await expect(page.locator('#timingPanel')).toBeHidden();
    await expect(page.locator('#processBtn')).toContainText('Remove Audio');
    await expect(page.locator('#modeHelp')).toContainText('No second file is needed');

    await page.setInputFiles('#fileInput', tinyVideoFile);
    await expect(page.locator('#processBtn')).toBeEnabled();
  });

  test('mobile layout is usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/video/audio');

    await expect(page.locator('#dropZone')).toBeVisible();
    await expect(page.locator('#audioDropZone')).toBeVisible();
    await expect(page.locator('#processBtn')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });

  test('builds safe FFmpeg commands for remove, match, loop, and keep modes', () => {
    expect(buildVideoAudioCommand({
      mode: 'remove',
      videoInputName: 'video.webm',
      outputFileName: 'out.mp4'
    })).toEqual(expect.arrayContaining(['-map', '0:v:0', '-an']));

    expect(buildVideoAudioCommand({
      mode: 'replace',
      lengthMode: 'match',
      delaySeconds: 0.5,
      videoInputName: 'video.webm',
      audioInputName: 'audio.webm',
      outputFileName: 'out.mp4'
    }).join(' ')).toContain('adelay=500:all=1,apad');

    expect(buildVideoAudioCommand({
      mode: 'replace',
      lengthMode: 'loop',
      videoInputName: 'video.webm',
      audioInputName: 'audio.webm',
      outputFileName: 'out.mp4'
    })).toEqual(expect.arrayContaining(['-stream_loop', '-1', '-shortest']));

    expect(buildVideoAudioCommand({
      mode: 'replace',
      lengthMode: 'keep',
      videoInputName: 'video.webm',
      audioInputName: 'audio.webm',
      outputFileName: 'out.mp4'
    })).not.toContain('-shortest');
  });

  test('replaces audio from a second generated video and exports MP4', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'Real FFmpeg processing is covered on desktop to keep mobile checks fast.');
    test.setTimeout(180000);

    await page.goto('/video/audio');
    const sourceVideo = await createSyntheticWebMFile(page, {
      name: 'source-video.webm',
      frequency: 330,
      durationMs: 700
    });
    const audioSource = await createSyntheticWebMFile(page, {
      name: 'audio-source.webm',
      frequency: 660,
      durationMs: 1100
    });

    await page.setInputFiles('#fileInput', sourceVideo);
    await page.setInputFiles('#audioFileInput', audioSource);
    await expect(page.locator('#processBtn')).toBeEnabled();
    await clickProcessButton(page);

    await expect.poll(async () => {
      const logs = await page.locator('#logContent').inputValue().catch(() => '');
      const visible = await page.locator('#output-video').isVisible().catch(() => false);
      const hasDownload = await page.locator('#downloadContainer a[download]').count().then(count => count > 0);
      if (visible && hasDownload) return 'success';
      if (/FFmpeg command failed|Error: FFmpeg exited|Error: FFmpeg aborted/i.test(logs)) {
        return `failed:${logs.slice(-500)}`;
      }
      return visible && hasDownload ? 'success' : 'pending';
    }, { timeout: 120000, intervals: [500, 1000, 2000] }).toBe('success');

    await expect(page.locator('#lastCommandSummary')).toHaveAttribute('data-mode', 'replace');
    await expect(page.locator('#lastCommandSummary')).toHaveAttribute('data-length-mode', 'match');
    await expect(page.locator('#downloadContainer a[download]')).toHaveAttribute('download', /source-video-new-audio\.mp4/);
    await expect(page.locator('#downloadContainer a[download]')).toContainText('Download MP4');
    await expect(page.locator('#outputContainer')).toBeVisible();
  });

  test('shows a clear error when the selected audio source has no audio track', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'Real FFmpeg processing is covered on desktop to keep mobile checks fast.');
    test.setTimeout(180000);

    await page.goto('/video/audio');
    const sourceVideo = await createSyntheticWebMFile(page, {
      name: 'source-video.webm',
      frequency: 330,
      durationMs: 700
    });
    const silentAudioSource = await createSilentWebMFile(page, {
      name: 'silent-source.webm',
      durationMs: 700
    });

    await page.setInputFiles('#fileInput', sourceVideo);
    await page.setInputFiles('#audioFileInput', silentAudioSource);
    await clickProcessButton(page);

    await expect.poll(async () => page.locator('#logContent').inputValue(), {
      timeout: 120000,
      intervals: [500, 1000, 2000]
    }).toContain('The selected audio source does not contain an audio track');

    const logs = await page.locator('#logContent').inputValue();
    await expect(page.locator('#downloadContainer a[download]')).toHaveCount(0);
    await expect(page.locator('#outputContainer')).toBeHidden();
    expect(logs).not.toContain('retrying with browser-compatible MP4');
  });
});
