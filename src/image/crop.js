/**
 * Visual image crop tool — drag a crop rectangle directly on a canvas.
 * Pointer events (mouse + touch), all processing local in the browser.
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { createSampleImageFile } from './sample-image.js';

const HANDLE_HIT_RADIUS = 18;   // display px — generous for touch
const MIN_CROP_DISPLAY = 24;    // minimum selection size in display px

export const template = `
    <div class="tool-container space-y-6">
      <div id="dropZone" class="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        <div class="text-4xl mb-3">✂️</div>
        <p class="text-slate-600 dark:text-slate-300 font-medium">Drop your image here</p>
        <p class="text-slate-400 dark:text-slate-500 text-sm mt-1">or</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button type="button" class="file-select-btn mt-3 min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Choose File</button>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, WebP and more. A sample image loads automatically —
          <button id="sampleImageBtn" type="button" class="text-blue-700 dark:text-blue-300 hover:underline">reload sample</button>
        </p>
      </div>

      <div id="cropStage" class="hidden">
        <div class="relative mx-auto w-full max-w-2xl rounded-lg overflow-hidden bg-slate-900/5 dark:bg-black/30">
          <canvas id="cropCanvas" class="block w-full touch-none cursor-crosshair select-none"></canvas>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Selection: <span id="cropReadout" class="font-mono font-semibold text-slate-900 dark:text-white">–</span>
          </p>
          <button id="resetCropBtn" type="button" class="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium">Reset selection</button>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag inside the box to move it, drag the corners or edges to resize, or drag on the dark area to start a new selection.</p>
      </div>

      <button id="processBtn" class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>Crop &amp; Download</button>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden" style="display: none;">
        <div class="h-5 bg-blue-600 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5 progress-text">0%</div>
      </div>

      <div id="outputContainer" class="output-container bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-4" style="display: none;">
        <div class="image-wrapper">
          <img id="output-image" alt="Cropped result" style="display: none;" class="max-w-full rounded-lg shadow">
        </div>
        <div id="downloadContainer" class="hidden text-center py-4"></div>
      </div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class ImageCropTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'image',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template
    });

    this.originalImage = null;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.scale = 1;           // display px per image px
    this.crop = null;         // {x, y, width, height} in image px
    this.drag = null;         // active pointer drag state
    this.outputType = 'image/png';
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      cropStage: 'cropStage',
      cropCanvas: 'cropCanvas',
      cropReadout: 'cropReadout',
      resetCropBtn: 'resetCropBtn',
      sampleImageBtn: 'sampleImageBtn',
      outputImage: 'output-image',
      processBtn: 'processBtn',
      progress: 'progress',
      outputContainer: 'outputContainer',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'image/*',
      hideDropZoneOnSelect: false,
      onFileSelected: file => this.loadImage(file)
    });

    this.elements.resetCropBtn?.addEventListener('click', () => {
      this.resetCrop();
      this.draw();
    });
    this.elements.sampleImageBtn?.addEventListener('click', event => {
      event.stopPropagation();
      this.loadBuiltInSample();
    });

    this.bindPointerEvents();
    window.addEventListener('resize', () => {
      if (this.originalImage) {
        this.layoutCanvas();
        this.draw();
      }
    });

    await this.loadBuiltInSample(true);
  }

  async loadBuiltInSample(silent = false) {
    try {
      const sampleFile = await createSampleImageFile();
      this.inputFile = sampleFile;
      this.loadImage(sampleFile);
      if (!silent) this.log('Loaded built-in sample image. Select your own image anytime.', 'info');
    } catch (error) {
      this.log(`Failed to load built-in sample image: ${error.message}`, 'error');
    }
  }

  loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.log('Please select a valid image file', 'error');
      return;
    }

    this.outputType = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png';

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.imageWidth = img.width;
        this.imageHeight = img.height;

        this.elements.cropStage?.classList.remove('hidden');
        this.layoutCanvas();
        this.resetCrop();
        this.draw();

        if (this.elements.processBtn) this.elements.processBtn.disabled = false;
        this.log(`Image loaded: ${file.name} (${formatFileSize(file.size)}, ${img.width}x${img.height}). Drag on the image to choose the crop area.`, 'info');
      };
      img.onerror = () => this.log('Failed to load image — the file may be corrupted or unsupported', 'error');
      img.src = event.target.result;
    };
    reader.onerror = () => this.log('Failed to read file', 'error');
    reader.readAsDataURL(file);
  }

  layoutCanvas() {
    const canvas = this.elements.cropCanvas;
    if (!canvas || !this.originalImage) return;

    const container = canvas.parentElement;
    const maxWidth = Math.max(200, container.clientWidth || 640);
    const maxHeight = 480;

    this.scale = Math.min(maxWidth / this.imageWidth, maxHeight / this.imageHeight, 1);
    canvas.width = Math.max(1, Math.round(this.imageWidth * this.scale));
    canvas.height = Math.max(1, Math.round(this.imageHeight * this.scale));
  }

  resetCrop() {
    // Default selection: centered 80% of the image, so handles are visible.
    const w = Math.max(1, Math.round(this.imageWidth * 0.8));
    const h = Math.max(1, Math.round(this.imageHeight * 0.8));
    this.crop = {
      x: Math.round((this.imageWidth - w) / 2),
      y: Math.round((this.imageHeight - h) / 2),
      width: w,
      height: h
    };
  }

  /** Crop rect in display (canvas) coordinates. */
  displayRect() {
    const { x, y, width, height } = this.crop;
    return {
      x: x * this.scale,
      y: y * this.scale,
      w: width * this.scale,
      h: height * this.scale
    };
  }

  handlePositions() {
    const r = this.displayRect();
    return {
      nw: [r.x, r.y],
      n: [r.x + r.w / 2, r.y],
      ne: [r.x + r.w, r.y],
      e: [r.x + r.w, r.y + r.h / 2],
      se: [r.x + r.w, r.y + r.h],
      s: [r.x + r.w / 2, r.y + r.h],
      sw: [r.x, r.y + r.h],
      w: [r.x, r.y + r.h / 2]
    };
  }

  bindPointerEvents() {
    const canvas = this.elements.cropCanvas;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', event => {
      if (!this.originalImage) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);

      const point = this.eventPoint(event);
      const mode = this.hitTest(point);
      this.drag = {
        mode,
        startX: point.x,
        startY: point.y,
        startCrop: { ...this.crop }
      };

      if (mode === 'new') {
        const ix = this.clamp(point.x / this.scale, 0, this.imageWidth);
        const iy = this.clamp(point.y / this.scale, 0, this.imageHeight);
        this.drag.anchor = { x: ix, y: iy };
        this.crop = { x: Math.round(ix), y: Math.round(iy), width: 1, height: 1 };
        this.draw();
      }
    });

    canvas.addEventListener('pointermove', event => {
      if (!this.drag || !this.originalImage) return;
      event.preventDefault();
      const point = this.eventPoint(event);

      if (this.drag.mode === 'move') {
        this.moveCrop(point);
      } else if (this.drag.mode === 'new') {
        this.sizeNewCrop(point);
      } else {
        this.resizeCrop(point, this.drag.mode);
      }
      this.draw();
    });

    const endDrag = event => {
      if (!this.drag) return;
      this.drag = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch { /* pointer already released */ }
      this.draw();
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('pointermove', event => {
      if (this.drag || !this.originalImage) return;
      canvas.style.cursor = this.cursorFor(this.hitTest(this.eventPoint(event)));
    });
  }

  eventPoint(event) {
    const rect = this.elements.cropCanvas.getBoundingClientRect();
    const scaleX = this.elements.cropCanvas.width / rect.width;
    const scaleY = this.elements.cropCanvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  hitTest(point) {
    const handles = this.handlePositions();
    for (const [name, [hx, hy]] of Object.entries(handles)) {
      if (Math.abs(point.x - hx) <= HANDLE_HIT_RADIUS && Math.abs(point.y - hy) <= HANDLE_HIT_RADIUS) {
        return name;
      }
    }
    const r = this.displayRect();
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
      return 'move';
    }
    return 'new';
  }

  cursorFor(mode) {
    const cursors = {
      nw: 'nwse-resize', se: 'nwse-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      n: 'ns-resize', s: 'ns-resize',
      e: 'ew-resize', w: 'ew-resize',
      move: 'move',
      new: 'crosshair'
    };
    return cursors[mode] || 'crosshair';
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  minCropImagePx() {
    return Math.max(1, Math.round(MIN_CROP_DISPLAY / this.scale));
  }

  moveCrop(point) {
    const dx = (point.x - this.drag.startX) / this.scale;
    const dy = (point.y - this.drag.startY) / this.scale;
    const start = this.drag.startCrop;
    this.crop.x = Math.round(this.clamp(start.x + dx, 0, this.imageWidth - start.width));
    this.crop.y = Math.round(this.clamp(start.y + dy, 0, this.imageHeight - start.height));
  }

  sizeNewCrop(point) {
    const anchor = this.drag.anchor;
    const ix = this.clamp(point.x / this.scale, 0, this.imageWidth);
    const iy = this.clamp(point.y / this.scale, 0, this.imageHeight);
    const min = this.minCropImagePx();
    const x1 = Math.min(anchor.x, ix);
    const y1 = Math.min(anchor.y, iy);
    this.crop = {
      x: Math.round(x1),
      y: Math.round(y1),
      width: Math.max(min, Math.round(Math.abs(ix - anchor.x))),
      height: Math.max(min, Math.round(Math.abs(iy - anchor.y)))
    };
    this.crop.x = this.clamp(this.crop.x, 0, this.imageWidth - this.crop.width);
    this.crop.y = this.clamp(this.crop.y, 0, this.imageHeight - this.crop.height);
  }

  resizeCrop(point, mode) {
    const start = this.drag.startCrop;
    const min = this.minCropImagePx();
    const ix = this.clamp(point.x / this.scale, 0, this.imageWidth);
    const iy = this.clamp(point.y / this.scale, 0, this.imageHeight);

    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;

    if (mode.includes('w')) left = this.clamp(ix, 0, right - min);
    if (mode.includes('e')) right = this.clamp(ix, left + min, this.imageWidth);
    if (mode.includes('n')) top = this.clamp(iy, 0, bottom - min);
    if (mode.includes('s')) bottom = this.clamp(iy, top + min, this.imageHeight);

    this.crop = {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.max(1, Math.round(right - left)),
      height: Math.max(1, Math.round(bottom - top))
    };
  }

  draw() {
    const canvas = this.elements.cropCanvas;
    if (!canvas || !this.originalImage || !this.crop) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);

    const r = this.displayRect();

    // Dark overlay outside the selection.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, canvas.width, r.y);
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, canvas.width - r.x - r.w, r.h);
    ctx.fillRect(0, r.y + r.h, canvas.width, canvas.height - r.y - r.h);

    // Rule-of-thirds guides inside the selection.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r.x + (r.w * i) / 3, r.y);
      ctx.lineTo(r.x + (r.w * i) / 3, r.y + r.h);
      ctx.moveTo(r.x, r.y + (r.h * i) / 3);
      ctx.lineTo(r.x + r.w, r.y + (r.h * i) / 3);
      ctx.stroke();
    }

    // Bright selection border.
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);

    // Square handles at corners and edge midpoints.
    const size = 9;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    for (const [hx, hy] of Object.values(this.handlePositions())) {
      ctx.fillRect(hx - size / 2, hy - size / 2, size, size);
      ctx.strokeRect(hx - size / 2, hy - size / 2, size, size);
    }

    this.updateReadout();
  }

  updateReadout() {
    const readout = this.elements.cropReadout;
    if (!readout || !this.crop) return;
    readout.textContent = `${this.crop.width} × ${this.crop.height} px at (${this.crop.x}, ${this.crop.y})`;
    readout.dataset.cropX = String(this.crop.x);
    readout.dataset.cropY = String(this.crop.y);
    readout.dataset.cropWidth = String(this.crop.width);
    readout.dataset.cropHeight = String(this.crop.height);
  }

  async processFile(file) {
    try {
      if (!this.originalImage || !this.crop) {
        this.log('No image selected', 'error');
        return;
      }

      this.startProcessing();
      this.updateProgress(10);

      // Reset previous output so an old download link can never be mistaken for the new one.
      if (this.elements.downloadContainer) {
        this.elements.downloadContainer.innerHTML = '';
        this.elements.downloadContainer.classList.add('hidden');
      }
      if (this.elements.outputImage) this.elements.outputImage.style.display = 'none';

      const crop = this.crop;
      this.log(`Cropping ${crop.width}x${crop.height} px from (${crop.x}, ${crop.y})...`, 'info');

      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      this.updateProgress(45);
      ctx.drawImage(
        this.originalImage,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );

      this.updateProgress(75);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, this.outputType, 0.92));
      if (!blob) throw new Error('Failed to crop image');

      if (this.elements.outputContainer) {
        this.elements.outputContainer.style.display = 'block';
      }
      const ext = (this.outputType.split('/')[1] || 'png').replace('jpeg', 'jpg');
      this.displayOutputMedia(blob, 'outputImage', `cropped_${crop.width}x${crop.height}.${ext}`, 'downloadContainer');
      this.elements.downloadContainer?.classList.remove('hidden');

      this.updateProgress(100);
      this.log('Crop complete!', 'success');
      this.endProcessing(true);
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new ImageCropTool({
    id: 'crop',
    name: 'Image Crop'
  });
  return tool.init();
}
