/**
 * Video reversing module using FFmpeg WASM
 */
import { Tool } from '../common/base.js';
import { formatFileSize, formatTime } from '../common/utils.js';
import { loadFFmpeg, writeInputFile, readOutputFile, executeFFmpeg, getExtension } from './ffmpeg-utils.js';

// Video reverse tool template
export const template = `
    <style>
      .slider-container {
        width: 100%;
        padding: 15px 0;
      }
      .reverse-slider {
        position: relative;
        width: 100%;
        height: 8px;
        background-color: #ddd; /* Light grey background for the track */
        border-radius: 4px;
        cursor: pointer;
      }
      .slider-handle {
        position: absolute;
        top: -4px; /* Center vertically */
        width: 16px;
        height: 16px;
        background-color: #007bff; /* Blue handle */
        border-radius: 50%;
        cursor: grab;
        z-index: 2;
        transform: translateX(-50%); /* Center the handle on its position */
      }
      .slider-handle:active {
        cursor: grabbing;
      }
      .slider-range {
        position: absolute;
        top: 0;
        height: 100%;
        background-color: #007bff; /* Blue selected range */
        z-index: 1;
        border-radius: 4px;
      }
      /* Dark mode adjustments (optional, can be refined) */
      .dark .reverse-slider {
        background-color: #4a5568; /* Darker grey for dark mode track */
      }
      .dark .slider-handle, .dark .slider-range {
        background-color: #3b82f6; /* Brighter blue for dark mode */
      }
    </style>
    <div class="tool-container">
      <h1>Video Reverse</h1>
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
      
      <div class="my-4 flex flex-col gap-4">
        <div class="slider-container w-full py-4">
          <div id="reverse-slider" class="reverse-slider relative w-full h-2 bg-gray-300 dark:bg-gray-700 rounded cursor-pointer">
            <div class="slider-handle start-handle absolute -top-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded-full cursor-grab active:cursor-grabbing z-20 -translate-x-1/2"></div>
            <div class="slider-range absolute top-0 h-full bg-blue-600 dark:bg-blue-500 rounded z-10"></div>
            <div class="slider-handle end-handle absolute -top-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded-full cursor-grab active:cursor-grabbing z-20 -translate-x-1/2"></div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="startTime" class="text-sm font-medium text-slate-700 dark:text-slate-300">Start Time:</label>
            <input type="text" id="startTime" placeholder="0:00" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
          </div>
          <div class="flex flex-col gap-1">
            <label for="endTime" class="text-sm font-medium text-slate-700 dark:text-slate-300">End Time:</label>
            <input type="text" id="endTime" placeholder="0:00" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-lg">
          <input type="checkbox" id="removeAudio" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
          <label for="removeAudio" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Remove audio (recommended for reversed videos)
          </label>
        </div>
        <div class="flex gap-4">
          <button id="processBtn" class="flex-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Reverse Video</button>
        </div>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
      </div>

      <div id="outputContainer" class="output-container dark:bg-slate-800">
        <div class="video-wrapper">
          <video id="output-video" controls style="display: none; max-width: 100%; height: auto;" ></video>
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

class VideoReverseTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'video',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template // Use the local template
    });
    
    this.ffmpeg = null;
    this.videoDuration = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.isDragging = false;
    this.activeDragHandle = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputVideo: 'input-video',
      outputVideo: 'output-video',
      processBtn: 'processBtn',
      startTime: 'startTime',
      endTime: 'endTime',
      removeAudio: 'removeAudio',
      reverseSlider: 'reverse-slider',
      progress: 'progress',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    // Disable inputs until video is loaded
    if (this.elements.startTime) this.elements.startTime.disabled = true;
    if (this.elements.endTime) this.elements.endTime.disabled = true;
    if (this.elements.processBtn) this.elements.processBtn.disabled = true;
    if (this.elements.removeAudio) this.elements.removeAudio.disabled = true;

    this.initFileUpload({
      acceptTypes: 'video/*',
      onFileSelected: (file) => {
        this.displayPreview(file, 'inputVideo');
        this.log(`Loaded video: ${file.name} (${formatFileSize(file.size)})`, 'info');
        
        // Get video duration when metadata is loaded
        if (this.elements.inputVideo) {
          this.elements.inputVideo.onloadedmetadata = () => {
            this.videoDuration = this.elements.inputVideo.duration;
            
            // Enable inputs
            this.elements.startTime.disabled = false;
            this.elements.endTime.disabled = false;
            this.elements.processBtn.disabled = false;
            this.elements.removeAudio.disabled = false;
            
            // Set initial values
            this.startTime = 0;
            this.endTime = this.videoDuration;
            this.elements.startTime.value = formatTime(this.startTime);
            this.elements.endTime.value = formatTime(this.endTime);
            
            // Initialize the slider
            this.initSlider();
          };
        }
      }
    });

    // Handle manual time input
    if (this.elements.startTime) {
      this.elements.startTime.addEventListener('change', () => {
        this.updateStartTimeFromInput();
      });
    }
    
    if (this.elements.endTime) {
      this.elements.endTime.addEventListener('change', () => {
        this.updateEndTimeFromInput();
      });
    }

    if (this.elements.dropZone) {
      this.elements.dropZone.innerHTML = `
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports MP4, WebM, MOV, and other common video formats</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      `;
    }
  }

  initSlider() {
    const slider = this.elements.reverseSlider;
    if (!slider) return;
    
    // Get slider handles
    const startHandle = slider.querySelector('.start-handle');
    const endHandle = slider.querySelector('.end-handle');
    const sliderRange = slider.querySelector('.slider-range');
    
    if (!startHandle || !endHandle || !sliderRange) return;
    
    // Set initial positions
    this.updateSliderHandles();
    
    // Add event listeners for dragging
    startHandle.addEventListener('mousedown', (e) => {
      this.startDrag(e, 'start');
    });
    
    endHandle.addEventListener('mousedown', (e) => {
      this.startDrag(e, 'end');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.dragHandle(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      this.stopDrag();
    });
    
    // Add click event on slider to set position
    slider.addEventListener('click', (e) => {
      if (e.target === slider || e.target === sliderRange) {
        this.handleSliderClick(e);
      }
    });
  }
  
  startDrag(e, handle) {
    e.preventDefault();
    this.isDragging = true;
    this.activeDragHandle = handle;
  }
  
  dragHandle(e) {
    if (!this.isDragging || !this.elements.reverseSlider) return;
    
    const slider = this.elements.reverseSlider;
    const rect = slider.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    const timePosition = clampedPosition * this.videoDuration;
    
    if (this.activeDragHandle === 'start') {
      this.startTime = Math.min(timePosition, this.endTime - 0.1);
      this.elements.startTime.value = formatTime(this.startTime);
    } else {
      this.endTime = Math.max(timePosition, this.startTime + 0.1);
      this.elements.endTime.value = formatTime(this.endTime);
    }
    
    this.updateSliderHandles();
  }
  
  stopDrag() {
    this.isDragging = false;
    this.activeDragHandle = null;
  }
  
  handleSliderClick(e) {
    const slider = this.elements.reverseSlider;
    const rect = slider.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const timePosition = position * this.videoDuration;
    
    // Determine which handle to move (closest)
    const startDistance = Math.abs(timePosition - this.startTime);
    const endDistance = Math.abs(timePosition - this.endTime);
    
    if (startDistance < endDistance) {
      this.startTime = timePosition;
      this.elements.startTime.value = formatTime(this.startTime);
    } else {
      this.endTime = timePosition;
      this.elements.endTime.value = formatTime(this.endTime);
    }
    
    this.updateSliderHandles();
  }
  
  updateSliderHandles() {
    const slider = this.elements.reverseSlider;
    if (!slider) return;
    
    const startHandle = slider.querySelector('.start-handle');
    const endHandle = slider.querySelector('.end-handle');
    const sliderRange = slider.querySelector('.slider-range');
    
    if (!startHandle || !endHandle || !sliderRange) return;
    
    const startPos = (this.startTime / this.videoDuration) * 100;
    const endPos = (this.endTime / this.videoDuration) * 100;
    
    startHandle.style.left = `${startPos}%`;
    endHandle.style.left = `${endPos}%`;
    sliderRange.style.left = `${startPos}%`;
    sliderRange.style.right = `${100 - endPos}%`;
  }
  
  updateStartTimeFromInput() {
    const timeStr = this.elements.startTime.value;
    const time = this.parseTimeInput(timeStr);
    
    if (time !== null && time < this.endTime) {
      this.startTime = time;
    } else {
      // Revert to valid value
      this.elements.startTime.value = formatTime(this.startTime);
    }
    
    this.updateSliderHandles();
  }
  
  updateEndTimeFromInput() {
    const timeStr = this.elements.endTime.value;
    const time = this.parseTimeInput(timeStr);
    
    if (time !== null && time > this.startTime && time <= this.videoDuration) {
      this.endTime = time;
    } else {
      // Revert to valid value
      this.elements.endTime.value = formatTime(this.endTime);
    }
    
    this.updateSliderHandles();
  }
  
  parseTimeInput(timeStr) {
    // Accept formats like "1:30" or "90.5"
    let time = null;
    
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const minutes = parseFloat(parts[0]);
        const seconds = parseFloat(parts[1]);
        if (!isNaN(minutes) && !isNaN(seconds)) {
          time = minutes * 60 + seconds;
        }
      }
    } else {
      const seconds = parseFloat(timeStr);
      if (!isNaN(seconds)) {
        time = seconds;
      }
    }
    
    return time;
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10);

      const duration = this.endTime - this.startTime;
      if (duration <= 0) {
        this.log('Please set valid start and end times', 'error');
        this.endProcessing(false);
        return;
      }

      this.log(`Reversing video from ${formatTime(this.startTime)} to ${formatTime(this.endTime)}...`, 'info');

      this.ffmpeg = await loadFFmpeg();
      this.updateProgress(20);

      const inputFileName = 'input' + getExtension(file.name);
      const outputFileName = 'output' + getExtension(file.name);

      this.log('Writing input file...', 'info');
      await writeInputFile(this.ffmpeg, inputFileName, file);
      this.updateProgress(30);

      this.log('Processing...', 'info');
      
      // Build FFmpeg command based on audio removal preference
      const shouldRemoveAudio = this.elements.removeAudio && this.elements.removeAudio.checked;
      const ffmpegArgs = [
        '-ss', this.startTime.toString(),
        '-i', inputFileName,
        '-t', duration.toString(),
        '-vf', 'reverse'
      ];
      
      if (shouldRemoveAudio) {
        ffmpegArgs.push('-an'); // Remove audio
        this.log('Removing audio from reversed video...', 'info');
      } else {
        ffmpegArgs.push('-c:a', 'aac'); // Keep audio with AAC codec
        this.log('Keeping audio in reversed video (may sound unusual)...', 'info');
      }
      
      ffmpegArgs.push('-y', outputFileName);
      await executeFFmpeg(this.ffmpeg, ffmpegArgs);
      this.updateProgress(80);

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      
      if (!data || data.byteLength === 0) {
        throw new Error('Generated video is empty. Check video format or try different settings.');
      }
      
      const blob = new Blob([data], { type: file.type });
      this.displayOutputMedia(blob, 'outputVideo', `reversed_video${getExtension(file.name)}`, 'downloadContainer');
      
      this.updateProgress(100);
      this.log('Video reversal complete!', 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new VideoReverseTool({
    id: 'reverse',
    name: 'Video Reverse'
  });
  
  return tool.init();
} 