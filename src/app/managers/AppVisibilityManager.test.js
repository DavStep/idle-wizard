import { describe, expect, it, vi } from 'vitest';

import { AppVisibilityManager } from './AppVisibilityManager.js';

function createDocumentRef() {
  const listeners = new Map();

  return {
    hidden: false,
    visibilityState: 'visible',
    addEventListener: vi.fn((eventName, callback) => {
      listeners.set(eventName, callback);
    }),
    removeEventListener: vi.fn((eventName, callback) => {
      if (listeners.get(eventName) === callback) {
        listeners.delete(eventName);
      }
    }),
    emit(eventName) {
      listeners.get(eventName)?.();
    },
  };
}

describe('AppVisibilityManager', () => {
  it('publishes document visibility changes once per state change', () => {
    const documentRef = createDocumentRef();
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const manager = new AppVisibilityManager({ documentRef });

    manager.mount({ onHidden, onVisible });
    documentRef.hidden = true;
    documentRef.visibilityState = 'hidden';
    documentRef.emit('visibilitychange');
    documentRef.emit('visibilitychange');
    documentRef.hidden = false;
    documentRef.visibilityState = 'visible';
    documentRef.emit('visibilitychange');

    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('uses Capacitor app state and removes the listener on unmount', async () => {
    let appStateCallback = null;
    const remove = vi.fn();
    const appPlugin = {
      addListener: vi.fn((eventName, callback) => {
        appStateCallback = callback;
        return Promise.resolve({ remove });
      }),
    };
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const manager = new AppVisibilityManager({
      appPlugin,
      documentRef: createDocumentRef(),
    });

    manager.mount({ onHidden, onVisible });
    await Promise.resolve();
    appStateCallback({ isActive: false });
    appStateCallback({ isActive: true });
    manager.unmount();

    expect(appPlugin.addListener).toHaveBeenCalledWith(
      'appStateChange',
      expect.any(Function),
    );
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
