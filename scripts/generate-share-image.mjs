import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Branded 1200x630 Open Graph card (Slack / WhatsApp / Twitter / Facebook).
// Same image is reused for every page; per-page title + description come from
// the OG meta tags, so this just needs to read as a clean SafeWebTool card.
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4F46E5"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Logo: white shield + blue check, scaled from the 32px source -->
  <g transform="translate(530,70) scale(4.375)">
    <path d="M16 2C12.5 5.5 6.5 8 3 9.5V17C3 23.5 8.5 28.5 16 30C23.5 28.5 29 23.5 29 17V9.5C25.5 8 19.5 5.5 16 2Z" fill="#ffffff"/>
    <path d="M10 16L14 20L22 12" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>

  <g font-family="Helvetica, Arial, sans-serif" text-anchor="middle">
    <text x="600" y="420" font-size="92" font-weight="700" fill="#ffffff" letter-spacing="-1">SafeWebTool</text>
    <text x="600" y="482" font-size="38" font-weight="400" fill="#DBEAFE">Free, safe browser tools</text>
    <text x="600" y="552" font-size="26" font-weight="600" fill="#BFDBFE">No ads · No login · No uploads · No paywall · Open source</text>
  </g>
</svg>`;

const outputPath = path.join(repoRoot, 'public', 'og', 'safewebtool.png');
await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
console.log('Generated public/og/safewebtool.png');
