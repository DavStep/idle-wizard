// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { FpsDisplayManager } from './FpsDisplayManager.js';

describe('FpsDisplayManager', () => {
  it('mounts a passive fps label next to the game stage', () => {
    const shell = document.createElement('main');
    const stage = document.createElement('section');
    shell.append(stage);

    const manager = new FpsDisplayManager();
    const label = manager.mount(stage);

    expect(shell.querySelector('.app-fps-display')).toBe(label);
    expect(label.getAttribute('aria-hidden')).toBe('true');
    expect(label.textContent).toBe('0 fps');
  });

  it('updates fps from frame timing on the sample interval', () => {
    const shell = document.createElement('main');
    const stage = document.createElement('section');
    shell.append(stage);

    const manager = new FpsDisplayManager({ sampleIntervalMs: 500 });
    const label = manager.mount(stage);

    manager.update({ time: 1_000 });
    manager.update({ time: 1_250 });
    expect(label.textContent).toBe('0 fps');

    manager.update({ time: 1_500 });
    expect(label.textContent).toBe('4 fps');
  });

  it('removes the label on unmount', () => {
    const shell = document.createElement('main');
    const stage = document.createElement('section');
    shell.append(stage);

    const manager = new FpsDisplayManager();
    manager.mount(stage);
    manager.unmount();

    expect(shell.querySelector('.app-fps-display')).toBeNull();
  });
});
