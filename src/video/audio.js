import { Tool } from '../common/base.js';
import { initFileUpload as initSharedFileUpload } from '../common/fileUpload.js';
import { formatFileSize } from '../common/utils.js';
import {
  loadFFmpeg,
  writeInputFile,
  readOutputFile,
  executeFFmpeg,
  getExtension,
  cleanupFFmpeg
} from './ffmpeg-utils.js';
import { buildVideoAudioCommand } from './audio-command.js';

const AUDIO_SOURCE_MODES = new Set(['replace', 'add']);

export const template = `
  <div class="tool-container">
    <div class="mb-5">
      <h1 class="text-2xl font-black text-slate-950 dark:text-white">Add or Remove Audio from Video</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Remove sound from a video, or copy audio from another video or audio file into your source video. Everything runs in your browser.</p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-black text-slate-900 dark:text-white">1. Video to keep</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">This video keeps its picture.</p>
          </div>
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">Required</span>
        </div>
        <div id="dropZone" class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-gray-700">
          <div class="mb-2 text-4xl">🎬</div>
          <p class="text-base font-bold text-slate-800 dark:text-slate-100">Choose source video</p>
          <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">MP4, MOV, WebM, MKV, and more</p>
          <input type="file" id="fileInput" class="hidden" accept="video/*">
          <button type="button" class="file-select-btn rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Select Video</button>
        </div>
        <div id="videoFileInfo" class="mt-3 hidden rounded-md bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"></div>
        <div class="video-wrapper mt-3">
          <video id="input-video" controls style="display: none; max-width: 100%; height: auto;"></video>
        </div>
      </section>

      <section id="audioSourcePanel" class="rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-black text-slate-900 dark:text-white">2. Audio source</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Pick a video with sound, or an audio file.</p>
          </div>
          <span id="audioRequiredBadge" class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">Required</span>
        </div>
        <div id="audioDropZone" class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-gray-700">
          <div class="mb-2 text-4xl">🔊</div>
          <p class="text-base font-bold text-slate-800 dark:text-slate-100">Choose audio source</p>
          <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">Video or audio: MP4, MOV, MP3, WAV, M4A, AAC</p>
          <input type="file" id="audioFileInput" class="hidden" accept="video/*,audio/*">
          <button type="button" class="file-select-btn rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Select Audio Source</button>
        </div>
        <div id="audioFileInfo" class="mt-3 hidden rounded-md bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"></div>
        <div class="mt-3">
          <video id="source-video-preview" controls style="display: none; max-width: 100%; height: auto;"></video>
          <audio id="source-audio-preview" controls style="display: none; width: 100%;"></audio>
        </div>
      </section>
    </div>

    <section class="mt-4 rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-base font-black text-slate-900 dark:text-white">What do you want to do?</h2>
      <div class="mt-3 grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Audio action">
        <label class="audio-choice rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <input id="modeReplace" type="radio" name="audioMode" value="replace" checked class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Replace audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Copy sound from another video/audio file into this video.</span>
        </label>
        <label class="audio-choice rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
          <input id="modeRemove" type="radio" name="audioMode" value="remove" class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Remove audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Make a silent video. No second file needed.</span>
        </label>
        <label class="audio-choice rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
          <input id="modeAdd" type="radio" name="audioMode" value="add" class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Add audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Use when your source video is silent.</span>
        </label>
      </div>
      <p id="modeHelp" class="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">Best for copying audio from one video into another. If lengths differ, the default keeps the output the same length as your source video.</p>
    </section>

    <section id="timingPanel" class="mt-4 rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-base font-black text-slate-900 dark:text-white">When audio and video lengths differ</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">Default is safest for most phone videos and social clips.</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Start audio after
          <input id="audioDelay" type="number" min="0" step="0.1" value="0" class="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-100">
          sec
        </label>
      </div>
      <div class="mt-3 grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Length handling">
        <label class="length-choice rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <input id="lengthMatch" type="radio" name="lengthMode" value="match" checked class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Match video length</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Trim long audio. Pad short audio with silence.</span>
        </label>
        <label class="length-choice rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
          <input id="lengthLoop" type="radio" name="lengthMode" value="loop" class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Loop short audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Repeat audio until the video ends.</span>
        </label>
        <label class="length-choice rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
          <input id="lengthKeep" type="radio" name="lengthMode" value="keep" class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Keep full audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Output may continue after the video ends.</span>
        </label>
      </div>
    </section>

    <button id="processBtn" class="mt-4 w-full rounded-md bg-blue-600 px-5 py-3 text-base font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600" disabled>Replace Audio</button>

    <div id="progress" class="my-4 overflow-hidden rounded-full bg-slate-200 transition-colors dark:bg-gray-700" style="display: none;">
      <div class="h-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out dark:bg-blue-500" style="width: 0%;"></div>
      <div class="-mt-4 text-center text-xs font-medium leading-5 text-slate-700 dark:text-slate-300">0%</div>
    </div>

    <div id="outputContainer" class="output-container">
      <div class="video-wrapper">
        <video id="output-video" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>
      <div id="downloadContainer"></div>
    </div>

    <div id="lastCommandSummary" data-testid="last-command-summary" hidden></div>

    <div id="logHeader" class="mt-6 flex cursor-pointer items-center justify-between rounded-md bg-slate-100 p-2.5 transition-colors dark:bg-gray-700">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 transition-transform dark:text-slate-400">▼</span>
    </div>
    <textarea id="logContent" class="mt-px h-48 w-full resize-none rounded-b-md border-0 bg-slate-100 p-4 font-mono text-xs text-slate-700 transition-colors focus:outline-none dark:bg-gray-700 dark:text-slate-300" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

function getModeLabel(mode) {
  return {
    replace: 'Replace Audio',
    remove: 'Remove Audio',
    add: 'Add Audio'
  }[mode] || 'Process Video';
}

function getBaseName(fileName = 'video') {
  return fileName.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'video';
}

function canTryVideoStreamCopy(fileName = '') {
  return ['.mp4', '.m4v', '.mov'].includes(getExtension(fileName).toLowerCase());
}

class VideoAudioTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      id: 'audio',
      name: 'Add or Remove Audio from Video',
      category: 'video',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: false,
      template
    });

    this.ffmpeg = null;
    this.videoFile = null;
    this.audioFile = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      audioDropZone: 'audioDropZone',
      audioFileInput: 'audioFileInput',
      inputVideo: 'input-video',
      sourceVideoPreview: 'source-video-preview',
      sourceAudioPreview: 'source-audio-preview',
      outputVideo: 'output-video',
      processBtn: 'processBtn',
      progress: 'progress',
      videoFileInfo: 'videoFileInfo',
      audioFileInfo: 'audioFileInfo',
      audioSourcePanel: 'audioSourcePanel',
      audioRequiredBadge: 'audioRequiredBadge',
      timingPanel: 'timingPanel',
      modeHelp: 'modeHelp',
      audioDelay: 'audioDelay',
      lastCommandSummary: 'lastCommandSummary',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'video/*',
      hideDropZoneOnSelect: false,
      onFileSelected: file => this.handleVideoFile(file)
    });

    initSharedFileUpload({
      dropZoneId: 'audioDropZone',
      fileInputId: 'audioFileInput',
      acceptTypes: '*/*',
      hideDropZoneOnSelect: false,
      onFileSelected: file => this.handleAudioFile(file)
    });

    document.querySelectorAll('input[name="audioMode"]').forEach(input => {
      input.addEventListener('change', () => this.updateModeUI());
    });

    document.querySelectorAll('input[name="lengthMode"]').forEach(input => {
      input.addEventListener('change', () => this.updateLengthSummary());
    });

    this.elements.audioDelay.addEventListener('input', () => this.updateLengthSummary());
    this.elements.processBtn.addEventListener('click', () => this.processVideo());

    this.updateModeUI();
    this.log('Audio tool ready. Choose a video to begin.', 'info');
  }

  getMode() {
    return document.querySelector('input[name="audioMode"]:checked')?.value || 'replace';
  }

  getLengthMode() {
    return document.querySelector('input[name="lengthMode"]:checked')?.value || 'match';
  }

  getDelaySeconds() {
    return Math.max(0, Number(this.elements.audioDelay.value || 0));
  }

  handleVideoFile(file) {
    if (!file?.type.startsWith('video/')) {
      this.log('Choose a valid video file for the source video.', 'error');
      return;
    }

    this.videoFile = file;
    this.displayPreview(file, 'inputVideo');
    this.setFileInfo(this.elements.videoFileInfo, 'Video', file);
    this.log(`Loaded source video: ${file.name} (${formatFileSize(file.size)})`, 'info');
    this.updateProcessState();
  }

  handleAudioFile(file) {
    if (!file || (!file.type.startsWith('audio/') && !file.type.startsWith('video/'))) {
      this.log('Choose a valid audio file or a video that contains audio.', 'error');
      return;
    }

    this.audioFile = file;
    if (file.type.startsWith('video/')) {
      this.displayPreview(file, 'sourceVideoPreview');
      this.elements.sourceAudioPreview.style.display = 'none';
    } else {
      this.displayPreview(file, 'sourceAudioPreview');
      this.elements.sourceVideoPreview.style.display = 'none';
    }
    this.setFileInfo(this.elements.audioFileInfo, 'Audio source', file);
    this.log(`Loaded audio source: ${file.name} (${formatFileSize(file.size)})`, 'info');
    this.updateProcessState();
  }

  setFileInfo(element, label, file) {
    element.innerHTML = `
      <strong class="block text-slate-900 dark:text-white">${label}</strong>
      <span>${file.name}</span>
      <span class="mt-1 block text-slate-500 dark:text-slate-400">${formatFileSize(file.size)} · ${file.type || 'unknown type'}</span>
    `;
    element.classList.remove('hidden');
  }

  updateModeUI() {
    const mode = this.getMode();
    const needsAudioSource = AUDIO_SOURCE_MODES.has(mode);
    this.elements.audioSourcePanel.style.display = needsAudioSource ? '' : 'none';
    this.elements.timingPanel.style.display = needsAudioSource ? '' : 'none';
    this.elements.processBtn.textContent = getModeLabel(mode);
    this.elements.audioRequiredBadge.textContent = needsAudioSource ? 'Required' : 'Not needed';

    this.updateChoiceStyles();
    this.updateLengthSummary();
    this.updateProcessState();
  }

  updateLengthSummary() {
    const mode = this.getMode();
    const modeHelp = {
      replace: 'Best for copying audio from one video into another. The original sound in your source video is removed.',
      remove: 'Creates a silent video while keeping the picture. No second file is needed.',
      add: 'Best when your source video is silent. If it already has sound, the selected audio becomes the output sound.'
    }[mode];

    if (!AUDIO_SOURCE_MODES.has(mode)) {
      this.elements.modeHelp.textContent = modeHelp;
      return;
    }

    const lengthMode = this.getLengthMode();
    const delay = this.getDelaySeconds();
    const summary = {
      match: 'Output stays the same length as your source video. Long audio is trimmed; short audio is padded with silence.',
      loop: 'Short audio repeats until the video ends. Long audio is trimmed at the video end.',
      keep: 'Full audio is kept. The output may be longer than your source video.'
    }[lengthMode];
    this.elements.modeHelp.textContent = `${modeHelp} ${summary}${delay > 0 ? ` Audio starts after ${delay.toFixed(1)} seconds.` : ''}`;
    this.updateChoiceStyles();
  }

  updateChoiceStyles() {
    document.querySelectorAll('.audio-choice, .length-choice').forEach(label => {
      const input = label.querySelector('input');
      const selected = input?.checked;
      label.classList.toggle('border-blue-200', selected);
      label.classList.toggle('bg-blue-50', selected);
      label.classList.toggle('dark:border-blue-900', selected);
      label.classList.toggle('dark:bg-blue-950/30', selected);
      label.classList.toggle('border-slate-200', !selected);
      label.classList.toggle('dark:border-gray-700', !selected);
    });
  }

  updateProcessState() {
    const needsAudioSource = AUDIO_SOURCE_MODES.has(this.getMode());
    this.elements.processBtn.disabled = !this.videoFile || (needsAudioSource && !this.audioFile) || this.isProcessing;
  }

  async processVideo() {
    const mode = this.getMode();
    if (!this.videoFile) {
      this.log('Choose the video you want to keep first.', 'error');
      return;
    }
    if (AUDIO_SOURCE_MODES.has(mode) && !this.audioFile) {
      this.log('Choose an audio source file first.', 'error');
      return;
    }

    try {
      this.startProcessing();
      this.updateProcessState();
      this.elements.downloadContainer.innerHTML = '';
      this.updateProgress(10);

      this.ffmpeg = await loadFFmpeg();
      await cleanupFFmpeg(this.ffmpeg);
      this.updateProgress(25);

      const videoInputName = `source-video${getExtension(this.videoFile.name)}`;
      const outputFileName = `${getBaseName(this.videoFile.name)}-${mode}-audio.mp4`;
      await writeInputFile(this.ffmpeg, videoInputName, this.videoFile);

      let audioInputName = '';
      if (AUDIO_SOURCE_MODES.has(mode)) {
        audioInputName = `audio-source${getExtension(this.audioFile.name)}`;
        await writeInputFile(this.ffmpeg, audioInputName, this.audioFile);
      }
      this.updateProgress(45);

      const commandOptions = {
        mode,
        lengthMode: this.getLengthMode(),
        delaySeconds: this.getDelaySeconds(),
        videoInputName,
        audioInputName,
        outputFileName
      };

      const tryCopyVideo = canTryVideoStreamCopy(this.videoFile.name);
      let args = buildVideoAudioCommand({ ...commandOptions, copyVideo: tryCopyVideo });
      this.setCommandSummary(commandOptions);
      this.log(
        tryCopyVideo
          ? `${getModeLabel(mode)}: preserving video quality when possible...`
          : `${getModeLabel(mode)}: creating a browser-compatible MP4...`,
        'info'
      );

      try {
        await executeFFmpeg(this.ffmpeg, args);
      } catch (copyError) {
        if (!tryCopyVideo) throw copyError;
        this.log(`Fast video copy failed, retrying with browser-compatible MP4 video: ${copyError.message}`, 'warning');
        try {
          await this.ffmpeg.deleteFile(outputFileName);
        } catch {
          // Output may not exist after a failed FFmpeg run.
        }
        args = buildVideoAudioCommand({ ...commandOptions, copyVideo: false });
        await executeFFmpeg(this.ffmpeg, args);
      }

      this.updateProgress(80);
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      const blob = new Blob([data], { type: 'video/mp4' });
      this.displayOutputMedia(blob, 'outputVideo', outputFileName, 'downloadContainer');
      this.updateProgress(100);
      this.log(`${getModeLabel(mode)} complete. Download your MP4 below.`, 'success');
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    } finally {
      this.updateProcessState();
    }
  }

  setCommandSummary({ mode, lengthMode, delaySeconds }) {
    this.elements.lastCommandSummary.setAttribute('data-mode', mode);
    this.elements.lastCommandSummary.setAttribute('data-length-mode', lengthMode);
    this.elements.lastCommandSummary.setAttribute('data-delay-seconds', String(delaySeconds));
  }
}

export function initTool() {
  const tool = new VideoAudioTool();
  return tool.init();
}
