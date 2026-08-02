# Self-Hosted ML Models on Cloudflare R2

Research date: 2026-08-01. Verified against the live Hugging Face API, the pinned
`@huggingface/transformers` bundle, and the `kokoro-js` package source.

**In one line:** mirror exactly two model repos to a Cloudflare R2 bucket, point
Transformers.js at it with one `env` line, and ship Kokoro TTS as a new tool while
moving the existing transcribe tool off third-party CDNs.

---

## Two production outages this work uncovered

Both were live on safewebtool.com and both are the *same failure class* — an unpinned
third-party reference changing under us, with no deploy on our side. They are the
strongest possible argument for everything else in this document.

**1. The Transformers.js CDN URL was broken.** `ml-loader.js` imported
`@huggingface/transformers@3/dist/transformers.web.min.js`. That build contains a bare
`import ... from "onnxruntime-common"` which no browser can resolve, so the worker died
on startup and `text/summarize`, `text/tone` and `text/grammar-fix` all reported
"ML worker crashed". Fixed by pinning jsdelivr's `+esm` endpoint, which rewrites bare
specifiers: `@huggingface/transformers@3.6.3/+esm`. **The `/dist/` file does not work.**

**2. The SmolLM2 model repos vanished.** The same three tools requested
`onnx-community/SmolLM2-135M-Instruct` and `-360M-Instruct`, which now return **401**.
Fixed by pointing at `HuggingFaceTB/SmolLM2-*-Instruct` with pinned SHAs in
`ml-models.js`.

Neither was caught by the test suite, because both tools' pages rendered perfectly.
This is precisely the "test asserts an element exists while the tool is broken" trap
CLAUDE.md warns about.

---

## RESUME HERE (next session)

As of 2026-08-01 the R2 mirror is live, and **`ml/text-to-speech` ships on it**.
`ml/transcribe` has NOT yet been migrated — that is the next unit of work.

**Nothing is committed.** `git status` will show new files (`src/common/ml-models.js`,
`scripts/sync-models-to-r2.mjs`, `.env.example`, this doc) and modified ones
(`CLAUDE.md`, `package.json`, `documentation/improvement-plan.md`). `.env` holds live R2
credentials and is gitignored — confirm it stays untracked before any commit.

### Done since the last handoff

- `ml-loader.js` wired to the registry: pinned revisions, per-model dtype, the fetch
  shim, and a `text-to-speech` task backed by kokoro-js.
- **`ml/text-to-speech` shipped** — Kokoro q8, 10 voices, WAV download, verified
  end-to-end producing decodable non-silent audio from the mirror.
- Both production outages above fixed.
- `MODELS` entries now carry `mirrored: true|false`, so the registry can pin a revision
  for a model we have NOT mirrored (see the SmolLM2 pair).

### The next task, in order

1. **Migrate `src/ml/transcribe.js` to `whisper-base`** from the registry, replacing the
   five hardcoded `Xenova/whisper-*` options. Weights are already mirrored.
   **Open question — ask the user:** collapse the dropdown to two options (mirroring
   more variants costs ~400 MB), or mirror all five and keep the current choices?
   Still unresolved.
2. **Decide whether to mirror the SmolLM2 pair.** They are pinned but still load from
   the Hub (`mirrored: false`), so the availability risk remains for those three tools.
   ~390 MB for the 360M at q4 is the reason it was deferred, not an oversight.
3. **Custom domain** (§6 step 5). Note this invalidates every cached weight, since the
   browser Cache API keys on URL — do it before there is meaningful traffic.
4. **Add the `test:contract` assertion** rejecting any model revision equal to `main`.

**When changing `ml-loader.js`, run `npm run verify:full`** — it is shared by
summarize, tone, grammar-fix and text-to-speech.

### Traps worth knowing before you touch this

- **`page.route` does NOT intercept Web Worker traffic.** An "expect no requests to
  huggingface.co" test passes vacuously. Assert on `toMirrorUrl` instead.
