/**
 * Base Tool class
 */
import { addLog, updateProgress, showLogs, formatFileSize } from './utils.js';
import { footerManager } from './footer-manager.js';
import { initFileUpload as initSharedFileUpload } from './fileUpload.js';

export class Tool {
  /**
   * Constructor initializes the tool with configuration
   * @param {Object} config - Tool configuration
   * @param {string} config.id - Tool ID
   * @param {string} config.name - Tool display name
   * @param {string} config.category - Tool category (video, image, text)
   * @param {boolean} config.needsFileUpload - Whether this tool needs file upload (default: true)
   * @param {boolean} config.hasOutput - Whether this tool produces downloadable output (default: false)
   * @param {boolean} config.needsProcessButton - Whether this tool needs a process button (default: false)
   * @param {string} config.template - Optional HTML template for this tool
   * @param {Object} config.customFooter - Optional custom footer configuration
   * @param {string} config.customFooter.author - Tool author name (required)
   * @param {string} config.customFooter.authorUrl - Author's website/profile URL
   * @param {string} config.customFooter.version - Tool version
   * @param {Array} config.customFooter.links - Additional links [{text, url, icon, external}]
   * @param {string} config.customFooter.description - Brief description
   * @param {boolean} config.customFooter.showBackLink - Show "Back to SafeWebTool" link (default: true)
   * @param {string} config.customFooter.icon - Icon URL or emoji for the footer
   */
  constructor(config = {}) {
    this.id = config.id || '';
    this.name = config.name || '';
    this.category = config.category || '';
    this.needsFileUpload = config.hasOwnProperty('needsFileUpload') ? config.needsFileUpload : true;
    this.hasOutput = config.hasOwnProperty('hasOutput') ? config.hasOutput : false;
    this.needsProcessButton = config.hasOwnProperty('needsProcessButton') ? config.needsProcessButton : false;
    this.template = config.template || null; // Store the tool's template
    this.customFooter = config.customFooter || null; // Store custom footer configuration
    
    this.elements = {};
    this.initialized = false;
    this.isProcessing = false;
    this.inputFile = null;
  }

  /**
   * Get the tool's template, if provided in the constructor
   * @returns {string|null} The HTML template or null
   */
  getTemplate() {
    return this.template;
  }

  /**
   * Initialize the tool
   */
  async init() {
    if (this.initialized) return this;
    
    // Initialize logs panel (sets collapsed state and toggle functionality)
    showLogs();
    
    // Get elements from DOM
    this._initElements();
    
    // Set up common event listeners
    this._setupCommonListeners();
    
    // Set up custom footer if configured
    this._setupCustomFooter();
    
    // Tool-specific initialization
    await this.setup();

    // Mark the rendered tool UI as interactive for tests and diagnostics.
    document.querySelector('.tool-container')?.setAttribute('data-tool-ready', 'true');
    
    // Mark as initialized
    this.initialized = true;
    
    return this;
  }
  
  /**
   * Initialize elements from DOM
   * @private
   */
  _initElements() {
    // Get element mappings from the derived class
    const elementsMap = this.getElementsMap();
    
    for (const [key, id] of Object.entries(elementsMap)) {
      this.elements[key] = document.getElementById(id);
      if (!this.elements[key] && id !== null) {
        console.warn(`Element with ID '${id}' not found for '${key}'`);
      }
    }
  }
  
  /**
   * Set up common event listeners
   * @private
   */
  _setupCommonListeners() {
    // Set up process button if needed
    if (this.needsProcessButton && this.elements.processBtn) {
      this.elements.processBtn.addEventListener('click', () => {
        if (!this.isProcessing && this.inputFile) {
          this.processFile(this.inputFile);
        } else if (!this.inputFile) {
          this.log('Please select a file first', 'error');
        }
      });
    }
  }
  
  /**
   * Get mapping of element keys to DOM IDs
   * Should be implemented by derived classes
   * @returns {Object} Map of element keys to DOM IDs
   */
  getElementsMap() {
    return {};
  }
  
  /**
   * Set up the tool
   * Should be implemented by derived classes
   */
  async setup() {
    throw new Error('setup() must be implemented by derived classes');
  }
  
  /**
   * Process a file with the tool
   * Should be implemented by derived classes if needed
   * @param {File} file - The file to process
   */
  async processFile(file) {
    throw new Error('processFile() must be implemented by derived classes');
  }
  
  /**
   * Log a message
   * @param {string} message - The message to log
   * @param {string} type - Log type (info, success, error, warning)
   */
  log(message, type = 'info') {
    addLog(message, type);
  }
  
