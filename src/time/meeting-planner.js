import { Tool } from '../common/base.js';
import {
  escapeHtml,
  formatInTimeZone,
  getLocalHour,
  renderTimeZoneOptions,
  toDateInputValue,
  zonedDateTimeToDate
} from '../common/time-utils.js';

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const template = `
  <div class="tool-container">
    <div class="grid gap-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Date</span>
          <input id="meetingDate" type="date" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Duration</span>
          <select id="duration" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="30">30 min</option>
            <option value="60" selected>60 min</option>
            <option value="90">90 min</option>
          </select>
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Work starts</span>
          <input id="workStart" type="number" min="0" max="23" value="9" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Work ends</span>
          <input id="workEnd" type="number" min="1" max="24" value="17" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${[
          ['Participant 1', localZone],
          ['Participant 2', 'America/New_York'],
          ['Participant 3', 'Europe/London']
        ].map(([label, zone], index) => `
          <label class="block">
            <span class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">${label}</span>
            <select id="zone${index}" class="participantZone w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">${renderTimeZoneOptions(zone)}</select>
          </label>
        `).join('')}
      </div>

      <button id="findBtn" type="button" class="rounded-md bg-blue-600 dark:bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Find Meeting Times</button>
      <div id="results" class="grid gap-3"></div>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-24 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

class MeetingPlannerTool extends Tool {
  constructor() {
    super({ id: 'meeting-planner', name: 'Meeting Time Finder', category: 'time', needsFileUpload: false, template });
  }

  getElementsMap() {
    return {
      meetingDate: 'meetingDate',
      duration: 'duration',
      workStart: 'workStart',
      workEnd: 'workEnd',
      findBtn: 'findBtn',
      results: 'results',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.elements.meetingDate.value = toDateInputValue();
    this.elements.findBtn.addEventListener('click', () => this.findTimes());
    this.findTimes();
    this.log('Meeting time finder ready', 'info');
  }

  findTimes() {
    const zones = Array.from(document.querySelectorAll('.participantZone')).map(select => select.value);
    const hostZone = zones[0];
    const durationMinutes = Number(this.elements.duration.value);
    const workStart = Number(this.elements.workStart.value);
    const workEnd = Number(this.elements.workEnd.value);
    const date = this.elements.meetingDate.value;
    const matches = [];

    for (let minute = 0; minute < 24 * 60; minute += 30) {
      const hour = String(Math.floor(minute / 60)).padStart(2, '0');
      const min = String(minute % 60).padStart(2, '0');
      const instant = zonedDateTimeToDate(`${date}T${hour}:${min}`, hostZone);
      const available = zones.every(zone => {
        const localHour = getLocalHour(instant, zone);
        return localHour >= workStart && localHour + (durationMinutes / 60) <= workEnd;
      });
      if (available) matches.push(instant);
    }

    if (matches.length === 0) {
      this.elements.results.innerHTML = '<div class="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-amber-900 dark:text-amber-100">No full overlap found. Try shorter duration or wider working hours.</div>';
      this.log('No meeting overlap found', 'warning');
      return;
    }

    this.elements.results.innerHTML = matches.slice(0, 8).map((instant, index) => `
      <div class="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-4">
        <div class="text-sm font-semibold text-slate-500 dark:text-slate-400">Option ${index + 1}</div>
        <div class="mt-2 grid gap-1 text-sm text-slate-700 dark:text-slate-200">
          ${zones.map(zone => `<div><span class="font-medium">${escapeHtml(zone)}:</span> ${formatInTimeZone(instant, zone, { weekday: 'short' })}</div>`).join('')}
        </div>
      </div>
    `).join('');
    this.log(`Found ${matches.length} meeting windows`, 'success');
  }
}

export function initTool() {
  return new MeetingPlannerTool().init();
}
