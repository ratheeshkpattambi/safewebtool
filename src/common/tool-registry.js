import { categories, tools } from './metadata.js';

// Vite discovers all tool modules at build time; adding a new tool file in a category
// is enough for it to become loadable by the router.
const toolModuleLoaders = import.meta.glob('../(video|image|text|ml)/*.js');

function normalizePath(path = '/') {
  const withoutQuery = path.split('?')[0].split('#')[0] || '/';
  if (withoutQuery === '') return '/';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function buildFallbackTool(categoryId, toolId) {
  return {
    id: toolId,
    category: categoryId,
    name: toolId.charAt(0).toUpperCase() + toolId.slice(1),
    description: ''
  };
}

/**
 * Return a normalized route descriptor for a path.
 * This is the single source of truth for route parsing.
 * @param {string} path
 */
export function resolveAppRoute(path) {
  const normalizedPath = normalizePath(path);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (normalizedPath === '/sitemap.xml') {
    return { kind: 'sitemap', path: normalizedPath, segments };
  }

  if (normalizedPath === '/' || normalizedPath === '/home') {
    return { kind: 'home', path: normalizedPath, segments };
  }

  if (segments.length === 0) {
    return { kind: 'home', path: '/', segments: [] };
  }

  const [categoryId, toolId] = segments;
  const category = categories[categoryId];
  if (!category) {
    return { kind: 'not-found', path: normalizedPath, segments };
  }

  if (!toolId) {
    return { kind: 'category', path: normalizedPath, segments, categoryId, category };
  }

  const toolPath = `${categoryId}/${toolId}`;
  return {
    kind: 'tool',
    path: normalizedPath,
    segments,
    categoryId,
    toolId,
    toolPath,
    category,
    tool: tools[toolPath] || buildFallbackTool(categoryId, toolId)
  };
}

export function listToolsForCategory(categoryId) {
  return Object.entries(tools).filter(([path]) => path.startsWith(`${categoryId}/`));
}

export async function loadToolModule(categoryId, toolId) {
  const modulePath = `../${categoryId}/${toolId}.js`;

  if (toolModuleLoaders[modulePath]) {
    return toolModuleLoaders[modulePath]();
  }

  // Fallback helps in dev if glob pattern misses a path.
  return import(/* @vite-ignore */ `../${categoryId}/${toolId}.js`);
}

