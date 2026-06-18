// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkshopRequirementConnectionManager } from './WorkshopRequirementConnectionManager.js';

describe('WorkshopRequirementConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('pulses the matching requirement row without drawing a connector line', () => {
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    const layer = document.createElement('div');
    const source = document.createElement('button');
    const target = document.createElement('div');

    layer.append(source, target);
    stage.append(layer);
    document.body.append(stage);

    const manager = new WorkshopRequirementConnectionManager();
    manager.mount(layer);

    expect(manager.show({ source, target })).toBe(true);
    expect(stage.querySelector('.workshop-page__requirement-link')).toBeNull();
    expect(target.classList.contains('is-requirement-updated')).toBe(true);

    vi.advanceTimersByTime(321);
    expect(stage.querySelector('.workshop-page__requirement-link')).toBeNull();

    vi.advanceTimersByTime(40);
    expect(target.classList.contains('is-requirement-updated')).toBe(false);
  });
});
