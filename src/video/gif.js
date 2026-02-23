/**
 * Video to GIF conversion module using FFmpeg WASM
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { loadFFmpeg, writeInputFile, readOutputFile, executeFFmpeg, getExtension } from './ffmpeg-utils.js';

// Video to GIF tool template
export const template = `
    <div class="tool-container">
      <h1>Video to GIF</h1>
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
      
      <div class="my-4 grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="width" class="font-medium text-slate-700 dark:text-slate-300">Width:</label>
          <input type="number" id="width" placeholder="Width" value="320" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <div class="flex flex-col gap-2">
          <label for="height" class="font-medium text-slate-700 dark:text-slate-300">Height:</label>
          <input type="number" id="height" placeholder="Height" value="240" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="keepRatio" checked class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="keepRatio" class="text-sm text-slate-700 dark:text-slate-300">Keep Aspect Ratio</label>
        </div>
        <div class="flex flex-col gap-2">
          <label for="fps" class="font-medium text-slate-700 dark:text-slate-300">FPS:</label>
          <div class="flex items-center">
            <input type="number" id="fps" min="1" max="30" value="10" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base w-24 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">Lower = smaller file</span>
          </div>
        </div>
        <div class="flex flex-col gap-2 md:col-span-2">
          <label for="quality" class="font-medium text-slate-700 dark:text-slate-300">Quality:</label>
          <select id="quality" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <option value="high">High (more colors)</option>
            <option value="medium" selected>Medium</option>
            <option value="low">Low (smaller file)</option>
          </select>
        </div>
        <div class="flex flex-col gap-2 md:col-span-2">
          <label class="font-medium text-slate-700 dark:text-slate-300">Time Range:</label>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label for="startTime" class="text-sm text-slate-600 dark:text-slate-400">Start:</label>
              <input type="text" id="startTime" placeholder="0:00" value="0:00" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            </div>
            <div class="flex flex-col gap-1">
              <label for="duration" class="text-sm text-slate-600 dark:text-slate-400">Duration:</label>
              <input type="text" id="duration" placeholder="5.0" value="5.0" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
              <span class="text-xs text-slate-500 dark:text-slate-400">seconds</span>
            </div>
          </div>
        </div>
        <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:col-span-2">Convert to GIF</button>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
      </div>

      <div id="outputContainer" class="output-container bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-4 mt-4" style="display: none;">
        <div class="output-wrapper">
          <img id="output-gif" style="display: none; max-width: 100%;">
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

class VideoGifTool extends Tool {
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
    this.videoAspectRatio = 1;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputVideo: 'input-video',
      outputGif: 'output-gif',
      processBtn: 'processBtn',
      width: 'width',
      height: 'height',
      keepRatio: 'keepRatio',
      fps: 'fps',
      quality: 'quality',
      startTime: 'startTime',
      duration: 'duration',
      progress: 'progress',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'video/*',
      onFileSelected: (file) => {
        this.displayPreview(file, 'inputVideo');
        this.log(`Loaded video: ${file.name} (${formatFileSize(file.size)})`, 'info');
        
        // Get video dimensions when metadata is loaded
        const applyMetadata = () => {
          this.videoAspectRatio = this.elements.inputVideo.videoWidth / this.elements.inputVideo.videoHeight;
          
          // Set default width maintaining aspect ratio
          if (this.elements.width.value == 320) {
            this.elements.width.value = Math.min(640, this.elements.inputVideo.videoWidth);
            this.updateHeight();
          }
        };
        this.elements.inputVideo.onloadedmetadata = applyMetadata;
        if (this.elements.inputVideo.readyState >= 1 && this.elements.inputVideo.videoWidth > 0) {
          applyMetadata();
        }
        
        // Update duration field based on video length
        const applyLoadedData = () => {
          if (this.elements.duration.value == 5.0) {
            const videoLength = this.elements.inputVideo.duration;
            this.elements.duration.value = videoLength < 5 ? videoLength.toFixed(1) : 5.0;
          }
        };
        this.elements.inputVideo.onloadeddata = applyLoadedData;
        if (this.elements.inputVideo.readyState >= 2 && Number.isFinite(this.elements.inputVideo.duration)) {
          applyLoadedData();
        }
      }
    });

    // Handle dimension changes
    this.elements.width.addEventListener('input', () => this.updateHeight());
    this.elements.height.addEventListener('input', () => this.updateWidth());

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

  updateHeight() {
    if (this.elements.keepRatio.checked && this.elements.width.value) {
      this.elements.height.value = Math.round(this.elements.width.value / this.videoAspectRatio);
    }
  }

  updateWidth() {
    if (this.elements.keepRatio.checked && this.elements.height.value) {
      this.elements.width.value = Math.round(this.elements.height.value * this.videoAspectRatio);
    }
  }

  parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    if (!isNaN(timeStr)) return parseFloat(timeStr);
    
    const parts = timeStr.split(':').map(part => parseFloat(part));
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10);

      const width = parseInt(this.elements.width.value) || 320;
      const height = parseInt(this.elements.height.value) || 240;
      const fps = parseInt(this.elements.fps.value) || 10;
      const quality = this.elements.quality.value;
      const startTime = this.parseTimeToSeconds(this.elements.startTime.value);
      const duration = parseFloat(this.elements.duration.value) || 5.0;

      if (width <= 0 || height <= 0) {
        this.log('Please enter valid dimensions', 'error');
        this.endProcessing(false);
        return;
      }

      if (fps <= 0 || fps > 30) {
        this.log('FPS must be between 1 and 30', 'error');
        this.endProcessing(false);
        return;
      }

      this.ffmpeg = await loadFFmpeg();
      this.updateProgress(20);

      const inputFileName = 'input' + getExtension(file.name);
      const paletteFileName = 'palette.png';
      const outputFileName = 'output.gif';

      this.log('Writing input file...', 'info');
      await writeInputFile(this.ffmpeg, inputFileName, file);
      this.updateProgress(30);

      const scaleFilter = `scale=${width}:${height}:flags=lanczos`;
      const fpsFilter = `fps=${fps}`;
      const baseFilters = `${fpsFilter},${scaleFilter}`;

      const timeArgs = [];
      if (startTime > 0) timeArgs.push('-ss', startTime.toString());
      if (duration > 0) timeArgs.push('-t', duration.toString());

      this.log('Generating palette...', 'info');
      await executeFFmpeg(this.ffmpeg, [
        ...timeArgs,
        '-i', inputFileName,
        '-vf', `${baseFilters},palettegen=stats_mode=diff`,
        '-y', paletteFileName
      ]);
      this.updateProgress(60);

      const paletteUseOptions = quality === 'high' ? 'dither=sierra2_4a:diff_mode=rectangle' :
                               quality === 'medium' ? 'dither=floyd_steinberg:diff_mode=rectangle' :
                               'dither=bayer:bayer_scale=3:diff_mode=rectangle';

      this.log(`Creating GIF (${width}x${height}, ${fps} fps)...`, 'info');
      await executeFFmpeg(this.ffmpeg, [
        ...timeArgs,
        '-i', inputFileName,
        '-i', paletteFileName,
        '-lavfi', `${baseFilters} [x]; [x][1:v] paletteuse=${paletteUseOptions}`,
        '-loop', '0',
        '-y', outputFileName
      ]);
      this.updateProgress(80);

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      
      if (!data || data.byteLength === 0) {
        throw new Error('Generated GIF is empty. Check video format or try different settings.');
      }
      
      const blob = new Blob([data], { type: 'image/gif' });
      this.displayOutputMedia(blob, 'outputGif', `video_${width}x${height}.gif`);
      
      this.updateProgress(100);
      this.log('Conversion complete!', 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new VideoGifTool({
    id: 'gif',
    name: 'Video to GIF'
  });
  
  return tool.init();
} 
