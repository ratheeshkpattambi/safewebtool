/**
 * Shared author configuration for tools
 * 
 * This file centralizes author information and footer configuration
 * to avoid repetition across multiple tools.
 */

// Default author configuration
export const JAMSHEED_FOOTER = {
  author: 'Jamsheed Avaran Kutty',
  version: '1.0.0',
  links: [
    {
      text: 'GitHub',
      url: 'https://github.com/Jamsheed-CS',
      external: true
    },
    {
      text: 'LinkedIn', 
      url: 'https://www.linkedin.com/in/kjamsheed/',
      external: true
    },
    {
      text: 'Buy Me a Coffee',
      url: 'https://buymeacoffee.com/kjamsheed',
      external: true
    }
  ],
  showBackLink: false
};

// You can add more author configurations here
export const ANOTHER_AUTHOR_FOOTER = {
  author: 'Another Developer',
  version: '1.0.0',
  links: [
    {
      text: 'GitHub',
      url: 'https://github.com/another-dev',
      external: true
    },
    {
      text: 'Website',
      url: 'https://another-dev.com',
      external: true
    }
  ],
  showBackLink: true
};

/**
 * Helper function to create a custom footer with version override
 * @param {Object} baseConfig - Base configuration (e.g., JAMSHEED_FOOTER)
 * @param {string} version - Optional version override
 * @returns {Object} Footer configuration
 */
export function createFooterConfig(baseConfig, version = null) {
  return {
    ...baseConfig,
    version: version || baseConfig.version
  };
} 