/**
 * Speech-to-Text transcription using Whisper
 */
import { Tool } from '../common/base.js';

export const template = `
    <div class="tool-container">
      <h1 class="text-2xl font-bold mb-6">Audio/Video Transcription</h1>
      
      <!-- Settings Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label for="transcribe-model-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
          <select id="transcribe-model-select" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="Xenova/whisper-tiny.en" selected>Whisper Tiny (English)</option>
            <option value="Xenova/whisper-base.en">Whisper Base (English)</option>
            <option value="Xenova/whisper-small.en">Whisper Small (English)</option>
            <option value="Xenova/whisper-tiny">Whisper Tiny (Multilingual)</option>
            <option value="Xenova/whisper-base">Whisper Base (Multilingual)</option>
          </select>
        </div>
        <div id="transcribe-task-container">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task</label>
          <div class="flex items-center space-x-4">
            <label class="inline-flex items-center">
              <input type="radio" id="transcribe-task-transcribe" name="transcribe-task" value="transcribe" class="form-radio h-4 w-4 text-blue-600" checked>
              <span class="ml-2 text-gray-700 dark:text-gray-300">Transcribe</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" id="transcribe-task-translate" name="transcribe-task" value="translate" class="form-radio h-4 w-4 text-blue-600">
              <span class="ml-2 text-gray-700 dark:text-gray-300">Translate to English</span>
            </label>
          </div>
        </div>
        <div>
          <label for="transcribe-timestamps" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Options</label>
          <label class="inline-flex items-center">
            <input type="checkbox" id="transcribe-timestamps" class="form-checkbox h-4 w-4 text-blue-600 rounded">
            <span class="ml-2 text-gray-700 dark:text-gray-300">Return timestamps</span>
          </label>
        </div>
      </div>
      <div id="transcribe-language-container" class="mb-6 hidden">
          <label for="transcribe-language-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
          <input id="transcribe-language-input" list="transcribe-language-list" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Spanish">
          <datalist id="transcribe-language-list">
            <option value="English">
            <option value="Spanish">
            <option value="French">
            <option value="German">
            <option value="Italian">
            <option value="Portuguese">
            <option value="Russian">
            <option value="Chinese">
            <option value="Japanese">
            <option value="Korean">
          </datalist>
      </div>

      <!-- File Upload Section -->
      <div class="mb-6">
        <div id="transcribe-drop-zone" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
          <div class="text-gray-400 dark:text-gray-500 mb-4">
            <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-700 dark:text-gray-300">Drop audio/video file here</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to select file</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">Supports: MP3, WAV, MP4, MOV, AVI</p>
        </div>
        <input id="transcribe-file-input" type="file" accept="audio/*,video/*" class="hidden" />
      </div>

      <!-- URL Input Section -->
      <div class="mb-6">
        <label for="transcribe-url-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or enter audio/video URL:</label>
        <div class="flex gap-2">
          <input id="transcribe-url-input" type="url" placeholder="https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav" class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button id="transcribe-url-btn" class="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Load URL</button>
        </div>
      </div>

      <!-- Preview Section -->
      <div id="transcribe-preview" class="mb-6" style="display: none;">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Preview:</h3>
        <div id="transcribe-preview-content" class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <audio id="transcribe-audio-preview" controls class="w-full hidden"></audio>
            <video id="transcribe-video-preview" controls class="w-full max-h-64 hidden"></video>
            <p id="transcribe-filename" class="text-sm text-gray-600 dark:text-gray-400 mt-2"></p>
        </div>
      </div>

      <!-- Process Button -->
      <div class="mb-6">
        <button id="transcribe-process-btn" class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
          Transcribe Audio/Video
        </button>
      </div>

      <!-- Progress Section -->
      <div id="transcribe-progress" class="mb-6" style="display: none;">
        <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Processing...</span>
            <span id="transcribe-progress-text" class="text-sm text-gray-500 dark:text-gray-400">0%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div id="transcribe-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>

      <!-- Result Section -->
      <div id="transcribe-result" class="mb-6" style="display: none;">
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Transcription Result:</h3>
          <div id="transcribe-result-text" class="text-green-700 dark:text-green-300 mb-4"></div>
          <div class="flex gap-2">
            <button id="transcribe-copy-btn" class="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors">Copy Text</button>
            <button id="transcribe-download-btn" class="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors">Download as TXT</button>
          </div>
        </div>
      </div>

      <!-- Logs Section -->
      <div id="transcribe-logs" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="transcribe-log-text" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none" readonly></textarea>
    </div>
`;

