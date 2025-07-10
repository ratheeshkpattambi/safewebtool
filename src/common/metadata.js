/**
 * Centralized metadata for all tools
 * Used for SEO, tool descriptions, and site structure
 */

// Site-wide information
export const siteInfo = {
  name: 'SafeWebTool',
  tagline: 'A collection of privacy-focused tools that process your media locally in your browser.',
  philosophy: 'Your media stays private - processing happens in your browser. **No uploads, no login, no ads**. Free, secure tools [built by the community](https://github.com/ratheeshkpattambi/safewebtool).',
  description: 'Free browser-based tools for working with videos, images, and text. No uploads - all processing happens locally in your browser.',
  keywords: ['online tools', 'privacy tools', 'browser tools', 'no upload tools', 'local processing', 'ad-free tools', 'no login']
};

// Tool categories metadata
export const categories = {
  video: {
    id: 'video',
    name: 'Video Tools',
    description: 'Free online video tools for resizing, converting, and analyzing videos. No upload required - all processing happens in your browser.',
    icon: '🎥',
    keywords: ['video tools', 'video converter', 'video processor', 'browser video tools']
  },
  image: {
    id: 'image',
    name: 'Image Tools',
    description: 'Free online image editing and optimization tools. Resize, crop, and convert images without uploading them to a server.',
    icon: '🖼️',
    keywords: ['image tools', 'image editor', 'resize images', 'optimize images']
  },
  text: {
    id: 'text',
    name: 'Text Tools',
    description: 'Free online text editing and formatting tools. Edit, validate, and convert text and code formats in your browser.',
    icon: '📝',
    keywords: ['text tools', 'text editor', 'text formatter', 'code validator']
  },
  ml: {
    id: 'ml',
    name: 'ML Tools',
    description: 'Run machine learning models locally in your browser. No uploads, no server-side processing.',
    icon: '🤖',
    keywords: ['machine learning', 'ml', 'ai', 'face detection', 'local ml']
  }
};

