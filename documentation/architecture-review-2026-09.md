# Architecture Review — September 2026

**Scope:** Full codebase review of safewebtool.com, covering routing, ML infra, build pipeline, testing, and production reliability. Written after several bug-fix cycles that surfaced systemic patterns worth addressing.

---

## What's Working Well

**Single-source-of-truth discipline is strong.** `src/common/metadata.js` owns all tool metadata; `ml-models.js` owns all model IDs, revisions, and file lists. When we've violated this (hardcoded HF URLs in face_detect, hardcoded sizes in grammar-fix) it's caused bugs. The discipline is in place; it just needs enforcing more consistently in the ML layer.

**The Tool base class is clean.** Lifecycle (`init → setup → destroy`) is well-defined, the router calls `destroyCurrentTool()` correctly, and SPA navigation cleanup actually works. The timer bug from this cycle revealed that the pattern works when followed.

**Cross-origin isolation is correct.** COEP/COOP headers on Netlify, SharedArrayBuffer for FFmpeg, dynamic CDN imports in module Workers — this was the hardest class of bug to diagnose (WebKit-only, invisible in Chromium) and it's now fixed and documented.

**Real inference tests exist.** `ml-text-tools.real.spec.js`, `ml-text-to-speech.real.spec.js`, `ml-transcribe.real.spec.js` now catch the exact failure modes (ChatML format, worker crash, audio output) that element-existence tests missed entirely.

---

## Architectural Issues and Recommendations

### 1. Two separate Transformers.js versions in production

**Problem:** `ml/transcribe.js` uses `@xenova/transformers@2.17.1` (old API, v2) inside its inline blob worker. `ml-loader.js` uses `@huggingface/transformers@3.6.3` (new API, v3 with `+esm` endpoint). Two different libraries, different APIs, double CDN weight downloaded on first use of each.

**Impact:** Maintenance burden doubles — any API change, security fix, or version pin bump needs to be done in two places. The v2 package (`@xenova/transformers`) is the deprecated predecessor; the v3 package (`@huggingface/transformers`) is the maintained fork. New features (better quantization, new model architectures) exist only in v3.

**Fix:** Migrate `transcribe.js` to use the shared `ml-loader.js` worker with `runInference('automatic-speech-recognition', ...)`. The dynamic-import fix, fetch shim, and timeout infrastructure are already there. The inline blob worker pattern in transcribe.js is 300+ lines that duplicates ml-loader.js exactly, with an older library version.

**Priority:** High. Architectural debt that compounds with every new ML tool.

---

### 2. ML worker is a module-level singleton — no recovery path

**Problem:** `ml-loader.js` creates one Worker per page session and never recreates it unless it crashes (the `worker.addEventListener('error')` handler sets `worker = null`, allowing retry). But soft failures — a model pipeline that throws inside `onmessage` but is caught and reported — leave the worker alive with partial state. If `getTTS` or `getPipeline` gets into an inconsistent state (e.g., a partially-initialised model that silently fails on inference), the next call gets the same broken instance.

**Impact:** Users can't recover without a page reload. The TTS 90%-hang situation was exactly this — model downloaded but session init hung in the pthread handshake, with no signal.

**Fix:** 
- The `withTimeout` wrap added around TTS init and generation is the right pattern for the known hang. Extend it to `getPipeline` as well (pipeline creation can also hang on slow mobile).
- On any timeout or inference error, invalidate the cached model in the worker so the next call re-initialises cleanly: set `ttsInstance = null` / `ttsModelId = null` and `loadedPipeline = null` in the catch path.
- Add a `resetWorker()` export that terminates and nulls the worker, callable from a user-visible "Retry" button on error.

**Priority:** Medium-High. Affects mobile reliability significantly.

---

### 3. FFmpeg CDN fallback chain has no version alignment guarantee

**Problem:** `ffmpeg-utils.js` loads FFmpeg from local `/ffmpeg/` first (self-hosted), then falls back to jsdelivr, then unpkg. The fallback URLs pin the CDN package version, but there is no check that the self-hosted version matches the CDN fallback version. A deploy that ships a new self-hosted build with an old CDN pin (or vice versa) would silently serve mismatched WASM.

**Impact:** Silent corruption of FFmpeg behaviour. The "text/html is not a valid JavaScript MIME type" bug from this cycle came from a CDN-served file with the wrong Content-Type — the fallback chain makes the same class of bug harder to attribute.

