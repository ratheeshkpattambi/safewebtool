import { listToolsForCategory } from './tool-registry.js';

export function renderCategoryPage(categoryConfig, categoryId) {
  return `
    <div class="container mx-auto px-4 py-8">
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-8 transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-4xl font-bold text-slate-800 dark:text-slate-100">${categoryConfig.name}</h1>
          <p class="text-lg text-slate-600 dark:text-slate-300 mt-2">${categoryConfig.description}</p>
        </div>
        <div class="px-4 py-5 sm:p-6" itemscope itemtype="https://schema.org/ItemList">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${listToolsForCategory(categoryId).map(([path, tool], index) => `
              <a href="/${path}" class="bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 p-5 flex flex-col gap-2 hover:bg-white dark:hover:bg-gray-600 hover:shadow-md hover:border-slate-300 dark:hover:border-gray-500 transition-all duration-200" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <meta itemprop="position" content="${index + 1}">
                <div class="text-3xl mb-1">${tool.icon}</div>
                <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200" itemprop="name">${tool.name}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 flex-grow" itemprop="description">${tool.description}</p>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderToolPageShell(toolInfo) {
  return `
    <div class="tool-page container mx-auto px-4 py-8" itemscope itemtype="https://schema.org/SoftwareApplication" data-agent-page="tool" data-agent-tool="${toolInfo.category}/${toolInfo.id}" data-agent-category="${toolInfo.category}">
      <meta itemprop="applicationCategory" content="WebApplication">
      <meta itemprop="offers" itemscope itemtype="https://schema.org/Offer">
      <meta itemprop="price" content="0">
      <meta itemprop="priceCurrency" content="USD">
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-3xl font-semibold text-slate-800 dark:text-slate-100">${toolInfo.name}</h1>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed mt-2">${toolInfo.description || ''}</p>
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
