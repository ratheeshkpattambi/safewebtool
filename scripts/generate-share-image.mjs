import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const width = 1200;
const height = 630;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function blend(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function setPixel(data, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = (y * width + x) * 4;
  data[offset] = r;
  data[offset + 1] = g;
  data[offset + 2] = b;
  data[offset + 3] = a;
}

function fillRect(data, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPixel(data, xx, yy, ...color);
    }
  }
}

function drawCircle(data, cx, cy, radius, color) {
  const radiusSq = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSq) {
        setPixel(data, x, y, ...color);
      }
    }
  }
}

function makePng() {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const vertical = y / height;
    for (let x = 0; x < width; x += 1) {
      const horizontal = x / width;
      const t = Math.min(1, vertical * 0.62 + horizontal * 0.38);
      setPixel(
        pixels,
        x,
        y,
        blend(14, 29, t),
        blend(94, 78, t),
        blend(179, 216, t)
      );
    }
  }

  fillRect(pixels, 110, 115, 980, 400, [255, 255, 255]);
  fillRect(pixels, 110, 115, 980, 18, [37, 99, 235]);
  drawCircle(pixels, 210, 255, 56, [37, 99, 235]);
  drawCircle(pixels, 210, 255, 31, [255, 255, 255]);
  fillRect(pixels, 305, 215, 520, 34, [15, 23, 42]);
  fillRect(pixels, 305, 275, 695, 22, [71, 85, 105]);
  fillRect(pixels, 305, 315, 590, 22, [100, 116, 139]);
  fillRect(pixels, 305, 390, 145, 28, [37, 99, 235]);
  fillRect(pixels, 475, 390, 100, 28, [16, 185, 129]);
  fillRect(pixels, 600, 390, 115, 28, [148, 163, 184]);

  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    scanlines.push(Buffer.from([0]));
    scanlines.push(pixels.subarray(y * width * 4, (y + 1) * width * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(scanlines), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const outputPath = path.join(repoRoot, 'public', 'og', 'safewebtool.png');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, makePng());
console.log('Generated public/og/safewebtool.png');
