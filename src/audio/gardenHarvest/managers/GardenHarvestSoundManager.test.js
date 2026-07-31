// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { GardenHarvestSoundManager } from './GardenHarvestSoundManager.js';

function createAudioHarness() {
  const templates = [];
  const clips = [];

  const createClip = (url) => {
    const listeners = new Map();
    const clip = {
      url,
      currentTime: 5,
      playbackRate: 1,
      preservesPitch: true,
      preload: '',
      volume: 1,
      addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
      pause: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      removeEventListener: vi.fn((type) => listeners.delete(type)),
      webkitPreservesPitch: true,
      finish(type = 'ended') {
        listeners.get(type)?.();
      },
    };
    clips.push(clip);
    return clip;
  };

  const audioFactory = vi.fn((url) => {
    const template = {
      url,
      load: vi.fn(),
      pause: vi.fn(),
      preload: '',
      cloneNode: vi.fn(() => createClip(url)),
    };
    templates.push(template);
    return template;
  });

  return { audioFactory, clips, templates };
}

describe('GardenHarvestSoundManager', () => {
  it('preloads every Root Run wheat-cut variant and plays one at the matching gain', () => {
    const { audioFactory, clips, templates } = createAudioHarness();
    const manager = new GardenHarvestSoundManager({
      audioFactory,
      random: () => 0.5,
      sampleUrls: ['cut-1.wav', 'cut-2.wav', 'cut-3.wav', 'cut-4.wav', 'cut-5.wav'],
    });

    expect(audioFactory).toHaveBeenCalledTimes(5);
    expect(templates.every((template) => template.preload === 'auto')).toBe(true);
    expect(templates.every((template) => template.load.mock.calls.length === 1)).toBe(true);

    expect(manager.playHarvest()).toBe(true);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({
      currentTime: 0,
      playbackRate: 1.05,
      preservesPitch: false,
      volume: 0.6336,
      webkitPreservesPitch: false,
    });
    expect(clips[0].play).toHaveBeenCalledTimes(1);
  });

  it('avoids an immediate repeat and stops active harvest audio when muted', () => {
    const { audioFactory, clips, templates } = createAudioHarness();
    const randomValues = [0, 0.5, 0, 0, 0.5];
    const manager = new GardenHarvestSoundManager({
      audioFactory,
      random: () => randomValues.shift() ?? 0,
      sampleUrls: ['cut-1.wav', 'cut-2.wav', 'cut-3.wav'],
    });

    manager.playHarvest();
    manager.playHarvest();

    expect(templates[0].cloneNode).toHaveBeenCalledTimes(1);
    expect(templates[1].cloneNode).toHaveBeenCalledTimes(1);

    manager.setEnabled(false);

    expect(clips.every((clip) => clip.pause.mock.calls.length === 1)).toBe(true);
    expect(manager.playHarvest()).toBe(false);
  });
});
