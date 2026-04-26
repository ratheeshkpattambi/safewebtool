import { Tool } from '../common/base.js';

const DISMISS_KEY = 'safewebtool.timer.iosInstallBannerDismissed';
const DURATION_KEY = 'safewebtool.timer.durationMs';
const TICK_KEY = 'safewebtool.timer.tickEnabled';
const DEFAULT_DURATION_MS = 60 * 1000;
const TICK_INTERVAL_MS = 200;

export const template = `
  <div class="tool-container">
    <div id="iosInstallBanner" class="hidden mb-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
      <div class="flex gap-3 items-start justify-between">
        <p class="leading-relaxed">For best experience: Open in Safari &rarr; Share &rarr; Add to Home Screen</p>
        <button id="dismissInstallBanner" type="button" class="shrink-0 rounded-md px-2 py-1 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" aria-label="Dismiss install guidance">Dismiss</button>
      </div>
    </div>

    <div class="mx-auto grid max-w-xl gap-5">
      <div class="w-full min-w-0 overflow-hidden rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 px-3 py-8 sm:px-4 sm:py-12 text-center transition-colors">
        <span id="timerDisplay" class="block font-mono text-6xl sm:text-8xl font-semibold leading-none text-slate-900 dark:text-slate-50 tabular-nums">01:00</span>
        <span id="timerStatus" class="mt-4 block text-base font-medium text-slate-500 dark:text-slate-400" aria-live="polite">Tap Start</span>
        <span class="mt-6 block h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700" aria-hidden="true">
          <span id="timerProgress" class="block h-full w-0 rounded-full bg-blue-600 dark:bg-blue-400 transition-[width] duration-200"></span>
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2" aria-label="Quick timer presets">
        <button type="button" class="presetBtn rounded-md bg-slate-100 dark:bg-gray-700 px-3 py-3 sm:py-4 text-lg font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors" data-duration="60000">1</button>
        <button type="button" class="presetBtn rounded-md bg-slate-100 dark:bg-gray-700 px-3 py-3 sm:py-4 text-lg font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors" data-duration="120000">2</button>
        <button type="button" class="presetBtn rounded-md bg-slate-100 dark:bg-gray-700 px-3 py-3 sm:py-4 text-lg font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors" data-duration="180000">3</button>
        <button type="button" class="presetBtn rounded-md bg-slate-100 dark:bg-gray-700 px-3 py-3 sm:py-4 text-lg font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors" data-duration="300000">5</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Minutes</span>
          <input id="minutesInput" type="number" min="0" max="999" value="1" inputmode="numeric" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Seconds</span>
          <input id="secondsInput" type="number" min="0" max="59" value="0" inputmode="numeric" class="w-full rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        </label>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3">
        <button id="startPauseBtn" type="button" class="rounded-md bg-blue-600 dark:bg-blue-500 px-5 py-4 text-lg font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">Start</button>
        <button id="resetBtn" type="button" class="rounded-md border border-slate-300 dark:border-gray-600 px-5 py-4 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">Reset</button>
      </div>

      <label class="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-gray-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        <span>Tick sound</span>
        <input id="tickToggle" type="checkbox" class="h-5 w-5 accent-blue-600">
      </label>
    </div>

    <div id="logHeader" class="mt-6 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
      <span class="font-medium text-slate-700 dark:text-slate-300">Logs</span>
      <span id="logToggle" class="text-slate-500 dark:text-slate-400 transform transition-transform">▼</span>
    </div>
    <textarea id="logContent" class="w-full h-24 p-4 rounded-b-md mt-px font-mono text-xs resize-none bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-0 focus:outline-none transition-colors" readonly placeholder="Logs will appear here..."></textarea>
  </div>
`;

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

function isStandaloneMode() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

class TimerTool extends Tool {
  constructor() {
    super({
      id: 'timer',
      name: 'Timer',
      category: 'time',
      needsFileUpload: false,
      hasOutput: false,
      needsProcessButton: false,
      template
    });

    this.durationMs = this.loadStoredDuration();
    this.remainingMs = this.durationMs;
    this.deadline = 0;
    this.intervalId = null;
    this.lastTickSecond = null;
    this.running = false;
    this.audioContext = null;
    this.wakeLock = null;
  }

