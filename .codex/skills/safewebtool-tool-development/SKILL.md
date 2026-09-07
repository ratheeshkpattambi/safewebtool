---
name: safewebtool-tool-development
description: Use when adding, fixing, testing, or reviewing SafeWebTool browser-local tools in this repository, especially to keep tool modules thin, preserve routing/metadata contracts, choose targeted Playwright validation, and prepare Netlify-safe changes.
---

# SafeWebTool Tool Development

**Read [CLAUDE.md](../../../CLAUDE.md) in the repo root before implementing.** It is the
single source of truth for this repo: the 5-step tool workflow, the cardinal rules, the
"which test do I run" table, and copy-paste module templates.

Do not restate its guidance here — a second copy drifts out of date and agents then act
on the stale one.

## The short version

```bash
npm run scaffold:tool -- <category>/<tool-id> --name="Tool Name" --icon="🧰" --kind=file
npm run test:contract                          # always, first
npm run test:tool -- <category>/<tool-id>      # the tool you changed
npm run verify:full                            # shared files, or before a PR
```

Never edit `src/router.js` or `src/common/tool-registry.js` to add a tool — tools are
discovered from their module path plus a metadata entry in `src/common/metadata.js`.
