# SafeWebTool Improvement Plan

Analysis date: 2026-06-13. Based on audit of all source files, tests, and documentation.

---

## Summary

SafeWebTool has a strong architecture (thin tool modules, shared base class, contract validation, automated scaffolding) and a clear privacy-first philosophy. The gaps are primarily: tool breadth, a few privacy inconsistencies, test coverage holes, and several quick DX wins.

---

## Priority 0 — Make Adding a Tool Frictionless (Extensibility)

The architecture already supports zero-router-edit tool additions. The remaining friction is all in the **scaffold workflow** — these are the highest-leverage changes because every future tool benefits.

### 0.1 Scaffold auto-inserts metadata (was: hand-paste)

`npm run scaffold:tool` used to print a metadata block to the terminal for you to paste into `src/common/metadata.js` by hand — the single most error-prone step (wrong key, missing comma, mismatched `id`/`category`). The scaffold now **writes the metadata entry directly** into the `tools` object in `metadata.js`. Pass `--no-metadata` to opt out.

### 0.2 Scaffold supports template kinds

A single file-upload template forced every text/time/math/privacy tool to rewrite the whole module. The scaffold now takes `--kind`:

| `--kind` | Shape | Good for |
|----------|-------|----------|
| `file` (default) | Drop zone + process button + logs | image/video/ml tools |
| `text` | Input textarea → action → output textarea + copy/download | base64, case-converter, word-count, JSON/YAML |
| `generator` | Options + generate button → output + copy | password, UUID, hash, lorem-ipsum |

Each kind wires the right `Tool` config (`needsFileUpload`, `hasOutput`) and exposes predictable DOM IDs.

### 0.3 Scaffold generates a matching test stub

The scaffold now writes `tests/<category>-<toolId>.spec.js` with a smoke check (page loads, `data-tool-ready` marker, key elements present) tuned to the chosen kind. Pass `--no-test` to opt out. This closes the §1.3 / §3.2 gap going forward.

### 0.4 Build chunking covers every category

`vite.config.js` `entryFileNames` only preserved `video|image|text` paths and used `[a-z-]+` (which silently missed digit-containing tool IDs like `ml/image2text`). It now matches any category directory and digit-containing IDs, so `ml/` and `time/` tools get stable, path-preserving chunk names too.

**Net effect:** adding a tool is now `scaffold:tool` → fill in `processFile`/`processText`/`generate` → `test:tool`. No manual metadata edit, no router edit, no test boilerplate.

---

## Priority 1 — Fix Before Adding More Tools

These are correctness and consistency issues that compound with scale.

### 1.1 Reconcile the privacy wording with Google Analytics (keep GA)

**Decision:** Google Analytics stays. `src/main.js` keeps loading GA (`G-SK7DDP7ND6`), already gated to skip localhost and deferred to idle (`scheduleAnalytics`). The brand promise is specifically about **files**, not page-view analytics — so the fix is wording, not removal.

The homepage and metadata say "No ads, no tracking" / "no tracking" in a few places. GA is page-level analytics, but the privacy claim that matters is "your files never leave your browser." Make the copy precise so it stays true:

- Keep the strong, accurate claims: **No file uploads. No login. No ads. No paywalls.** (these are all true and are the real differentiator)
- Drop the unqualified "no tracking" phrasing where it appears, or qualify it as "no third-party file tracking / your files are never uploaded."
- Files to check: `src/common/metadata.js` (`siteInfo.philosophy`, `keywords`), `src/common/page-renderers.js` hero pills, `index.html` static copy.

This keeps GA (anonymous page analytics for understanding which tools are used) while making sure no on-page claim overstates the privacy posture.

### 1.2 Navigation in `index.html` is duplicated

The top-nav flyout menus in `index.html` are hardcoded HTML, while `src/main.js` also dynamically renders the nav from metadata. The two can drift. The hardcoded flyout has links that `main.js` doesn't replicate.

**Fix:** Drive the flyout from metadata too, or clearly designate which is the source of truth and remove the other.

