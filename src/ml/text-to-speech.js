import { Tool } from '../common/base.js';
import { runTextToSpeech } from '../common/ml-loader.js';
import { getModel } from '../common/ml-models.js';

const MODEL_KEY = 'kokoro-82m';
const MAX_CHARS = 2000;

/**
 * Only the voices actually mirrored to R2 — see MODELS['kokoro-82m'].files in
 * ml-models.js. Adding one here without mirroring it produces a 404 at generate time.
 */
const VOICES = [
  { id: 'af_heart', label: 'Heart — American English, female' },
  { id: 'af_bella', label: 'Bella — American English, female' },
  { id: 'af_nicole', label: 'Nicole — American English, female' },
  { id: 'am_michael', label: 'Michael — American English, male' },
  { id: 'am_puck', label: 'Puck — American English, male' },
  { id: 'bf_emma', label: 'Emma — British English, female' },
  { id: 'bm_george', label: 'George — British English, male' },
  { id: 'ef_dora', label: 'Dora — Spanish, female' },
  { id: 'jf_alpha', label: 'Alpha — Japanese, female' },
  { id: 'zf_xiaobei', label: 'Xiaobei — Mandarin, female' },
];

const modelSizeMB = Math.round(getModel(MODEL_KEY).approxBytes / 1e6);

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-sm text-slate-500 dark:text-slate-400">Turns text into natural speech with a small AI model running entirely in your browser — your text is never uploaded. The voice model downloads once (~${modelSizeMB}MB) and is cached for next time.</p>

    <div>
      <label for="inputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Text</label>
      <textarea id="inputText" rows="6" maxlength="${MAX_CHARS}" class="w-full min-h-[140px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Type or paste the text you want spoken..."></textarea>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400"><span id="charCount">0</span> / ${MAX_CHARS} characters</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for="voiceSelect" class="block font-medium text-sm mb-1 text-slate-700 dark:text-slate-200">Voice</label>
        <select id="voiceSelect" class="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
          ${VOICES.map((v, i) => `<option value="${v.id}"${i === 0 ? ' selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="speedRange" class="block font-medium text-sm mb-1 text-slate-700 dark:text-slate-200">Speed: <span id="speedValue">1.0</span>x</label>
        <input type="range" id="speedRange" min="0.5" max="2" step="0.1" value="1" class="w-full mt-3 accent-blue-600">
      </div>
    </div>

    <div class="text-center">
      <button type="button" id="processBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>Speak</button>
    </div>

    <div id="progress" class="progress hidden">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>

    <div id="audioOutput" class="output-container hidden space-y-3">
      <label class="block font-bold text-lg text-slate-700 dark:text-slate-200">Audio</label>
      <audio id="outputAudio" controls class="w-full"></audio>
      <div class="text-center">
        <button id="downloadBtn" class="px-4 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Download WAV</button>
      </div>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class TextToSpeechTool extends Tool {
  constructor() {
    super({
      id: 'text-to-speech',
      name: 'Text to Speech',
      category: 'ml',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
    this.audioUrl = null;
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      charCount: 'charCount',
      voiceSelect: 'voiceSelect',
      speedRange: 'speedRange',
      speedValue: 'speedValue',
      processBtn: 'processBtn',
      progress: 'progress',
      audioOutput: 'audioOutput',
      outputAudio: 'outputAudio',
      downloadBtn: 'downloadBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.inputText?.addEventListener('input', () => this.syncInputState());
    this.elements.speedRange?.addEventListener('input', () => {
      this.elements.speedValue.textContent = Number(this.elements.speedRange.value).toFixed(1);
    });
    this.elements.processBtn?.addEventListener('click', () => this.generateSpeech());
    this.elements.downloadBtn?.addEventListener('click', () => this.downloadAudio());

    this.syncInputState();
    this.log('Ready. Enter text and click "Speak" to load the voice model and generate audio.', 'info');
  }

  /** Speak is only meaningful with text — keep the button honest. */
  syncInputState() {
    const length = this.elements.inputText?.value.length ?? 0;
    if (this.elements.charCount) this.elements.charCount.textContent = String(length);
    if (this.elements.processBtn) this.elements.processBtn.disabled = length === 0;
  }

  async generateSpeech() {
    const text = this.elements.inputText.value.trim();
    if (!text) {
      this.log('Please enter some text first.', 'error');
      return;
    }

    this.startProcessing();
    this.elements.downloadBtn.disabled = true;
    this.log(`Downloading voice model (first time only, ~${modelSizeMB}MB)... This is cached after the first run.`, 'info');

    try {
      const { wav, samplingRate } = await runTextToSpeech(MODEL_KEY, text, {
        voice: this.elements.voiceSelect.value,
        speed: Number(this.elements.speedRange.value),
        onProgress: (progress) => {
          if (progress?.status === 'progress' && typeof progress.progress === 'number') {
            this.updateProgress(Math.min(90, progress.progress * 0.9));
          } else if (progress?.status === 'done') {
            this.log(`Downloaded ${progress.file}`, 'info');
          }
        }
      });

      this.log('Model ready. Generating speech...', 'success');
      this.updateProgress(95);

      const blob = new Blob([wav], { type: 'audio/wav' });
      if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = URL.createObjectURL(blob);

      this.elements.outputAudio.src = this.audioUrl;
      this.elements.audioOutput.classList.remove('hidden');
      this.elements.downloadBtn.disabled = false;
      // Real byte count, so tests can assert on actual audio rather than element presence.
      this.elements.outputAudio.setAttribute('data-audio-bytes', String(blob.size));

      this.log(`Generated ${(blob.size / 1024).toFixed(0)} KB of audio at ${samplingRate} Hz.`, 'success');
      this.endProcessing(true);
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    }
  }

  downloadAudio() {
    if (!this.audioUrl) return;
    const a = document.createElement('a');
    a.href = this.audioUrl;
    a.download = `speech-${this.elements.voiceSelect.value}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.log('Downloaded.', 'success');
  }
}

export function initTool() {
  const tool = new TextToSpeechTool();
  return tool.init();
}
