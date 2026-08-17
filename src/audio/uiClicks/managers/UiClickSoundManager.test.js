// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiClickSoundManager } from './UiClickSoundManager.js';

function makeFakeAudioContextConstructor({
  initialState = 'running',
  deferResume = false,
} = {}) {
  const stats = {
    bufferLength: 0,
    closeCount: 0,
    contextCreateCount: 0,
    decodeCount: 0,
    lastOscillatorType: '',
    lastSourcePlaybackRate: 0,
    sourceGains: [],
    sourcePlaybackRates: [],
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
        connect: vi.fn((target) => {
          source.connectedGain = target;
        }),
        disconnect: vi.fn(),
        onended: null,
        playbackRate: makeAudioParam(1),
        start: vi.fn(() => {
          stats.lastSourcePlaybackRate = source.playbackRate.value;
          stats.sourcePlaybackRates.push(source.playbackRate.value);
          stats.sourceGains.push(source.connectedGain?.gain?.value ?? 0);
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
      if (deferResume) {
        return Promise.resolve().then(() => {
          this.state = 'running';
        });
      }
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

  it('plays the Idle Outpost button release bank at the shared click gain', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const fetch = makeFakeFetch();
    const manager = new UiClickSoundManager({
      clickSampleUrls: [
        '/button-touch-up-1.wav',
        '/button-touch-up-2.wav',
        '/button-touch-up-3.wav',
      ],
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
      random: () => 0.5,
      windowRef: {
        AudioContext: AudioContextConstructor,
        fetch,
      },
    });

    await flushPromises();
    manager.playClick();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/button-touch-up-1.wav');
    expect(fetch).toHaveBeenCalledWith('/button-touch-up-2.wav');
    expect(fetch).toHaveBeenCalledWith('/button-touch-up-3.wav');
    expect(stats.decodeCount).toBe(3);
    expect(stats.sourceStartCount).toBe(1);
    expect(stats.oscillatorStartCount).toBe(0);
    expect(stats.lastSourcePlaybackRate).toBe(1);
    expect(stats.sourceGains).toEqual([0.56]);
  });

  it('plays non-repeating purchase variants with the Root Run sell mix', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const fetch = makeFakeFetch();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: ['/sell-1.wav', '/sell-2.wav'],
      random: () => 0,
      windowRef: {
        AudioContext: AudioContextConstructor,
        fetch,
      },
    });

    await flushPromises();
    manager.playPurchase();
    manager.playPurchase();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith('/sell-1.wav');
    expect(fetch).toHaveBeenCalledWith('/sell-2.wav');
    expect(stats.sourcePlaybackRates).toEqual([1.08, 1.08]);
    expect(stats.sourceGains).toEqual([0.37, 0.37]);
  });

  it('plays the Root Run dialog fly bank with its randomized pitch and mix', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      dialogOpenSampleUrls: ['/ui-fly-1.wav'],
      purchaseSampleUrls: [],
      random: () => 0.5,
      windowRef: {
        AudioContext: AudioContextConstructor,
        fetch: makeFakeFetch(),
      },
    });

    await flushPromises();
    manager.playDialogOpen();
    await flushPromises();

    expect(stats.sourcePlaybackRates).toEqual([1.05]);
    expect(stats.sourceGains[0]).toBeCloseTo(0.4464);
  });

  it('unlocks a suspended context before playing the first click', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor({
      initialState: 'suspended',
    });
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
      windowRef: {
        AudioContext: AudioContextConstructor,
      },
    });

    manager.unlock();
    expect(stats.oscillatorStartCount).toBe(0);

    await flushPromises();

    expect(stats.resumeCount).toBe(1);
    expect(manager.playClick()).toBe(true);
    expect(stats.oscillatorStartCount).toBe(1);
  });

  it('drops pre-unlock cues instead of replaying them after the first gesture', async () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor({
      initialState: 'suspended',
      deferResume: true,
    });
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      dialogOpenSampleUrls: ['/ui-fly.wav'],
      purchaseSampleUrls: [],
      windowRef: {
        AudioContext: AudioContextConstructor,
        fetch: makeFakeFetch(),
      },
    });

    await flushPromises();

    expect(manager.playDialogOpen()).toBe(false);
    expect(manager.playDialogOpen()).toBe(false);
    expect(manager.playDialogOpen()).toBe(false);
    expect(stats.resumeCount).toBe(0);

    manager.unlock();
    await flushPromises();

    expect(stats.resumeCount).toBe(1);
    expect(stats.sourceStartCount).toBe(0);
    expect(stats.oscillatorStartCount).toBe(0);

    expect(manager.playClick()).toBe(true);
    expect(stats.oscillatorStartCount).toBe(1);
  });

  it('does not create audio work while disabled', () => {
    const { AudioContextConstructor, stats } = makeFakeAudioContextConstructor();
    const manager = new UiClickSoundManager({
      clickSampleUrl: null,
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
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
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
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
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
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
      dialogOpenSampleUrls: [],
      purchaseSampleUrls: [],
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