### 1.3 Missing dedicated tests for several tools

No focused test for: `image/crop`, `ml/face_detect`, `ml/image2text`, `ml/transcribe`, `text/remove-extra-spaces`, `text/editor`.

**Fix:** Add smoke specs following the existing `image-tools-e2e.spec.js` and `time-tools.spec.js` pattern. These don't need real-file coverage — just that the page loads, the tool-ready marker appears, and the UI elements are present.

---

## Priority 2 — High-Value New Tools (Low Implementation Risk)

These use no new dependencies, follow existing patterns (text/time tools are pure JS, image tools use Canvas API), and can be shipped with `npm run scaffold:tool`.

### Text Tools

| Tool | Path | Why |
|------|------|-----|
| Markdown preview | `text/markdown` | Very high search volume; pure JS (marked.js or micro-parser) |
| CSV viewer | `text/csv` | Tabular data preview in-browser; no library needed |
| Base64 encode/decode | `text/base64` | Developer staple; 5 lines of logic |
| URL encode/decode | `text/url-encode` | Same; `encodeURIComponent` / `decodeURIComponent` |
| Word counter | `text/word-count` | Simple, broad audience |
| HTML formatter / minifier | `text/html-formatter` | Pairs with existing JSON/YAML tools |
| Regex tester | `text/regex` | Developer-focused; vanilla JS |
| Lorem ipsum generator | `text/lorem-ipsum` | Quick win |
| Case converter | `text/case-converter` | camelCase ↔ snake_case ↔ UPPER ↔ Title |
| Diff viewer | `text/diff` | Side-by-side text diff; can use browser's native `Intl` or a tiny lib |

### Image Tools

| Tool | Path | Why |
|------|------|-----|
| Image format converter | `image/convert` | JPEG ↔ PNG ↔ WebP ↔ AVIF via Canvas; very high demand |
| Color picker from image | `image/color-picker` | Eyedropper on canvas; popular utility |
| Image metadata viewer | `image/metadata` | EXIF data via small JS lib (exifr); pairs with video/info |
| Background remover | `image/bg-remove` | Uses `@huggingface/transformers` (already a dep); ML-powered |
| Favicon generator | `image/favicon` | Canvas resize to ICO/PNG sizes; popular use case |
| QR code generator | `image/qr-code` | qrcode.js (~10KB); entirely browser-local |
| Image to PDF | `image/to-pdf` | jsPDF in-browser; no upload needed |

### Time Tools

| Tool | Path | Why |
|------|------|-----|
| Pomodoro timer | `time/pomodoro` | Extends existing timer; high search volume |
| Epoch / Unix timestamp converter | `time/epoch` | Developer staple |
| Age calculator | `time/age` | Simple date math; broad audience |
| Countdown to date | `time/countdown` | Simple extension of existing timer logic |

### New Category: Math / Numbers

| Tool | Path | Why |
|------|------|-----|
| Percentage calculator | `math/percentage` | Extremely high search volume |
| Unit converter | `math/unit-convert` | Comprehensive (length, weight, temp, speed) |
| Random number generator | `math/random` | Simple; useful |
| Number base converter | `math/base-convert` | Binary ↔ Decimal ↔ Hex ↔ Octal |
| Loan / mortgage calculator | `math/loan` | Genuinely useful; complex enough to justify a tool |

### New Category: Privacy / Security (aligns perfectly with brand)

| Tool | Path | Why |
|------|------|-----|
| Password generator | `privacy/password` | Browser-local `crypto.getRandomValues`; no library needed |
| Password strength checker | `privacy/password-check` | Pairs with generator |
| Hash generator (MD5/SHA) | `privacy/hash` | Browser `crypto.subtle`; developer use case |
| UUID generator | `privacy/uuid` | `crypto.randomUUID()`; trivial to implement |

---

## Priority 3 — Architecture & DX Improvements

### 3.1 Search is not prominently discoverable

