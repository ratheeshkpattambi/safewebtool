import { Tool } from '../common/base.js';
import { JAMSHEED_FOOTER } from '../common/author-config.js';

export const template = `
  <div class="tool-container">
    <div class="mb-4">
      <label for="inputText" class="block font-bold text-xl mb-1 text-slate-700 dark:text-slate-200">Input Text</label>
      <textarea id="inputText" class="w-full min-h-[200px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y focus:outline-none focus:border-slate-500 dark:focus:border-gray-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 transition-colors" rows="10" placeholder="Paste your text here..."></textarea>
    </div>

    <div class="text-center">
      <button type="button" id="removeSpacesBtn" class="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Remove Extra Spaces</button>
    </div>

    <div class="my-4">
      <label for="outputText" class="block font-bold text-xl mb-1 text-slate-700 dark:text-slate-200">Output Text</label>
      <textarea id="outputText" class="w-full min-h-[200px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-slate-50 dark:bg-gray-800 focus:outline-none focus:border-slate-500 dark:focus:border-gray-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-gray-400 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 transition-colors" rows="10" readonly placeholder="Cleaned text will appear here..."></textarea>
    </div>

    <div class="text-center mt-4 space-x-2">
      <button id="copyToClipboardBtn" class="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Copy To Clipboard</button>
      <button id="downloadBtn" class="min-h-[44px] px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Download Text</button>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class RemoveExtraSpacesTool extends Tool {
  constructor() {
    super({
      id: 'remove-extra-spaces',
      name: 'Remove Extra Spaces',
      category: 'text',
      needsFileUpload: false,
      hasOutput: true,
      needsProcessButton: false,
      template,
      customFooter: JAMSHEED_FOOTER
    });
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      outputText: 'outputText',
      removeSpacesBtn: 'removeSpacesBtn',
      copyToClipboardBtn: 'copyToClipboardBtn',
      downloadBtn: 'downloadBtn'
    };
  }

  async setup() {
    if (this.elements.removeSpacesBtn) {
      this.elements.removeSpacesBtn.addEventListener('click', () => this.processText());
    }

    if (this.elements.copyToClipboardBtn) {
      this.elements.copyToClipboardBtn.addEventListener('click', () => this.copyOutput());
    }
    if (this.elements.downloadBtn) {
      this.elements.downloadBtn.addEventListener('click', () => this.downloadOutput());
    }
    this.log('Remove Extra Spaces tool ready', 'info');
  }

  processText() {
    const text = this.elements.inputText.value;
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/\s+/g, ' ');
    this.elements.outputText.value = cleanedText;
    this.elements.copyToClipboardBtn.disabled = !cleanedText;
    this.elements.downloadBtn.disabled = !cleanedText;
    if (cleanedText !== text) {
        this.log('Extra spaces removed.', 'success');
    } else {
        this.log('No extra spaces found to remove.', 'info');
    }
  }

  async copyOutput() {
    if (this.elements.outputText.value) {
      try {
        await navigator.clipboard.writeText(this.elements.outputText.value);
        this.elements.copyToClipboardBtn.textContent = 'Copied!';
        this.log('Output copied to clipboard.', 'success');
      } catch (err) {
        this.log('Failed to copy text: ' + err, 'error');
        this.elements.copyToClipboardBtn.textContent = 'Error!';
      }
    } else {
      this.log('Nothing to copy.', 'info');
    }
    
    setTimeout(() => {
      this.elements.copyToClipboardBtn.textContent = 'Copy To Clipboard';
    }, 1500);
  }

  downloadOutput() {
    const text = this.elements.outputText.value;
    if (!text.trim()) {
      this.log('Nothing to download.', 'info');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log('Text downloaded successfully.', 'success');
  }
}

export function initTool() {
  const tool = new RemoveExtraSpacesTool();
  return tool.init();
} 