  /**
   * Update progress indicator
   * @param {number} percent - Progress percentage (0-100)
   */
  updateProgress(percent) {
    updateProgress(percent);
    
    const { progress } = this.elements;
    if (progress) {
      progress.style.display = 'block';
      
      // Update text if it exists
      const progressText = progress.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(percent)}%`;
      }
    }
  }
  
  /**
   * Hide progress indicator
   */
  hideProgress() {
    const { progress } = this.elements;
    if (progress) {
      progress.style.display = 'none';
    }
  }
  
  /**
   * Initialize file upload
   * @param {Object} options - Upload options
   * @param {string} options.acceptTypes - File types to accept (e.g. 'video/*')
   * @param {Function} options.onFileSelected - Callback when a file is selected
   */
  initFileUpload(options = {}) {
    const { dropZone, fileInput } = this.elements;
    
    if (!dropZone || !fileInput) {
      this.log('Missing drop zone or file input elements', 'error');
      return;
    }
    
    initSharedFileUpload({
      dropZoneId: dropZone.id,
      fileInputId: fileInput.id,
      acceptTypes: options.acceptTypes || '*/*',
      hideDropZoneOnSelect: options.hideDropZoneOnSelect,
      onFileSelected: (file) => {
        this.inputFile = file;
        
        // Enable process button if exists
        if (this.elements.processBtn) {
          this.elements.processBtn.disabled = false;
        }
        
        // Call user's onFileSelected handler if provided
        if (options.onFileSelected) {
          options.onFileSelected(file);
        }
      }
    });
  }
  
  /**
   * Display a preview for different file types
   * @param {Blob|File} file - The file to preview
   * @param {string} elementKey - Key of preview element in this.elements
   * @returns {string} The blob URL
   */
  displayPreview(file, elementKey) {
    const url = URL.createObjectURL(file);
    const element = this.elements[elementKey];
    
    if (!element) return url;
    
    // Display based on element type
    if (element.tagName === 'VIDEO') {
      element.src = url;
      element.style.display = 'block';
      
      return url;
    } else if (element.tagName === 'IMG') {
      element.src = url;
      element.style.display = 'block';
      
      return url;
    } else if (element.tagName === 'AUDIO') {
      element.src = url;
      element.style.display = 'block';
      
      return url;
    }
    
    return url;
  }
  
  /**
   * Display output media (video/image/audio) and create a download link
   * @param {Blob|File} blob - The output data blob
   * @param {string} mediaKey - Key of the media element in this.elements
   * @param {string} filename - Filename for downloading the blob
   * @param {string} [containerKey='downloadContainer'] - Key of the download container
   * @returns {string} The blob URL
   */
  displayOutputMedia(blob, mediaKey, filename, containerKey = 'downloadContainer') {
    const url = URL.createObjectURL(blob);
    const mediaElement = this.elements[mediaKey];
    const container = this.elements[containerKey];

    if (mediaElement) {
      mediaElement.src = url;
      mediaElement.style.display = 'block';
    }

    if (container) {
      // Create file info div
      const fileInfoDiv = document.createElement('div');
      fileInfoDiv.className = 'mt-4 p-3 bg-slate-100 rounded-md text-sm dark:bg-slate-800 '; // Tailwind classes
      fileInfoDiv.innerHTML = `
        <p class="text-slate-700 dark:text-slate-300"><strong>Filename:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${filename}</span></p>
        <p class="text-slate-700 dark:text-slate-300"><strong>Size:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${formatFileSize(blob.size)}</span></p>
        <p class="text-slate-700 dark:text-slate-300"><strong>Type:</strong> <span class="font-normal text-slate-600 dark:text-slate-200">${blob.type}</span></p>
      `;
      
      // Create download button
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.className = 'mt-3 inline-block px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium'; // Green for download actions
      downloadLink.textContent = `Download ${this.name} Result`;
      
      container.innerHTML = ''; // Clear previous content
      container.appendChild(fileInfoDiv);
      container.appendChild(downloadLink);
      container.style.display = 'block';

      const outputContainer = container.closest('.output-container');
      if (outputContainer) {
        outputContainer.style.display = 'block';
      }
    }
    return url;
  }
  
  /**
   * Start processing and update UI accordingly
   */
  startProcessing() {
    this.isProcessing = true;
    
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = true;
    }
    
    this.updateProgress(0);
  }
  
  /**
   * End processing and update UI accordingly
   */
  endProcessing(success = true) {
    this.isProcessing = false;
    
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = false;
    }
    
    this.hideProgress();
    
    if (success) {
      this.log('Processing complete!', 'success');
    }
  }

  /**
   * Set up custom footer if configured
   * @private
   */
  _setupCustomFooter() {
    if (!this.customFooter) return;
    
    // Ensure we have the required fields
    if (!this.customFooter.author) {
      console.warn(`Tool "${this.name}" has customFooter but missing required 'author' field`);
      return;
    }
    
    // Set the tool footer with the configuration
    footerManager.setToolFooter({
      toolName: this.name,
      ...this.customFooter
    });
  }
} 