// Tool-specific metadata
export const tools = {
  'video/info': {
    id: 'info',
    category: 'video',
    name: 'Extract Video Metadata',
    description: 'Extract metadata (codec, resolution, duration, bitrate) from MP4 and other video files. All in your browser, no uploads.',
    icon: '📊',
    keywords: ['video info', 'video metadata', 'video properties', 'video analyzer'],
    howToUse: [
      'Drop your video file into the upload area or click to select a file',
      'The tool will automatically extract and display all metadata',
      'View detailed information about video resolution, codec, framerate, and audio properties'
    ],
    useCase: 'Find out technical details about your videos before uploading, sharing, or editing them.'
  },
  'video/resize': {
    id: 'resize',
    category: 'video',
    name: 'Video Resize',
    description: 'Free online video resizer. Change video dimensions and resolution while maintaining quality, all processed locally in your browser.',
    icon: '🔄',
    keywords: ['video resize', 'resize video', 'change video resolution', 'video dimensions'],
    howToUse: [
      'Upload your video by dropping it or selecting from your device',
      'Set the desired width and height (maintains aspect ratio by default)',
      'Click "Resize Video" to process',
      'Download the resized video when complete'
    ],
    useCase: 'Perfect for reducing video size for sharing on social media or adjusting dimensions for specific platforms.'
  },
  'video/trim': {
    id: 'trim',
    category: 'video',
    name: 'Video Trimmer',
    description: 'Free online video trimmer. Cut videos to specific start and end points without losing quality, all processed in your browser.',
    icon: '✂️',
    keywords: ['video trim', 'trim video', 'cut video', 'video editor', 'clip video'],
    howToUse: [
      'Upload your video by dropping it or selecting from your device',
      'Use the slider to set start and end points',
      'Preview your trimmed video',
      'Click "Trim Video" to process',
      'Download the trimmed video when complete'
    ],
    useCase: 'Perfect for removing unwanted parts from videos or creating short clips for sharing.'
  },
  'video/reencode': {
    id: 'reencode',
    category: 'video',
    name: 'Video Re-encode',
    description: 'Free online video converter. Convert videos between MP4, WebM, and MOV formats with adjustable quality settings, processed entirely in your browser.',
    icon: '🔄',
    keywords: ['video converter', 'video format converter', 'mp4 converter', 'webm converter'],
    howToUse: [
      'Upload your video using the drop area or file selector',
      'Choose your desired output format (MP4, WebM, or MOV)',
      'Select quality level and bitrate',
      'Click "Re-encode Video" to start processing',
      'Download the converted video once complete'
    ],
    useCase: 'Use when you need to convert videos to a specific format for compatibility with different devices or platforms.'
  },
  'video/gif': {
    id: 'gif',
    category: 'video',
    name: 'Video to GIF',
    description: 'Free online video to GIF converter. Create optimized GIF animations from video files with custom settings, all processed locally in your browser.',
    icon: '🎞️',
    keywords: ['video to gif', 'gif maker', 'convert video to gif', 'create gif from video'],
    howToUse: [
      'Upload your video file',
      'Set the dimensions, framerate, and duration for your GIF',
      'Adjust quality settings to balance file size and appearance',
      'Click "Create GIF" to convert',
      'Download your new GIF animation'
    ],
    useCase: 'Perfect for creating shareable animations for social media, forums, or messaging apps from your videos.'
  },
  'image/resize': {
    id: 'resize',
    category: 'image',
    name: 'Image Resize',
    description: 'Free online image resizer. Change image dimensions and resolution while maintaining quality, all processed locally in your browser.',
    icon: '🖼️',
    keywords: ['image resize', 'resize image', 'image dimensions', 'optimize images'],
    howToUse: [
      'Upload your image by dropping it or selecting from your device',
      'Set the desired width and height (maintains aspect ratio by default)',
      'Click "Resize Image" to process',
      'Download the resized image when complete'
    ],
    useCase: 'Perfect for reducing image size for websites, social media, or email attachments.'
  },
  'image/compressor': {
    id: 'compressor',
    category: 'image',
    name: 'Image Compressor',
    description: 'Free online image compressor. Reduce file size of JPEG, PNG, and WebP images while maintaining visual quality, all processed locally in your browser.',
    icon: '🗜️',
    keywords: ['image compressor', 'compress image', 'reduce image size', 'optimize images', 'image optimization'],
    howToUse: [
      'Upload your image by dropping it or selecting from your device',
      'Adjust compression quality using the slider (lower = smaller file)',
      'Choose output format (auto, JPEG, PNG, or WebP)',
      'Optionally preserve EXIF metadata',
      'Click "Compress Image" to process',
      'Compare before and after results',
      'Download the compressed image'
    ],
    useCase: 'Perfect for reducing image file sizes for web use, email attachments, or storage optimization while maintaining good visual quality.'
  },
  'text/editor': {
    id: 'editor',
    category: 'text',
    name: 'Text Editor',
    description: 'Free online text editor for writing and formatting text content. All processing happens locally in your browser.',
    icon: '📝',
    keywords: ['text editor', 'online editor', 'write text', 'edit text'],
    howToUse: [
      'Type or paste your text in the editor',
      'Edit and format as needed',
      'Download your text when complete'
    ],
    useCase: 'Use for quickly writing and saving text content without needing to install an app.'
  },
  'text/yaml': {
    id: 'yaml',
    category: 'text',
    name: 'YAML Validator',
    description: 'Free online YAML validator and converter. Check YAML syntax and convert to JSON with visual tree display, all processed in your browser.',
    icon: '🔍',
    keywords: ['yaml validator', 'yaml to json', 'validate yaml', 'yaml converter'],
    howToUse: [
      'Paste your YAML content in the editor',
      'The tool automatically validates the syntax',
      'View the parsed data in the tree view',
      'Convert to JSON format with a click'
    ],
    useCase: 'Useful for developers working with YAML configuration files or data structures.'
  },
  'text/remove-extra-spaces': {
    id: 'remove-extra-spaces',
    category: 'text',
    name: 'Remove Extra Spaces',
    description: 'Remove extra spaces from text, such as leading/trailing spaces and multiple spaces between words. All processing happens in your browser.',
    icon: '✂️',
    keywords: ['text tools', 'remove spaces', 'trim text', 'text cleanup'],
    howToUse: [
      'Paste your text into the input area',
      'Click the "Remove Extra Spaces" button',
      'The cleaned text will appear in the output area',
      'Copy the cleaned text to your clipboard'
    ],
    useCase: 'Clean up text by removing unnecessary spaces, making it ready for use in documents, code, or other applications.'
  },
  'text/json-formatter': {
    id: 'json-formatter',
    category: 'text',
    name: 'JSON Formatter & Converter',
    description: 'Validate, format, minify, and convert JSON to XML, CSV, or YAML. All processing happens in your browser, no uploads required.',
    icon: '⚙️', // Using a gear icon, can be changed
    keywords: ['json formatter', 'json validator', 'json beautifier', 'json minifier', 'json to xml', 'json to csv', 'json to yaml', 'text tools', 'developer tools'],
    howToUse: [
      'Paste your JSON data into the input area or click "Upload Data" to load from a file.',
      'Click "Validate" to check if the JSON is well-formed.',
      'Select tab spacing and click "Format / Beautify" for readable JSON.',
      'Click "Minify / Compact" to get a compact version.',
      'Choose a target format (XML, CSV, YAML) and click "Convert".',
      'Click "Download" to save the output.'
    ],
    useCase: 'Ideal for developers and data analysts to quickly inspect, clean up, or transform JSON data for various applications without server-side processing.'
  },
  'ml/face_detect': {
    id: 'face_detect',
    category: 'ml',
    name: 'Face Detection',
    description: 'Detect faces in images using a MediaPipe model, all in your browser. No uploads, no server-side processing.',
    icon: '🧑‍💻',
    keywords: ['face detection', 'mediapipe', 'ml', 'ai', 'local ml'],
    howToUse: [
      'Upload an image with faces.',
      'The tool will highlight detected faces on the image.',
      'No data leaves your browser.'
    ],
    useCase: 'Quickly detect faces in images for privacy, fun, or research.'
  }
};