class TranscribeTool extends Tool {
    constructor(config = {}) {
        super({
            ...config,
            category: 'ml',
            needsFileUpload: true,
            hasOutput: true,
            needsProcessButton: true,
            template
        });
        this.logText = '';
        this.currentFile = null;
        this.currentUrl = null;
    }

    getElementsMap() {
        return {
            // Model and task selection
            modelSelect: 'transcribe-model-select',
            taskContainer: 'transcribe-task-container',
            taskTranscribe: 'transcribe-task-transcribe',
            taskTranslate: 'transcribe-task-translate',
            languageContainer: 'transcribe-language-container',
            languageInput: 'transcribe-language-input',
            timestamps: 'transcribe-timestamps',
            // Existing elements
            dropZone: 'transcribe-drop-zone',
            fileInput: 'transcribe-file-input',
            urlInput: 'transcribe-url-input',
            urlBtn: 'transcribe-url-btn',
            processBtn: 'transcribe-process-btn',
            preview: 'transcribe-preview',
            previewContent: 'transcribe-preview-content',
            audioPreview: 'transcribe-audio-preview',
            videoPreview: 'transcribe-video-preview',
            fileName: 'transcribe-filename',
            progress: 'transcribe-progress',
            progressBar: 'transcribe-progress-bar',
            progressText: 'transcribe-progress-text',
            result: 'transcribe-result',
            resultText: 'transcribe-result-text',
            copyBtn: 'transcribe-copy-btn',
            downloadBtn: 'transcribe-download-btn',
            logs: 'transcribe-logs',
            logText: 'transcribe-log-text'
        };
    }

    async setup() {
        this.addLog('Audio/Video Transcription Tool v7.1.0 - Starting...', 'info');
        this._initializeUI();
    }
    
