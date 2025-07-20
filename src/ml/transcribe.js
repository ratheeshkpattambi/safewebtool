/**
 * Speech-to-Text transcription using Whisper
 */
import { Tool } from '../common/base.js';

export const template = `
    <div class="tool-container">
      <h1>Audio/Video Transcription</h1>
      
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
        <div id="transcribe-preview-content" class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4"></div>
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
            dropZone: 'transcribe-drop-zone',
            fileInput: 'transcribe-file-input',
            urlInput: 'transcribe-url-input',
            urlBtn: 'transcribe-url-btn',
            processBtn: 'transcribe-process-btn',
            preview: 'transcribe-preview',
            previewContent: 'transcribe-preview-content',
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
        this.addLog('Audio/Video Transcription Tool v6.2.0 - Starting...', 'info');
        this.addLog('Supports file upload and URL input', 'info');
        
        this.initFileUpload();
        this.initUrlInput();
        this.initButtons();
        this.initLogsToggle();
    }

    initFileUpload() {
        const { dropZone, fileInput } = this.elements;
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'dark:border-blue-400');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-500', 'dark:border-blue-400');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'dark:border-blue-400');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    initUrlInput() {
        const { urlBtn, urlInput } = this.elements;
        
        // Auto-load default JFK audio URL
        const defaultUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
        urlInput.value = defaultUrl;
        this.handleUrlInput(defaultUrl);
        
        urlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.handleUrlInput(url);
            } else {
                this.addLog('Please enter a valid URL', 'error');
            }
        });
        
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                urlBtn.click();
            }
        });
    }

    initButtons() {
        const { processBtn, copyBtn, downloadBtn } = this.elements;
        
        processBtn.addEventListener('click', () => this.processAudio());
        copyBtn.addEventListener('click', () => this.copyResult());
        downloadBtn.addEventListener('click', () => this.downloadResult());
    }

    initLogsToggle() {
        const { logs, logText } = this.elements;
        
        logs.addEventListener('click', () => {
            const isVisible = logText.style.display !== 'none';
            logText.style.display = isVisible ? 'none' : 'block';
            const chevron = logs.querySelector('span:last-child');
            chevron.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    handleFileSelect(file) {
        this.currentFile = file;
        this.currentUrl = null;
        this.addLog(`File selected: ${file.name} (${this.formatFileSize(file.size)})`, 'info');
        this.displayPreview(file);
        this.elements.processBtn.disabled = false;
    }

    handleUrlInput(url) {
        // Use JFK audio as default if no URL provided
        const defaultUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
        const finalUrl = url || defaultUrl;
        
        this.currentUrl = finalUrl;
        this.currentFile = null;
        this.addLog(`URL entered: ${finalUrl}`, 'info');
        this.displayUrlPreview(finalUrl);
        this.elements.processBtn.disabled = false;
    }

    displayPreview(file) {
        const { preview, previewContent } = this.elements;
        
        if (file.type.startsWith('audio/')) {
            previewContent.innerHTML = `
                <audio controls class="w-full">
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    Your browser does not support audio playback.
                </audio>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">${file.name}</p>
            `;
        } else if (file.type.startsWith('video/')) {
            previewContent.innerHTML = `
                <video controls class="w-full max-h-64">
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    Your browser does not support video playback.
                </video>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">${file.name}</p>
            `;
        }
        
        preview.style.display = 'block';
    }

    displayUrlPreview(url) {
        const { preview, previewContent } = this.elements;
        
        previewContent.innerHTML = `
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm text-gray-700 dark:text-gray-300">${url}</span>
            </div>
        `;
        
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
        if (this.currentFile) {
            this.processFile(this.currentFile);
        } else if (this.currentUrl) {
            this.processUrl(this.currentUrl);
        } else {
            this.addLog('No file or URL to process', 'error');
        }
    }

    async loadTransformers() {
        // Use exact same approach as working test HTML
        const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0/dist/transformers.min.js');
        this.addLog('Transformers.js loaded successfully', 'info');
        return { pipeline };
    }

    // Centralized transcription logic in a separate worker
    runTranscription(audioData) {
        this.startProcessing();
        this.updateProgress(10, 'Initializing Worker...');
        this.addLog('Creating isolated worker for transcription...', 'info');

        // Use new URL() to correctly resolve the worker path in Vite
        const worker = new Worker(new URL('./transcribe-worker.js', import.meta.url), { type: 'module' });

        worker.onmessage = ({ data }) => {
            switch (data.status) {
                case 'log':
                    this.addLog(`Worker: ${data.message}`, 'info');
                    break;
                case 'progress':
                    if (data.data.status === 'progress') {
                        const progress = (data.data.progress || 0).toFixed(2);
                        this.updateProgress(20 + (progress * 0.7), `Downloading model... ${progress}%`);
                    } else if (data.data.status === 'done') {
                        this.addLog(`Downloaded: ${data.data.file}`, 'info');
                    }
                    break;
                case 'complete':
                    this.addLog('Transcription complete!', 'success');
                    this.updateProgress(100, 'Done');
                    this.displayResult(data.output);
                    this.endProcessing();
                    worker.terminate();
                    break;
                case 'error':
                    this.addLog(`Worker error: ${data.error}`, 'error');
                    this.endProcessing(false);
                    worker.terminate();
                    break;
            }
        };
        
        this.addLog('Sending audio data to worker...', 'info');
        worker.postMessage({ audioData });
    }

    async processFile(file) {
        try {
            this.updateProgress(10, 'Reading and decoding file...');
            this.addLog('Reading file into memory...', 'info');

            const arrayBuffer = await file.arrayBuffer();

            this.addLog('Decoding audio data using browser AudioContext...', 'info');
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const audioData = audioBuffer.getChannelData(0);

            this.addLog('Audio decoded. Initializing worker...', 'info');
            this.updateProgress(20, 'Initializing ES Module Worker...');

            const workerCode = `
                import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0/dist/transformers.min.js';
                
                // Set up environment to use remote models only
                env.allowLocalModels = false;
                
                self.onmessage = async (event) => {
                    try {
                        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
                        const output = await transcriber(event.data.audioData, { sampling_rate: 16000 });
                        self.postMessage({ status: 'complete', output });

                    } catch (error) {
                        self.postMessage({ status: 'error', error: error.message });
                    }
                };
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

            worker.onmessage = (event) => {
                const { status, output, error } = event.data;

                if (status === 'complete') {
                    this.addLog('Transcription complete!', 'success');
                    this.updateProgress(100, 'Done');
                    this.displayResult(output);
                    worker.terminate();
                } else if (status === 'error') {
                    this.addLog(`Worker error: ${error}`, 'error');
                    this.updateProgress(100, 'Error');
                    worker.terminate();
                }
            };

            this.addLog('Sending decoded audio data to worker...', 'info');
            this.updateProgress(25, 'Sending data to worker...');
            worker.postMessage({ audioData });

        } catch (error) {
            this.addLog(`An error occurred: ${error.message}`, 'error');
            console.error('File processing failed:', error);
            this.updateProgress(100, 'Error');
        }
    }

    async processUrl(url) {
        try {
            this.updateProgress(10, 'Fetching and decoding audio...');
            this.addLog('Fetching audio data from URL...', 'info');

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            this.addLog('Decoding audio data using browser AudioContext...', 'info');

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const audioData = audioBuffer.getChannelData(0);

            this.addLog('Audio decoded. Initializing worker...', 'info');
            this.updateProgress(20, 'Initializing ES Module Worker...');

            const workerCode = `
                import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.0/dist/transformers.min.js';

                // Set up environment to use remote models only
                env.allowLocalModels = false;

                self.onmessage = async (event) => {
                    try {
                        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
                        const output = await transcriber(event.data.audioData, { sampling_rate: 16000 });
                        self.postMessage({ status: 'complete', output });

                    } catch (error) {
                        self.postMessage({ status: 'error', error: error.message });
                    }
                };
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

            worker.onmessage = (event) => {
                const { status, output, error } = event.data;

                if (status === 'complete') {
                    this.addLog('Transcription complete!', 'success');
                    this.updateProgress(100, 'Done');
                    this.displayResult(output);
                    worker.terminate();
                } else if (status === 'error') {
                    this.addLog(`Worker error: ${error}`, 'error');
                    this.updateProgress(100, 'Error');
                    worker.terminate();
                }
            };

            this.addLog('Sending decoded audio data to worker...', 'info');
            this.updateProgress(25, 'Sending data to worker...');
            worker.postMessage({ audioData });

        } catch (error) {
            this.addLog(`An error occurred: ${error.message}`, 'error');
            console.error('Transcription failed:', error);
            this.updateProgress(100, 'Error');
        }
    }

    displayResult(result) {
        const { result: resultDiv, resultText } = this.elements;
        
        resultText.textContent = result.text;
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
}

export function initTool() {
    const tool = new TranscribeTool({ id: 'transcribe', name: 'Audio/Video Transcription' });
    return tool.init();
} 