#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { tools, categories } from '../src/common/metadata.js';

const args = process.argv.slice(2);
const toolPath = args.find(arg => !arg.startsWith('--'));
const runMobile = args.includes('--mobile') || args.includes('--all-projects');
const runReal = args.includes('--real') || args.includes('--full');
const skipContract = args.includes('--no-contract');
const reporter = 'line';

function usage() {
  console.error([
    'Usage: npm run test:tool -- <category/toolId> [--mobile] [--real] [--no-contract]',
    '',
    'Examples:',
    '  npm run test:tool -- image/resize',
    '  npm run test:tool -- video/reencode --mobile --real',
    '  npm run test:tool -- text/json-formatter --mobile'
  ].join('\n'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function run(command, commandArgs) {
  console.log(`\n$ ${[command, ...commandArgs].join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!toolPath || !tools[toolPath]) {
  usage();
  if (toolPath) {
    console.error(`\nUnknown tool "${toolPath}". Known tools:\n${Object.keys(tools).map(path => `  - ${path}`).join('\n')}`);
  }
  process.exit(1);
}

const tool = tools[toolPath];
const category = categories[tool.category];
const projects = runMobile ? ['chromium-desktop', 'chromium-mobile'] : ['chromium-desktop'];
const projectArgs = projects.flatMap(project => ['--project', project]);

if (!skipContract) {
  run('node', ['scripts/validate-tool-contract.mjs']);
}

const smokeGrep = [
  `tool: ${escapeRegExp(tool.name)}`,
  `metadata: ${escapeRegExp(tool.name)}`,
  `category: ${escapeRegExp(category.name)}`
].join('|');

run('npx', [
  'playwright',
  'test',
  'tests/all.spec.js',
  ...projectArgs,
  '--reporter',
  reporter,
  '--grep',
  smokeGrep
]);

if (!runReal) {
  console.log('\nFast tool validation passed. Add --real for category-specific file-processing checks.');
  process.exit(0);
}

if (tool.category === 'image') {
  run('npx', [
    'playwright',
    'test',
    'tests/image-tools-e2e.spec.js',
    ...projectArgs,
    '--reporter',
    reporter,
    '--grep',
    escapeRegExp(toolPath)
  ]);
}

if (tool.category === 'video') {
  const videoSpecs = ['tests/video-ui-consistency.spec.js'];
  const videoOpsGrepByTool = {
    'video/reencode': 'reencode default',
    'video/mp4': 'convert to MP4 tool',
    'video/resize': 'resize video',
    'video/trim': 'trim video',
    'video/reverse': 'reverse video'
  };

  if (toolPath === 'video/reencode') {
    videoSpecs.push('tests/reencode-downloaded.spec.js', 'tests/reencode-downloaded-mp4.spec.js');
  }

  if (toolPath === 'video/audio') {
    videoSpecs.push('tests/video-audio-tool.spec.js');
  }

  run('npx', [
    'playwright',
    'test',
    ...videoSpecs,
    ...projectArgs,
    '--reporter',
    reporter,
    '--workers',
    '1'
  ]);

  if (videoOpsGrepByTool[toolPath]) {
    run('npx', [
      'playwright',
      'test',
      'tests/video-ops-downloaded.spec.js',
      ...projectArgs,
      '--reporter',
      reporter,
      '--workers',
      '1',
      '--grep',
      videoOpsGrepByTool[toolPath]
    ]);
  }
}

console.log('\nTool validation passed.');
