const CLICK_SAMPLE_URL = new URL('../assets/ui-click-pop.wav', import.meta.url)
  .href;
const CLICK_MASTER_GAIN = 0.58;
const CLICK_MIN_INTERVAL_MS = 42;
const CLICK_SAMPLE_GAIN = 0.16;
const CLICK_SAMPLE_PLAYBACK_RATE_MIN = 1.28;
const CLICK_SAMPLE_PLAYBACK_RATE_MAX = 1.44;
const CLICK_TONE_DURATION_SECONDS = 0.034;
const CLICK_TONE_GAIN = 0.045;
const CLICK_TONE_START_FREQUENCY_MIN = 520;
const CLICK_TONE_START_FREQUENCY_MAX = 590;
const CLICK_TONE_END_FREQUENCY_MIN = 650;
const CLICK_TONE_END_FREQUENCY_MAX = 740;

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
    clickSampleUrl = CLICK_SAMPLE_URL,
    windowRef = typeof window === 'undefined' ? null : window,
    now = () => Date.now(),
    random = Math.random,
    logger = null,
  } = {}) {
    this.clickSampleUrl = clickSampleUrl;
    this.windowRef = windowRef;
    this.now = now;
    this.random = random;
    this.logger = logger;
    this.enabled = true;
    this.context = null;
    this.masterGain = null;
    this.clickBuffer = null;
    this.clickBufferPromise = null;
    this.clickSampleData = null;
    this.clickSampleDataPromise = null;
    this.audioUnavailable = false;
    this.resumePromise = null;
    this.lastPlayAtMs = Number.NEGATIVE_INFINITY;
    void this.prefetchClickSampleData();
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
    this.clickBufferPromise = null;
    this.clickSampleData = null;
    this.clickSampleDataPromise = null;
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
      void this.loadClickBuffer(this.context);
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
    if (this.clickBuffer) {
      this.playLayeredClick(context, this.clickBuffer);
      return;
    }

    if (!this.clickSampleUrl) {
      this.playToneClick(context);
      return;
    }

    if (!this.clickSampleData && this.clickSampleDataPromise) {
      this.playToneClick(context);
      void this.loadClickBuffer(context);
      return;
    }

    void this.loadClickBuffer(context).then((buffer) => {
      if (this.enabled && this.context === context && isContextRunning(context)) {
        this.playLayeredClick(context, buffer);
      }
    });
  }

  playLayeredClick(context, buffer) {
    if (buffer) {
      this.scheduleSampleLayer(context, buffer);
    }

    this.playToneClick(context);
  }

  scheduleSampleLayer(context, buffer) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const startAt = context.currentTime ?? 0;
    const playbackRate = this.randomBetween(
      CLICK_SAMPLE_PLAYBACK_RATE_MIN,
      CLICK_SAMPLE_PLAYBACK_RATE_MAX,
    );
    const stopAt = startAt + buffer.duration / Math.max(0.01, playbackRate) + 0.04;
    source.buffer = buffer;
    setAudioParamValue(source.playbackRate, playbackRate, startAt);
    setAudioParamValue(gain.gain, 0.0001, startAt);
    rampAudioParamValue(gain.gain, CLICK_SAMPLE_GAIN, startAt + 0.006);
    rampAudioParamValue(gain.gain, 0.0001, Math.max(startAt + 0.012, stopAt - 0.01));
    source.connect(gain);
    gain.connect(this.masterGain ?? context.destination);

    source.onended = () => {
      source.disconnect?.();
      gain.disconnect?.();
    };

    source.start(startAt);
    source.stop?.(stopAt);
  }

  playToneClick(context) {
    if (!context.createOscillator) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime ?? 0;
    const endAt = startAt + CLICK_TONE_DURATION_SECONDS;
    const startFrequency = this.randomBetween(
      CLICK_TONE_START_FREQUENCY_MIN,
      CLICK_TONE_START_FREQUENCY_MAX,
    );
    const endFrequency = this.randomBetween(
      CLICK_TONE_END_FREQUENCY_MIN,
      CLICK_TONE_END_FREQUENCY_MAX,
    );

    oscillator.type = 'triangle';
    setAudioParamValue(oscillator.frequency, startFrequency, startAt);
    rampAudioParamValue(oscillator.frequency, endFrequency, endAt);
    setAudioParamValue(gain.gain, 0.0001, startAt);
    rampAudioParamValue(gain.gain, CLICK_TONE_GAIN, startAt + 0.012);
    rampAudioParamValue(gain.gain, 0.0001, Math.max(startAt + 0.024, endAt - 0.012));

    oscillator.connect(gain);
    gain.connect(this.masterGain ?? context.destination);

    oscillator.onended = () => {
      oscillator.disconnect?.();
      gain.disconnect?.();
    };

    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }

  prefetchClickSampleData() {
    if (!this.clickSampleUrl || this.clickSampleData) {
      return Promise.resolve(this.clickSampleData);
    }

    if (this.clickSampleDataPromise) {
      return this.clickSampleDataPromise;
    }

    const fetchRef = this.windowRef?.fetch ?? globalThis.fetch;

    if (!fetchRef) {
      return Promise.resolve(null);
    }

    this.clickSampleDataPromise = Promise.resolve()
      .then(() => fetchRef.call(this.windowRef ?? globalThis, this.clickSampleUrl))
      .then((response) => {
        if (!response || response.ok === false) {
          return null;
        }

        return response.arrayBuffer();
      })
      .then((data) => {
        this.clickSampleData = data;
        return data;
      })
      .catch((error) => {
        this.logger?.warn?.('Unable to load UI click sample.', error);
        return null;
      })
      .finally(() => {
        this.clickSampleDataPromise = null;
      });

    return this.clickSampleDataPromise;
  }

  loadClickBuffer(context) {
    if (this.clickBuffer) {
      return Promise.resolve(this.clickBuffer);
    }

    if (this.clickBufferPromise) {
      return this.clickBufferPromise;
    }

    if (!this.clickSampleUrl || !context.decodeAudioData) {
      return Promise.resolve(null);
    }

    this.clickBufferPromise = this.prefetchClickSampleData()
      .then((data) => {
        if (!data || this.context !== context || isContextClosed(context)) {
          return null;
        }

        return context.decodeAudioData(data.slice(0));
      })
      .then((buffer) => {
        if (buffer && !isContextClosed(context)) {
          this.clickBuffer = buffer;
        }

        return buffer;
      })
      .catch((error) => {
        this.logger?.warn?.('Unable to decode UI click sample.', error);
        return null;
      })
      .finally(() => {
        this.clickBufferPromise = null;
      });

    return this.clickBufferPromise;
  }

  randomBetween(min, max) {
    return min + (max - min) * this.random();
  }
}

function setAudioParamValue(param, value, atTime) {
  if (param?.setValueAtTime) {
    param.setValueAtTime(value, atTime);
    return;
  }

  if (param) {
    param.value = value;
  }
}

function rampAudioParamValue(param, value, atTime) {
  if (param?.exponentialRampToValueAtTime) {
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), atTime);
    return;
  }

  setAudioParamValue(param, value, atTime);
}
