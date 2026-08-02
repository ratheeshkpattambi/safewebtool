# SafeWebTool Improvement Plan

Original analysis: 2026-06-13. **Revised 2026-08-01** against the current tree — most of
the original Priority 0/1/3/4 items have shipped. Status verified by reading the source,
not by memory.

Site is at **33 tools across 5 categories** (`video`, `image`, `text`, `ml`, `time`);
`npm run test:contract` passes.

---

## Status of the original plan

### ✅ Shipped

| Item | Evidence |
|---|---|
| 0.1 Scaffold auto-inserts metadata | `scripts/scaffold-tool.mjs`, `--no-metadata` opt-out |
| 0.2 Scaffold template kinds (`file`/`text`/`generator`) | documented in CLAUDE.md |
| 0.3 Scaffold generates a test stub | `--no-test` opt-out |
| 0.4 Build chunking covers every category | `vite.config.js` `entryFileNames` |
| 1.1 Privacy wording vs Google Analytics | no unqualified "no tracking" string remains in `src/` or `index.html` |
| 1.2 Duplicated nav in `index.html` | dead flyout HTML removed (commit `216176b`) |
| 3.3 "Featured" signal on homepage | `featured: true` in `metadata.js` |
| 3.5 Breadcrumbs | `BreadcrumbList` JSON-LD emitted from `metadata.js:910` |
| 4.3 Structured data on category pages | `ItemList` microdata in `page-renderers.js:27` |

### 🟡 Partly done

- **1.3 Missing dedicated tests.** `image/crop` is now genuinely covered
  (`tests/image-tools-e2e.spec.js:75` drives the canvas and asserts real crop dimensions).
  Still no focused spec for `ml/face_detect`, `ml/image2text`, `ml/transcribe`,
  `text/editor`, `text/remove-extra-spaces` — they only get the generic sweep in
  `all.spec.js`.
- **3.1 Search discoverability.** `globalToolSearch` + `homeToolSearch` exist and are kept
  in sync (`main.js:165`); duplicate search on category pages was removed. Sticky mobile
  placement and `/`-to-focus were never done.
- **5.1 ML model download UX.** `ml-loader.js` wires `progress_callback` through to the
  tool log. Still no size-aware progress bar. Explicit `CacheStorage` work is **no longer
  needed** — Transformers.js caches weights via the Cache API by default
  (`env.useBrowserCache`).
- **5.3 Preconnect.** `cdn.jsdelivr.net` and `unpkg.com` are preconnected in `index.html`;
  `huggingface.co` is not. Superseded in part by the R2 plan below.

### ❌ Still open

- **4.1 Per-tool OG images** — `scripts/generate-share-image.mjs` still emits one shared
  `public/og/safewebtool.png`.
- **4.2 `<link rel="llms">`** pointing at `/llms.txt` is absent from `index.html`.
- **5.2 FFmpeg WASM caching** — no `caches.open` anywhere in `src/`. ~10 MB re-fetched per
  session. Now the *only* remaining large asset without a persistent cache.

### Shipped but never in this plan

Worth recording, because it changes what "done" means for Priority 2 and 5:

- **`image/passport-photo`** — full tool, own research doc
  ([passport-photo-maker-research.md](passport-photo-maker-research.md)) and acceptance spec.
- **A browser-local LLM stack** — `src/common/ml-loader.js` runs a shared Worker with
  Transformers.js, caching one pipeline per session so tools sharing a model download once.
  Powers `text/summarize`, `text/tone` (SmolLM2-360M) and `text/grammar-fix` (SmolLM2-135M).
- **`text/latex-pdf`**, **`ml/face_detect`**.
- **The canonical-URL indexing outage and its fix** — see
  [seo-and-urls.md](seo-and-urls.md). Now the site's most important invariant.
- **The FFmpeg multi-threaded-core deadlock** — `@ffmpeg/core-mt` removed (commit `b361260`).

---

## Priority 1 — Now

### 1.1 Self-host ML weights on R2 — 🟡 in progress

The single biggest correctness risk in the codebase: five tools resolve model weights
against a third-party repo's `main` branch at runtime, so an upstream re-quantisation
breaks production with no deploy on our side. Same failure shape as the canonical-URL
outage — site looks healthy, feature is dead.

**Status (2026-08-01):** R2 bucket, CORS, sync script, model registry and the
whisper-base mirror (81.3 MB, byte-verified) are all **done**. No tool consumes the
mirror yet. Resume instructions, verification commands and the one open decision are at
the top of **[self-hosted-ml-models.md](self-hosted-ml-models.md)**.

