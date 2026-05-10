import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, routeAliases, siteInfo, tools } from '../src/common/metadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const baseUrl = 'https://safewebtool.com';
const schemaVersion = '1.0';

const aliasByToolPath = Object.fromEntries(
  Object.entries(routeAliases).map(([aliasPath, toolPath]) => [toolPath, aliasPath])
);

function withoutLeadingSlash(value) {
  return value.replace(/^\//, '');
}

function canonicalPathForTool(toolPath, tool) {
  return tool.agent?.canonicalPath || aliasByToolPath[toolPath] || `/${toolPath}`;
}

function canonicalUrlForPath(pathname) {
  return `${baseUrl}${pathname}`;
}

function inferInputs(toolPath, tool) {
  if (tool.agent?.inputs) return tool.agent.inputs;
  if (['image', 'video'].includes(tool.category)) {
    return [{ name: 'file', type: 'file', accept: `${tool.category}/*` }];
  }
  if (tool.category === 'ml') {
    return [{ name: 'file or text', type: 'mixed', accept: '*/*' }];
  }
  if (tool.category === 'text') {
    return [{ name: 'text', type: 'text' }];
  }
  return [{ name: 'settings', type: 'form' }];
}

function inferOutputs(tool) {
  if (tool.agent?.outputs) return tool.agent.outputs;
  if (tool.category === 'text' || tool.category === 'time') {
    return [{ name: 'browser result', formats: ['text/html'] }];
  }
  return [{ name: 'download or browser result', formats: ['varies by tool'] }];
}

function inferSelectors(tool) {
  return {
    ready: '.tool-container[data-tool-ready="true"]',
    fileInput: ['image', 'video', 'ml'].includes(tool.category) ? '#fileInput' : undefined,
    process: '#processBtn',
    log: '#logContent',
    ...tool.agent?.selectors
  };
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, cleanObject(entry)])
  );
}

function buildToolContract(toolPath, tool) {
  const canonicalPath = canonicalPathForTool(toolPath, tool);
  const category = categories[tool.category];

  return cleanObject({
    schemaVersion,
    id: tool.id,
    path: toolPath,
    canonicalPath,
    canonicalUrl: canonicalUrlForPath(canonicalPath),
    legacyUrl: canonicalPath === `/${toolPath}` ? undefined : canonicalUrlForPath(`/${toolPath}`),
    category: {
      id: tool.category,
      name: category?.name
    },
    name: tool.name,
    description: tool.description,
    privacy: tool.agent?.privacy || {
      mode: 'browser-local',
      fileUpload: false,
      note: 'SafeWebTool tools are designed to process user data locally in the browser.'
    },
    inputs: inferInputs(toolPath, tool),
    outputs: inferOutputs(tool),
    selectors: inferSelectors(tool),
    howToUse: tool.howToUse,
    useCase: tool.useCase,
    keywords: tool.keywords,
    externalDownloads: tool.agent?.externalDownloads || [],
    exampleTasks: tool.agent?.exampleTasks || [
      `Open ${canonicalUrlForPath(canonicalPath)} and use ${tool.name}.`
    ],
    automationNotes: [
      'Prefer the stable selectors in this contract over visible text where possible.',
      'Wait for selectors.ready before interacting with the tool UI.',
      'Do not upload private user media to a remote agent service; operate the browser-local UI instead.'
    ]
  });
}

function buildToolsManifest(contracts) {
  return {
    schemaVersion,
    site: {
      name: siteInfo.name,
      url: baseUrl,
      description: siteInfo.description,
      privacy: siteInfo.philosophy
    },
    agentPolicy: {
      preferredMode: 'browser-automation',
      mcpRecommendation: 'Use MCP for read-only discovery resources first. Keep private image/video processing in the user browser.',
      privacyRule: 'Do not send user media files to remote services unless the user explicitly requests that.'
    },
    discovery: {
      llmsTxt: `${baseUrl}/llms.txt`,
      toolsJson: `${baseUrl}/tools.json`,
      agentContractPattern: `${baseUrl}/{category}/{tool}/agent.json`
    },
    categories,
    tools: Object.fromEntries(contracts.map(contract => [contract.path, contract]))
  };
}

function buildLlmsText(contracts) {
  const lines = [
    '# SafeWebTool',
    '',
    '> Privacy-focused browser tools for video, image, text, ML, and time utilities. User files should stay in the browser.',
    '',
    'Primary site: https://safewebtool.com/',
    'Machine-readable tool catalog: https://safewebtool.com/tools.json',
    'Sitemap: https://safewebtool.com/sitemap.xml',
    '',
    '## Agent Policy',
    '',
    '- Prefer browser automation for tools that process private files.',
    '- Do not send user media to a remote service for SafeWebTool processing.',
    '- Use per-tool agent.json files for stable selectors, inputs, outputs, and privacy notes.',
    '- MCP, if used, should initially expose read-only discovery resources, not remote private-media processing.',
    '',
    '## Tool URLs',
    ''
  ];

  for (const contract of contracts) {
    lines.push(`- ${contract.name}: ${contract.canonicalUrl}`);
    lines.push(`  - Agent contract: ${contract.canonicalUrl}/agent.json`);
    if (contract.legacyUrl) {
      lines.push(`  - Legacy URL: ${contract.legacyUrl}`);
    }
  }

  lines.push('');
  lines.push('## Categories');
  lines.push('');

  for (const category of Object.values(categories)) {
    lines.push(`- ${category.name}: ${baseUrl}/${category.id}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const contracts = Object.entries(tools)
    .map(([toolPath, tool]) => buildToolContract(toolPath, tool))
    .sort((a, b) => a.path.localeCompare(b.path));

  await writeFile(path.join(publicDir, 'llms.txt'), buildLlmsText(contracts));
  await writeJson(path.join(publicDir, 'tools.json'), buildToolsManifest(contracts));

  const agentDirs = new Set([
    ...contracts.map(contract => path.join(publicDir, withoutLeadingSlash(contract.canonicalPath), 'agent.json')),
    ...Object.keys(routeAliases).map(aliasPath => path.join(publicDir, withoutLeadingSlash(aliasPath), 'agent.json'))
  ]);

  for (const filePath of agentDirs) {
    await rm(filePath, { force: true });
  }

  for (const contract of contracts) {
    await writeJson(path.join(publicDir, withoutLeadingSlash(contract.canonicalPath), 'agent.json'), contract);
  }

  console.log(`Generated agent manifests for ${contracts.length} tools.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
