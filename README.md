# SafeWebTool

Free, open-source browser tools that process everything locally — your files never leave your device.

**[safewebtool.com](https://safewebtool.com)**  [![Netlify Status](https://api.netlify.com/api/v1/badges/1f7a6d52-4a4b-489c-9cd1-7131562cc8b1/deploy-status)](https://app.netlify.com/sites/safewebtool/deploys)

## Tools

**Video** — trim, resize, reverse, re-encode, convert to GIF, convert to MP4, add/remove audio, extract metadata

**Image** — resize, compress, crop, rotate, format convert, passport photo maker

**Text** — JSON formatter, YAML validator, Base64, URL encode/decode, word count, remove extra spaces, rich text editor, LaTeX to PDF, AI grammar fix, AI summarizer, AI tone rewriter

**ML** — OCR, audio/video transcription, text to speech, face detection

**Time** — timer, timezone converter, meeting planner, date duration, business days

## Why

- **No uploads.** Everything runs in your browser — WebAssembly, Canvas, and on-device ML models.
- **No login, no ads, no paywall.**
- **Open source.**

## Development

```bash
npm install
npm run dev
```

```bash
npm run build          # production build
npm run test:contract  # fast contract check
npm run verify:full    # full regression suite
```

## Contributing

1. Fork, clone, `npm install && npm run dev`
2. Read **[CLAUDE.md](CLAUDE.md)** — the contributor guide. It has the 5-step workflow for
   adding a tool, the rules that keep the site private and indexable, and which tests to
   run for which change.
3. Branch, change, `npm run test:contract`
4. Open a PR — Netlify generates a preview automatically

Adding a tool takes one command and a metadata entry; routing, canonical URLs, the
sitemap and the agent manifests all derive from it automatically:

```bash
npm run scaffold:tool -- image/my-tool --name="My Tool" --icon="🧰"
```