- **The Cache API keys on the ORIGINAL Hub URL** even when the fetch was rewritten, so
  cache contents are not evidence of where bytes came from. Use `response.url`.
- **Never set `env.remoteHost` globally.** It would also redirect unmirrored models
  (SmolLM2) to R2, where they 404. The fetch shim routes per repo instead.
- **kokoro-js bundles its own Transformers.js**, so the `env` imported in the worker
  does not configure it.
- **kokoro-js rejects `q8f16`** with "Invalid dtype" despite that file existing in the
  repo. Valid: auto, fp32, fp16, q8, int8, uint8, q4, bnb4, q4f16.

---

## 0. Current state — read this first

Last updated 2026-08-01.

### Done

| Thing | Value / evidence |
|---|---|
| R2 bucket | `safewebtool-models`, Western North America (WNAM), Standard class |
| CORS policy | Applied **and verified live** — see the curl check below |
| Public dev URL | `https://pub-1999bbae870e4b1a836cfc573330d2e4.r2.dev` (temporary, see §0.1) |
| Model registry | [`src/common/ml-models.js`](../src/common/ml-models.js) — 2 models, revisions pinned |
| Sync script | [`scripts/sync-models-to-r2.mjs`](../scripts/sync-models-to-r2.mjs), `npm run sync:models` |
| Credentials | `.env` (gitignored) — template committed at `.env.example` |
| API token | `safewebtool-models-sync`, Object Read & Write, scoped to this bucket only |
| **whisper-base mirrored** | 12 files, 81.3 MB, verified byte-identical to the Hub (SHA-256) |

CORS is confirmed working, not merely saved:

```bash
curl -sI -H "Origin: https://safewebtool.com" \
  "https://pub-1999bbae870e4b1a836cfc573330d2e4.r2.dev/probe.txt" \
  | grep -i "access-control"
```

Expect `Access-Control-Allow-Origin: https://safewebtool.com` plus
`Access-Control-Expose-Headers`. A disallowed origin must return **no** ACAO header.

> **The dashboard lies about saving.** The Cloudflare CORS editor froze mid-save once
> and showed no error, yet the policy was never applied. Always verify with the curl
> above rather than trusting the green success banner.

All 26 mirrored files were confirmed to exist at their pinned SHAs (77.9 MB for
whisper-base, 91.3 MB for kokoro-82m).

Verification actually run against the mirror (not just the dashboard):

```bash
HOST=https://pub-1999bbae870e4b1a836cfc573330d2e4.r2.dev
BASE=onnx-community/whisper-base/resolve/1846881b6b3a3024392c1eea3ad983695bc23925
curl -sI -H "Origin: https://safewebtool.com" "$HOST/$BASE/config.json"
```

→ `200`, `Access-Control-Allow-Origin: https://safewebtool.com`,
`Cache-Control: public, max-age=31536000, immutable`. A disallowed Origin gets no ACAO.
The mirrored encoder's SHA-256 matches the Hub's exactly, and a second
`npm run sync:models` skips all 12 files rather than re-uploading.

### Not done yet

- **kokoro-82m not mirrored** — `npm run sync:models -- kokoro-82m` (~91 MB) when the
  TTS tool is being built.
- **No custom domain.** `safewebtool.com` DNS is on NS1 (Netlify DNS), not Cloudflare.
  R2 custom domains require the zone in the same Cloudflare account, and the
  partial/CNAME workaround is Business-plan-only. Either move the nameservers or use a
  different domain that is on Cloudflare. Until then the r2.dev URL is the only host.
- **No tool consumes the mirror yet.** `ml/transcribe` still points at `Xenova/whisper-*`.
- **`ml-loader.js` does not set `env.remoteHost`** and has no fetch shim (§4.4).
- **No `ml/text-to-speech` tool.**

### 0.1 The r2.dev URL is temporary

It is rate-limited, gets no CDN caching, and Cloudflare documents it as
development-only. It exists so the whole path could be proven on localhost **before**
touching safewebtool.com's DNS. Disable it once a custom domain is connected.

### 0.2 How to run the sync

