# CLAUDE.md — SafeWebTool

Privacy-first browser-local tools at safewebtool.com. **Everything runs in the user's browser. No uploads, no server, no login, no ads.** Stack: Vite + Tailwind + vanilla JS ES modules. Tests: Playwright.

## Adding a new tool — follow these 5 steps exactly

1. **Scaffold** (creates module + metadata entry + smoke test, then runs the contract check for you):
   ```bash
   npm run scaffold:tool -- <category>/<tool-id> --name="Tool Name" --icon="🧰" --kind=file
   ```
   `--kind` is one of: `file` (upload + process button), `text` (input→output textareas), `generator` (options→output). Category must be one of: `video`, `image`, `text`, `ml`, `time`.
2. **Implement** the `TODO` inside `src/<category>/<tool-id>.js`. Browser-local logic only.
3. **Fill in SEO** in `src/common/metadata.js`: replace every `FILL IN` placeholder in your tool's entry (description, keywords, howToUse, useCase). See the template below.
4. **Test**:
   ```bash
   npm run test:contract && npm run test:tool -- <category>/<tool-id>
   ```
5. **Regenerate manifests** (required after any metadata change):
   ```bash
   npm run generate:agent-manifest && npm run generate:share-image
   ```

That's it. Do not edit the router or registry — tools are discovered automatically from `src/<category>/<tool-id>.js` + the metadata entry.

## Cardinal Rules

1. **Never send user files/content to any server.** CDN-hosted WASM/ML models are OK; POSTing user data is not.
2. **No new tracking.** The existing page-view Google Analytics in `src/main.js` stays; never add analytics inside tool modules.
3. **Never edit `tool-registry.js` or `router.js` to add a tool.**
4. **Reuse `src/common/*`.** No copy-paste, no heavy libraries.
5. **Must work on mobile** (small screens).

## DO NOT

- DO NOT edit `src/common/tool-registry.js`, `src/router.js`, or `src/common/page-renderers.js` when adding a tool.
- DO NOT import one tool module from another tool module.
- DO NOT rename these DOM IDs (tests depend on them): `dropZone`, `fileInput`, `processBtn`, `progress`, `logHeader`, `logContent`, `downloadContainer`, `input-video`, `output-video`.
- DO NOT hand-edit generated files: `public/llms.txt`, `public/tools.json`, `public/**/agent.json`, `public/og/safewebtool.png`.
- DO NOT leave `FILL IN` placeholders or empty strings in metadata.
- DO NOT use `libopus` for WebM audio in FFmpeg args — use `libvorbis` (libopus crashes ffmpeg.wasm).
- DO NOT commit changes to shared files (`base.js`, `metadata.js`, `page-renderers.js`, `tool-registry.js`) without running `npm run test:contract` first.

## Copy-paste metadata template

Every tool needs an entry in the `tools` object in `src/common/metadata.js`. The key is `"<category>/<tool-id>"` and MUST match the file path, `id`, and `category` fields:

```js
'image/photo-rotator': {
  id: 'photo-rotator',                       // must equal the part after the slash
  category: 'image',                         // must equal the part before the slash
  name: 'Photo Rotator',
  description: 'Rotate JPEG, PNG, and WebP photos by 90, 180, or 270 degrees. All processing happens locally in your browser — no uploads.',
  icon: '🔄',
  keywords: ['rotate photo', 'photo rotator', 'rotate image online', 'fix sideways photo', 'free image rotation', 'private image tool'],  // at least 5
  howToUse: [
    'Upload your photo by dropping it or selecting from your device',
    'Choose the rotation angle (90, 180, or 270 degrees)',
    'Click "Rotate Photo" to process',
    'Download the rotated image'
  ],
  useCase: 'Fix sideways phone photos or prepare images for documents without uploading them to a server.',
  related: ['image/resize', 'image/crop']    // optional
},
```

## Copy-paste tool module templates

