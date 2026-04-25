#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, tools } from '../src/common/metadata.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'src');
const ignoredModulePaths = new Set([
  'image/sample-image',
  'video/ffmpeg-utils'
]);

const requiredToolFields = [
  'id',
  'category',
  'name',
  'description',
  'icon',
  'keywords',
  'howToUse',
  'useCase'
];

const errors = [];
const warnings = [];

function reportError(message) {
  errors.push(message);
}

function reportWarning(message) {
  warnings.push(message);
}

function modulePathFor(toolPath) {
  return path.join(srcDir, `${toolPath}.js`);
}

function hasInitToolExport(source) {
  return /export\s+(async\s+)?function\s+initTool\s*\(/.test(source) ||
    /export\s+const\s+initTool\s*=/.test(source);
}

function hasTemplateExport(source) {
  return /export\s+const\s+template\s*=/.test(source) ||
    /export\s*\{\s*[^}]*template[^}]*\}/.test(source);
}

for (const [categoryId, category] of Object.entries(categories)) {
  if (category.id !== categoryId) {
    reportError(`Category "${categoryId}" has mismatched id "${category.id}".`);
  }

  for (const field of ['id', 'name', 'description', 'icon', 'keywords']) {
    if (!category[field] || (Array.isArray(category[field]) && category[field].length === 0)) {
      reportError(`Category "${categoryId}" is missing required field "${field}".`);
    }
  }
}

const seenIdsByCategory = new Map();
for (const [toolPath, tool] of Object.entries(tools)) {
  const [categoryId, toolId] = toolPath.split('/');

  if (!categoryId || !toolId || toolPath.split('/').length !== 2) {
    reportError(`Tool key "${toolPath}" must be exactly "category/toolId".`);
    continue;
  }

  if (!categories[categoryId]) {
    reportError(`Tool "${toolPath}" references missing category "${categoryId}".`);
  }

  if (tool.id !== toolId) {
    reportError(`Tool "${toolPath}" has mismatched id "${tool.id}".`);
  }

  if (tool.category !== categoryId) {
    reportError(`Tool "${toolPath}" has mismatched category "${tool.category}".`);
  }

  for (const field of requiredToolFields) {
    if (!tool[field] || (Array.isArray(tool[field]) && tool[field].length === 0)) {
      reportError(`Tool "${toolPath}" is missing required metadata field "${field}".`);
    }
  }

  const ids = seenIdsByCategory.get(categoryId) || new Set();
  if (ids.has(toolId)) {
    reportError(`Duplicate tool id "${toolId}" in category "${categoryId}".`);
  }
  ids.add(toolId);
  seenIdsByCategory.set(categoryId, ids);

  const modulePath = modulePathFor(toolPath);
  if (!existsSync(modulePath)) {
    reportError(`Tool "${toolPath}" is missing module file src/${toolPath}.js.`);
    continue;
  }

  const source = readFileSync(modulePath, 'utf8');
  if (!hasInitToolExport(source)) {
    reportError(`Tool module src/${toolPath}.js must export initTool().`);
  }

  if (!hasTemplateExport(source)) {
    reportWarning(`Tool module src/${toolPath}.js does not export template; this is OK only for non-UI modules.`);
  }
}

for (const categoryId of Object.keys(categories)) {
  const categoryDir = path.join(srcDir, categoryId);
  if (!existsSync(categoryDir)) {
    reportWarning(`Category "${categoryId}" has no src/${categoryId}/ directory yet.`);
    continue;
  }

  for (const entry of readdirSync(categoryDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const toolPath = `${categoryId}/${entry.name.replace(/\.js$/, '')}`;
    if (ignoredModulePaths.has(toolPath)) continue;

    if (!tools[toolPath]) {
      reportError(`Tool-like module src/${toolPath}.js has no metadata entry.`);
    }
  }
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  console.error(`\nTool contract validation failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`Tool contract validation passed for ${Object.keys(tools).length} tools in ${Object.keys(categories).length} categories.`);