**Fix:** 
- Encode the expected version in the CDN URL and assert at load time that the loaded `@ffmpeg/ffmpeg` package version matches (it's available from `ffmpeg.version`).
- Consider removing the CDN fallback chain entirely now that self-hosting works. The fallback creates an invisible dependency on external CDNs in production; if self-hosting fails, that's a deployment bug that should surface loudly.

**Priority:** Medium.

---

### 4. `image2text.js` uses Google Storage for MediaPipe WASM — bypasses fetch shim

**Problem:** `src/ml/face_detect.js` now correctly uses `getStaticAssetUrl('blazeface-short-range')` but `image2text.js` (and potentially other ML tools) may still reference external URLs directly. More critically, the MediaPipe Vision bundle and WASM root are loaded from `cdn.jsdelivr.net` but the fetch shim in `ml-loader.js` only rewrites Hugging Face Hub URLs (`huggingface.co` prefix check). Any CDN failure for MediaPipe assets would silently break image captioning with no mirror fallback.

**Fix:** Add MediaPipe assets to `STATIC_ASSETS` in `ml-models.js` with R2 mirror URLs. Extend the fetch shim (or `getStaticAssetUrl`) to cover MediaPipe WASM roots.

**Priority:** Medium. MediaPipe assets are small and stable, but the pattern is inconsistent.

---

### 5. No bundle size budget enforcement

**Problem:** The build has no size limit checks. The vite config defines vendor chunks (ffmpeg-core, ffmpeg-wasm, js-yaml, common) but there's no CI assertion that the main bundle stays under a threshold. ML tools loading multi-hundred-MB models via CDN at runtime means the initial JS bundle size matters a lot for perceived performance.

**Current state:** FFmpeg core is npm-bundled (`@ffmpeg/core` in dependencies) but also self-hosted under `/public/ffmpeg/`. This means two copies: one in node_modules (consumed by `copy-ffmpeg-files` script) and one in public. The npm dep itself is never imported by JS — it's only used as a file source for copying. The package can be moved to devDependencies.

**Fix:** 
- Move `@ffmpeg/core` and `@ffmpeg/core-mt` to `devDependencies` (they're only used by `scripts/copy-ffmpeg-files.mjs`, never imported at runtime).
- Add a `build:check` script that fails CI if any Vite output chunk exceeds 100KB (excluding vendor-ffmpeg-* chunks which are legitimately large).

**Priority:** Low-Medium.

---

### 6. Test coverage gaps

**Covered well:**
- Contract tests (element IDs, template exports)
- Real inference: grammar-fix, summarize, tone, transcribe, TTS
- Video processing (fast fixtures)
- SEO canonicals
- Timer

**Not covered:**
- `image2text.js` has no real inference test — only smoke test
- `face_detect.js` has no test at all
- `passport-photo.js` acceptance test exists but is manually run (excluded from `verify:full`)
- WebKit real-inference tests run in CI but not as part of the default `npm test` alias; engineers running `npm test` locally get no WebKit coverage

**Fix:** 
- Add `face_detect.js` to the webkit-ios suite with a tiny test image fixture (similar to `ml-transcribe.real.spec.js`).
- Wire `verify:full` into the pre-push git hook (currently only pre-commit runs `test:contract`).

**Priority:** Medium.

---

### 7. `@ffmpeg/core-mt` in dependencies despite being banned

**Problem:** `@ffmpeg/core-mt` is listed in `package.json` dependencies and CLAUDE.md says "DO NOT switch FFmpeg back to the multi-threaded core — it deadlocks mid-encode." If it's banned in all usage, why is it installed? A future maintainer (or an AI coding assistant) seeing it in dependencies would reasonably think it's available to use.

**Fix:** Remove `@ffmpeg/core-mt` from package.json entirely. If it's needed as a file-copy source for some deployment variant, document that explicitly in CLAUDE.md rather than keeping a silent banned dependency.

**Priority:** Low (cleanup).

---

## Summary Table

| Issue | Impact | Effort | Priority |
|---|---|---|---|
| Two Transformers.js versions | Maintenance debt, double download | Medium | High |
| ML worker no recovery path | Mobile hangs unrecoverable | Low | High |
| FFmpeg CDN version misalignment | Silent mismatch risk | Low | Medium |
| MediaPipe not mirrored | CDN dep, no fallback | Medium | Medium |
| No bundle size budget | Unchecked growth | Low | Low-Medium |
| Test coverage gaps | Bugs go undetected | Medium | Medium |
| Banned @ffmpeg/core-mt still installed | Confusion risk | Very low | Low |

---

## Immediate Next Steps (recommended order)

1. **Migrate `transcribe.js` to shared `ml-loader.js` worker** — removes Transformers.js v2, halves the CDN weight for users who use both transcribe and TTS/text tools, and eliminates 300 lines of duplicated worker infrastructure.

2. **Add model-cache invalidation on error in ml-loader.js** — small change, high reliability gain on mobile where the TTS hang was observed.

3. **Mirror MediaPipe assets to R2** — complete the "all ML assets mirrored" goal that was done for Kokoro and SmolLM2 but not MediaPipe.

4. **Remove `@ffmpeg/core-mt` from package.json** — prevents future misuse.

5. **Wire `verify:full` into pre-push hook** — ensures WebKit tests run before any push.
