import { Tool } from '../common/base.js';
import { toDateInputValue } from '../common/time-utils.js';

export const template = `
  <div class="tool-container">
    <div class="grid gap-4 max-w-2xl">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Start date</span>
          <input id="startDate" type="date" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Business days</span>
          <input id="days" type="number" min="0" value="10" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Direction</span>
          <select id="direction" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="add">Add days</option>
            <option value="subtract">Subtract days</option>
          </select>
        </label>
      </div>
      <button id="calculateBtn" type="button" class="rounded-md bg-blue-600 dark:bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Calculate Date</button>
      <div id="result" class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4"></div>
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

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

class BusinessDaysTool extends Tool {
  constructor() {
    super({ id: 'business-days', name: 'Business Days Calculator', category: 'time', needsFileUpload: false, template });
  }

  getElementsMap() {
    return {
      startDate: 'startDate',
      days: 'days',
      direction: 'direction',
      calculateBtn: 'calculateBtn',
      result: 'result',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.startDate.value = toDateInputValue();
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());
    this.calculate();
    this.log('Business days calculator ready', 'info');
  }

  calculate() {
    const start = parseDate(this.elements.startDate.value);
    const requestedDays = Math.max(0, Number.parseInt(this.elements.days.value, 10) || 0);
    const step = this.elements.direction.value === 'subtract' ? -1 : 1;
    const result = new Date(start);
    let remaining = requestedDays;
    let calendarDays = 0;

    while (remaining > 0) {
      result.setDate(result.getDate() + step);
      calendarDays += 1;
      if (isBusinessDay(result)) remaining -= 1;
    }

    this.elements.result.innerHTML = `
      <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Result date</div>
      <div class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">${formatDate(result)}</div>
      <div class="mt-2 text-sm text-slate-600 dark:text-slate-300">${requestedDays} business days ${this.elements.direction.value === 'subtract' ? 'before' : 'after'} ${formatDate(start)} spans ${calendarDays} calendar days.</div>
    `;
    this.log('Calculated business date', 'success');
  }
}

export function initTool() {
  return new BusinessDaysTool().init();
}
