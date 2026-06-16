/**
 * Image resize module using HTML Canvas
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { createSampleImageFile } from './sample-image.js';

// Image resize tool template
export const template = `
    <div class="tool-container">
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🖼️</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPEG, PNG, WebP, BMP, TIFF</p>
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
          <label for="width" class="font-medium text-slate-700 dark:text-slate-300">Width:</label>
          <input type="number" id="width" placeholder="Width" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400">
        </div>
        <div class="flex flex-col gap-2">
          <label for="height" class="font-medium text-slate-700 dark:text-slate-300">Height:</label>
          <input type="number" id="height" placeholder="Height" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400">
        </div>
        <div class="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" id="keepRatio" checked class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="keepRatio" class="text-sm text-slate-700 dark:text-slate-300">Keep Aspect Ratio</label>
        </div>
        <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:col-span-2" disabled>Resize Image</button>
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

class ImageResizeTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'image',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template // Use the local template
    });
    
    this.originalImage = null;
    this.imageAspectRatio = 1;
    this.originalWidth = 0;
    this.originalHeight = 0;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      preview: 'preview',
      outputImage: 'output-image',
      width: 'width',
      height: 'height',
      keepRatio: 'keepRatio',
      processBtn: 'processBtn',
      progress: 'progress',
      outputContainer: 'outputContainer',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent',
      sampleImageBtn: 'sampleImageBtn'
    };
  }

  async setup() {
    // Disable inputs until image is loaded
    if (this.elements.width) this.elements.width.disabled = true;
    if (this.elements.height) this.elements.height.disabled = true;
    if (this.elements.keepRatio) this.elements.keepRatio.checked = true;
    if (this.elements.processBtn) this.elements.processBtn.disabled = true;

    this.initFileUpload({
      acceptTypes: 'image/*',
      onFileSelected: (file) => {
        this.loadImage(file);
      }
    });

    // Handle dimension changes
    if (this.elements.width) {
      this.elements.width.addEventListener('input', () => {
        if (this.elements.keepRatio && this.elements.keepRatio.checked) {
          this.updateHeight();
        }
      });
    }
    
    if (this.elements.height) {
      this.elements.height.addEventListener('input', () => {
        if (this.elements.keepRatio && this.elements.keepRatio.checked) {
          this.updateWidth();
        }
      });
    }

    this.elements.sampleImageBtn?.addEventListener('click', () => {
      this.loadBuiltInSample();
    });

    await this.loadBuiltInSample(true);
  }

  async loadBuiltInSample(silent = false) {
    try {
      const sampleFile = await createSampleImageFile();
      this.inputFile = sampleFile;
      this.loadImage(sampleFile);
      if (!silent) {
        this.log('Loaded built-in sample image. Select your own image anytime.', 'info');
      }
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
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        this.originalImage = img;
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.imageAspectRatio = img.width / img.height;
        
        // Show preview
        if (this.elements.preview) {
          this.elements.preview.src = e.target.result;
          this.elements.preview.style.display = 'block';
        }
        
        // Enable inputs and set initial values
        this.elements.width.disabled = false;
        this.elements.height.disabled = false;
        this.elements.keepRatio.disabled = false;
        this.elements.processBtn.disabled = false;
        
        // Set initial values to original dimensions
        this.elements.width.value = this.originalWidth;
        this.elements.height.value = this.originalHeight;
        
        // Set placeholders
        this.elements.width.placeholder = 'Width';
        this.elements.height.placeholder = 'Height';
        
        this.log(`Image loaded: ${file.name} (${formatFileSize(file.size)})`, 'info');
      };
      
      img.onerror = () => {
        this.log('Failed to load image', 'error');
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      this.log('Failed to read file', 'error');
    };
    
    reader.readAsDataURL(file);
  }

  updateHeight() {
    if (!this.elements.width || !this.elements.height) return;
    
    const width = parseInt(this.elements.width.value) || 0;
    if (width <= 0) return;

    this.elements.height.value = Math.round(width / this.imageAspectRatio);
  }

  updateWidth() {
    if (!this.elements.width || !this.elements.height) return;
    
    const height = parseInt(this.elements.height.value) || 0;
    if (height <= 0) return;

    this.elements.width.value = Math.round(height * this.imageAspectRatio);
  }

  calculateDimensions() {
    if (!this.elements.width || !this.elements.height) return { width: 0, height: 0 };
    
    const width = parseInt(this.elements.width.value) || this.originalWidth;
    const height = parseInt(this.elements.height.value) || this.originalHeight;

    return { width, height };
  }

  async processFile(file) {
    try {
      if (!this.originalImage) {
        this.log('No image selected', 'error');
        return;
      }

      this.startProcessing();
      this.updateProgress(10);

      const dimensions = this.calculateDimensions();
      const { width, height } = dimensions;

      if (width <= 0 || height <= 0) {
        this.log('Please enter valid dimensions', 'error');
        this.endProcessing(false);
        return;
      }

      this.log(`Resizing to ${width}x${height} pixels...`, 'info');
      this.updateProgress(30);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      // Draw image with smooth interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.originalImage, 0, 0, width, height);

      this.updateProgress(70);

      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, file.type, 0.92);
      });

      if (!blob) {
        throw new Error('Failed to process image');
      }

      // Display output and create download link
      const url = URL.createObjectURL(blob);
      
      // Display the resized image
      if (this.elements.outputImage) {
        this.elements.outputImage.src = url;
        this.elements.outputImage.style.display = 'block';
      }
      
      // Create download link
      if (this.elements.outputContainer) {
        this.elements.outputContainer.style.display = 'block';
      }
      this.displayOutputMedia(blob, 'outputImage', `resized_${width}x${height}.${file.type.split('/')[1]}`, 'downloadContainer');
      
      this.updateProgress(100);
      this.log('Resizing complete!', 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new ImageResizeTool({
    id: 'resize',
    name: 'Image Resize'
  });
  
  return tool.init();
} 
