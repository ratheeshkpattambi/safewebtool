import { 
  generateMetaTags, 
  generateStructuredData,
  categories,
  tools,
  getToolMetadata,
  getCategoryMetadata,
  getWelcomeContent,
  getToolTemplate,
  get404Template,
  getErrorTemplate
} from './common/metadata.js';
import { footerManager } from './common/footer-manager.js';

// Eagerly discover all tool modules
const toolModules = import.meta.glob('./(video|image|text|ml)/*.js');

/**
 * Updates the active class on navigation links
 * @param {string} path - The current URL path
 */
function updateActiveNavigation(path) {
  // Remove active class from all nav links
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to current path
  const pathSegment = (path === '/' || path === '/home')
    ? '/'
    : `/${path.split('/')[1]}`;
  const activeLink = document.querySelector(`nav a[href="${pathSegment}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

/**
 * Find a tool based on the path
 * @param {string} path - The URL path
 * @returns {Object|null} The tool data or null if not found
 */
function findTool(path) {
  // Parse the path to extract category and tool ID
  const pathParts = path.split('/').filter(part => part);
  if (pathParts.length < 1) return null;
  
  const category = pathParts[0];
  const toolId = pathParts.length > 1 ? pathParts[1] : null;
  
  // Get the category metadata
  const categoryConfig = categories[category];
  if (!categoryConfig) return null;
  
  // If no specific tool requested, return the category
  if (!toolId) return { category: categoryConfig, type: 'category', id: category };
  
  // Find the specific tool in metadata
  const toolPath = `${category}/${toolId}`;
  const tool = tools[toolPath];
  
  // Even if tool metadata is missing, return a basic tool object if the category is valid
  // This ensures tools without complete metadata still work
  return { 
    category: categoryConfig, 
    tool: tool || { 
      id: toolId,
      category,
      name: toolId.charAt(0).toUpperCase() + toolId.slice(1),
      description: ''
    }, 
    type: 'tool', 
    id: category,
    path: toolPath
  };
}

/**
 * Generate content for a category page
 * @param {Object} categoryConfig - The category configuration
 * @param {string} categoryId - The category ID
 * @returns {string} HTML for the category page
 */
function generateCategoryContent(categoryConfig, categoryId) {
  return `
    <div class="container mx-auto px-4 py-8">
      <!-- Category Header Card -->
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-8 transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-4xl font-bold text-slate-800 dark:text-slate-100">${categoryConfig.name}</h1>
          <p class="text-lg text-slate-600 dark:text-slate-300 mt-2">${categoryConfig.description}</p>
        </div>
        <div class="px-4 py-5 sm:p-6" itemscope itemtype="https://schema.org/ItemList">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${Object.entries(tools)
              .filter(([path]) => path.startsWith(categoryId + '/'))
              .map(([path, tool], index) => {
                return `
                  <a href="/${path}" class="bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 p-5 flex flex-col gap-2 hover:bg-white dark:hover:bg-gray-600 hover:shadow-md hover:border-slate-300 dark:hover:border-gray-500 transition-all duration-200" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <meta itemprop="position" content="${index + 1}">
                    <div class="text-3xl mb-1">${tool.icon}</div>
                    <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200" itemprop="name">${tool.name}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 flex-grow" itemprop="description">${tool.description}</p>
                  </a>
                `;
              }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize collapsible sections on the home page
 */
function initializeCollapsibleSections() {
  const toggles = document.querySelectorAll('.category-toggle');
  
  // Set initial state
  document.querySelectorAll('.category-content').forEach(content => {
    content.style.maxHeight = content.scrollHeight + 'px';
  });
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const categoryId = this.getAttribute('data-category');
      const content = document.querySelector('[data-category-content="' + categoryId + '"]');
      const chevron = this.querySelector('svg');
      
      if (content && chevron) {
        const isCollapsed = content.style.maxHeight === '0px';
        
        if (isCollapsed) {
          // Expand
          content.style.maxHeight = content.scrollHeight + 'px';
          content.style.opacity = '1';
          chevron.classList.remove('-rotate-90');
        } else {
          // Collapse
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          chevron.classList.add('-rotate-90');
        }
      }
    });
  });
}

/**
 * Main route handler
 * @param {string} path - The URL path
 */
