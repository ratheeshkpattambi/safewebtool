/**
 * Word & Character Counter tool
 * Live text statistics computed entirely in the browser — no data leaves the device.
 */
import { Tool } from '../common/base.js';

export const template = `
  <div class="tool-container space-y-4">
    <p class="text-slate-600 dark:text-slate-300">Type or paste text below — stats update live on every keystroke. Nothing is uploaded; all counting happens in your browser.</p>
    <textarea id="inputText" rows="10" class="w-full p-3 border border-slate-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors" placeholder="Start typing or paste your text here..."></textarea>
    <div id="statsGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statChars" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Characters</div>
      </div>
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statCharsNoSpaces" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Characters (no spaces)</div>
      </div>
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statWords" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Words</div>
      </div>
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statSentences" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Sentences</div>
      </div>
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statParagraphs" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Paragraphs</div>
      </div>
      <div class="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg p-4 text-center transition-colors">
        <div id="statReadingTime" class="text-2xl font-bold text-blue-600 dark:text-blue-400">0 min</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Reading time (200 wpm)</div>
      </div>
    </div>
    <button id="processBtn" class="hidden" disabled></button>
    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-gray-600">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-48 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class WordCountTool extends Tool {
  constructor(config = {}) {
    super({
      ...config,
      category: 'text',
      needsFileUpload: false,
      hasOutput: false,
      needsProcessButton: false,
      template
    });
  }

  getElementsMap() {
    return {
      inputText: 'inputText',
      statChars: 'statChars',
      statCharsNoSpaces: 'statCharsNoSpaces',
      statWords: 'statWords',
      statSentences: 'statSentences',
      statParagraphs: 'statParagraphs',
      statReadingTime: 'statReadingTime',
      processBtn: 'processBtn',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.inputText?.addEventListener('input', () => this.updateStats());
    this.updateStats();
    this.log('Word counter ready. Stats update as you type — nothing leaves your browser.', 'info');
  }

  /**
   * Compute text statistics.
   * @param {string} text
   * @returns {{chars: number, charsNoSpaces: number, words: number, sentences: number, paragraphs: number, readingMinutes: number}}
   */
  computeStats(text) {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = (text.trim().match(/\S+/g) || []).length;
    const sentences = (text.match(/[^.!?…]+[.!?…]+(\s|$)/g) || (text.trim() ? [text] : [])).length;
    const paragraphs = text.trim()
      ? text.split(/\n\s*\n+/).filter(p => p.trim().length > 0).length
      : 0;
    const readingMinutes = words / 200;
    return { chars, charsNoSpaces, words, sentences, paragraphs, readingMinutes };
  }

  formatReadingTime(minutes) {
    if (minutes <= 0) return '0 min';
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return `${seconds} sec`;
    }
    return `${Math.round(minutes * 10) / 10} min`;
  }

  updateStats() {
    const text = this.elements.inputText ? this.elements.inputText.value : '';
    const stats = this.computeStats(text);
    if (this.elements.statChars) this.elements.statChars.textContent = stats.chars.toLocaleString();
    if (this.elements.statCharsNoSpaces) this.elements.statCharsNoSpaces.textContent = stats.charsNoSpaces.toLocaleString();
    if (this.elements.statWords) this.elements.statWords.textContent = stats.words.toLocaleString();
    if (this.elements.statSentences) this.elements.statSentences.textContent = stats.sentences.toLocaleString();
    if (this.elements.statParagraphs) this.elements.statParagraphs.textContent = stats.paragraphs.toLocaleString();
    if (this.elements.statReadingTime) this.elements.statReadingTime.textContent = this.formatReadingTime(stats.readingMinutes);
  }
}

export function initTool() {
  const tool = new WordCountTool({
    id: 'word-count',
    name: 'Word & Character Counter'
  });
  return tool.init();
}
