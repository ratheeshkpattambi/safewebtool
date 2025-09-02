/**
 * Video to MP4 converter using FFmpeg WASM
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { loadFFmpeg, writeInputFile, readOutputFile, executeFFmpeg, getExtension } from './ffmpeg-utils.js';

// Video MP4 convert tool template
export const template = `
    <div class="tool-container">
      <h1>Convert to MP4</h1>
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports most formats (AVI, MKV, MOV, WebM, MP4, ...)</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      </div>

      <div class="video-wrapper">
        <video id="input-video" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>

      <div class="my-4 grid gap-4 md:grid-cols-4">
        <div class="flex flex-col gap-2">
          <label for="resolution" class="font-medium text-slate-700 dark:text-slate-300">Resolution</label>
          <select id="resolution" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <option value="source" selected>Keep source</option>
            <option value="2160p">2160p (4K)</option>
            <option value="1440p">1440p (QHD)</option>
            <option value="1080p">1080p (FHD)</option>
            <option value="720p">720p (HD)</option>
            <option value="480p">480p (SD)</option>
            <option value="360p">360p</option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <label for="quality" class="font-medium text-slate-700 dark:text-slate-300">Quality</label>
          <select id="quality" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
            <option value="high">High</option>
            <option value="medium" selected>Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <label for="bitrate" class="font-medium text-slate-700 dark:text-slate-300">Target Bitrate (kb/s)</label>
          <input type="number" id="bitrate" value="2500" min="300" class="p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
        </div>
        <div class="flex items-end">
          <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Convert to MP4</button>
        </div>
      </div>

      <div id="progress" class="my-4 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors" style="display: none;">
        <div class="h-5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ease-in-out" style="width: 0%;"></div>
        <div class="text-center text-xs font-medium text-slate-700 dark:text-slate-300 -mt-4 leading-5">0%</div>
      </div>

      <div id="outputContainer" class="output-container" style="display: none;">
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

class VideoMp4Tool extends Tool {
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
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputVideo: 'input-video',
      outputVideo: 'output-video',
      processBtn: 'processBtn',
      resolution: 'resolution',
      quality: 'quality',
      bitrate: 'bitrate',
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
      }
    });

    if (this.elements.dropZone) {
      this.elements.dropZone.innerHTML = `
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports most formats (AVI, MKV, MOV, WebM, MP4, ...)</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      `;
    }
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10);

      const quality = this.elements.quality.value;
      const targetKbps = parseInt(this.elements.bitrate.value) || 2500;
      const resolution = this.elements.resolution.value;

      this.ffmpeg = await loadFFmpeg();
      this.updateProgress(30);

      const inputFileName = 'input' + getExtension(file.name);
      const outputFileName = 'output.mp4';

      this.log('Writing input file...', 'info');
      await writeInputFile(this.ffmpeg, inputFileName, file);
      this.updateProgress(45);

      const ffmpegArgs = ['-i', inputFileName];

      // Resolution scaling
      const scaleMap = {
        '2160p': '3840:2160',
        '1440p': '2560:1440',
        '1080p': '1920:1080',
        '720p': '1280:720',
        '480p': '854:480',
        '360p': '640:360'
      };
      if (resolution !== 'source' && scaleMap[resolution]) {
        ffmpegArgs.push('-vf', `scale=${scaleMap[resolution]}`);
      }

      // x264 quality/preset similar to CloudConvert selectable quality
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', quality === 'high' ? 'slow' : quality === 'medium' ? 'medium' : 'fast',
        '-b:v', `${targetKbps}k`,
        '-maxrate', `${targetKbps}k`,
        '-bufsize', `${targetKbps * 2}k`,
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k'
      );

      ffmpegArgs.push('-y', outputFileName);

      this.log('Converting to MP4...', 'info');
      await executeFFmpeg(this.ffmpeg, ffmpegArgs);
      this.updateProgress(85);

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      const blob = new Blob([data], { type: 'video/mp4' });

      this.displayOutputMedia(blob, 'outputVideo', 'converted_video.mp4', 'downloadContainer');
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
  const tool = new VideoMp4Tool({
    id: 'mp4',
    name: 'Convert to MP4'
  });
  return tool.init();
}