    _initializeUI() {
        const { 
            dropZone, fileInput, urlBtn, urlInput, processBtn, 
            copyBtn, downloadBtn, logs, modelSelect, languageContainer, timestamps
        } = this.elements;

        // File upload
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-blue-500'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500');
            if (e.dataTransfer.files.length) this._handleNewInput(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', e => {
            if (e.target.files.length) this._handleNewInput(e.target.files[0]);
        });

        // URL input
        const defaultUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
        urlInput.value = defaultUrl;
        this._handleNewInput(defaultUrl);
        
        urlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) this._handleNewInput(url);
            else this.addLog('Please enter a valid URL', 'error');
        });
        urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') urlBtn.click(); });

        // Action buttons
        processBtn.addEventListener('click', () => this.processAudio());
        copyBtn.addEventListener('click', () => this.copyResult());
        downloadBtn.addEventListener('click', () => this.downloadResult());

        // Logs toggle
        logs.addEventListener('click', () => {
            const logText = this.elements.logText;
            const isVisible = logText.style.display !== 'none';
            logText.style.display = isVisible ? 'none' : 'block';
            logs.querySelector('span:last-child').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        });
        
        // Settings
        modelSelect.addEventListener('change', () => {
            const isMultilingual = !modelSelect.value.endsWith('.en');
            languageContainer.classList.toggle('hidden', !isMultilingual);
            this.elements.taskContainer.classList.toggle('hidden', !isMultilingual);
        });
        modelSelect.dispatchEvent(new Event('change'));

        // Timestamps checkbox
        timestamps.addEventListener('change', () => {
            this.elements.processBtn.disabled = false; // Re-enable process button if model is selected
        });
        timestamps.dispatchEvent(new Event('change')); // Initial state
    }

    _handleNewInput(input) {
        if (typeof input === 'string') {
            this.currentUrl = input;
            this.currentFile = null;
            this.addLog(`URL selected: ${input}`, 'info');
        } else {
            this.currentFile = input;
            this.currentUrl = null;
            this.addLog(`File selected: ${input.name} (${this.formatFileSize(input.size)})`, 'info');
        }
        this._displayMediaPreview(input);
        this.elements.processBtn.disabled = false;
    }

    _displayMediaPreview(source) {
        const { preview, audioPreview, videoPreview, fileName } = this.elements;
        const isFile = source instanceof File;
        
        audioPreview.style.display = 'none';
        videoPreview.style.display = 'none';

        const src = isFile ? URL.createObjectURL(source) : source;
        const name = isFile ? source.name : source.split('/').pop();
        
        let mediaType = 'audio'; // Default to audio
        if (isFile && source.type.startsWith('video/')) {
            mediaType = 'video';
        } else if (!isFile) {
            const extension = source.split('.').pop().toLowerCase();
            const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
            if (videoExtensions.includes(extension)) mediaType = 'video';
        }

        const player = mediaType === 'video' ? videoPreview : audioPreview;
        
        player.src = src;
        player.style.display = 'block';
        player.load();

        fileName.textContent = name;
        preview.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateProgress(percent, text) {
        const { progress, progressBar, progressText } = this.elements;
        
        progress.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressText.textContent = text || `${percent}%`;
    }

    async processAudio() {
        this.clearLogs();
        this.elements.result.style.display = 'none';
        this.elements.progress.style.display = 'block';

        try {
            let arrayBuffer;
            if (this.currentFile) {
                this.addLog(`Processing file: ${this.currentFile.name}`, 'info');
                arrayBuffer = await this.currentFile.arrayBuffer();
            } else if (this.currentUrl) {
                this.addLog(`Fetching and processing URL: ${this.currentUrl}`, 'info');
                const response = await fetch(this.currentUrl);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                arrayBuffer = await response.arrayBuffer();
            } else {
                throw new Error('No file or URL to process');
            }

            const audioBuffer = await this.decodeAudioData(arrayBuffer);
            const audioData = await this.resampleAndPrepareAudio(audioBuffer);
            
            const { modelSelect, taskTranscribe, languageInput, timestamps } = this.elements;
            const model = modelSelect.value;
            const task = taskTranscribe.checked ? 'transcribe' : 'translate';
            const language = languageInput.value || null;
            const returnTimestamps = timestamps.checked;

            this._startWorker({ audioData, model, task, language, returnTimestamps });

        } catch (error) {
            this.addLog(`Error processing audio: ${error.message}`, 'error');
            this.elements.progress.style.display = 'none';
        }
    }

    _startWorker(data) {
        this.addLog('Starting transcription worker...', 'info');
        this.updateProgress(10, 'Worker started...');

        const workerCode = `
            import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';
            
            env.allowLocalModels = false;
            
            self.onmessage = async (event) => {
                try {
                    const { audioData, model, task, language, returnTimestamps } = event.data;
                    self.postMessage({ status: 'log', message: 'Worker received task.' });
                    
                    const transcriber = await pipeline('automatic-speech-recognition', model, {
                        progress_callback: (progress) => self.postMessage({ status: 'progress', data: progress })
                    });

                    self.postMessage({ status: 'log', message: 'Transcription pipeline ready.' });
                    
                    const output = await transcriber(audioData, { 
                        language, 
                        task,
                        return_timestamps: returnTimestamps 
                    });

                    self.postMessage({ status: 'log', message: 'Transcription finished.' });
                    console.log('Transcription output:', output.text);
                    self.postMessage({ status: 'complete', output });

                } catch (error) {
                    self.postMessage({ status: 'error', error: error.message });
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

        worker.postMessage(data);

        worker.onmessage = (event) => {
            const { status, output, error, data: progressData, message } = event.data;

            switch (status) {
                case 'log':
                    this.addLog(`Worker: ${message}`, 'info');
                    break;
                case 'progress':
                    if (progressData.status === 'progress') {
                        const progress = (progressData.progress || 0).toFixed(2);
                        this.updateProgress(10 + (progress * 0.8), `Downloading model... ${progress}%`);
                    } else if (progressData.status === 'done') {
                        this.addLog(`Downloaded: ${progressData.file}`, 'info');
                    }
                    break;
                case 'complete':
                    this.addLog(`Transcription result: "${output.text}"`, 'success');
                    this.displayResult(output);
                    this.updateProgress(100, 'Transcription complete.');
                    worker.terminate();
                    break;
                case 'error':
                    this.addLog(`Transcription error: ${error}`, 'error');
                    this.elements.progress.classList.add('hidden');
                    worker.terminate();
                    break;
            }
        };

        worker.onerror = (error) => {
            this.addLog(`Worker error: ${error.message}`, 'error');
            this.elements.progress.classList.add('hidden');
            worker.terminate();
        };
    }

    async resampleAndPrepareAudio(audioBuffer) {
        const originalSampleRate = audioBuffer.sampleRate;
        const targetSampleRate = 16000;

        if (originalSampleRate === targetSampleRate && audioBuffer.numberOfChannels === 1) {
            this.addLog('Audio is already in the correct format (16kHz, Mono).', 'info');
            return audioBuffer.getChannelData(0);
        }

        this.addLog(`Preparing audio: Resampling from ${originalSampleRate}Hz to ${targetSampleRate}Hz and ensuring mono...`, 'info');

        const duration = audioBuffer.duration;
        // The OfflineAudioContext is the most reliable way to resample in the browser.
        const offlineContext = new OfflineAudioContext(
            1, // Target mono
            duration * targetSampleRate,
            targetSampleRate
        );

        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start();

        const resampledBuffer = await offlineContext.startRendering();
        return resampledBuffer.getChannelData(0);
    }

    async decodeAudioData(arrayBuffer) {
        this.addLog('Decoding audio data using browser AudioContext...', 'info');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
    }
    
    // REMOVED processFile and processUrl as they are refactored
    
    displayResult(result) {
        const { result: resultDiv, resultText } = this.elements;
        
        if (result.chunks && result.chunks.length) {
            const formattedText = result.chunks.map(chunk => {
                const start = chunk.timestamp[0].toFixed(2);
                const end = chunk.timestamp[1].toFixed(2);
                return `[${start}s -> ${end}s] ${chunk.text}`;
            }).join('\n');
            resultText.textContent = formattedText;
        } else {
            resultText.textContent = result.text;
        }
 
        resultDiv.style.display = 'block';
        
        this.addLog('Result displayed successfully', 'success');
    }

    copyResult() {
        const { resultText } = this.elements;
        const text = resultText.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            this.addLog('Text copied to clipboard', 'success');
        }).catch(err => {
            this.addLog(`Failed to copy text: ${err.message}`, 'error');
        });
    }

    downloadResult() {
        const { resultText } = this.elements;
        const text = resultText.textContent;
        const filename = this.currentFile ? 
            `${this.currentFile.name.split('.')[0]}_transcription.txt` : 
            'transcription.txt';
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addLog(`Transcription downloaded as ${filename}`, 'success');
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const typeIcon = {
            'info': 'ℹ',
            'success': '✓', 
            'error': '✗',
            'warning': '⚠'
        }[type] || 'ℹ';
        
        const logEntry = `[${timestamp}] ${typeIcon} ${message}\n`;
        this.logText += logEntry;
        
        if (this.elements.logText) {
            this.elements.logText.value = this.logText;
            this.elements.logText.scrollTop = this.elements.logText.scrollHeight;
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    clearLogs() {
        this.logText = '';
        if (this.elements.logText) {
            this.elements.logText.value = '';
        }
    }
}

export function initTool() {
    const tool = new TranscribeTool({ id: 'transcribe', name: 'Audio/Video Transcription' });
    return tool.init();
} 