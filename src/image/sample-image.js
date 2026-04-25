const SAMPLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <circle cx="120" cy="110" r="52" fill="#f8fafc" opacity="0.92"/>
  <rect x="70" y="220" width="170" height="120" rx="18" fill="#e2e8f0" opacity="0.9"/>
  <rect x="265" y="70" width="300" height="40" rx="10" fill="#f8fafc" opacity="0.9"/>
  <rect x="265" y="126" width="220" height="18" rx="8" fill="#dbeafe" opacity="0.95"/>
  <rect x="265" y="158" width="270" height="18" rx="8" fill="#bfdbfe" opacity="0.9"/>
  <rect x="265" y="190" width="180" height="18" rx="8" fill="#93c5fd" opacity="0.9"/>
  <path d="M300 325 C355 250, 420 360, 470 295 S560 270, 605 325" stroke="#f8fafc" stroke-width="12" fill="none" opacity="0.85"/>
  <text x="265" y="265" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#ffffff">SafeWebTool</text>
  <text x="265" y="300" font-family="system-ui, sans-serif" font-size="17" fill="#e0f2fe">Built-in sample image (no network)</text>
</svg>`;

export const SAMPLE_IMAGE_LINK = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_SVG)}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load built-in sample image'));
    img.src = src;
  });
}

function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render sample image'));
    }, type, quality);
  });
}

export async function createSampleImageFile(filename = 'safewebtool-sample.png') {
  const img = await loadImage(SAMPLE_IMAGE_LINK);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(img, 0, 0);
  const blob = await canvasToBlob(canvas, 'image/png', 0.95);
  return new File([blob], filename, { type: 'image/png' });
}

