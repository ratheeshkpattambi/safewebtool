/**
 * Video info tool using FFmpeg
 */
import { Tool } from '../common/base.js';
import { loadFFmpeg, writeInputFile, executeFFmpeg, getExtension } from './ffmpeg-utils.js';
import { formatFileSize, escapeHtml } from '../common/utils.js';

// Video info tool template
export const template = `
    <div class="tool-container">
      <div id="videoDropZone" class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
        <div class="text-5xl text-slate-400 dark:text-gray-500 mb-3">🎬</div>
        <p class="text-slate-600 dark:text-slate-300 text-lg mb-1">Drop your video here or click to select</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Supports MP4, WebM, MOV, and other common video formats</p>
        <input type="file" id="fileInput" class="hidden" accept="video/*">
        <button class="file-select-btn px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium">Select File</button>
      </div>
      <div class="video-wrapper">
        <video id="video-preview" controls style="display: none; max-width: 100%; height: auto;"></video>
      </div>

      <div id="videoProgress" class="progress" style="display: none;">
        <div class="progress-fill"></div>
        <div class="progress-text">0%</div>
      </div>

      <div id="videoInfoContainer" class="info-container"></div>
      
      <div id="downloadContainer" class="mt-4 hidden">
        <button id="downloadMetadataBtn" class="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium">
          📄 Download Metadata
        </button>
      </div>

      <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
        <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
        <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
      </div>
      <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
    </div>
`;

class VideoInfoTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'video',
      needsFileUpload: true,
      hasOutput: false,
      needsProcessButton: false,
      template // Use the local template
    });
    
    this.ffmpeg = null;
    this.metadata = null; // Store extracted metadata for download
  }

  getElementsMap() {
    return {
      dropZone: 'videoDropZone',
      fileInput: 'fileInput',
      inputVideo: 'video-preview',
      infoContainer: 'videoInfoContainer',
      progress: 'videoProgress',
      downloadContainer: 'downloadContainer',
      downloadMetadataBtn: 'downloadMetadataBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.initFileUpload({
      acceptTypes: 'video/*',
      onFileSelected: (file) => {
        this.displayPreview(file, 'inputVideo');
        this.displayBasicInfo(file);
        this.processFile(file);
      }
    });

    // Add download button handler
    if (this.elements.downloadMetadataBtn) {
      this.elements.downloadMetadataBtn.addEventListener('click', () => {
        this.downloadMetadata();
      });
    }
  }

  displayBasicInfo(file) {
    const basicInfo = document.createElement('div');
    basicInfo.className = 'mb-6'; // Tailwind classes for info-section
    basicInfo.innerHTML = `
      <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2 pb-1 border-b border-slate-300 dark:border-gray-600">Basic Info</h3>
      <table class="w-full text-sm">
        <tbody>
          <tr class="border-b border-slate-200 dark:border-gray-600"><td class="py-1.5 pr-2 font-medium text-slate-600 dark:text-slate-400 w-1/3">Filename:</td><td class="py-1.5 text-slate-800 dark:text-slate-100">${escapeHtml(file.name)}</td></tr>
          <tr class="border-b border-slate-200 dark:border-gray-600"><td class="py-1.5 pr-2 font-medium text-slate-600 dark:text-slate-400">Size:</td><td class="py-1.5 text-slate-800 dark:text-slate-100">${formatFileSize(file.size)}</td></tr>
          <tr><td class="py-1.5 pr-2 font-medium text-slate-600 dark:text-slate-400">Type:</td><td class="py-1.5 text-slate-800 dark:text-slate-100">${escapeHtml(file.type)}</td></tr>
        </tbody>
      </table>
    `;
    this.elements.infoContainer.innerHTML = ''; // Clear previous
    this.elements.infoContainer.className = 'mt-4 p-4 bg-slate-50 dark:bg-gray-800 rounded-lg shadow transition-colors'; // Tailwind for info-container
    this.elements.infoContainer.appendChild(basicInfo);
    this.elements.infoContainer.style.display = 'block';
  }

  async processFile(file) {
    try {
      this.startProcessing();
      this.updateProgress(10);

      // Store basic file info
      const basicInfo = {
        filename: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      };

      this.ffmpeg = await loadFFmpeg();
      this.updateProgress(30);

      const inputFileName = 'input' + getExtension(file.name);
      await writeInputFile(this.ffmpeg, inputFileName, file);
      this.updateProgress(50);

      const ffmpegLogs = [];
      
      this.ffmpeg.on('log', ({ message }) => {
        ffmpegLogs.push(message);
        
        if (message.includes('Stream') || 
            message.includes('Duration') || 
            message.includes('Video:') || 
            message.includes('Audio:') ||
            message.includes('Input #0')) {
          this.log(message, 'info');
        }
      });

      await executeFFmpeg(this.ffmpeg, ['-i', inputFileName]);
      
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vframes', '1',
        '-f', 'null',
        '-'
      ]);
      
      this.updateProgress(80);

      const videoInfo = this.extractVideoInfo(this.elements.inputVideo, ffmpegLogs);
      const audioInfo = this.extractAudioInfo(ffmpegLogs);
      
      // Store complete metadata
      this.metadata = {
        file: basicInfo,
        video: videoInfo,
        audio: audioInfo,
        analysis: {
          timestamp: new Date().toISOString(),
          toolVersion: '1.0.0'
        }
      };
      
      this.displayVideoInfo(videoInfo, audioInfo);
      
      // Show download button
      this.elements.downloadContainer.classList.remove('hidden');
      
      this.updateProgress(100);
      this.endProcessing();
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      console.error('Analysis error:', error);
      this.endProcessing(false);
    }
  }

  extractVideoInfo(videoEl, logs) {
    const videoInfo = {
      width: videoEl.videoWidth || this.extractFromLogs(logs, /(\d+)x\d+/, 1),
      height: videoEl.videoHeight || this.extractFromLogs(logs, /\d+x(\d+)/, 1),
      duration: this.formatDuration(videoEl.duration) || this.extractFromLogs(logs, /Duration:\s*([^,]+)/, 1)
    };
    
    if (videoInfo.width && videoInfo.height) {
      videoInfo.aspectRatio = (parseInt(videoInfo.width) / parseInt(videoInfo.height)).toFixed(3);
    }
    
    videoInfo.container = this.extractFromLogs(logs, /Input #0,\s*([^,]+)/, 1);
    
    const videoStream = logs.find(log => log.includes('Stream') && log.includes('Video:'));
    if (videoStream) {
      const codecMatch = videoStream.match(/Video:\s*([^(,]+)/);
      if (codecMatch) videoInfo.codec = codecMatch[1].trim();
      
      const fpsMatch = videoStream.match(/(\d+(?:\.\d+)?) fps/);
      if (fpsMatch) videoInfo.frameRate = fpsMatch[1] + ' fps';
      
      const bitrateMatch = videoStream.match(/(\d+) kb\/s/);
      if (bitrateMatch) videoInfo.bitrate = bitrateMatch[1] + ' kbps';
      
      if (!videoInfo.bitrate) {
        const overallBitrateMatch = logs.find(log => log.includes('bitrate:'));
        if (overallBitrateMatch) {
          const match = overallBitrateMatch.match(/bitrate:\s*([^ ]+)/);
          if (match) videoInfo.bitrate = match[1];
        }
      }
      
      const pixFmtMatch = videoStream.match(/yuv\w+/);
      if (pixFmtMatch) videoInfo.pixFmt = pixFmtMatch[0];
      
      const profileMatch = videoStream.match(/\(([^)]+)\)/);
      if (profileMatch) videoInfo.profile = profileMatch[1];
      
      const darMatch = videoStream.match(/DAR (\d+:\d+)/);
      if (darMatch) videoInfo.displayAspectRatio = darMatch[1];
      
      const sarMatch = videoStream.match(/SAR (\d+:\d+)/);
      if (sarMatch) videoInfo.sampleAspectRatio = sarMatch[1];
      
      const colorSpaceMatch = videoStream.match(/\b(bt\d+|srgb|bt2020nc)\b/i);
      if (colorSpaceMatch) videoInfo.colorSpace = colorSpaceMatch[0];
      
      const colorRangeMatch = videoStream.match(/\b(limited|full)\b/i);
      if (colorRangeMatch) videoInfo.colorRange = colorRangeMatch[0];
    }
    
    return videoInfo;
  }
  
  extractAudioInfo(logs) {
    const audioInfo = {};
    const audioStream = logs.find(log => log.includes('Stream') && log.includes('Audio:'));
    
    if (audioStream) {
      const codecMatch = audioStream.match(/Audio:\s*([^,]+)/);
      if (codecMatch) audioInfo.codec = codecMatch[1].trim();
      
      const sampleRateMatch = audioStream.match(/(\d+) Hz/);
      if (sampleRateMatch) {
        const sampleRate = parseInt(sampleRateMatch[1]);
        audioInfo.sampleRate = (sampleRate / 1000).toFixed(1) + ' kHz';
      }
      
      const channelsMatch = audioStream.match(/(\d+\.\d+|mono|stereo|5\.1)/);
      if (channelsMatch) audioInfo.channels = channelsMatch[1];
      
      const bitrateMatch = audioStream.match(/(\d+) kb\/s/);
      if (bitrateMatch) audioInfo.bitrate = bitrateMatch[1] + ' kbps';
    }
    
    return audioInfo;
  }
  
  displayVideoInfo(videoInfo, audioInfo) {
    const videoInfoSection = document.createElement('div');
    videoInfoSection.className = 'mb-6'; // Tailwind classes for info-section
    videoInfoSection.innerHTML = `
      <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2 pb-1 border-b border-slate-300 dark:border-gray-600">Video Information</h3>
      <table class="w-full text-sm">
        <tbody>
          ${this.createInfoRows(videoInfo)}
        </tbody>
      </table>
    `;
    
    const audioInfoSection = document.createElement('div');
    audioInfoSection.className = 'mb-0'; // Tailwind classes for info-section (last one)
    audioInfoSection.innerHTML = `
      <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2 pb-1 border-b border-slate-300 dark:border-gray-600">Audio Information</h3>
      <table class="w-full text-sm">
        <tbody>
          ${this.createInfoRows(audioInfo)}
        </tbody>
      </table>
    `;
    
    // Append to the main container, assuming it's already styled
    this.elements.infoContainer.appendChild(videoInfoSection);
    this.elements.infoContainer.appendChild(audioInfoSection);
  }
  
  createInfoRows(info) {
    return Object.entries(info)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `<tr class="border-b border-slate-200 dark:border-gray-600 last:border-b-0"><td class="py-1.5 pr-2 font-medium text-slate-600 dark:text-slate-400 w-1/3">${escapeHtml(formattedKey)}:</td><td class="py-1.5 text-slate-800 dark:text-slate-100">${escapeHtml(String(value))}</td></tr>`;
      })
      .join('');
  }
  
  extractFromLogs(logs, regex, groupIndex = 1) {
    for (const log of logs) {
      const match = log.match(regex);
      if (match && match[groupIndex]) {
        return match[groupIndex];
      }
    }
    return null;
  }
  
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return null;
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return [
      h > 0 ? h.toString().padStart(2, '0') : '00',
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  }

  downloadMetadata() {
    if (!this.metadata) {
      this.log('No metadata available to download', 'error');
      return;
    }

    try {
      // Create a clean copy of metadata with better formatting
      const cleanMetadata = {
        ...this.metadata,
        // Remove null/undefined values for cleaner JSON
        video: Object.fromEntries(
          Object.entries(this.metadata.video).filter(([, value]) => 
            value !== null && value !== undefined && value !== ''
          )
        ),
        audio: Object.fromEntries(
          Object.entries(this.metadata.audio).filter(([, value]) => 
            value !== null && value !== undefined && value !== ''
          )
        )
      };

      const jsonString = JSON.stringify(cleanMetadata, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create filename based on original video filename
      const originalName = this.metadata.file.filename;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      const filename = `${nameWithoutExt}_metadata.json`;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.log(`Metadata downloaded as ${filename}`, 'success');
    } catch (error) {
      this.log(`Error downloading metadata: ${error.message}`, 'error');
      console.error('Download error:', error);
    }
  }
}

export function initTool() {
  const tool = new VideoInfoTool({
    id: 'info',
    name: 'Video Info'
  });
  
  return tool.init();
} 