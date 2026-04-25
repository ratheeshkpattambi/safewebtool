#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../src/common/metadata.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const toolPath = args.find(arg => !arg.startsWith('--'));
const nameArg = args.find(arg => arg.startsWith('--name='));
const iconArg = args.find(arg => arg.startsWith('--icon='));
const descriptionArg = args.find(arg => arg.startsWith('--description='));

function usage() {
  console.error([
    'Usage: npm run scaffold:tool -- <category/toolId> --name="Tool Name" [--icon="🧰"] [--description="Short description"]',
    '',
    'This creates src/<category>/<toolId>.js and prints the metadata entry to add to src/common/metadata.js.'
  ].join('\n'));
}

function titleFromId(toolId) {
  return toolId
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

if (!toolPath || !toolPath.includes('/')) {
  usage();
  process.exit(1);
}

const [categoryId, toolId] = toolPath.split('/');
if (!categoryId || !toolId || toolPath.split('/').length !== 2) {
  usage();
  process.exit(1);
}

if (!categories[categoryId]) {
  console.error(`Unknown category "${categoryId}". Add it to src/common/metadata.js categories first.`);
  process.exit(1);
}

const name = nameArg ? nameArg.slice('--name='.length) : titleFromId(toolId);
const icon = iconArg ? iconArg.slice('--icon='.length) : categories[categoryId].icon;
const description = descriptionArg
  ? descriptionArg.slice('--description='.length)
  : `${name} runs locally in your browser. No uploads required.`;

const categoryDir = path.join(rootDir, 'src', categoryId);
const modulePath = path.join(categoryDir, `${toolId}.js`);

if (existsSync(modulePath)) {
  console.error(`Refusing to overwrite existing module: ${path.relative(rootDir, modulePath)}`);
  process.exit(1);
}

mkdirSync(categoryDir, { recursive: true });

const className = `${toolId
  .split('-')
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join('')}Tool`;

const moduleSource = `import { Tool } from '../common/base.js';

export const template = \`
  <div class="tool-container space-y-6">
    <div id="dropZone" class="drop-zone border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
      <input type="file" id="fileInput" class="hidden">
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
\`;

class ${className} extends Tool {
  constructor() {
    super({
      id: '${toolId}',
      name: '${name}',
      category: '${categoryId}',
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
        this.log(\`Loaded file: \${file.name}\`, 'success');
      }
    });
  }

  async processFile(file) {
    this.isProcessing = true;
    this.updateProgress(10);

    try {
      this.log(\`Processing \${file.name}...\`, 'info');
      this.updateProgress(100);
      this.log('Processing complete.', 'success');
    } catch (error) {
      this.log(\`Error: \${error.message}\`, 'error');
    } finally {
      this.isProcessing = false;
      this.hideProgress();
      if (this.elements.processBtn) this.elements.processBtn.disabled = false;
    }
  }
}

export function initTool() {
  const tool = new ${className}();
  return tool.init();
}
`;

writeFileSync(modulePath, moduleSource);

console.log(`Created ${path.relative(rootDir, modulePath)}`);
console.log('\nAdd this metadata entry to src/common/metadata.js under tools:\n');
console.log(`  '${toolPath}': {
    id: '${toolId}',
    category: '${categoryId}',
    name: '${name}',
    description: '${description}',
    icon: '${icon}',
    keywords: ['${toolId}', '${name.toLowerCase()}', '${categoryId} tool'],
    howToUse: [
      'Select a file from your device',
      'Choose any options needed for the output',
      'Click "Process" and download or copy the result'
    ],
    useCase: 'Use ${name} when you need a private, browser-local ${categoryId} workflow.'
  },`);
console.log(`\nThen run: npm run test:tool -- ${toolPath}`);
