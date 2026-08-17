// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  CANVAS_TEXT_ENTRY_SUPPORTS_FULL_IME,
  CanvasTextEntryAdapter,
} from './CanvasTextEntryAdapter.js';
import { TextEntryService } from './TextEntryService.js';

describe('CanvasTextEntryAdapter', () => {
  it('edits selection on the existing focusable canvas without creating DOM fields', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const createElement = vi.spyOn(document, 'createElement');
    const service = createCanvasService(canvas);
    const session = await service.open({
      value: 'wizard',
      selectionStart: 0,
      selectionEnd: 6,
      maxLength: 8,
    });

    dispatchKey(canvas, 'm');
    dispatchKey(canvas, 'a');
    dispatchKey(canvas, 'g');
    dispatchKey(canvas, 'i');
    dispatchKey(canvas, 'c');
    dispatchKey(canvas, '!');
    dispatchKey(canvas, '!');
    dispatchKey(canvas, '!');
    dispatchKey(canvas, '!');

    expect(session.getSnapshot()).toMatchObject({
      value: 'magic!!!',
      selectionStart: 8,
      selectionEnd: 8,
    });
    expect(canvas.tabIndex).toBe(0);
    expect(createElement).not.toHaveBeenCalled();
    createElement.mockRestore();
  });

  it('supports navigation, selection, deletion, and Unicode code points', async () => {
    const canvas = document.createElement('canvas');
    const service = createCanvasService(canvas);
    const session = await service.open({ value: 'a🪄b' });

    dispatchKey(canvas, 'ArrowLeft');
    dispatchKey(canvas, 'Backspace');
    dispatchKey(canvas, 'Home');
    dispatchKey(canvas, 'ArrowRight', { shiftKey: true });
    dispatchKey(canvas, 'x');

    expect(session.getSnapshot()).toMatchObject({
      value: 'xb',
      selectionStart: 1,
      selectionEnd: 1,
    });
  });

  it('uses the Clipboard API for canvas copy, cut, and paste', async () => {
    const canvas = document.createElement('canvas');
    const clipboard = {
      readText: vi.fn(async () => 'spell'),
      writeText: vi.fn(async () => {}),
    };
    const adapter = new CanvasTextEntryAdapter({
      canvas,
      clipboardProvider: () => clipboard,
    });
    const service = createCanvasService(canvas, adapter);
    const session = await service.open({
      value: 'mana',
      selectionStart: 0,
      selectionEnd: 4,
    });

    dispatchKey(canvas, 'c', { ctrlKey: true });
    await Promise.resolve();
    dispatchKey(canvas, 'x', { ctrlKey: true });
    await Promise.resolve();
    dispatchKey(canvas, 'v', { ctrlKey: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(clipboard.writeText).toHaveBeenCalledWith('mana');
    expect(clipboard.readText).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().value).toBe('spell');
  });

  it('inserts multiline newlines, submits single-line fields, and cancels Escape', async () => {
    const multilineCanvas = document.createElement('canvas');
    const multilineService = createCanvasService(multilineCanvas);
    const multiline = await multilineService.open({
      value: 'line',
      multiline: true,
    });
    dispatchKey(multilineCanvas, 'Enter');

    expect(multiline.getSnapshot()).toMatchObject({
      value: 'line\n',
      status: 'active',
    });

    const submitCanvas = document.createElement('canvas');
    const submitService = createCanvasService(submitCanvas);
    const submit = await submitService.open({ value: 'send' });
    dispatchKey(submitCanvas, 'Enter');

    expect(submit.getSnapshot()).toMatchObject({
      status: 'submit',
      active: false,
    });

    const cancelCanvas = document.createElement('canvas');
    const cancelService = createCanvasService(cancelCanvas);
    const cancel = await cancelService.open({ value: 'discard' });
    dispatchKey(cancelCanvas, 'Escape');

    expect(cancel.getSnapshot()).toMatchObject({
      status: 'cancel',
      active: false,
    });
  });

  it('keeps retained-submit canvas sessions active for consecutive messages', async () => {
    const canvas = document.createElement('canvas');
    const service = createCanvasService(canvas);
    const onSubmit = vi.fn();
    const session = await service.open({
      value: 'first',
      retainOnSubmit: true,
      onSubmit,
    });

    dispatchKey(canvas, 'Enter');
    await session.setValue('');
    dispatchKey(canvas, 's');
    dispatchKey(canvas, 'p');
    dispatchKey(canvas, 'e');
    dispatchKey(canvas, 'l');
    dispatchKey(canvas, 'l');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot()).toMatchObject({
      selectionEnd: 5,
      selectionStart: 5,
      value: 'spell',
      status: 'active',
      active: true,
    });
  });

  it('explicitly blocks composition because full desktop IME is unsupported', async () => {
    const canvas = document.createElement('canvas');
    const service = createCanvasService(canvas);
    const session = await service.open({ value: '' });
    const event = new window.CompositionEvent('compositionstart', {
      bubbles: true,
      cancelable: true,
      data: '魔',
    });

    canvas.dispatchEvent(event);

    expect(CANVAS_TEXT_ENTRY_SUPPORTS_FULL_IME).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(session.getSnapshot().value).toBe('');
  });

  it('restores the canvas tab index when the session closes', async () => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('tabindex', '7');
    const service = createCanvasService(canvas);
    const session = await service.open();

    expect(canvas.tabIndex).toBe(0);
    await session.close();

    expect(canvas.getAttribute('tabindex')).toBe('7');
  });
});

function createCanvasService(canvas, adapter = null) {
  return new TextEntryService({
    canvas,
    isNativePlatform: () => false,
    platformProvider: () => 'web',
    canvasAdapterFactory: () =>
      adapter ?? new CanvasTextEntryAdapter({ canvas }),
  });
}

function dispatchKey(canvas, key, options = {}) {
  canvas.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}
