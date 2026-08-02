/**
 * Browser-local ML inference manager.
 *
 * Creates a Worker via Blob URL (same pattern as ml/transcribe.js) so Vite
 * bundling and cross-origin isolation never interfere. Keeps one Worker alive
 * per page session; the worker caches the last loaded model so switching tools
 * that share a model (e.g. summarize + tone both use SmolLM2-360M) only
 * downloads once.
 */

import { MODEL_HOST, PINNED_REVISIONS, getModel, toMirrorUrl } from './ml-models.js';

/*
 * MUST be the `+esm` build, and MUST be version-pinned.
 *
 * `@huggingface/transformers@3/dist/transformers.web.min.js` — the URL this file used
 * previously — contains a bare `import ... from "onnxruntime-common"` that no browser
 * can resolve, so the worker died on startup with an empty ErrorEvent and every tool
 * built on it (summarize, tone, grammar-fix) silently reported "ML worker crashed".
 * jsdelivr's `+esm` endpoint rewrites bare specifiers; the `/dist/` file does not.
 *
 * The floating `@3` range is also how this broke without a deploy — the same class of
 * failure that motivated pinning model revisions in ml-models.js.
 *
 * This URL is the ONLY place the Transformers.js version is declared. The npm package
 * was removed from package.json because nothing ever imported it — it was dead weight
 * that only dragged in `sharp`, a Node-side image library that never reaches the
 * browser but did carry four libvips CVEs. Bump the version here, not in package.json.
 */
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.6.3/+esm';

/**
 * kokoro-js ships a self-contained web build that bundles its OWN copy of
 * Transformers.js. Configuring `env` from the import above therefore does not affect
 * it — its env must be set on the module's own export (see getTTS).
 */
const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';

