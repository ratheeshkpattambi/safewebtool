import { Tool } from '../common/base.js';
import { JAMSHEED_FOOTER } from '../common/author-config.js';

// JSON Formatter tool template - following YAML tool patterns
export const template = `
    <div class="tool-container">
      <style>
        .status-bar.valid {
          color: #16a34a;
        }
        .dark .status-bar.valid {
          color: #4ade80;
        }
        .status-bar.error {
          color: #dc2626;
        }
        .dark .status-bar.error {
          color: #f87171;
        }
      </style>
      
      <p class="text-slate-600 dark:text-slate-300 mb-6">Format, validate, and convert JSON data with multiple output options</p>
      
      <div class="grid md:grid-cols-2 gap-6 mb-6 min-h-[500px] h-[60vh]">
        <div class="flex flex-col bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg overflow-hidden transition-colors">
          <div class="flex justify-between items-center bg-slate-100 dark:bg-gray-700 py-3 px-4 border-b border-slate-200 dark:border-gray-600 transition-colors">
            <h3 class="m-0 text-base font-medium text-slate-700 dark:text-slate-300">JSON Input</h3>
            <div class="flex space-x-1">
              <button id="clearJsonBtn" class="p-1.5 rounded bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white transition-colors" title="Clear">
                <span class="text-sm">❌</span>
              </button>
              <button id="uploadDataBtn" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-400 transition-colors" title="Upload File">
                <span class="text-sm">📁</span>
              </button>
              <button id="loadSampleBtn" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-400 transition-colors" title="Load Sample">
                <span class="text-sm">📋</span>
              </button>
            </div>
          </div>
          <textarea id="jsonInput" class="flex-grow p-4 font-mono text-sm leading-normal resize-none border-none focus:outline-none focus:ring-0 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 transition-colors" placeholder="Paste your JSON here or upload a file..."></textarea>
          <div id="jsonStatus" class="p-2 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-gray-600 text-xs transition-colors">Ready</div>
        </div>
        
        <div class="flex flex-col bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg overflow-hidden transition-colors">
          <div class="flex justify-between items-center bg-slate-100 dark:bg-gray-700 py-3 px-4 border-b border-slate-200 dark:border-gray-600 transition-colors">
            <h3 class="m-0 text-base font-medium text-slate-700 dark:text-slate-300">Output</h3>
            <div class="flex space-x-1">
              <button id="copyOutputBtn" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-400 transition-colors" title="Copy Output">
                <span class="text-sm">📋</span>
              </button>
              <button id="downloadBtn" class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-400 transition-colors" title="Download">
                <span class="text-sm">💾</span>
              </button>
            </div>
          </div>
          <div id="jsonOutput" class="flex-grow p-4 font-mono text-sm leading-normal overflow-auto bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 whitespace-pre-wrap min-h-[300px] transition-colors"></div>
        </div>
      </div>
      
      <div id="errorContainer" class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg mb-6 overflow-hidden hidden transition-colors">
        <div class="bg-red-500 dark:bg-red-600 text-white py-2 px-4 font-medium">Error</div>
        <div id="errorContent" class="p-4 text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap"></div>
      </div>
      
      <div class="flex flex-wrap gap-4 bg-slate-100 dark:bg-gray-700 p-4 rounded-lg mb-6 items-center transition-colors">
        <div class="flex items-center">
          <input type="checkbox" id="prettyPrint" checked class="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700">
          <label for="prettyPrint" class="ml-2 text-sm text-slate-700 dark:text-slate-300">Pretty Print</label>
        </div>
        
        <div class="flex gap-2">
          <button id="validateBtn" class="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Validate</button>
          <button id="formatBtn" class="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Format / Beautify</button>
          <button id="minifyBtn" class="px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded-md hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors text-sm font-medium">Minify / Compact</button>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-700 dark:text-slate-300">Convert to:</span>
          <label class="flex items-center gap-1 cursor-pointer px-2 py-1 bg-slate-200 dark:bg-gray-600 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500 text-sm text-slate-700 dark:text-slate-300 transition-colors">
            <input type="radio" name="outputFormat" id="formatXml" class="form-radio h-3 w-3 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-slate-300 dark:border-gray-600">
            XML
          </label>
          <label class="flex items-center gap-1 cursor-pointer px-2 py-1 bg-slate-200 dark:bg-gray-600 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500 text-sm text-slate-700 dark:text-slate-300 transition-colors">
            <input type="radio" name="outputFormat" id="formatCsv" class="form-radio h-3 w-3 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-slate-300 dark:border-gray-600">
            CSV
          </label>
          <label class="flex items-center gap-1 cursor-pointer px-2 py-1 bg-slate-200 dark:bg-gray-600 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500 text-sm text-slate-700 dark:text-slate-300 transition-colors">
            <input type="radio" name="outputFormat" id="formatYaml" class="form-radio h-3 w-3 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-slate-300 dark:border-gray-600">
            YAML
          </label>
          <button id="convertBtn" class="min-h-[44px] px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium">Convert</button>
        </div>
      </div>
      
      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
      
      <input type="file" id="fileInput" accept=".json" style="display: none;">
    </div>
`;

