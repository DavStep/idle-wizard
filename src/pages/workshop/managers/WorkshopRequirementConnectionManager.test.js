// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkshopRequirementConnectionManager } from './WorkshopRequirementConnectionManager.js';

function setRect(element, rect) {
  const fullRect = {
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON() {
      return this;
    },
    ...rect,
  };

  element.getBoundingClientRect = () => fullRect;
}

function stubReducedMotion(matches = false) {
  window.matchMedia = vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('WorkshopRequirementConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('draws one plain link from source to requirement row and pulses the row', () => {
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    setRect(stage, { left: 10, top: 20, width: 320, height: 640 });

    const layer = document.createElement('div');
    const source = document.createElement('button');
    const target = document.createElement('div');
    setRect(source, { left: 160, top: 420, width: 80, height: 40 });
    setRect(target, { left: 40, top: 120, width: 260, height: 28 });

    layer.append(source, target);
    stage.append(layer);
    document.body.append(stage);

    const manager = new WorkshopRequirementConnectionManager();
    manager.mount(layer);

    expect(manager.show({ source, target })).toBe(true);

    const link = stage.querySelector('.workshop-page__requirement-link');
    expect(link).not.toBeNull();
    expect(link?.style.left).toBe('190px');
    expect(link?.style.top).toBe('416.8px');
    expect(link?.style.getPropertyValue('--requirement-link-angle')).toContain('rad');
    expect(target.classList.contains('is-requirement-updated')).toBe(true);

    vi.advanceTimersByTime(321);
    expect(stage.querySelector('.workshop-page__requirement-link')).toBeNull();

    vi.advanceTimersByTime(40);
    expect(target.classList.contains('is-requirement-updated')).toBe(false);
  });

  it('keeps reduced-motion feedback to the row only', () => {
    stubReducedMotion(true);
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    const layer = document.createElement('div');
    const source = document.createElement('button');
    const target = document.createElement('div');
    setRect(stage, { left: 0, top: 0, width: 320, height: 640 });
    setRect(source, { left: 160, top: 420, width: 80, height: 40 });
    setRect(target, { left: 40, top: 120, width: 260, height: 28 });
    layer.append(source, target);
    stage.append(layer);
    document.body.append(stage);

    const manager = new WorkshopRequirementConnectionManager();
    manager.mount(layer);

    expect(manager.show({ source, target })).toBe(true);
    expect(stage.querySelector('.workshop-page__requirement-link')).toBeNull();
    expect(target.classList.contains('is-requirement-updated')).toBe(true);
  });
});
