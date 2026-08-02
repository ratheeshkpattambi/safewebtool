import { Tool } from '../common/base.js';
import { runInference, cleanGeneratedText, trimForModel } from '../common/ml-loader.js';
import { getModel, getPipelineOptions } from '../common/ml-models.js';

const MODEL_KEY = 'smollm2-360m';
const modelSizeMB = Math.round(getModel(MODEL_KEY).approxBytes / 1e6);

const LENGTH_CONFIG = {
  short: {
    maxNewTokens: 150,
    instruction: 'Summarize the following text in 2-3 sentences.'
  },
  medium: {
    maxNewTokens: 300,
    instruction: 'Summarize the following text in one paragraph.'
  },
  detailed: {
    maxNewTokens: 600,
    instruction: 'Summarize the following text in 3-4 paragraphs, covering the key points in detail.'
  }
};

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-sm text-slate-500 dark:text-slate-400">Runs a small AI model entirely in your browser — your text is never uploaded. The model downloads once (~${modelSizeMB}MB) and is cached for next time.</p>

    <div>
      <label for="inputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Input</label>
      <textarea id="inputText" rows="10" class="w-full min-h-[200px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Paste your article, document, or text here..."></textarea>
    </div>

    <div>
      <label for="lengthSelect" class="block font-medium text-sm mb-1 text-slate-700 dark:text-slate-200">Length</label>
      <select id="lengthSelect" class="w-full sm:w-64 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
        <option value="short">Short (2-3 sentences)</option>
        <option value="medium" selected>Medium (1 paragraph)</option>
        <option value="detailed">Detailed (3-4 paragraphs)</option>
      </select>
    </div>

    <div class="text-center">
      <button type="button" id="processBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Summarize</button>
    </div>

    <div id="progress" class="progress hidden">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>

    <div>
      <label for="outputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Summary</label>
      <textarea id="outputText" rows="8" class="w-full min-h-[160px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" readonly placeholder="Summary will appear here..."></textarea>
    </div>

    <div class="text-center space-x-2">
      <button id="copyBtn" class="px-4 py-2 bg-slate-600 dark:bg-slate-500 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Copy</button>
      <button id="downloadBtn" class="px-4 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Download</button>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class SummarizeTool extends Tool {
  constructor() {
    super({
      id: 'summarize',
      name: 'AI Text Summarizer',
      category: 'text',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      lengthSelect: 'lengthSelect',
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
    this.elements.processBtn?.addEventListener('click', () => this.processText());
    this.elements.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.elements.downloadBtn?.addEventListener('click', () => this.downloadOutput());
    this.log('Ready. Choose a length and click "Summarize" to load the AI model and process your text.', 'info');
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

    const length = this.elements.lengthSelect.value;
    const { maxNewTokens, instruction } = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

    this.startProcessing();
    this.elements.copyBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;
    this.log(`Downloading AI model (first time only, ~${modelSizeMB}MB)... This is cached after the first run.`, 'info');

    // SmolLM2-Instruct is trained on ChatML; a raw string prompt skips the
    // <|im_start|>user...<|im_end|> structure it expects and produces free-associated
    // continuations instead of following the instruction. Use chat messages so
    // Transformers.js applies the model's chat template.
    const messages = [
      { role: 'system', content: `${instruction} Return only the summary with no explanation.` },
      { role: 'user', content: input }
    ];

    try {
      const output = await runInference('text-generation', getModel(MODEL_KEY).repo, messages, {
        loadOptions: getPipelineOptions(MODEL_KEY),
        max_new_tokens: maxNewTokens,
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
      const cleaned = cleanGeneratedText(generated);

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
    a.download = 'summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log('Downloaded.', 'success');
  }
}

export function initTool() {
  const tool = new SummarizeTool();
  return tool.init();
}
