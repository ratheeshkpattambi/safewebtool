import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';

const DPI = 300;

const PRESETS = {
  'us-passport': {
    label: 'US Passport 2x2',
    shortLabel: 'US Passport',
    width: 600,
    height: 600,
    digitalType: 'image/jpeg',
    quality: 0.92,
    filename: 'us-passport-photo.jpg',
    note: '2 x 2 in / 51 x 51 mm. Use the guide to keep the head roughly 1-1 3/8 in high.'
  },
  'us-visa-digital': {
    label: 'US Visa Digital',
    shortLabel: 'US Visa',
    width: 600,
    height: 600,
    digitalType: 'image/jpeg',
    quality: 0.9,
    maxBytes: 240 * 1024,
    filename: 'us-visa-photo.jpg',
    note: 'Square JPEG. Default export targets 600 x 600 px and tries to stay under 240 KB.'
  },
  'generic-35x45': {
    label: '35 x 45 mm',
    shortLabel: '35x45',
    width: 413,
    height: 531,
    digitalType: 'image/jpeg',
    quality: 0.92,
    filename: '35x45-id-photo.jpg',
    note: 'Common passport and visa size. Confirm the issuing authority rules before submitting.'
  },
  'canada-passport': {
    label: 'Canada 50 x 70 mm',
    shortLabel: 'Canada',
    width: 591,
    height: 827,
    digitalType: 'image/jpeg',
    quality: 0.92,
    filename: 'canada-passport-photo.jpg',
    note: 'Canada passport applications often require a commercial photographer and unaltered photos. Use this only where self-prepared digital files are accepted.'
  }
};

const PRINT_SHEETS = {
  '4x6': {
    label: '4 x 6 in print sheet',
    width: 1200,
    height: 1800,
    filename: 'passport-photo-4x6-sheet.jpg'
  },
  letter: {
    label: 'Letter print sheet',
    width: 2550,
    height: 3300,
    filename: 'passport-photo-letter-sheet.jpg'
  },
  a4: {
    label: 'A4 print sheet',
    width: 2480,
    height: 3508,
    filename: 'passport-photo-a4-sheet.jpg'
  }
};

