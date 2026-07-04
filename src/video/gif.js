/**
 * Video to GIF conversion module using FFmpeg WASM
 *
 * Two-pass palette-optimized conversion (palettegen + paletteuse) with
 * visual trim, FPS/quality/speed controls, and a live output size estimate.
 * Everything runs locally in the browser.
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';
import { loadFFmpeg, writeInputFile, readOutputFile, executeFFmpeg, getExtension } from './ffmpeg-utils.js';

const inputClasses = 'px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors';
const labelClasses = 'font-medium text-slate-700 dark:text-slate-300';
const presetBtnClasses = 'size-preset px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';

// Approximate compressed bytes per output pixel per frame for a dithered GIF,
// by palette size. Real output varies with content; used only for the estimate.
const QUALITY_SETTINGS = {
  high:   { colors: 256, dither: 'dither=sierra2_4a:diff_mode=rectangle',          bytesPerPixel: 0.45 },
  medium: { colors: 128, dither: 'dither=floyd_steinberg:diff_mode=rectangle',     bytesPerPixel: 0.32 },
  low:    { colors: 64,  dither: 'dither=bayer:bayer_scale=3:diff_mode=rectangle', bytesPerPixel: 0.20 }
};

// Video to GIF tool template
export const template = `
    <div class="tool-container">
      <div id="dropZone" class="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports MP4, WebM, MOV, and other common video formats — no size limit, nothing is uploaded</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Select File</button>
      </div>
      <div class="video-wrapper">
        <video id="input-video" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>

      <div id="trimSection" class="time-range mt-4 hidden">
        <div class="flex items-center justify-between mb-1">
          <label class="${labelClasses}">Trim</label>
          <span id="trimLabel" class="text-sm text-slate-500 dark:text-slate-400"></span>
        </div>
        <div id="trimTrack" class="relative h-9 rounded-lg bg-slate-200 dark:bg-gray-700 cursor-pointer select-none" style="touch-action: none;">
          <div id="trimRange" class="absolute top-0 bottom-0 bg-blue-500/30 pointer-events-none"></div>
          <div id="trimStartHandle" class="absolute top-0 bottom-0 w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize" style="touch-action: none;">
            <div class="w-1.5 h-full rounded-full bg-blue-600 dark:bg-blue-500"></div>
          </div>
          <div id="trimEndHandle" class="absolute top-0 bottom-0 w-5 -ml-2.5 flex items-center justify-center cursor-ew-resize" style="touch-action: none;">
            <div class="w-1.5 h-full rounded-full bg-blue-600 dark:bg-blue-500"></div>
          </div>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag the handles — the video above previews the selected frame</p>
        <div class="grid grid-cols-2 gap-4 mt-2">
          <div class="flex flex-col gap-1">
            <label for="startTime" class="text-sm text-slate-600 dark:text-slate-400">Start:</label>
            <input type="text" id="startTime" placeholder="0:00" value="0:00" class="${inputClasses}">
          </div>
          <div class="flex flex-col gap-1">
            <label for="endTime" class="text-sm text-slate-600 dark:text-slate-400">End:</label>
            <input type="text" id="endTime" placeholder="0:05" value="0:05" class="${inputClasses}">
          </div>
        </div>
      </div>

      <div class="my-4 grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2 md:col-span-2">
          <label class="${labelClasses}">Size:</label>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-width="320" class="${presetBtnClasses}">320px</button>
            <button type="button" data-width="480" class="${presetBtnClasses}">480px</button>
            <button type="button" data-width="640" class="${presetBtnClasses}">640px</button>
            <button type="button" data-width="original" class="${presetBtnClasses}">Original</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="width" class="${labelClasses}">Width:</label>
          <input type="number" id="width" placeholder="Width" value="480" class="${inputClasses}">
        </div>
        <div class="flex flex-col gap-2">
          <label for="height" class="${labelClasses}">Height:</label>
          <input type="number" id="height" placeholder="Height" value="360" class="${inputClasses}">
        </div>
        <div class="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" id="keepRatio" checked class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="keepRatio" class="text-sm text-slate-700 dark:text-slate-300">Keep Aspect Ratio</label>
        </div>
        <div class="flex flex-col gap-2 md:col-span-2">
          <div class="flex items-center justify-between">
            <label for="fps" class="${labelClasses}">Frame rate:</label>
            <span class="text-sm text-slate-500 dark:text-slate-400"><span id="fpsValue">12</span> fps</span>
          </div>
          <input type="range" id="fps" min="5" max="30" step="1" value="12" class="w-full accent-blue-600">
          <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>5 — smaller file</span>
            <span>30 — smoother</span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="quality" class="${labelClasses}">Quality:</label>
          <select id="quality" class="${inputClasses}">
            <option value="high">High (256 colors)</option>
            <option value="medium" selected>Medium (128 colors)</option>
            <option value="low">Low (64 colors, smallest)</option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <label for="speed" class="${labelClasses}">Speed:</label>
          <select id="speed" class="${inputClasses}">
            <option value="0.5">0.5× (slow motion)</option>
            <option value="1" selected>1× (normal)</option>
            <option value="1.5">1.5×</option>
            <option value="2">2× (fast)</option>
          </select>
        </div>
        <div class="flex flex-col gap-2 md:col-span-2">
          <label for="loop" class="${labelClasses}">Loop:</label>
          <select id="loop" class="${inputClasses}">
            <option value="0" selected>Loop forever</option>
            <option value="-1">Play once</option>
          </select>
        </div>
        <div id="sizeEstimate" class="md:col-span-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-gray-700 rounded-lg px-4 py-3">
          Estimated output size: load a video to see an estimate
        </div>
        <button id="processBtn" class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed md:col-span-2" disabled>Convert to GIF</button>
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
    this.videoAspectRatio = 4 / 3;
    this.videoDuration = 0;
    this.trimStart = 0;
    this.trimEnd = 0;
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
      fpsValue: 'fpsValue',
      quality: 'quality',
      speed: 'speed',
      loop: 'loop',
      startTime: 'startTime',
      endTime: 'endTime',
      trimSection: 'trimSection',
      trimTrack: 'trimTrack',
      trimRange: 'trimRange',
      trimStartHandle: 'trimStartHandle',
      trimEndHandle: 'trimEndHandle',
      trimLabel: 'trimLabel',
      sizeEstimate: 'sizeEstimate',
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

        const applyMetadata = () => {
          const video = this.elements.inputVideo;
          if (!video.videoWidth || !Number.isFinite(video.duration)) return;

          this.videoAspectRatio = video.videoWidth / video.videoHeight;
          this.videoDuration = video.duration;

          this.elements.width.value = Math.min(480, video.videoWidth);
          this.updateHeight();

          // Default selection: first 5 seconds (or the whole clip if shorter)
          this.setTrim(0, Math.min(this.videoDuration, 5));
          this.elements.trimSection.classList.remove('hidden');
          this.updateEstimate();
        };
        this.elements.inputVideo.onloadedmetadata = applyMetadata;
        this.elements.inputVideo.ondurationchange = applyMetadata;
        if (this.elements.inputVideo.readyState >= 1) applyMetadata();
      }
    });

    // Dimensions
    this.elements.width.addEventListener('input', () => { this.updateHeight(); this.updateEstimate(); });
    this.elements.height.addEventListener('input', () => { this.updateWidth(); this.updateEstimate(); });
    document.querySelectorAll('.size-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.width;
        const sourceWidth = this.elements.inputVideo.videoWidth || 640;
        this.elements.width.value = preset === 'original' ? sourceWidth : Math.min(parseInt(preset), sourceWidth);
        this.updateHeight();
        this.updateEstimate();
      });
    });

    // FPS slider
    this.elements.fps.addEventListener('input', () => {
      this.elements.fpsValue.textContent = this.elements.fps.value;
      this.updateEstimate();
    });

    this.elements.quality.addEventListener('change', () => this.updateEstimate());
    this.elements.speed.addEventListener('change', () => this.updateEstimate());

    // Trim text inputs
    this.elements.startTime.addEventListener('change', () => {
      const t = this.parseTimeToSeconds(this.elements.startTime.value);
      this.setTrim(t, this.trimEnd, 'start');
    });
    this.elements.endTime.addEventListener('change', () => {
      const t = this.parseTimeToSeconds(this.elements.endTime.value);
      this.setTrim(this.trimStart, t, 'end');
    });

    this.initTrimBar();
  }

  initTrimBar() {
    const track = this.elements.trimTrack;
    let active = null;

    const timeAt = (clientX) => {
      const rect = track.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return frac * this.videoDuration;
    };

    const onPointerDown = (which) => (e) => {
      if (!this.videoDuration) return;
      active = which;
      e.preventDefault();
      e.stopPropagation();
    };
    this.elements.trimStartHandle.addEventListener('pointerdown', onPointerDown('start'));
    this.elements.trimEndHandle.addEventListener('pointerdown', onPointerDown('end'));

    // Clicking/dragging on the track grabs the nearest handle
    track.addEventListener('pointerdown', (e) => {
      if (!this.videoDuration) return;
      const t = timeAt(e.clientX);
      active = Math.abs(t - this.trimStart) <= Math.abs(t - this.trimEnd) ? 'start' : 'end';
      this.applyDrag(active, t);
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!active) return;
      this.applyDrag(active, timeAt(e.clientX));
    });
    window.addEventListener('pointerup', () => { active = null; });
  }

  applyDrag(which, time) {
    if (which === 'start') {
      this.setTrim(Math.min(time, this.trimEnd - 0.1), this.trimEnd, 'start');
    } else {
      this.setTrim(this.trimStart, Math.max(time, this.trimStart + 0.1), 'end');
    }
  }

  /**
   * Update trim state, keeping all controls in sync.
   * @param {'start'|'end'} [seekEdge] - which edge to preview in the video element
   */
  setTrim(start, end, seekEdge) {
    const dur = this.videoDuration || 0;
    start = Math.max(0, Math.min(Number.isFinite(start) ? start : 0, dur));
    end = Math.max(start, Math.min(Number.isFinite(end) ? end : dur, dur));
    this.trimStart = start;
    this.trimEnd = end;

    this.elements.startTime.value = this.formatTime(start);
    this.elements.endTime.value = this.formatTime(end);

    if (dur > 0) {
      const startPct = (start / dur) * 100;
      const endPct = (end / dur) * 100;
      this.elements.trimStartHandle.style.left = `${startPct}%`;
      this.elements.trimEndHandle.style.left = `${endPct}%`;
      this.elements.trimRange.style.left = `${startPct}%`;
      this.elements.trimRange.style.width = `${endPct - startPct}%`;
      this.elements.trimLabel.textContent =
        `${this.formatTime(start)} – ${this.formatTime(end)} (${(end - start).toFixed(1)}s of ${this.formatTime(dur)})`;
    }

    if (seekEdge && this.elements.inputVideo.readyState >= 1) {
      this.elements.inputVideo.currentTime = seekEdge === 'start' ? start : end;
    }

    this.updateEstimate();
  }

  updateEstimate() {
    if (!this.videoDuration) return;

    const width = parseInt(this.elements.width.value) || 480;
    const height = parseInt(this.elements.height.value) || Math.round(width / this.videoAspectRatio);
    const fps = parseInt(this.elements.fps.value) || 12;
    const speed = parseFloat(this.elements.speed.value) || 1;
    const quality = QUALITY_SETTINGS[this.elements.quality.value] || QUALITY_SETTINGS.medium;

    const outputDuration = (this.trimEnd - this.trimStart) / speed;
    const frames = Math.max(1, Math.round(fps * outputDuration));
    const bytes = width * height * frames * quality.bytesPerPixel;

    let text = `Estimated output: <strong>${formatFileSize(bytes * 0.7)} – ${formatFileSize(bytes * 1.3)}</strong>` +
      ` · ${frames} frames · ${width}×${height} @ ${fps} fps`;
    if (bytes > 20 * 1024 * 1024) {
      text += ' · <span class="text-amber-600 dark:text-amber-400">large — consider trimming, lowering FPS, or reducing size</span>';
    }
    this.elements.sizeEstimate.innerHTML = text;
    this.lastEstimateBytes = bytes;
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = (seconds - m * 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
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

      const width = parseInt(this.elements.width.value) || 480;
      const height = parseInt(this.elements.height.value) || 360;
      const fps = parseInt(this.elements.fps.value) || 12;
      const speed = parseFloat(this.elements.speed.value) || 1;
      const loop = this.elements.loop.value;
      const quality = QUALITY_SETTINGS[this.elements.quality.value] || QUALITY_SETTINGS.medium;
      const startTime = this.trimStart;
      const clipDuration = this.trimEnd - this.trimStart;

      if (width <= 0 || height <= 0) {
        this.log('Please enter valid dimensions', 'error');
        this.endProcessing(false);
        return;
      }

      if (clipDuration <= 0) {
        this.log('End time must be after start time', 'error');
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

      const filters = [];
      if (speed !== 1) filters.push(`setpts=PTS/${speed}`);
      filters.push(`fps=${fps}`, `scale=${width}:${height}:flags=lanczos`);
      const baseFilters = filters.join(',');

      const timeArgs = [];
      if (startTime > 0) timeArgs.push('-ss', startTime.toFixed(3));
      timeArgs.push('-t', clipDuration.toFixed(3));

      this.log(`Generating optimized ${quality.colors}-color palette...`, 'info');
      await executeFFmpeg(this.ffmpeg, [
        ...timeArgs,
        '-i', inputFileName,
        '-vf', `${baseFilters},palettegen=max_colors=${quality.colors}:stats_mode=diff`,
        '-y', paletteFileName
      ]);
      this.updateProgress(60);

      this.log(`Creating GIF (${width}x${height}, ${fps} fps${speed !== 1 ? `, ${speed}x speed` : ''})...`, 'info');
      await executeFFmpeg(this.ffmpeg, [
        ...timeArgs,
        '-i', inputFileName,
        '-i', paletteFileName,
        '-lavfi', `${baseFilters} [x]; [x][1:v] paletteuse=${quality.dither}`,
        '-loop', loop,
        '-y', outputFileName
      ]);
      this.updateProgress(80);

      this.log('Reading output file...', 'info');
      const data = await readOutputFile(this.ffmpeg, outputFileName);

      if (!data || data.byteLength === 0) {
        throw new Error('Generated GIF is empty. Check video format or try different settings.');
      }

      const blob = new Blob([data], { type: 'image/gif' });
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
      this.displayOutputMedia(blob, 'outputGif', `${baseName}_${width}x${height}.gif`);

      this.updateProgress(100);
      this.log(`Conversion complete! Output: ${formatFileSize(blob.size)}`, 'success');
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
