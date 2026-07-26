import { categories, getCanonicalPathForToolPath, tools } from './metadata.js';

/**
 * Generate an XML sitemap for the website
 * @param {string} baseUrl - The base URL of the website
 * @returns {string} - XML sitemap content
 */
export function generateSitemap(baseUrl) {
  // Ensure baseUrl ends with /
  if (!baseUrl.endsWith('/')) {
    baseUrl = baseUrl + '/';
  }

  // Get current date in YYYY-MM-DD format
  const now = new Date().toISOString().split('T')[0];
  
  // Start XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Home page -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;
  
  // Add category pages
  Object.keys(categories).forEach(categoryKey => {
    xml += `
  <!-- ${categories[categoryKey].name} category page -->
  <url>
    <loc>${baseUrl}${categoryKey}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Add individual tool pages. Only the canonical URL for each tool is listed — a tool
  // that has a short share alias (routeAliases) is listed once, under the alias, because
  // that is what its <link rel="canonical"> points at. Listing both forms would hand
  // Google two URLs for one page and re-create the duplicate-content problem.
  Object.keys(tools).forEach(toolKey => {
    const tool = tools[toolKey];
    xml += `
  <!-- ${tool.name} tool page -->
  <url>
    <loc>${baseUrl}${getCanonicalPathForToolPath(toolKey).replace(/^\//, '')}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  // Close XML
  xml += `
</urlset>`;
  
  return xml;
}

/**
 * Create a sitemap.xml file and save it to the public directory
 * This should be run during the build process
 */
export function createSitemapFile(baseUrl = 'https://safewebtool.org/') {
  const sitemapContent = generateSitemap(baseUrl);
  
  // In a real build process, this would write to a file
  // For demo purposes, we'll expose a method to get the content
  return sitemapContent;
}

/**
 * Serve the sitemap content for the /sitemap.xml route
 * This should be used when sitemap.xml is requested
 */
export function serveSitemap(baseUrl = window.location.origin) {
  if (!baseUrl.includes('://')) {
    // Ensure we have a full URL with protocol
    baseUrl = window.location.protocol + '//' + baseUrl.replace(/^\/\//, '');
  }
  return generateSitemap(baseUrl).trim();
} 
