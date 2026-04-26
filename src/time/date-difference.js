import { Tool } from '../common/base.js';
import { toDateInputValue } from '../common/time-utils.js';

export const template = `
  <div class="tool-container">
    <div class="grid gap-4 max-w-2xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Start date</span>
          <input id="startDate" type="date" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">End date</span>
          <input id="endDate" type="date" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
      </div>
      <label class="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
        <input id="includeEnd" type="checkbox" class="h-5 w-5 accent-blue-600">
        Include end date
      </label>
      <button id="calculateBtn" type="button" class="rounded-md bg-blue-600 dark:bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Calculate Duration</button>
      <div id="result" class="grid gap-3"></div>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-24 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function countWeekdays(start, end, includeEnd) {
  const from = new Date(Math.min(start.getTime(), end.getTime()));
  const to = new Date(Math.max(start.getTime(), end.getTime()));
  let count = 0;
  for (const cursor = new Date(from); cursor < to || (includeEnd && cursor <= to); cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
  }
  return count;
}

class DateDifferenceTool extends Tool {
  constructor() {
    super({ id: 'date-difference', name: 'Date Duration Calculator', category: 'time', needsFileUpload: false, template });
  }

  getElementsMap() {
    return {
      startDate: 'startDate',
      endDate: 'endDate',
      includeEnd: 'includeEnd',
      calculateBtn: 'calculateBtn',
      result: 'result',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.elements.startDate.value = toDateInputValue(today);
    this.elements.endDate.value = toDateInputValue(nextMonth);
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());
    this.calculate();
    this.log('Date duration calculator ready', 'info');
  }

  calculate() {
    const start = parseDate(this.elements.startDate.value);
    const end = parseDate(this.elements.endDate.value);
    const includeEnd = this.elements.includeEnd.checked;
    const direction = end >= start ? 1 : -1;
    const rawDays = Math.round(Math.abs(end - start) / 86400000) + (includeEnd ? 1 : 0);
    const weeks = Math.floor(rawDays / 7);
    const days = rawDays % 7;
    const weekdays = countWeekdays(start, end, includeEnd);

    this.elements.result.innerHTML = `
      <div class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4">
        <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Total duration</div>
        <div class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">${rawDays} day${rawDays === 1 ? '' : 's'}</div>
      </div>
      <div class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4">
        <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Weeks and days</div>
        <div class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">${weeks} week${weeks === 1 ? '' : 's'}, ${days} day${days === 1 ? '' : 's'}</div>
      </div>
      <div class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4">
        <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Weekdays</div>
        <div class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">${weekdays} weekday${weekdays === 1 ? '' : 's'}</div>
        <div class="mt-1 text-sm text-slate-600 dark:text-slate-300">${direction === 1 ? 'Forward' : 'Backward'} range${includeEnd ? ', including the end date' : ''}.</div>
      </div>
    `;
    this.log('Calculated date duration', 'success');
  }
}

export function initTool() {
  return new DateDifferenceTool().init();
}
