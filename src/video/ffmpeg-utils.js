import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { addLog, updateProgress } from '../common/utils.js';

let ffmpeg = null;
let ffmpegLoadPromise = null;

// Core version must match the @ffmpeg/core version in package.json.
const CORE_VERSION = '0.12.10';

const CORE_BASE_URLS = [
  '/ffmpeg',
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`
];

/**
 * Create and load an FFmpeg instance from the first working base URL.
 * Each base URL is tried with its own fresh FFmpeg instance so a partially
 * failed load doesn't leave the worker in a bad state for the next attempt.
 */
async function createFFmpegInstance(baseURLs) {
  let lastError;
  for (const baseURL of baseURLs) {
    const instance = new FFmpeg();
    instance.on('log', ({ message }) => addLog(message, 'info'));
    instance.on('progress', ({ progress }) => {
      updateProgress(Math.round(progress * 100));
    });

    try {
      addLog(`Loading FFmpeg core from ${baseURL}...`, 'info');
      updateLoadingIndicator(20, 'Loading FFmpeg core...');

      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      await instance.load({ coreURL, wasmURL });

      addLog(`FFmpeg core loaded from ${baseURL}`, 'success');
      updateLoadingIndicator(100, 'FFmpeg loaded successfully!');
      return instance;
    } catch (error) {
      lastError = error;
      addLog(`Failed to load FFmpeg core from ${baseURL}: ${error.message}`, 'error');
      instance.terminate();
    }
  }
  throw lastError || new Error('All FFmpeg core sources failed to load');
}

/**
 * Load FFmpeg WASM.
 */
export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    updateLoadingIndicator(10, 'Initializing FFmpeg...');
    return createFFmpegInstance(CORE_BASE_URLS);
  })();

  try {
    ffmpeg = await ffmpegLoadPromise;
    return ffmpeg;
  } catch (error) {
    addLog(`Failed to load FFmpeg: ${error.message}`, 'error');
    updateLoadingIndicator(100, `Error: ${error.message}`, true);
    throw error;
  } finally {
    ffmpegLoadPromise = null;
  }
}

/**
 * Update the loading indicator if it exists
 */
function updateLoadingIndicator(percent, message, isError = false) {
  const loadingEl = document.getElementById('ffmpeg-loading');
  if (loadingEl) {
    const progressFill = loadingEl.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
      progressFill.style.backgroundColor = isError ? '#e74c3c' : '';
    }

    const messageEl = loadingEl.querySelector('p');
    if (messageEl && message) {
      messageEl.textContent = message;
      if (isError) {
        messageEl.style.color = '#e74c3c';
      }
    }
  }
}

/**
 * Get file extension with dot
 */
export function getExtension(filename) {
  return '.' + filename.split('.').pop().toLowerCase();
}

/**
 * Write input file to FFmpeg virtual filesystem
 */
export async function writeInputFile(ffmpeg, fileName, file) {
  try {
    addLog('Writing input file...', 'info');
    await ffmpeg.writeFile(fileName, await fetchFile(file));
    addLog('Input file written successfully', 'success');
  } catch (error) {
    addLog(`Failed to write input file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Read output file from FFmpeg virtual filesystem
 */
export async function readOutputFile(ffmpeg, fileName) {
  try {
    addLog('Reading output file...', 'info');
    const data = await ffmpeg.readFile(fileName);
    addLog('Output file read successfully', 'success');
    return data;
  } catch (error) {
    addLog(`Failed to read output file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Execute FFmpeg command with proper logging
 */
export async function executeFFmpeg(ffmpeg, args) {
  try {
    addLog(`Executing FFmpeg command: ffmpeg ${args.join(' ')}`, 'info');
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}`);
    }
    addLog('FFmpeg command completed successfully', 'success');
  } catch (error) {
    const normalizedError = normalizeFFmpegError(error);
    addLog(`FFmpeg command failed: ${normalizedError.message}`, 'error');
    throw normalizedError;
  }
}

function normalizeFFmpegError(error) {
  if (error instanceof Error && error.message) return error;

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  if (error && typeof error === 'object') {
    const message = error.message || error.reason || error.name;
    if (message) return new Error(String(message));
  }

  return new Error('FFmpeg aborted while processing the video. Try MP4 output or lower settings.');
}