/**
 * Get full tool metadata by path
 * @param {string} path - Tool path (category/id)
 * @returns {Object} Tool metadata
 */
export function getToolMetadata(path) {
  return tools[path] || null;
}

/**
 * Get category metadata
 * @param {string} categoryId - Category ID
 * @returns {Object} Category metadata
 */
export function getCategoryMetadata(categoryId) {
  return categories[categoryId] || null;
}

/**
 * Generate HTML metadata tags for a tool or category
 * @param {string} path - Path (category or category/tool)
 * @returns {string} HTML metadata tags
 */
export function generateMetaTags(path) {
  const parts = path.split('/').filter(p => p);
  
  // Default metadata for home page
  let title = `${siteInfo.name} - Online Privacy-First Tools`;
  let description = siteInfo.description;
  let keywords = siteInfo.keywords;
  
  if (parts.length > 0) {
    const categoryId = parts[0];
    const category = getCategoryMetadata(categoryId);
    
    if (category) {
      if (parts.length === 1) {
        // Category page
        title = `${category.name} | ${siteInfo.name}`;
        description = category.description;
        keywords = category.keywords;
      } else if (parts.length === 2) {
        // Tool page
        const toolId = parts[1];
        const toolPath = `${categoryId}/${toolId}`;
        const tool = getToolMetadata(toolPath);
        
        if (tool) {
          title = `${tool.name} | ${siteInfo.name}`;
          description = tool.description;
          keywords = tool.keywords;
        }
      }
    }
  }
  
  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords.join(', ')}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://safewebtool.com${path === '/' ? '' : path}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
  `;
}

/**
 * Generate structured data for tools (JSON-LD)
 * @param {string} path - Tool path (category/id)
 * @returns {string} JSON-LD structured data
 */
export function generateStructuredData(path) {
  const tool = getToolMetadata(path);
  if (!tool) return '';
  
  const category = getCategoryMetadata(tool.category);
  if (!category) return '';
  
  const baseUrl = 'https://safewebtool.com';
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${tool.name} | ${siteInfo.name}`,
    "description": tool.description,
    "applicationCategory": "WebApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "url": `${baseUrl}/${tool.category}/${tool.id}`
  };
  
  return `
    <script type="application/ld+json">
      ${JSON.stringify(structuredData, null, 2)}
    </script>
  `;
}

