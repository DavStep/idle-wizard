const DEFAULT_BACKGROUND_MUSIC_URL = new URL(
  '../../../../assets/game/source/audio/music/chill-potion-shop-of-gilded-spires.mp3',
  import.meta.url,
).href;

const USER_GESTURE_EVENTS = Object.freeze([
  'pointerdown',
  'keydown',
  'touchstart',
]);
const BACKGROUND_MUSIC_VOLUME = 0.16;
const MIN_RESTART_DELAY_MS = 1000;
const MAX_RESTART_DELAY_MS = 2000;

function defaultAudioFactory(url) {
  const AudioConstructor = globalThis.Audio;
  return typeof AudioConstructor === 'function' ? new AudioConstructor(url) : null;
}

export class BackgroundMusicManager {
  constructor({
    musicUrl = DEFAULT_BACKGROUND_MUSIC_URL,
    audioFactory = defaultAudioFactory,
    documentRef = globalThis.document ?? null,
    setTimeoutFn = globalThis.setTimeout,
    clearTimeoutFn = globalThis.clearTimeout,
    random = Math.random,
    logger = null,
  } = {}) {
    this.musicUrl = musicUrl;
    this.audioFactory = audioFactory;
    this.documentRef = documentRef;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.random = random;
    this.logger = logger;
    this.audio = null;
    this.enabled = true;
    this.started = false;
    this.disposed = false;
    this.gestureListenersInstalled = false;
    this.restartTimer = null;
    this.playAttempt = 0;

    this.handleEnded = () => this.scheduleRestart();
    this.handleGesture = () => this.tryPlay();
    this.handleVisibilityChange = () => this.syncPlayback();
  }

  start() {
    if (this.started || this.disposed) {
      return false;
    }

    this.started = true;
    this.documentRef?.addEventListener?.(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.syncPlayback();
    return true;
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    if (this.started) {
      this.syncPlayback();
    }
  }

  syncPlayback() {
    if (!this.enabled || this.isDocumentHidden()) {
      this.pause();
      this.removeGestureListeners();
      return;
    }

    this.tryPlay();
  }

  tryPlay() {
    if (
      !this.started ||
      this.disposed ||
      !this.enabled ||
      this.isDocumentHidden()
    ) {
      return false;
    }

    const audio = this.ensureAudio();
    if (!audio || typeof audio.play !== 'function') {
      return false;
    }

    this.clearRestartTimer();
    this.rewindIfFinished(audio);
    const attempt = ++this.playAttempt;

    try {
      const playResult = audio.play();
      Promise.resolve(playResult).then(
        () => {
          if (attempt === this.playAttempt && this.enabled && !this.disposed) {
            this.removeGestureListeners();
          }
        },
        (error) => {
          if (attempt === this.playAttempt && this.enabled && !this.disposed) {
            this.installGestureListeners();
          }
          this.logger?.warn?.('Unable to start background music.', error);
        },
      );
    } catch (error) {
      this.installGestureListeners();
      this.logger?.warn?.('Unable to start background music.', error);
      return false;
    }

    return true;
  }

  ensureAudio() {
    if (this.audio) {
      return this.audio;
    }

    try {
      this.audio = this.audioFactory?.(this.musicUrl) ?? null;
      if (!this.audio) {
        return null;
      }
      this.audio.loop = false;
      this.audio.preload = 'none';
      this.audio.volume = BACKGROUND_MUSIC_VOLUME;
      this.audio.addEventListener?.('ended', this.handleEnded);
      return this.audio;
    } catch (error) {
      this.logger?.warn?.('Unable to initialize background music.', error);
      return null;
    }
  }

  rewindIfFinished(audio) {
    if (
      !audio.ended &&
      (!Number.isFinite(audio.duration) || audio.currentTime < audio.duration - 0.05)
    ) {
      return;
    }

    try {
      audio.currentTime = 0;
    } catch {
      // A not-yet-ready media element can reject currentTime writes.
    }
  }

  scheduleRestart() {
    if (!this.enabled || this.disposed || this.isDocumentHidden()) {
      return;
    }

    this.clearRestartTimer();
    const delay =
      MIN_RESTART_DELAY_MS +
      this.random() * (MAX_RESTART_DELAY_MS - MIN_RESTART_DELAY_MS);
    this.restartTimer = this.setTimeoutFn?.(() => {
      this.restartTimer = null;
      this.tryPlay();
    }, delay);
  }

  pause() {
    this.playAttempt += 1;
    this.clearRestartTimer();
    this.audio?.pause?.();
  }

  installGestureListeners() {
    if (this.gestureListenersInstalled || !this.documentRef) {
      return;
    }

    this.gestureListenersInstalled = true;
    for (const eventName of USER_GESTURE_EVENTS) {
      this.documentRef.addEventListener?.(eventName, this.handleGesture, {
        capture: true,
        passive: true,
      });
    }
  }

  removeGestureListeners() {
    if (!this.gestureListenersInstalled || !this.documentRef) {
      return;
    }

    this.gestureListenersInstalled = false;
    for (const eventName of USER_GESTURE_EVENTS) {
      this.documentRef.removeEventListener?.(eventName, this.handleGesture, {
        capture: true,
      });
    }
  }

  clearRestartTimer() {
    if (this.restartTimer === null) {
      return;
    }

    this.clearTimeoutFn?.(this.restartTimer);
    this.restartTimer = null;
  }

  isDocumentHidden() {
    return this.documentRef?.visibilityState === 'hidden';
  }

  destroy() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.started = false;
    this.pause();
    this.removeGestureListeners();
    this.documentRef?.removeEventListener?.(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.audio?.removeEventListener?.('ended', this.handleEnded);
    this.audio = null;
  }
}
