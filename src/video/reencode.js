/**
 * Video re-encode module using FFmpeg WASM
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import {
  loadFFmpeg,
  writeInputFile,
  readOutputFile,
  executeFFmpeg,
  getExtension,
  getX264EncodeArgs,
  getFastWebMEncodeArgs
} from './ffmpeg-utils.js';

// Video reencode tool template
export const template = `
    <div class="tool-container">
      <h1>Video Re-encode</h1>
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
      
      <div class="my-4 grid gap-4 md:grid-cols-3">
        <div class="flex flex-col gap-2">
          <label for="format" class="font-medium text-slate-700 dark:text-slate-300">Format:</label>
          <select id="format" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
            <option value="mov">MOV</option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <label for="quality" class="font-medium text-slate-700 dark:text-slate-300">Quality:</label>
          <select id="quality" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <label for="bitrate" class="font-medium text-slate-700 dark:text-slate-300">Bitrate (kb/s):</label>
          <input type="number" id="bitrate" value="2000" min="500" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:col-span-3">Re-encode Video</button>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
      </div>

      <div id="outputContainer" class="output-container">
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

class VideoReencodeTool extends Tool {
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
    this.outputContainer = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputVideo: 'input-video',
      outputVideo: 'output-video',
      processBtn: 'processBtn',
      format: 'format',
      quality: 'quality',
      bitrate: 'bitrate',
      progress: 'progress',
      outputContainer: 'outputContainer',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    // Ensure logs are at the bottom
    this.ensureProperDOMOrder();
    
    this.initFileUpload({
      acceptTypes: 'video/*',
      onFileSelected: (file) => {
        this.displayPreview(file, 'inputVideo');
        this.log(`Loaded video: ${file.name} (${formatFileSize(file.size)})`, 'info');
      }
    });

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
  
  /**
   * Ensure DOM elements are in the correct order
   */
  ensureProperDOMOrder() {
    // Find the container of log elements
    const logHeader = document.getElementById('logHeader');
    const logContent = document.getElementById('logContent');
    
    if (logHeader && logContent) {
      // Get the parent container
      const container = logHeader.closest('.tool-container');
      
      if (container) {
        // Move logs to the end
        container.appendChild(logHeader);
        container.appendChild(logContent);
      }
    }
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10);

      const format = this.elements.format.value;
      const quality = this.elements.quality.value;
      const bitrate = parseInt(this.elements.bitrate.value);

      if (!bitrate || bitrate < 500) {
        this.log('Please enter a valid bitrate (minimum 500kb/s)', 'error');
        this.endProcessing(false);
        return;
      }

      this.ffmpeg = await loadFFmpeg();
      this.updateProgress(30);

      const inputFileName = 'input' + getExtension(file.name);
      const outputFileName = `output.${format}`;

      this.log('Writing input file...', 'info');
      await writeInputFile(this.ffmpeg, inputFileName, file);
      this.updateProgress(50);

      // Build FFmpeg command based on format and quality
      const ffmpegArgs = ['-i', inputFileName];

      if (format === 'mp4') {
        ffmpegArgs.push(...getX264EncodeArgs({ quality, bitrateKbps: bitrate, audio: true, faststart: true }));
      } else if (format === 'webm') {
        ffmpegArgs.push(...getFastWebMEncodeArgs({ quality, bitrateKbps: bitrate, audio: true }));
      } else if (format === 'mov') {
        ffmpegArgs.push(...getX264EncodeArgs({ quality, bitrateKbps: bitrate, audio: true, faststart: false }));
      }

      ffmpegArgs.push(outputFileName);

      this.log(`Re-encoding video to ${format.toUpperCase()}...`, 'info');
      await executeFFmpeg(this.ffmpeg, ffmpegArgs);
      this.updateProgress(80);

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      const blob = new Blob([data], { type: `video/${format}` });
      this.updateProgress(90);
      
      // Display output media and create download link using base helper
      this.displayOutputMedia(blob, 'outputVideo', `reencoded_video.${format}`, 'downloadContainer');
      
      this.updateProgress(100);
      this.log('Processing complete!', 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      this.endProcessing(false);
    }
  }
}

/**
 * Initialize the video re-encode tool
 */
export function initTool() {
  const tool = new VideoReencodeTool({
    id: 'reencode',
    name: 'Video Re-encode'
  });
  
  return tool.init();
} 
