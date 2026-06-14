import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { addLog, updateProgress } from '../common/utils.js';

let ffmpeg = null;

/**
 * Fetch with timeout to handle slow CDNs
 */
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  addLog(`Fetching: ${url}`, 'info');
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Try loading FFmpeg from multiple CDNs
 */
async function tryMultipleCDNs() {
  // CRITICAL: This specific CDN and version must be maintained
  const cdns = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',
    'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm',
    '/video/ffmpeg'  // Fallback to local files
  ];

  for (const baseURL of cdns) {
    try {
      addLog(`Trying CDN: ${baseURL}`, 'info');
      
      // Test if the CDN is responsive
      await fetchWithTimeout(`${baseURL}/ffmpeg-core.js`);
      addLog(`✓ CDN ${baseURL} is responsive`, 'success');

      // Create blob URLs for the FFmpeg files
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      );
      addLog('✓ Core JS blob URL created', 'success');

      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      );
      addLog('✓ WASM blob URL created', 'success');

      const workerURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        'text/javascript'
      );
      addLog('✓ Worker blob URL created', 'success');

      return { coreURL, wasmURL, workerURL };
    } catch (error) {
      addLog(`Failed to load from ${baseURL}: ${error.message}`, 'error');
      console.error(`CDN ${baseURL} failed:`, error);
      continue;
    }
  }
  throw new Error('All CDNs failed to load FFmpeg core files');
}

/**
 * Load FFmpeg WASM
 */
export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  try {
    addLog('Loading FFmpeg...', 'info');
    
    // Update the loading indicator if it exists
    updateLoadingIndicator(10, 'Initializing FFmpeg...');
    
    // Create a new FFmpeg instance
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      addLog(message, 'info');
    });

    ffmpeg.on('progress', ({ progress }) => {
      const percentage = Math.round(progress * 100);
      updateProgress(percentage);
      
      // Also update the loading indicator if it exists
      updateLoadingIndicator(10 + percentage * 0.9, 'Loading FFmpeg WASM...');
    });

    // Notify that we're fetching WASM files
    updateLoadingIndicator(20, 'Fetching FFmpeg WASM components...');
    
    // Try to prefetch FFmpeg files to improve loading performance
    try {
      prefetchFFmpegResources();
    } catch (e) {
      console.warn('Prefetch failed, continuing with normal loading', e);
    }
    
    // Load from CDN
    addLog('Loading FFmpeg from unpkg CDN...', 'info');
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    
    try {
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        // workerURL: `${baseURL}/ffmpeg-core.worker.js` // Omit initially, FFmpeg might find it or not need it with unpkg
      });
      addLog('FFmpeg loaded successfully from unpkg!', 'success');
    } catch (unpkgError) {
      addLog(`Failed to load FFmpeg from unpkg: ${unpkgError.message}. Attempting jsDelivr as fallback...`, 'error');
      console.error('unpkg load failed:', unpkgError);
      // Fallback to jsDelivr if unpkg fails, but try to find a working worker URL or omit if not strictly needed
      try {
        addLog('Attempting to load FFmpeg from jsDelivr (fallback)...', 'info');
        await ffmpeg.load({
          coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js',
          wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm',
          // workerURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.worker.js' // This was 404ing
          // If FFmpeg still requires a worker explicitly and jsDelivr's is 404, this will also fail.
          // We might need to verify if a worker is needed for this version or find an alternative worker URL.
        });
        addLog('FFmpeg loaded successfully from jsDelivr (fallback)!', 'success');
      } catch (jsdelivrError) {
        addLog(`Failed to load FFmpeg from jsDelivr as well: ${jsdelivrError.message}`, 'error');
        console.error('jsDelivr fallback load failed:', jsdelivrError);
        throw new Error(`Failed to load FFmpeg from all sources: unpkg -> ${unpkgError.message}, jsDelivr -> ${jsdelivrError.message}`);
      }
    }
    
    updateLoadingIndicator(100, 'FFmpeg loaded successfully!');
    addLog('FFmpeg loaded successfully!', 'success');
    return ffmpeg;
  } catch (error) {
    addLog(`Failed to load FFmpeg: ${error.message}`, 'error');
    updateLoadingIndicator(100, `Error: ${error.message}`, true);
    throw error;
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
 * Prefetch FFmpeg resources to improve loading performance
 */
function prefetchFFmpegResources() {
  const unpkgBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  const resourcesToPrefetch = [
    { url: `${unpkgBaseURL}/ffmpeg-core.js`, as: 'script' },
    { url: `${unpkgBaseURL}/ffmpeg-core.wasm`, as: 'fetch' },
    // { url: `${unpkgBaseURL}/ffmpeg-core.worker.js`, as: 'script' } // unpkg doesn't serve this file
  ];
  
  addLog('Prefetching FFmpeg resources from unpkg...', 'info');
  resourcesToPrefetch.forEach(resource => {
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource.url;
      link.as = resource.as;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      addLog(`Prefetch initiated for: ${resource.url}`, 'info');
    } catch (error) {
      // Silently ignore prefetch errors, as this is an optimization
      console.warn(`Prefetch failed for: ${resource.url}`, error);
    }
  });
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
    args.push('-c:a', 'libopus', '-b:a', '96k');
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