export function getX264EncodeArgs({ quality = 'medium', bitrateKbps = 2000, audio = true, faststart = true } = {}) {
  const preset =
    quality === 'high' ? 'medium' :
    quality === 'low' ? 'veryfast' :
    'fast';

  const crf =
    quality === 'high' ? '20' :
    quality === 'low' ? '29' :
    '24';

  const args = [
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', crf,
    '-pix_fmt', 'yuv420p',
    '-b:v', `${bitrateKbps}k`,
    '-maxrate', `${bitrateKbps}k`,
    '-bufsize', `${Math.max(1000, bitrateKbps * 2)}k`
  ];

  if (faststart) {
    args.push('-movflags', '+faststart');
  }

  if (audio) {
    args.push('-c:a', 'aac', '-b:a', '96k');
  } else {
    args.push('-an');
  }

  return args;
}

export function getFastWebMEncodeArgs({ quality = 'medium', bitrateKbps = 1200, audio = true } = {}) {
  // VP8 is significantly faster than VP9 in ffmpeg.wasm and is broadly compatible.
  const deadline =
    quality === 'high' ? 'good' :
    quality === 'low' ? 'realtime' :
    'realtime';

  const cpuUsed =
    quality === 'high' ? '4' :
    quality === 'low' ? '8' :
    '6';

  const args = [
    '-c:v', 'libvpx',
    '-b:v', `${bitrateKbps}k`,
    '-deadline', deadline,
    '-cpu-used', cpuUsed,
    '-auto-alt-ref', '0',
    '-pix_fmt', 'yuv420p'
  ];

  if (audio) {
    // libopus crashes @ffmpeg/core@0.12.10 with "memory access out of bounds"
    // regardless of resolution (https://github.com/ffmpegwasm/ffmpeg.wasm/issues/591).
    // libvorbis is the stable WebM audio codec for this core version.
    args.push('-c:a', 'libvorbis', '-b:a', '96k');
  } else {
    args.push('-an');
  }

  return args;
}

/**
 * Get FFmpeg instance
 */
export function getFFmpeg() {
  return ffmpeg;
}

/**
 * Clean up FFmpeg virtual filesystem.
 * Removes files to prevent memory issues or conflicts between operations.
 * @param {Object} ffmpegInstance - The FFmpeg instance to clean up.
 */
export async function cleanupFFmpeg(ffmpegInstance) {
  if (!ffmpegInstance) {
    addLog('cleanupFFmpeg: No FFmpeg instance provided.', 'warn');
    return;
  }

  if (typeof ffmpegInstance.listDir !== 'function' || typeof ffmpegInstance.deleteFile !== 'function') {
    addLog('cleanupFFmpeg: Provided instance does not appear to be a valid FFmpeg object with listDir/deleteFile.', 'error');
    return;
  }

  addLog('Cleaning up FFmpeg virtual filesystem...', 'info');
  try {
    const files = await ffmpegInstance.listDir('/');
    if (files.length === 0) {
      addLog('FFmpeg virtual filesystem is already empty.', 'info');
      return;
    }

    for (const file of files) {
      if (file.isFile) {
        try {
          await ffmpegInstance.deleteFile(file.name);
          addLog(`Deleted file: ${file.name}`, 'info');
        } catch (deleteError) {
          addLog(`Could not delete file ${file.name} during cleanup: ${deleteError.message}`, 'warn');
        }
      }
    }
    addLog('FFmpeg filesystem cleanup complete.', 'success');
  } catch (error) {
    addLog(`Error during FFmpeg filesystem cleanup: ${error.message}`, 'error');
    const commonFiles = [
      'input.mp4', 'output.mp4', 'input.mov', 'output.mov',
      'input.webm', 'output.webm', 'palette.png', 'output.gif'
    ];
    addLog('Attempting fallback cleanup for common files...', 'info');
    for (const fileName of commonFiles) {
      try {
        await ffmpegInstance.deleteFile(fileName);
        addLog(`Fallback: Deleted ${fileName}`, 'info');
      } catch (fallbackDeleteError) {
        // Silently ignore
      }
    }
  }
} 
