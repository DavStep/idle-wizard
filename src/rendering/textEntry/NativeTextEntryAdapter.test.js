import { describe, expect, it, vi } from 'vitest';

import {
  NATIVE_EVENT_NAMES,
  NativeTextEntryAdapter,
} from './NativeTextEntryAdapter.js';

describe('NativeTextEntryAdapter', () => {
  it('maps the session contract to the Capacitor plugin and filters session events', async () => {
    const plugin = createPlugin();
    const handlers = createHandlers();
    const adapter = new NativeTextEntryAdapter({ plugin });

    await adapter.open(
      {
        id: 'session-1',
        value: 'wizard',
        selectionStart: 1,
        selectionEnd: 3,
        inputKind: 'username',
        multiline: false,
        maxLength: 24,
        submitOnEnter: true,
      },
      handlers,
    );

    expect(plugin.start).toHaveBeenCalledWith({
      sessionId: 'session-1',
      value: 'wizard',
      selectionStart: 1,
      selectionEnd: 3,
      inputKind: 'username',
      multiline: false,
      maxLength: 24,
      submitOnEnter: true,
    });

    plugin.emit(NATIVE_EVENT_NAMES.VALUE, {
      sessionId: 'another-session',
      value: 'ignored',
    });
    plugin.emit(NATIVE_EVENT_NAMES.VALUE, {
      sessionId: 'session-1',
      value: 'wizard 2',
      selectionStart: 8,
      selectionEnd: 8,
    });
    plugin.emit(NATIVE_EVENT_NAMES.SELECTION, {
      sessionId: 'session-1',
      selectionStart: 0,
      selectionEnd: 6,
    });
    plugin.emit(NATIVE_EVENT_NAMES.KEYBOARD_INSET, {
      sessionId: 'session-1',
      keyboardInset: 310,
    });

    expect(handlers.onValue).toHaveBeenCalledTimes(1);
    expect(handlers.onValue).toHaveBeenCalledWith({
      value: 'wizard 2',
      selectionStart: 8,
      selectionEnd: 8,
    });
    expect(handlers.onSelection).toHaveBeenCalledWith({
      selectionStart: 0,
      selectionEnd: 6,
    });
    expect(handlers.onKeyboardInset).toHaveBeenCalledWith(310);
  });

  it('forwards state changes and removes all native listeners after submit', async () => {
    const plugin = createPlugin();
    const handlers = createHandlers();
    const adapter = new NativeTextEntryAdapter({ plugin });
    await adapter.open(
      {
        id: 'session-2',
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        inputKind: 'text',
        multiline: true,
        maxLength: null,
        submitOnEnter: false,
      },
      handlers,
    );

    await adapter.update({
      id: 'session-2',
      value: 'message',
      selectionStart: 7,
      selectionEnd: 7,
    });
    await adapter.setSelection({
      id: 'session-2',
      selectionStart: 1,
      selectionEnd: 4,
    });
    plugin.emit(NATIVE_EVENT_NAMES.SUBMIT, { sessionId: 'session-2' });
    await Promise.resolve();
    await Promise.resolve();

    expect(plugin.update).toHaveBeenCalledWith({
      sessionId: 'session-2',
      value: 'message',
      selectionStart: 7,
      selectionEnd: 7,
    });
    expect(plugin.setSelection).toHaveBeenCalledWith({
      sessionId: 'session-2',
      selectionStart: 1,
      selectionEnd: 4,
    });
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
    expect(plugin.removeListener).toHaveBeenCalledTimes(6);
  });

  it('applies the native editor final value before submitting', async () => {
    const plugin = createPlugin();
    const handlers = createHandlers();
    const adapter = new NativeTextEntryAdapter({ plugin });
    await adapter.open(
      {
        id: 'session-3',
        value: 'old name',
        selectionStart: 8,
        selectionEnd: 8,
        inputKind: 'username',
        multiline: false,
        maxLength: 24,
        submitOnEnter: true,
      },
      handlers,
    );

    plugin.emit(NATIVE_EVENT_NAMES.SUBMIT, {
      sessionId: 'session-3',
      value: 'final composed name',
      selectionStart: 19,
      selectionEnd: 19,
    });

    expect(handlers.onValue).toHaveBeenCalledWith({
      value: 'final composed name',
      selectionStart: 19,
      selectionEnd: 19,
    });
    expect(handlers.onValue.mock.invocationCallOrder[0]).toBeLessThan(
      handlers.onSubmit.mock.invocationCallOrder[0],
    );
  });

  it('keeps native listeners attached for retained keyboard submits', async () => {
    const plugin = createPlugin();
    const handlers = createHandlers();
    const adapter = new NativeTextEntryAdapter({ plugin });
    await adapter.open(
      {
        id: 'session-chat',
        value: 'hello',
        selectionStart: 5,
        selectionEnd: 5,
        inputKind: 'text',
        multiline: false,
        maxLength: 160,
        submitOnEnter: true,
        retainOnSubmit: true,
      },
      handlers,
    );

    plugin.emit(NATIVE_EVENT_NAMES.SUBMIT, {
      sessionId: 'session-chat',
      value: 'hello',
      selectionStart: 5,
      selectionEnd: 5,
    });
    await Promise.resolve();

    expect(plugin.start).toHaveBeenCalledWith(
      expect.objectContaining({ retainOnSubmit: true }),
    );
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
    expect(plugin.removeListener).not.toHaveBeenCalled();

    await adapter.update({
      id: 'session-chat',
      value: '',
      selectionStart: 0,
      selectionEnd: 0,
    });
    expect(plugin.update).toHaveBeenCalledWith({
      sessionId: 'session-chat',
      value: '',
      selectionStart: 0,
      selectionEnd: 0,
    });

    plugin.emit(NATIVE_EVENT_NAMES.VALUE, {
      sessionId: 'session-chat',
      value: 'n',
      selectionStart: 1,
      selectionEnd: 1,
    });

    expect(handlers.onValue).toHaveBeenLastCalledWith({
      value: 'n',
      selectionStart: 1,
      selectionEnd: 1,
    });
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.removeListener).not.toHaveBeenCalled();
  });
});

function createHandlers() {
  return {
    onValue: vi.fn(),
    onSelection: vi.fn(),
    onKeyboardInset: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onClose: vi.fn(),
  };
}

function createPlugin() {
  const listeners = new Map();
  const removeListener = vi.fn();

  return {
    start: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    setSelection: vi.fn(async () => {}),
    submit: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    removeListener,
    addListener: vi.fn(async (eventName, listener) => {
      listeners.set(eventName, listener);
      return {
        remove: () => {
          removeListener(eventName);
          listeners.delete(eventName);
        },
      };
    }),
    emit(eventName, event) {
      listeners.get(eventName)?.(event);
    },
  };
}
