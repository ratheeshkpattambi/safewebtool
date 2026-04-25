---
name: safewebtool-tool-development
description: Use when adding, fixing, testing, or reviewing SafeWebTool browser-local tools in this repository, especially to keep tool modules thin, preserve routing/metadata contracts, choose targeted Playwright validation, and prepare Netlify-safe changes.
---

# SafeWebTool Tool Development

Use this skill for tool work in this repo.

## First Read

Read `documentation/tool-architecture-playbook.md` before implementing. It is the source of truth for scalable tool boundaries, focused tests, and deployment checks.

## Default Workflow

1. Identify the affected tool path: `category/toolId`.
2. Run `npm run test:contract` before browser tests if metadata or modules changed.
3. For one-tool changes, run:

```bash
npm run test:tool -- <category/toolId>
```

4. Add `--mobile --real` for tools that process real files.
5. Run `npm run verify:fast` for shared metadata/router/shell changes.
6. Run `npm run verify:full` for routing, base/upload utilities, FFmpeg helpers, multiple tools, or pre-PR confidence.

## Add Tool

Start with:

```bash
npm run scaffold:tool -- <category/toolId> --name="Tool Name"
```

Then add the printed metadata entry to `src/common/metadata.js`, implement the tool, and run the target command printed by the scaffold.

## Guardrails

- Do not edit `src/router.js` for normal tool additions.
- Preserve common IDs where possible: `dropZone`, `fileInput`, `processBtn`, `progress`, `logHeader`, `logContent`.
- Prefer extending `Tool` from `src/common/base.js`.
- Put shared behavior in `src/common/*`; do not make tools import each other.
- For video tools, keep logs/progress/output preview/download behavior consistent.
- For Netlify confidence, run `npm run verify:netlify`.