  getElementsMap() {
    return {
      iosInstallBanner: 'iosInstallBanner',
      dismissInstallBanner: 'dismissInstallBanner',
      timerDisplay: 'timerDisplay',
      timerStatus: 'timerStatus',
      timerProgress: 'timerProgress',
      minutesInput: 'minutesInput',
      secondsInput: 'secondsInput',
      startPauseBtn: 'startPauseBtn',
      resetBtn: 'resetBtn',
      tickToggle: 'tickToggle',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    this.setupInstallBanner();
    this.setupControls();
    this.setInputsFromDuration(this.durationMs);
    this.elements.tickToggle.checked = window.localStorage.getItem(TICK_KEY) !== 'false';
    this.updateDisplay();
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('focus', () => this.syncRunningTimer());
    window.addEventListener('pageshow', () => this.syncRunningTimer());
    this.log('Timer ready', 'info');
  }

  setupControls() {
    this.elements.startPauseBtn?.addEventListener('click', () => this.toggleTimer());
    this.elements.resetBtn?.addEventListener('click', () => this.resetTimer());
    [this.elements.minutesInput, this.elements.secondsInput].forEach(input => {
      input?.addEventListener('input', () => this.syncFromInputs());
      input?.addEventListener('change', () => this.normalizeInputs());
    });
    this.elements.tickToggle?.addEventListener('change', () => {
      if (this.elements.tickToggle.checked) this.prepareAudio();
      window.localStorage.setItem(TICK_KEY, String(this.elements.tickToggle.checked));
    });

    document.querySelectorAll('.presetBtn').forEach(button => {
      button.addEventListener('click', () => this.applyPreset(Number(button.dataset.duration)));
    });
  }

  setupInstallBanner() {
    if (!this.elements.iosInstallBanner || !isIosSafari() || isStandaloneMode()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === 'true') return;

    this.elements.iosInstallBanner.classList.remove('hidden');
    this.elements.dismissInstallBanner?.addEventListener('click', () => {
      window.localStorage.setItem(DISMISS_KEY, 'true');
      this.elements.iosInstallBanner.classList.add('hidden');
    });
  }

  loadStoredDuration() {
    const stored = Number(window.localStorage.getItem(DURATION_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_DURATION_MS;
  }

  storeDuration() {
    if (this.durationMs > 0) {
      window.localStorage.setItem(DURATION_KEY, String(this.durationMs));
    }
  }

  getInputDurationMs() {
    const minutes = clampNumber(Number.parseInt(this.elements.minutesInput?.value || '0', 10), 0, 999);
    const seconds = clampNumber(Number.parseInt(this.elements.secondsInput?.value || '0', 10), 0, 59);
    return ((minutes * 60) + seconds) * 1000;
  }

  setInputsFromDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.elements.minutesInput.value = String(minutes);
    this.elements.secondsInput.value = String(seconds);
  }

  normalizeInputs() {
    if (this.running) return;
    this.durationMs = this.getInputDurationMs();
    this.remainingMs = this.durationMs;
    this.setInputsFromDuration(this.durationMs);
    this.storeDuration();
    this.updateDisplay();
  }

  syncFromInputs() {
    if (this.running) return;
    this.durationMs = this.getInputDurationMs();
    this.remainingMs = this.durationMs;
    this.storeDuration();
    this.updateDisplay();
  }

  applyPreset(durationMs) {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    this.stopInterval();
    this.running = false;
    this.durationMs = durationMs;
    this.remainingMs = durationMs;
    this.lastTickSecond = null;
    this.setInputsFromDuration(durationMs);
    this.setInputsDisabled(false);
    this.elements.startPauseBtn.textContent = 'Start';
    this.elements.timerStatus.textContent = 'Tap Start';
    this.storeDuration();
    this.updateDisplay();
    this.releaseWakeLock();
  }

  toggleTimer() {
    if (this.running) {
      this.pauseTimer();
      return;
    }
    this.startTimer();
  }

  async startTimer() {
    if (this.remainingMs <= 0) {
      this.syncFromInputs();
    }
    if (this.remainingMs <= 0) {
      this.log('Set a duration before starting.', 'warning');
      return;
    }

    await this.prepareAudio();
    this.running = true;
    this.lastTickSecond = Math.ceil(this.remainingMs / 1000);
    this.deadline = Date.now() + this.remainingMs;
    this.elements.startPauseBtn.textContent = 'Pause';
    this.elements.timerStatus.textContent = 'Running';
    this.setInputsDisabled(true);
    this.stopInterval();
    this.intervalId = window.setInterval(() => this.tick(), TICK_INTERVAL_MS);
    await this.requestWakeLock();
    this.tick();
    this.log('Timer started', 'info');
  }

  pauseTimer() {
    this.running = false;
    this.stopInterval();
    this.remainingMs = Math.max(0, this.deadline - Date.now());
    this.elements.startPauseBtn.textContent = 'Start';
    this.elements.timerStatus.textContent = 'Paused';
    this.setInputsDisabled(false);
    this.updateDisplay();
    this.releaseWakeLock();
  }

  resetTimer() {
    this.stopInterval();
    this.running = false;
    this.durationMs = this.getInputDurationMs() || DEFAULT_DURATION_MS;
    this.remainingMs = this.durationMs;
    this.lastTickSecond = null;
    this.setInputsFromDuration(this.durationMs);
    this.elements.startPauseBtn.textContent = 'Start';
    this.elements.timerStatus.textContent = 'Tap Start';
    this.setInputsDisabled(false);
    this.storeDuration();
    this.updateDisplay();
    this.releaseWakeLock();
  }

  tick() {
    this.remainingMs = Math.max(0, this.deadline - Date.now());
    this.playTickCue();
    this.updateDisplay();

    if (this.remainingMs > 0) return;

    this.finishTimer();
  }

  finishTimer() {
    this.stopInterval();
    this.running = false;
    this.remainingMs = 0;
    this.elements.startPauseBtn.textContent = 'Start';
    this.elements.timerStatus.textContent = 'Done';
    this.setInputsDisabled(false);
    this.updateDisplay();
    this.releaseWakeLock();
    this.playFinishCue();
    this.log('Timer finished', 'success');
  }

  stopInterval() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setInputsDisabled(disabled) {
    this.elements.minutesInput.disabled = disabled;
    this.elements.secondsInput.disabled = disabled;
  }

  updateDisplay() {
    const totalSeconds = Math.ceil(this.remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    this.elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const progress = this.durationMs > 0 ? 1 - (this.remainingMs / this.durationMs) : 0;
    this.elements.timerProgress.style.width = `${clampNumber(progress, 0, 1) * 100}%`;
  }

  async prepareAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {});
    }
  }

