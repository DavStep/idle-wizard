// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppInteractionLockManager } from './AppInteractionLockManager.js';

describe('AppInteractionLockManager', () => {
  it('blocks stage control events while locked', () => {
    const stage = document.createElement('section');
    const button = document.createElement('button');
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    stage.append(button);
    document.body.append(stage);
    const manager = new AppInteractionLockManager();

    manager.mount(stage);
    manager.lock('account_in_use');
    const event = new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    const dispatched = button.dispatchEvent(event);

    expect(dispatched).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('allows app gate controls while locked', () => {
    const stage = document.createElement('section');
    const gate = document.createElement('section');
    const button = document.createElement('button');
    const onClick = vi.fn();
    gate.className = 'app-fresh-start-choice';
    button.addEventListener('click', onClick);
    gate.append(button);
    stage.append(gate);
    document.body.append(stage);
    const manager = new AppInteractionLockManager();

    manager.mount(stage);
    manager.lock('connecting');
    const event = new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    const dispatched = button.dispatchEvent(event);

    expect(dispatched).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('allows stage events after unlock and unmount', () => {
    const stage = document.createElement('section');
    const button = document.createElement('button');
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    stage.append(button);
    document.body.append(stage);
    const manager = new AppInteractionLockManager();

    manager.mount(stage);
    manager.lock('connecting');
    manager.unlock();
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    manager.lock('connecting');
    manager.unmount();
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
