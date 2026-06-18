// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PressFeedbackManager } from './PressFeedbackManager.js';

let originalElementFromPoint;

function dispatchPointer(target, type, { pointerId = 1, pointerType = 'touch', ...options } = {}) {
  const event = new window.MouseEvent(type, {
      bubbles: true,
      button: 0,
      ...options,
    });

  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  Object.defineProperty(event, 'isPrimary', { value: true });
  target.dispatchEvent(event);
  return event;
}

describe('PressFeedbackManager', () => {
  beforeEach(() => {
    originalElementFromPoint = document.elementFromPoint;
  });

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
    document.body.replaceChildren();
  });

  it('adds press feedback to the closest interactive control until pointer release', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const label = document.createElement('span');
    label.textContent = 'sell';
    button.className = 'style-button';
    button.append(label);
    root.append(button);
    document.body.append(root);

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(label, 'pointerdown');

    expect(button.classList.contains('is-pressing')).toBe(true);

    dispatchPointer(document, 'pointerup');

    expect(button.classList.contains('is-pressing')).toBe(false);

    manager.unmount();
  });

  it('activates the pressed touch target on pointer release and suppresses the duplicate native click', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const clicks = [];
    button.className = 'style-button';
    button.addEventListener('click', (event) => {
      clicks.push(event.isTrusted ? 'native' : 'synthetic');
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');
    dispatchPointer(document, 'pointerup');
    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(clicks).toEqual(['synthetic']);

    manager.unmount();
  });

  it('does not activate when the pointer moves like a drag', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    let clicks = 0;
    button.className = 'style-button';
    button.addEventListener('click', () => {
      clicks += 1;
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(button, 'pointerdown', { clientX: 10, clientY: 10 });
    dispatchPointer(document, 'pointermove', { clientX: 40, clientY: 10 });
    dispatchPointer(document, 'pointerup', { clientX: 40, clientY: 10 });

    expect(button.classList.contains('is-pressing')).toBe(false);
    expect(clicks).toBe(0);

    manager.unmount();
  });

  it('moves press feedback when a second control is pressed', () => {
    const root = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.className = 'style-button';
    second.className = 'style-button';
    root.append(first, second);
    document.body.append(root);

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(first, 'pointerdown');
    dispatchPointer(second, 'pointerdown');

    expect(first.classList.contains('is-pressing')).toBe(false);
    expect(second.classList.contains('is-pressing')).toBe(true);

    manager.unmount();
  });

  it('ignores unavailable controls and secondary pointer buttons', () => {
    const root = document.createElement('div');
    const disabled = document.createElement('button');
    const selected = document.createElement('button');
    const rightClick = document.createElement('button');
    disabled.disabled = true;
    selected.className = 'style-button is-selected';
    rightClick.className = 'style-button';
    root.append(disabled, selected, rightClick);
    document.body.append(root);

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(disabled, 'pointerdown');
    dispatchPointer(selected, 'pointerdown');
    dispatchPointer(rightClick, 'pointerdown', { button: 2 });

    expect(disabled.classList.contains('is-pressing')).toBe(false);
    expect(selected.classList.contains('is-pressing')).toBe(false);
    expect(rightClick.classList.contains('is-pressing')).toBe(false);

    manager.unmount();
  });

  it('clears active feedback on unmount and stops listening', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    button.className = 'style-button';
    root.append(button);
    document.body.append(root);

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');
    manager.unmount();

    expect(button.classList.contains('is-pressing')).toBe(false);

    dispatchPointer(button, 'pointerdown');

    expect(button.classList.contains('is-pressing')).toBe(false);
  });
});
