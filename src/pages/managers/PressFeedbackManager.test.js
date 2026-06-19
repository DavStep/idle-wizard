// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HELD_RELEASE_FEEDBACK_MS,
  PressFeedbackManager,
} from './PressFeedbackManager.js';

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

  it('can delegate press feedback to a child node while keeping button activation on the control', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const circle = document.createElement('span');
    let clicks = 0;
    button.className = 'style-button';
    button.dataset.pressFeedbackTarget = '.press-circle';
    circle.className = 'press-circle';
    button.append(circle);
    button.addEventListener('click', () => {
      clicks += 1;
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(circle, 'pointerdown');

    expect(button.classList.contains('is-pressing')).toBe(false);
    expect(circle.classList.contains('is-pressing')).toBe(true);

    dispatchPointer(document, 'pointerup');

    expect(circle.classList.contains('is-pressing')).toBe(false);
    expect(clicks).toBe(1);

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

  it('activates marked non-button open controls on touch press start and suppresses release clicks', () => {
    const root = document.createElement('div');
    const button = document.createElement('div');
    const popup = document.createElement('section');
    const clicks = [];
    let backdropClicks = 0;
    let nowMs = 1000;
    button.className = 'style-button';
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.dataset.pressStartClick = 'true';
    button.addEventListener('click', (event) => {
      clicks.push(event.isTrusted ? 'native' : 'synthetic');
      popup.hidden = false;
    });
    popup.hidden = true;
    popup.addEventListener('click', () => {
      backdropClicks += 1;
    });
    root.append(button, popup);
    document.body.append(root);
    document.elementFromPoint = () => popup;

    const manager = new PressFeedbackManager({ now: () => nowMs });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown', { clientX: 80, clientY: 120 });

    expect(clicks).toEqual(['synthetic']);
    expect(popup.hidden).toBe(false);

    nowMs += HELD_RELEASE_FEEDBACK_MS + 200;
    dispatchPointer(document, 'pointerup', { clientX: 80, clientY: 120 });
    popup.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        clientX: 82,
        clientY: 119,
      }),
    );

    expect(clicks).toEqual(['synthetic']);
    expect(backdropClicks).toBe(0);

    manager.unmount();
  });

  it('activates marked native buttons on touch release', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const clicks = [];
    button.className = 'style-button';
    button.dataset.pressStartClick = 'true';
    button.addEventListener('click', (event) => {
      clicks.push(event.isTrusted ? 'native' : 'synthetic');
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');

    expect(clicks).toEqual([]);

    dispatchPointer(document, 'pointerup');
    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(clicks).toEqual(['synthetic']);

    manager.unmount();
  });

  it('plays click sound once for touch activation with a duplicate native click', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const clicks = [];
    const uiClickSoundFacade = {
      playClick: vi.fn(),
      unlock: vi.fn(),
    };
    button.className = 'style-button';
    button.addEventListener('click', (event) => {
      clicks.push(event.isTrusted ? 'native' : 'synthetic');
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager({ uiClickSoundFacade });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');
    dispatchPointer(document, 'pointerup');
    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(clicks).toEqual(['synthetic']);
    expect(uiClickSoundFacade.unlock).toHaveBeenCalledTimes(1);
    expect(uiClickSoundFacade.playClick).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('plays haptics on touch press and skips fast release feedback', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const hapticsFacade = {
      playUiTap: vi.fn(),
    };
    button.className = 'style-button';
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager({ hapticsFacade });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');
    expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

    dispatchPointer(document, 'pointerup');
    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('plays touch feedback again when a held press releases on the same control', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const clicks = [];
    const hapticsFacade = {
      playUiTap: vi.fn(),
    };
    const uiClickSoundFacade = {
      playClick: vi.fn(),
      unlock: vi.fn(),
    };
    let nowMs = 1000;
    button.className = 'style-button';
    button.addEventListener('click', (event) => {
      clicks.push(event.isTrusted ? 'native' : 'synthetic');
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager({
      hapticsFacade,
      uiClickSoundFacade,
      now: () => nowMs,
    });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown');
    expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);
    expect(uiClickSoundFacade.playClick).toHaveBeenCalledTimes(1);

    nowMs += HELD_RELEASE_FEEDBACK_MS;
    dispatchPointer(document, 'pointerup');
    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(clicks).toEqual(['synthetic']);
    expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(2);
    expect(uiClickSoundFacade.playClick).toHaveBeenCalledTimes(2);

    manager.unmount();
  });

  it('plays click sound for mouse clicks after the real click fires', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const uiClickSoundFacade = {
      playClick: vi.fn(),
      unlock: vi.fn(),
    };
    button.className = 'style-button';
    root.append(button);
    document.body.append(root);

    const manager = new PressFeedbackManager({ uiClickSoundFacade });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown', { pointerType: 'mouse' });
    expect(uiClickSoundFacade.playClick).not.toHaveBeenCalled();

    button.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(uiClickSoundFacade.unlock).toHaveBeenCalledTimes(1);
    expect(uiClickSoundFacade.playClick).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('suppresses duplicate native clicks that target a child inside the pressed control', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const label = document.createElement('span');
    const clicks = [];
    button.className = 'style-button';
    label.textContent = 'summon seed';
    button.append(label);
    button.addEventListener('click', (event) => {
      clicks.push(event.target === button ? 'synthetic' : 'native-child');
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(label, 'pointerdown');
    dispatchPointer(document, 'pointerup');
    label.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
      }),
    );

    expect(clicks).toEqual(['synthetic']);

    manager.unmount();
  });

  it('suppresses duplicate native clicks retargeted to a popup opened by the press', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const popup = document.createElement('section');
    let opens = 0;
    let backdropClicks = 0;
    button.className = 'style-button';
    button.addEventListener('click', () => {
      opens += 1;
      popup.hidden = false;
    });
    popup.hidden = true;
    popup.addEventListener('click', () => {
      backdropClicks += 1;
    });
    root.append(button, popup);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(button, 'pointerdown', { clientX: 80, clientY: 120 });
    dispatchPointer(document, 'pointerup', { clientX: 80, clientY: 120 });
    popup.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        clientX: 82,
        clientY: 119,
      }),
    );

    expect(opens).toBe(1);
    expect(backdropClicks).toBe(0);

    manager.unmount();
  });

  it('does not suppress a separate tap away from the synthetic click point', () => {
    const root = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    let secondClicks = 0;
    first.className = 'style-button';
    second.className = 'style-button';
    second.addEventListener('click', () => {
      secondClicks += 1;
    });
    root.append(first, second);
    document.body.append(root);
    document.elementFromPoint = () => first;

    const manager = new PressFeedbackManager();
    manager.mount(root);

    dispatchPointer(first, 'pointerdown', { clientX: 20, clientY: 20 });
    dispatchPointer(document, 'pointerup', { clientX: 20, clientY: 20 });
    second.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        clientX: 160,
        clientY: 20,
      }),
    );

    expect(secondClicks).toBe(1);

    manager.unmount();
  });

  it('does not activate when the pointer moves like a drag', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    const hapticsFacade = {
      playUiTap: vi.fn(),
    };
    let clicks = 0;
    button.className = 'style-button';
    button.addEventListener('click', () => {
      clicks += 1;
    });
    root.append(button);
    document.body.append(root);
    document.elementFromPoint = () => button;

    const manager = new PressFeedbackManager({ hapticsFacade });
    manager.mount(root);

    dispatchPointer(button, 'pointerdown', { clientX: 10, clientY: 10 });
    dispatchPointer(document, 'pointermove', { clientX: 40, clientY: 10 });
    dispatchPointer(document, 'pointerup', { clientX: 40, clientY: 10 });

    expect(button.classList.contains('is-pressing')).toBe(false);
    expect(clicks).toBe(0);
    expect(hapticsFacade.playUiTap).toHaveBeenCalledTimes(1);

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
