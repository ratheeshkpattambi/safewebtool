#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../src/common/metadata.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const toolPath = args.find(arg => !arg.startsWith('--'));

const KINDS = ['file', 'text', 'generator'];

function getFlag(name) {
  const prefix = `--${name}=`;
  const arg = args.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function usage() {
  console.error([
    'Usage: npm run scaffold:tool -- <category/toolId> --name="Tool Name" [options]',
    '',
    'Options:',
    '  --name="Tool Name"        Display name (defaults to a title-cased id)',
    '  --icon="🧰"               Emoji icon (defaults to the category icon)',
    '  --description="..."       Short description for cards/SEO',
    '  --kind=file|text|generator  UI shape (default: file)',
    '                              file      → drop zone + process button (image/video/ml)',
    '                              text      → input → output textareas (text utilities)',
    '                              generator → options → output (password/uuid/hash)',
    '  --no-metadata             Do not auto-insert the metadata entry',
    '  --no-test                 Do not generate a test stub',
    '',
    'Creates src/<category>/<toolId>.js, inserts metadata into src/common/metadata.js,',
    'and writes tests/<category>-<toolId>.spec.js.'
  ].join('\n'));
}

function titleFromId(toolId) {
  return toolId
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function classNameFromId(toolId) {
  return `${toolId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Tool`;
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

const kind = (getFlag('kind') || 'file').toLowerCase();
if (!KINDS.includes(kind)) {
  console.error(`Unknown --kind "${kind}". Use one of: ${KINDS.join(', ')}.`);
  process.exit(1);
}

const name = getFlag('name') || titleFromId(toolId);
const icon = getFlag('icon') || categories[categoryId].icon;
const description = getFlag('description') || `${name} runs locally in your browser. No uploads required.`;
const skipMetadata = args.includes('--no-metadata');
const skipTest = args.includes('--no-test');

const className = classNameFromId(toolId);

const logSection = `    <div class="log-section">
      <button id="logHeader" class="log-header" type="button">Logs</button>
      <textarea id="logContent" class="log-content" readonly></textarea>
    </div>`;

// ---------------------------------------------------------------------------
// Module templates per kind
// ---------------------------------------------------------------------------
function fileModule() {
  return `import { Tool } from '../common/base.js';

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

${logSection}
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
      // TODO: implement browser-local processing here.
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
}

function textModule() {
  return `import { Tool } from '../common/base.js';

export const template = \`
  <div class="tool-container space-y-4">
    <div>
      <label for="inputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Input</label>
      <textarea id="inputText" rows="8" class="w-full min-h-[160px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Paste your text here..."></textarea>
    </div>

    <div class="text-center">
      <button type="button" id="processBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">${name}</button>
    </div>

    <div>
      <label for="outputText" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Output</label>
      <textarea id="outputText" rows="8" class="w-full min-h-[160px] p-3 border border-slate-300 dark:border-gray-600 rounded-md font-sans text-base resize-y bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" readonly placeholder="Result will appear here..."></textarea>
    </div>

    <div class="text-center space-x-2">
      <button id="copyBtn" class="px-4 py-2 bg-slate-600 dark:bg-slate-500 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Copy</button>
      <button id="downloadBtn" class="px-4 py-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Download</button>
    </div>

${logSection}
  </div>
\`;

class ${className} extends Tool {
  constructor() {
    super({
      id: '${toolId}',
      name: '${name}',
      category: '${categoryId}',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      outputText: 'outputText',
      processBtn: 'processBtn',
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
    this.log('${name} ready', 'info');
  }

  processText() {
    const input = this.elements.inputText.value;
    // TODO: implement the transform.
    const output = input;
    this.elements.outputText.value = output;
    const hasOutput = output.length > 0;
    this.elements.copyBtn.disabled = !hasOutput;
    this.elements.downloadBtn.disabled = !hasOutput;
    this.log('Done.', 'success');
  }

  async copyOutput() {
    const text = this.elements.outputText.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.elements.copyBtn.textContent = 'Copied!';
      setTimeout(() => { this.elements.copyBtn.textContent = 'Copy'; }, 1500);
    } catch (error) {
      this.log(\`Failed to copy: \${error.message}\`, 'error');
    }
  }

  downloadOutput() {
    const text = this.elements.outputText.value;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${toolId}-output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log('Downloaded.', 'success');
  }
}

export function initTool() {
  const tool = new ${className}();
  return tool.init();
}
`;
}

function generatorModule() {
  return `import { Tool } from '../common/base.js';

export const template = \`
  <div class="tool-container space-y-4">
    <div class="space-y-3" id="options">
      <!-- TODO: add option inputs (sliders, checkboxes, selects) here. -->
    </div>

    <div class="text-center">
      <button type="button" id="generateBtn" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Generate</button>
    </div>

    <div>
      <label for="output" class="block font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Result</label>
      <textarea id="output" rows="4" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md font-mono text-base resize-y bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" readonly placeholder="Generated output will appear here..."></textarea>
    </div>

    <div class="text-center">
      <button id="copyBtn" class="px-4 py-2 bg-slate-600 dark:bg-slate-500 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>Copy</button>
    </div>

${logSection}
  </div>
\`;

class ${className} extends Tool {
  constructor() {
    super({
      id: '${toolId}',
      name: '${name}',
      category: '${categoryId}',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
  }

  getElementsMap() {
    return {
      output: 'output',
      generateBtn: 'generateBtn',
      copyBtn: 'copyBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.generateBtn?.addEventListener('click', () => this.generate());
    this.elements.copyBtn?.addEventListener('click', () => this.copyOutput());
    this.log('${name} ready', 'info');
  }

  generate() {
    // TODO: implement generation (use crypto.getRandomValues / crypto.randomUUID for privacy-safe randomness).
    const result = '';
    this.elements.output.value = result;
    this.elements.copyBtn.disabled = !result;
    this.log('Generated.', 'success');
  }

  async copyOutput() {
    const text = this.elements.output.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.elements.copyBtn.textContent = 'Copied!';
      setTimeout(() => { this.elements.copyBtn.textContent = 'Copy'; }, 1500);
    } catch (error) {
      this.log(\`Failed to copy: \${error.message}\`, 'error');
    }
  }
}

export function initTool() {
  const tool = new ${className}();
  return tool.init();
}
`;
}

const moduleBuilders = { file: fileModule, text: textModule, generator: generatorModule };

// ---------------------------------------------------------------------------
// Test stub per kind
// ---------------------------------------------------------------------------
function testStub() {
  const elementChecks = {
    file: ["    await expect(page.locator('#dropZone')).toBeVisible();", "    await expect(page.locator('#processBtn')).toBeAttached();"],
    text: ["    await expect(page.locator('#inputText')).toBeVisible();", "    await expect(page.locator('#outputText')).toBeAttached();", "    await expect(page.locator('#processBtn')).toBeVisible();"],
    generator: ["    await expect(page.locator('#generateBtn')).toBeVisible();", "    await expect(page.locator('#output')).toBeAttached();"]
  }[kind].join('\n');

  return `// @ts-check
import { test, expect } from '@playwright/test';

test.describe('${name}', () => {
  test('renders and is interactive', async ({ page }) => {
    await page.goto('/${categoryId}/${toolId}');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();
${elementChecks}
  });
});
`;
}

// ---------------------------------------------------------------------------
// Metadata insertion
// ---------------------------------------------------------------------------
function metadataEntry() {
  const safeName = name.replace(/'/g, "\\'");
  const lowerName = name.toLowerCase().replace(/'/g, "\\'");
  // Ensure the description mentions browser-local processing without repeating itself.
  const fullDescription = /browser|locally|local|no upload|device/i.test(description)
    ? description
    : `${description} All processing happens locally in your browser — no uploads.`;
  const keywords = [...new Set([
    toolId.replace(/-/g, ' '),
    lowerName,
    `${lowerName} online`,
    `free ${lowerName}`,
    `private ${categoryId} tool`,
    `browser ${categoryId} tool`
  ])];
  return `  '${toolPath}': {
    id: '${toolId}',
    category: '${categoryId}',
    name: '${name}',
    // FILL IN: one or two sentences; say what the tool does AND that it runs in the browser (no uploads).
    description: '${fullDescription.replace(/'/g, "\\'")}',
    icon: '${icon}',
    // FILL IN: at least 5 search phrases people would actually type.
    keywords: [${keywords.map(k => `'${k.replace(/'/g, "\\'")}'`).join(', ')}],
    // FILL IN: 3-5 concrete steps matching the real UI (button names, options).
    howToUse: [
      'Open the ${safeName} tool in your browser',
      'Provide your input and choose any options',
      'Click the process button to run everything locally',
      'Copy or download the result — nothing is uploaded'
    ],
    // FILL IN: one sentence on who needs this and when; mention privacy/browser-local.
    useCase: 'Use ${safeName} when you need a fast, private, browser-local ${categoryId} workflow without uploading files to a server.'
  },`;
}

function insertMetadata() {
  const metadataPath = path.join(rootDir, 'src', 'common', 'metadata.js');
  const source = readFileSync(metadataPath, 'utf8');

  if (source.includes(`'${toolPath}':`)) {
    return { inserted: false, reason: 'already present' };
  }

  const marker = 'export const tools = {';
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) {
    return { inserted: false, reason: 'could not find tools object' };
  }

  // The first line that is exactly "};" after the marker closes the tools object
  // (nested entries close with an indented "},").
  const closeIdx = source.indexOf('\n};', startIdx);
  if (closeIdx === -1) {
    return { inserted: false, reason: 'could not find end of tools object' };
  }

  // The previous entry may or may not have a trailing comma (the last one often
  // doesn't). Ensure one before appending, unless the object is empty.
  let before = source.slice(0, closeIdx).replace(/\s+$/, '');
  if (!before.endsWith(',') && !before.endsWith('{')) {
    before += ',';
  }

  const updated = `${before}\n${metadataEntry()}${source.slice(closeIdx)}`;
  writeFileSync(metadataPath, updated);
  return { inserted: true };
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------
const categoryDir = path.join(rootDir, 'src', categoryId);
const modulePath = path.join(categoryDir, `${toolId}.js`);

if (existsSync(modulePath)) {
  console.error(`Refusing to overwrite existing module: ${path.relative(rootDir, modulePath)}`);
  process.exit(1);
}

mkdirSync(categoryDir, { recursive: true });
writeFileSync(modulePath, moduleBuilders[kind]());
console.log(`Created ${path.relative(rootDir, modulePath)} (kind: ${kind})`);

// Metadata
let metadataInserted = false;
if (skipMetadata) {
  console.log('\nSkipped metadata insertion (--no-metadata). Add this entry to src/common/metadata.js under tools:\n');
  console.log(metadataEntry());
  console.log('\nWARNING: test:contract will FAIL until this metadata entry exists.');
} else {
  const result = insertMetadata();
  if (result.inserted) {
    metadataInserted = true;
    console.log('Inserted metadata entry into src/common/metadata.js');
  } else {
    console.log(`\nCould not auto-insert metadata (${result.reason}). Add this entry to src/common/metadata.js under tools:\n`);
    console.log(metadataEntry());
    console.log('\nWARNING: test:contract will FAIL until this metadata entry exists.');
  }
}

// Test stub
if (!skipTest) {
  const testPath = path.join(rootDir, 'tests', `${categoryId}-${toolId}.spec.js`);
  if (existsSync(testPath)) {
    console.log(`Test already exists, leaving it untouched: ${path.relative(rootDir, testPath)}`);
  } else {
    writeFileSync(testPath, testStub());
    console.log(`Created ${path.relative(rootDir, testPath)}`);
  }
}

// Verify the scaffold immediately so a broken state never goes unnoticed.
let contractPassed = null;
if (metadataInserted) {
  const check = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'validate-tool-contract.mjs')], {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  contractPassed = check.status === 0;
  if (!contractPassed) {
    console.error('\ntest:contract FAILED after scaffolding — this should not happen. Output:');
    console.error((check.stdout || '') + (check.stderr || ''));
  }
}

console.log('\n--- Scaffold complete ---');
console.log(`  [x] Module created:        src/${toolPath}.js (kind: ${kind})`);
console.log(`  [${metadataInserted ? 'x' : ' '}] Metadata entry:        src/common/metadata.js ('${toolPath}')`);
console.log(`  [${skipTest ? ' ' : 'x'}] Smoke test:            tests/${categoryId}-${toolId}.spec.js`);
if (contractPassed !== null) {
  console.log(`  [${contractPassed ? 'x' : ' '}] Contract check:        npm run test:contract ${contractPassed ? 'passed' : 'FAILED (see above)'}`);
}
console.log('\nNext steps:');
console.log(`  1. Implement the TODO in src/${toolPath}.js (browser-local logic only — no server calls)`);
console.log(`  2. Replace the FILL IN placeholders (description, keywords, howToUse, useCase) in src/common/metadata.js`);
console.log(`  3. Run: npm run test:tool -- ${toolPath}`);
console.log(`  4. Regenerate manifests: npm run generate:agent-manifest && npm run generate:share-image`);

if (contractPassed === false) {
  process.exit(1);
}
