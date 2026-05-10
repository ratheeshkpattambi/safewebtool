# SafeWebTool

A collection of privacy-focused tools that process your data locally in your browser.

🌐 Visit the website: [https://safewebtool.com/](https://safewebtool.com/)

## Philosophy
- 🔒 **Privacy First**: Your media never leaves your computer. All processing happens locally in your browser.
- 🚫 **No Ads**: Completely ad-free experience.
- 🆓 **Free & Open Source**: Built with transparency and community in mind.
- 🤝 **Community Driven**: Contributions and feedback are welcome!

## Features
- Video processing tools
  - Video compression
  - Format conversion
  - Basic trimming
- Image editing capabilities
  - Image resizing
  - Format conversion
  - Basic filters
- Text manipulation utilities
  - Text formatting
  - Character/word counting
  - Case conversion

## Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Regenerate machine-readable agent discovery files
npm run generate:agent-manifest

# Build for production (standard)
npm run build

# Build for production (optimized, excludes test files)
npm run build:prod
```

## Testing
```bash
# Install Playwright browsers
npx playwright install

# Run tests (Chrome desktop and mobile only)
npm run test:chrome
```

## Agent-Friendly Discovery

SafeWebTool is designed for browser-local privacy. Agents should use browser automation for private media tools instead of sending user files to a remote service.

MCP should be treated as a read-only discovery layer for this project unless the MCP server is running locally on the user's machine. A remote MCP server should expose the catalog/resources, not process private images or videos.

Published discovery files:

- `/llms.txt` - concise agent index and privacy policy.
- `/tools.json` - full machine-readable tool catalog generated from metadata.
- `/<category>/<tool>/agent.json` - per-tool automation contract with inputs, outputs, privacy notes, and stable selectors.

The build and verification scripts regenerate these files from `src/common/metadata.js`, so the metadata remains the source of truth.

## Adding a New Tool

Use the scaffold and keep changes inside the standard tool boundary:

```bash
npm run scaffold:tool -- image/my-tool --name="My Tool" --icon="🧰"
```

When adding or changing a tool, update:

- `src/common/metadata.js` - required metadata entry. Add optional `agent` metadata only when the generated defaults are not specific enough.
- `src/<category>/<toolId>.js` - tool implementation.
- `index.html` - only if the tool should be promoted in the top navigation flyout.
- Focused tests in `tests/` when behavior needs more than the generic tool smoke.

Generated files, do not hand-edit:

- `public/llms.txt`
- `public/tools.json`
- `public/**/agent.json`

After metadata changes:

```bash
npm run generate:agent-manifest
npm run test:contract
npm run test:tool -- <category/toolId>
```

For routing, metadata, sitemap, or agent discovery changes, run:

```bash
npm run verify:fast
```

## Deployment
Automatically deployed to Netlify on push to main branch.

[![Netlify Status](https://api.netlify.com/api/v1/badges/1f7a6d52-4a4b-489c-9cd1-7131562cc8b1/deploy-status)](https://app.netlify.com/sites/safewebtool/deploys)

## How to Contribute

```bash
# Get started
git clone https://github.com/ratheeshkpattambi/safewebtool.git
cd safewebtool
npm install

# Development
npm run dev

# Test
npm run test:chrome
```

1. Create branch and implement your feature
2. Submit PR - Netlify will create a preview automatically
3. We'll review your PR within 2 days