export const template = `
  <style>
    .passport-workspace {
      display: grid;
      gap: 18px;
    }

    .passport-hero {
      display: grid;
      gap: 14px;
      padding: 16px;
      border: 1px solid rgba(37, 99, 235, 0.2);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(239, 246, 255, 0.88), rgba(255, 255, 255, 0.96));
    }

    .dark .passport-hero {
      background: linear-gradient(180deg, rgba(30, 58, 138, 0.38), rgba(15, 23, 42, 0.72));
      border-color: rgba(96, 165, 250, 0.26);
    }

    .passport-grid {
      display: grid;
      gap: 18px;
    }

    .passport-card {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
      padding: 14px;
    }

    .dark .passport-card {
      border-color: rgb(75 85 99);
      background: rgb(31 41 55);
    }

    .passport-preview-frame {
      position: relative;
      min-height: 280px;
      border-radius: 8px;
      overflow: hidden;
      background:
        linear-gradient(45deg, rgba(148, 163, 184, 0.13) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(148, 163, 184, 0.13) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.13) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.13) 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
      border: 1px solid rgb(203 213 225);
    }

    .dark .passport-preview-frame {
      border-color: rgb(75 85 99);
    }

    #cropCanvas {
      display: block;
      width: 100%;
      max-height: 68vh;
      cursor: grab;
      touch-action: none;
    }

    #cropCanvas:active {
      cursor: grabbing;
    }

    .passport-empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 18px;
      text-align: center;
      color: rgb(71 85 105);
    }

    .dark .passport-empty {
      color: rgb(203 213 225);
    }

    .passport-status {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .passport-status-item {
      border-radius: 8px;
      background: rgb(248 250 252);
      padding: 10px;
      font-size: 0.875rem;
      color: rgb(51 65 85);
    }

    .dark .passport-status-item {
      background: rgba(15, 23, 42, 0.52);
      color: rgb(226 232 240);
    }

    @media (min-width: 960px) {
      .passport-grid {
        grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
        align-items: start;
      }
    }
  </style>

  <div class="tool-container passport-workspace">
    <section class="passport-hero">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white">Private Passport Photo Maker</h2>
          <p class="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Make a correctly sized digital photo or print sheet in your browser. Your photo is processed locally and never uploaded.</p>
        </div>
        <span class="inline-flex shrink-0 items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">No upload</span>
      </div>
      <div class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Guides help with sizing, but they do not guarantee government acceptance. Avoid retouching, filters, and AI edits for strict passport applications.</div>
    </section>

    <div id="dropZone" class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-7 text-center transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-gray-700">
      <div class="mb-2 text-4xl">🪪</div>
      <p class="text-lg font-bold text-slate-800 dark:text-slate-100">Drop a portrait photo here</p>
      <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">JPG, PNG, WebP. Works with camera photos on mobile.</p>
      <input id="fileInput" type="file" class="hidden" accept="image/*" capture="user">
      <button type="button" class="file-select-btn rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">Choose Photo</button>
    </div>

    <div class="passport-grid">
      <section class="passport-card">
        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Align crop</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">Drag the photo. Use zoom until the face fits the guide.</p>
          </div>
          <button id="resetCropBtn" type="button" class="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-700">Reset</button>
        </div>
        <div class="passport-preview-frame">
          <canvas id="cropCanvas" data-testid="crop-canvas" width="900" height="700"></canvas>
          <div id="emptyState" class="passport-empty">
            <div>
              <p class="text-xl font-black">Choose a portrait photo</p>
              <p class="mt-1 text-sm">The crop guide will appear here.</p>
            </div>
          </div>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Zoom</span>
            <input id="zoomInput" type="range" min="1" max="3" step="0.01" value="1" class="w-full accent-blue-600" disabled>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button id="rotateLeftBtn" type="button" class="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-700" disabled>↶</button>
            <button id="rotateRightBtn" type="button" class="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-700" disabled>↷</button>
          </div>
        </div>
      </section>

      <section class="passport-card">
        <div class="grid gap-4">
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Photo type</span>
            <select id="presetSelect" data-testid="preset-select" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-100">
              ${Object.entries(PRESETS).map(([id, preset]) => `<option value="${id}">${preset.label}</option>`).join('')}
            </select>
          </label>

          <div class="passport-status">
            <div class="passport-status-item">
              <strong class="block text-slate-900 dark:text-white">Output</strong>
              <span id="outputSize" data-testid="output-size">600 x 600 px</span>
            </div>
            <div class="passport-status-item">
              <strong class="block text-slate-900 dark:text-white">Privacy</strong>
              <span>Local only, no upload</span>
            </div>
          </div>

          <div id="presetNote" class="rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"></div>

          <div class="rounded-md border border-slate-200 p-3 dark:border-gray-600">
            <h4 class="font-bold text-slate-900 dark:text-white">Guide checklist</h4>
            <ul class="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li>Face camera directly, neutral expression.</li>
              <li>Use plain light background and even lighting.</li>
              <li>No filters, retouching, or AI edits.</li>
              <li>Print at actual size when using a print sheet.</li>
            </ul>
          </div>

          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Print sheet</span>
            <select id="printSheetSelect" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-100">
              ${Object.entries(PRINT_SHEETS).map(([id, sheet]) => `<option value="${id}">${sheet.label}</option>`).join('')}
            </select>
          </label>

          <div class="grid gap-2">
            <button id="downloadDigitalBtn" type="button" class="rounded-md bg-blue-600 px-5 py-3 text-base font-black text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled>Download Digital Photo</button>
            <button id="downloadPrintBtn" type="button" class="rounded-md bg-slate-950 px-5 py-3 text-base font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100" disabled>Download Print Sheet</button>
          </div>

          <div id="downloadContainer" class="grid gap-2 text-sm"></div>
          <div id="lastExport" data-testid="last-export" hidden></div>
          <div id="lastPrintSheet" data-testid="last-print-sheet" hidden></div>
        </div>
      </section>
    </div>

    <div id="progress" class="my-4 hidden overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700">
      <div class="h-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out" style="width: 0%;"></div>
      <div class="-mt-4 text-center text-xs font-medium leading-5 text-slate-700 dark:text-slate-300">0%</div>
    </div>

    <div id="logHeader" class="mt-2 flex cursor-pointer items-center justify-between rounded-md bg-slate-100 p-2.5 transition-colors hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 transition-transform dark:text-slate-400">▼</span>
    </div>
    <textarea id="logContent" class="h-32 w-full resize-none rounded-b-md border-0 bg-slate-100 p-4 font-mono text-xs text-slate-700 transition-colors focus:outline-none dark:bg-gray-700 dark:text-slate-300" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export image.'));
    }, type, quality);
  });
}

function createDownloadLink(blob, filename, label) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.className = 'inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
  link.textContent = label;
  return link;
}

class PassportPhotoTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      id: 'passport-photo',
      name: 'Passport Photo Maker',
      category: 'image',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: false,
      template
    });

    this.image = null;
    this.imageName = 'photo';
    this.presetId = 'us-passport';
    this.zoom = 1;
    this.rotation = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.dragState = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      cropCanvas: 'cropCanvas',
      emptyState: 'emptyState',
      presetSelect: 'presetSelect',
      outputSize: 'outputSize',
      presetNote: 'presetNote',
      zoomInput: 'zoomInput',
      resetCropBtn: 'resetCropBtn',
      rotateLeftBtn: 'rotateLeftBtn',
      rotateRightBtn: 'rotateRightBtn',
      printSheetSelect: 'printSheetSelect',
      downloadDigitalBtn: 'downloadDigitalBtn',
      downloadPrintBtn: 'downloadPrintBtn',
      downloadContainer: 'downloadContainer',
      lastExport: 'lastExport',
      lastPrintSheet: 'lastPrintSheet',
      progress: 'progress',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'image/*',
      onFileSelected: file => this.loadImage(file)
    });

    this.elements.presetSelect.addEventListener('change', () => {
      this.presetId = this.elements.presetSelect.value;
      this.resetCrop();
      this.updatePresetUI();
      this.drawPreview();
    });

    this.elements.zoomInput.addEventListener('input', () => {
      this.zoom = Number(this.elements.zoomInput.value);
      this.drawPreview();
    });

    this.elements.resetCropBtn.addEventListener('click', () => this.resetCrop());
    this.elements.rotateLeftBtn.addEventListener('click', () => this.rotate(-90));
    this.elements.rotateRightBtn.addEventListener('click', () => this.rotate(90));
    this.elements.downloadDigitalBtn.addEventListener('click', () => this.exportDigital());
    this.elements.downloadPrintBtn.addEventListener('click', () => this.exportPrintSheet());

    this.setupCanvasDrag();
    this.updatePresetUI();
    this.drawPreview();
    this.log('Passport photo maker ready. Choose a photo to begin.', 'info');
  }

  setupCanvasDrag() {
    const canvas = this.elements.cropCanvas;
    canvas.addEventListener('pointerdown', event => {
      if (!this.image) return;
      canvas.setPointerCapture(event.pointerId);
      this.dragState = {
        x: event.clientX,
        y: event.clientY,
        centerX: this.centerX,
        centerY: this.centerY
      };
    });

    canvas.addEventListener('pointermove', event => {
      if (!this.dragState || !this.image) return;
      const crop = this.getCropRect();
      const frame = this.getPreviewFrame();
      const dx = (event.clientX - this.dragState.x) * (crop.width / frame.width);
      const dy = (event.clientY - this.dragState.y) * (crop.height / frame.height);
      this.centerX = this.dragState.centerX - dx;
      this.centerY = this.dragState.centerY - dy;
      this.clampCenter();
      this.drawPreview();
    });

    canvas.addEventListener('pointerup', event => {
      this.dragState = null;
      canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointercancel', () => {
      this.dragState = null;
    });
  }

  async loadImage(file) {
    if (!file?.type.startsWith('image/')) {
      this.log('Please choose a valid image file.', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      this.image = image;
      this.imageName = file.name.replace(/\.[^.]+$/, '') || 'photo';
      this.emptyStateVisible(false);
      this.setControlsEnabled(true);
      this.resetCrop();
      this.log(`Image loaded: ${file.name} (${formatFileSize(file.size)})`, 'info');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      this.log('Could not load that image.', 'error');
    };
    image.src = url;
  }

  emptyStateVisible(visible) {
    this.elements.emptyState.style.display = visible ? 'grid' : 'none';
  }

  setControlsEnabled(enabled) {
    [
      this.elements.zoomInput,
      this.elements.rotateLeftBtn,
      this.elements.rotateRightBtn,
      this.elements.downloadDigitalBtn,
      this.elements.downloadPrintBtn
    ].forEach(element => {
      element.disabled = !enabled;
    });
  }

  rotate(delta) {
    this.rotation = (this.rotation + delta + 360) % 360;
    this.resetCrop();
  }

  resetCrop() {
    if (this.image) {
      this.centerX = this.getSourceWidth() / 2;
      this.centerY = this.getSourceHeight() / 2;
    }
    this.zoom = 1;
    this.elements.zoomInput.value = '1';
    this.drawPreview();
  }

  updatePresetUI() {
    const preset = this.getPreset();
    this.elements.outputSize.textContent = `${preset.width} x ${preset.height} px`;
    this.elements.presetNote.textContent = preset.note;
  }

  getPreset() {
    return PRESETS[this.presetId] || PRESETS['us-passport'];
  }

  getSourceWidth() {
    return this.rotation % 180 === 0 ? this.image.width : this.image.height;
  }

  getSourceHeight() {
    return this.rotation % 180 === 0 ? this.image.height : this.image.width;
  }

  getCropRect() {
    const preset = this.getPreset();
    const aspect = preset.width / preset.height;
    const sourceWidth = this.getSourceWidth();
    const sourceHeight = this.getSourceHeight();
    let baseWidth = sourceWidth;
    let baseHeight = sourceWidth / aspect;

    if (baseHeight > sourceHeight) {
      baseHeight = sourceHeight;
      baseWidth = sourceHeight * aspect;
    }

    const width = baseWidth / this.zoom;
    const height = baseHeight / this.zoom;
    const x = this.centerX - width / 2;
    const y = this.centerY - height / 2;
    return { x, y, width, height };
  }

  clampCenter() {
    const crop = this.getCropRect();
    const halfWidth = crop.width / 2;
    const halfHeight = crop.height / 2;
    this.centerX = Math.min(this.getSourceWidth() - halfWidth, Math.max(halfWidth, this.centerX));
    this.centerY = Math.min(this.getSourceHeight() - halfHeight, Math.max(halfHeight, this.centerY));
  }

  getPreviewFrame() {
    const canvas = this.elements.cropCanvas;
    const preset = this.getPreset();
    const maxWidth = 900;
    const maxHeight = 620;
    const aspect = preset.width / preset.height;
    let width = maxWidth;
    let height = width / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }

    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    return { width, height };
  }

  drawPreview() {
    const canvas = this.elements.cropCanvas;
    const ctx = canvas.getContext('2d');
    const frame = this.getPreviewFrame();
    ctx.clearRect(0, 0, frame.width, frame.height);

    if (!this.image) {
      ctx.fillStyle = '#eff6ff';
      ctx.fillRect(0, 0, frame.width, frame.height);
      this.emptyStateVisible(true);
      return;
    }

    this.emptyStateVisible(false);
    this.clampCenter();
    const crop = this.getCropRect();
    this.drawCroppedImage(ctx, frame.width, frame.height, crop);
    this.drawGuides(ctx, frame.width, frame.height);
  }

  drawCroppedImage(ctx, outputWidth, outputHeight, crop) {
    ctx.save();
    if (this.rotation === 0) {
      ctx.drawImage(this.image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.getSourceWidth();
      tempCanvas.height = this.getSourceHeight();
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.save();
      if (this.rotation === 90) {
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.rotate(Math.PI / 2);
      } else if (this.rotation === 180) {
        tempCtx.translate(tempCanvas.width, tempCanvas.height);
        tempCtx.rotate(Math.PI);
      } else if (this.rotation === 270) {
        tempCtx.translate(0, tempCanvas.height);
        tempCtx.rotate(-Math.PI / 2);
      }
      tempCtx.drawImage(this.image, 0, 0);
      tempCtx.restore();
      ctx.drawImage(tempCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
    }
    ctx.restore();
  }

  drawGuides(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.9)';
    ctx.lineWidth = Math.max(2, width * 0.004);
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(width * 0.16, height * 0.08, width * 0.68, height * 0.84);

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.42, width * 0.2, height * 0.27, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.font = `${Math.max(14, width * 0.028)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Align head inside guide', width / 2, height - 18);
    ctx.restore();
  }

  renderOutputCanvas(width, height) {
    if (!this.image) throw new Error('Choose a photo first.');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const crop = this.getCropRect();
    this.drawCroppedImage(ctx, width, height, crop);
    return canvas;
  }

  async exportDigital() {
    try {
      this.downloadContainerClear();
      const preset = this.getPreset();
      const canvas = this.renderOutputCanvas(preset.width, preset.height);
      const blob = await this.exportDigitalBlob(canvas, preset);
      this.appendDownload(blob, preset.filename, 'Download ready: digital photo');
      this.setExportMetadata(this.elements.lastExport, {
        width: preset.width,
        height: preset.height,
        mime: blob.type || preset.digitalType,
        bytes: blob.size
      });
      this.log(`Digital photo exported (${preset.width} x ${preset.height}, ${formatFileSize(blob.size)}).`, 'success');
    } catch (error) {
      this.log(`Export failed: ${error.message}`, 'error');
    }
  }

  async exportDigitalBlob(canvas, preset) {
    if (!preset.maxBytes) {
      return canvasToBlob(canvas, preset.digitalType, preset.quality);
    }

    let quality = preset.quality;
    let blob = await canvasToBlob(canvas, preset.digitalType, quality);
    while (blob.size > preset.maxBytes && quality > 0.45) {
      quality -= 0.06;
      blob = await canvasToBlob(canvas, preset.digitalType, quality);
    }
    return blob;
  }

  async exportPrintSheet() {
    try {
      this.downloadContainerClear();
      const preset = this.getPreset();
      const sheet = PRINT_SHEETS[this.elements.printSheetSelect.value] || PRINT_SHEETS['4x6'];
      const photoCanvas = this.renderOutputCanvas(preset.width, preset.height);
      const sheetCanvas = this.renderPrintSheetCanvas(photoCanvas, sheet);
      const blob = await canvasToBlob(sheetCanvas, 'image/jpeg', 0.92);
      this.appendDownload(blob, sheet.filename, 'Download ready: print sheet');
      this.setExportMetadata(this.elements.lastPrintSheet, {
        width: sheet.width,
        height: sheet.height,
        copies: sheetCanvas.dataset.copies || '0',
        bytes: blob.size
      });
      this.log(`Print sheet exported (${sheet.width} x ${sheet.height}, ${formatFileSize(blob.size)}).`, 'success');
    } catch (error) {
      this.log(`Print sheet failed: ${error.message}`, 'error');
    }
  }

  renderPrintSheetCanvas(photoCanvas, sheet) {
    const canvas = document.createElement('canvas');
    canvas.width = sheet.width;
    canvas.height = sheet.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margin = Math.round(DPI * 0.18);
    const gap = Math.round(DPI * 0.08);
    const cols = Math.max(1, Math.floor((canvas.width - margin * 2 + gap) / (photoCanvas.width + gap)));
    const rows = Math.max(1, Math.floor((canvas.height - margin * 2 + gap) / (photoCanvas.height + gap)));
    const copies = cols * rows;
    const usedWidth = cols * photoCanvas.width + (cols - 1) * gap;
    const startX = Math.round((canvas.width - usedWidth) / 2);

    let drawn = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * (photoCanvas.width + gap);
        const y = margin + row * (photoCanvas.height + gap);
        ctx.drawImage(photoCanvas, x, y);
        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(x, y, photoCanvas.width, photoCanvas.height);
        drawn += 1;
      }
    }

    canvas.dataset.copies = String(drawn || copies);
    return canvas;
  }

  downloadContainerClear() {
    this.elements.downloadContainer.innerHTML = '';
  }

  appendDownload(blob, filename, label) {
    const link = createDownloadLink(blob, filename, label);
    this.elements.downloadContainer.appendChild(link);
  }

  setExportMetadata(element, values) {
    Object.entries(values).forEach(([key, value]) => {
      element.setAttribute(`data-${key}`, String(value));
    });
  }
}

export function initTool() {
  const tool = new PassportPhotoTool();
  return tool.init();
}
