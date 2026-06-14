#!/usr/bin/env node
// Downloads the FFmpeg WASM core files used as a local fallback when the CDN is
// unreachable. Version must match @ffmpeg/core in package.json.
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const CORE_VERSION = '0.12.10';

const TARGETS = [
  {
    dir: 'dist/ffmpeg',
    baseURL: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
    files: ['ffmpeg-core.js', 'ffmpeg-core.wasm']
  }
];

async function download(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(destPath));
  console.log(`Downloaded ${url} -> ${destPath}`);
}

for (const { dir, baseURL, files } of TARGETS) {
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    await download(`${baseURL}/${file}`, `${dir}/${file}`);
  }
}