// Inline worker source — avoids file URL / Vite bundling issues.
// Uses transformers.web.min.js (the browser-specific ESM build of v3).
//
// MODEL_HOST and the pinned revisions are interpolated as JSON because a blob worker
// has no module base URL and so cannot import ml-models.js by relative path.
const WORKER_SOURCE = `
import { pipeline, env } from '${TRANSFORMERS_URL}';

const MODEL_HOST = ${JSON.stringify(MODEL_HOST)};
const PINNED_REVISIONS = ${JSON.stringify(PINNED_REVISIONS)};
const HF_HOST = 'https://huggingface.co/';

env.allowLocalModels = false;

// NOTE: deliberately NOT setting env.remoteHost. It is global, so it would also
// redirect models we have NOT mirrored (the SmolLM2 models behind summarize/tone/
// grammar-fix) to R2, where they 404. The fetch shim below routes per repo instead:
// mirrored repos go to R2, everything else falls through to the Hub untouched.

/*
 * Fetch shim — rewrites any Hugging Face Hub URL to the mirror at its pinned revision.
 *
 * env.remoteHost alone is NOT enough. kokoro-js hardcodes
 *   https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/<v>.bin
 * and never consults env, so without this the model would load from the mirror while
 * every voice quietly came from huggingface.co. It also pins the revision, since
 * kokoro-js offers no way to pass one and our mirror stores only resolve/<sha>/.
 *
 * The rewrite function is injected verbatim from ml-models.js via .toString() so there
 * is exactly one definition — the one the tests assert on. Note that the browser Cache
 * API still keys on the ORIGINAL Hub URL, so cache contents are not evidence of where
 * bytes came from; assert on toMirrorUrl or on response.url instead.
 */
${toMirrorUrl.toString()}

const rewrite = (url) => toMirrorUrl(url, MODEL_HOST, PINNED_REVISIONS);

if (MODEL_HOST !== HF_HOST) {
  const nativeFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    if (typeof input === 'string') return nativeFetch(rewrite(input), init);
    if (input instanceof Request) {
      const rewritten = rewrite(input.url);
      if (rewritten !== input.url) return nativeFetch(rewritten, init);
    }
    return nativeFetch(input, init);
  };
}

let kokoroPromise = null;
let ttsInstance = null;
let ttsModelId = null;

async function getTTS(modelId, dtype, onProgress) {
  if (ttsInstance && ttsModelId === modelId) return ttsInstance;
  kokoroPromise ??= import(${JSON.stringify(KOKORO_URL)});
  const kokoro = await kokoroPromise;
  // kokoro bundles its OWN copy of Transformers.js, so the env configured above does
  // not apply to it. Only allowLocalModels is set here — remoteHost is left alone for
  // the same reason as above; the fetch shim does the routing.
  if (kokoro.env) {
    kokoro.env.allowLocalModels = false;
    // This site is cross-origin isolated site-wide for FFmpeg's SharedArrayBuffer, so
    // self.crossOriginIsolated is true here too — which makes onnxruntime-web pick its
    // multi-threaded WASM build and spawn navigator.hardwareConcurrency pthread workers
    // NESTED inside this already-a-worker context. That's the documented cause of
    // Kokoro hanging/crashing mobile Safari and Android Chrome (nested WASM-thread
    // workers on constrained memory) — the same class of bug as the multi-threaded
    // FFmpeg core this codebase already avoids for the same reason. Force single-
    // threaded WASM so TTS never spawns worker threads of its own.
    if (kokoro.env.backends?.onnx?.wasm) {
      kokoro.env.backends.onnx.wasm.numThreads = 1;
      kokoro.env.backends.onnx.wasm.proxy = false;
    }
  }
  const { KokoroTTS } = kokoro;
  ttsInstance = await KokoroTTS.from_pretrained(modelId, {
    dtype,
    device: 'wasm',
    progress_callback: onProgress,
  });
  ttsModelId = modelId;
  return ttsInstance;
}

let loadedModelId = null;
let loadedPipeline = null;
let loadingModelId = null;
let loadingPromise = null;

function getPipeline(task, modelId, onProgress, loadOptions = {}) {
  if (loadedModelId === modelId && loadedPipeline) {
    return Promise.resolve(loadedPipeline);
  }
  if (loadingModelId === modelId && loadingPromise) {
    return loadingPromise;
  }

  // dtype defaults to q4 for the SmolLM2 tools, which predate the model registry.
  // Anything in ml-models.js should pass its own dtype and pinned revision instead.
  const { dtype = 'q4', revision } = loadOptions;

  loadingModelId = modelId;
  loadingPromise = pipeline(task, modelId, {
    progress_callback: (p) => self.postMessage({ type: 'progress', progress: p }),
    dtype,
    ...(revision ? { revision } : {}),
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
  const { id, ping, task, modelId, input, options, loadOptions } = event.data;

  if (ping) {
    self.postMessage({ id, type: 'result', result: 'pong' });
    return;
  }

  const reportProgress = (p) => self.postMessage({ id, type: 'progress', progress: p });

  try {
    // Kokoro is not a Transformers.js pipeline — it has its own loader class.
    if (task === 'text-to-speech') {
      const { voice, speed } = options || {};
      const tts = await getTTS(modelId, loadOptions?.dtype, reportProgress);
      const audio = await tts.generate(input, { voice, speed });
      const wav = audio.toWav();
      self.postMessage(
        { id, type: 'result', result: { wav, samplingRate: audio.sampling_rate } },
        [wav],
      );
      return;
    }

    const pipe = await getPipeline(task, modelId, reportProgress, loadOptions);
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
  const { onProgress, loadOptions, ...pipelineOptions } = opts;
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, task, modelId, input, options: pipelineOptions, loadOptions });
  });
}

/**
 * Synthesise speech with Kokoro, entirely in the browser.
 *
 * Resolves to `{ wav, samplingRate }` where `wav` is a transferred ArrayBuffer of a
 * complete RIFF/WAVE file, ready to drop into a Blob.
 *
 * @param {string} modelKey - Key into MODELS in ml-models.js
 * @param {string} text - Text to speak
 * @param {{ voice?: string, speed?: number, onProgress?: Function }} [opts]
 * @returns {Promise<{ wav: ArrayBuffer, samplingRate: number }>}
 */
export function runTextToSpeech(modelKey, text, opts = {}) {
  const { voice, speed, onProgress } = opts;
  const { repo, dtype } = getModel(modelKey);
  return runInference('text-to-speech', repo, text, {
    voice,
    speed,
    onProgress,
    // Revision is forced by the worker's fetch shim, since kokoro-js accepts no
    // revision option of its own.
    loadOptions: { dtype },
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
 * Extract model output text and strip special tokens.
 *
 * When `runInference` is called with a chat message array (the SmolLM2 instruct
 * models require this — they're trained on ChatML and free-associate on raw string
 * prompts instead of following the instruction), Transformers.js returns
 * `generated_text` as the full conversation array with the reply appended, not a
 * string. `fullText` is the array in that case; `prompt` is unused. For plain string
 * completions, `fullText` is the echoed prompt + completion and `prompt` is stripped.
 */
export function cleanGeneratedText(fullText, prompt) {
  if (Array.isArray(fullText)) {
    const reply = fullText[fullText.length - 1]?.content || '';
    return reply.replace(SPECIAL_TOKEN_RE, '').trim();
  }
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
