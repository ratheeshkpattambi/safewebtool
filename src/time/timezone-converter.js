import { Tool } from '../common/base.js';
import {
  escapeHtml,
  formatInTimeZone,
  getUtcOffsetLabel,
  POPULAR_TIME_ZONES,
  renderTimeZoneOptions,
  toDateTimeInputValue,
  zonedDateTimeToDate
} from '../common/time-utils.js';

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const template = `
  <div class="tool-container">
    <div class="grid gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Time to convert</span>
          <input id="sourceDateTime" type="datetime-local" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">From time zone</span>
          <select id="sourceZone" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">${renderTimeZoneOptions(localZone)}</select>
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${['America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore'].map((zone, index) => `
          <label class="block">
            <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Compare ${index + 1}</span>
            <select class="targetZone w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">${renderTimeZoneOptions(zone)}</select>
          </label>
        `).join('')}
      </div>

      <button id="convertBtn" type="button" class="rounded-md bg-blue-600 dark:bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Convert Time</button>
      <div id="results" class="grid gap-3"></div>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-24 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class TimeZoneConverterTool extends Tool {
  constructor() {
    super({ id: 'timezone-converter', name: 'Time Zone Converter', category: 'time', needsFileUpload: false, template });
  }

  getElementsMap() {
    return {
      sourceDateTime: 'sourceDateTime',
      sourceZone: 'sourceZone',
      convertBtn: 'convertBtn',
      results: 'results',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.sourceDateTime.value = toDateTimeInputValue();
    this.elements.convertBtn.addEventListener('click', () => this.convert());
    this.convert();
    this.log('Time zone converter ready', 'info');
  }

  convert() {
    const sourceZone = this.elements.sourceZone.value;
    const instant = zonedDateTimeToDate(this.elements.sourceDateTime.value, sourceZone);
    const zones = Array.from(document.querySelectorAll('.targetZone')).map(select => select.value);
    const rows = [sourceZone, ...zones].map(zone => {
      const label = POPULAR_TIME_ZONES.find(([, value]) => value === zone)?.[0] || zone;
      return `
        <div class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4">
          <div class="text-sm font-medium text-slate-500 dark:text-slate-400">${escapeHtml(label)} · ${escapeHtml(zone)} · ${getUtcOffsetLabel(instant, zone)}</div>
          <div class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">${formatInTimeZone(instant, zone, { weekday: 'short' })}</div>
        </div>
      `;
    });
    this.elements.results.innerHTML = rows.join('');
    this.log('Converted time zones', 'success');
  }
}

export function initTool() {
  return new TimeZoneConverterTool().init();
}
