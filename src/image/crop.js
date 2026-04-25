/**
 * Image crop module using HTML Canvas
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { createSampleImageFile } from './sample-image.js';

export const template = `
    <div class="tool-container">
      <h1>Image Crop</h1>
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">✂️</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Crop with exact pixel values (JPEG, PNG, WebP and more)</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
        <button id="sampleImageBtn" type="button" class="mt-2 text-sm text-blue-700 dark:text-blue-300 hover:underline">Use built-in sample image</button>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Sample loads automatically. You can replace it anytime.</p>
      </div>

      <div class="image-wrapper mt-4">
        <img id="preview" style="display: none;" class="max-w-96 max-h-72 w-auto h-auto border border-slate-200 dark:border-gray-600 rounded-lg">
      </div>

      <div class="my-4 grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="cropX" class="font-medium text-slate-700 dark:text-slate-300">X (left):</label>
          <input type="number" id="cropX" min="0" value="0" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100">
        </div>
        <div class="flex flex-col gap-2">
          <label for="cropY" class="font-medium text-slate-700 dark:text-slate-300">Y (top):</label>
          <input type="number" id="cropY" min="0" value="0" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100">
        </div>
        <div class="flex flex-col gap-2">
          <label for="cropWidth" class="font-medium text-slate-700 dark:text-slate-300">Crop Width:</label>
          <input type="number" id="cropWidth" min="1" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100">
        </div>
        <div class="flex flex-col gap-2">
          <label for="cropHeight" class="font-medium text-slate-700 dark:text-slate-300">Crop Height:</label>
          <input type="number" id="cropHeight" min="1" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100">
        </div>
        <div class="md:col-span-2 flex flex-wrap items-center gap-3">
          <button id="centerCropBtn" type="button" class="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors text-sm">Center 50% Crop</button>
          <button id="resetCropBtn" type="button" class="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors text-sm">Reset to Full Image</button>
        </div>
        <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:col-span-2" disabled>Crop Image</button>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
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
    this.originalWidth = 0;
    this.originalHeight = 0;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      preview: 'preview',
      outputImage: 'output-image',
      cropX: 'cropX',
      cropY: 'cropY',
      cropWidth: 'cropWidth',
      cropHeight: 'cropHeight',
      centerCropBtn: 'centerCropBtn',
      resetCropBtn: 'resetCropBtn',
      sampleImageBtn: 'sampleImageBtn',
      processBtn: 'processBtn',
      progress: 'progress',
      outputContainer: 'outputContainer',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.disableCropInputs();

    this.initFileUpload({
      acceptTypes: 'image/*',
      onFileSelected: file => {
        this.loadImage(file);
      }
    });

    this.elements.resetCropBtn?.addEventListener('click', () => this.resetCropToFullImage());
    this.elements.centerCropBtn?.addEventListener('click', () => this.centerCrop());
    this.elements.sampleImageBtn?.addEventListener('click', () => this.loadBuiltInSample());

    await this.loadBuiltInSample(true);
  }

  disableCropInputs() {
    ['cropX', 'cropY', 'cropWidth', 'cropHeight', 'centerCropBtn', 'resetCropBtn', 'processBtn']
      .forEach(key => {
        if (this.elements[key]) this.elements[key].disabled = true;
      });
  }

  enableCropInputs() {
    ['cropX', 'cropY', 'cropWidth', 'cropHeight', 'centerCropBtn', 'resetCropBtn', 'processBtn']
      .forEach(key => {
        if (this.elements[key]) this.elements[key].disabled = false;
      });
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

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalWidth = img.width;
        this.originalHeight = img.height;

        if (this.elements.preview) {
          this.elements.preview.src = event.target.result;
          this.elements.preview.style.display = 'block';
        }

        this.enableCropInputs();
        this.resetCropToFullImage();
        this.log(`Image loaded: ${file.name} (${formatFileSize(file.size)}, ${img.width}x${img.height})`, 'info');
      };
      img.onerror = () => this.log('Failed to load image', 'error');
      img.src = event.target.result;
    };
    reader.onerror = () => this.log('Failed to read file', 'error');
    reader.readAsDataURL(file);
  }

  resetCropToFullImage() {
    if (!this.originalImage) return;
    this.elements.cropX.value = 0;
    this.elements.cropY.value = 0;
    this.elements.cropWidth.value = this.originalWidth;
    this.elements.cropHeight.value = this.originalHeight;
  }

  centerCrop() {
    if (!this.originalImage) return;
    const cropWidth = Math.max(1, Math.round(this.originalWidth * 0.5));
    const cropHeight = Math.max(1, Math.round(this.originalHeight * 0.5));
    this.elements.cropWidth.value = cropWidth;
    this.elements.cropHeight.value = cropHeight;
    this.elements.cropX.value = Math.floor((this.originalWidth - cropWidth) / 2);
    this.elements.cropY.value = Math.floor((this.originalHeight - cropHeight) / 2);
  }

  getCropRect() {
    const x = Math.max(0, parseInt(this.elements.cropX.value, 10) || 0);
    const y = Math.max(0, parseInt(this.elements.cropY.value, 10) || 0);
    const width = Math.max(1, parseInt(this.elements.cropWidth.value, 10) || 0);
    const height = Math.max(1, parseInt(this.elements.cropHeight.value, 10) || 0);

    const clampedX = Math.min(x, Math.max(0, this.originalWidth - 1));
    const clampedY = Math.min(y, Math.max(0, this.originalHeight - 1));
    const clampedWidth = Math.min(width, this.originalWidth - clampedX);
    const clampedHeight = Math.min(height, this.originalHeight - clampedY);

    return {
      x: clampedX,
      y: clampedY,
      width: Math.max(1, clampedWidth),
      height: Math.max(1, clampedHeight)
    };
  }

  async processFile(file) {
    try {
      if (!this.originalImage) {
        this.log('No image selected', 'error');
        return;
      }

      this.startProcessing();
      this.updateProgress(10);

      const crop = this.getCropRect();
      this.log(`Cropping image at (${crop.x}, ${crop.y}) to ${crop.width}x${crop.height}...`, 'info');

      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      this.updateProgress(45);
      ctx.drawImage(
        this.originalImage,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      this.updateProgress(75);
      const outputType = file?.type?.startsWith('image/') ? file.type : 'image/png';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, outputType, 0.92));
      if (!blob) throw new Error('Failed to crop image');

      if (this.elements.outputContainer) {
        this.elements.outputContainer.style.display = 'block';
      }
      this.displayOutputMedia(
        blob,
        'outputImage',
        `cropped_${crop.width}x${crop.height}.${(outputType.split('/')[1] || 'png').replace('jpeg', 'jpg')}`,
        'downloadContainer'
      );

      this.updateProgress(100);
      this.log('Crop complete!', 'success');
      this.endProcessing(false);
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
