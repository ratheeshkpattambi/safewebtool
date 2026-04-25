import { Tool } from '../../src/common/base.js';

export const template = `
  <div class="tool-container space-y-6">
    <div id="dropZone" class="drop-zone border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
      <input type="file" id="fileInput" class="hidden" accept="*/*">
      <button type="button" class="file-select-btn px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Select File</button>
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">or drag and drop a file here</p>
    </div>

    <button id="processBtn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Process</button>

    <div id="progress" class="progress hidden">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>

    <div class="log-section">
      <button id="logHeader" class="log-header" type="button">Logs</button>
      <textarea id="logContent" class="log-content" readonly></textarea>
    </div>
  </div>
`;

class ExampleTool extends Tool {
  constructor() {
    super({
      id: 'example-tool',
      name: 'Example Tool',
      category: 'image',
      needsFileUpload: true,
      needsProcessButton: true,
      hasOutput: false,
      template
    });
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      processBtn: 'processBtn',
      progress: 'progress',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: '*/*',
      onFileSelected: (file) => {
        this.log(`Loaded file: ${file.name}`, 'success');
      }
    });
  }

  async processFile(file) {
    this.isProcessing = true;
    this.updateProgress(10);

    try {
      this.log(`Processing ${file.name}...`, 'info');
      this.updateProgress(100);
      this.log('Processing complete.', 'success');
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
    } finally {
      this.isProcessing = false;
      this.hideProgress();
      if (this.elements.processBtn) this.elements.processBtn.disabled = false;
    }
  }
}

export function initTool() {
  const tool = new ExampleTool();
  return tool.init();
}
