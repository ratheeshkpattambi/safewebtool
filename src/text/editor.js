/**
 * Text Editor Tool
 * The plainest text editor - just type and download
 */
import { Tool } from '../common/base.js';

// Text editor tool template
export const template = `
    <div class="tool-container">
      <textarea id="editor" class="w-full min-h-[300px] my-4 p-4 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base leading-relaxed resize-y focus:outline-none focus:border-slate-500 dark:focus:border-gray-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 transition-colors" placeholder="Start typing..."></textarea>

      <div class="sticky bottom-0 z-10 flex justify-between p-4 bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md my-4 text-sm text-slate-600 dark:text-slate-300 transition-colors">
        <div class="flex items-center gap-2 py-1 px-3 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-colors">
          Words: <span id="wordCount" class="text-slate-800 dark:text-slate-100 font-semibold text-lg">0</span>
        </div>
        <div class="flex items-center gap-2 py-1 px-3 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-colors">
          Characters: <span id="charCount" class="text-slate-800 dark:text-slate-100 font-semibold text-lg">0</span>
        </div>
      </div>

      <div id="downloadContainer"></div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class TextEditorTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'text',
      needsFileUpload: false,
      hasOutput: true,
      needsProcessButton: false,
      template // Use the local template
    });
    
    this.wordCount = 0;
    this.charCount = 0;
  }

  getElementsMap() {
    return {
      editor: 'editor',
      downloadContainer: 'downloadContainer',
      wordCount: 'wordCount',
      charCount: 'charCount',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    // Set up editor input handling
    if (this.elements.editor) {
      this.elements.editor.addEventListener('input', () => this.updateCounts());
      
      // Add download button after editor
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4';
      downloadBtn.textContent = 'Download Text';
      downloadBtn.addEventListener('click', () => this.downloadText());
      this.elements.downloadContainer.appendChild(downloadBtn);
    }

    this.log('Text editor ready', 'info');
  }

  updateCounts() {
    if (!this.elements.editor) return;
    
    const text = this.elements.editor.value;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.charCount = text.length;
    
    if (this.elements.wordCount) {
      this.elements.wordCount.textContent = this.wordCount;
    }
    if (this.elements.charCount) {
      this.elements.charCount.textContent = this.charCount;
    }
  }

  downloadText() {
    if (!this.elements.editor) return;

    const text = this.elements.editor.value;
    if (!text.trim()) {
      this.log('Please enter some text before downloading', 'error');
      return;
    }

    // Create and trigger download directly
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-editor-content.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.log('Text downloaded!', 'success');
  }
}

export function initTool() {
  const tool = new TextEditorTool({
    id: 'editor',
    name: 'Text Editor'
  });
  
  return tool.init();
} 