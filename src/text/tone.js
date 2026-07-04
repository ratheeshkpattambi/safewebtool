import { Tool } from '../common/base.js';
import { runInference, cleanGeneratedText, trimForModel } from '../common/ml-loader.js';

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct';
const MAX_NEW_TOKENS = 512;
const TONES = ['Formal', 'Casual', 'Professional', 'Friendly'];

const pillBaseClass = 'tone-pill px-4 py-1.5 rounded-full border text-sm font-medium transition-colors';
const pillInactiveClass = 'border-slate-300 dark:border-gray-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-800 hover:border-blue-400';
const pillActiveClass = 'border-blue-600 bg-blue-600 text-white';

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-sm text-slate-500 dark:text-slate-400">Runs a small AI model entirely in your browser — your text is never uploaded. The model downloads once (~250MB) and is cached for next time.</p>

    <div>
      <label for="inputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Input</label>
      <textarea id="inputText" rows="8" class="w-full min-h-[160px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Paste your text here..."></textarea>
    </div>

    <div>
      <label class="block font-medium text-sm mb-2 text-slate-700 dark:text-slate-200">Tone</label>
      <div id="toneGroup" class="flex flex-wrap gap-2">
        ${TONES.map((tone, i) => `<button type="button" class="${pillBaseClass} ${i === 2 ? pillActiveClass : pillInactiveClass}" data-tone="${tone}">${tone}</button>`).join('')}
      </div>
    </div>

    <div class="text-center">
      <button type="button" id="processBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Rewrite</button>
    </div>

    <div id="progress" class="progress hidden">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>

    <div>
      <label for="outputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Output</label>
      <textarea id="outputText" rows="8" class="w-full min-h-[160px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" readonly placeholder="Rewritten text will appear here..."></textarea>
    </div>

    <div class="text-center space-x-2">
      <button id="copyBtn" class="px-4 py-2 bg-slate-600 dark:bg-slate-500 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Copy</button>
      <button id="downloadBtn" class="px-4 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Download</button>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class ToneTool extends Tool {
  constructor() {
    super({
      id: 'tone',
      name: 'AI Tone Rewriter',
      category: 'text',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
    this.selectedTone = 'Professional';
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      toneGroup: 'toneGroup',
      outputText: 'outputText',
      processBtn: 'processBtn',
      progress: 'progress',
      copyBtn: 'copyBtn',
      downloadBtn: 'downloadBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.toneGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tone-pill');
      if (!btn) return;
      this.selectTone(btn.dataset.tone);
    });

    this.elements.processBtn?.addEventListener('click', () => this.processText());
    this.elements.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.elements.downloadBtn?.addEventListener('click', () => this.downloadOutput());
    this.log('Ready. Choose a tone and click "Rewrite" to load the AI model and process your text.', 'info');
  }

  selectTone(tone) {
    this.selectedTone = tone;
    this.elements.toneGroup.querySelectorAll('.tone-pill').forEach((btn) => {
      const isActive = btn.dataset.tone === tone;
      btn.className = `${pillBaseClass} ${isActive ? pillActiveClass : pillInactiveClass}`;
    });
  }

  async processText() {
    const rawInput = this.elements.inputText.value.trim();
    if (!rawInput) {
      this.log('Please enter some text first.', 'error');
      return;
    }

    const { text: input, trimmed } = trimForModel(rawInput, 800);
    if (trimmed) {
      this.log('Input trimmed to 800 tokens for performance.', 'warning');
    }

    this.startProcessing();
    this.elements.copyBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;
    this.log('Downloading AI model (first time only, ~250MB)... This is cached after the first run.', 'info');

    const prompt = `Rewrite the following text in a ${this.selectedTone.toLowerCase()} tone. Return only the rewritten text:\n\n${input}`;

    try {
      const output = await runInference('text-generation', MODEL_ID, prompt, {
        max_new_tokens: MAX_NEW_TOKENS,
        repetition_penalty: 1.3,
        no_repeat_ngram_size: 3,
        onProgress: (progress) => {
          if (progress?.status === 'progress' && typeof progress.progress === 'number') {
            this.updateProgress(Math.min(90, progress.progress * 0.9));
          } else if (progress?.status === 'done') {
            this.log(`Downloaded ${progress.file}`, 'info');
          }
        }
      });

      this.log('Model ready.', 'success');
      this.updateProgress(95);

      const generated = output?.[0]?.generated_text ?? '';
      const cleaned = cleanGeneratedText(generated, prompt);

      this.elements.outputText.value = cleaned;
      this.elements.copyBtn.disabled = !cleaned;
      this.elements.downloadBtn.disabled = !cleaned;
      this.endProcessing(true);
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.endProcessing(false);
    }
  }

  async copyOutput() {
    const text = this.elements.outputText.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.elements.copyBtn.textContent = 'Copied!';
      setTimeout(() => { this.elements.copyBtn.textContent = 'Copy'; }, 1500);
    } catch (error) {
      this.log(`Failed to copy: ${error.message}`, 'error');
    }
  }

  downloadOutput() {
    const text = this.elements.outputText.value;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tone-rewrite.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log('Downloaded.', 'success');
  }
}

export function initTool() {
  const tool = new ToneTool();
  return tool.init();
}
