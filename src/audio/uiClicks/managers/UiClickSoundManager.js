const CLICK_DURATION_SECONDS = 0.045;
const CLICK_MASTER_GAIN = 0.24;
const CLICK_MIN_INTERVAL_MS = 24;
const CLICK_START_FREQUENCY = 920;
const CLICK_END_FREQUENCY = 430;

function getAudioContextConstructor(windowRef) {
  return windowRef?.AudioContext ?? windowRef?.webkitAudioContext ?? null;
}

function isContextRunning(context) {
  return context?.state === 'running';
}

function isContextClosed(context) {
  return context?.state === 'closed';
}

export class UiClickSoundManager {
  constructor({
    windowRef = typeof window === 'undefined' ? null : window,
    now = () => Date.now(),
    logger = null,
  } = {}) {
    this.windowRef = windowRef;
    this.now = now;
    this.logger = logger;
    this.enabled = true;
    this.context = null;
    this.masterGain = null;
    this.clickBuffer = null;
    this.audioUnavailable = false;
    this.resumePromise = null;
    this.lastPlayAtMs = Number.NEGATIVE_INFINITY;
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    this.syncMasterGain();
  }

  unlock() {
    if (!this.enabled) {
      return;
    }

    const context = this.ensureContext();

    if (!context) {
      return;
    }

    void this.resumeContext();
  }

  playClick() {
    if (!this.enabled || this.isThrottled()) {
      return;
    }

    const context = this.ensureContext();

    if (!context || isContextClosed(context)) {
      return;
    }

    this.lastPlayAtMs = this.now();

    if (isContextRunning(context)) {
      this.playClickNow(context);
      return;
    }

    void this.resumeContext().then((running) => {
      if (running && this.enabled && this.context === context) {
        this.playClickNow(context);
      }
    });
  }

  destroy() {
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.clickBuffer = null;
    this.resumePromise = null;

    if (!context || isContextClosed(context)) {
      return;
    }

    void context.close?.().catch?.((error) => {
      this.logger?.warn?.('Unable to close UI click audio context.', error);
    });
  }

  isThrottled() {
    return this.now() - this.lastPlayAtMs < CLICK_MIN_INTERVAL_MS;
  }

  ensureContext() {
    if (this.context && !isContextClosed(this.context)) {
      return this.context;
    }

    if (this.audioUnavailable || !this.windowRef) {
      return null;
    }

    const AudioContextConstructor = getAudioContextConstructor(this.windowRef);

    if (!AudioContextConstructor) {
      this.audioUnavailable = true;
      this.logger?.warn?.('Web Audio API unavailable; UI click sound disabled.');
      return null;
    }

    try {
      this.context = new AudioContextConstructor();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.syncMasterGain();
      this.clickBuffer = this.createClickBuffer(this.context);
      return this.context;
    } catch (error) {
      this.audioUnavailable = true;
      this.logger?.warn?.('Unable to initialize UI click sound.', error);
      return null;
    }
  }

  resumeContext() {
    const context = this.context;

    if (!context || isContextClosed(context)) {
      return Promise.resolve(false);
    }

    if (isContextRunning(context)) {
      return Promise.resolve(true);
    }

    if (this.resumePromise) {
      return this.resumePromise;
    }

    this.resumePromise = Promise.resolve(context.resume?.())
      .then(() => isContextRunning(context))
      .catch((error) => {
        this.logger?.warn?.('Unable to resume UI click audio context.', error);
        return false;
      })
      .finally(() => {
        this.resumePromise = null;
      });

    return this.resumePromise;
  }

  syncMasterGain() {
    if (!this.masterGain) {
      return;
    }

    this.masterGain.gain.value = this.enabled ? CLICK_MASTER_GAIN : 0;
  }

  playClickNow(context) {
    const buffer = this.clickBuffer ?? this.createClickBuffer(context);
    this.clickBuffer = buffer;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(this.masterGain ?? context.destination);

    source.onended = () => {
      source.disconnect?.();
      gain.disconnect?.();
    };

    source.start();
  }

  createClickBuffer(context) {
    const sampleRate = context.sampleRate || 48000;
    const length = Math.max(1, Math.floor(sampleRate * CLICK_DURATION_SECONDS));
    const buffer = context.createBuffer(1, length, sampleRate);
    const samples = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const progress = i / length;
      const frequency =
        CLICK_START_FREQUENCY +
        (CLICK_END_FREQUENCY - CLICK_START_FREQUENCY) * progress;
      const envelope = Math.exp(-85 * t) * (1 - progress);
      const phase = 2 * Math.PI * frequency * t;
      samples[i] = Math.sin(phase) * envelope;
    }

    return buffer;
  }
}
