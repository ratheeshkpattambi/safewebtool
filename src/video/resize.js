/**
 * Video resizing module using FFmpeg WASM
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import {
  loadFFmpeg,
  getFFmpeg,
  writeInputFile,
  readOutputFile,
  executeFFmpeg,
  getExtension,
  cleanupFFmpeg,
  getX264EncodeArgs
} from './ffmpeg-utils.js';

// Video resize tool template
export const template = `
    <div class="tool-container">
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports MP4, WebM, MOV, and other common video formats</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      </div>
      <div class="video-wrapper">
        <video id="input-video" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>
      
      <div class="my-4 grid gap-4 md:grid-cols-2 mb-6 relative">
        <div class="flex flex-col gap-2">
          <label for="width" class="font-medium text-slate-700 dark:text-slate-300">Width:</label>
          <input type="number" id="width" placeholder="Width" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <div class="flex flex-col gap-2">
          <label for="height" class="font-medium text-slate-700 dark:text-slate-300">Height:</label>
          <input type="number" id="height" placeholder="Height" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <div class="flex items-center gap-2 md:col-span-1">
          <input type="checkbox" id="keepRatio" checked class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="keepRatio" class="text-sm text-slate-700 dark:text-slate-300">Keep Aspect Ratio</label>
        </div>
        <button id="processBtn" class="w-full md:col-span-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Resize Video</button>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 overflow-hidden transition-colors" style="display: none;">
        <div class="h-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-500 ease-out relative" style="width: 0%;">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
        <div class="flex justify-between items-center mt-2 text-sm">
          <span id="progressText" class="font-medium text-slate-700 dark:text-slate-300 pl-4">0%</span>
          <span id="progressStatus" class="text-slate-500 dark:text-slate-400 text-right pr-4"></span>
        </div>
      </div>

      <div id="outputContainer" class="output-container bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-4 mt-4" style="display: none;">
        <div class="video-wrapper">
          <video id="output-video" controls style="display: none; max-width: 100%; height: auto;"></video>
        </div>
        <div id="downloadContainer"></div>
      </div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class VideoResizeTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'video',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template
    });
    
    this.ffmpeg = null;
    this.videoAspectRatio = 1;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.previewTimeout = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputVideo: 'input-video',
      outputVideo: 'output-video',
      outputContainer: 'outputContainer',
      processBtn: 'processBtn',
      width: 'width',
      height: 'height',
      keepRatio: 'keepRatio',
      progress: 'progress',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.disableInputs();
    this.initFileUpload({
      acceptTypes: 'video/*',
      onFileSelected: (file) => {
        this.handleVideoMetadata();
        this.displayPreview(file, 'inputVideo');
        this.log(`Loaded video: ${file.name} (${formatFileSize(file.size)})`, 'info');

        // Avoid deadlock if metadata is slow/missed: allow manual dimensions immediately.
        this.enableInputs();
        if (!this.elements.width.value) this.elements.width.value = 320;
        if (!this.elements.height.value) this.elements.height.value = 180;
      }
    });

    this.setupEventListeners();
  }

  disableInputs() {
    if (this.elements.width) this.elements.width.disabled = true;
    if (this.elements.height) this.elements.height.disabled = true;
    if (this.elements.keepRatio) this.elements.keepRatio.checked = true;
    if (this.elements.processBtn) this.elements.processBtn.disabled = true;
  }

  handleVideoMetadata() {
    if (this.elements.inputVideo) {
      const applyMetadata = () => {
        this.originalWidth = this.elements.inputVideo.videoWidth;
        this.originalHeight = this.elements.inputVideo.videoHeight;
        this.videoAspectRatio = this.originalWidth / this.originalHeight;
        
        this.enableInputs();
        this.setInitialValues();
      };

      this.elements.inputVideo.onloadedmetadata = applyMetadata;

      if (this.elements.inputVideo.readyState >= 1 && this.elements.inputVideo.videoWidth > 0) {
        applyMetadata();
      }
    }
  }

  enableInputs() {
    this.elements.width.disabled = false;
    this.elements.height.disabled = false;
    this.elements.keepRatio.disabled = false;
    this.elements.processBtn.disabled = false;
  }

  setInitialValues() {
    this.elements.width.value = this.originalWidth;
    this.elements.height.value = this.originalHeight;
    this.elements.width.placeholder = 'Width';
    this.elements.height.placeholder = 'Height';
  }

  setupEventListeners() {
    if (this.elements.width) {
      this.elements.width.addEventListener('input', () => {
        if (this.elements.keepRatio && this.elements.keepRatio.checked) {
          this.updateHeight();
        }
        this.showDimensionPreview();
      });
    }
    
    if (this.elements.height) {
      this.elements.height.addEventListener('input', () => {
        if (this.elements.keepRatio && this.elements.keepRatio.checked) {
          this.updateWidth();
        }
        this.showDimensionPreview();
      });
    }
    
    if (this.elements.processBtn) {
      this.elements.processBtn.addEventListener('click', () => {
        this.removeDimensionPreview();
        if (this.inputFile) {
          this.processFile(this.inputFile);
        }
      });
    }
  }

  updateHeight() {
    if (!this.elements.width || !this.elements.height) return;
    
    const width = parseInt(this.elements.width.value) || 0;
    if (width <= 0) return;

    this.elements.height.value = Math.round(width / this.videoAspectRatio);
  }

  updateWidth() {
    if (!this.elements.width || !this.elements.height) return;
    
    const height = parseInt(this.elements.height.value) || 0;
    if (height <= 0) return;

    this.elements.width.value = Math.round(height * this.videoAspectRatio);
  }

  makeEven(number) {
    const num = parseInt(number) || 0;
    return num % 2 === 0 ? num : num + 1;
  }

  validateDimensions(width, height) {
    const adjustedWidth = this.makeEven(width);
    const adjustedHeight = this.makeEven(height);
    
    if (adjustedWidth !== width || adjustedHeight !== height) {
      this.log(`Adjusted dimensions from ${width}x${height} to ${adjustedWidth}x${adjustedHeight} (H.264 requires even numbers)`, 'info');
    }
    
    return { width: adjustedWidth, height: adjustedHeight };
  }

  calculateDimensions() {
    if (!this.elements.width || !this.elements.height) return { width: 0, height: 0 };
    
    const inputWidth = parseInt(this.elements.width.value) || this.originalWidth;
    const inputHeight = parseInt(this.elements.height.value) || this.originalHeight;

    return this.validateDimensions(inputWidth, inputHeight);
  }

  showDimensionPreview() {
    if (!this.elements.width || !this.elements.height) return;
    
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }
    
    const inputWidth = parseInt(this.elements.width.value) || 0;
    const inputHeight = parseInt(this.elements.height.value) || 0;
    
    if (inputWidth <= 0 || inputHeight <= 0) {
      this.removeDimensionPreview();
      return;
    }
    
    const { width: finalWidth, height: finalHeight } = this.validateDimensions(inputWidth, inputHeight);
    
    if (finalWidth !== inputWidth || finalHeight !== inputHeight) {
      this.previewTimeout = setTimeout(() => {
        this.createDimensionPreview(inputWidth, inputHeight, finalWidth, finalHeight);
      }, 500);
    } else {
      this.removeDimensionPreview();
    }
  }

  createDimensionPreview(inputW, inputH, finalW, finalH) {
    this.removeDimensionPreview();
    
    const preview = document.createElement('div');
    preview.id = 'dimension-preview';
    preview.className = 'absolute z-10 mt-1 p-2 bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-600 rounded-md shadow-lg text-sm text-blue-700 dark:text-blue-200 backdrop-blur-sm';
    preview.innerHTML = `
      <div class="flex items-center gap-2">
        <span>📐</span>
        <span>Will be adjusted to: <strong>${finalW}×${finalH}</strong></span>
      </div>
      <div class="text-xs text-blue-600 dark:text-blue-300 mt-1">H.264 requires even dimensions</div>
    `;
    
    const heightInput = this.elements.height;
    if (heightInput) {
      const container = heightInput.closest('.grid') || heightInput.closest('.my-4');
      if (container) {
        container.appendChild(preview);
        
        preview.style.top = '100%';
        preview.style.left = '0';
        preview.style.right = '0';
      }
    }
  }

  removeDimensionPreview() {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    
    const existing = document.getElementById('dimension-preview');
    if (existing) {
      existing.remove();
    }
  }

  updateProgress(percentage, status = '') {
    const progressContainer = this.elements.progress;
    if (progressContainer) {
      const progressFill = progressContainer.querySelector('div.h-2');
      if (progressFill) {
        requestAnimationFrame(() => {
          progressFill.style.setProperty('width', `${percentage}%`, 'important');
        });
      }
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
      progressText.textContent = `${percentage}%`;
    }
    
    const progressStatus = document.getElementById('progressStatus');
    if (progressStatus) {
      progressStatus.textContent = status;
    }
    
    if (this.elements.progress) {
      if (percentage > 0 && percentage < 100) {
        requestAnimationFrame(() => {
          this.elements.progress.style.display = 'block';
        });
      } else if (percentage >= 100) {
        setTimeout(() => {
          if (this.elements.progress) {
            requestAnimationFrame(() => {
              this.elements.progress.style.display = 'none';
            });
          }
        }, 2000); // Keep the delay for hiding
      } else if (percentage === 0 && this.elements.progress.style.display !== 'none') {
        // Optionally hide if reset to 0 and not already hidden by timeout
        // This case might not be strictly needed if processFile always starts > 0
        requestAnimationFrame(() => {
           this.elements.progress.style.display = 'none';
        });
      }
    }
  }

  async processFile(file) {
    if (this.isProcessing) {
      this.log('Processing is already in progress. Please wait.', 'warn');
      return;
    }
    let ffmpegInstance = null; // Keep a reference for potential cleanup in catch block
    try {
      this.removeDimensionPreview();
      this.startProcessing();
      this.updateProgress(10, 'Initializing...');

      const dimensions = this.calculateDimensions();
      const { width, height } = dimensions;
      const quality = this.elements.quality ? this.elements.quality.value : 'low';

      if (width <= 0 || height <= 0) {
        this.log('Please enter valid dimensions', 'error');
        this.endProcessing(false);
        return;
      }

      this.log(`Resizing to ${width}x${height} pixels...`, 'info');

      // Ensure loadFFmpeg completes its execution path. 
      // The actual readiness of the ffmpeg singleton is often the core issue.
      await loadFFmpeg(); 
      ffmpegInstance = getFFmpeg(); // Get the singleton instance

      if (!ffmpegInstance) {
        throw new Error('FFmpeg instance could not be obtained after loading.');
      }
      
      // At this point, we assume loadFFmpeg from utils has ensured the instance is truly ready.
      // If errors still occur, the problem is likely within loadFFmpeg in ffmpeg-utils.js.

      this.updateProgress(20, 'FFmpeg ready');

      // Clean up virtual filesystem before operation
      try {
        await cleanupFFmpeg(ffmpegInstance);
      } catch (cleanupError) {
        // This might be normal if it's the first run or if FS is already clean
        console.warn('Pre-processing cleanup attempt reported:', cleanupError.message);
      }

      const inputFileName = 'input' + getExtension(file.name);
      const outputFileName = 'output.mp4';

      this.log('Writing input file...', 'info');
      await writeInputFile(ffmpegInstance, inputFileName, file);
      this.updateProgress(30, 'Input file processed');

      const scaleFilter = `scale=${width}:${height}:flags=fast_bilinear`;
      this.updateProgress(40, 'Starting resize...');
      try {
        await executeFFmpeg(ffmpegInstance, [
          '-i', inputFileName,
          '-vf', scaleFilter,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', quality === 'high' ? '22' : quality === 'medium' ? '26' : '30',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'copy',
          '-movflags', '+faststart',
          '-y', outputFileName
        ]);
      } catch (audioCopyError) {
        this.log('Audio copy failed, retrying with AAC audio for compatibility...', 'info');
        const encodeArgs = getX264EncodeArgs({
          quality,
          bitrateKbps: width >= 1280 ? 1600 : 800,
          audio: true,
          faststart: true
        });
        await executeFFmpeg(ffmpegInstance, [
          '-i', inputFileName,
          '-vf', scaleFilter,
          ...encodeArgs,
          '-y', outputFileName
        ]);
      }
      this.updateProgress(80, 'Resize complete');

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(ffmpegInstance, outputFileName);
      
      if (!data || data.byteLength === 0) {
        throw new Error('Generated video is empty. Check video format or try different settings.');
      }
      
      const blob = new Blob([data], { type: 'video/mp4' });
      this.updateProgress(90, 'Preparing download...');
      
      if (this.elements.outputContainer) {
        this.elements.outputContainer.style.display = 'block';
      }
      
      this.displayOutputMedia(blob, 'outputVideo', `video_${width}x${height}.mp4`, 'downloadContainer');
      
      // Clean up the instance after processing
      try {
        await cleanupFFmpeg(ffmpegInstance);
      } catch (cleanupError) {
        console.warn('Post-processing cleanup failed:', cleanupError.message);
      }
      
      this.updateProgress(100, 'Complete!');
      this.log('Resizing complete!', 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      // Attempt cleanup even on error, if instance was obtained
      if (ffmpegInstance) {
        try {
          await cleanupFFmpeg(ffmpegInstance);
        } catch (cleanupError) {
          console.warn('Cleanup after error failed:', cleanupError.message);
        }
      }
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new VideoResizeTool({
    id: 'resize',
    name: 'Video Resize'
  });
  
  return tool.init();
}
