import { categories, getCanonicalPathForToolPath, getToolEntries, siteInfo } from './metadata.js';
import { listToolsForCategory } from './tool-registry.js';

function renderToolCard(path, tool, index = 0) {
  const canonicalPath = getCanonicalPathForToolPath(path);
  return `
    <a href="${canonicalPath}" class="tool-card bg-white dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700 p-4 flex gap-3 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all duration-150" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" data-tool-card data-tool-path="${path}" data-tool-category="${tool.category}">
      <meta itemprop="position" content="${index + 1}">
      <span class="text-2xl shrink-0" aria-hidden="true">${tool.icon}</span>
      <span class="min-w-0">
        <span class="block text-base font-semibold text-slate-900 dark:text-slate-100" itemprop="name">${tool.name}</span>
        <span class="mt-1 line-clamp-2 block text-sm leading-relaxed text-slate-600 dark:text-slate-400" itemprop="description">${tool.useCase || tool.description}</span>
      </span>
    </a>
  `;
}

function renderCategoryPills(activeCategory = '') {
  return `
    <div class="flex flex-wrap gap-2" aria-label="Tool categories">
      <a href="/" class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory ? 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:text-slate-300' : 'border-blue-600 bg-blue-600 text-white'}">All</a>
      ${Object.values(categories).map(category => `
        <a href="/${category.id}" class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === category.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:text-slate-300'}">${category.icon} ${category.name.replace(' Tools', '')}</a>
      `).join('')}
    </div>
  `;
}

export function renderCategoryPage(categoryConfig, categoryId) {
  const categoryTools = listToolsForCategory(categoryId);
  return `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <div class="mb-6">
        <p class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">${categoryConfig.icon} ${categoryTools.length} tools</p>
        <h1 class="mt-2 text-4xl font-black text-slate-950 dark:text-white">${categoryConfig.name}</h1>
        <p class="mt-2 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">${categoryConfig.description}</p>
      </div>
      <div class="mb-5">
        ${renderCategoryPills(categoryId)}
      </div>
      <div class="mb-5">
        <label class="sr-only" for="categoryToolFilter">Search ${categoryConfig.name}</label>
        <input id="categoryToolFilter" data-tool-filter type="search" placeholder="Search ${categoryConfig.name.toLowerCase()}..." class="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-950">
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" itemscope itemtype="https://schema.org/ItemList" data-tool-grid>
        ${categoryTools.map(([path, tool], index) => renderToolCard(path, tool, index)).join('')}
      </div>
    </div>
  `;
}

export function renderToolPageShell(toolInfo) {
  const toolPath = `${toolInfo.category}/${toolInfo.id}`;
  const canonicalPath = getCanonicalPathForToolPath(toolPath);
  return `
    <div class="tool-page container mx-auto px-4 py-8" itemscope itemtype="https://schema.org/SoftwareApplication" data-agent-page="tool" data-agent-tool="${toolInfo.category}/${toolInfo.id}" data-agent-category="${toolInfo.category}">
      <meta itemprop="applicationCategory" content="WebApplication">
      <meta itemprop="offers" itemscope itemtype="https://schema.org/Offer">
      <meta itemprop="price" content="0">
      <meta itemprop="priceCurrency" content="USD">
      <div class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <div class="px-4 py-5 sm:px-6">
          <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <a href="/${toolInfo.category}" class="font-medium text-blue-600 hover:underline dark:text-blue-400">${categories[toolInfo.category]?.name || toolInfo.category}</a>
            <span class="text-slate-400">/</span>
            <span class="text-slate-500 dark:text-slate-400">${toolInfo.name}</span>
          </div>
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 class="text-3xl font-black text-slate-950 dark:text-white">${toolInfo.name}</h1>
              <p class="mt-2 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">${toolInfo.description || ''}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">Local processing</span>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">Free</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-gray-700 dark:text-slate-200">No login</span>
              </div>
            </div>
            <button type="button" data-share-tool data-share-url="${canonicalPath}" class="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-gray-600 dark:text-slate-200">Copy link</button>
          </div>
        </div>
        <div class="px-4 py-5 sm:p-6">
          <div class="tool-content-area" data-agent-region="tool-ui"></div>
        </div>
      </div>
    </div>
  `;
}

export function createFFmpegLoadingElement() {
  const loadingEl = document.createElement('div');
  loadingEl.id = 'ffmpeg-loading';
  loadingEl.style.textAlign = 'center';
  loadingEl.style.padding = '20px';
  loadingEl.innerHTML = `
    <div class="loading-ffmpeg">
      <p>Loading FFmpeg components...</p>
      <div class="progress">
        <div class="progress-fill"></div>
      </div>
    </div>
  `;
  return loadingEl;
}

export function renderHomePage() {
  const entries = getToolEntries();
  const featured = entries.filter(({ tool }) => tool.featured).slice(0, 6);
  const allTools = entries.sort((a, b) => a.tool.name.localeCompare(b.tool.name));

  return `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <section class="mb-8">
        <div class="max-w-3xl">
          <p class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">SafeWebTool</p>
          <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">A safe, open-source collection of everyday tools that run in your browser.</h1>
          <p class="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">Use the tool. Keep your file. Your photos, videos, text, and files stay on your computer.</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">No uploads</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-gray-700 dark:text-slate-200">No ads</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-gray-700 dark:text-slate-200">No login</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-gray-700 dark:text-slate-200">No paywalls</span>
          </div>
        </div>
        <div class="mt-6">
          <label class="sr-only" for="homeToolSearch">Search tools</label>
          <input id="homeToolSearch" data-tool-filter type="search" placeholder="Search tools by task, format, or keyword..." class="w-full rounded-md border border-slate-300 bg-white px-4 py-4 text-lg text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-950">
        </div>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Popular</h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          ${featured.map(({ path, tool }, index) => renderToolCard(path, tool, index)).join('')}
        </div>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Categories</h2>
        ${renderCategoryPills('')}
      </section>

      <section>
        <div class="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 class="text-2xl font-black text-slate-950 dark:text-white">All tools</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">${allTools.length} browser-local tools</p>
          </div>
          <p data-tool-count class="text-sm font-medium text-slate-500 dark:text-slate-400"></p>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-tool-grid>
          ${allTools.map(({ path, tool }, index) => renderToolCard(path, tool, index)).join('')}
        </div>
      </section>
    </div>
  `;
}
