const BUTTON_CLICK_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/idle-outpost/button-touch-up-2.wav',
    import.meta.url,
  ).href,
]);
const PURCHASE_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/root-run/sell-1.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/root-run/sell-2.wav',
    import.meta.url,
  ).href,
]);
const DIALOG_OPEN_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/root-run/ui-fly-1.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/root-run/ui-fly-2.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/root-run/ui-fly-3.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/root-run/ui-fly-4.wav',
    import.meta.url,
  ).href,
]);
const SUMMON_POP_SAMPLE_URL = new URL(
  '../../../../assets/game/source/audio/ui-click-pop.wav',
  import.meta.url,
).href;

const MASTER_GAIN = 1;
const CLICK_MIN_INTERVAL_MS = 42;
const CLICK_GAIN = 0.56;
const PURCHASE_GAIN = 0.74 * 0.5;
const DIALOG_OPEN_GAIN = 0.62 * 0.72;
const SUMMON_POP_GAIN = 1;
const PURCHASE_PLAYBACK_RATE = 1.08;
const DIALOG_OPEN_PLAYBACK_RATE_MIN = 0.9;
const DIALOG_OPEN_PLAYBACK_RATE_MAX = 1.2;
const SUMMON_POP_PLAYBACK_RATE_MIN = 0.94;
const SUMMON_POP_PLAYBACK_RATE_MAX = 1.08;
const SUMMON_POP_INTERVAL_SECONDS = 0.085;
const MAX_SUMMON_POP_COUNT = 5;
const FALLBACK_TONE_DURATION_SECONDS = 0.034;
const FALLBACK_TONE_GAIN = 0.026;
const FALLBACK_TONE_START_FREQUENCY_MIN = 520;
const FALLBACK_TONE_START_FREQUENCY_MAX = 590;
const FALLBACK_TONE_END_FREQUENCY_MIN = 650;
const FALLBACK_TONE_END_FREQUENCY_MAX = 740;

function getAudioContextConstructor(windowRef) {
  return windowRef?.AudioContext ?? windowRef?.webkitAudioContext ?? null;
}

function isContextRunning(context) {
  return context?.state === 'running';
}

function isContextClosed(context) {
  return context?.state === 'closed';
}

function createCue({
  urls,
  gain,
  playbackRate = 1,
  playbackRateMax = playbackRate,
  minIntervalMs = 0,
}) {
  return Object.freeze({
    urls: Object.freeze(urls.filter(Boolean)),
    gain,
    playbackRate,
    playbackRateMax,
    minIntervalMs,
  });
}

