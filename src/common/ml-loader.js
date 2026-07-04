/**
 * Singleton manager for the browser-local ML worker used by AI text tools.
 * Uses a SharedWorker so a model loaded by one tool/tab is reused everywhere;
 * falls back to a dedicated Worker on browsers without SharedWorker support.
 */

let port = null;
const pending = new Map();

function handleMessage(event) {
  const { id, result, error, progress } = event.data;
  const entry = pending.get(id);
  if (!entry) return;

  if (progress !== undefined) {
    entry.onProgress?.(progress);
    return;
  }

  pending.delete(id);
  if (error) entry.reject(new Error(error));
  else entry.resolve(result);
}

function getPort() {
  if (port) return port;

  if (typeof SharedWorker !== 'undefined') {
    const sharedWorker = new SharedWorker(new URL('./ml-worker.js', import.meta.url), { type: 'module' });
    sharedWorker.port.start();
    port = sharedWorker.port;
  } else {
    // Fallback for older browsers without SharedWorker support.
    port = new Worker(new URL('./ml-worker.js', import.meta.url), { type: 'module' });
  }

  port.addEventListener('message', handleMessage);
  return port;
}

/**
 * Run a Transformers.js pipeline in the shared ML worker.
 * @param {string} task - Pipeline task, e.g. 'text-generation'
 * @param {string} modelId - Hugging Face model id
 * @param {*} input - Pipeline input
 * @param {Object} [options] - Pipeline call options, plus an optional onProgress(progress) callback
 * @returns {Promise<*>} Resolves with the pipeline output, rejects on worker/model error
 */
export function runInference(task, modelId, input, options = {}) {
  const { onProgress, ...pipelineOptions } = options;
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject, onProgress });
    getPort().postMessage({ id, task, modelId, input, options: pipelineOptions });
  });
}

/** Check whether the ML worker is alive and responding. */
export function pingWorker() {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject });
    getPort().postMessage({ id, ping: true });
  });
}

const SPECIAL_TOKEN_RE = /<\|[^|>]*\|>/g;

/**
 * Strip an echoed prompt and model special tokens (e.g. <|im_end|>) from a
 * text-generation pipeline's raw output.
 */
export function cleanGeneratedText(fullText, prompt) {
  let text = fullText || '';
  if (prompt && text.startsWith(prompt)) {
    text = text.slice(prompt.length);
  }
  return text.replace(SPECIAL_TOKEN_RE, '').trim();
}

/**
 * Trim text to roughly maxTokens using a ~4-chars-per-token heuristic, to keep
 * small in-browser models responsive on long inputs.
 */
export function trimForModel(text, maxTokens = 800) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return { text, trimmed: false };
  return { text: text.slice(0, maxChars), trimmed: true };
}
