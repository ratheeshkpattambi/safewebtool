# AGENTS.md

This file is for coding agents (Codex, Claude, etc.) working in this repo.

Goal: ship changes fast without breaking user flows, especially browser-local media tools.

Start here for scalable tool work:

- `documentation/tool-architecture-playbook.md`
  - Durable workflow for adding/fixing tools, targeted tests, Netlify verification, and scale rules.
- `npm run test:contract`
  - Fast metadata/module contract check. Run before browser tests.
- `npm run test:tool -- <category/toolId>`
  - Fast targeted desktop smoke for one tool.
- `npm run test:tool -- <category/toolId> --mobile --real`
  - Targeted mobile + real-file checks for tools that process files.

## Repo Spirit (Do Not Regress)

- Privacy-first: processing happens in the browser, not on a server.
- Simple UX: upload/select file, see progress/logs, get output/download.
- Small changes should be low-risk.
- New tools should be addable with minimal router changes (ideally none).
- Adding tools to existing categories, and to categories declared in metadata, should not require router or registry edits.

## Architecture Map (Current)

- `src/common/metadata.js`
  - Source of truth for categories + tool metadata.
  - Tool cards, SEO, category pages, and tool page text depend on this.
- `src/common/tool-registry.js`
  - Route parsing (`home/category/tool/not-found/sitemap`)
  - Category tool listing
  - Dynamic one-level module loading via `import.meta.glob('../*/*.js')`
  - Adding a tool file + metadata entry should work without router edits.
- `src/common/page-renderers.js`
  - Renders category pages + tool shell (`.tool-page`, `.tool-content-area`)
  - FFmpeg loading element helper
- `src/router.js`
  - Route orchestration only (shell render + dynamic tool init)
  - Has navigation-token guard to avoid stale async init races
- `src/common/base.js`
  - Base `Tool` class
  - Common setup, logs/progress helpers, process button wiring
  - Marks `.tool-container[data-tool-ready="true"]` after setup for test stability
- `src/common/fileUpload.js`
  - Shared drag/drop + file input behavior
  - Uses delegated events (important when tool HTML re-renders)
- `src/video/ffmpeg-utils.js`
  - FFmpeg WASM wrapper, log/progress handling, command execution, error normalization
  - Shared encode presets for faster/more reliable browser transcoding

## Fast Path: Add a New Tool

Fastest starter:

```bash
npm run scaffold:tool -- image/my-tool --name="My Tool" --icon="🧰"
```

Then add the printed metadata entry to `src/common/metadata.js` and run:

```bash
npm run test:tool -- image/my-tool
```

### 1) Add metadata (required)

Add an entry in `src/common/metadata.js` under `tools`:

- Key format: `"<category>/<toolId>"`
- Include at least:
  - `id`
  - `category`
  - `name`
  - `description`
  - `icon`
  - `keywords`
  - `howToUse`
  - `useCase`

Example key:

- `video/my-tool`

### 2) Add the tool module file (required)

Create:

- `src/<category>/<toolId>.js`

Tool module contract:

- Export `template` (HTML string) if the tool renders UI
- Export `initTool()` function

The router loads modules dynamically. No `router.js` edit should be needed for normal tools.

### 3) Reuse the base tool pattern (recommended)

Prefer extending `Tool` from `src/common/base.js` for consistent behavior:

- shared logs
- shared progress display
- process button enable/disable flow
- file upload wiring
- test-ready marker (`data-tool-ready`)

### 4) Keep IDs consistent (important for UX + tests)

When a tool is process-based, keep these IDs if possible:

- `dropZone`
- `fileInput`
- `processBtn`
- `progress` (or `videoProgress` where already established)
- `logHeader`
- `logContent`

For video tools that preview input/output, typically:

- `input-video`
- `output-video`
- `downloadContainer`

Tests rely on these conventions. Changing them increases maintenance cost.

## Fast Path: Fix an Existing Tool

### Use this order

1. Reproduce with a real input file
2. Check logs shown in UI (`#logContent`)
3. Fix root cause (not only downstream empty-output errors)
4. Add/update a focused Playwright test
5. Run a targeted suite
6. Run full suite only after focused tests pass

### Common failure patterns in this repo

- FFmpeg failed but UI looked successful
  - Check `src/video/ffmpeg-utils.js` exit code handling
