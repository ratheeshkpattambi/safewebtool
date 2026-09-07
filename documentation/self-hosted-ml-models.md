# Self-hosted ML models

Model weights are mirrored to a Cloudflare R2 bucket (`safewebtool-models`) instead of
being fetched from Hugging Face at runtime. This is a runbook, not a history — see
`git log` for how it got this way.

## Why

Two reasons, both structural:

- **Availability.** A model loaded from someone else's repo at `main` breaks production
  when they re-quantise, with no deploy on our side. Every revision here is pinned to a
  commit SHA.
- **Cost.** R2 has zero egress fees on every tier. A ~90 MB model × 100k first-time
  loads is ~8.6 TB/month — free on R2, roughly $700/month on S3 or CloudFront. Storage
  and ops both sit inside the free tier.

## The rules

- **`src/common/ml-models.js` is the only place** a repo id, revision, dtype or file
  list may appear. Never hardcode a Hugging Face URL in a tool module or a script —
  import from the registry.
- **Every revision is a 40-char commit SHA, never `main`.**
- **Never set `env.remoteHost`.** It is global, so it would also redirect models we have
  *not* mirrored to R2, where they 404. The worker's fetch shim routes per repo instead.
- **Write credentials never leave `.env`.** Not in CI, not in Netlify, not client-side.
  The browser only ever does anonymous public GETs.

## Running a sync

```bash
npm run sync:models -- --dry-run     # show the plan, upload nothing
npm run sync:models -- whisper-base  # one model
npm run sync:models                  # everything
npm run sync:models -- --force       # re-upload even when sizes already match
```

Needs `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in `.env` (gitignored; Object Read &
Write, scoped to this one bucket). Files already present at the right size are skipped.
The script signs S3 requests with SigV4 using Node's built-in crypto — no AWS SDK.

Adding a model: add its entry to `MODELS` in `ml-models.js` with a pinned SHA and
`mirrored: true`, then run `npm run sync:models -- <key>`.

## How the rewrite works

`MODEL_HOST` comes from `VITE_MODEL_HOST` in `.env`; unset means "load from the Hub", so
a fresh clone works with no configuration. When it is set, a `fetch` shim installed
inside the ML worker rewrites Hub URLs to the mirror at their pinned revision, per repo.
`toMirrorUrl()` is injected into the worker verbatim via `.toString()` so there is
exactly one definition — the one the tests assert on.

The shim is not optional. `kokoro-js@1.2.1` **hardcodes** its voice URLs:

```
https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${v}.bin
```

and never consults `env`. Without the shim the model loads from the mirror while every
voice quietly comes from huggingface.co, defeating the entire point.

## Traps

- **`page.route` does not intercept Web Worker traffic.** An "expect no requests to
  huggingface.co" test written that way passes vacuously. Assert on `toMirrorUrl()` or
  on `response.url`.
- **The Cache API keys on the original Hub URL** even when the fetch was rewritten, so
  cache contents are not evidence of where bytes came from.
- **kokoro-js bundles its own copy of Transformers.js**, so the `env` configured in the
  worker does not apply to it — set `kokoro.env` separately.
- **kokoro-js rejects `q8f16`** with "Invalid dtype" even though that file exists in the
  repo. Valid: `auto, fp32, fp16, q8, int8, uint8, q4, bnb4, q4f16`.
- **The site is cross-origin isolated** (`COEP: require-corp`, for FFmpeg's
  SharedArrayBuffer). Cross-origin model fetches must satisfy CORS or the browser blocks
  them outright.

## Known gap: the r2.dev URL is temporary

The bucket is still served from its `r2.dev` development URL, which is rate-limited and
gets no CDN caching; Cloudflare documents it as development-only. A custom domain
(`models.safewebtool.com`) needs the zone in the same Cloudflare account, but
safewebtool.com's DNS is on Netlify NS1 — so it needs a nameserver move first.

**Do it before there is meaningful traffic:** switching the host invalidates every
cached weight, because the browser Cache API keys on the URL.
