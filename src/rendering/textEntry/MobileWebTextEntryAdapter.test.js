// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  defaultShouldUseMobileWebAdapter,
  MobileWebTextEntryAdapter,
} from './MobileWebTextEntryAdapter.js';
import { TextEntryService } from './TextEntryService.js';

describe('MobileWebTextEntryAdapter', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('focuses a real editable element synchronously so Safari can open its keyboard', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const service = createService(canvas);

    const sessionPromise = service.open({
      value: 'wizard',
      selectionStart: 0,
      selectionEnd: 6,
      inputKind: 'username',
      maxLength: 12,
    });
    const editor = document.querySelector('[data-idle-wizard-text-entry]');

    expect(editor).toBeInstanceOf(window.HTMLInputElement);
    expect(document.activeElement).toBe(editor);
    expect(editor.inputMode).toBe('text');
    expect(editor.maxLength).toBe(12);
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(6);

    const session = await sessionPromise;
    editor.value = 'magic';
    editor.setSelectionRange(5, 5);
    editor.dispatchEvent(new window.InputEvent('input', { bubbles: true }));

    expect(session.getSnapshot()).toMatchObject({
      value: 'magic',
      selectionStart: 5,
      selectionEnd: 5,
    });

    editor.setSelectionRange(1, 4);
    editor.dispatchEvent(new window.Event('select', { bubbles: true }));
    expect(session.getSnapshot()).toMatchObject({
      selectionStart: 1,
      selectionEnd: 4,
    });

    editor.dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(session.getSnapshot()).toMatchObject({
      status: 'submit',
      active: false,
    });
    expect(document.querySelector('[data-idle-wizard-text-entry]')).toBeNull();
  });

  it('uses a textarea for multiline copy and reports visual keyboard overlap', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 390,
      bottom: 844,
      left: 0,
      width: 390,
      height: 844,
      toJSON: () => ({}),
    });
    const visualViewport = createVisualViewport({ height: 844 });
    const windowTarget = {
      innerHeight: 844,
      visualViewport,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const service = createService(canvas, { windowTarget });
    const keyboardInsets = [];
    service.subscribeKeyboardInset((value) => keyboardInsets.push(value));

    const session = await service.open({ multiline: true, value: 'line' });
    const editor = document.querySelector('[data-idle-wizard-text-entry]');
    expect(editor).toBeInstanceOf(window.HTMLTextAreaElement);

    visualViewport.height = 524;
    visualViewport.dispatch('resize');
    expect(keyboardInsets).toEqual([320]);
    expect(session.getSnapshot().keyboardInset).toBe(320);

    await session.close();
    expect(keyboardInsets).toEqual([320, 0]);
    expect(visualViewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('recognizes iPhone and coarse-pointer browsers without relying on the user agent', () => {
    expect(
      defaultShouldUseMobileWebAdapter({
        navigatorTarget: { maxTouchPoints: 5 },
        windowTarget: {},
      }),
    ).toBe(true);
    expect(
      defaultShouldUseMobileWebAdapter({
        navigatorTarget: { maxTouchPoints: 0 },
        windowTarget: { matchMedia: () => ({ matches: true }) },
      }),
    ).toBe(true);
    expect(
      defaultShouldUseMobileWebAdapter({
        navigatorTarget: { maxTouchPoints: 0 },
        windowTarget: { matchMedia: () => ({ matches: false }) },
      }),
    ).toBe(false);
  });
});

function createService(canvas, { windowTarget = window } = {}) {
  return new TextEntryService({
    canvas,
    isNativePlatform: () => false,
    platformProvider: () => 'web',
    shouldUseMobileWebAdapter: () => true,
    mobileWebAdapterFactory: (targetCanvas) =>
      new MobileWebTextEntryAdapter({
        canvas: targetCanvas,
        documentTarget: document,
        windowTarget,
      }),
  });
}

function createVisualViewport({ height, offsetTop = 0 }) {
  const listeners = new Map();
  return {
    height,
    offsetTop,
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    }),
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}
