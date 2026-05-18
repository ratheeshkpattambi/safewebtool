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

const AUDIO_SOURCE_MODES = new Set(['replace']);

export const template = `
  <div class="tool-container">
    <div class="mb-5">
      <h1 class="text-2xl font-black text-slate-950 dark:text-white">Add or Remove Audio from Video</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Choose a video. Add audio from another file, or make the video silent. Everything runs in your browser.</p>
    </div>

    <section class="rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-black text-slate-900 dark:text-white">1. Choose video</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">This video keeps its picture.</p>
        </div>
        <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">Required</span>
      </div>
      <div id="dropZone" class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-gray-700">
        <div class="mb-2 text-4xl">🎬</div>
        <p class="text-base font-bold text-slate-800 dark:text-slate-100">Choose video</p>
        <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">MP4, MOV, WebM, MKV, and more</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button type="button" class="file-select-btn rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Select Video</button>
      </div>
      <div id="videoFileInfo" class="mt-3 hidden rounded-md bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"></div>
      <div class="video-wrapper mt-3">
        <video id="input-video" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>
    </section>

    <section class="mt-4 rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-base font-black text-slate-900 dark:text-white">2. Choose action</h2>
      <div class="mt-3 grid gap-2 md:grid-cols-2" role="radiogroup" aria-label="Audio action">
        <label class="audio-choice rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <input id="modeReplace" type="radio" name="audioMode" value="replace" checked class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Add audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Add sound to a silent video, or replace the sound it already has.</span>
        </label>
        <label class="audio-choice rounded-md border border-slate-200 p-3 text-sm dark:border-gray-700">
          <input id="modeRemove" type="radio" name="audioMode" value="remove" class="mr-2 accent-blue-600">
          <span class="font-black text-slate-900 dark:text-white">Remove audio</span>
          <span class="mt-1 block text-slate-600 dark:text-slate-300">Make a silent video. No second file needed.</span>
        </label>
      </div>
      <p id="modeHelp" class="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">Best for copying audio from one video into another, or adding music/voice to a silent clip. If lengths differ, the default keeps the output the same length as your source video.</p>
    </section>

    <section id="audioSourcePanel" class="mt-4 rounded-md border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="mb-3">
        <h2 class="text-base font-black text-slate-900 dark:text-white">3. Choose audio to add</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Pick a video with sound, or an audio file. The output stays the same length as your video: long audio is trimmed, short audio ends in silence.</p>
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

    <button id="processBtn" class="mt-4 w-full rounded-md bg-blue-600 px-5 py-3 text-base font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600" disabled>Add Audio</button>

    <div id="progress" class="my-4 overflow-hidden rounded-full bg-slate-200 transition-colors dark:bg-gray-700" style="display: none;">
      <div class="h-5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out dark:bg-blue-500" style="width: 0%;"></div>
      <div class="-mt-4 text-center text-xs font-medium leading-5 text-slate-700 dark:text-slate-300">0%</div>
    </div>

    <div id="outputContainer" class="output-container" style="display: none;">
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
    replace: 'Add Audio',
    remove: 'Remove Audio'
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
      outputContainer: 'outputContainer',
      videoFileInfo: 'videoFileInfo',
      audioFileInfo: 'audioFileInfo',
      audioSourcePanel: 'audioSourcePanel',
      modeHelp: 'modeHelp',
      lastCommandSummary: 'lastCommandSummary',
      downloadContainer: 'downloadContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'video/*',
      hideDropZoneOnSelect: true,
      onFileSelected: file => this.handleVideoFile(file)
    });

    initSharedFileUpload({
      dropZoneId: 'audioDropZone',
      fileInputId: 'audioFileInput',
      acceptTypes: 'video/*,audio/*',
      hideDropZoneOnSelect: true,
      onFileSelected: file => this.handleAudioFile(file)
    });

    this.elements.videoFileInfo.addEventListener('click', event => {
      if (event.target.closest('[data-change-file]')) this.elements.fileInput.click();
    });

    this.elements.audioFileInfo.addEventListener('click', event => {
      if (event.target.closest('[data-change-file]')) this.elements.audioFileInput.click();
    });

    document.querySelectorAll('input[name="audioMode"]').forEach(input => {
      input.addEventListener('change', () => this.updateModeUI());
    });

    this.elements.processBtn.addEventListener('click', () => this.processVideo());

    this.updateModeUI();
    this.log('Audio tool ready. Choose a video to begin.', 'info');
  }

  getMode() {
    return document.querySelector('input[name="audioMode"]:checked')?.value || 'replace';
  }

  getLengthMode() {
    return 'match';
  }

  getDelaySeconds() {
    return 0;
  }

  handleVideoFile(file) {
    if (!file?.type.startsWith('video/')) {
      this.log('Choose a valid video file for the source video.', 'error');
      return;
    }

    this.videoFile = file;
    this.clearOutput();
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
    this.clearOutput();
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
      <span class="break-all">${file.name}</span>
      <span class="mt-1 block text-slate-500 dark:text-slate-400">${formatFileSize(file.size)} · ${file.type || 'unknown type'}</span>
      <button type="button" data-change-file class="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 dark:border-gray-600 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-200">Change file</button>
    `;
    element.classList.remove('hidden');
  }

  clearOutput() {
    this.elements.downloadContainer.innerHTML = '';
    this.elements.outputVideo.removeAttribute('src');
    this.elements.outputVideo.style.display = 'none';
    this.elements.outputContainer.style.display = 'none';
  }

  updateModeUI() {
    const mode = this.getMode();
    const needsAudioSource = AUDIO_SOURCE_MODES.has(mode);
    this.elements.audioSourcePanel.style.display = needsAudioSource ? '' : 'none';
    this.elements.processBtn.textContent = getModeLabel(mode);

    this.updateChoiceStyles();
    this.updateLengthSummary();
    this.updateProcessState();
  }

  updateLengthSummary() {
    const mode = this.getMode();
    const modeHelp = {
      replace: 'Adds the selected audio to your video. If the video already has sound, it is replaced. The output stays the same length as your video: long audio is trimmed, short audio ends in silence.',
      remove: 'Creates a silent video while keeping the picture. No second file is needed.'
    }[mode];

    this.elements.modeHelp.textContent = modeHelp;
    this.updateChoiceStyles();
  }

  updateChoiceStyles() {
    document.querySelectorAll('.audio-choice').forEach(label => {
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
      this.clearOutput();
      this.updateProgress(10);

      this.ffmpeg = await loadFFmpeg();
      await cleanupFFmpeg(this.ffmpeg);
      this.updateProgress(25);

      const videoInputName = `source-video${getExtension(this.videoFile.name)}`;
      const outputSuffix = mode === 'replace' ? 'add-audio' : `${mode}-audio`;
      const outputFileName = `${getBaseName(this.videoFile.name)}-${outputSuffix}.mp4`;
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
        await this.executeAudioCommand(args);
      } catch (copyError) {
        if (this.isNoAudioTrackError(copyError)) throw copyError;
        if (!tryCopyVideo) throw copyError;
        this.log(`Fast video copy failed, retrying with browser-compatible MP4 video: ${copyError.message}`, 'warning');
        try {
          await this.ffmpeg.deleteFile(outputFileName);
        } catch {
          // Output may not exist after a failed FFmpeg run.
        }
        args = buildVideoAudioCommand({ ...commandOptions, copyVideo: false });
        await this.executeAudioCommand(args);
      }

      this.updateProgress(80);
      const data = await readOutputFile(this.ffmpeg, outputFileName);
      const blob = new Blob([data], { type: 'video/mp4' });
      this.displayOutputMedia(blob, 'outputVideo', outputFileName, 'downloadContainer');
      this.elements.outputContainer.style.display = 'block';
      const downloadLink = this.elements.downloadContainer.querySelector('a[download]');
      if (downloadLink) downloadLink.textContent = 'Download MP4';
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

  async executeAudioCommand(args) {
    const commandLogs = [];
    const collectLog = ({ message }) => {
      if (message) commandLogs.push(message);
    };

    this.ffmpeg.on('log', collectLog);
    try {
      await executeFFmpeg(this.ffmpeg, args);
    } catch (error) {
      const combinedLogs = commandLogs.join('\n');
      if (/matches no streams|Stream map .*matches no streams|Stream specifier .*matches no streams/i.test(combinedLogs)) {
        throw new Error('The selected audio source does not contain an audio track. Choose a video with sound or an audio file.');
      }
      throw error;
    } finally {
      this.ffmpeg.off('log', collectLog);
    }
  }

  isNoAudioTrackError(error) {
    return error?.message?.includes('selected audio source does not contain an audio track');
  }
}

export function initTool() {
  const tool = new VideoAudioTool();
  return tool.init();
}