Every module in `src/<category>/<tool-id>.js` MUST export `template` (HTML string) and `initTool()`. Prefer the scaffold — it generates these for you. Minimal hand-written versions:

### kind: file (upload + process)

```js
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-6">
    <div id="dropZone" class="drop-zone border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer">
      <input type="file" id="fileInput" class="hidden">
      <button type="button" class="file-select-btn px-4 py-2 bg-blue-600 text-white rounded-md">Select File</button>
      <p class="mt-3 text-sm text-slate-500">or drag and drop a file here</p>
    </div>
    <button id="processBtn" class="w-full bg-blue-600 text-white py-2.5 px-5 rounded-md disabled:opacity-50" disabled>Process</button>
    <div id="progress" class="progress hidden"><div class="progress-fill"></div><span class="progress-text">0%</span></div>
    <div class="log-section">
      <button id="logHeader" class="log-header" type="button">Logs</button>
      <textarea id="logContent" class="log-content" readonly></textarea>
    </div>
  </div>
`;

class MyTool extends Tool {
  constructor() {
    super({ id: 'my-tool', name: 'My Tool', category: 'image',
      needsFileUpload: true, needsProcessButton: true, hasOutput: false, template });
  }
  getElementsMap() {
    return { dropZone: 'dropZone', fileInput: 'fileInput', processBtn: 'processBtn',
      progress: 'progress', logHeader: 'logHeader', logContent: 'logContent' };
  }
  async setup() {
    this.initFileUpload({ acceptTypes: 'image/*',
      onFileSelected: (file) => this.log(`Loaded ${file.name}`, 'success') });
  }
  async processFile(file) {
    this.startProcessing();
    try {
      // browser-local processing here
      this.endProcessing(true);
    } catch (err) {
      this.log(`Error: ${err.message}`, 'error');
      this.endProcessing(false);
    }
  }
}

export function initTool() { return new MyTool().init(); }
```

### kind: text (input → output)

```js
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-4">
    <textarea id="inputText" rows="8" class="w-full p-3 border rounded-md" placeholder="Paste your text here..."></textarea>
    <div class="text-center"><button id="processBtn" class="px-6 py-2 bg-blue-600 text-white rounded-md">Convert</button></div>
    <textarea id="outputText" rows="8" class="w-full p-3 border rounded-md" readonly placeholder="Result..."></textarea>
    <div class="log-section">
      <button id="logHeader" class="log-header" type="button">Logs</button>
      <textarea id="logContent" class="log-content" readonly></textarea>
    </div>
  </div>
`;

class MyTextTool extends Tool {
  constructor() {
    super({ id: 'my-text-tool', name: 'My Text Tool', category: 'text',
      needsFileUpload: false, needsProcessButton: false, hasOutput: true, template });
  }
  getElementsMap() {
    return { inputText: 'inputText', outputText: 'outputText', processBtn: 'processBtn',
      logHeader: 'logHeader', logContent: 'logContent' };
  }
  async setup() {
    this.elements.processBtn?.addEventListener('click', () => {
      this.elements.outputText.value = this.transform(this.elements.inputText.value);
      this.log('Done.', 'success');
    });
  }
  transform(input) { return input; /* your logic */ }
}

export function initTool() { return new MyTextTool().init(); }
```

### kind: generator (options → output)

```js
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-4">
    <div id="options"><!-- option inputs --></div>
    <div class="text-center"><button id="generateBtn" class="px-6 py-2 bg-blue-600 text-white rounded-md">Generate</button></div>
    <textarea id="output" rows="4" class="w-full p-3 border rounded-md font-mono" readonly></textarea>
    <div class="log-section">
      <button id="logHeader" class="log-header" type="button">Logs</button>
      <textarea id="logContent" class="log-content" readonly></textarea>
    </div>
  </div>
`;

