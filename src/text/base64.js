/**
 * Base64 Encode & Decode tool
 * All processing happens locally in the browser using TextEncoder/TextDecoder
 * for full Unicode support. No data ever leaves the device.
 */
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-slate-600 dark:text-slate-300">Encode text to Base64 or decode Base64 back to text. Full Unicode support. Everything runs in your browser.</p>
    <div>
      <label for="inputText" class="block mb-1 font-medium text-slate-700 dark:text-slate-300">Input</label>
      <textarea id="inputText" rows="8" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors" placeholder="Enter text to encode, or Base64 to decode..."></textarea>
    </div>
    <div class="flex gap-3 justify-center flex-wrap">
      <button id="encodeBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Encode to Base64</button>
      <button id="decodeBtn" class="px-6 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-sm font-medium">Decode from Base64</button>
      <button id="copyBtn" class="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium">Copy Output</button>
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

class Base64Tool extends Tool {
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
    this.log('Base64 tool ready. Everything stays in your browser.', 'info');
  }

  /**
   * Encode a Unicode string to Base64 using TextEncoder (UTF-8 safe).
   * @param {string} str
   * @returns {string} Base64-encoded string
   */
  encodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  /**
   * Decode a Base64 string back to Unicode text using TextDecoder (UTF-8 safe).
   * @param {string} b64
   * @returns {string} Decoded text
   */
  decodeUnicode(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  encode() {
    const input = this.elements.inputText.value;
    if (!input) {
      this.elements.outputText.value = '';
      this.log('Nothing to encode — input is empty.', 'error');
      return;
    }
    try {
      this.elements.outputText.value = this.encodeUnicode(input);
      this.log(`Encoded ${input.length} characters to Base64 (${this.elements.outputText.value.length} characters).`, 'success');
    } catch (err) {
      this.elements.outputText.value = '';
      this.log(`Encoding failed: ${err.message}`, 'error');
    }
  }

  decode() {
    const input = this.elements.inputText.value.trim();
    if (!input) {
      this.elements.outputText.value = '';
      this.log('Nothing to decode — input is empty.', 'error');
      return;
    }
    try {
      this.elements.outputText.value = this.decodeUnicode(input.replace(/\s+/g, ''));
      this.log(`Decoded ${input.length} Base64 characters to text.`, 'success');
    } catch (err) {
      this.elements.outputText.value = '';
      this.log(`Invalid Base64 input: ${err.message}`, 'error');
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
  const tool = new Base64Tool({
    id: 'base64',
    name: 'Base64 Encode & Decode'
  });
  return tool.init();
}
