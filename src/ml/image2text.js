/**
 * OCR (Image to Text) module using Tesseract.js
 */
import { Tool } from '../common/base.js';
import { formatFileSize } from '../common/utils.js';

// OCR tool template
export const template = `
    <style>
      .ocr-container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
      }
      .language-selector {
        margin: 15px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .dark .language-selector {
        background: #2d3748;
        border-color: #4a5568;
      }
      .progress-container {
        margin: 15px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        display: none;
      }
      .dark .progress-container {
        background: #2d3748;
        border-color: #4a5568;
      }
      .progress-bar {
        width: 100%;
        height: 20px;
        background: #e9ecef;
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
      }
      .dark .progress-bar {
        background: #4a5568;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        width: 0%;
        transition: width 0.3s ease;
      }
      .text-output {
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        min-height: 100px;
        white-space: pre-wrap;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
      }
      .dark .text-output {
        background: #2d3748;
        border-color: #4a5568;
        color: #e2e8f0;
      }
      .confidence-indicator {
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }
      .confidence-high {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .dark .confidence-high {
        background: #1a4731;
        color: #86efac;
        border-color: #4ade80;
      }
      .confidence-medium {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .dark .confidence-medium {
        background: #451a03;
        color: #fbbf24;
        border-color: #f59e0b;
      }
      .confidence-low {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      .dark .confidence-low {
        background: #450a0a;
        color: #fca5a5;
        border-color: #f87171;
      }
    </style>
    <div class="tool-container">
      <h1>Image to Text (OCR)</h1>
      <div id="dropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">📷</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPG, PNG, WebP, and other common image formats</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      </div>
      
      <div class="image-wrapper mt-4">
        <img id="input-image" style="display: none; max-width: 100%; height: auto; border-radius: 8px;" alt="Input image">
      </div>
      
      <div class="language-selector">
        <label for="languageSelect" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language:</label>
        <select id="languageSelect" class="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md text-base bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
          <option value="eng">English</option>
          <option value="fra">French</option>
          <option value="deu">German</option>
          <option value="spa">Spanish</option>
          <option value="ita">Italian</option>
          <option value="por">Portuguese</option>
          <option value="rus">Russian</option>
          <option value="chi_sim">Chinese (Simplified)</option>
          <option value="chi_tra">Chinese (Traditional)</option>
          <option value="jpn">Japanese</option>
          <option value="kor">Korean</option>
          <option value="ara">Arabic</option>
          <option value="hin">Hindi</option>
          <option value="ben">Bengali</option>
          <option value="tel">Telugu</option>
          <option value="tam">Tamil</option>
          <option value="mar">Marathi</option>
          <option value="guj">Gujarati</option>
          <option value="kan">Kannada</option>
          <option value="mal">Malayalam</option>
          <option value="pan">Punjabi</option>
          <option value="urd">Urdu</option>
        </select>
      </div>
      
      <div class="flex gap-4 mt-4">
        <button id="processBtn" class="flex-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Extract Text</button>
      </div>

      <div id="progress" class="progress-container">
        <div class="text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Processing...</div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="text-center text-xs text-slate-500 dark:text-slate-400" id="progressText">Initializing...</div>
      </div>

      <div id="outputContainer" class="output-container dark:bg-slate-800" style="display: none;">
        <div class="text-output" id="textOutput" placeholder="Extracted text will appear here..."></div>
        <div id="confidenceIndicator" class="confidence-indicator"></div>
        <div class="mt-4">
          <button id="copyBtn" class="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors mr-2">Copy Text</button>
          <button id="downloadBtn" class="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors">Download as TXT</button>
        </div>
      </div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class ImageToTextTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'ml',
      needsFileUpload: true,
      hasOutput: true,
      needsProcessButton: true,
      template // Use the local template
    });
    
    this.tesseract = null;
    this.worker = null;
    this.currentImage = null;
  }

  getElementsMap() {
    return {
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      inputImage: 'input-image',
      languageSelect: 'languageSelect',
      processBtn: 'processBtn',
      progress: 'progress',
      progressText: 'progressText',
      textOutput: 'textOutput',
      confidenceIndicator: 'confidenceIndicator',
      copyBtn: 'copyBtn',
      downloadBtn: 'downloadBtn',
      outputContainer: 'outputContainer',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    // Disable inputs until image is loaded
    if (this.elements.languageSelect) this.elements.languageSelect.disabled = true;
    if (this.elements.processBtn) this.elements.processBtn.disabled = true;

    this.initFileUpload({
      acceptTypes: 'image/*',
      onFileSelected: (file) => {
        this.displayPreview(file, 'inputImage');
        this.currentImage = file;
        this.log(`Loaded image: ${file.name} (${formatFileSize(file.size)})`, 'info');
        
        // Enable inputs
        this.elements.languageSelect.disabled = false;
        this.elements.processBtn.disabled = false;
      }
    });

    // Initialize Tesseract.js
    await this.initTesseract();

    // Setup copy and download buttons
    if (this.elements.copyBtn) {
      this.elements.copyBtn.addEventListener('click', () => {
        this.copyText();
      });
    }

    if (this.elements.downloadBtn) {
      this.elements.downloadBtn.addEventListener('click', () => {
        this.downloadText();
      });
    }

    if (this.elements.dropZone) {
      this.elements.dropZone.innerHTML = `
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">📷</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your image here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports JPG, PNG, WebP, and other common image formats</p>
        <input type="file" id="fileInput" class="hidden" accept="image/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      `;
    }
  }

  async initTesseract() {
    try {
      // Only load Tesseract.js when actually needed (when user clicks process)
      this.log('Tesseract.js will be loaded when processing starts', 'info');
    } catch (error) {
      this.log(`Error initializing Tesseract.js: ${error.message}`, 'error');
      throw error;
    }
  }

  async loadTesseractScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
      document.head.appendChild(script);
    });
  }

  updateProgress(percentage, text) {
    if (this.elements.progress) {
      this.elements.progress.style.display = 'block';
    }
    if (this.elements.progressText) {
      this.elements.progressText.textContent = text || `${percentage}%`;
    }
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
  }

  getConfidenceClass(confidence) {
    if (confidence >= 80) return 'confidence-high';
    if (confidence >= 60) return 'confidence-medium';
    return 'confidence-low';
  }

  getConfidenceText(confidence) {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10, 'Initializing OCR...');

      if (!this.currentImage) {
        throw new Error('No image selected');
      }

      // Load Tesseract.js when actually needed
      if (typeof Tesseract === 'undefined') {
        this.log('Loading Tesseract.js...', 'info');
        await this.loadTesseractScript();
        this.log('Tesseract.js loaded successfully', 'success');
      }

      const language = this.elements.languageSelect.value;
      this.log(`Starting OCR with language: ${language}`, 'info');

      this.updateProgress(20, 'Loading language data...');

      // Create image element for Tesseract
      const img = new Image();
      const imageUrl = URL.createObjectURL(this.currentImage);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      this.updateProgress(40, 'Processing image...');

      // Perform OCR
      const result = await Tesseract.recognize(
        img,
        language,
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progress = Math.min(40 + (m.progress * 50), 90);
              this.updateProgress(progress, `Recognizing text... ${Math.round(m.progress * 100)}%`);
            }
            this.log(`Tesseract: ${m.status}`, 'info');
          }
        }
      );

      this.updateProgress(100, 'Complete!');

      // Extract text and confidence
      const extractedText = result.data.text;
      const confidence = result.data.confidence;

      this.log(`OCR completed with ${confidence.toFixed(1)}% confidence`, 'success');

      // Display results
      if (this.elements.textOutput) {
        this.elements.textOutput.textContent = extractedText;
      }

      if (this.elements.confidenceIndicator) {
        const confidenceClass = this.getConfidenceClass(confidence);
        const confidenceText = this.getConfidenceText(confidence);
        this.elements.confidenceIndicator.className = `confidence-indicator ${confidenceClass}`;
        this.elements.confidenceIndicator.textContent = `${confidenceText}: ${confidence.toFixed(1)}%`;
      }

      if (this.elements.outputContainer) {
        this.elements.outputContainer.style.display = 'block';
      }

      // Clean up
      URL.revokeObjectURL(imageUrl);
      
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Processing error:', error);
      this.endProcessing(false);
    }
  }

  copyText() {
    const text = this.elements.textOutput.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.log('Text copied to clipboard', 'success');
      }).catch(() => {
        this.log('Failed to copy text', 'error');
      });
    }
  }

  downloadText() {
    const text = this.elements.textOutput.textContent;
    if (text) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted_text.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.log('Text downloaded as extracted_text.txt', 'success');
    }
  }
}

export function initTool() {
  const tool = new ImageToTextTool({
    id: 'image2text',
    name: 'Image to Text (OCR)'
  });
  
  return tool.init();
} 