  playTone(frequency, startOffset = 0, duration = 0.05, volume = 0.12) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime + startOffset;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playTickCue() {
    if (!this.elements.tickToggle.checked || !this.audioContext) return;
    const currentSecond = Math.ceil(this.remainingMs / 1000);
    if (currentSecond === this.lastTickSecond || currentSecond <= 0) return;
    this.lastTickSecond = currentSecond;
    this.playTone(660, 0, 0.035, 0.08);
  }

  playFinishCue() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    if (!this.audioContext) return;
    this.playTone(880, 0, 0.16, 0.16);
    this.playTone(1046, 0.22, 0.18, 0.16);
  }

  async requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (this.wakeLock) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch (error) {
      this.log(`Screen wake lock unavailable: ${error.message}`, 'warning');
    }
  }

  async releaseWakeLock() {
    if (!this.wakeLock) return;
    try {
      await this.wakeLock.release();
    } catch (error) {
      this.log(`Screen wake lock release failed: ${error.message}`, 'warning');
    } finally {
      this.wakeLock = null;
    }
  }

  handleVisibilityChange() {
    this.syncRunningTimer();
    if (document.visibilityState === 'visible') {
      this.requestWakeLock();
    }
  }

  syncRunningTimer() {
    if (!this.running) return;
    this.tick();
  }
}

export function initTool() {
  const tool = new TimerTool();
  return tool.init();
}
