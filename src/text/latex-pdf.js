import { Tool } from '../common/base.js';

const DEFAULT_TEMPLATE = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Hello, World! This document was compiled entirely in your browser using WebAssembly — no uploads, no server.

\\section{Mathematics}
Einstein's famous equation:
\\begin{equation}
  E = mc^2
\\end{equation}

The Gaussian integral:
\\begin{equation}
  \\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}
\\end{equation}

\\section{Lists}
\\begin{itemize}
  \\item Privacy-first: nothing leaves your browser
  \\item Powered by PdfTeX via WebAssembly
  \\item Packages fetched on demand from CTAN
\\end{itemize}

\\end{document}
`;

const ENGINE_SCRIPT_URL = '/swiftlatex/PdfTeXEngine.js';
const BUNDLE_URL = '/swiftlatex/format-bundle.json';
const IDB_DB = 'swiftlatex-cache';
const IDB_STORE = 'formats';
const IDB_KEY = 'swiftlatexpdftex.fmt';

export const template = `
  <div class="tool-container space-y-4">
    <div class="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200">
      Compiles LaTeX entirely in your browser — your document is never uploaded anywhere.
      First compile downloads LaTeX packages (~3MB, cached after). Subsequent compiles are 1–5s.
    </div>

    <div>
      <div class="flex justify-between items-center mb-1">
        <label class="font-bold text-lg text-slate-700 dark:text-slate-200">LaTeX Source</label>
        <button id="loadTemplateBtn" type="button" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">Load template</button>
      </div>
      <textarea id="latexInput" rows="18" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md font-mono text-sm resize-y bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500" spellcheck="false" placeholder="\\documentclass{article}..."></textarea>
    </div>

    <div class="text-center">
      <button type="button" id="processBtn" class="px-8 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">Compile to PDF</button>
    </div>

    <div id="progress" class="progress hidden">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>

    <div id="pdfContainer" style="display:none" class="border border-slate-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <div class="bg-slate-50 dark:bg-gray-800 p-2 flex items-center justify-between">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">PDF Preview</span>
        <div id="downloadContainer"></div>
      </div>
      <iframe id="pdfPreview" class="w-full" style="height:600px; border:none;"></iframe>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Compilation Log</span>
      <span class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Compilation output will appear here..."></textarea>
  </div>
