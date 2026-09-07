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
  getToolEntries,
  generateMetaTags,
  generateStructuredData
} from '../src/common/metadata.js';
import { generateSitemap } from '../src/common/sitemap.js';
import { renderToolArticle } from '../src/common/tool-articles.js';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const escapeHtml = (value = '') =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Every route to prerender: { url: path passed to the router, file: output path }
//
// Routes are written as flat <route>.html files rather than <route>/index.html. Netlify
// serves a flat file at its extensionless path with a 200, whereas a directory index is
// only served at the trailing-slash URL and the bare path 301s to it. Writing directory
// indexes is what made every canonical URL a redirect, so Search Console reported
// "Duplicate without user-selected canonical" and left 23 of 30 tool pages unindexed.
// A flat file also takes precedence over a same-named directory, so the agent.json files
// under e.g. /video/resize/ keep resolving.
const routes = [
  { url: '/', file: 'index.html' },
  ...Object.keys(categories).map(id => ({ url: `/${id}`, file: `${id}.html` })),
  ...Object.keys(tools).map(key => ({ url: `/${key}`, file: `${key}.html` })),
  ...Object.keys(routeAliases).map(alias => ({ url: alias, file: `${alias.slice(1)}.html` }))
];

// SEO <head> for a route: tag each node so the client router replaces it.
function headFor(url) {
  // Tag meta/link so the client router removes them; the title is handled
  // separately by the router (by text), so it stays an untagged single tag.
  const meta = generateMetaTags(url)
    .replace(/<meta /g, '<meta data-static-seo="true" ')
    .replace(/<link /g, '<link data-static-seo="true" ');

  return meta + generateStructuredData(url);
}

// Crawlable body for a route.
//
// This is the site's ENTIRE link graph as far as a non-JS crawler is concerned. The
// client router replaces <main> on first render, so none of this is visible to real
// users — but Googlebot's initial fetch sees only this.
//
// It has to carry real <a> links. When it did not, the homepage exposed just the five
// category links from the nav and every one of the 34 tool pages was reachable only
// from sitemap.xml. Google's response to a sitemap-only URL on a low-authority domain
// is to queue it and never fetch it: Search Console showed 25 pages stuck in
// "Discovered - currently not indexed" while the site looked perfectly healthy.
// Keep every tool linked from at least the homepage and its category page.
const allEntries = getToolEntries();

const linkList = (items) =>
  `<ul>${items
    .map(({ href, label, description }) =>
      `<li><a href="${href}">${escapeHtml(label)}</a>${description ? ` — ${escapeHtml(description)}` : ''}</li>`)
    .join('')}</ul>`;

const toolLink = ({ canonicalPath, tool }) => ({
  href: canonicalPath,
  label: tool.name,
  description: tool.description
});

function bodyFor(url) {
  const parts = url.split('/').filter(Boolean);

  // Home — link every tool, grouped by category, plus the category pages themselves.
  if (parts.length === 0) {
    const sections = Object.entries(categories).map(([id, category]) => {
      const inCategory = allEntries.filter(({ tool }) => tool.category === id);
      if (!inCategory.length) return '';
      return `<h2><a href="/${id}">${escapeHtml(category.name)}</a></h2>`
        + `<p>${escapeHtml(category.description)}</p>`
        + linkList(inCategory.map(toolLink));
    }).join('');
    return `<h1>${escapeHtml(siteInfo.name)}</h1><p>${escapeHtml(siteInfo.description)}</p>${sections}`;
  }

  // Category — link every tool it contains, and back to home.
  if (parts.length === 1) {
    const category = getCategoryMetadata(parts[0]);
    if (!category) return '';
    const inCategory = allEntries.filter(({ tool }) => tool.category === parts[0]);
    return `<nav><a href="/">${escapeHtml(siteInfo.name)}</a></nav>`
      + `<h1>${escapeHtml(category.name)}</h1><p>${escapeHtml(category.description)}</p>`
      + linkList(inCategory.map(toolLink));
  }

  // Tool — breadcrumb up to home and its category, how-to steps, and related tools.
  const toolPath = routeAliases[url] || parts.join('/');
  const tool = getToolMetadata(toolPath);
  if (!tool) return '';

  const category = getCategoryMetadata(tool.category);
  const crumb = `<nav><a href="/">${escapeHtml(siteInfo.name)}</a>`
    + (category ? ` <a href="/${tool.category}">${escapeHtml(category.name)}</a>` : '')
    + `</nav>`;

  const useCase = tool.useCase ? `<p>${escapeHtml(tool.useCase)}</p>` : '';

  // The SAME renderer the live page uses, so a crawler and a human get identical
  // content. Emitting richer prose here than the tool page actually shows would be
  // cloaking — see renderToolArticle in common/tool-articles.js.
  const article = renderToolArticle(tool);

  const relatedEntries = (tool.related || [])
    .map((path) => allEntries.find((entry) => entry.path === path))
    .filter(Boolean);
  const related = relatedEntries.length
    ? `<h2>Related tools</h2>${linkList(relatedEntries.map(({ canonicalPath, tool: t }) => ({
        href: canonicalPath, label: t.name
      })))}`
    : '';

  // Every tool page also links back into its category's siblings, so no tool is more
  // than two hops from the homepage even if `related` is sparse.
  const siblings = allEntries.filter(
    ({ tool: t, path }) => t.category === tool.category && path !== toolPath
  );
  const more = siblings.length && category
    ? `<h2>More ${escapeHtml(category.name)}</h2>${linkList(siblings.map(({ canonicalPath, tool: t }) => ({
        href: canonicalPath, label: t.name
      })))}`
    : '';

  return `${crumb}<h1>${escapeHtml(tool.name)}</h1><p>${escapeHtml(tool.description)}</p>`
    + `${useCase}${article}${related}${more}`;
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
