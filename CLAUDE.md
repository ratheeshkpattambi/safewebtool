# CLAUDE.md — SafeWebTool

Claude-specific context for working in this repo. Start here, then read `AGENTS.md` for the full agent guide and `documentation/tool-architecture-playbook.md` for the scaling workflow.

## Project Identity

SafeWebTool is a privacy-first, open-source collection of browser-local tools at [safewebtool.com](https://safewebtool.com). **All processing happens in the user's browser. No file uploads, no server, no login, no ads.**

Stack: Vite + Tailwind CSS + vanilla JS ES modules. Deployed on Netlify. Tests use Playwright.

## Claude's Role in This Repo

You are a contributor, not a reviewer. When asked to add a tool, fix a bug, or refactor shared code, **do the work** — scaffold, implement, run contract checks, and verify tests pass. Don't just describe what to do.

## Cardinal Rules (Never Violate)

1. **No server calls from tool logic.** Tools may use CDN-hosted WASM/ML models, but never POST user files to a remote server.
2. **Privacy-first.** Tool processing logic must never send user files or file content to any analytics/tracking/third-party service. The site already loads anonymous, page-view-only Google Analytics (`src/main.js`, gated off localhost) for usage stats — that's intentional and should be preserved, not removed. Don't add new tracking, and don't add any analytics calls inside tool modules.
3. **No router edits for normal tool additions.** The dynamic import glob in `tool-registry.js` discovers tools automatically. Adding metadata + a module file is enough.
4. **Minimal code.** Prefer reusing `src/common/*` over copy-pasting. Avoid bloated libraries or excessive comments.
5. **Mobile-first.** Tools must work and look correct on small screens.

## Architecture at a Glance

```
src/
  common/
    metadata.js        ← source of truth: categories + tool metadata (SEO, cards, discovery)
    tool-registry.js   ← route parsing + dynamic module loading (do not add tool-specific cases here)
    page-renderers.js  ← renders category pages + tool shell
    base.js            ← Tool base class (logs, progress, process button, file upload wiring)
    fileUpload.js      ← shared drag/drop + file input (delegated events — safe after re-renders)
    utils.js           ← addLog, updateProgress, formatFileSize, etc.
    footer-manager.js  ← custom per-tool footers
  <category>/
    <toolId>.js        ← tool module: export template + initTool()
  video/
    ffmpeg-utils.js    ← FFmpeg WASM wrapper, presets, error handling
```

## Adding a Tool (Fast Path)

```bash
npm run scaffold:tool -- image/my-tool --name="My Tool" --icon="🧰" [--kind=file|text|generator]
```

The scaffold creates the module, **auto-inserts the metadata entry** into `src/common/metadata.js`, and writes a smoke test at `tests/<category>-<toolId>.spec.js`. Pick `--kind`:

- `file` (default) — drop zone + process button (image/video/ml tools)
- `text` — input → output textareas with copy/download (text utilities)
- `generator` — options → generated output (password/uuid/hash)

Then:
1. Implement the scaffolded `processFile()` / `processText()` / `generate()` with real browser-local logic.
2. Refine the auto-inserted metadata (keywords, `howToUse`, `useCase`) in `src/common/metadata.js`.
3. Run `npm run test:tool -- image/my-tool` to verify.

Flags: `--no-metadata` (print the entry instead of inserting), `--no-test` (skip the test stub).

### Required metadata fields

`id`, `category`, `name`, `description`, `icon`, `keywords`, `howToUse`, `useCase`

Key format in `tools` object: `"<category>/<toolId>"` — must match the file path and `tool.id` / `tool.category` values.

### Tool module contract

- Export `template` — HTML string with the tool UI
- Export `initTool()` — called by the router after the shell renders
- Extend `Tool` from `src/common/base.js` for consistent behavior (logs, progress, process button, file upload, `data-tool-ready` marker)

### DOM IDs to preserve (tests depend on these)

| ID | Purpose |
|----|---------|
| `dropZone` | File drop area |
| `fileInput` | Hidden file input |
| `processBtn` | Process trigger button |
| `progress` / `videoProgress` | Progress bar |
| `logHeader` / `logContent` | Collapsible log panel |
| `input-video` / `output-video` | Video preview elements (video tools) |
| `downloadContainer` | Output download link area |

## Test Commands (Use These, In This Order)

```bash
# 1. Fast contract check (always run first)
npm run test:contract

# 2. Smoke test one tool
npm run test:tool -- <category/toolId>

# 3. With mobile + real file
npm run test:tool -- <category/toolId> --mobile --real

# 4. Full regression (before PR or cross-cutting changes)
npm run verify:full
```

Run `npm run verify:full` when touching: routing, shared base/upload utilities, FFmpeg helpers, or multiple tools at once.

## Video Tools — Extra Care

- FFmpeg WASM is slower than desktop — use fast presets: H.264 `ultrafast`-ish, VP8 (`libvpx`) over VP9.
- Normalize FFmpeg failures early; don't let empty output silently look like success.
- All video tool pages need: log panel, progress bar, output preview, download link.
- Validate against `tests/video-ui-consistency.spec.js` after video tool changes.

## Common Bugs to Avoid

- **Upload button breaks after re-render**: `fileUpload.js` uses delegated events — don't re-initialize in a way that creates duplicate listeners.
- **FFmpeg failed but UI looks OK**: Always check exit code in `ffmpeg-utils.js`, not just log output.
- **Empty output file**: Downstream symptom of a decode/encode error — fix root cause, not symptoms.
- **Mobile test click interception**: Use `scrollIntoViewIfNeeded()` + `click({ force: true })` in Playwright tests.

## Generated Files — Do Not Hand-Edit

These are regenerated from `src/common/metadata.js` and build scripts:
- `public/llms.txt`
- `public/tools.json`
- `public/**/agent.json`
- `public/og/safewebtool.png`

After metadata changes: `npm run generate:agent-manifest && npm run generate:share-image`

## Scaffold for a New Category

Add the category to `src/common/metadata.js` under `categories` first (with `id`, `name`, `description`, `icon`, `keywords`). The registry discovers it automatically — no router edit needed.

## Before Every PR

- [ ] `npm run test:contract` passes
- [ ] `npm run test:tool -- <category/toolId>` passes for changed tools
- [ ] `npm run verify:full` passes for cross-cutting changes
- [ ] No router edits unless route semantics changed
- [ ] No server calls added to tool logic
- [ ] Generated files regenerated if metadata changed

## Key Conventions Claude Should Follow

- Keep tool modules thin — processing logic goes in the module, structural/shared patterns in `src/common/*`.
- Don't import one tool module from another.
- Don't add global side effects in shared utilities.
- Commit messages: specific to user-facing or architectural impact; include what was tested.
- Prefer `Tool` base class over hand-rolling logs/progress/button wiring.
