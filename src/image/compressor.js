/**
 * Image compression module using compressorjs
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { initFileUpload } from '../common/fileUpload.js';
import { addLog, updateProgress, showLogs } from '../common/utils.js';
import Compressor from 'compressorjs';

// Image compression tool template
export const template = `
    <div class="tool-container">
      <h1>Image Compressor</h1>
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🗜️</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPEG, PNG, WebP</p>
        <input type="file" id="fileInput" class="hidden" accept="image/jpeg,image/png,image/webp">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      </div>

      <div class="image-wrapper mt-4">
        <img id="preview" style="display: none;" class="max-w-96 max-h-72 w-auto h-auto border border-slate-200 dark:border-gray-600 rounded-lg">
      </div>
      
      <div class="my-4 grid gap-4">
        <div class="flex flex-col gap-2">
          <label for="quality" class="font-medium text-slate-700 dark:text-slate-300">Compression Quality: <span id="qualityValue">0.6</span></label>
          <input type="range" id="quality" min="0.1" max="1.0" step="0.05" value="0.6" class="w-full h-2 bg-slate-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer">
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Lower quality = smaller file size, higher compression</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="preserveExif" class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="preserveExif" class="text-sm text-slate-700 dark:text-slate-300">Preserve EXIF metadata</label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="font-medium text-slate-700 dark:text-slate-300 block mb-1">Format:</label>
            <div class="flex flex-wrap gap-3">
              <label class="inline-flex items-center">
                <input type="radio" name="format" value="auto" checked class="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                <span class="ml-2 text-slate-700 dark:text-slate-300">Auto</span>
              </label>
              <label class="inline-flex items-center">
                <input type="radio" name="format" value="jpeg" class="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                <span class="ml-2 text-slate-700 dark:text-slate-300">JPEG</span>
              </label>
              <label class="inline-flex items-center">
                <input type="radio" name="format" value="png" class="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                <span class="ml-2 text-slate-700 dark:text-slate-300">PNG</span>
              </label>
              <label class="inline-flex items-center">
                <input type="radio" name="format" value="webp" class="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                <span class="ml-2 text-slate-700 dark:text-slate-300">WebP</span>
              </label>
            </div>
          </div>
        </div>
        <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Compress Image</button>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
      </div>

      <div class="comparison-container mt-8" style="display: none;">
        <h2 class="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Before & After Comparison</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="original-image-container">
            <h3 class="text-md font-medium text-slate-700 dark:text-slate-300 mb-2">Original Image</h3>
            <div id="originalStats" class="text-sm text-slate-600 dark:text-slate-400 mb-2"></div>
            <img id="original-image" class="border border-slate-200 dark:border-gray-600 rounded-lg w-full h-auto">
          </div>
          <div class="compressed-image-container">
            <h3 class="text-md font-medium text-slate-700 dark:text-slate-300 mb-2">Compressed Image</h3>
            <div id="compressedStats" class="text-sm text-slate-600 dark:text-slate-400 mb-2"></div>
            <img id="compressed-image" class="border border-slate-200 dark:border-gray-600 rounded-lg w-full h-auto">
          </div>
        </div>
      </div>

      <div id="outputContainer" class="output-container bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-4 mt-4" style="display: none;">
        <div id="downloadContainer" class="flex flex-col items-center py-4">
          <div id="savingStats" class="mb-4 text-center text-green-600 dark:text-green-400 font-medium"></div>
          <button id="downloadBtn" class="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-medium py-2.5 px-6 rounded-md shadow-sm transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 9.5a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 8.5H7.5a.5.5 0 0 1 .5.5z"/>
              <path d="M.5 1a.5.5 0 0 0 0 1h1.875v11.25H.5a.5.5 0 0 0 0 1h14.5a.5.5 0 0 0 0-1h-1.875V2H14.5a.5.5 0 0 0 0-1H.5z"/>
            </svg>
            Download Compressed Image
          </button>
        </div>
      </div>

      <div id="logContainer" class="mt-6 border border-slate-300 dark:border-gray-600 rounded-md overflow-hidden">
        <div id="logHeader" class="cursor-pointer bg-slate-100 dark:bg-gray-700 p-3 flex justify-between items-center">
          <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
          <span id="logToggle" class="text-sm">▶</span>
        </div>
        <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" style="display: none;"></textarea>
      </div>
    </div>
`;

export default class ImageCompressor extends Tool {
  constructor() {
    super({
      id: 'compressor',
      name: 'Image Compressor',
      category: 'image',
      template: template,
      needsFileUpload: true,
      hasOutput: true,
      customFooter: {
        author: 'SafeWebTool',
        version: '1.0.0',
        description: 'Compress images to reduce file size while maintaining quality',
        showBackLink: true
      }
    });

    this.original = {
      file: null,
      size: 0,
      width: 0,
      height: 0
    };

    this.compressed = {
      blob: null,
      size: 0,
      width: 0,
      height: 0
    };
  }

  /**
   * Initialize the tool
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize elements
      this.elements = {
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        preview: document.getElementById('preview'),
        quality: document.getElementById('quality'),
        qualityValue: document.getElementById('qualityValue'),
        preserveExif: document.getElementById('preserveExif'),
        formatRadios: document.querySelectorAll('input[name="format"]'),
        processBtn: document.getElementById('processBtn'),
        progress: document.getElementById('progress'),
        progressBar: document.querySelector('#progress div'),
        progressText: document.querySelector('#progress div + div'),
        comparisonContainer: document.querySelector('.comparison-container'),
        originalImage: document.getElementById('original-image'),
        originalStats: document.getElementById('originalStats'),
        compressedImage: document.getElementById('compressed-image'),
        compressedStats: document.getElementById('compressedStats'),
        outputContainer: document.getElementById('outputContainer'),
        savingStats: document.getElementById('savingStats'),
        downloadBtn: document.getElementById('downloadBtn'),
        logContainer: document.getElementById('logContainer'),
        logContent: document.getElementById('logContent')
      };
      
      // Initialize file upload functionality
      this.initFileUpload();
      
      // Initialize UI interactions
      this.initUI();

      // Show logs
      showLogs();
      
      // Add to log
      addLog('Image Compressor tool initialized', 'info');
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Image Compressor tool:', error);
      addLog(`Initialization error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Initialize file upload functionality
   */
  initFileUpload() {
    const { dropZone, fileInput, preview, processBtn } = this.elements;
    
    // Use the common file upload module
    const cleanup = initFileUpload({
      dropZoneId: 'dropZone',
      fileInputId: 'fileInput',
      acceptTypes: 'image/jpeg,image/png,image/webp',
      onFileSelected: (file) => this.onFileSelected(file),
      hideDropZoneOnSelect: false
    });
    
    this.cleanup = cleanup;
  }
  
  /**
   * Initialize UI interactions
   */
  initUI() {
    const { 
      quality, qualityValue, 
      preserveExif, formatRadios, processBtn,
      downloadBtn
    } = this.elements;
    
    // Update quality value display
    quality.addEventListener('input', () => {
      qualityValue.textContent = quality.value;
    });
    
    // Process button click
    processBtn.addEventListener('click', () => {
      this.compressImage();
    });
    
    // Download button click
    downloadBtn.addEventListener('click', () => {
      this.downloadCompressedImage();
    });
  }
  
  /**
   * Handle file selected event
   * @param {File} file - The selected file
   */
  async onFileSelected(file) {
    try {
      const { preview, processBtn, comparisonContainer, outputContainer } = this.elements;
      
      // Store original file info
      this.original.file = file;
      this.original.size = file.size;
      
      // Hide output containers from previous operations
      comparisonContainer.style.display = 'none';
      outputContainer.style.display = 'none';
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      
      // Update preview image
      preview.onload = () => {
        // Get dimensions of the loaded image
        this.original.width = preview.naturalWidth;
        this.original.height = preview.naturalHeight;
        
        // Show preview and enable process button
        preview.style.display = 'block';
        processBtn.disabled = false;
        
        // Add to log
        addLog(`Image loaded: ${file.name} (${formatFileSize(file.size)}, ${this.original.width}x${this.original.height})`, 'info');
      };
      
      preview.src = objectUrl;
      
    } catch (error) {
      console.error('Error handling selected file:', error);
      addLog(`Error handling file: ${error.message}`, 'error');
    }
  }
  
  /**
   * Compress the image with selected settings
   */
  compressImage() {
    const { 
      quality, preserveExif, formatRadios,
      processBtn, progress, progressBar, progressText,
      originalImage, compressedImage, comparisonContainer,
      outputContainer, savingStats
    } = this.elements;
    
    // Disable process button
    processBtn.disabled = true;
    
    // Show progress indicator
    progress.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    // Get selected format
    let selectedFormat = 'auto';
    formatRadios.forEach(radio => {
      if (radio.checked) {
        selectedFormat = radio.value;
      }
    });
    
    // Set compressor options with improved compression settings
    const options = {
      quality: parseFloat(quality.value),
      // Force stronger compression by using stricter settings
      strict: true,
      // Convert to JPEG if auto mode to ensure better compression
      convertSize: 200000, // Convert large images to JPEG if over 200KB
      success: (result) => {
        // Store compressed result
        this.compressed.blob = result;
        this.compressed.size = result.size;
        
        // Create object URLs
        const originalUrl = URL.createObjectURL(this.original.file);
        const compressedUrl = URL.createObjectURL(result);
        
        // Set up comparison images
        originalImage.onload = () => {
          // Set up compressed image
          compressedImage.onload = () => {
            // Get dimensions of the compressed image
            this.compressed.width = compressedImage.naturalWidth;
            this.compressed.height = compressedImage.naturalHeight;
            
            // Update stats
            this.updateStats();
            
            // Show comparison and output containers
            comparisonContainer.style.display = 'block';
            outputContainer.style.display = 'block';
            
            // Re-enable process button
            processBtn.disabled = false;
            
            // Hide progress
            progress.style.display = 'none';
            
            // Add to log
            const compressionRatio = ((1 - (this.compressed.size / this.original.size)) * 100).toFixed(2);
            addLog(`Compression complete: Size reduced by ${compressionRatio}% (${formatFileSize(this.original.size)} → ${formatFileSize(this.compressed.size)})`, 'success');
          };
          compressedImage.src = compressedUrl;
        };
        originalImage.src = originalUrl;
      },
      error: (err) => {
        console.error('Error compressing image:', err);
        addLog(`Compression error: ${err.message}`, 'error');
        progress.style.display = 'none';
        processBtn.disabled = false;
      }
    };
    
    // Use optimal settings for compression
    options.checkOrientation = true;
    options.mimeType = selectedFormat !== 'auto' ? `image/${selectedFormat}` : undefined;
    options.preserveExif = preserveExif.checked;
    
    // Progress tracking
    options.beforeDraw = () => {
      updateProgress(25);
    };
    
    options.drew = () => {
      updateProgress(75);
    };
    
    // Update progress function
    const updateProgress = (percent) => {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
    };
    
    addLog(`Starting compression with quality=${options.quality}${options.mimeType ? ', format=' + options.mimeType : ''}, preserveExif=${options.preserveExif}`, 'info');
    
    // Start compression
    new Compressor(this.original.file, options);
  }
  
  /**
   * Update stats display for original and compressed images
   */
  updateStats() {
    const { originalStats, compressedStats, savingStats } = this.elements;
    
    // Update original stats
    originalStats.textContent = `${formatFileSize(this.original.size)} • ${this.original.width}x${this.original.height}`;
    
    // Update compressed stats
    compressedStats.textContent = `${formatFileSize(this.compressed.size)} • ${this.compressed.width}x${this.compressed.height}`;
    
    // Calculate savings
    const sizeSaved = this.original.size - this.compressed.size;
    const percentSaved = ((sizeSaved / this.original.size) * 100).toFixed(2);
    
    // Update saving stats
    savingStats.textContent = `Reduced by ${percentSaved}% (${formatFileSize(sizeSaved)} saved)`;
    
    // Add color coding based on savings
    if (percentSaved > 50) {
      savingStats.className = 'mb-4 text-center text-green-600 dark:text-green-400 font-medium';
    } else if (percentSaved > 20) {
      savingStats.className = 'mb-4 text-center text-blue-600 dark:text-blue-400 font-medium';
    } else {
      savingStats.className = 'mb-4 text-center text-slate-600 dark:text-slate-400 font-medium';
    }
  }
  
  /**
   * Download the compressed image
   */
  downloadCompressedImage() {
    if (!this.compressed.blob) {
      addLog('No compressed image to download', 'error');
      return;
    }
    
    try {
      // Get file extension
      const originalFileName = this.original.file.name;
      const fileNameParts = originalFileName.split('.');
      const extension = fileNameParts.pop(); // Get the extension
      const fileNameWithoutExt = fileNameParts.join('.'); // Rejoin in case of multiple dots
      
      // Get compressed image mime type and determine appropriate extension
      const mimeType = this.compressed.blob.type;
      let newExtension = extension;
      
      if (mimeType === 'image/jpeg') newExtension = 'jpg';
      else if (mimeType === 'image/png') newExtension = 'png';
      else if (mimeType === 'image/webp') newExtension = 'webp';
      
      // Create a new filename
      const newFileName = `${fileNameWithoutExt}-compressed.${newExtension}`;
      
      // Create download link
      const url = URL.createObjectURL(this.compressed.blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = newFileName;
      
      // Append to body, click, and remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      addLog(`Image downloaded as ${newFileName}`, 'success');
    } catch (error) {
      console.error('Error downloading image:', error);
      addLog(`Download error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.cleanup) {
      this.cleanup();
    }
    
    // Clean up object URLs
    if (this.elements.preview && this.elements.preview.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.elements.preview.src);
    }
    
    if (this.elements.originalImage && this.elements.originalImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.elements.originalImage.src);
    }
    
    if (this.elements.compressedImage && this.elements.compressedImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.elements.compressedImage.src);
    }
  }
}

/**
 * Initialize the Image Compressor tool
 * @returns {Promise<void>} A promise that resolves when the tool is initialized
 */
export function initTool() {
  const tool = new ImageCompressor();
  return tool.init();
}
