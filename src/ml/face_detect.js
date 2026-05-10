import * as vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/vision_bundle.js';
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';

export const template = `
  <div class="tool-container">
    <h1>Face Detection</h1>
    
    <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
      <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">👤</div>
      <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPG, PNG, WebP, and other common image formats</p>
      <input type="file" id="fileInput" class="hidden" accept="image/*">
      <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
    </div>
    
    <div id="previewContainer" class="mt-4" style="display: none;">
      <img id="previewImg" class="max-w-full h-auto rounded-lg shadow-md" style="max-height: 400px; margin: 0 auto; display: block;">
    </div>
    
    <button id="processBtn" class="w-full mt-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style="display: none;" disabled>Detect Faces</button>
    
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
      <div id="resultContainer"></div>
      <div id="downloadContainer"></div>
    </div>
    
    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class FaceDetectionTool extends Tool {
  constructor() {
    super({
      id: 'face-detection',
      name: 'Face Detection',
      category: 'ml',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template
    });
    
    this.faceDetector = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      previewContainer: 'previewContainer',
      previewImg: 'previewImg',
      processBtn: 'processBtn',
      progress: 'progress',
      outputContainer: 'outputContainer',
      resultContainer: 'resultContainer',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.log('Face Detection tool loaded', 'info');
    
    this.initFileUpload({
      acceptTypes: 'image/*',
      onFileSelected: (file) => {
        this.displayImagePreview(file);
        this.log(`Loaded image: ${file.name} (${formatFileSize(file.size)})`, 'info');
      }
    });
  }

  displayImagePreview(file) {
    const url = URL.createObjectURL(file);
    
    if (this.elements.previewContainer) {
      this.elements.previewContainer.style.display = 'block';
    }
    
    if (this.elements.previewImg) {
      this.elements.previewImg.src = url;
      this.elements.previewImg.onload = () => {
        if (this.elements.processBtn) {
          this.elements.processBtn.style.display = 'block';
          this.elements.processBtn.disabled = false;
        }
      };
      this.elements.previewImg.onerror = () => {
        this.log('Failed to load image', 'error');
        if (this.elements.processBtn) {
          this.elements.processBtn.style.display = 'none';
        }
      };
    }
  }

  async setupDetector() {
    if (!this.faceDetector) {
      this.updateProgress(20, 'Loading face detection model...');
      
      if (!vision.FilesetResolver) {
        throw new Error('FilesetResolver not found in vision object');
      }
      
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm'
      );
      
      this.updateProgress(40, 'Initializing detector...');
      
      this.faceDetector = await vision.FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5
      });
      
      this.log('Face detector initialized successfully', 'success');
    }
    return this.faceDetector;
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
        }, 2000);
      }
    }
  }

  async processFile(file) {
    if (this.isProcessing) {
      this.log('Processing is already in progress. Please wait.', 'warn');
      return;
    }

    try {
      this.startProcessing();
      this.updateProgress(10, 'Starting face detection...');
      
      const detector = await this.setupDetector();
      
      this.updateProgress(60, 'Detecting faces...');
      
      const img = this.elements.previewImg;
      if (!img) {
        throw new Error('Preview image not found');
      }
      
      const detections = await detector.detect(img);
      
      this.updateProgress(80, 'Processing results...');
      
      if (!detections || !detections.detections || detections.detections.length === 0) {
        this.elements.resultContainer.innerHTML = `
          <div class="text-center p-4">
            <div class="text-4xl mb-2">😔</div>
            <p class="text-slate-600 dark:text-slate-300">No faces detected in this image</p>
          </div>
        `;
        this.log('No faces detected', 'info');
        this.elements.outputContainer.style.display = 'block';
        this.updateProgress(100, 'Complete');
        this.endProcessing();
        return;
      }
      
      // Create canvas with face detection boxes
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw detection boxes
      ctx.strokeStyle = '#3B82F6'; // Blue color
      ctx.lineWidth = Math.max(3, Math.min(canvas.width, canvas.height) * 0.005);
      ctx.font = `${Math.max(16, Math.min(canvas.width, canvas.height) * 0.02)}px Arial`;
      ctx.fillStyle = '#3B82F6';
      
      detections.detections.forEach((detection, index) => {
        const box = detection.boundingBox;
        ctx.strokeRect(box.originX, box.originY, box.width, box.height);
        
        // Add confidence score
        if (detection.categories && detection.categories[0]) {
          const confidence = (detection.categories[0].score * 100).toFixed(1);
          const text = `Face ${index + 1}: ${confidence}%`;
          
          // Background for text
          ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
          const textMetrics = ctx.measureText(text);
          const textHeight = 20;
          ctx.fillRect(box.originX, box.originY - textHeight - 5, textMetrics.width + 10, textHeight + 5);
          
          // Text
          ctx.fillStyle = 'white';
          ctx.fillText(text, box.originX + 5, box.originY - 8);
          ctx.fillStyle = '#3B82F6';
        }
      });
      
      // Display results
      this.elements.resultContainer.innerHTML = '';
      
      // Add detection statistics
      const statsDiv = document.createElement('div');
      statsDiv.className = 'mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md';
      statsDiv.innerHTML = `
        <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <span class="text-2xl">👥</span>
          <div>
            <p class="font-medium text-lg">${detections.detections.length} face${detections.detections.length !== 1 ? 's' : ''} detected</p>
            <p class="text-sm text-blue-600 dark:text-blue-400">Click download to get the full resolution image with annotations</p>
          </div>
        </div>
      `;
      this.elements.resultContainer.appendChild(statsDiv);
      
      // Create a container for the canvas with constrained size
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'relative overflow-hidden rounded-lg shadow-md';
      canvasContainer.style.maxWidth = '600px'; // Constrain max width
      canvasContainer.style.margin = '0 auto'; // Center the container
      
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      canvasContainer.appendChild(canvas);
      this.elements.resultContainer.appendChild(canvasContainer);
      
      // Create download link
      canvas.toBlob((blob) => {
        const filename = `face_detection_${file.name}`;
        this.displayFaceDetectionOutput(blob, filename, detections.detections.length);
      }, 'image/png');
      
      this.elements.outputContainer.style.display = 'block';
      
      this.updateProgress(100, 'Complete!');
      this.log(`Detected ${detections.detections.length} face(s)`, 'success');
      
      // Log detection details
      detections.detections.forEach((detection, index) => {
        if (detection.categories && detection.categories[0]) {
          const confidence = (detection.categories[0].score * 100).toFixed(1);
          this.log(`Face ${index + 1}: Confidence ${confidence}%`, 'info');
        }
      });
      
      this.endProcessing();
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Face detection error:', error);
      this.elements.resultContainer.innerHTML = `
        <div class="text-center p-4">
          <div class="text-4xl mb-2">❌</div>
          <p class="text-red-600 dark:text-red-400">Error during face detection</p>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-2">${error.message}</p>
        </div>
      `;
      this.elements.outputContainer.style.display = 'block';
      this.endProcessing(false);
    }
  }

  /**
   * Display face detection output with custom statistics
   * @param {Blob} blob - The output image blob
   * @param {string} filename - The filename for download
   * @param {number} faceCount - Number of faces detected
   */
  displayFaceDetectionOutput(blob, filename, faceCount) {
    const url = URL.createObjectURL(blob);
    const container = this.elements.downloadContainer;

    if (container) {
      // Create file info div with face count
      const fileInfoDiv = document.createElement('div');
      fileInfoDiv.className = 'mt-4 p-3 bg-slate-100 rounded-md text-sm dark:bg-slate-800';
      fileInfoDiv.innerHTML = `
        <p class="text-slate-700 dark:text-slate-300"><strong>Filename:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${filename}</span></p>
        <p class="text-slate-700 dark:text-slate-300"><strong>Size:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${formatFileSize(blob.size)}</span></p>
        <p class="text-slate-700 dark:text-slate-300"><strong>Type:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${blob.type}</span></p>
        <p class="text-slate-700 dark:text-slate-300"><strong>Faces Detected:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${faceCount}</span></p>
      `;
      
      // Create download button
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.className = 'mt-3 inline-block px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium';
      downloadLink.textContent = 'Download Annotated Image';
      
      container.innerHTML = '';
      container.appendChild(fileInfoDiv);
      container.appendChild(downloadLink);
      container.style.display = 'block';
    }
  }
}

export function initTool() {
  const tool = new FaceDetectionTool();
  return tool.init();
}
