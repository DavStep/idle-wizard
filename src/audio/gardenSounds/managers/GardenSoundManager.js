const DEFAULT_PLANT_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/garden-actions/plant-1.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/plant-2.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/plant-3.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/plant-4.wav',
    import.meta.url,
  ).href,
]);

const DEFAULT_HARVEST_SAMPLE_URLS = Object.freeze([
  new URL(
    '../../../../assets/game/source/audio/garden-actions/harvest-1.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/harvest-2.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/harvest-3.wav',
    import.meta.url,
  ).href,
  new URL(
    '../../../../assets/game/source/audio/garden-actions/harvest-4.wav',
    import.meta.url,
  ).href,
]);

const GARDEN_ACTION_VOLUME = 1;

function defaultAudioFactory(url) {
  const AudioConstructor = globalThis.Audio;
  return typeof AudioConstructor === 'function' ? new AudioConstructor(url) : null;
}

export class GardenSoundManager {
  constructor({
    plantSampleUrls = DEFAULT_PLANT_SAMPLE_URLS,
    harvestSampleUrls = DEFAULT_HARVEST_SAMPLE_URLS,
    audioFactory = defaultAudioFactory,
    random = Math.random,
    logger = null,
  } = {}) {
    this.audioFactory = audioFactory;
    this.random = random;
    this.logger = logger;
    this.enabled = true;
    this.volume = 1;
    this.appActive = true;
    this.activeClips = new Set();
    this.cues = new Map([
      ['plant', this.createCue(plantSampleUrls)],
      ['harvest', this.createCue(harvestSampleUrls)],
    ]);
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    if (!this.enabled) {
      this.stopActiveClips();
    }
  }

  setVolume(volume) {
    this.volume = normalizeVolume(volume);
    this.enabled = this.volume > 0;
    for (const clip of this.activeClips) {
      clip.volume = GARDEN_ACTION_VOLUME * this.volume;
    }
    if (!this.enabled) {
      this.stopActiveClips();
    }
  }

  setAppActive(active) {
    this.appActive = active !== false;
    if (!this.appActive) {
      this.stopActiveClips();
    }
  }

  playPlant() {
    return this.playCue('plant');
  }

  playHarvest() {
    return this.playCue('harvest');
  }

  playCue(cueId) {
    const cue = this.cues.get(cueId);
    if (!this.enabled || !this.appActive || !cue || cue.urls.length === 0) {
      return false;
    }

    const variantIndex = this.pickVariantIndex(cue);
    const clip = this.createClip(
      cue.templates[variantIndex],
      cue.urls[variantIndex],
      cueId,
    );
    if (!clip || typeof clip.play !== 'function') {
      return false;
    }

    clip.preload = 'auto';
    clip.volume = GARDEN_ACTION_VOLUME * this.volume;
    clip.playbackRate = 1;

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
        this.logger?.warn?.(`Unable to play Garden ${cueId} sound.`, error);
      });
    } catch (error) {
      cleanup();
      this.logger?.warn?.(`Unable to play Garden ${cueId} sound.`, error);
      return false;
    }

    return true;
  }

  destroy() {
    this.stopActiveClips();
    for (const cue of this.cues.values()) {
      for (const template of cue.templates) {
        template?.pause?.();
      }
      cue.templates = [];
    }
    this.cues.clear();
  }

  createCue(sampleUrls) {
    const urls = [...sampleUrls];
    return {
      urls,
      lastVariantIndex: -1,
      templates: urls.map((url) => this.createTemplate(url)),
    };
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
      this.logger?.warn?.('Unable to preload Garden action sound.', error);
      return null;
    }
  }

  createClip(template, url, cueId) {
    try {
      return template?.cloneNode?.(true) ?? this.audioFactory?.(url) ?? null;
    } catch (error) {
      this.logger?.warn?.(`Unable to create Garden ${cueId} sound.`, error);
      return null;
    }
  }

  pickVariantIndex(cue) {
    if (cue.urls.length === 1) {
      cue.lastVariantIndex = 0;
      return 0;
    }

    let nextIndex = Math.floor(this.random() * cue.urls.length);
    nextIndex = Math.max(0, Math.min(cue.urls.length - 1, nextIndex));
    if (nextIndex === cue.lastVariantIndex) {
      nextIndex = (nextIndex + 1) % cue.urls.length;
    }
    cue.lastVariantIndex = nextIndex;
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

function normalizeVolume(volume) {
  const numeric = Number(volume);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.min(1, numeric))
    : 0;
}