```bash
npm run sync:models -- --dry-run    # show the plan, upload nothing
npm run sync:models -- whisper-base # one model
npm run sync:models                 # everything
```

Needs `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in `.env` (Object Read & Write,
scoped to this one bucket). The script skips files already present at the right size;
`--force` re-uploads. It signs S3 requests with SigV4 using Node's built-in crypto —
no AWS SDK — and the key derivation is checked against AWS's published test vector.

**Never put these credentials in CI, Netlify, or anything client-side.** They are write
credentials; the browser only ever does anonymous public GETs.

---

## 1. Why self-host at all

Today every ML tool fetches weights from someone else's CDN at runtime:

| Tool | Weights come from | Repo pinned? |
|---|---|---|
| `ml/transcribe` | `Xenova/whisper-*` on huggingface.co | no — tracks `main` |
| `ml/image2text` | huggingface.co | no |
| `text/summarize`, `text/tone` | `onnx-community/SmolLM2-360M-Instruct` | no |
| `text/grammar-fix` | `onnx-community/SmolLM2-135M-Instruct` | no |
| `ml/face_detect` | `storage.googleapis.com/mediapipe-models` | yes (versioned path) |

Four problems, in priority order:

1. **No pinning.** `env.allowLocalModels = false` plus a bare repo id resolves against
   `main`. If a repo owner re-quantises or renames a file, the tool breaks in production
   with no deploy on our side. This is the same class of failure as the canonical-URL
   outage in [seo-and-urls.md](seo-and-urls.md): healthy-looking site, silently broken.
2. **Third-party availability.** An HF Hub incident takes down five SafeWebTool tools.
3. **Rate limiting.** The Hub throttles anonymous traffic. We have no visibility into
   how close we are.
4. **Weak privacy story.** "Your files never leave your browser" is true, but the browser
   still tells huggingface.co which tool the visitor opened. Serving weights from our own
   origin closes that gap without changing the architecture.

R2 fixes all four and, at our scale, costs nothing.

### Cost

| Line item | R2 price | Our usage | Cost |
|---|---|---|---|
| Standard storage | $0.015/GB-month (10 GB free) | ~0.2 GB for both models | **$0** |
| Class B ops (GET) | $0.36/M (10 M free) | ~4 requests per model load | **$0** |
| Egress | **free, all tiers** | 86 MB × every first-time load | **$0** |

Egress is the whole argument. 100k Kokoro loads/month is ~8.6 TB — free on R2, roughly
$700+/month on CloudFront or S3. Storage and ops both sit inside the free tier for the
foreseeable future, so the realistic bill is $0 until this is a much bigger site.

---

## 2. How Transformers.js resolves a model URL

Verified by grepping the exact bundle `ml-loader.js` loads
(`@huggingface/transformers@3.6.3/dist/transformers.web.min.js`):

```js
remoteHost:         "https://huggingface.co/"
remotePathTemplate: "{model}/resolve/{revision}/"
```

So `pipeline('text-generation', 'onnx-community/SmolLM2-360M-Instruct')` fetches
`https://huggingface.co/onnx-community/SmolLM2-360M-Instruct/resolve/main/config.json`,
then `.../onnx/model_q4.onnx`, and so on.

**Mirror that path shape verbatim into R2 and the client change is two lines:**

```js
env.remoteHost = 'https://models.safewebtool.com/';
// remotePathTemplate left at its default: "{model}/resolve/{revision}/"
```

Keeping the default template means R2 object keys look like
`onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_q8f16.onnx`. Slightly ugly,
but it makes the sync script a dumb copy and lets us fall back to the Hub by flipping one
constant. **Pin `revision` to a commit SHA rather than `main`** so the mirrored path is
immutable and cacheable forever.

Transformers.js already caches downloaded weights in the Cache API
(`env.useBrowserCache` defaults on), so the R2 fetch happens once per browser per model.
No custom `CacheStorage` code is needed — §5.1 of the improvement plan is half-solved by
the library.

---

## 3. The two models

Constraint from the brief: **two models, practical, works 100%, SOTA for the size.**

