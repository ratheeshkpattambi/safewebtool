/**
 * Writes public/sitemap.xml.
 *
 * The XML itself is built by src/common/sitemap.js — the same generator the prerenderer
 * uses for dist/sitemap.xml — so there is exactly one definition of which URLs the site
 * publishes and in which canonical form. This script used to carry its own copy of that
 * logic, and the two drifted: one emitted trailing-slash canonical URLs and the other
 * emitted bare paths that 301, which is what broke indexing.
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { baseUrl } from '../src/common/metadata.js';
import { generateSitemap } from '../src/common/sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const xml = generateSitemap(baseUrl);

writeFileSync(join(__dirname, '../public/sitemap.xml'), xml);
console.log(`Generated public/sitemap.xml with ${(xml.match(/<loc>/g) || []).length} URLs`);
