import {
  generateMetaTags,
  generateStructuredData,
  getWelcomeContent,
  get404Template,
  getErrorTemplate
} from './common/metadata.js';
import { footerManager } from './common/footer-manager.js';
import { createFFmpegLoadingElement, renderCategoryPage, renderToolPageShell } from './common/page-renderers.js';
import { serveSitemap } from './common/sitemap.js';
import { loadToolModule, resolveAppRoute } from './common/tool-registry.js';

let navigationToken = 0;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isHomePath(path) {
  return path === '/' || path === '/home';
}

/**
 * Updates the active class on navigation links.
 * @param {string} path
 */
function updateActiveNavigation(path) {
  document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));

  const pathSegment = isHomePath(path) ? '/' : `/${path.split('/')[1]}`;
  const activeLink = document.querySelector(`nav a[href="${pathSegment}"]`);
  if (activeLink) activeLink.classList.add('active');
}

function initializeCollapsibleSections() {
  const toggles = document.querySelectorAll('.category-toggle');

  document.querySelectorAll('.category-content').forEach(content => {
    content.style.maxHeight = `${content.scrollHeight}px`;
  });

  toggles.forEach(toggle => {
    toggle.addEventListener('click', function () {
      const categoryId = this.getAttribute('data-category');
      const content = document.querySelector(`[data-category-content="${categoryId}"]`);
      const chevron = this.querySelector('svg');

      if (!content || !chevron) return;

      const isCollapsed = content.style.maxHeight === '0px';
      content.style.maxHeight = isCollapsed ? `${content.scrollHeight}px` : '0px';
      content.style.opacity = isCollapsed ? '1' : '0';
      chevron.classList.toggle('-rotate-90', !isCollapsed);
    });
  });
}

function renderSitemap() {
  document.documentElement.innerHTML = `
    <pre style="word-wrap: break-word; white-space: pre-wrap;">
      ${serveSitemap()}
    </pre>
  `;
  if (document.contentType) {
    document.contentType = 'application/xml';
  }
}

function renderRouteShell(route) {
  switch (route.kind) {
    case 'home':
      return getWelcomeContent();
    case 'category':
      return renderCategoryPage(route.category, route.categoryId);
    case 'tool':
      return renderToolPageShell(route.tool);
    case 'not-found':
      return get404Template();
    default:
      return '';
  }
}

function injectToolTemplate(moduleImport) {
  if (!moduleImport?.template) return true;

  const toolContentArea = document.querySelector('.tool-content-area');
  if (!toolContentArea) {
    console.error('CRITICAL: .tool-content-area not found in .tool-page!');
    return false;
  }

  toolContentArea.innerHTML = moduleImport.template;
  return true;
}

async function initializeToolRoute(route, main, tokenAtStart) {
  if (route.kind !== 'tool') return;

  await delay(50);
  if (tokenAtStart !== navigationToken) return;

  try {
    await import('./common/utils.js');

    if (route.categoryId === 'video') {
      document.querySelector('.tool-content-area')?.appendChild(createFFmpegLoadingElement());
    }

    let moduleImport;
    try {
      moduleImport = await loadToolModule(route.categoryId, route.toolId);
    } catch (error) {
      console.error(`Failed to load tool module ${route.toolPath}:`, error);
      if (tokenAtStart !== navigationToken) return;
      main.innerHTML = getErrorTemplate(
        'Error Loading Tool',
        'The requested tool could not be loaded.',
        error.message
      );
      return;
    }

    if (tokenAtStart !== navigationToken) return;

    document.getElementById('ffmpeg-loading')?.remove();

    if (!moduleImport?.initTool) {
      main.innerHTML = getErrorTemplate(
        'Error Loading Tool',
        `The tool "${route.toolId}" could not be initialized.`,
        `Init function 'initTool' not found in module for ${route.toolPath}`
      );
      return;
    }

    if (!injectToolTemplate(moduleImport)) {
      main.innerHTML = getErrorTemplate(
        'Error Loading Tool',
        `The tool "${route.toolId}" could not be rendered.`,
        'Missing .tool-content-area container in tool page shell'
      );
      return;
    }

    moduleImport.initTool();
  } catch (error) {
    console.error('Error initializing tool:', error);
    if (tokenAtStart !== navigationToken) return;
    main.innerHTML = getErrorTemplate(
      'Error Loading Tool',
      'Unexpected error while initializing the tool.',
      error.message
    );
  }
}

function updateMetadata(path) {
  document.querySelectorAll('meta[data-dynamic="true"]').forEach(el => el.remove());
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

  const head = document.head;

  const metaContainer = document.createElement('div');
  metaContainer.innerHTML = generateMetaTags(path);
  Array.from(metaContainer.children).forEach(node => {
    if (node.tagName === 'TITLE') {
      document.title = node.textContent;
      return;
    }

    node.setAttribute('data-dynamic', 'true');
    head.appendChild(node);
  });

  const route = resolveAppRoute(path);
  if (route.kind === 'tool') {
    const structuredDataContainer = document.createElement('div');
    structuredDataContainer.innerHTML = generateStructuredData(route.toolPath);
    Array.from(structuredDataContainer.children).forEach(node => {
      head.appendChild(node);
    });
  }

  const sitemapLink = document.createElement('link');
  sitemapLink.rel = 'sitemap';
  sitemapLink.type = 'application/xml';
  sitemapLink.href = '/sitemap.xml';
  sitemapLink.setAttribute('data-dynamic', 'true');
  head.appendChild(sitemapLink);
}

/**
 * Main route handler
 * @param {string} path
 */
export async function handleRoute(path) {
  const route = resolveAppRoute(path);
  const token = ++navigationToken;

  document.body.classList.remove('timer-app-mode');
  footerManager.restoreOriginalFooter();
  updateActiveNavigation(route.path);

  if (route.kind === 'sitemap') {
    renderSitemap();
    return;
  }

  const main = document.querySelector('main');
  if (!main) return;

  updateMetadata(route.path);
  main.innerHTML = renderRouteShell(route);

  if (route.kind === 'home') {
    setTimeout(() => {
      if (token !== navigationToken) return;
      initializeCollapsibleSections();
    }, 50);
    return;
  }

  await initializeToolRoute(route, main, token);
}
