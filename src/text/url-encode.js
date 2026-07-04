/**
 * URL Encode & Decode tool
 * Percent-encoding via encodeURIComponent/decodeURIComponent,
 * all processed locally in the browser — no data leaves the device.
 */
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-slate-600 dark:text-slate-300">Percent-encode text for safe use in URLs, or decode an encoded URL back to readable text. Everything runs in your browser.</p>
    <div>
      <label for="inputText" class="block mb-1 font-medium text-slate-700 dark:text-slate-300">Input</label>
      <textarea id="inputText" rows="8" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors" placeholder="Enter text to encode, or a URL-encoded string to decode..."></textarea>
    </div>
    <div class="flex gap-3 justify-center flex-wrap">
      <button id="encodeBtn" class="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Encode</button>
      <button id="decodeBtn" class="min-h-[44px] px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium">Decode</button>
      <button id="copyBtn" class="min-h-[44px] px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium">Copy Output</button>
    </div>
    <div>
      <label for="outputText" class="block mb-1 font-medium text-slate-700 dark:text-slate-300">Output</label>
      <textarea id="outputText" rows="8" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md font-mono text-sm bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 transition-colors" readonly placeholder="Result appears here..."></textarea>
    </div>
    <button id="processBtn" class="hidden" disabled></button>
    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class UrlEncodeTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'text',
      needsFileUpload: false,
      hasOutput: true,
      needsProcessButton: false,
      template
    });
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      outputText: 'outputText',
      encodeBtn: 'encodeBtn',
      decodeBtn: 'decodeBtn',
      copyBtn: 'copyBtn',
      processBtn: 'processBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.encodeBtn?.addEventListener('click', () => this.encode());
    this.elements.decodeBtn?.addEventListener('click', () => this.decode());
    this.elements.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.log('URL encoder ready. Everything stays in your browser.', 'info');
  }

  encode() {
    const input = this.elements.inputText.value;
    if (!input) {
      this.elements.outputText.value = '';
      this.log('Nothing to encode — input is empty.', 'error');
      return;
    }
    try {
      this.elements.outputText.value = encodeURIComponent(input);
      this.log(`Encoded ${input.length} characters.`, 'success');
    } catch (err) {
      this.elements.outputText.value = '';
      this.log(`Encoding failed: ${err.message} (input may contain a lone surrogate character)`, 'error');
    }
  }

  decode() {
    const input = this.elements.inputText.value;
    if (!input) {
      this.elements.outputText.value = '';
      this.log('Nothing to decode — input is empty.', 'error');
      return;
    }
    try {
      this.elements.outputText.value = decodeURIComponent(input.replace(/\+/g, '%20'));
      this.log(`Decoded ${input.length} characters.`, 'success');
    } catch (err) {
      this.elements.outputText.value = '';
      this.log(`Invalid URL-encoded input: ${err.message}`, 'error');
    }
  }

  copyOutput() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.log('Nothing to copy — output is empty.', 'error');
      return;
    }
    navigator.clipboard.writeText(output)
      .then(() => this.log('Output copied to clipboard.', 'success'))
      .catch((err) => this.log(`Copy failed: ${err.message}`, 'error'));
  }
}

export function initTool() {
  const tool = new UrlEncodeTool({
    id: 'url-encode',
    name: 'URL Encode & Decode'
  });
  return tool.init();
}