Two models: `onnx-community/whisper-base` (migrate `ml/transcribe`) — mirrored; then
`onnx-community/Kokoro-82M-v1.0-ONNX` q8f16 as a new `ml/text-to-speech` tool — not yet.

### 1.2 Pin every model revision — 🟡 partly done

`src/common/ml-models.js` pins both mirrored models to commit SHAs. **Still to do:** the
`test:contract` assertion rejecting `main`, and the SmolLM2 models used by
`text/summarize`, `text/tone` and `text/grammar-fix` are still unpinned.

### 1.3 Close the ML test gap

`ml/transcribe`, `ml/image2text`, `ml/face_detect` are the least-tested and most
expensive-to-break tools. Per CLAUDE.md, assert on **real output** (actual transcript
text, actual detected box) — never that an element merely exists.

### 1.4 FFmpeg WASM caching (was 5.2)

~10 MB per session, eight video tools. Cache the WASM bytes in `CacheStorage` and show a
"resuming" state on a cache hit. The ML side of this is already handled by the library, so
FFmpeg is the last uncached large asset.

---

## Priority 2 — New tools

Shipped since the original plan: `text/base64`, `text/url-encode`, `text/word-count`,
`image/convert`, `image/passport-photo`, `text/summarize`, `text/tone`,
`text/grammar-fix`, `text/latex-pdf`, `ml/face_detect`.

### Still worth building

| Tool | Path | Why |
|---|---|---|
| Text-to-speech | `ml/text-to-speech` | **Highest value.** Kokoro-82M, 86 MB, Apache 2.0, 8 languages. See the R2 proposal. |
| Markdown preview | `text/markdown` | High search volume; pure JS |
| Case converter | `text/case-converter` | camelCase ↔ snake_case ↔ UPPER ↔ Title |
| Diff viewer | `text/diff` | Side-by-side text diff |
| CSV viewer | `text/csv` | No library needed |
| Regex tester | `text/regex` | Developer-focused, vanilla JS |
| QR code generator | `image/qr-code` | ~10 KB lib, entirely browser-local |
| Image metadata viewer | `image/metadata` | EXIF via `exifr`; pairs with `video/info` |
| Favicon generator | `image/favicon` | Canvas resize to standard sizes |
| Image to PDF | `image/to-pdf` | jsPDF in-browser |
| Color picker from image | `image/color-picker` | Eyedropper on canvas |
| Epoch converter | `time/epoch` | Developer staple |
| Pomodoro timer | `time/pomodoro` | Extends `time/timer` |
| Age calculator | `time/age` | Simple date math, broad audience |
| Countdown to date | `time/countdown` | Extends `time/timer` |

`image/bg-remove` was listed here originally. **Hold it** — the passport-photo research
concluded that background replacement is a compliance and trust risk, and the two tools
would sit next to each other in `image/`. If built, it must be clearly separated from any
ID-photo workflow.

### New categories (unchanged, still not started)

**Math** — `math/percentage`, `math/unit-convert`, `math/base-convert`, `math/loan`, `math/random`.

**Privacy/Security** — `privacy/password`, `privacy/password-check`, `privacy/hash`, `privacy/uuid`.
Brand-aligned and trivially browser-local (`crypto.getRandomValues`, `crypto.subtle`,
`crypto.randomUUID`). Adding a category means adding it to `categories` in `metadata.js` first.

---

## Priority 3 — SEO and polish

- **Per-tool OG images (was 4.1)** — extend `scripts/generate-share-image.mjs` to emit one
  per tool at build time. Must go through `getCanonicalPathForToolPath()`; never re-derive
  a URL in a script (see [seo-and-urls.md](seo-and-urls.md)).
- **`<link rel="llms" href="/llms.txt">` (was 4.2)** — one line in `index.html`.
- **Sticky/mobile search + `/` to focus (was 3.1)** — the remaining half of §3.1.
- **Visible breadcrumb UI** — the JSON-LD exists; there is still no on-page
  `Home › Image Tools` trail.

---

## Suggested delivery order

1. **Pin model revisions + contract assertion** (1.2) — smallest change, removes the
   sharpest risk.
2. **R2 bucket + whisper migration** (1.1, steps 1–3) — proves the hosting path on a
   known-good model.
3. **Kokoro TTS tool** (1.1, steps 4–6) — the first genuinely new capability in a while.
4. **ML test gap + FFmpeg caching** (1.3, 1.4).
5. **Text tools batch** — markdown, case-converter, diff, csv, regex.
6. **Privacy/Security category** — brand-aligned, high demand, no dependencies.
7. **SEO polish** (Priority 3), then Math category and remaining image/time tools.

Each step is independently shippable. Run `verify:full` before any PR that touches shared
files.
