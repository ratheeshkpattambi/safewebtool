/**
 * Post-build prerender: write a static HTML file per route with the correct
 * <title>, meta, canonical, OG/Twitter and JSON-LD already in the markup, plus
 * a real sitemap.xml. The site is a client-rendered SPA, so without this every
 * route serves the generic homepage HTML to crawlers and social unfurlers.
 *
 * The client router (updateMetadata in src/router.js) removes every
 * data-static-seo tag and every JSON-LD script on first render and re-adds the
 * correct ones, so these prerendered tags are replaced cleanly for real users —
 * they exist purely so non-JS crawlers see the right metadata and content.
 *
 * Runs after `vite build` (needs dist/index.html with hashed asset tags).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  baseUrl,
  siteInfo,
  categories,
  tools,
  routeAliases,
  getToolMetadata,
  getCategoryMetadata,
  generateMetaTags,
  generateStructuredData
} from '../src/common/metadata.js';
import { generateSitemap } from '../src/common/sitemap.js';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const escapeHtml = (value = '') =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Every route to prerender: { url: path passed to the router, file: output path }
const routes = [
  { url: '/', file: 'index.html' },
  ...Object.keys(categories).map(id => ({ url: `/${id}`, file: `${id}/index.html` })),
  ...Object.keys(tools).map(key => ({ url: `/${key}`, file: `${key}/index.html` })),
  ...Object.keys(routeAliases).map(alias => ({ url: alias, file: `${alias.slice(1)}/index.html` }))
];

// SEO <head> for a route: tag each node so the client router replaces it.
function headFor(url) {
  // Tag meta/link so the client router removes them; the title is handled
  // separately by the router (by text), so it stays an untagged single tag.
  const meta = generateMetaTags(url)
    .replace(/<meta /g, '<meta data-static-seo="true" ')
    .replace(/<link /g, '<link data-static-seo="true" ');

  const parts = url.split('/').filter(Boolean);
  const toolKey = parts.length === 2 ? (routeAliases[url] || parts.join('/')) : null;
  return meta + (toolKey ? generateStructuredData(toolKey) : '');
}

// Minimal crawlable body so the page isn't a thin/empty shell pre-JS.
function bodyFor(url) {
  const parts = url.split('/').filter(Boolean);
  if (parts.length === 0) {
    return `<h1>${escapeHtml(siteInfo.name)}</h1><p>${escapeHtml(siteInfo.description)}</p>`;
  }
  if (parts.length === 1) {
    const category = getCategoryMetadata(parts[0]);
    return category ? `<h1>${escapeHtml(category.name)}</h1><p>${escapeHtml(category.description)}</p>` : '';
  }
  const tool = getToolMetadata(routeAliases[url] || parts.join('/'));
  if (!tool) return '';
  const useCase = tool.useCase ? `<p>${escapeHtml(tool.useCase)}</p>` : '';
  return `<h1>${escapeHtml(tool.name)}</h1><p>${escapeHtml(tool.description)}</p>${useCase}`;
}

const raw = await readFile(path.join(distDir, 'index.html'), 'utf8');
// Strip the generic title + static SEO tags so each route gets its own.
const template = raw
  .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title>/i, '')
  .replace(/\s*<(?:meta|link)\b[^>]*\sdata-static-seo="true"[^>]*>/gi, '');

if (/data-static-seo/.test(template) || !/<main id="main-content"[^>]*>/.test(template)) {
  throw new Error('prerender: dist/index.html template not in the expected shape');
}

for (const { url, file } of routes) {
  const html = template
    .replace('</head>', `${headFor(url)}\n</head>`)
    .replace(/(<main id="main-content"[^>]*>)/, `$1\n${bodyFor(url)}`);
  const out = path.join(distDir, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html, 'utf8');
}

await writeFile(path.join(distDir, 'sitemap.xml'), generateSitemap(baseUrl), 'utf8');

console.log(`prerender: wrote ${routes.length} HTML pages + sitemap.xml`);
