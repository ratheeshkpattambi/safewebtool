import { handleRoute } from './router.js';
import { categories, getToolEntries, getToolSearchText } from './common/metadata.js';
import { loadToolModule, resolveAppRoute } from './common/tool-registry.js';
import './styles/main.css';
import './index.css';

const GA_MEASUREMENT_ID = 'G-SK7DDP7ND6';

function isLocalHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function renderNavigation() {
  const navList = document.querySelector('header nav ul');
  if (!navList) return;

  navList.innerHTML = `
    <li>
      <a href="/" class="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors inline-flex items-center">Home</a>
    </li>
    ${Object.values(categories).map(category => `
      <li>
        <a href="/${category.id}" class="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors inline-flex items-center">${category.name.replace(' Tools', '')}</a>
      </li>
    `).join('')}
    <li class="ml-1">
      <button id="theme-toggle" class="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors" aria-label="Toggle dark mode">
        <svg class="h-5 w-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1 -8 0a4 4 0 1 1 8 0z"></path>
        </svg>
        <svg class="h-5 w-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
      </button>
    </li>
  `;
}

function getToolSearchEntries() {
  return getToolEntries().map(entry => ({
    ...entry,
    searchText: getToolSearchText(entry.path, entry.tool)
  }));
}

function renderSearchResult(entry) {
  return `
    <a href="${entry.canonicalPath}" class="flex gap-3 p-3 hover:bg-blue-50 dark:hover:bg-gray-700">
      <span class="text-xl shrink-0">${entry.tool.icon}</span>
      <span class="min-w-0">
        <span class="block font-semibold text-slate-900 dark:text-white">${entry.tool.name}</span>
        <span class="block truncate text-sm text-slate-500 dark:text-slate-400">${entry.tool.useCase || entry.tool.description}</span>
      </span>
    </a>
  `;
}

function initGlobalToolSearch() {
  const input = document.getElementById('globalToolSearch');
  const results = document.getElementById('globalToolSearchResults');
  if (!input || !results) return;

  const entries = getToolSearchEntries();

  const closeResults = () => {
    results.classList.add('hidden');
    results.innerHTML = '';
  };

  const updateResults = () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      closeResults();
      return;
    }

    const matches = entries
      .filter(entry => entry.searchText.includes(query))
      .slice(0, 8);

    results.innerHTML = matches.length
      ? matches.map(renderSearchResult).join('')
      : '<div class="p-4 text-sm text-slate-500 dark:text-slate-400">No tools found</div>';
    results.classList.remove('hidden');
  };

  input.addEventListener('input', updateResults);
  input.addEventListener('focus', updateResults);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      input.blur();
      closeResults();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const target = event.target;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if (!isTyping) {
        event.preventDefault();
        input.focus();
      }
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('#globalToolSearch') && !event.target.closest('#globalToolSearchResults')) {
      closeResults();
    }
  });
}

function initInlineToolFilters() {
  document.addEventListener('input', event => {
    const filter = event.target.closest('[data-tool-filter]');
    if (!filter) return;

    const query = filter.value.trim().toLowerCase();
    const scope = filter.closest('main') || document;
    const cards = Array.from(scope.querySelectorAll('[data-tool-card]'));
    let visible = 0;

    cards.forEach(card => {
      const path = card.getAttribute('data-tool-path');
      const tool = path ? getToolEntries().find(entry => entry.path === path)?.tool : null;
      const text = path && tool ? getToolSearchText(path, tool) : card.textContent.toLowerCase();
      const match = !query || text.includes(query);
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });

    const count = scope.querySelector('[data-tool-count]');
    if (count) {
      count.textContent = query ? `${visible} matches` : '';
    }
  });
}

function initToolShareButtons() {
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-share-tool]');
    if (!button) return;

    const sharePath = button.getAttribute('data-share-url') || window.location.pathname;
    const url = new URL(sharePath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = original;
      }, 1800);
    } catch {
      window.prompt('Copy this link', url);
    }
  });
}

// Warm the tool chunk before the click so navigation feels instant.
function initToolPrefetch() {
  const prefetched = new Set();

  const prefetch = (link) => {
    const href = link?.getAttribute('href');
    if (!href || !href.startsWith('/') || link.hostname !== window.location.hostname) return;

    const route = resolveAppRoute(href);
    if (route.kind !== 'tool' || prefetched.has(route.toolPath)) return;

    prefetched.add(route.toolPath);
    loadToolModule(route.categoryId, route.toolId).catch(() => prefetched.delete(route.toolPath));
  };

  const onHover = (event) => {
    const link = event.target.closest?.('a');
    if (link) prefetch(link);
  };

  document.addEventListener('mouseover', onHover);
  document.addEventListener('focusin', onHover);
  document.addEventListener('touchstart', onHover, { passive: true });
}

// Router functionality
function initRouter() {
  // Handle initial page load
  const currentPath = window.location.pathname;
  handleRoute(currentPath);

  // Handle browser navigation (back/forward)
  window.addEventListener('popstate', () => {
    const newPath = window.location.pathname;
    handleRoute(newPath);
  });

  // Handle link clicks for SPA routing
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('/')) {
      // Don't interfere with external links or links with target="_blank"
      if (link.getAttribute('target') === '_blank' || link.hostname !== window.location.hostname) {
        return;
      }
      
      e.preventDefault();
      const href = link.getAttribute('href');
      
      // Update URL and handle route
      window.history.pushState({}, '', href);
      handleRoute(href);
    }
  });
}

// Theme functionality
function initThemeToggle() {
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  setTheme(initialTheme);
  
  // Add theme toggle button event listener
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function loadAnalytics() {
  if (isLocalHost(window.location.hostname) || document.getElementById('ga-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href
  });
}

function scheduleAnalytics() {
  const scheduleIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 2500));

  window.addEventListener('load', () => {
    scheduleIdle(loadAnalytics, { timeout: 5000 });
  }, { once: true });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add js-loaded class to body to make content visible
  document.body.classList.add('js-loaded');

  renderNavigation();
  initRouter();
  initToolPrefetch();
  initGlobalToolSearch();
  initInlineToolFilters();
  initToolShareButtons();
  initThemeToggle();
  scheduleAnalytics();
}); 
