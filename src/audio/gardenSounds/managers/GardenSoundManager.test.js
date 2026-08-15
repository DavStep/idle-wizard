// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { GardenSoundManager } from './GardenSoundManager.js';

function createAudioHarness() {
  const templates = [];
  const clips = [];

  const createClip = (url) => {
    const listeners = new Map();
    const clip = {
      url,
      currentTime: 5,
      playbackRate: 0,
      preload: '',
      volume: 0,
      addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
      pause: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      removeEventListener: vi.fn((type) => listeners.delete(type)),
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

describe('GardenSoundManager', () => {
  it('preloads both action banks and plays their authored samples', () => {
    const { audioFactory, clips, templates } = createAudioHarness();
    const manager = new GardenSoundManager({
      audioFactory,
      random: () => 0,
      plantSampleUrls: ['plant-1.wav', 'plant-2.wav'],
      harvestSampleUrls: ['harvest-1.wav', 'harvest-2.wav'],
    });

    expect(audioFactory).toHaveBeenCalledTimes(4);
    expect(templates.every((template) => template.preload === 'auto')).toBe(true);
    expect(templates.every((template) => template.load.mock.calls.length === 1)).toBe(true);

    expect(manager.playPlant()).toBe(true);
    expect(manager.playHarvest()).toBe(true);
    expect(clips.map((clip) => clip.url)).toEqual([
      'plant-1.wav',
      'harvest-1.wav',
    ]);
    expect(clips.every((clip) => clip.currentTime === 0)).toBe(true);
    expect(clips.every((clip) => clip.playbackRate === 1)).toBe(true);
    expect(clips.every((clip) => clip.volume === 1)).toBe(true);
  });

  it('avoids immediate repeats per cue and stops active audio when muted', () => {
    const { audioFactory, clips, templates } = createAudioHarness();
    const manager = new GardenSoundManager({
      audioFactory,
      random: () => 0,
      plantSampleUrls: ['plant-1.wav', 'plant-2.wav'],
      harvestSampleUrls: ['harvest-1.wav', 'harvest-2.wav'],
    });

    manager.playPlant();
    manager.playPlant();
    manager.playHarvest();
    manager.playHarvest();

    expect(templates[0].cloneNode).toHaveBeenCalledTimes(1);
    expect(templates[1].cloneNode).toHaveBeenCalledTimes(1);
    expect(templates[2].cloneNode).toHaveBeenCalledTimes(1);
    expect(templates[3].cloneNode).toHaveBeenCalledTimes(1);

    manager.setEnabled(false);

    expect(clips.every((clip) => clip.pause.mock.calls.length === 1)).toBe(true);
    expect(manager.playPlant()).toBe(false);
    expect(manager.playHarvest()).toBe(false);
  });
});