### Model 1 — Kokoro-82M v1.0 (text-to-speech) → new tool `ml/text-to-speech`

`onnx-community/Kokoro-82M-v1.0-ONNX` — Apache 2.0, 1.39 M downloads, 240 likes.

Verified file sizes from the Hub API:

| dtype | Size | Notes |
|---|---|---|
| `fp32` | 325.5 MB | reference quality |
| `q4f16` | 154.6 MB | |
| **`q8f16`** | **86.0 MB** | **recommended** — best quality-per-byte |
| `quantized` (q8) | 92.4 MB | |

Plus `config.json` and `tokenizer.json` (both < 1 MB) and 54 voice files at 0.5 MB each,
covering American/British English, Spanish, French, Hindi, Italian, Japanese,
Brazilian Portuguese and Mandarin.

**Ship with ~10 voices (5 MB), not all 54.** Total hosted footprint: **~92 MB.**

Why this one:
- Single-file ONNX. No `.onnx_data` external-data split, which is the main source of
  loading bugs (see §5).
- `kokoro-js@1.2.1` depends on `@huggingface/transformers@^3.5.1` — **satisfied by our
  existing `^3.6.3` pin.** No Transformers.js v4 migration required to ship this.
- Runs on WASM today; WebGPU is an opt-in flag, not a requirement. Mobile Safari works.
- Apache 2.0, so commercial use and redistribution to our own R2 bucket are both fine.

**On your comparison table** — three corrections worth having before you commit:

- **Kokoro is not 305 MB.** 305 MB is the `q4` file, which is an odd artefact (q4 is
  *larger* than q8f16 here). Ship `q8f16` at **86 MB** — a 3.5× smaller download for
  equal or better quality.
- **Piper is GPLv3, not MIT**, and has no official browser runtime. Copyleft on a
  weights-shipping web app is a licence question you do not want; I'd drop it.
- **Supertonic appears to be MIT and free for commercial use**, not proprietary as your
  table has it. Worth re-checking directly against its repo before ruling it in or out —
  my source here was secondary, not the project itself.
- **Kitten TTS (24 MB, Apache 2.0)** is real and genuinely tiny, but
  `KittenML/kitten-tts-nano-0.1` ships a bare `.onnx` with no Transformers.js wrapper. You
  would own the phonemiser plumbing yourself. Good phase-3 candidate for a
  "fast/low-bandwidth" toggle; wrong choice for the first TTS tool.

### Model 2 — Whisper base (speech-to-text) → migrate existing `ml/transcribe`

`onnx-community/whisper-base`, `encoder_model_quantized.onnx` (23.2 MB) +
`decoder_model_merged_quantized.onnx` (53.7 MB) + tokenizer/config ≈ **80 MB**.

This is deliberately *not* a new capability. It is the de-risking step:

- `ml/transcribe` currently offers five `Xenova/whisper-*` options, an account that has
  been superseded by `onnx-community`. Migrating pins us to a maintained repo.
- It exercises the entire R2 path — CORS, cache headers, sync script, fallback — on a
  model whose behaviour in this codebase is already known-good. If R2 hosting has a
  problem, we find it here rather than while debugging a brand-new tool.
- Collapsing five dropdown options to one good default (plus one multilingual) is a UX
  win and cuts the mirror from ~400 MB to ~80 MB.

Ship order: **Whisper migration first, Kokoro second.**

### Explicitly not now

| Candidate | Verified size (q4f16) | Why not first |
|---|---|---|
| `onnx-community/LFM2-350M-ONNX` | 255 MB, **split `.onnx_data`** | Best real upgrade path for summarize/tone/grammar-fix — one model replacing SmolLM2 135M *and* 360M. But external-data loading over a custom `remoteHost` is unproven for us. Phase 3, after R2 is boring. |
| `onnx-community/Qwen3-0.6B-ONNX` | 570 MB single-file | 6.6× Kokoro's download for a *worse* fit; it is also a reasoning model that emits `<think>` blocks, which needs output post-processing. |
| `onnx-community/Qwen3.5-0.8B-ONNX` | ~646 MB across 3 graphs + `.onnx_data` | It is a VLM (vision encoder + embed + decoder). Impressive, wrong tool for a utility site. |
| `onnx-community/gemma-3-270m-it-ONNX` | 273 MB + 20 MB tokenizer, split data | 270M-it is tuned for fine-tuning, weak as a general instruct model. |

