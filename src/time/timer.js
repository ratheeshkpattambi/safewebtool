import { Tool } from '../common/base.js';

const DISMISS_KEY = 'safewebtool.timer.iosInstallBannerDismissed';
const DURATION_KEY = 'safewebtool.timer.durationMs';
const TICK_KEY = 'safewebtool.timer.tickEnabled';
const DEFAULT_DURATION_MS = 60 * 1000;
const TICK_INTERVAL_MS = 200;
const TICK_VOLUME = 0.78;
const FINISH_VOLUME = 0.92;

export const template = `
  <style>
    .timer-app {
      min-height: min(82svh, 860px);
      border-radius: 8px;
      padding: clamp(16px, 4vw, 30px);
      color: #ffffff;
      background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
      border: 1px solid rgba(37, 99, 235, 0.35);
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: clamp(14px, 3vh, 24px);
      overflow: hidden;
    }

    .dark .timer-app {
      color: #f8fafc;
      background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%);
      border-color: rgba(96, 165, 250, 0.28);
    }

    .timer-display-panel {
      min-height: 0;
      border-radius: 8px;
      padding: clamp(18px, 5vw, 44px);
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.72);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
      display: grid;
      place-items: center;
      text-align: center;
      overflow: hidden;
    }

    .dark .timer-display-panel {
      background: rgba(15, 23, 42, 0.62);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
    }

    #timerDisplay {
      font-size: clamp(4.8rem, 21vw, 11rem);
      line-height: 0.9;
      letter-spacing: 0;
      color: #0f172a;
      background: linear-gradient(135deg, #020617 0%, #1d4ed8 48%, #2563eb 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
    }

    .dark #timerDisplay {
      background: linear-gradient(135deg, #ffffff 0%, #bfdbfe 48%, #60a5fa 100%);
      -webkit-background-clip: text;
      background-clip: text;
    }

    .timer-focus-page {
      max-width: none;
      padding: 8px;
    }

    .timer-focus-page > div {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
    }

    .timer-focus-page > div > div:first-child {
      display: none;
    }

    .timer-focus-page .tool-content-area {
      width: 100%;
      min-height: calc(100svh - 16px);
    }

    .timer-focus-page > div > div:nth-child(2) {
      padding: 0;
    }

    .timer-focus-page #logHeader,
    .timer-focus-page #logContent {
      display: none;
    }

    body.timer-app-mode header,
    body.timer-app-mode footer {
      display: none;
    }

    body.timer-app-mode main {
      padding-top: 0;
    }

    body.timer-app-mode {
      overflow-x: hidden;
    }

    .timer-controls {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .timer-app .timer-custom label > span {
      color: rgba(255, 255, 255, 0.92);
    }

    .timer-sound-control {
      opacity: 0.82;
    }

    .timer-presets,
    .timer-custom {
      display: grid;
      gap: 10px;
    }

    .timer-presets {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .timer-custom {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (orientation: landscape) and (max-height: 520px) {
      .timer-app {
        min-height: calc(100svh - 8px);
        height: calc(100svh - 8px);
        padding: 10px;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) minmax(206px, 0.32fr);
        grid-template-rows: 1fr;
        align-items: stretch;
      }

      .timer-display-panel {
        min-height: 0;
        padding: 12px;
      }

      #iosInstallBanner {
        display: none !important;
      }

      .timer-focus-page {
        padding: 4px;
      }

      .timer-focus-page .tool-content-area {
        min-height: calc(100svh - 8px);
      }

      body.timer-app-mode {
        overflow: hidden;
      }

      #timerDisplay {
        font-size: clamp(5rem, 15vw, 8.4rem);
      }

      #timerStatus {
        margin-top: 8px;
        font-size: 0.95rem;
      }

      .timer-display-panel [aria-hidden="true"] {
        margin-top: 12px;
      }

      .timer-presets,
      .timer-custom {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .timer-presets {
        gap: 8px;
      }

      .presetBtn {
        padding-top: 10px;
        padding-bottom: 10px;
        font-size: 1rem;
      }

      .timer-custom {
        gap: 8px;
      }

      .timer-custom label > span {
        font-size: 0.75rem;
      }

      .timer-custom input {
        padding: 10px 12px;
        font-size: 1rem;
      }

      #startPauseBtn {
        padding-top: 14px;
        padding-bottom: 14px;
        font-size: 1.1rem;
      }

      .timer-sound-control {
        padding-top: 9px;
        padding-bottom: 9px;
      }
    }
  </style>

  <div class="tool-container">
    <div id="iosInstallBanner" class="hidden mb-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
      <div class="flex gap-3 items-start justify-between">
        <p class="leading-relaxed">For best experience: Open in Safari &rarr; Share &rarr; Add to Home Screen</p>
        <button id="dismissInstallBanner" type="button" class="shrink-0 rounded-md px-2 py-1 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" aria-label="Dismiss install guidance">Dismiss</button>
      </div>
    </div>

    <div class="timer-app">
      <div class="timer-display-panel">
        <div class="w-full min-w-0">
          <span id="timerDisplay" class="block font-mono font-black tabular-nums">01:00</span>
          <span id="timerStatus" class="mt-4 block text-lg font-bold text-slate-600 dark:text-slate-300" aria-live="polite">Tap Start</span>
          <span class="mx-auto mt-7 block h-3 max-w-xl overflow-hidden rounded-full bg-white/60 dark:bg-slate-950/50" aria-hidden="true">
            <span id="timerProgress" class="block h-full w-0 rounded-full bg-blue-600 dark:bg-blue-400 transition-[width] duration-200"></span>
          </span>
        </div>
      </div>

      <div class="timer-controls">
        <div class="timer-presets" aria-label="Quick timer presets">
          <button type="button" class="presetBtn rounded-md bg-white/80 dark:bg-white/10 px-3 py-4 text-xl font-black text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-white/15 transition-colors" data-duration="60000">1</button>
          <button type="button" class="presetBtn rounded-md bg-white/80 dark:bg-white/10 px-3 py-4 text-xl font-black text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-white/15 transition-colors" data-duration="120000">2</button>
          <button type="button" class="presetBtn rounded-md bg-white/80 dark:bg-white/10 px-3 py-4 text-xl font-black text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-white/15 transition-colors" data-duration="180000">3</button>
          <button type="button" class="presetBtn rounded-md bg-white/80 dark:bg-white/10 px-3 py-4 text-xl font-black text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-white/15 transition-colors" data-duration="300000">5</button>
        </div>

        <div class="timer-custom">
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Minutes</span>
            <input id="minutesInput" type="number" min="0" max="999" value="1" inputmode="numeric" class="w-full rounded-md border-0 bg-white/85 dark:bg-slate-950/60 px-4 py-4 text-xl font-bold text-slate-950 dark:text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-400">
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Seconds</span>
            <input id="secondsInput" type="number" min="0" max="59" value="0" inputmode="numeric" class="w-full rounded-md border-0 bg-white/85 dark:bg-slate-950/60 px-4 py-4 text-xl font-bold text-slate-950 dark:text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-400">
          </label>
        </div>

        <button id="startPauseBtn" type="button" class="rounded-md bg-slate-950 dark:bg-white px-6 py-5 text-xl font-black text-white dark:text-slate-950 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">Start</button>

        <label class="timer-sound-control flex items-center justify-between gap-3 rounded-md bg-white/35 dark:bg-white/10 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white">
          <span>Tick</span>
          <input id="tickToggle" type="checkbox" class="h-4 w-4 accent-blue-600">
        </label>
      </div>
    </div>

    <div id="logHeader" class="mt-4 bg-slate-100 dark:bg-gray-700 p-2.5 rounded-md cursor-pointer flex justify-between items-center transition-colors">
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

function createToneDataUrl(frequency = 960, durationMs = 72, volume = 0.7) {
  const sampleRate = 22050;
  const sampleCount = Math.floor(sampleRate * (durationMs / 1000));
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const progress = i / sampleCount;
    const envelope = Math.sin(Math.PI * progress);
    const wave = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    view.setInt16(44 + (i * bytesPerSample), wave * envelope * volume * 32767, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return `data:audio/wav;base64,${window.btoa(binary)}`;
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
    this.audioUnlocked = false;
    this.tickAudio = null;
    this.finishAudio = null;
    this.lastSoundSecond = null;
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
      tickToggle: 'tickToggle',
      logHeader: 'logHeader',
      logContent: 'logContent'
    };
  }

  async setup() {
    document.body.classList.add('timer-app-mode');
    document.querySelector('.tool-page')?.classList.add('timer-focus-page');
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
    ['pointerdown', 'touchstart'].forEach(eventName => {
      this.elements.startPauseBtn?.addEventListener(eventName, () => {
        if (this.elements.tickToggle.checked) {
          this.prepareAudio({ unlock: true });
        }
      }, { passive: true });
    });
    this.elements.startPauseBtn?.addEventListener('click', () => this.toggleTimer());
    [this.elements.minutesInput, this.elements.secondsInput].forEach(input => {
      input?.addEventListener('input', () => this.syncFromInputs());
      input?.addEventListener('change', () => this.normalizeInputs());
    });
    this.elements.tickToggle?.addEventListener('change', () => {
      if (this.elements.tickToggle.checked) this.prepareAudio({ unlock: true });
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
    this.lastSoundSecond = null;
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
      this.stopAndResetTimer();
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

    await this.prepareAudio({ unlock: true });
    this.running = true;
    this.lastTickSecond = Math.ceil(this.remainingMs / 1000);
    this.lastSoundSecond = null;
    this.deadline = Date.now() + this.remainingMs;
    this.elements.startPauseBtn.textContent = 'Stop';
    this.elements.timerStatus.textContent = 'Running';
    this.setInputsDisabled(true);
    this.stopInterval();
    this.intervalId = window.setInterval(() => this.tick(), TICK_INTERVAL_MS);
    await this.requestWakeLock();
    this.tick();
    this.log('Timer started', 'info');
  }

  stopAndResetTimer() {
    this.stopInterval();
    this.running = false;
    this.remainingMs = this.durationMs;
    this.lastTickSecond = null;
    this.lastSoundSecond = null;
    this.setInputsFromDuration(this.durationMs);
    this.elements.startPauseBtn.textContent = 'Start';
    this.elements.timerStatus.textContent = 'Tap Start';
    this.setInputsDisabled(false);
    this.storeDuration();
    this.updateDisplay();
    this.releaseWakeLock();
    this.log('Timer stopped', 'info');
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
    this.lastSoundSecond = null;
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

  async prepareAudio(options = {}) {
    this.ensureAudioElements();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !this.audioContext) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume().catch(() => {});
    }
    if (!options.unlock || this.audioUnlocked) return;

    if (this.audioContext?.state === 'running') {
      this.audioUnlocked = true;
    }

    if (this.tickAudio) {
      const played = await this.unlockAudioElement(this.tickAudio);
      this.audioUnlocked = this.audioUnlocked || played;
      if (!played) {
        this.log('Tap Start again if your browser blocked timer sound.', 'warning');
      }
    }
  }

  ensureAudioElements() {
    if (this.tickAudio || typeof Audio === 'undefined') return;
    this.tickAudio = new Audio(createToneDataUrl(1040, 76, 0.86));
    this.finishAudio = new Audio(createToneDataUrl(760, 220, 0.82));
    [this.tickAudio, this.finishAudio].forEach(audio => {
      audio.preload = 'auto';
      audio.playsInline = true;
    });
  }

  async unlockAudioElement(audio) {
    if (!audio) return false;
    try {
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      return true;
    } catch (error) {
      audio.muted = false;
      return false;
    }
  }

  async playAudioElement(audio, volume = TICK_VOLUME) {
    if (!audio) return false;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = clampNumber(volume, 0, 1);
      audio.muted = false;
      audio.playsInline = true;
      await audio.play();
      return true;
    } catch (error) {
      return false;
    }
  }

  playTone(frequency, startOffset = 0, duration = 0.05, volume = 0.12, type = 'square') {
    if (!this.audioContext || this.audioContext.state !== 'running') return;
    const now = this.audioContext.currentTime + startOffset;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playTickCue() {
    if (!this.elements.tickToggle.checked) return;
    const currentSecond = Math.ceil(this.remainingMs / 1000);
    if (currentSecond === this.lastTickSecond || currentSecond <= 0) return;
    this.lastTickSecond = currentSecond;
    this.playSingleTick(currentSecond);
  }

  async playSingleTick(currentSecond) {
    if (this.lastSoundSecond === currentSecond) return;
    this.lastSoundSecond = currentSecond;
    const played = await this.playAudioElement(this.tickAudio, TICK_VOLUME);
    if (!played) {
      this.playTone(960, 0, 0.07, 0.24);
    }
  }

  playFinishCue() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    this.playSingleFinishCue();
  }

  async playSingleFinishCue() {
    const played = await this.playAudioElement(this.finishAudio, FINISH_VOLUME);
    if (!played) {
      this.playTone(880, 0, 0.18, 0.24);
    }
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