- Empty output file
  - Usually a downstream symptom of a decode/encode failure
- Upload button works once but breaks after UI re-render
  - Check `src/common/fileUpload.js` delegated listeners
- Mobile test click interception
  - Use `scrollIntoViewIfNeeded()` and fallback `click({ force: true })` in tests

## Video Tools: Consistency Requirements

Every video tool page should provide a consistent user experience:

- log panel visible/toggleable (`#logHeader`, `#logContent`)
- progress UI present (`#progress` or `#videoProgress`)
- clear success/error logs
- output preview and download link when applicable

If adding/changing a video tool, validate against:

- `tests/video-ui-consistency.spec.js`
- `tests/video-ops-downloaded.spec.js` (for core upload/process/output behavior)

## FFmpeg WASM Guidance (Practical)

- FFmpeg in browser (`ffmpeg.wasm`) is slower than desktop FFmpeg.
- Prefer faster defaults for browser UX:
  - H.264: ultrafast-ish presets / lower overhead settings
  - WebM: VP8 (`libvpx`) over VP9 (`libvpx-vp9`) for speed/reliability
- Normalize/propagate FFmpeg failures early.
- Decode issues like AV1 `Missing Sequence Header` usually mean malformed/incomplete streams or unsupported variants, not a UI bug.

## Test Strategy (Fast to Full)

### Quick sanity (very fast)

- Start app:
  - `npm run dev`
- Open target page and test manually with a small file

### Focused browser tests (default for most changes)

- One tool smoke:
  - `npm run test:tool -- <category/toolId>`
- One tool plus mobile:
  - `npm run test:tool -- <category/toolId> --mobile`
- One real file tool:
  - `npm run test:tool -- <category/toolId> --mobile --real`
- Single spec / target tool:
  - `npx playwright test tests/<spec>.js --project=chromium-desktop --reporter=line`
- Mobile-only for interaction/layout regressions:
  - `npx playwright test tests/<spec>.js --project=chromium-mobile --reporter=line --workers=1`

### Recommended for video changes

- UI consistency:
  - `npx playwright test tests/video-ui-consistency.spec.js --reporter=line`
- Real file smoke (Bunny sample):
  - `npx playwright test tests/video-ops-downloaded.spec.js --project=chromium-desktop --reporter=line --workers=1`
  - `npx playwright test tests/video-ops-downloaded.spec.js --project=chromium-mobile --reporter=line --workers=1`
- Re-encode focused:
  - `npx playwright test tests/reencode-*.spec.js --reporter=line`

### Occasional full regression (before PR / after cross-cutting refactors)

- `npm run test:chrome -- --reporter=line`
- `npm run verify:full`

Run this when:

- touching routing
- changing shared base/upload utilities
- changing FFmpeg helpers used by multiple tools
- adding multiple tools/pages

## Test Inputs (Practical)

Use small real files for fast feedback (especially in browser FFmpeg tests).

- Bunny sample path used by tests:
  - `/tmp/bunny-small.mp4`
- Another sample path used in some tests:
  - `/tmp/sample-test.mp4`

If missing, download a small MP4 sample before running downloaded-file specs.

## “Add Tool Without Breaking System” Checklist

- Metadata entry added in `src/common/metadata.js`
- Module exports `initTool()` (and `template` if UI tool)
- `npm run test:contract` passes
- Uses base `Tool` class or matches shared UI/log/progress conventions
- No router changes unless route semantics changed
- Tool page renders under `.tool-page`
- `data-tool-ready="true"` appears after setup (if using base tool)
- `npm run test:tool -- <category/toolId>` passes
- Real-file tools: `npm run test:tool -- <category/toolId> --mobile --real` passes
- `npm run test:chrome -- --reporter=line` run for cross-cutting changes

## PR Hygiene (Efficient)

Before PR:

- Keep commit message specific to architectural/user impact
- Include what was tested (desktop/mobile, focused/full)
- Call out known FFmpeg WASM limitations separately from app bugs

PR description should include:

- user-facing behavior change
- architecture change (if any)
- test coverage added/updated
- exact validation command(s)

## When in Doubt

Prefer changes that:

- preserve DOM IDs and shared conventions
- centralize logic in `src/common/*`
- add small focused tests for the bug you fixed
- avoid router edits unless absolutely necessary

This repo is easiest to maintain when tool modules stay thin and shared behavior lives in common utilities.