---

## 4. Implementation

### 4.1 R2 bucket

Bucket `safewebtool-models`, custom domain `models.safewebtool.com`.

CORS policy (`cors.json`), applied with
`npx wrangler r2 bucket cors set safewebtool-models --file cors.json`:

```json
[
  {
    "AllowedOrigins": ["https://safewebtool.com", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "ETag", "Accept-Ranges"],
    "MaxAgeSeconds": 86400
  }
]
```

`ExposeHeaders` matters: ONNX Runtime issues Range requests for large graphs and reads
`Content-Length` to drive the progress callback. Omitting these produces a working
download with a dead progress bar.

Every object gets `Cache-Control: public, max-age=31536000, immutable`. Safe because the
revision SHA is in the path — a new model version is a new key, never an overwrite.

### 4.2 Sync script — built

[`scripts/sync-models-to-r2.mjs`](../scripts/sync-models-to-r2.mjs), run manually (never
in CI — these are ~90 MB uploads with write credentials).

- Reads the file list from `ml-models.js`. It mirrors **only the files we actually
  serve** — do not mirror whole repos; Kokoro alone is 1.6 GB of unused dtypes.
- Downloads from the Hub at the pinned SHA, uploads to `<repo>/resolve/<sha>/<file>`.
- Sets `Cache-Control: public, max-age=31536000, immutable` on every object. Safe
  because the SHA is in the path — a new version is a new key, never an overwrite.
- Skips objects already present at the right size; `--force` overrides.
- Every mirrored file is well under R2's 300 MB single-PUT limit, so there is no
  multipart path to maintain. **If you ever add a file over 300 MB, this breaks** —
  that is another reason to prefer single-file, modestly-quantised models.

### 4.3 Client config — `src/common/ml-models.js` — built

One module owning every model id, revision, dtype and file list. Same rule as
`getCanonicalPathForToolPath()` in `metadata.js`: **one source of truth, never re-derived
in a second place.** The CDN/URL duplication that broke indexing is the precedent.

Host switching is via `VITE_MODEL_HOST`:

- Set → weights come from the mirror.
- Unset → falls back to `https://huggingface.co/`.

`import.meta.env` is undefined under plain Node, so the sync script imports the same
module without a shim and simply sees the Hub fallback.

**Still to do:** `ml-loader.js`'s worker source must set `env.remoteHost = MODEL_HOST`
before the first `pipeline()` call, and pass `revision`/`dtype` from
`getPipelineOptions()`. It currently hardcodes `dtype: 'q4'` and no revision.

### 4.4 The kokoro-js gotcha — verified, must be handled

`kokoro-js@1.2.1` **hardcodes** its voice URLs. From the shipped `dist/kokoro.web.js`:

```
https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${e}.bin
```

`env.remoteHost` does **not** cover this — it only governs Transformers.js's own
`getModelFile`. Set `remoteHost` to R2 and the model loads from R2 while every voice
still comes from huggingface.co, which quietly defeats the entire point.

Fix: a URL-rewriting `fetch` shim installed inside the ML worker, before any model loads.

```js
// in the worker, before the first import/pipeline call
const HF = 'https://huggingface.co/';
const MIRROR = 'https://models.safewebtool.com/';
const nativeFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  return url.startsWith(HF)
    ? nativeFetch(MIRROR + url.slice(HF.length), init)
    : nativeFetch(input, init);
};
```

Six lines, scoped to the worker, and it future-proofs any other library that hardcodes a
Hub URL. It also means `env.remoteHost` becomes belt-and-braces rather than load-bearing.

