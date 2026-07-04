/**
 * Browser-local ML inference manager.
 *
 * Creates a Worker via Blob URL (same pattern as ml/transcribe.js) so Vite
 * bundling and cross-origin isolation never interfere. Keeps one Worker alive
 * per page session; the worker caches the last loaded model so switching tools
 * that share a model (e.g. summarize + tone both use SmolLM2-360M) only
 * downloads once.
 */

// Inline worker source — avoids file URL / Vite bundling issues.
// Uses transformers.web.min.js (the browser-specific ESM build of v3).
const WORKER_SOURCE = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.web.min.js';

env.allowLocalModels = false;

let loadedModelId = null;
let loadedPipeline = null;
let loadingModelId = null;
let loadingPromise = null;

function getPipeline(task, modelId, onProgress) {
  if (loadedModelId === modelId && loadedPipeline) {
    return Promise.resolve(loadedPipeline);
  }
  if (loadingModelId === modelId && loadingPromise) {
    return loadingPromise;
  }

  loadingModelId = modelId;
  loadingPromise = pipeline(task, modelId, {
    progress_callback: (p) => self.postMessage({ type: 'progress', progress: p }),
    dtype: 'q4',
  })
    .then((pipe) => {
      loadedModelId = modelId;
      loadedPipeline = pipe;
      loadingModelId = null;
      loadingPromise = null;
      return pipe;
    })
    .catch((err) => {
      loadingModelId = null;
      loadingPromise = null;
      throw err;
    });

  return loadingPromise;
}

self.onmessage = async (event) => {
  const { id, ping, task, modelId, input, options } = event.data;

  if (ping) {
    self.postMessage({ id, type: 'result', result: 'pong' });
    return;
  }

  try {
    const pipe = await getPipeline(task, modelId, (p) => {
      self.postMessage({ id, type: 'progress', progress: p });
    });
    const result = await pipe(input, options);
    self.postMessage({ id, type: 'result', result });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error?.message || String(error) });
  }
};
`;

let worker = null;
const pending = new Map();

function getWorker() {
  if (worker) return worker;

  const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  worker = new Worker(url, { type: 'module' });

  worker.addEventListener('message', (event) => {
    const { id, type, result, error, progress } = event.data;

    if (type === 'progress') {
      // Broadcast progress to any pending request (model load affects all)
      for (const entry of pending.values()) {
        entry.onProgress?.(progress);
      }
      return;
    }

    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);

    if (type === 'error') entry.reject(new Error(error));
    else entry.resolve(result);
  });

  worker.addEventListener('error', (e) => {
    const msg = e.message || 'ML worker crashed';
    for (const entry of pending.values()) entry.reject(new Error(msg));
    pending.clear();
    worker = null; // allow retry on next call
  });

  return worker;
}

/**
 * Run a Transformers.js pipeline in the ML worker.
 * @param {string} task - Pipeline task, e.g. 'text-generation'
 * @param {string} modelId - Hugging Face model id (must have ONNX files on Hub)
 * @param {*} input - Pipeline input
 * @param {Object} [opts] - Pipeline options + optional onProgress callback
 * @returns {Promise<*>}
 */
export function runInference(task, modelId, input, opts = {}) {
  const { onProgress, ...pipelineOptions } = opts;
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, task, modelId, input, options: pipelineOptions });
  });
}

/** Check whether the ML worker is alive. */
export function pingWorker() {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, ping: true });
  });
}

const SPECIAL_TOKEN_RE = /<\|[^|>]*\|>/g;

/**
 * Strip an echoed prompt and model special tokens from raw text-generation output.
 */
export function cleanGeneratedText(fullText, prompt) {
  let text = fullText || '';
  if (prompt && text.startsWith(prompt)) text = text.slice(prompt.length);
  return text.replace(SPECIAL_TOKEN_RE, '').trim();
}

/**
 * Trim input to ~maxTokens using a 4-chars-per-token heuristic.
 */
export function trimForModel(text, maxTokens = 800) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return { text, trimmed: false };
  return { text: text.slice(0, maxChars), trimmed: true };
}
