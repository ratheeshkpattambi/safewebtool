/**
 * SharedWorker: browser-local ML inference via Transformers.js.
 * Lives for the origin's lifetime, so every tab/tool shares one instance and one
 * loaded pipeline in memory — switching tools that use the same model skips reload.
 */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js';

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
  loadingPromise = pipeline(task, modelId, { progress_callback: onProgress })
    .then((pipe) => {
      loadedModelId = modelId;
      loadedPipeline = pipe;
      loadingModelId = null;
      loadingPromise = null;
      return pipe;
    })
    .catch((error) => {
      loadingModelId = null;
      loadingPromise = null;
      throw error;
    });

  return loadingPromise;
}

async function handleRequest(port, data) {
  const { id, ping, task, modelId, input, options } = data;

  if (ping) {
    port.postMessage({ id, result: 'pong' });
    return;
  }

  try {
    const pipe = await getPipeline(task, modelId, (progress) => {
      port.postMessage({ id, progress });
    });
    const result = await pipe(input, options);
    port.postMessage({ id, result });
  } catch (error) {
    port.postMessage({ id, error: error?.message || String(error) });
  }
}

// SharedWorker context: each tab connects via its own port.
self.onconnect = (event) => {
  const port = event.ports[0];
  port.onmessage = (e) => handleRequest(port, e.data);
  port.start();
};

// Fallback context: ml-loader.js loads this same file as a plain dedicated Worker on
// browsers without SharedWorker support, where messages arrive on `self` directly.
self.onmessage = (e) => handleRequest(self, e.data);