`;

// ---------- IndexedDB helpers ----------

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------- Tool class ----------

class LatexPdfTool extends Tool {
  constructor() {
    super({
      id: 'latex-pdf',
      name: 'LaTeX to PDF',
      category: 'text',
      needsFileUpload: false,
      needsProcessButton: false,
      hasOutput: true,
      template
    });
    this.engine = null;
    this.latexWorker = null;
    this.engineReady = false;
  }

  getElementsMap() {
    return {
      latexInput: 'latexInput',
      processBtn: 'processBtn',
      pdfContainer: 'pdfContainer',
      pdfPreview: 'pdfPreview',
      downloadContainer: 'downloadContainer',
      loadTemplateBtn: 'loadTemplateBtn',
      progress: 'progress',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.latexInput.value = DEFAULT_TEMPLATE;
    this.elements.processBtn.addEventListener('click', () => this.compile());
    this.elements.loadTemplateBtn.addEventListener('click', () => {
      this.elements.latexInput.value = DEFAULT_TEMPLATE;
    });
    this.log('Paste your LaTeX source and click "Compile to PDF". First compile downloads packages (~3MB, cached after).', 'info');
  }

  // ---------- Engine loading ----------

  async loadEngineScript() {
    if (typeof PdfTeXEngine !== 'undefined') return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = ENGINE_SCRIPT_URL;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load LaTeX engine'));
      document.head.appendChild(s);
    });
  }

  async loadEngine() {
    if (this.engineReady) return;

    // Step 1: Load WASM engine
    this.log('Loading LaTeX engine...', 'info');
    this.updateProgress(5);
    await this.loadEngineScript();
    this.engine = new PdfTeXEngine();
    await this.engine.loadEngine();
    this.latexWorker = this.engine.latexWorker;

    // Step 2: Download file bundle (pdflatex.ini, latex.ltx, fonts, packages)
    this.log('Loading LaTeX package files (~3MB, cached after first run)...', 'info');
    this.updateProgress(15);
    const bundleResp = await fetch(BUNDLE_URL);
    if (!bundleResp.ok) throw new Error('Failed to load LaTeX package bundle');
    const bundle = await bundleResp.json();

    // Write all bundle files to worker WORKROOT (fire-and-forget — worker is FIFO)
    for (const [name, b64] of Object.entries(bundle)) {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      this.latexWorker.postMessage({ cmd: 'writefile', url: name, src: bytes });
    }
    this.updateProgress(35);

    // Step 3: Load or generate the format file (swiftlatexpdftex.fmt)
    let fmtBytes = await idbGet(IDB_KEY).catch(() => null);
    if (fmtBytes) {
      this.log('Using cached LaTeX format.', 'info');
    } else {
      this.log('Generating LaTeX format (one-time, ~15s)...', 'info');
      this.updateProgress(45);
      fmtBytes = await this._compileFormatDirect();
      await idbPut(IDB_KEY, fmtBytes).catch(() => {}); // save to IndexedDB
    }

    // Write format as swiftlatexpdftex.fmt so compileLaTeX can find it
    this.latexWorker.postMessage({ cmd: 'writefile', url: IDB_KEY, src: fmtBytes });
    this.updateProgress(60);

    this.engineReady = true;
    this.log('LaTeX engine ready.', 'success');
    this.updateProgress(70);
  }

  // ---------- Worker communication ----------

  // Sends {cmd:'compileformat'} to the worker.
  // The worker runs pdfTeX INITEX with pdflatex.ini (pre-uploaded to WORKROOT).
  // Response: {cmd:'compile', result:'ok', pdf: <format bytes>}
  // The format bytes are written back as swiftlatexpdftex.fmt for compileLaTeX to find.
  _compileFormatDirect() {
    return new Promise((resolve, reject) => {
      const worker = this.latexWorker;
      if (!worker) { reject(new Error('Worker not ready')); return; }
      const onmsg = (ev) => {
        const data = ev.data;
        if (data.cmd !== 'compile') return;
        worker.removeEventListener('message', onmsg);
        if (data.result === 'ok' && data.pdf) {
          resolve(new Uint8Array(data.pdf));
        } else {
          reject(new Error('Format compilation failed: ' + (data.log || 'unknown')));
        }
      };
      worker.addEventListener('message', onmsg);
      worker.postMessage({ cmd: 'compileformat' });
    });
  }

  // Sends the .tex source + compilelatex command. The worker is FIFO so
  // any preceding writefile commands complete before compilation starts.
  // Bypasses engine.compileLaTeX() generator which loses 'this' in Safari.
  _compileDirect(source) {
    return new Promise((resolve, reject) => {
      const worker = this.latexWorker;
      if (!worker) {
        reject(new Error('LaTeX worker not initialized — try reloading the page'));
        return;
      }
      const onmsg = (ev) => {
        const data = ev.data;
        if (data.cmd !== 'compile') return;
        worker.removeEventListener('message', onmsg);
        resolve({
          pdf: data.result === 'ok' ? new Uint8Array(data.pdf) : null,
          log: data.log,
          status: data.status
        });
      };
      worker.addEventListener('message', onmsg);
      // writefile + setmainfile go into the FIFO queue before compilelatex
      worker.postMessage({ cmd: 'writefile', url: 'main.tex', src: source });
      worker.postMessage({ cmd: 'setmainfile', url: 'main.tex' });
      worker.postMessage({ cmd: 'compilelatex' });
    });
  }

  // ---------- Compile ----------

  async compile() {
    const source = this.elements.latexInput.value.trim();
    if (!source) {
      this.log('Please enter LaTeX source.', 'error');
      return;
    }

    this.startProcessing();
    this.elements.pdfContainer.style.display = 'none';

    try {
      await this.loadEngine();
      this.log('Compiling...', 'info');
      this.updateProgress(80);

      const result = await this._compileDirect(source);

      if (result.log) {
        this.log(result.log, result.status === 'error' ? 'error' : 'info');
      }

      if (!result.pdf || result.pdf.length === 0) {
        throw new Error('Compilation failed — check the log for errors');
      }

      this.updateProgress(95);

      const blob = new Blob([result.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.elements.pdfPreview.src = url;
      this.elements.pdfContainer.style.display = 'block';

      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.className = 'px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors';
      a.textContent = 'Download PDF';
      this.elements.downloadContainer.innerHTML = '';
      this.elements.downloadContainer.appendChild(a);

      this.updateProgress(100);
      this.log('Compilation successful!', 'success');
      // Do NOT flush cache — we need swiftlatexpdftex.fmt + package files for next compile
      this.endProcessing(true);
    } catch (err) {
      this.log(`Error: ${err.message}`, 'error');
      this.endProcessing(false);
    }
  }
}

export function initTool() {
  const tool = new LatexPdfTool();
  return tool.init();
}
