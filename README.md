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

## Contributing

1. Fork and clone
2. `npm install && npm run dev`
3. Create a branch, make changes, run `npm run test:contract`
4. Open a PR — Netlify will generate a preview automatically
