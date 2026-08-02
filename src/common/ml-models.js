/**
 * Single source of truth for every browser-local ML model.
 *
 * Same rule as `getCanonicalPathForToolPath()` in metadata.js: model ids, pinned
 * revisions and file lists live HERE and nowhere else. Do not hardcode a Hugging
 * Face repo id or a model URL in a tool module or a script — import from this file.
 * Two copies of URL logic drifted once and broke Google indexing; the same failure
 * mode applies to model weights, except it breaks silently at runtime.
 *
 * WHY REVISIONS ARE PINNED
 * ------------------------
 * Transformers.js resolves `{model}/resolve/{revision}/{file}`. With `revision`
 * left at its default (`main`), an upstream re-quantisation or file rename breaks
 * production with no deploy on our side. Every entry below pins a commit SHA, and
 * `npm run test:contract` fails if any entry omits one.
 *
 * SWITCHING BETWEEN THE MIRROR AND HUGGING FACE
 * ---------------------------------------------
 * Set VITE_MODEL_HOST in `.env` to serve weights from our R2 mirror; leave it unset
 * and everything falls back to huggingface.co. The mirror layout is byte-identical
 * to the Hub's, so `env.remotePathTemplate` stays at its default and the only client
 * change is `env.remoteHost`.
 *
 * See documentation/self-hosted-ml-models.md for the bucket setup and sync runbook.
 */

export const HF_HOST = 'https://huggingface.co/';