// Sample JSON for demonstration
const SAMPLE_JSON = `{
  "name": "SafeWebTool Project",
  "version": "1.0.0",
  "description": "A comprehensive web tool collection for developers",
  "author": {
    "name": "Developer",
    "email": "dev@example.com"
  },
  "features": [
    "JSON Formatter",
    "YAML Validator", 
    "Text Processing",
    "Data Conversion"
  ],
  "config": {
    "debug": false,
    "maxFileSize": "10MB",
    "supportedFormats": ["json", "yaml", "xml", "csv"]
  },
  "metadata": {
    "created": "2023-06-15T10:30:00Z",
    "lastModified": "2023-12-01T14:22:33Z",
    "tags": ["web", "tool", "converter", "formatter"]
  }
}`;

class JsonFormatterTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'text',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: false,
      template,
      customFooter: JAMSHEED_FOOTER
    });

    this.lastValidJson = null;
    this.validationTimeout = null;
    this.lastAction = 'init';
  }

  getElementsMap() {
    return {
      jsonInput: 'jsonInput',
      jsonOutput: 'jsonOutput',
      jsonStatus: 'jsonStatus',
      errorContainer: 'errorContainer',
      errorContent: 'errorContent',
      clearJsonBtn: 'clearJsonBtn',
      uploadDataBtn: 'uploadDataBtn',
      loadSampleBtn: 'loadSampleBtn',
      copyOutputBtn: 'copyOutputBtn',
      downloadBtn: 'downloadBtn',
      fileInput: 'fileInput',
      prettyPrint: 'prettyPrint',
      validateBtn: 'validateBtn',
      formatBtn: 'formatBtn',
      minifyBtn: 'minifyBtn',
      formatXml: 'formatXml',
      formatCsv: 'formatCsv',
      formatYaml: 'formatYaml',
      convertBtn: 'convertBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    const elements = this.elements;

    // Set tab key behavior for JSON input
    if (elements.jsonInput) {
      elements.jsonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          e.target.value = e.target.value.substring(0, start) + '  ' + e.target.value.substring(end);
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }
      });

      // Auto-validate on input
      elements.jsonInput.addEventListener('input', () => {
        clearTimeout(this.validationTimeout);
        this.updateCharCount();
        
        this.validationTimeout = setTimeout(() => {
          this.validateJson();
        }, 300);
      });

      // Load sample JSON by default if input is empty
      if (!elements.jsonInput.value) {
        this.loadSample();
      }
    }

    // File upload handling
    if (elements.uploadDataBtn) {
      elements.uploadDataBtn.addEventListener('click', () => {
        elements.fileInput.click();
      });
    }

    if (elements.fileInput) {
      elements.fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            elements.jsonInput.value = e.target.result;
            this.updateCharCount();
            this.validateJson();
            this.lastAction = 'upload';
          };
          reader.onerror = () => {
            this.showError('Error reading file');
          };
          reader.readAsText(file);
        }
      });
    }

    // Button handlers
    if (elements.clearJsonBtn) {
      elements.clearJsonBtn.addEventListener('click', () => this.clearJson());
    }
    if (elements.loadSampleBtn) {
      elements.loadSampleBtn.addEventListener('click', () => this.loadSample());
    }
    if (elements.copyOutputBtn) {
      elements.copyOutputBtn.addEventListener('click', () => this.copyOutput());
    }
    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener('click', () => this.downloadOutput());
    }

    // Action buttons
    if (elements.validateBtn) {
      elements.validateBtn.addEventListener('click', () => this.validateJson());
    }
    if (elements.formatBtn) {
      elements.formatBtn.addEventListener('click', () => this.formatJson());
    }
    if (elements.minifyBtn) {
      elements.minifyBtn.addEventListener('click', () => this.minifyJson());
    }
    if (elements.convertBtn) {
      elements.convertBtn.addEventListener('click', () => this.convertJson());
    }

    this.log('JSON formatter ready', 'info');
  }

  clearJson() {
    const elements = this.elements;
    elements.jsonInput.value = '';
    elements.jsonOutput.textContent = '';
    elements.jsonStatus.textContent = '';
    elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-gray-600 text-xs transition-colors';
    elements.errorContainer.classList.remove('block');
    elements.errorContainer.classList.add('hidden');
    this.lastValidJson = null;
    this.lastAction = 'clear';
    this.updateCharCount();
  }

  loadSample() {
    this.elements.jsonInput.value = SAMPLE_JSON;
    this.updateCharCount();
    this.validateJson();
    this.lastAction = 'sample';
  }

  copyOutput() {
    const output = this.elements.jsonOutput.textContent;
    if (!output) return;
    
    navigator.clipboard.writeText(output).then(() => {
      const iconSpan = this.elements.copyOutputBtn.querySelector('.text-sm');
      const originalIcon = iconSpan.textContent;
      iconSpan.textContent = '✓';
      setTimeout(() => {
        iconSpan.textContent = originalIcon;
      }, 1000);
    });
  }

  downloadOutput() {
    const content = this.elements.jsonOutput.textContent;
    if (!content || content.includes('Error') || content.includes('Invalid')) {
      this.showError('No valid data to download');
      return;
    }

    let filename = 'data.json';
    let mimeType = 'application/json';

    // Determine file type based on last action
    if (this.lastAction === 'convert') {
      if (this.elements.formatXml.checked) {
        filename = 'data.xml';
        mimeType = 'application/xml';
      } else if (this.elements.formatCsv.checked) {
        filename = 'data.csv';
        mimeType = 'text/csv';
      } else if (this.elements.formatYaml.checked) {
        filename = 'data.yaml';
        mimeType = 'application/x-yaml';
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  updateCharCount() {
    const text = this.elements.jsonInput.value;
    this.elements.jsonStatus.textContent = `Characters: ${text.length}`;
    this.elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-gray-600 text-xs transition-colors';
  }

  showError(message) {
    const elements = this.elements;
    elements.errorContainer.classList.remove('hidden');
    elements.errorContainer.classList.add('block');
    elements.errorContent.textContent = message;
    elements.jsonStatus.textContent = 'Error';
    elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar error transition-colors';
  }

  validateJson() {
    const elements = this.elements;
    const jsonText = elements.jsonInput.value.trim();
    
    elements.errorContainer.classList.remove('block');
    elements.errorContainer.classList.add('hidden');
    
    if (!jsonText) {
      elements.jsonOutput.textContent = '';
      elements.jsonStatus.textContent = 'Empty input';
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-gray-600 text-xs transition-colors';
      return;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      this.lastValidJson = parsed;
      
      elements.jsonStatus.textContent = 'Valid JSON';
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar valid transition-colors';
      elements.jsonOutput.textContent = 'JSON is valid!';
      
      this.lastAction = 'validate';
    } catch (error) {
      elements.jsonOutput.textContent = '';
      elements.jsonStatus.textContent = 'Invalid JSON';
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar error transition-colors';
      
      this.showError(`Parse error: ${error.message}`);
      this.lastValidJson = null;
    }
  }

  formatJson() {
    const elements = this.elements;
    const jsonText = elements.jsonInput.value.trim();
    
    if (!jsonText) {
      elements.jsonOutput.textContent = 'Input is empty';
      return;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      // Use pretty print setting to determine formatting
      const space = elements.prettyPrint.checked ? '\t' : 0;
      
      elements.jsonOutput.textContent = JSON.stringify(parsed, null, space);
      elements.jsonStatus.textContent = 'JSON formatted';
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar valid transition-colors';
      elements.errorContainer.classList.remove('block');
      elements.errorContainer.classList.add('hidden');
      
      this.lastValidJson = parsed;
      this.lastAction = 'format';
    } catch (error) {
      this.showError(`Cannot format: ${error.message}`);
    }
  }

  minifyJson() {
    const elements = this.elements;
    const jsonText = elements.jsonInput.value.trim();
    
    if (!jsonText) {
      elements.jsonOutput.textContent = 'Input is empty';
      return;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      elements.jsonOutput.textContent = JSON.stringify(parsed);
      elements.jsonStatus.textContent = 'JSON minified';
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar valid transition-colors';
      elements.errorContainer.classList.remove('block');
      elements.errorContainer.classList.add('hidden');
      
      this.lastValidJson = parsed;
      this.lastAction = 'minify';
    } catch (error) {
      this.showError(`Cannot minify: ${error.message}`);
    }
  }

  convertJson() {
    const elements = this.elements;
    const jsonText = elements.jsonInput.value.trim();
    
    if (!jsonText) {
      elements.jsonOutput.textContent = 'Input is empty';
      return;
    }
    
    // Determine output format
    let format = '';
    if (elements.formatXml.checked) format = 'xml';
    else if (elements.formatCsv.checked) format = 'csv';
    else if (elements.formatYaml.checked) format = 'yaml';
    else {
      this.showError('Please select an output format');
      return;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      const prettyPrint = elements.prettyPrint.checked;
      let output = '';
      
      switch (format) {
        case 'xml':
          output = this.jsonToXml(parsed, 'root', prettyPrint);
          break;
        case 'csv':
          output = this.jsonToCsv(parsed, prettyPrint);
          break;
        case 'yaml':
          output = this.jsonToYaml(parsed, 0, prettyPrint);
          break;
      }
      
      elements.jsonOutput.textContent = output;
      elements.jsonStatus.textContent = `Converted to ${format.toUpperCase()}`;
      elements.jsonStatus.className = 'p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 text-xs status-bar valid transition-colors';
      elements.errorContainer.classList.remove('block');
      elements.errorContainer.classList.add('hidden');
      
      this.lastValidJson = parsed;
      this.lastAction = 'convert';
    } catch (error) {
      this.showError(`Cannot convert: ${error.message}`);
    }
  }

  // Conversion methods
  jsonToXml(obj, rootName = 'root', prettyPrint = true) {
    let xml = '';
    const EOL = prettyPrint ? '\n' : '';
    const indent = prettyPrint ? '  ' : ''; // Use prettyPrint setting for indentation
    
    function escapeXml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
    
    function sanitizeTagName(name) {
      // Clean tag name to be XML-compliant
      let tag = String(name).replace(/[^a-zA-Z0-9_\.\-]/g, '_');
      if (tag.match(/^[\d\.\-]/) || !tag) tag = 'item';
      return tag;
    }
    
    function toXmlRecursive(value, name, depth) {
      const currentIndent = prettyPrint ? indent.repeat(depth) : '';
      const tag = sanitizeTagName(name);
      
      if (value === null || value === undefined) {
        xml += currentIndent + `<${tag}${prettyPrint ? ' xsi:nil="true"' : ''}/>` + EOL;
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            xml += currentIndent + `<${tag}/>` + EOL;
          } else {
            xml += currentIndent + `<${tag}>` + EOL;
            value.forEach((item, index) => {
              const itemTag = tag.endsWith('s') && tag.length > 1 ? tag.slice(0, -1) : 'item';
              toXmlRecursive(item, prettyPrint ? `${itemTag}_${index + 1}` : itemTag, depth + 1);
            });
            xml += currentIndent + `</${tag}>` + EOL;
          }
        } else {
          const keys = Object.keys(value);
          if (keys.length === 0) {
            xml += currentIndent + `<${tag}/>` + EOL;
          } else {
            xml += currentIndent + `<${tag}>` + EOL;
            keys.forEach(key => {
              toXmlRecursive(value[key], key, depth + 1);
            });
            xml += currentIndent + `</${tag}>` + EOL;
          }
        }
      } else {
        const escaped = escapeXml(value);
        const typeAttr = prettyPrint ? ` type="${typeof value}"` : '';
        xml += currentIndent + `<${tag}${typeAttr}>${escaped}</${tag}>` + EOL;
      }
    }
    
    // Add XML declaration and root element
    const xmlDeclaration = prettyPrint ? '<?xml version="1.0" encoding="UTF-8"?>' + EOL : '';
    const xmlNamespace = prettyPrint ? `<${rootName} xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` : `<${rootName}>`;
    
    if (Array.isArray(obj)) {
      xml += xmlNamespace + EOL;
      obj.forEach((item, index) => {
        toXmlRecursive(item, prettyPrint ? `item_${index + 1}` : 'item', 1);
      });
      xml += `</${rootName}>` + EOL;
    } else {
      toXmlRecursive(obj, rootName, 0);
    }
    
    return xmlDeclaration + (Array.isArray(obj) ? xml : xml.trim());
  }

  jsonToCsv(obj, prettyPrint = true) {
    if (obj === null || obj === undefined) {
      return 'Input is null or undefined';
    }
    
    const array = Array.isArray(obj) ? obj : [obj];
    if (array.length === 0 || !array.every(item => typeof item === 'object' && item !== null)) {
      return 'CSV conversion works best with an array of objects';
    }
    
    // Get all unique keys
    const allKeys = new Set();
    array.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    
    // Create CSV with optional spacing for pretty print
    const separator = prettyPrint ? ', ' : ',';
    const lineEnding = prettyPrint ? '\n' : '\n';
    
    let csv = headers.map(header => `"${String(header).replace(/"/g, '""')}"`).join(separator) + lineEnding;
    
    array.forEach(row => {
      csv += headers.map(header => {
        let cell = row[header];
        if (cell === null || cell === undefined) return '""';
        if (typeof cell === 'object') cell = JSON.stringify(cell);
        return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(separator) + lineEnding;
    });
    
    return csv.trim();
  }

  jsonToYaml(obj, indentLevel = 0, prettyPrint = true) {
    const indent = prettyPrint ? '  ' : '';
    const lineBreak = prettyPrint ? '\n' : ' ';
    
    const convertValue = (value, currentIndentLevel) => {
      if (value === null) return 'null';
      
      if (typeof value === 'string') {
        // Handle multiline strings
        if (prettyPrint && value.includes('\n')) {
          return '|-\n' + value.split('\n').map(line => 
            indent.repeat(currentIndentLevel + 1) + line
          ).join('\n');
        }
        // Quote strings that need quoting
        if (value.includes(': ') || value.includes('#') || 
            value.startsWith('- ') || value.startsWith(' ') || value.endsWith(' ') ||
            ['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase()) ||
            value.match(/^\d+$|^\d*\.\d+$|^[-+]\d/)) {
          if (value.includes("'")) {
            return `"${value.replace(/"/g, '\\"')}"`;
          }
          return `'${value}'`;
        }
        return value;
      }
      
      if (typeof value === 'boolean' || typeof value === 'number') {
        return String(value);
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        
        if (!prettyPrint) {
          return '[' + value.map(item => convertValue(item, 0)).join(', ') + ']';
        }
        
        let arrYaml = '';
        value.forEach((item) => {
          arrYaml += '\n' + indent.repeat(currentIndentLevel) + '- ';
          
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            // For objects in arrays, put first key on same line as dash
            const keys = Object.keys(item);
            if (keys.length > 0) {
              const firstKey = keys[0];
              const firstValue = convertValue(item[firstKey], currentIndentLevel + 1);
              arrYaml += `${firstKey}: ${firstValue}`;
              
              // Add remaining keys with proper indentation
              for (let i = 1; i < keys.length; i++) {
                const key = keys[i];
                const val = convertValue(item[key], currentIndentLevel + 1);
                arrYaml += '\n' + indent.repeat(currentIndentLevel + 1) + `${key}: ${val}`;
              }
            }
          } else {
            // For non-objects, just add the value
            const itemYaml = convertValue(item, currentIndentLevel + 1);
            arrYaml += itemYaml;
          }
        });
        return arrYaml;
      }
      
      if (typeof value === 'object' && value !== null) {
        if (Object.keys(value).length === 0) return '{}';
        
        if (!prettyPrint) {
          return '{' + Object.keys(value).map(key => 
            `${key}: ${convertValue(value[key], 0)}`
          ).join(', ') + '}';
        }
        
        let objYaml = '';
        Object.keys(value).forEach((key) => {
          const val = convertValue(value[key], currentIndentLevel + 1);
          
          if (val.startsWith('\n')) {
            // If value starts with newline (like arrays), append directly
            objYaml += '\n' + indent.repeat(currentIndentLevel) + `${key}:${val}`;
          } else {
            // Otherwise add space after colon
            objYaml += '\n' + indent.repeat(currentIndentLevel) + `${key}: ${val}`;
          }
        });
        return objYaml;
      }
      
      return String(value);
    };
    
    const yaml = convertValue(obj, indentLevel);
    return yaml.startsWith('\n') ? yaml.substring(1) : yaml;
  }
}

// Export in the pattern expected by the existing router
export function initTool() {
  const tool = new JsonFormatterTool({
    id: 'json-formatter',
    name: 'JSON Formatter'
  });
  
  return tool.init();
} 