const DEFAULT_HARVEST_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/garden-harvest/wheat-cut-1.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-harvest/wheat-cut-2.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-harvest/wheat-cut-3.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-harvest/wheat-cut-4.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-harvest/wheat-cut-5.wav',
    import.meta.url,
  ).href,
]);

const HARVEST_VOLUME = 0.6336;
const HARVEST_PLAYBACK_RATE_MIN = 0.9;
const HARVEST_PLAYBACK_RATE_RANGE = 0.3;

function defaultAudioFactory(url) {
  const AudioConstructor = globalThis.Audio;
  return typeof AudioConstructor === 'function' ? new AudioConstructor(url) : null;
}

export class GardenHarvestSoundManager {
  constructor({
    sampleUrls = DEFAULT_HARVEST_SAMPLE_URLS,
    audioFactory = defaultAudioFactory,
    random = Math.random,
    logger = null,
  } = {}) {
    this.sampleUrls = [...sampleUrls];
    this.audioFactory = audioFactory;
    this.random = random;
    this.logger = logger;
    this.enabled = true;
    this.lastVariantIndex = -1;
    this.activeClips = new Set();
    this.templates = this.sampleUrls.map((url) => this.createTemplate(url));
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    if (!this.enabled) {
      this.stopActiveClips();
    }
  }

  playHarvest() {
    if (!this.enabled || this.sampleUrls.length === 0) {
      return false;
    }

    const variantIndex = this.pickVariantIndex();
    const template = this.templates[variantIndex];
    const clip = this.createClip(template, this.sampleUrls[variantIndex]);

    if (!clip || typeof clip.play !== 'function') {
      return false;
    }

    clip.preload = 'auto';
    clip.volume = HARVEST_VOLUME;
    clip.playbackRate =
      HARVEST_PLAYBACK_RATE_MIN + this.random() * HARVEST_PLAYBACK_RATE_RANGE;
    clip.preservesPitch = false;
    clip.webkitPreservesPitch = false;

    try {
      clip.currentTime = 0;
    } catch {
      // A not-yet-ready media element can reject currentTime writes.
    }

    const cleanup = () => {
      clip.removeEventListener?.('ended', cleanup);
      clip.removeEventListener?.('error', cleanup);
      this.activeClips.delete(clip);
    };
    clip.addEventListener?.('ended', cleanup, { once: true });
    clip.addEventListener?.('error', cleanup, { once: true });
    this.activeClips.add(clip);

    try {
      const playResult = clip.play();
      playResult?.catch?.((error) => {
        cleanup();
        this.logger?.warn?.('Unable to play Garden harvest sound.', error);
      });
    } catch (error) {
      cleanup();
      this.logger?.warn?.('Unable to play Garden harvest sound.', error);
      return false;
    }

    return true;
  }

  destroy() {
    this.stopActiveClips();
    for (const template of this.templates) {
      template?.pause?.();
    }
    this.templates = [];
  }

  createTemplate(url) {
    try {
      const template = this.audioFactory?.(url) ?? null;
      if (!template) {
        return null;
      }
      template.preload = 'auto';
      template.load?.();
      return template;
    } catch (error) {
      this.logger?.warn?.('Unable to preload Garden harvest sound.', error);
      return null;
    }
  }

  createClip(template, url) {
    try {
      return template?.cloneNode?.(true) ?? this.audioFactory?.(url) ?? null;
    } catch (error) {
      this.logger?.warn?.('Unable to create Garden harvest sound.', error);
      return null;
    }
  }

  pickVariantIndex() {
    if (this.sampleUrls.length === 1) {
      this.lastVariantIndex = 0;
      return 0;
    }

    let nextIndex = Math.floor(this.random() * this.sampleUrls.length);
    nextIndex = Math.max(0, Math.min(this.sampleUrls.length - 1, nextIndex));
    if (nextIndex === this.lastVariantIndex) {
      nextIndex =
        (nextIndex +
          1 +
          Math.floor(this.random() * (this.sampleUrls.length - 1))) %
        this.sampleUrls.length;
    }
    this.lastVariantIndex = nextIndex;
    return nextIndex;
  }

  stopActiveClips() {
    for (const clip of this.activeClips) {
      clip.pause?.();
      try {
        clip.currentTime = 0;
      } catch {
        // A not-yet-ready media element can reject currentTime writes.
      }
    }
    this.activeClips.clear();
  }
}
