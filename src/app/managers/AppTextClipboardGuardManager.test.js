// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppTextClipboardGuardManager } from './AppTextClipboardGuardManager.js';

describe('AppTextClipboardGuardManager', () => {
  it('blocks copy paste and text selection events inside the stage', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const onPaste = vi.fn();
    input.addEventListener('paste', onPaste);
    stage.append(input);
    document.body.append(stage);
    const manager = new AppTextClipboardGuardManager();

    manager.mount(stage);
    const pasteEvent = new window.Event('paste', {
      bubbles: true,
      cancelable: true,
    });
    const selectEvent = new window.Event('selectstart', {
      bubbles: true,
      cancelable: true,
    });

    expect(input.dispatchEvent(pasteEvent)).toBe(false);
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(onPaste).not.toHaveBeenCalled();
    expect(input.dispatchEvent(selectEvent)).toBe(false);
    expect(selectEvent.defaultPrevented).toBe(true);
  });

  it('blocks paste beforeinput without blocking normal typing input', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new AppTextClipboardGuardManager();
    stage.append(input);
    document.body.append(stage);

    manager.mount(stage);
    const pasteEvent = new window.InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertFromPaste',
    });
    const typeEvent = new window.InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
    });

    expect(input.dispatchEvent(pasteEvent)).toBe(false);
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(input.dispatchEvent(typeEvent)).toBe(true);
    expect(typeEvent.defaultPrevented).toBe(false);
  });

  it('blocks common keyboard clipboard shortcuts', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const manager = new AppTextClipboardGuardManager();
    stage.append(input);
    document.body.append(stage);

    manager.mount(stage);
    const pasteShortcut = new window.KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'v',
      metaKey: true,
    });
    const normalKey = new window.KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'm',
      metaKey: true,
    });

    expect(input.dispatchEvent(pasteShortcut)).toBe(false);
    expect(pasteShortcut.defaultPrevented).toBe(true);
    expect(input.dispatchEvent(normalKey)).toBe(true);
    expect(normalKey.defaultPrevented).toBe(false);
  });

  it('allows events after unmount', () => {
    const stage = document.createElement('section');
    const input = document.createElement('input');
    const onCopy = vi.fn();
    input.addEventListener('copy', onCopy);
    stage.append(input);
    document.body.append(stage);
    const manager = new AppTextClipboardGuardManager();

    manager.mount(stage);
    manager.unmount();
    const copyEvent = new window.Event('copy', {
      bubbles: true,
      cancelable: true,
    });

    expect(input.dispatchEvent(copyEvent)).toBe(true);
    expect(copyEvent.defaultPrevented).toBe(false);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});
