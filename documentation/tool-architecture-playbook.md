# SafeWebTool Tool Architecture Playbook

This repo should scale to hundreds of browser-local tools by keeping each tool thin and keeping shared behavior in `src/common/*`.

## Core Boundary

Each tool owns only:

- its metadata entry in `src/common/metadata.js`
- its module at `src/<category>/<toolId>.js`
- focused tests only when the generic contract is not enough

Shared code owns:

- route parsing and dynamic imports: `src/common/tool-registry.js`
- shell rendering and SEO page text: `src/common/page-renderers.js`
- base setup, logs, progress, process button flow: `src/common/base.js`
- drag/drop and file input behavior: `src/common/fileUpload.js`
- FFmpeg loading/execution/presets: `src/video/ffmpeg-utils.js`

The router should stay orchestration-only. Normal tool additions should not touch `src/router.js`.

## Add A Tool

1. Scaffold a starter module:

```bash
npm run scaffold:tool -- image/example-tool --name="Example Tool" --icon="🧰"
```

2. Add the printed metadata entry to `src/common/metadata.js`.

3. Replace the scaffolded `processFile()` logic with the real browser-local implementation.

4. Run the fast target:

```bash
npm run test:tool -- image/example-tool
```

5. If the tool processes real files, run the real target:

```bash
npm run test:tool -- image/example-tool --mobile --real
```

## Contract Rules

`npm run test:contract` enforces the cheap invariants:

- every tool metadata key is exactly `category/toolId`
- every metadata entry has required SEO/card fields
- `tool.id` and `tool.category` match the key
- every metadata entry has `src/<category>/<toolId>.js`
- every tool module exports `initTool()`
- tool-like modules in category folders have metadata

If a file in a category folder is a helper, add it to the ignore list in `scripts/validate-tool-contract.mjs`.

## Targeted Test Matrix

For one tool change:

```bash
npm run test:tool -- <category/toolId>
```

For one tool plus mobile interaction:

```bash
npm run test:tool -- <category/toolId> --mobile
```

For real file processing:

```bash
npm run test:tool -- <category/toolId> --mobile --real
```

For shared code changes:

```bash
npm run verify:fast
```

For cross-cutting, pre-PR, routing, upload, FFmpeg, or metadata changes:

```bash
npm run verify:full
```

For Netlify confidence:

```bash
npm run verify:netlify
```

## Design For Hundreds Of Tools

- Keep tool modules isolated; do not import one tool from another.
- Prefer base `Tool` behavior for logs, progress, file selection, process button, and readiness.
- Preserve common IDs: `dropZone`, `fileInput`, `processBtn`, `progress`, `logHeader`, `logContent`.
- Put common patterns in `src/common/*`, not in copied tool code.
- Add categories in metadata first; the registry dynamically discovers one-level category modules.
- Avoid route-specific special cases. If a special case is needed, ask whether it is really shared infrastructure.

## Deploy Notes

Netlify runs `npm ci && npm run build:netlify` from `netlify.toml`. FFmpeg assets are copied into `dist/ffmpeg` during build, and headers in `netlify.toml` preserve SharedArrayBuffer support.

Before merging broad changes, verify:

```bash
npm run build:netlify
npm run verify:full
```