kokoro-js is Apache 2.0, so vendoring a patched copy is the fallback if the shim ever
proves insufficient.

### 4.5 Tests

- Extend `test:contract` to assert every model id in `ml-models.js` has a pinned revision
  (no `main`) — cheap, catches the class of bug in §1.1.
- A Playwright spec asserting the transcribe and TTS tools issue **zero** requests to
  `huggingface.co` — this is the regression test for §4.4, and the only way the shim stays
  correct. Use `page.route`/`read_network_requests` and fail on any Hub hostname.
- Per CLAUDE.md: assert on **real output** (non-empty audio buffer, actual transcript
  text), never merely that an element exists.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Voice files silently still hit the Hub (§4.4) | The zero-Hub-requests network assertion above. This is the one that will actually bite. |
| R2 custom domain misconfigured → CORS failure only in prod | Verify against the deployed origin before flipping the client constant; keep the Hub fallback one constant away. |
| Mirrored file drifts from the Hub | Pin to a commit SHA and store the expected byte size in `ml-models.js`; the sync script verifies it. |
| 86 MB download on mobile data | Show size and a real progress bar before download starts, and require an explicit click (already the pattern — FFmpeg and SmolLM2 both load lazily inside the process handler). |
| External-data (`.onnx_data`) models later | Out of scope by design. Prove the single-file path first; LFM2 is phase 3. |

---

## 6. Sequence

1. ~~Create bucket + CORS. Verify a cross-origin `GET`.~~ **Done** — see §0.
2. ~~Add `src/common/ml-models.js` and `scripts/sync-models-to-r2.mjs`.~~ **Done.**
3. **← you are here.** Add the R2 API token to `.env`, then
   `npm run sync:models -- whisper-base` (~78 MB).
4. Wire `ml-loader.js` to `MODEL_HOST` + `getPipelineOptions()`. Point `ml/transcribe`
   at the mirror; collapse the five-option dropdown to two. Run `npm run dev` and
   transcribe `tests/fixtures/sample.mp3` — this proves CORS, COEP and the fetch path
   together. Add the zero-Hub-requests spec. **Ship.** R2 is now proven.
5. Custom domain: move DNS to Cloudflare (or use another zone), connect
   `models.safewebtool.com`, update `R2_PUBLIC_HOST` + `VITE_MODEL_HOST`, disable the
   r2.dev URL. Note this invalidates every cached weight, since the browser Cache API
   keys on URL — do it before there is meaningful traffic.
6. `npm run sync:models -- kokoro-82m` (~91 MB).
7. Scaffold `ml/text-to-speech` (`--kind=text`), add the fetch shim to the worker,
   wire up `kokoro-js`, voice picker, WAV download.
8. Fill SEO metadata, regenerate manifests, `verify:full`. **Ship.**

Steps 3–5 are independently valuable even if Kokoro never happens.

## Sources

- [Transformers.js repo](https://github.com/huggingface/transformers.js) and [env configuration reference](https://github.com/huggingface/skills/blob/main/skills/transformers-js/references/CONFIGURATION.md)
- [onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) · [kokoro-js on npm](https://www.npmjs.com/package/kokoro-js) · [Xenova's Kokoro.js announcement](https://huggingface.co/posts/Xenova/503648859052804)
- [onnx-community/whisper-base](https://huggingface.co/onnx-community/whisper-base) · [onnx-community/Qwen3-0.6B-ONNX](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX) · [onnx-community/LFM2-2.6B-ONNX](https://huggingface.co/onnx-community/LFM2-2.6B-ONNX)
- [KittenML/kitten-tts-nano-0.1](https://huggingface.co/KittenML/kitten-tts-nano-0.1) · [tts-studio (browser TTS comparison harness)](https://github.com/clowerweb/tts-studio)
- [R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/) · [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- TTS licence/quality comparisons: [Picovoice on-device TTS benchmark](https://picovoice.ai/blog/on-device-tts/) · [OfflineTTS browser TTS showdown](https://offlinetts.com/blog/browser-tts-showdown-kokoro-piper-kitten/)
