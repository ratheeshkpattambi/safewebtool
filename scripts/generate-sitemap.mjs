import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { categories, tools, routeAliases, baseUrl } from '../src/common/metadata.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const today = new Date().toISOString().split('T')[0];

const urls = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  ...Object.keys(categories).map(id => ({
    loc: `/${id}`, priority: '0.8', changefreq: 'weekly'
  })),
  ...Object.keys(tools).map(path => ({
    loc: `/${path}`, priority: '0.7', changefreq: 'monthly'
  })),
  ...Object.keys(routeAliases).map(path => ({
    loc: path, priority: '0.7', changefreq: 'monthly'
  }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(join(__dirname, '../public/sitemap.xml'), xml);
console.log(`Generated public/sitemap.xml with ${urls.length} URLs`);