export class UiClickSoundManager {
  constructor({
    clickSampleUrls = BUTTON_CLICK_SAMPLE_URLS,
    clickSampleUrl,
    purchaseSampleUrls = PURCHASE_SAMPLE_URLS,
    dialogOpenSampleUrls = DIALOG_OPEN_SAMPLE_URLS,
    summonPopSampleUrl = SUMMON_POP_SAMPLE_URL,
    windowRef = typeof window === 'undefined' ? null : window,
    now = () => Date.now(),
    random = Math.random,
    logger = null,
  } = {}) {
    this.windowRef = windowRef;
    this.now = now;
    this.random = random;
    this.logger = logger;
    this.enabled = true;
    this.volume = 1;
    this.context = null;
    this.masterGain = null;
    this.audioUnavailable = false;
    this.resumePromise = null;
    this.buffers = new Map();
    this.bufferPromises = new Map();
    this.sampleData = new Map();
    this.sampleDataPromises = new Map();
    this.lastVariantByCue = new Map();
    this.lastPlayAtMsByCue = new Map();
    this.cues = new Map([
      [
        'click',
        createCue({
          urls:
            clickSampleUrl === undefined
              ? [...clickSampleUrls]
              : [clickSampleUrl],
          gain: CLICK_GAIN,
          minIntervalMs: CLICK_MIN_INTERVAL_MS,
        }),
      ],
      [
        'purchase',
        createCue({
          urls: [...purchaseSampleUrls],
          gain: PURCHASE_GAIN,
          playbackRate: PURCHASE_PLAYBACK_RATE,
        }),
      ],
      [
        'dialog-open',
        createCue({
          urls: [...dialogOpenSampleUrls],
          gain: DIALOG_OPEN_GAIN,
          playbackRate: DIALOG_OPEN_PLAYBACK_RATE_MIN,
          playbackRateMax: DIALOG_OPEN_PLAYBACK_RATE_MAX,
        }),
      ],
      [
        'summon-pop',
        createCue({
          urls: [summonPopSampleUrl],
          gain: SUMMON_POP_GAIN,
          playbackRate: SUMMON_POP_PLAYBACK_RATE_MIN,
          playbackRateMax: SUMMON_POP_PLAYBACK_RATE_MAX,
        }),
      ],
    ]);

    for (const cue of this.cues.values()) {
      for (const url of cue.urls) {
        void this.prefetchSampleData(url);
      }
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    this.syncMasterGain();
  }

  setVolume(volume) {
    this.volume = normalizeVolume(volume);
    this.enabled = this.volume > 0;
    this.syncMasterGain();
  }

  unlock() {
    if (!this.enabled) {
      return;
    }

    const context = this.ensureContext();
    if (context) {
      void this.resumeContext();
    }
  }

  playClick() {
    return this.playCue('click', { fallbackTone: true });
  }

  playPurchase() {
    return this.playCue('purchase');
  }

  playDialogOpen() {
    return this.playCue('dialog-open');
  }

  playSummon(quantity = 1) {
    const repeatCount = Math.min(
      MAX_SUMMON_POP_COUNT,
      Math.max(0, Math.floor(Number(quantity) || 0)),
    );
    if (repeatCount === 0) {
      return false;
    }
    return this.playCue('summon-pop', {
      repeatCount,
      repeatIntervalSeconds: SUMMON_POP_INTERVAL_SECONDS,
    });
  }

  playCue(
    cueId,
    {
      fallbackTone = false,
      repeatCount = 1,
      repeatIntervalSeconds = 0,
    } = {},
  ) {
    const cue = this.cues.get(cueId);
    if (!this.enabled || !cue || this.isThrottled(cueId, cue)) {
      return false;
    }

    const context = this.ensureContext();
    if (!context || isContextClosed(context) || !isContextRunning(context)) {
      return false;
    }

    this.lastPlayAtMsByCue.set(cueId, this.now());
    this.playCueNow(context, cueId, cue, {
      fallbackTone,
      repeatCount,
      repeatIntervalSeconds,
    });
    return true;
  }

  destroy() {
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.resumePromise = null;
    this.buffers.clear();
    this.bufferPromises.clear();
    this.sampleData.clear();
    this.sampleDataPromises.clear();
    this.lastVariantByCue.clear();
    this.lastPlayAtMsByCue.clear();

    if (!context || isContextClosed(context)) {
      return;
    }

    void context.close?.().catch?.((error) => {
      this.logger?.warn?.('Unable to close UI sound audio context.', error);
    });
  }

  isThrottled(cueId, cue) {
    const lastPlayAtMs =
      this.lastPlayAtMsByCue.get(cueId) ?? Number.NEGATIVE_INFINITY;
    return this.now() - lastPlayAtMs < cue.minIntervalMs;
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
      this.logger?.warn?.('Web Audio API unavailable; UI sounds disabled.');
      return null;
    }

    try {
      this.context = new AudioContextConstructor();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.syncMasterGain();
      for (const cue of this.cues.values()) {
        for (const url of cue.urls) {
          void this.loadBuffer(this.context, url);
        }
      }
      return this.context;
    } catch (error) {
      this.audioUnavailable = true;
      this.logger?.warn?.('Unable to initialize UI sounds.', error);
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
        this.logger?.warn?.('Unable to resume UI sound audio context.', error);
        return false;
      })
      .finally(() => {
        this.resumePromise = null;
      });
    return this.resumePromise;
  }

  syncMasterGain() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.enabled
        ? MASTER_GAIN * this.volume
        : 0;
    }
  }

  playCueNow(
    context,
    cueId,
    cue,
    { fallbackTone, repeatCount, repeatIntervalSeconds },
  ) {
    const url = this.chooseVariant(cueId, cue.urls);
    const buffer = url ? this.buffers.get(url) : null;
    if (buffer) {
      this.scheduleSamples(context, buffer, cue, {
        repeatCount,
        repeatIntervalSeconds,
      });
      return;
    }

    if (fallbackTone && (!url || !this.sampleData.has(url))) {
      this.playFallbackTone(context);
    }
    if (!url || (fallbackTone && !this.sampleData.has(url))) {
      return;
    }

    void this.loadBuffer(context, url).then((loadedBuffer) => {
      if (
        loadedBuffer &&
        this.enabled &&
        this.context === context &&
        isContextRunning(context)
      ) {
        this.scheduleSamples(context, loadedBuffer, cue, {
          repeatCount,
          repeatIntervalSeconds,
        });
      }
    });
  }

  chooseVariant(cueId, urls) {
    if (urls.length === 0) {
      return null;
    }
    if (urls.length === 1) {
      return urls[0];
    }

    let index = Math.min(
      urls.length - 1,
      Math.floor(this.random() * urls.length),
    );
    const previousIndex = this.lastVariantByCue.get(cueId);
    if (index === previousIndex) {
      index = (index + 1) % urls.length;
    }
    this.lastVariantByCue.set(cueId, index);
    return urls[index];
  }

  scheduleSamples(
    context,
    buffer,
    cue,
    { repeatCount = 1, repeatIntervalSeconds = 0 } = {},
  ) {
    for (let index = 0; index < repeatCount; index += 1) {
      this.scheduleSample(
        context,
        buffer,
        cue,
        index * repeatIntervalSeconds,
      );
    }
  }

  scheduleSample(context, buffer, cue, delaySeconds = 0) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const startAt = (context.currentTime ?? 0) + delaySeconds;
    const playbackRate = this.randomBetween(
      cue.playbackRate,
      cue.playbackRateMax,
    );
    source.buffer = buffer;
    setAudioParamValue(source.playbackRate, playbackRate, startAt);
    setAudioParamValue(gain.gain, cue.gain, startAt);
    source.connect(gain);
    gain.connect(this.masterGain ?? context.destination);
    source.onended = () => {
      source.disconnect?.();
      gain.disconnect?.();
    };
    source.start(startAt);
  }

  playFallbackTone(context) {
    if (!context.createOscillator) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime ?? 0;
    const endAt = startAt + FALLBACK_TONE_DURATION_SECONDS;
    oscillator.type = 'triangle';
    setAudioParamValue(
      oscillator.frequency,
      this.randomBetween(
        FALLBACK_TONE_START_FREQUENCY_MIN,
        FALLBACK_TONE_START_FREQUENCY_MAX,
      ),
      startAt,
    );
    rampAudioParamValue(
      oscillator.frequency,
      this.randomBetween(
        FALLBACK_TONE_END_FREQUENCY_MIN,
        FALLBACK_TONE_END_FREQUENCY_MAX,
      ),
      endAt,
    );
    setAudioParamValue(gain.gain, 0.0001, startAt);
    rampAudioParamValue(gain.gain, FALLBACK_TONE_GAIN, startAt + 0.012);
    rampAudioParamValue(gain.gain, 0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(this.masterGain ?? context.destination);
    oscillator.onended = () => {
      oscillator.disconnect?.();
      gain.disconnect?.();
    };
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }

  prefetchSampleData(url) {
    if (!url || this.sampleData.has(url)) {
      return Promise.resolve(this.sampleData.get(url) ?? null);
    }
    if (this.sampleDataPromises.has(url)) {
      return this.sampleDataPromises.get(url);
    }

    const fetchRef = this.windowRef?.fetch ?? globalThis.fetch;
    if (!fetchRef) {
      return Promise.resolve(null);
    }
    const promise = Promise.resolve()
      .then(() => fetchRef.call(this.windowRef ?? globalThis, url))
      .then((response) => {
        if (!response || response.ok === false) {
          return null;
        }
        return response.arrayBuffer();
      })
      .then((data) => {
        if (data) {
          this.sampleData.set(url, data);
        }
        return data;
      })
      .catch((error) => {
        this.logger?.warn?.(`Unable to load UI sound sample: ${url}`, error);
        return null;
      })
      .finally(() => {
        this.sampleDataPromises.delete(url);
      });
    this.sampleDataPromises.set(url, promise);
    return promise;
  }

  loadBuffer(context, url) {
    if (!url) {
      return Promise.resolve(null);
    }
    if (this.buffers.has(url)) {
      return Promise.resolve(this.buffers.get(url));
    }
    if (this.bufferPromises.has(url)) {
      return this.bufferPromises.get(url);
    }
    if (!context.decodeAudioData) {
      return Promise.resolve(null);
    }

    const promise = this.prefetchSampleData(url)
      .then((data) => {
        if (!data || this.context !== context || isContextClosed(context)) {
          return null;
        }
        return context.decodeAudioData(data.slice(0));
      })
      .then((buffer) => {
        if (buffer && !isContextClosed(context)) {
          this.buffers.set(url, buffer);
        }
        return buffer;
      })
      .catch((error) => {
        this.logger?.warn?.(`Unable to decode UI sound sample: ${url}`, error);
        return null;
      })
      .finally(() => {
        this.bufferPromises.delete(url);
      });
    this.bufferPromises.set(url, promise);
    return promise;
  }

  randomBetween(min, max) {
    return min + (max - min) * this.random();
  }
}

function normalizeVolume(volume) {
  const numeric = Number(volume);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.min(1, numeric))
    : 0;
}

function setAudioParamValue(param, value, atTime) {
  if (param?.setValueAtTime) {
    param.setValueAtTime(value, atTime);
  } else if (param) {
    param.value = value;
  }
}

function rampAudioParamValue(param, value, atTime) {
  if (param?.exponentialRampToValueAtTime) {
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), atTime);
  } else {
    setAudioParamValue(param, value, atTime);
  }
}