/** Trailing slash required — Transformers.js concatenates remoteHost + path. */
function normalizeHost(host) {
  if (!host || typeof host !== 'string') return null;
  const trimmed = host.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

// `import.meta.env` exists under Vite and is undefined under plain Node, so the
// sync script can import this module without blowing up.
export const MODEL_HOST = normalizeHost(import.meta.env?.VITE_MODEL_HOST) || HF_HOST;

/** True when weights are served from our own mirror rather than the Hub. */
export const USING_MIRROR = MODEL_HOST !== HF_HOST;

/**
 * Every model we serve.
 *
 * `files` lists ONLY what we actually mirror — never the whole repo. Kokoro's repo
 * alone is ~1.6 GB of dtypes we do not use. `dtype` must correspond to the ONNX
 * filenames listed; changing one without the other silently 404s at load time.
 */
export const MODELS = {
  /** Speech-to-text for ml/transcribe. */
  'whisper-base': {
    repo: 'onnx-community/whisper-base',
    revision: '1846881b6b3a3024392c1eea3ad983695bc23925',
    task: 'automatic-speech-recognition',
    mirrored: true,
    dtype: 'q8',
    /** Approximate total download, for the size shown in the UI before loading. */
    approxBytes: 80e6,
    files: [
      'config.json',
      'generation_config.json',
      'preprocessor_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'special_tokens_map.json',
      'added_tokens.json',
      'normalizer.json',
      'merges.txt',
      'vocab.json',
      'onnx/encoder_model_quantized.onnx',
      'onnx/decoder_model_merged_quantized.onnx',
    ],
  },

  /**
   * Text-to-speech for ml/text-to-speech (Kokoro-82M v1.0, Apache 2.0).
   *
   * dtype MUST be one kokoro-js's bundled Transformers.js accepts: auto, fp32, fp16,
   * q8, int8, uint8, q4, bnb4, q4f16. `q8f16` exists in the repo (86 MB, slightly
   * smaller) but is REJECTED at load time with "Invalid dtype" — don't reach for it.
   *
   * q8 -> onnx/model_quantized.onnx, 92 MB. Deliberately NOT q4, which is 305 MB in
   * this repo (q4 is larger than the q8 builds here, an artefact of how it was
   * quantised).
   *
   * kokoro-js hardcodes its voice URLs to huggingface.co and ignores
   * env.remoteHost, so the ML worker installs a fetch shim that rewrites Hub URLs
   * to MODEL_HOST. Without it, voices bypass the mirror entirely. See
   * documentation/self-hosted-ml-models.md §4.4.
   */
  'kokoro-82m': {
    repo: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    revision: '1939ad2a8e416c0acfeecc08a694d14ef25f2231',
    task: 'text-to-speech',
    mirrored: true,
    dtype: 'q8',
    approxBytes: 98e6,
    files: [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/model_quantized.onnx',
      // Ten voices, not all 54 — each is 0.5 MB and they are fetched individually.
      'voices/af_heart.bin',
      'voices/af_bella.bin',
      'voices/af_nicole.bin',
      'voices/am_michael.bin',
      'voices/am_puck.bin',
      'voices/bf_emma.bin',
      'voices/bm_george.bin',
      'voices/ef_dora.bin',
      'voices/jf_alpha.bin',
      'voices/zf_xiaobei.bin',
    ],
  },

  /**
   * Instruct models behind text/grammar-fix (135M) and text/summarize + text/tone (360M).
   *
   * These tools previously pointed at `onnx-community/SmolLM2-*-Instruct`, which now
   * returns 401 — the repos are gone, and three tools were dead in production with no
   * deploy on our side. Exactly the failure this registry exists to prevent.
   *
   * dtype stays q4 (not the smaller q4f16) because that is what these tools already
   * shipped with; changing precision changes output quality and is a separate decision.
   */
  'smollm2-135m': {
    repo: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    revision: '12fd25f77366fa6b3b4b768ec3050bf629380bac',
    task: 'text-generation',
    mirrored: true,
    dtype: 'q4',
    approxBytes: 186e6,
    files: [
      'config.json',
      'generation_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'special_tokens_map.json',
      'vocab.json',
      'merges.txt',
      'onnx/model_q4.onnx',
    ],
  },
  'smollm2-360m': {
    repo: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    revision: 'a10cc1512eabd3dde888204e902eca88bddb4951',
    task: 'text-generation',
    mirrored: true,
    dtype: 'q4',
    approxBytes: 392e6,
    files: [
      'config.json',
      'generation_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'special_tokens_map.json',
      'vocab.json',
      'merges.txt',
      'onnx/model_q4.onnx',
    ],
  },
};

/**
 * `repo -> pinned revision`, serialised into the ML worker so its fetch shim can
 * rewrite Hub URLs to the mirror AND force the pinned revision.
 *
 * The revision half matters more than it looks: `kokoro-js` calls
 * `KokoroTTS.from_pretrained()` with no `revision` option at all, so every request it
 * makes targets `resolve/main/`. Our mirror only stores `resolve/<sha>/`, so without
 * this rewrite every Kokoro fetch would 404 against the mirror.
 */
export const PINNED_REVISIONS = Object.fromEntries(
  Object.values(MODELS)
    // ONLY mirrored repos. Including an unmirrored one here would rewrite its URL to
    // R2, where the files do not exist, turning a working tool into a 404.
    .filter((model) => model.mirrored)
    .map(({ repo, revision }) => [repo, revision]),
);

/** Models actually mirrored to R2 — what `npm run sync:models` operates on. */
export const MIRRORED_MODEL_KEYS = Object.keys(MODELS).filter((key) => MODELS[key].mirrored);

/**
 * Rewrite a Hugging Face Hub URL to the mirror at its pinned revision.
 *
 * Defined here as a self-contained pure function with no closure over module scope,
 * because ml-loader.js serialises it into the worker with `.toString()` — a blob worker
 * cannot import by relative path. Keeping ONE definition means the shim the worker runs
 * is literally the function the tests assert on; a second copy would drift.
 *
 * Returns the input unchanged for any URL that is not a Hub URL for a repo we mirror.
 *
 * @param {string} url
 * @param {string} host - Mirror host, with trailing slash
 * @param {Record<string,string>} revisions - repo -> pinned commit SHA
 * @returns {string}
 */
export function toMirrorUrl(url, host, revisions) {
  if (typeof url !== 'string') return url;
  const match = url.match(/^https?:\/\/huggingface\.co\/(.+?)\/resolve\/[^/]+\/(.+)$/);
  if (!match) return url;
  const repo = match[1];
  const file = match[2];
  const revision = revisions[repo];
  if (!revision) return url;
  return host + repo + '/resolve/' + revision + '/' + file;
}

/** Bound to the configured host and pins — the form tools and tests use. */
export function mirrorUrlFor(url) {
  return toMirrorUrl(url, MODEL_HOST, PINNED_REVISIONS);
}

/**
 * Non-Hugging-Face model files we also mirror.
 *
 * These are plain URLs rather than `<repo>/resolve/<sha>/<file>` paths, so the fetch
 * shim (which only understands Hub URLs) cannot rewrite them — callers must ask for
 * the URL via getStaticAssetUrl() instead of hardcoding the vendor URL.
 */
export const STATIC_ASSETS = {
  /** MediaPipe BlazeFace, used by ml/face_detect. Removes storage.googleapis.com. */
  'blazeface-short-range': {
    source:
      'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    key: 'mediapipe/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    approxBytes: 230e3,
  },
};

/** Mirror URL when configured, otherwise the original vendor URL. */
export function getStaticAssetUrl(name) {
  const asset = STATIC_ASSETS[name];
  if (!asset) {
    throw new Error(`Unknown static asset "${name}". Known: ${Object.keys(STATIC_ASSETS).join(', ')}`);
  }
  return USING_MIRROR ? MODEL_HOST + asset.key : asset.source;
}

/** Look up a model, failing loudly rather than returning undefined. */
export function getModel(key) {
  const model = MODELS[key];
  if (!model) {
    throw new Error(`Unknown model "${key}". Known: ${Object.keys(MODELS).join(', ')}`);
  }
  return model;
}

/**
 * Options to hand to a Transformers.js `pipeline()` call so it loads the pinned
 * revision at the right precision.
 */
export function getPipelineOptions(key) {
  const { revision, dtype } = getModel(key);
  return { revision, dtype };
}

/** Path of one file relative to the host — identical on the Hub and the mirror. */
export function getModelFilePath(key, file) {
  const { repo, revision } = getModel(key);
  return `${repo}/resolve/${revision}/${file}`;
}

/** Absolute URL for one file on whichever host is configured. */
export function getModelFileUrl(key, file) {
  return MODEL_HOST + getModelFilePath(key, file);
}