The global search exists (`#globalToolSearch`) but is not visible on mobile without scrolling. With 30+ tools incoming, discoverability becomes critical.

**Fix:** Make the search bar sticky or add it to the mobile header. Consider auto-focusing it on `/` keypress.

### 3.2 Tool scaffold doesn't generate a test stub — ✅ done (see §0.3)

Implemented in Priority 0: `scripts/scaffold-tool.mjs` now writes `tests/<category>-<toolId>.spec.js` with a kind-aware smoke check.

### 3.3 No "recently added" or "featured" sorting on homepage

All categories expand the same way with no signals about what's new or popular.

**Fix:** Add an optional `featured: true` and/or `addedAt: '2026-01-01'` field to metadata, then surface a "New" badge and a "Recently added" section on the homepage.

### 3.4 `vite.config.js` manualChunks doesn't cover `ml/` and `time/` — ✅ done (see §0.4)

Implemented in Priority 0: the `entryFileNames` regex now matches any category directory and digit-containing tool IDs.

### 3.5 Category pages don't have breadcrumbs or back-links

Navigating to `/image` gives no visual path back to home. Breadcrumbs improve both UX and SEO.

**Fix:** Add a simple `Home > Image Tools` breadcrumb in `page-renderers.js` for category and tool pages.

---

## Priority 4 — SEO and Discoverability

### 4.1 Per-tool OG images

Currently all tools share the same `/og/safewebtool.png`. Tools with custom OG images rank better and have better social share previews.

**Fix:** Extend `scripts/generate-share-image.mjs` to generate a per-tool OG image (tool name + icon + site branding) using `@napi-rs/canvas` or similar in the build step.

### 4.2 `llms.txt` is the only agent entry point from root

The site follows the `llms.txt` spec but doesn't link to it from `<head>`. Some AI crawlers look for a `<link rel="llms" href="/llms.txt">` convention.

**Fix:** Add the link tag to `index.html` head (1-line fix).

### 4.3 Structured data is per-tool but not present on category pages

Category pages currently have no JSON-LD, which is a missed SEO opportunity for landing pages like `/image`.

**Fix:** Add `ItemList` structured data on category pages listing all tool URLs within.

---

## Priority 5 — Performance

### 5.1 ML models are downloaded at runtime on first use

`@huggingface/transformers` fetches model weights when the tool first runs, with no pre-cache or progress indicator beyond the generic log.

**Fix:** Add a clear model-download progress bar (size, %) separate from the processing progress. Consider caching models to `CacheStorage` on first download to skip the fetch on return visits.

### 5.2 FFmpeg WASM is re-fetched on each tool load

FFmpeg WASM (~10MB) has no persistent cross-session cache.

**Fix:** Use `CacheStorage` to cache WASM bytes after first download. Detect cache presence and show a faster "resuming" state instead of "loading FFmpeg."

### 5.3 No `<link rel="preconnect">` for CDN resources

HuggingFace CDN and jsDelivr are used at runtime but not preconnected in `<head>`.

**Fix:** Add `<link rel="preconnect" href="https://cdn.jsdelivr.net">` and `<link rel="preconnect" href="https://huggingface.co">` to `index.html`.

---

## Suggested Delivery Order

If shipping in sprints:

1. **Sprint 1** — Fix GA/privacy (1.1), remove nav duplication (1.2), add missing smoke tests (1.3)
2. **Sprint 2** — Text tools batch: base64, url-encode, markdown, word-count, case-converter (quickest wins)
3. **Sprint 3** — Privacy/Security category: password generator, hash, UUID (brand-aligned, high demand)
4. **Sprint 4** — Image tools: format converter, QR code, favicon generator
5. **Sprint 5** — Math category, remaining text tools
6. **Sprint 6** — Performance: WASM/model caching, per-tool OG images, breadcrumbs
7. **Ongoing** — One new tool per week using `npm run scaffold:tool` workflow

Each sprint is independently shippable. Contract and smoke tests catch regressions before merge.