/**
 * Generate welcome content for the landing page
 * @returns {string} HTML for the home page
 */
export function getWelcomeContent() {
  const formattedPhilosophy = siteInfo.philosophy
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

  const content = `
    <div class="container mx-auto px-4 py-8">
      <!-- Main Welcome Card -->
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-8 transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">Welcome to ${siteInfo.name}</h1>
          <p class="text-lg text-slate-600 dark:text-slate-300 text-center">${siteInfo.tagline}</p>
        </div>
        <div class="px-4 py-5 sm:p-6">
          <div class="bg-gradient-to-r from-sky-100 to-blue-100 dark:from-blue-900/20 dark:to-sky-900/20 rounded-xl p-6 md:p-8 shadow-sm transition-colors">
            <h2 class="text-2xl font-semibold text-blue-700 dark:text-blue-300 mb-3">Our Philosophy</h2>
            <p class="text-base text-slate-700 dark:text-slate-300 leading-relaxed">${formattedPhilosophy}</p>
          </div>
        </div>
      </div>
      
      ${Object.entries(categories).map(([categoryId, config], index) => `
        <!-- ${config.name} Tools Card -->
        <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-8 transition-colors" itemscope itemtype="https://schema.org/SoftwareApplication">
          <div class="category-toggle px-4 py-5 sm:px-6 flex items-center justify-between cursor-pointer select-none hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors" data-category="${categoryId}">
            <div class="flex-1">
              <h2 class="text-3xl font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-3" itemprop="applicationCategory">
                <span class="text-4xl">${config.icon}</span>
                ${config.name}
              </h2>
              <p class="text-slate-600 dark:text-slate-400 mt-2" itemprop="description">${config.description}</p>
            </div>
            <svg class="ml-4 h-6 w-6 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-300 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
          <div class="category-content overflow-hidden transition-all duration-300 ease-in-out" data-category-content="${categoryId}">
            <div class="px-4 py-5 sm:p-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${Object.entries(tools)
                  .filter(([path]) => path.startsWith(categoryId + '/'))
                  .map(([path, tool]) => {
                    return `
                      <a href="/${path}" class="bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 p-5 flex flex-col gap-2 hover:bg-white dark:hover:bg-gray-600 hover:shadow-md hover:border-slate-300 dark:hover:border-gray-500 transition-all duration-200">
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
      `).join('')}
    </div>
  `;

  return content;
}

/**
 * Get the template for a specific tool
 * @param {string} category - The category (video, image, text)
 * @param {string} toolId - The tool ID
 * @returns {string} The HTML template or null if not found
 */
export function getToolTemplate(category, toolId) {
  return null;
}

/**
 * Generate a 404 Not Found template
 * @returns {string} HTML for a 404 page
 */
export function get404Template() {
  return `
    <div class="container mx-auto px-4 py-8">
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-4xl font-bold text-slate-800 dark:text-slate-100 text-center">404 - Page Not Found</h1>
        </div>
        <div class="px-4 py-5 sm:p-6 text-center">
          <p class="text-lg text-slate-600 dark:text-slate-300 mb-6">Sorry, the page you requested does not exist.</p>
          <a href="/" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Back to Home</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate an error template
 * @param {string} title - The error title
 * @param {string} message - The error message
 * @param {string} [details] - Additional error details
 * @returns {string} HTML for an error page
 */
export function getErrorTemplate(title, message, details = '') {
  return `
    <div class="container mx-auto px-4 py-8">
      <div class="divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div class="px-4 py-5 sm:px-6">
          <h1 class="text-4xl font-bold text-red-600 dark:text-red-400 text-center">Error: ${title}</h1>
        </div>
        <div class="px-4 py-5 sm:p-6 text-center">
          <p class="text-lg text-slate-600 dark:text-slate-300 mb-6">${message}</p>
          ${details ? `<pre class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg p-4 text-left text-sm text-red-700 dark:text-red-300 mb-6 overflow-auto">${details}</pre>` : ''}
          <a href="/" class="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Back to Home</a>
        </div>
      </div>
    </div>
  `;
} 