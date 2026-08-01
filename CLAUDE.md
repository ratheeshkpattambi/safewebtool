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
6. **Every canonical URL must return 200, never a redirect.** See [URLs & SEO](#urls--seo-read-before-touching-anything-that-emits-a-url).

## URLs & SEO — read before touching anything that emits a URL

A canonical pointing at a redirect kept 23 of 30 tool pages out of Google's index for
months, while the site looked perfectly healthy. Full postmortem and verification
commands: [documentation/seo-and-urls.md](documentation/seo-and-urls.md).

- Canonical URLs are **short and extensionless** — `/video/reencode`, never `/video/reencode/`.
- `getCanonicalPathForToolPath()` in `metadata.js` is the **only** source of tool URLs. Never re-derive canonical paths or alias maps in a script.
- The prerenderer writes flat `dist/<route>.html`. Netlify serves those at the bare path with a 200; `<route>/index.html` would only serve at `/route/` and make `/route` a 301.
- The sitemap lists canonical URLs **only, once each** — never both an alias and the tool path it aliases.
- A missing prerendered file does **not** 404. The SPA rewrite silently serves the homepage shell, so assert on canonical/title, not just on a 200.

Adding a tool needs none of this — it all derives from the metadata entry.

## DO NOT

- DO NOT edit `src/common/tool-registry.js`, `src/router.js`, or `src/common/page-renderers.js` when adding a tool.
- DO NOT import one tool module from another tool module.
- DO NOT rename these DOM IDs (tests depend on them): `dropZone`, `fileInput`, `processBtn`, `progress`, `logHeader`, `logContent`, `downloadContainer`, `input-video`, `output-video`.
- DO NOT hand-edit generated files: `public/llms.txt`, `public/tools.json`, `public/**/agent.json`, `public/og/safewebtool.png`, `public/sitemap.xml`.
- DO NOT emit a canonical URL, `og:url`, JSON-LD `url`, or sitemap `<loc>` that redirects — and DO NOT add a trailing slash to a tool or category URL.
- DO NOT write a second copy of URL/sitemap logic in a script; import from `src/common/`. Two copies drifted once and broke indexing.
- DO NOT invent structured data to silence a Search Console warning (e.g. a `VideoObject` thumbnail for an empty `<video>` placeholder) — describing content that does not exist risks a manual action.
- DO NOT leave `FILL IN` placeholders or empty strings in metadata.
- DO NOT use `libopus` for WebM audio in FFmpeg args — use `libvorbis` (libopus crashes ffmpeg.wasm).
- DO NOT switch FFmpeg back to the multi-threaded core (`@ffmpeg/core-mt`) — it deadlocks mid-encode.
- DO NOT write a test that asserts only "an element exists" for a tool whose UI renders placeholder rows before processing; assert on real output, or the test passes while the tool is broken.
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

## Test commands — run in this order

```bash
npm run test:contract                              # fast (<5s), run first, always
npm run test:tool -- <category>/<toolId>           # smoke test one tool
npm run test:tool -- <category>/<toolId> --mobile --real   # mobile + real file
npm run test:ffmpeg                                # FFmpeg CDN load + MT detection (add after ffmpeg-utils.js changes)
npm run test:video-fast                            # all 8 video tools, actual FFmpeg processing (add after FFmpeg/infra changes)
npm run verify:full                                # before PR / cross-cutting changes
```

### When to run which test

| Changed file(s) | Run |
|---|---|
| Any single tool | `test:contract` then `test:tool -- <id>` |
| `ffmpeg-utils.js`, CDN URLs, WASM version | `test:contract` then `test:ffmpeg` then `test:video-fast` |
| `base.js`, `fileUpload.js`, routing, or 3+ tools | `verify:full` |
| Before any PR | `verify:full` |

### Test fixtures

Live in `tests/fixtures/` — `sample.mp4` (11KB), `sample.webm` (4KB), `sample.mp3` (16KB), `sample.wav` (172KB), `sample.gif` (19KB). The tiny MP4 and WebM are used by the fast video processing tests to keep FFmpeg tests under 3 minutes total. Regenerate all fixtures via `npm run dev & node scripts/generate-test-fixtures.mjs`.

### Adding a new video tool

After implementation run `npm run test:video-fast` to verify it processes the tiny fixture correctly. If the tool needs a special input format, add a one-off fixture to `tests/fixtures/` and extend `tests/video-processing.spec.js`.

## Video tools — extra rules

- **Single-threaded core only.** `@ffmpeg/core-mt` deadlocks mid-encode (hangs forever, no error). It broke video/gif and any real-size file while the 11KB fixture still passed. 0.12.10 is the latest MT build and is still affected; self-hosting the wasm does not help — the deadlock is in the compiled code, not the delivery.
- **Never probe with a bare `ffmpeg -i <file>`** — no output file means exit code 1 by design, and `executeFFmpeg` throws on non-zero. Use `-vframes 1 -f null -` (exits 0, same metadata).
- **FFmpeg loads lazily inside `processFile()`.** Selecting a file downloads nothing — a test must click Process or it waits forever.
- `tests/video-processing.spec.js` is `serial`: the first failure blocks every later test. Read "did not run" in the output, not just the failure count.
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
