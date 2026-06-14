#!/usr/bin/env node
// Generates small, reproducible media fixtures for FFmpeg-based tool tests.
// Requires the Vite dev server running at http://localhost:5173 (npm run dev).
//
// Usage: node scripts/generate-test-fixtures.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.FIXTURES_BASE_URL || 'http://localhost:5173';
const OUT_DIR = new URL('../tests/fixtures/', import.meta.url);

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', err => console.error('PAGEERROR:', err.message));

await page.goto(`${BASE_URL}/video/reencode`);
await page.waitForSelector('.tool-page');

const coi = await page.evaluate(() => ({
  crossOriginIsolated: globalThis.crossOriginIsolated,
  sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
}));
console.log('crossOriginIsolated:', coi);

// Generate lavfi-based fixtures (mp4, gif, wav, mp3) entirely inside FFmpeg WASM.
const lavfiFixtures = await page.evaluate(async () => {
  const { loadFFmpeg, executeFFmpeg } = await import('/src/video/ffmpeg-utils.js');
  const ffmpeg = await loadFFmpeg();

  const jobs = [
    {
      name: 'sample.mp4',
      args: ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '2', 'sample.mp4']
    },
    {
      name: 'sample.gif',
      args: ['-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=10:duration=1', '-t', '1', 'sample.gif']
    },
    {
      name: 'sample.wav',
      args: ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', 'sample.wav']
    },
    {
      name: 'sample.mp3',
      args: ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', 'sample.mp3']
    }
  ];

  const results = {};
  for (const job of jobs) {
    await executeFFmpeg(ffmpeg, job.args);
    const data = await ffmpeg.readFile(job.name);
    results[job.name] = Array.from(data);
    await ffmpeg.deleteFile(job.name);
  }
  return results;
});

for (const [name, bytes] of Object.entries(lavfiFixtures)) {
  await writeFile(new URL(name, OUT_DIR), Buffer.from(bytes));
  console.log(`Wrote tests/fixtures/${name} (${bytes.length} bytes)`);
}

// Generate a real recorded WebM using MediaRecorder (matches real-world browser uploads).
const webmBytes = await page.evaluate(async () => {
  const mimeTypeCandidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  const mimeType = mimeTypeCandidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(10);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => reject(new Error(event.error?.message || 'MediaRecorder error'));
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      resolve(Array.from(new Uint8Array(await blob.arrayBuffer())));
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
      ctx.fillRect(10 + ((t * 60) % 100), 20, 40, 40);
      if (t < 2) requestAnimationFrame(draw);
      else resolve(null);
    }
    requestAnimationFrame(draw);
  });
  recorder.stop();
  return done;
});

await writeFile(new URL('sample.webm', OUT_DIR), Buffer.from(webmBytes));
console.log(`Wrote tests/fixtures/sample.webm (${webmBytes.length} bytes)`);

await browser.close();
console.log('Done.');
