/**
 * Image Format Converter — convert images between JPG, PNG, and WebP
 * using the Canvas API. All processing happens locally in the browser.
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';

export const template = `
    <div class="tool-container">
      <div id="dropZone" class="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🖼️</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPEG, PNG, WebP, GIF, BMP — converted locally, never uploaded</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button class="file-select-btn min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Select File</button>
      </div>

      <div class="image-wrapper mt-4">
        <img id="preview" style="display: none;" class="max-w-96 max-h-72 w-auto h-auto border border-slate-200 dark:border-gray-600 rounded-lg">
      </div>

      <div class="my-4 grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="formatSelect" class="font-medium text-slate-700 dark:text-slate-300">Output format:</label>
          <select id="formatSelect" class="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400">
            <option value="image/jpeg">JPG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>
        <div id="qualityRow" class="flex flex-col gap-2">
          <label for="qualitySlider" class="font-medium text-slate-700 dark:text-slate-300">Quality: <span id="qualityValue">0.9</span></label>
          <input type="range" id="qualitySlider" min="0.1" max="1" step="0.05" value="0.9" class="w-full accent-blue-600">
        </div>
        <button id="processBtn" class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed md:col-span-2" disabled>Convert Image</button>
      </div>

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

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

class ImageConvertTool extends Tool {
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
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      preview: 'preview',
      outputImage: 'output-image',
      formatSelect: 'formatSelect',
      qualityRow: 'qualityRow',
      qualitySlider: 'qualitySlider',
      qualityValue: 'qualityValue',
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

    this.elements.qualitySlider?.addEventListener('input', () => {
      if (this.elements.qualityValue) {
        this.elements.qualityValue.textContent = this.elements.qualitySlider.value;
      }
    });

    this.elements.formatSelect?.addEventListener('change', () => this.updateQualityVisibility());
    this.updateQualityVisibility();
  }

  updateQualityVisibility() {
    // Quality applies to lossy formats (JPG, WebP); PNG is lossless.
    const format = this.elements.formatSelect?.value || 'image/jpeg';
    if (this.elements.qualityRow) {
      this.elements.qualityRow.style.visibility = format === 'image/png' ? 'hidden' : 'visible';
    }
  }

  loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.log('Please select a valid image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        if (this.elements.preview) {
          this.elements.preview.src = e.target.result;
          this.elements.preview.style.display = 'block';
        }
        if (this.elements.processBtn) this.elements.processBtn.disabled = false;
        this.log(`Image loaded: ${file.name} (${file.type}, ${formatFileSize(file.size)}, ${img.width}x${img.height})`, 'info');
      };
      img.onerror = () => this.log('Failed to load image — the file may be corrupted or unsupported', 'error');
      img.src = e.target.result;
    };
    reader.onerror = () => this.log('Failed to read file', 'error');
    reader.readAsDataURL(file);
  }

  async processFile(file) {
    try {
      if (!this.originalImage) {
        this.log('No image selected', 'error');
        return;
      }

      this.startProcessing();
      this.updateProgress(10);

      const mimeType = this.elements.formatSelect.value;
      const quality = parseFloat(this.elements.qualitySlider.value) || 0.9;
      const ext = EXTENSIONS[mimeType];

      this.log(`Converting to ${ext.toUpperCase()}${mimeType !== 'image/png' ? ` (quality ${quality})` : ''}...`, 'info');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.width;
      canvas.height = this.originalImage.height;
      const ctx = canvas.getContext('2d');

      // JPG has no alpha channel — fill with white so transparency doesn't turn black.
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(60);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : quality);
      });

      if (!blob) {
        throw new Error(`Your browser could not encode ${ext.toUpperCase()}`);
      }

      const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
      this.displayOutputMedia(blob, 'outputImage', `${baseName}.${ext}`, 'downloadContainer');
      if (this.elements.outputContainer) this.elements.outputContainer.style.display = 'block';

      this.updateProgress(100);
      const delta = blob.size - file.size;
      const deltaText = delta === 0
        ? 'same size'
        : `${delta < 0 ? '-' : '+'}${formatFileSize(Math.abs(delta))}`;
      this.log(`Before: ${formatFileSize(file.size)} (${file.type || 'unknown'}) → After: ${formatFileSize(blob.size)} (${mimeType}) [${deltaText}]`, 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new ImageConvertTool({
    id: 'convert',
    name: 'Image Format Converter'
  });
  return tool.init();
}
