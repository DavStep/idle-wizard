// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiClickSoundManager } from './UiClickSoundManager.js';

function makeFakeAudioContextConstructor({ initialState = 'running' } = {}) {
  const stats = {
    bufferLength: 0,
    closeCount: 0,
    contextCreateCount: 0,
    resumeCount: 0,
    sourceStartCount: 0,
  };

  class FakeAudioContext {
    constructor() {
      stats.contextCreateCount += 1;
      this.currentTime = 0;
      this.destination = {};
      this.sampleRate = 1000;
      this.state = initialState;
    }

    createGain() {
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: {
          value: 0,
        },
      };
    }

    createBuffer(channelCount, length, sampleRate) {
      stats.bufferLength = length;
      return {
        channelCount,
        duration: length / sampleRate,
        getChannelData: vi.fn(() => new Float32Array(length)),
        length,
        sampleRate,
      };
    }

    createBufferSource() {
      const source = {
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
        start: vi.fn(() => {
          stats.sourceStartCount += 1;
          source.onended?.();
        }),
      };
      return source;
    }

    resume() {
      stats.resumeCount += 1;
      this.state = 'running';
      return Promise.resolve();
    }

    close() {
      stats.closeCount += 1;
      this.state = 'closed';
      return Promise.resolve();
    }
  }

  return {
    AudioContextConstructor: FakeAudioContext,
    stats,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

describe('UiClickSoundManager', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('plays a short generated click through Web Audio', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();

    expect(stats.bufferLength).toBe(45);
    expect(stats.sourceStartCount).toBe(1);
  });

  it('resumes a suspended context before playing the first click', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor({
      initialState: 'suspended',
    });
    const manager = new UiClickSoundManager({
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();
    expect(stats.sourceStartCount).toBe(0);

    await flushPromises();

    expect(stats.resumeCount).toBe(1);
    expect(stats.sourceStartCount).toBe(1);
  });

  it('does not create audio work while disabled', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.setEnabled(false);
    manager.playClick();

    expect(stats.sourceStartCount).toBe(0);
  });

  it('does not unlock audio while disabled', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.setEnabled(false);
    manager.unlock();

    expect(stats.contextCreateCount).toBe(0);
  });

  it('throttles dense repeated clicks', () => {
    let now = 1000;
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      now: () => now,
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();
    now += 10;
    manager.playClick();
    now += 24;
    manager.playClick();

    expect(stats.sourceStartCount).toBe(2);
  });

  it('closes the audio context on destroy', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();
    manager.destroy();
    await flushPromises();

    expect(stats.closeCount).toBe(1);
  });
});
