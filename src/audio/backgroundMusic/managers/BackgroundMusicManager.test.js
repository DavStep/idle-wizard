import { describe, expect, it, vi } from 'vitest';

import { BackgroundMusicManager } from './BackgroundMusicManager.js';

describe('BackgroundMusicManager', () => {
  it('plays the track at the source mix and follows the music preference', async () => {
    const audio = createAudio();
    const documentRef = createDocument();
    const manager = new BackgroundMusicManager({
      musicUrl: 'music.mp3',
      audioFactory: vi.fn(() => audio),
      documentRef,
    });

    expect(manager.start()).toBe(true);
    await Promise.resolve();

    expect(audio.src).toBeUndefined();
    expect(audio.loop).toBe(false);
    expect(audio.preload).toBe('none');
    expect(audio.volume).toBe(0.16);
    expect(audio.play).toHaveBeenCalledTimes(1);

    manager.setEnabled(false);
    expect(audio.pause).toHaveBeenCalledTimes(1);

    manager.setEnabled(true);
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(2);

    manager.destroy();
    expect(audio.pause).toHaveBeenCalledTimes(2);
  });

  it('retries blocked playback from a user gesture', async () => {
    const audio = createAudio();
    audio.play
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce(undefined);
    const documentRef = createDocument();
    const manager = new BackgroundMusicManager({
      musicUrl: 'music.mp3',
      audioFactory: () => audio,
      documentRef,
    });

    manager.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(documentRef.listenerCount('pointerdown')).toBe(1);

    documentRef.dispatch('pointerdown');
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(documentRef.listenerCount('pointerdown')).toBe(0);

    manager.destroy();
  });

  it('pauses while hidden and resumes when the app becomes visible', async () => {
    const audio = createAudio();
    const documentRef = createDocument();
    const manager = new BackgroundMusicManager({
      audioFactory: () => audio,
      documentRef,
    });

    manager.start();
    await Promise.resolve();
    documentRef.visibilityState = 'hidden';
    documentRef.dispatch('visibilitychange');
    expect(audio.pause).toHaveBeenCalledTimes(1);

    documentRef.visibilityState = 'visible';
    documentRef.dispatch('visibilitychange');
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it('waits briefly before replaying a finished track', async () => {
    vi.useFakeTimers();
    const audio = createAudio();
    const manager = new BackgroundMusicManager({
      audioFactory: () => audio,
      documentRef: createDocument(),
      random: () => 0.5,
    });

    manager.start();
    await Promise.resolve();
    audio.ended = true;
    audio.duration = 143;
    audio.currentTime = 143;
    audio.dispatch('ended');

    vi.advanceTimersByTime(1499);
    expect(audio.play).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);

    manager.destroy();
    vi.useRealTimers();
  });

  it('uses browser timers without changing their required receiver', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const setTimeoutSpy = vi.fn(function setBrowserTimeout() {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }
      return 41;
    });
    const clearTimeoutSpy = vi.fn(function clearBrowserTimeout() {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }
    });
    globalThis.setTimeout = setTimeoutSpy;
    globalThis.clearTimeout = clearTimeoutSpy;

    try {
      const audio = createAudio();
      const manager = new BackgroundMusicManager({
        audioFactory: () => audio,
        documentRef: createDocument(),
      });

      manager.start();
      await Promise.resolve();
      audio.dispatch('ended');
      manager.setEnabled(false);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(41);

      manager.destroy();
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });
});

function createAudio() {
  const listeners = new Map();
  return {
    currentTime: 0,
    duration: Number.NaN,
    ended: false,
    loop: true,
    preload: '',
    volume: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

function createDocument() {
  const listeners = new Map();
  return {
    visibilityState: 'visible',
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) ?? new Set();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) ?? []) {
        listener();
      }
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}
