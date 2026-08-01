# SEO & URL invariants

Written after an indexing outage in July 2026 that left 23 of 30 tool pages out of
Google's index for months. The failure was silent — the site worked perfectly for users,
every page returned content, and nothing in the test suite went red. Read this before
touching the prerenderer, the sitemap, canonical tags, or anything that emits a URL.

## What went wrong

`scripts/prerender.mjs` wrote every route to `dist/<route>/index.html`. Netlify serves a
directory index **only** at the trailing-slash URL, so:

```
https://safewebtool.com/video/mp4    -> 301 -> /video/mp4/
https://safewebtool.com/video/mp4/   -> 200
```

But the sitemap and every `<link rel="canonical">` pointed at the **bare** path. So every
canonical URL we handed Google was a redirect. A redirect cannot be indexed as a
canonical, so Google discarded our declaration, guessed for itself, and filed the pages
under *"Duplicate without user-selected canonical."* Search Console reported this as three
separate-looking problems (duplicates, pages with redirects, and pages "discovered but not
indexed"); all three were this one defect.

The fix: prerender writes flat `dist/<route>.html` files, which Netlify serves directly at
the short extensionless URL with a 200.

## The invariants

1. **A canonical URL must return 200.** Never point `<link rel="canonical">`, `og:url`,
   JSON-LD `url`/`item`, or a sitemap `<loc>` at a URL that redirects. This is the rule
   that was violated; everything below exists to keep it true.
2. **Canonicals are self-referential.** The canonical a page declares must be the URL that
   serves that page. The only exception is an intentional alias (see `routeAliases`), where
   both spellings declare the *same* canonical.
3. **The sitemap lists canonical URLs only, once each.** Never list both an alias and the
   tool path it aliases — that hands Google two URLs for one page, which is the duplicate
   problem in miniature.
4. **Short, extensionless URLs are canonical**: `/video/reencode`, never
   `/video/reencode/`. The trailing-slash form 301s to the short form.
5. **URLs come from `src/common/metadata.js`.** `getCanonicalPathForToolPath()` is the
   single source of truth. Do not re-derive canonical paths or alias maps anywhere else.

## Netlify serving model (the part that is easy to get wrong)

| On disk | Served at | Bare path behaviour |
|---|---|---|
| `video/mp4.html` | `/video/mp4` (200) | — the URL *is* the bare path |
| `video/mp4/index.html` | `/video/mp4/` (200) | `/video/mp4` **301s** to it |

A flat `.html` file also takes **precedence over a same-named directory**. That is what
lets `dist/video/mp4.html` and `dist/video/mp4/agent.json` coexist: `/video/mp4` serves the
page and `/video/mp4/agent.json` still serves the contract.

The SPA rewrite in `netlify.toml` (`/* -> /index.html`, status 200) is a *fallback*. If a
prerendered file is missing, the route silently serves the generic homepage shell with
homepage metadata instead of 404ing. That is why a broken prerender is invisible to users
and to smoke tests — always assert on the canonical/title, not just on a 200.

## Verifying before you push

`netlify dev` is more permissive than the production edge (it does not reproduce the
trailing-slash 301), so use it to check **file resolution**, and production to check
redirects. Serve the real build:

```bash
npm run build
npx netlify dev --dir dist --port 8910 --offline
```

Then cross-check every sitemap URL against the canonical it declares — this is the check
that would have caught the original bug:

```bash
for loc in $(grep -o '<loc>[^<]*</loc>' dist/sitemap.xml | sed 's/<[^>]*>//g'); do
  p="${loc#https://safewebtool.com}"
  code=$(curl -s -o /tmp/pg -w '%{http_code}' "http://localhost:8910$p")
  canon=$(grep -o 'rel="canonical" href="[^"]*"' /tmp/pg | head -1 | sed 's/.*href="//;s/"//')
  [ "$code" = "200" ] && [ "$canon" = "$loc" ] || echo "FAIL $p code=$code canonical=$canon"
done
```

After deploying, confirm the redirect direction on production:

```bash
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://safewebtool.com/video/mp4
# expect: 200 (NOT a 301)
```

`tests/seo-canonical.spec.js` pins these invariants in CI. Extend it rather than replacing
it when the URL scheme changes.

## Recommendations

- **Generate once, import everywhere.** The outage was compounded by
  `scripts/generate-sitemap.mjs` carrying a second, independent copy of the sitemap
  generator. The two drifted and emitted different URL sets — `public/sitemap.xml` and
  `dist/sitemap.xml` disagreed. If two files can answer "what is this page's URL,"
  they will eventually disagree. There is now one answer, in `metadata.js`.
- **Prefer central mechanisms over per-tool overrides.** A per-tool
  `agent.canonicalPath` existed that only restated what `routeAliases` already derived.
  Per-tool escape hatches do not scale to hundreds of tools and hide drift.
- **Do not fabricate structured data to silence a warning.** Search Console reports
  "missing video thumbnail" for tool pages, because the `<video>` elements are empty
  placeholders until the user picks a local file. There is no video for Google to index.
  Emitting `VideoObject` markup with a thumbnail would describe content that does not
  exist and risks a manual action. Add a real `poster` image or accept the warning — it
  does not block page indexing.
- **Treat a failing assertion as a question, not an obstacle.** Several tests here had
  rotted into asserting old behaviour (`header h1`, a removed search box, a stale heading).
  Rotted tests train you to ignore red, which is how a silent SEO regression survives.
- **Changing the URL scheme costs a recrawl cycle.** Google re-discovers on a multi-day
  cadence. Pick the canonical form deliberately and change it rarely. Keeping the short
  form preserved the crawl signals Google had already accumulated for those URLs.
- **After an indexing fix, ask the owner to hit "Validate Fix"** in Search Console and
  resubmit the sitemap. That acts on their Google account and a failed validation carries
  a cooldown, so it is not something to click automatically.
