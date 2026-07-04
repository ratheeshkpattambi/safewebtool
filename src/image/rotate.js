/**
 * Image Rotator — rotate 90/180 degrees and flip images
 * using the Canvas API. All processing happens locally in the browser.
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';

export const template = `
    <div class="tool-container">
      <div id="dropZone" class="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🔄</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPEG, PNG, WebP — rotated locally, never uploaded</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button class="file-select-btn min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Select File</button>
      </div>

      <div class="my-4 flex flex-wrap gap-2 justify-center">
        <button id="rotateCwBtn" class="rotate-action min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>↻ 90° CW</button>
        <button id="rotateCcwBtn" class="rotate-action min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>↺ 90° CCW</button>
        <button id="rotate180Btn" class="rotate-action min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>180°</button>
        <button id="flipHBtn" class="rotate-action min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>⇋ Flip Horizontal</button>
        <button id="flipVBtn" class="rotate-action min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>⥯ Flip Vertical</button>
        <button id="resetBtn" class="min-h-[44px] px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>Reset</button>
      </div>

      <div class="image-wrapper mt-4 text-center">
        <img id="preview" style="display: none;" class="max-w-96 max-h-72 w-auto h-auto border border-slate-200 dark:border-gray-600 rounded-lg inline-block">
      </div>

      <button id="processBtn" class="w-full mt-4 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>Export Rotated Image</button>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5 progress-text">0%</div>
      </div>

      <div id="outputContainer" class="output-container bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-4 mt-4" style="display: none;">
        <div class="image-wrapper mt-4">
          <img id="output-image" style="display: none;" class="max-w-96 max-h-72 w-auto h-auto border border-slate-200 dark:border-gray-600 rounded-lg">
        </div>
        <div id="downloadContainer"></div>
      </div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class ImageRotateTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'image',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template
    });

    // Working canvas holds the current (possibly rotated/flipped) image state.
    this.workCanvas = null;
    this.originalImage = null;
    this.outputType = 'image/png';
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      preview: 'preview',
      outputImage: 'output-image',
      rotateCwBtn: 'rotateCwBtn',
      rotateCcwBtn: 'rotateCcwBtn',
      rotate180Btn: 'rotate180Btn',
      flipHBtn: 'flipHBtn',
      flipVBtn: 'flipVBtn',
      resetBtn: 'resetBtn',
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
      onFileSelected: (file) => this.loadImage(file)
    });

    this.elements.rotateCwBtn?.addEventListener('click', () => this.applyTransform('cw'));
    this.elements.rotateCcwBtn?.addEventListener('click', () => this.applyTransform('ccw'));
    this.elements.rotate180Btn?.addEventListener('click', () => this.applyTransform('180'));
    this.elements.flipHBtn?.addEventListener('click', () => this.applyTransform('flipH'));
    this.elements.flipVBtn?.addEventListener('click', () => this.applyTransform('flipV'));
    this.elements.resetBtn?.addEventListener('click', () => this.resetImage());
  }

  setActionButtonsEnabled(enabled) {
    for (const key of ['rotateCwBtn', 'rotateCcwBtn', 'rotate180Btn', 'flipHBtn', 'flipVBtn', 'resetBtn']) {
      if (this.elements[key]) this.elements[key].disabled = !enabled;
    }
  }

  loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.log('Please select a valid image file', 'error');
      return;
    }

    // Keep transparency for PNG/WebP sources; use JPEG for JPEG sources.
    this.outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.workCanvas = document.createElement('canvas');
        this.workCanvas.width = img.width;
        this.workCanvas.height = img.height;
        this.workCanvas.getContext('2d').drawImage(img, 0, 0);
        this.updatePreview();
        this.setActionButtonsEnabled(true);
        if (this.elements.processBtn) this.elements.processBtn.disabled = false;
        this.log(`Image loaded: ${file.name} (${formatFileSize(file.size)}, ${img.width}x${img.height}). Use the rotate/flip buttons, then download.`, 'info');
      };
      img.onerror = () => this.log('Failed to load image — the file may be corrupted or unsupported', 'error');
      img.src = e.target.result;
    };
    reader.onerror = () => this.log('Failed to read file', 'error');
    reader.readAsDataURL(file);
  }

  updatePreview() {
    if (!this.workCanvas || !this.elements.preview) return;
    this.elements.preview.src = this.workCanvas.toDataURL();
    this.elements.preview.style.display = 'inline-block';
  }

  applyTransform(kind) {
    if (!this.workCanvas) {
      this.log('Please select an image first', 'error');
      return;
    }

    const src = this.workCanvas;
    const dst = document.createElement('canvas');
    const swap = kind === 'cw' || kind === 'ccw';
    dst.width = swap ? src.height : src.width;
    dst.height = swap ? src.width : src.height;
    const ctx = dst.getContext('2d');

    switch (kind) {
      case 'cw':
        ctx.translate(dst.width, 0);
        ctx.rotate(Math.PI / 2);
        break;
      case 'ccw':
        ctx.translate(0, dst.height);
        ctx.rotate(-Math.PI / 2);
        break;
      case '180':
        ctx.translate(dst.width, dst.height);
        ctx.rotate(Math.PI);
        break;
      case 'flipH':
        ctx.translate(dst.width, 0);
        ctx.scale(-1, 1);
        break;
      case 'flipV':
        ctx.translate(0, dst.height);
        ctx.scale(1, -1);
        break;
    }

    ctx.drawImage(src, 0, 0);
    this.workCanvas = dst;
    this.updatePreview();

    const labels = {
      cw: 'Rotated 90° clockwise',
      ccw: 'Rotated 90° counter-clockwise',
      '180': 'Rotated 180°',
      flipH: 'Flipped horizontally',
      flipV: 'Flipped vertically'
    };
    this.log(`${labels[kind]} (now ${dst.width}x${dst.height})`, 'success');
  }

  resetImage() {
    if (!this.originalImage) return;
    this.workCanvas = document.createElement('canvas');
    this.workCanvas.width = this.originalImage.width;
    this.workCanvas.height = this.originalImage.height;
    this.workCanvas.getContext('2d').drawImage(this.originalImage, 0, 0);
    this.updatePreview();
    this.log('Reset to original image', 'info');
  }

  async processFile(file) {
    try {
      if (!this.workCanvas) {
        this.log('No image selected', 'error');
        return;
      }

      this.startProcessing();
      this.updateProgress(30);

      const blob = await new Promise((resolve) => {
        this.workCanvas.toBlob(resolve, this.outputType, 0.92);
      });

      if (!blob) {
        throw new Error('Failed to export the rotated image');
      }

      this.updateProgress(80);

      const ext = this.outputType === 'image/jpeg' ? 'jpg' : 'png';
      const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
      this.displayOutputMedia(blob, 'outputImage', `${baseName}_rotated.${ext}`, 'downloadContainer');
      if (this.elements.outputContainer) this.elements.outputContainer.style.display = 'block';

      this.updateProgress(100);
      this.log(`Exported ${this.workCanvas.width}x${this.workCanvas.height} image (${formatFileSize(blob.size)})`, 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new ImageRotateTool({
    id: 'rotate',
    name: 'Image Rotator'
  });
  return tool.init();
}
