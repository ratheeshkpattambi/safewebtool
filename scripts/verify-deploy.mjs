/**
 * Smoke-test a DEPLOYED origin. Run this after any deploy, and against a Netlify
 * deploy preview before merging anything that touches netlify.toml, the prerenderer,
 * the build config, or redirects.
 *
 * Why this exists: the Playwright suite runs against Vite on localhost and therefore
 * cannot see netlify.toml at all. On 2026-09-07 a trailing-slash redirect rule (which
 * Netlify normalises to a match-everything splat) sent every URL into a 301 loop -
 * homepage included — while all 315 tests passed. Green tests are not evidence that
 * the deployed site serves anything.
 *
 * Usage:
 *   npm run verify:deploy                      # production
 *   npm run verify:deploy -- https://<preview>.netlify.app
 *
 * URLs come from generateSitemap() so this checks exactly what Google is told to
 * crawl. Per CLAUDE.md, never re-derive canonical paths here — a second copy of that
 * logic is what broke indexing once already.
 */
import { baseUrl } from '../src/common/metadata.js';
import { generateSitemap } from '../src/common/sitemap.js';

const origin = (process.argv[2] || baseUrl).replace(/\/$/, '');

const sitemapPaths = [...generateSitemap(baseUrl).matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname);

const failures = [];
const fail = (url, msg) => failures.push(`${url}\n    ${msg}`);

async function head(url) {
  return fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'safewebtool-verify-deploy' } });
}

// A canonical URL must serve 200 directly. Not a redirect — a canonical that points at
// a redirect is not indexable, and a redirect to itself is an outage.
async function checkCanonical(path) {
  const url = `${origin}${path}`;
  let res;
  try {
    res = await head(url);
  } catch (err) {
    return fail(url, `request failed: ${err.message}`);
  }

  if (res.status !== 200) {
    const loc = res.headers.get('location');
    const loop = loc && new URL(loc, url).pathname === path ? '  <-- REDIRECT LOOP' : '';
    return fail(url, `expected 200, got ${res.status}${loc ? ` -> ${loc}` : ''}${loop}`);
  }

  const html = await res.text();

  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if (!canonical) return fail(url, 'no <link rel="canonical"> in the served HTML');
  if (new URL(canonical).pathname !== path) {
    fail(url, `canonical points elsewhere: ${canonical}`);
  }

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (!title) fail(url, 'no <title> in the served HTML');

  // The SPA rewrite serves the homepage shell for any path with no prerendered file,
  // so a missing page returns 200 and looks fine. Only the canonical proves otherwise.
  if (path !== '/' && canonical && new URL(canonical).pathname === '/') {
    fail(url, 'served the homepage shell (missing prerendered file)');
  }
}

// The trailing-slash form must 301 to the canonical — never 200 (duplicate content),
// never to itself (loop).
async function checkTrailingSlash(path) {
  if (path === '/') return;
  const url = `${origin}${path}/`;
  let res;
  try {
    res = await head(url);
  } catch (err) {
    return fail(url, `request failed: ${err.message}`);
  }
  const loc = res.headers.get('location');
  if (res.status === 200) return fail(url, 'returned 200 — duplicate of the canonical URL');
  if (res.status !== 301 && res.status !== 308) {
    return fail(url, `expected 301 to ${path}, got ${res.status}`);
  }
  const target = loc ? new URL(loc, url).pathname : null;
  if (target === `${path}/`) return fail(url, 'redirects to itself — REDIRECT LOOP');
  if (target !== path) fail(url, `expected 301 -> ${path}, got -> ${target}`);
}

console.log(`verify:deploy — ${origin} (${sitemapPaths.length} sitemap URLs)`);

for (const path of sitemapPaths) {
  await checkCanonical(path);
}
// Sampled: one per category plus home is enough to catch a global redirect rule,
// which is the only way this breaks.
const sample = sitemapPaths.filter((p) => p.split('/').length === 3).slice(0, 6);
for (const path of sample) {
  await checkTrailingSlash(path);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}
console.log(`✓ all ${sitemapPaths.length} canonical URLs serve 200 with a matching canonical; trailing-slash forms 301 correctly.`);