class MyGenerator extends Tool {
  constructor() {
    super({ id: 'my-generator', name: 'My Generator', category: 'text',
      needsFileUpload: false, needsProcessButton: false, hasOutput: true, template });
  }
  getElementsMap() {
    return { output: 'output', generateBtn: 'generateBtn', logHeader: 'logHeader', logContent: 'logContent' };
  }
  async setup() {
    this.elements.generateBtn?.addEventListener('click', () => {
      this.elements.output.value = crypto.randomUUID(); // your logic; use crypto for randomness
      this.log('Generated.', 'success');
    });
  }
}

export function initTool() { return new MyGenerator().init(); }
```

## Architecture (read only if you need context)

```
src/
  common/
    metadata.js        ← source of truth: categories + tool metadata (SEO, cards, discovery)
    tool-registry.js   ← route parsing + dynamic import glob (never add tool-specific cases)
    page-renderers.js  ← category pages + tool page shell
    base.js            ← Tool base class (logs, progress, process button, upload, data-tool-ready)
    fileUpload.js      ← shared drag/drop (delegated events — survives innerHTML re-renders)
    utils.js           ← addLog, updateProgress, formatFileSize
    footer-manager.js  ← per-tool footers
  <category>/<toolId>.js  ← tool module: export template + initTool()
  video/ffmpeg-utils.js   ← FFmpeg WASM wrapper, presets, error handling
```

Routing: `tool-registry.js` uses `import.meta.glob(['../*/*.js', '!../common/*.js'])` — any `src/<category>/<toolId>.js` with a metadata entry is automatically routable at `/<category>/<toolId>`. New categories: add to `categories` in `metadata.js` first (`id`, `name`, `description`, `icon`, `keywords`).

## Test commands (in this order)

```bash
npm run test:contract                              # fast (<5s), run first, always
npm run test:tool -- <category>/<toolId>           # smoke test one tool
npm run test:tool -- <category>/<toolId> --mobile --real   # mobile + real file
npm run verify:full                                # before PR / cross-cutting changes
```

Run `verify:full` when touching routing, `base.js`, `fileUpload.js`, FFmpeg helpers, or multiple tools. Test fixtures live in `tests/fixtures/` (`sample.mp4`, `sample.webm`, `sample.mp3`, `sample.wav`, `sample.gif`); regenerate via `npm run dev & node scripts/generate-test-fixtures.mjs`.

## Video tools — extra rules

- FFmpeg WASM is slow: prefer fast presets (H.264 `ultrafast`, VP8/`libvpx` over VP9).
- WebM audio: `libvorbis`, never `libopus` (crashes `@ffmpeg/core@0.12.10`). See `getFastWebMEncodeArgs` in `src/video/ffmpeg-utils.js`.
- Check FFmpeg exit codes in `ffmpeg-utils.js` — empty output means a decode/encode error, not success.
- Every video tool page needs: log panel, progress bar, output preview, download link. Validate with `tests/video-ui-consistency.spec.js`.
- Keep `@ffmpeg/core` version in sync across `package.json`, CDN URLs in `ffmpeg-utils.js`, and `scripts/copy-ffmpeg-files.mjs`.

## Debugging quick reference

- Browser error "'text/html' is not a valid JavaScript MIME type" = broken module import (bad export / syntax error in a shared file). Run `npm run test:contract` to locate it.
- Upload button dead after re-render: duplicate `fileUpload.js` initialization — it uses delegated events; initialize once.
- Playwright mobile clicks intercepted: use `scrollIntoViewIfNeeded()` + `click({ force: true })`.

## Before every PR

- [ ] `npm run test:contract` passes
- [ ] `npm run test:tool -- <category>/<toolId>` passes for changed tools
- [ ] `npm run verify:full` passes for cross-cutting changes
- [ ] No router/registry edits, no server calls in tool logic
- [ ] Manifests regenerated if metadata changed (`npm run generate:agent-manifest && npm run generate:share-image`)
