# Known issues & engineering backlog

Open defects and planned architectural work, with the reasoning behind each. Every claim
cites a file and line and was verified against the tree, not recalled. **Delete entries
as they are fixed** — this is a live list, not a record of what we once thought.

## The one-sentence version

This codebase has learned the same lesson three times — *a floating identity breaks
production without a deploy* — and written it down three times, but enforced it in
exactly one place. The highest-leverage work is not new abstraction; it is turning the
rules in `CLAUDE.md` into checks that fail the build.

---

## What's working well (do not regress)

- **Single source of truth, where it exists, works.** `metadata.js` owns tool metadata;
  `ml-models.js` owns model ids, pinned SHAs, dtypes, mirror routing. Every bug in this
  cycle traces to a place that *bypassed* one of these, never to the pattern itself.
- **The router's lifecycle is correct.** `destroyCurrentTool()` is called before content
  is swapped ([router.js:226](../src/router.js#L226)), and a `navigationToken` guards
  against a slow module import clobbering a newer route. This is better than most SPAs.
- **Cross-origin isolation is right, and the WebKit fix is real.** The dynamic-import
  workaround is correct, well-documented, and covered by a real-WebKit Playwright project.
- **Real-inference tests exist** for TTS, the three SmolLM2 text tools, and transcribe —
  and they catch the failure modes that element-existence tests miss entirely.

---

## Theme 1 — The invariant is documented but only partly enforced

`CLAUDE.md` says: never hardcode a repo id or model URL outside `ml-models.js`; every
revision must be a commit SHA. Reality:

| Dependency | Pinned? | Mirrored? | Where |
|---|---|---|---|
| Transformers.js | ✅ `3.6.3` | n/a (CDN) | [ml-loader.js:31](../src/common/ml-loader.js#L31) |
| kokoro-js | ✅ `1.2.1` | n/a (CDN) | [ml-loader.js:38](../src/common/ml-loader.js#L38) |
| Kokoro / SmolLM2 / whisper weights | ✅ SHAs | ✅ | [ml-models.js](../src/common/ml-models.js) |
| MediaPipe tasks-vision | ✅ `0.10.1` | ❌ WASM root on jsdelivr | [face_detect.js:1,122](../src/ml/face_detect.js#L1) |
| **tesseract.js** | ❌ **floating `@4`** | ❌ | [image2text.js:264](../src/ml/image2text.js#L264) |
| **whisper models in transcribe** | ❌ **implicit `main`** | ❌ bypasses the mirror | [transcribe.js:14-18](../src/ml/transcribe.js#L14) |

`tesseract.js@4` is the exact shape of the bug that already took down three tools —
`ml-loader.js:23` documents that a floating `@3` range "is also how this broke without a
deploy" — reproduced verbatim in another file. And `transcribe.js` resolves five
`Xenova/whisper-*` repos at their default revision (`main`) with **no fetch shim**
(verified: its inline worker contains no `toMirrorUrl`, `MODEL_HOST` or `revision`), so
the whisper weights we already paid to mirror are never used.

**Fix — make it structural, not documentary.** Add to `scripts/validate-tool-contract.mjs`:

1. Fail if any file under `src/` outside `common/ml-models.js` and `common/ml-loader.js`
   contains a `huggingface.co` or `cdn.jsdelivr.net` URL.
2. Fail if any CDN URL in those two files lacks a full `x.y.z` version.
3. Fail if any `MODELS[*].revision` is `main` or is not 40 hex chars.

This is ~30 lines, runs in the existing sub-5-second contract check, and permanently
retires a class of outage. **Do this first** — it also prevents the rest of this document
from decaying.

---

## Theme 2 — There are two ML stacks, and the second one is the unpatched one

`transcribe.js` (545 lines) carries its own blob worker on
`@xenova/transformers@2.17.1` — the deprecated v2 package — with its own message
protocol (`status:` vs `type:`), its own progress mapping, and none of the hardening
that `ml-loader.js` has accumulated: no fetch shim, no revision pinning, no mirror, no
timeout, no shared model cache.

The real cost is not the duplicated lines. It is that **the WebKit dynamic-import fix
had to be authored twice, by hand, with the same 15-line comment pasted into both
files** ([ml-loader.js:73](../src/common/ml-loader.js#L73),
[transcribe.js:339](../src/ml/transcribe.js#L339)). The next cross-cutting ML fix will
cost the same, or — more likely — will land in one file and silently not the other.

**Fix:** migrate `transcribe.js` to `runInference('automatic-speech-recognition', ...)`
against `whisper-base` from the registry. This deletes ~120 lines of worker code, drops
Transformers.js v2 entirely (halving CDN weight for anyone who uses transcribe *and* any
text tool), and inherits pinning + mirroring for free.

**On the open dropdown question:** the migration itself answers it. The five options are
five unpinned, unmirrored repos — the liability this whole effort exists to remove.
Ship `whisper-base` (multilingual, already mirrored) as the single default, and only add
a second option if usage data justifies another ~90 MB in R2. Do not mirror all five;
~400 MB of egress-free storage to preserve a dropdown nobody asked for is the wrong
trade for a site with no revenue.

---

## Theme 3 — Failure recovery is memoized away (three concrete defects)

**3a. A rejected import is cached forever.**

```js
transformersPromise ??= import(TRANSFORMERS_URL);   // ml-loader.js:82
kokoroPromise       ??= import(KOKORO_URL);         // ml-loader.js:150
```

`??=` only assigns when the variable is `null`/`undefined`. A *rejected* promise is
neither. So a single flaky CDN fetch poisons the worker for the entire page session:
every subsequent call to summarize, tone, grammar-fix and TTS re-awaits the same
rejection, and the user's only recovery is a full page reload. There is no error path
that resets it — the worker never crashes, so the `error` handler that nulls `worker`
never fires.

*Fix:* `transformersPromise = import(url).catch(e => { transformersPromise = null; throw e; })`.
Four lines, two places.

**3b. Only TTS has a deadline.** `withTimeout` is applied at
[ml-loader.js:237 and :247](../src/common/ml-loader.js#L237) — the TTS branch only.
`getPipeline()` and every `runInference()` call can hang indefinitely: the main-thread
`pending` map has no timer, so if the worker stalls without throwing, the promise never
settles and the UI sits at a progress bar forever. The TTS hang taught this lesson
precisely; it was fixed at the site of the incident rather than at the abstraction.

*Fix:* wrap `getPipeline` in `withTimeout` too, and give every `pending` entry a
main-thread deadline so a wedged worker surfaces as an error rather than a spinner.

**3c. The crashed worker is leaked, not terminated.** The `error` handler sets
`worker = null` ([ml-loader.js:~330](../src/common/ml-loader.js)) but never calls
`worker.terminate()`. The old worker — and the several-hundred-MB model in its heap —
stays alive while a fresh one is constructed alongside it.

*Fix:* `terminate()` before nulling, and export a `resetWorker()` so a tool can offer a
real "Retry" button instead of "reload the page".

**3d (minor).** Progress is broadcast to *every* pending entry, so two concurrent ML
requests drive each other's progress bars.

---

## Theme 4 — Object-URL lifecycle is unowned by the layer that creates them

`Tool.displayOutputMedia()` and `Tool.displayPreview()`
([base.js:230-300](../src/common/base.js#L230)) call `URL.createObjectURL()` and **never
revoke**. Fifteen tools use these helpers — including every video tool. Because the
router swaps pages via `innerHTML` rather than reloading, those blobs survive navigation
for the whole session: re-encode three videos, browse to three other tools, and all
three outputs plus their previews are still resident.

Individual tools *do* revoke — 16 `revokeObjectURL` calls across 13 files — which is the
tell: the responsibility was pushed to callers, and the callers that use the shared
helper have no hook to do it. Only `timer.js` overrides `destroy()`; `base.js` provides
it as a no-op.

**Fix:** the base class already owns creation, so it should own destruction. Track URLs
minted by the two helpers in an instance array, and revoke them in a `Tool.destroy()`
that subclasses call via `super.destroy()`. This is the correct layer *because no tool
author can forget it* — the same reasoning that makes `getCanonicalPathForToolPath()`
the only URL source.

---

## Theme 5 — The suite proves modules load, not that tools work

`all.spec.js` tests **one tool per category** for rendering, plus a module-import check
across all of them. Twelve of 34 tools have no other spec at all:

`image/convert`, `image/rotate`, `image/sample-image`, `ml/face_detect`, `ml/image2text`,
`text/base64`, `text/editor`, `text/json-formatter`, `text/remove-extra-spaces`,
`text/url-encode`, `text/word-count`, `text/yaml`

That is exactly the pattern `CLAUDE.md` bans ("DO NOT write a test that asserts only
'an element exists'") — applied at suite level rather than test level.

Ranked by risk × absence, the gaps that matter:

1. **`ml/face_detect`** — zero tests, *and* the only file with a top-level static
   cross-origin import ([face_detect.js:1](../src/ml/face_detect.js#L1)), *and*
   an unmirrored WASM root. Highest risk in the repo.
2. **`ml/image2text`** — zero real tests and the floating `tesseract.js@4` pin.
3. **`text/yaml`** — parses user input through a dependency with an open high-severity
   DoS advisory (below).

---

## Theme 6 — The one thing on the critical path that grows without bound

`metadata.js` is 52.8 KB of source across 1,061 lines, and it is **statically imported by
`main.js`, `router.js`, `sitemap.js`, `page-renderers.js` and `tool-registry.js`**. It
therefore lands in the eager `common` chunk — 79.6 KB minified in the last build, by far
the largest non-vendor chunk. Every visitor to any page downloads the full SEO payload
(description, ≥5 keywords, `howToUse` array, `useCase`) for all 34 tools in order to
render meta tags for the one page they asked for.

Nothing else in the architecture has this property: tool modules are lazily globbed,
FFmpeg loads inside `processFile()`, models stream from R2 on demand. Metadata is the
sole component whose cost to a first-time visitor scales linearly with the size of the
catalog — and the roadmap is "add more tools".

**Fix — split by consumer, not by size budget.** The runtime needs only
`{id, name, icon, category, canonicalPath}` for routing, cards and search. The SEO
payload is needed only to generate meta tags — and for the entry page it is *already
inlined by the prerenderer*, so shipping it eagerly is pure duplication. Split
`metadata.js` into a small always-loaded index plus a lazily-imported SEO map, fetched
only on client-side navigation.

A size budget in CI is still worth adding, but it treats the symptom; the split removes
the growth.

---

## Theme 7 — Dependency hygiene

- **`js-yaml@4.3.0` — high severity, ships to the browser.** Quadratic CPU consumption in
  `!!omap` resolution (GHSA-5p4m-2wfm-xmqj); the fix was not backported to 4.x. This is a
  runtime dependency bundled into `vendor-js-yaml` (43.9 KB) and consumed by
  [`text/yaml.js`](../src/text/yaml.js), a tool whose entire purpose is parsing pasted
  YAML. Impact is bounded (a user can only wedge their own tab) but it is a live advisory
  on shipped code. 5.x is available; the tool uses only `load`/`dump`, so the migration
  is small. **This is also the tool with no test** — write one first, then upgrade.
- **`@ffmpeg/core-mt` is still in `dependencies`** despite being explicitly banned in
  `CLAUDE.md`. A dependency that is installed but forbidden is a trap for exactly the
  reader who checks `package.json` before checking the docs. Remove it.
- **`@ffmpeg/core` belongs in `devDependencies`** — nothing imports it; it is only a file
  source for `scripts/copy-ffmpeg-files.mjs`.
- Three further advisories (`browserslist`, `nanoid`, `postcss-selector-parser`) are
  dev-only and clear with `npm audit fix`.

---

## Recommended sequence

Ordered so that each step protects the ones after it.

| # | Change | Why this position | Effort |
|---|---|---|---|
| 1 | Contract rules: no CDN/HF URLs outside the registry; no floating versions; no `main` revisions | Makes every later fix permanent instead of re-litigable | S |
| 2 | Fix the three `ml-loader` recovery defects (3a–3c) | Smallest diff, largest reliability gain, no design decisions needed | S |
| 3 | Pin `tesseract.js`; mirror the MediaPipe WASM root | Step 1 will already be failing on these | S |
| 4 | Revoke object URLs in `Tool.destroy()` | Base-class change — do it before more tools are written against the helpers | S |
| 5 | Migrate `transcribe.js` to `ml-loader` + `whisper-base` | The big one; steps 1–2 make it safe, and it deletes v2 Transformers.js | M |
| 6 | `js-yaml` 5.x — with a `text/yaml` test written first | Closes the only browser-shipped advisory | S–M |
| 7 | Tests for `face_detect`, `image2text`, `yaml` | Highest risk × zero coverage | M |
| 8 | Split `metadata.js` into runtime index + lazy SEO map | Structural, no incident pressure, do it deliberately | M |
| 9 | Drop `@ffmpeg/core-mt`; move `@ffmpeg/core` to devDeps; `npm audit fix` | Pure cleanup | XS |

Steps 1–4 and 9 are a single afternoon and remove most of the outstanding *silent
failure* surface. Steps 5–8 are the real architectural work.

---

## What I would deliberately NOT do

- **Do not remove the FFmpeg CDN fallback chain.** The earlier draft of this review
  suggested it. On reflection the fallback is the only thing standing between a bad
  deploy of `/public/ffmpeg/` and every video tool being dead; a version assertion at
  load time gets the safety without giving up the redundancy.
- **Do not mirror all five whisper variants.** ~400 MB of storage to preserve a dropdown,
  when `whisper-base` is already mirrored and covers the use case.
- **Do not introduce a framework, a state library, or a component abstraction.** The
  `Tool` base class plus the metadata registry is a good fit for 34 independent tools,
  and the browser-local constraint is the product. Every problem above is a missing
  *check* or a misplaced *responsibility*, not a missing abstraction.
