# SafeWebTool

Free, open-source browser tools that process everything locally — your files never leave your device.

**[safewebtool.com](https://safewebtool.com)**  [![Netlify Status](https://api.netlify.com/api/v1/badges/1f7a6d52-4a4b-489c-9cd1-7131562cc8b1/deploy-status)](https://app.netlify.com/sites/safewebtool/deploys)

## Tools

**Video** — trim, resize, compress, reverse, re-encode, convert to GIF, extract audio, convert to MP4, get info

**Image** — resize, compress, crop, passport photo

**ML** — OCR (image to text), speech-to-text transcription, face detection

**Text** — JSON formatter, YAML validator, remove extra spaces, rich text editor

**Time** — timer, timezone converter, meeting planner, date difference, business days

## Why

- No uploads — all processing runs in your browser (WebAssembly + Canvas)
- No login, no ads, no paywall
- Open source

## Development

```bash
npm install
npm run dev
```

```bash
npm run build        # production build
npm run test:contract  # fast contract check (run after touching shared files)
npm run test:tool -- image/resize  # smoke test one tool
npm run verify:full  # full regression suite
```

## Adding a Tool

```bash
npm run scaffold:tool -- image/my-tool --name="My Tool" --icon="🧰"
```

Then implement the scaffolded function in `src/<category>/<toolId>.js` and refine the metadata entry in `src/common/metadata.js`. See [CLAUDE.md](CLAUDE.md) for the full guide.

Routing, canonical URLs, the sitemap and the agent manifests all derive from that metadata entry — adding a tool never requires touching them.

## Video tools — hard-won lessons

Two bugs made the video tools fail on real files while the test suite looked healthy. Both are fixed; don't reintroduce them.

- **Single-threaded FFmpeg core only.** `@ffmpeg/core-mt` is nominally 4–8× faster but *deadlocks mid-encode* — no error, no progress, hangs forever. It hit anyone on a cross-origin-isolated desktop browser. `0.12.10` is the latest MT build and is still affected, and self-hosting the wasm does not help: the bytes load fine, the deadlock is inside the compiled code. See the comment in [`src/video/ffmpeg-utils.js`](src/video/ffmpeg-utils.js).
- **`ffmpeg -i <file>` with no output always exits 1.** That's normal for a bare probe, but `executeFFmpeg` treats non-zero as failure, so `video/info` showed only filename/size/type for *every* file. Probe with `-vframes 1 -f null -`, which exits 0.

Testing video tools:

- FFmpeg loads lazily inside `processFile()` — **selecting a file downloads nothing**. Tests must click Process, or they wait forever for a log line that cannot appear.
- `tests/video-processing.spec.js` is a `serial` block: the first failing test blocks every later one from running at all. Check for "did not run" in the output, not just the failure count.
- Assert on real decoded output (codec, dimensions), not "a table exists" — the info table renders filename/size/type before FFmpeg runs, so weak assertions pass while the tool is broken.
- The committed fixtures are tiny and forgiving; a real 1080p clip is what exposed both bugs. Keep personal test videos out of git (see `.gitignore`).

## URLs & SEO

Pages are prerendered to flat `dist/<route>.html` files so each route is served at its short, extensionless URL (`/video/reencode`) with a 200 — no redirect. Canonical tags, `og:url`, JSON-LD and `sitemap.xml` must all use that exact URL; a canonical that points at a redirect is not indexable and once cost this site most of its Google coverage.

If you change the prerenderer, the sitemap, or anything that emits a URL, read [documentation/seo-and-urls.md](documentation/seo-and-urls.md) first — it has the invariants and the verification commands.

## Contributing

1. Fork and clone
2. `npm install && npm run dev`
3. Create a branch, make changes, run `npm run test:contract`
4. Open a PR — Netlify will generate a preview automatically