export async function handleRoute(path) {
  // Restore original footer when navigating (tools can override it later)
  footerManager.restoreOriginalFooter();
  
  // Update active navigation
  updateActiveNavigation(path);
  
  // Handle sitemap.xml requests
  if (path === '/sitemap.xml') {
    import('./common/sitemap.js').then(({ serveSitemap }) => {
      document.documentElement.innerHTML = `
        <pre style="word-wrap: break-word; white-space: pre-wrap;">
          ${serveSitemap()}
        </pre>
      `;
      if (document.contentType) {
        document.contentType = 'application/xml';
      }
    });
    return;
  }

  const main = document.querySelector('main');
  if (!main) return;
  main.innerHTML = '';

  let content = '';
  
  // Update metadata for SEO
  updateMetadata(path);
  
  // Handle root path
  if (path === '/' || path === '/home') {
    content = getWelcomeContent();
  } else {
    // Find the requested tool or category
    const result = findTool(path);
    
    if (!result) {
      // 404 page
      content = get404Template();
    } else if (result.type === 'category') {
      // Category page (e.g., /video)
      content = generateCategoryContent(result.category, result.id);
    } else {
      // Specific tool page (e.g., /video/resize)
      const [category, toolId] = result.path.split('/');
      
      // Enhance template with SEO content and tool information
      const toolInfo = result.tool;
      content = `
        <div class="tool-page container mx-auto px-4 py-8" itemscope itemtype="https://schema.org/SoftwareApplication">
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
              <div class="tool-content-area"></div>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Update page content
  main.innerHTML = content;
  
  // Initialize collapsible sections if on home page
  if (path === '/' || path === '/home') {
    setTimeout(() => {
      initializeCollapsibleSections();
    }, 50);
  }
  
  // Initialize tool AFTER DOM elements are available
  if (path !== '/' && path !== '/home') {
    const result = findTool(path);
    if (result && result.type === 'tool') {
      try {
        // Small delay to ensure DOM is fully updated
        setTimeout(async () => {
          try {
            // Extract category and toolId from path
            const [category, toolId] = result.path.split('/');
            
            // Preload common styles and utilities first
            await import('./common/utils.js');
            
            // Check if this is a video tool that requires FFmpeg
            const needsFFmpeg = (category === 'video');
            
            // Display loading indicator for FFmpeg tools
            if (needsFFmpeg) {
              const loadingHtml = `
                <div class="loading-ffmpeg">
                  <p>Loading FFmpeg components...</p>
                  <div class="progress">
                    <div class="progress-fill"></div>
                  </div>
                </div>
              `;
              const loadingEl = document.createElement('div');
              loadingEl.innerHTML = loadingHtml;
              loadingEl.style.textAlign = 'center';
              loadingEl.style.padding = '20px';
              loadingEl.id = 'ffmpeg-loading';
              document.querySelector('.tool-content-area')?.appendChild(loadingEl);
            }
            
            // Import directly from the current directory structure
            let moduleImport;
            try {
              const modulePath = `./${category}/${toolId}.js`;

              if (toolModules[modulePath]) {
                moduleImport = await toolModules[modulePath]();
              } else {
                console.error(`Module not found in import.meta.glob cache: ${modulePath}`);
                // Attempt direct dynamic import as a fallback (might not work in prod if not analyzed)
                try {
                    moduleImport = await import(/* @vite-ignore */ modulePath);
                    console.warn(`Loaded module ${modulePath} via fallback dynamic import.`);
                } catch (fallbackError) {
                    console.error(`Fallback dynamic import for ${modulePath} also failed:`, fallbackError);
                    throw new Error(`Module ${modulePath} not found.`);
                }
              }
            } catch (error) {
              console.error(`Failed to load tool module: ${error.message}`);
              main.innerHTML = getErrorTemplate(
                'Error Loading Tool', 
                'The requested tool could not be loaded.', 
                error.message
              );
              return;
            }
            
            // Remove loading indicator if it exists
            document.getElementById('ffmpeg-loading')?.remove();
            
            // Call the initialization function
            if (moduleImport && moduleImport.initTool) {
              if (moduleImport.template) {
                const toolContentArea = document.querySelector('.tool-content-area');
                if (toolContentArea) {
                  // Simply inject the entire template
                  toolContentArea.innerHTML = moduleImport.template;
                } else {
                  console.error('CRITICAL: .tool-content-area not found in .tool-page!');
                }
              }
              moduleImport.initTool();
            } else {
              main.innerHTML = getErrorTemplate(
                'Error Loading Tool', 
                `The tool "${toolId}" could not be initialized.`,
                `Init function 'initTool' not found in module for ${category}/${toolId}`
              );
            }
          } catch (error) {
            console.error('Error initializing tool:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing tool:', error);
      }
    }
  }
}

/**
 * Update page metadata for SEO
 * @param {string} path - Current path
 */
function updateMetadata(path) {
  // Remove existing meta tags we might have added
  document.querySelectorAll('meta[data-dynamic="true"]').forEach(el => el.remove());
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
  
  // Get head element
  const head = document.head;
  
  // Add new meta tags
  const metaContainer = document.createElement('div');
  metaContainer.innerHTML = generateMetaTags(path);
  
  // Add each node to head
  Array.from(metaContainer.children).forEach(node => {
    node.setAttribute('data-dynamic', 'true');
    head.appendChild(node);
  });
  
  // Add structured data for tool pages
  const parts = path.split('/').filter(p => p);
  if (parts.length === 2) {
    const structuredDataContainer = document.createElement('div');
    structuredDataContainer.innerHTML = generateStructuredData(`${parts[0]}/${parts[1]}`);
    
    // Add structured data script to head
    Array.from(structuredDataContainer.children).forEach(node => {
      head.appendChild(node);
    });
  }
  
  // Add sitemap link for SEO
  const sitemapLink = document.createElement('link');
  sitemapLink.rel = 'sitemap';
  sitemapLink.type = 'application/xml';
  sitemapLink.href = '/sitemap.xml';
  sitemapLink.setAttribute('data-dynamic', 'true');
  head.appendChild(sitemapLink);
}