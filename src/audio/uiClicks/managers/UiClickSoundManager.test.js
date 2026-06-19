// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiClickSoundManager } from './UiClickSoundManager.js';

function makeFakeAudioContextConstructor({ initialState = 'running' } = {}) {
  const stats = {
    bufferLength: 0,
    closeCount: 0,
    contextCreateCount: 0,
    decodeCount: 0,
    lastOscillatorType: '',
    lastSourcePlaybackRate: 0,
    resumeCount: 0,
    oscillatorStartCount: 0,
    sourceStartCount: 0,
  };

  function makeAudioParam(initialValue = 0) {
    const param = {
      value: initialValue,
      exponentialRampToValueAtTime: vi.fn((value) => {
        param.value = value;
      }),
      setValueAtTime: vi.fn((value) => {
        param.value = value;
      }),
    };
    return param;
  }

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
        gain: makeAudioParam(0),
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
        playbackRate: makeAudioParam(1),
        start: vi.fn(() => {
          stats.lastSourcePlaybackRate = source.playbackRate.value;
          stats.sourceStartCount += 1;
          source.onended?.();
        }),
        stop: vi.fn(),
      };
      return source;
    }

    createOscillator() {
      const oscillator = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequency: makeAudioParam(0),
        onended: null,
        start: vi.fn(() => {
          stats.lastOscillatorType = oscillator.type;
          stats.oscillatorStartCount += 1;
          oscillator.onended?.();
        }),
        stop: vi.fn(),
        type: 'sine',
      };
      return oscillator;
    }

    decodeAudioData(data) {
      stats.decodeCount += 1;
      return Promise.resolve({
        duration: data.byteLength / 1000,
      });
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

function makeFakeFetch(data = new ArrayBuffer(64)) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(data),
    }),
  );
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

  it('plays the Witch Craft pop sample with a short tone', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const fetch = makeFakeFetch();
    const manager = new UiClickSoundManager({
      clickSampleUrl: '/ui-click-pop.wav',
      random: () => 0.5,
      windowRef: {
        AudioContext: AudioContextConstructor,
        fetch,
      },
    });

    await flushPromises();
    manager.playClick();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/ui-click-pop.wav');
    expect(stats.decodeCount).toBe(1);
    expect(stats.sourceStartCount).toBe(1);
    expect(stats.oscillatorStartCount).toBe(1);
    expect(stats.lastOscillatorType).toBe('triangle');
    expect(stats.lastSourcePlaybackRate).toBeCloseTo(1.36);
  });

  it('resumes a suspended context before playing the first click', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor({
      initialState: 'suspended',
    });
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();
    expect(stats.oscillatorStartCount).toBe(0);

    await flushPromises();

    expect(stats.resumeCount).toBe(1);
    expect(stats.oscillatorStartCount).toBe(1);
  });

  it('does not create audio work while disabled', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.setEnabled(false);
    manager.playClick();

    expect(stats.oscillatorStartCount).toBe(0);
    expect(stats.sourceStartCount).toBe(0);
  });

  it('does not unlock audio while disabled', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
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
      clickSampleUrl: null,
      now: () => now,
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.playClick();
    now += 10;
    manager.playClick();
    now += 42;
    manager.playClick();

    expect(stats.oscillatorStartCount).toBe(2);
  });

  it('closes the audio context on destroy', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
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
