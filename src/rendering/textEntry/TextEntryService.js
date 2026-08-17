import { Capacitor } from '@capacitor/core';

import { CanvasTextEntryAdapter } from './CanvasTextEntryAdapter.js';
import { NativeTextEntryAdapter } from './NativeTextEntryAdapter.js';
import { IdleWizardTextEntryPlugin } from './nativeTextEntryPlugin.js';
import { TextEntrySession } from './TextEntrySession.js';

let nextSessionId = 1;

/**
 * One-session text-entry coordinator used by Pixi fields. Android delegates to
 * the invisible native EditText plugin; desktop web stays on the game canvas.
 */
export class TextEntryService {
  constructor({
    canvas,
    nativePlugin = IdleWizardTextEntryPlugin,
    platformProvider = () => Capacitor.getPlatform(),
    isNativePlatform = () => Capacitor.isNativePlatform(),
    isNativePluginAvailable = () =>
      Capacitor.isPluginAvailable('IdleWizardTextEntry'),
    canvasAdapterFactory = (targetCanvas) =>
      new CanvasTextEntryAdapter({ canvas: targetCanvas }),
    nativeAdapterFactory = (plugin) => new NativeTextEntryAdapter({ plugin }),
  } = {}) {
    this.canvas = canvas;
    this.nativePlugin = nativePlugin;
    this.platformProvider = platformProvider;
    this.isNativePlatform = isNativePlatform;
    this.isNativePluginAvailable = isNativePluginAvailable;
    this.canvasAdapterFactory = canvasAdapterFactory;
    this.nativeAdapterFactory = nativeAdapterFactory;
    this.activeSession = null;
    this.activeAdapter = null;
    this.activeStateListeners = new Set();
    this.keyboardInsetListeners = new Set();
    this.keyboardInset = 0;
  }

  async open(options = {}) {
    await this.close();

    const session = new TextEntrySession({
      id: `text-entry-${nextSessionId++}`,
      options,
      controller: {
        setValue: (target, value, selection) =>
          this.setValue(target, value, selection),
        setSelection: (target, selectionStart, selectionEnd) =>
          this.setSelection(target, selectionStart, selectionEnd),
        submit: (target) => this.submit(target),
        cancel: (target) => this.cancel(target),
        close: (target) => this.close(target),
      },
    });
    const adapter = this.createAdapter();

    this.activeSession = session;
    this.activeAdapter = adapter;
    this.publishActiveState(true);

    try {
      await adapter.open(session.getSnapshot(), this.createHandlers(session));
      return session;
    } catch (error) {
      this.clearActive(session);
      session.finish('closed');
      throw error;
    }
  }

  getActiveSession() {
    return this.activeSession;
  }

  async setValue(session, value, selection = {}) {
    this.assertActive(session);
    const normalizedValue = String(value ?? '');
    const defaultSelection = normalizedValue.length;
    session.applyValue(
      normalizedValue,
      selection.selectionStart ?? defaultSelection,
      selection.selectionEnd ??
        selection.selectionStart ??
        defaultSelection,
    );
    await this.activeAdapter.update(session.getSnapshot());
    return session.getSnapshot();
  }

  async setSelection(session, selectionStart, selectionEnd) {
    this.assertActive(session);
    session.applySelection(selectionStart, selectionEnd);
    await this.activeAdapter.setSelection(session.getSnapshot());
    return session.getSnapshot();
  }

  async submit(session = this.activeSession) {
    if (!session) {
      return false;
    }

    this.assertActive(session);
    const adapter = this.activeAdapter;
    await adapter.submit();
    this.finish(session, 'submit');
    return true;
  }

  async cancel(session = this.activeSession) {
    if (!session) {
      return false;
    }

    this.assertActive(session);
    const adapter = this.activeAdapter;
    await adapter.cancel();
    this.finish(session, 'cancel');
    return true;
  }

  async close(session = this.activeSession) {
    if (!session) {
      return false;
    }

    this.assertActive(session);
    const adapter = this.activeAdapter;
    try {
      await adapter.close();
    } finally {
      this.finish(session, 'closed');
    }

    return true;
  }

  destroy() {
    this.activeStateListeners.clear();
    this.keyboardInsetListeners.clear();
    this.keyboardInset = 0;
    return this.close();
  }

  createAdapter() {
    let native = false;
    let platform = 'web';

    try {
      native = Boolean(this.isNativePlatform?.());
      platform = String(this.platformProvider?.() ?? 'web');
    } catch {
      native = false;
      platform = 'web';
    }

    if (native && platform !== 'android') {
      throw new Error(`Native text entry is unsupported on platform "${platform}".`);
    }

    if (native && platform === 'android') {
      if (!this.isNativePluginAvailable?.()) {
        throw new Error('IdleWizardTextEntry Android plugin is unavailable.');
      }

      return this.nativeAdapterFactory(this.nativePlugin);
    }

    return this.canvasAdapterFactory(this.canvas);
  }

  createHandlers(session) {
    return {
      getSnapshot: () => session.getSnapshot(),
      onValue: ({ value, selectionStart, selectionEnd }) => {
        if (this.activeSession !== session) {
          return;
        }

        session.applyValue(value, selectionStart, selectionEnd);
      },
      onSelection: ({ selectionStart, selectionEnd }) => {
        if (this.activeSession !== session) {
          return;
        }

        session.applySelection(selectionStart, selectionEnd);
      },
      onKeyboardInset: (keyboardInset) => {
        if (this.activeSession !== session) {
          return;
        }

        session.applyKeyboardInset(keyboardInset);
        this.publishKeyboardInset(keyboardInset);
      },
      onSubmit: () =>
        session.retainOnSubmit
          ? session.emitSubmit()
          : this.finish(session, 'submit'),
      onCancel: () => this.finish(session, 'cancel'),
      onClose: () => this.finish(session, 'closed'),
    };
  }

  finish(session, outcome) {
    if (this.activeSession !== session) {
      return false;
    }

    this.clearActive(session);
    this.publishKeyboardInset(0);
    return session.finish(outcome);
  }

  subscribeKeyboardInset(listener, { emitCurrent = false } = {}) {
    if (typeof listener !== 'function') {
      throw new TypeError('Keyboard inset listener must be a function.');
    }
    this.keyboardInsetListeners.add(listener);
    if (emitCurrent) {
      listener(this.keyboardInset);
    }
    return () => this.keyboardInsetListeners.delete(listener);
  }

  subscribeActiveState(listener, { emitCurrent = false } = {}) {
    if (typeof listener !== 'function') {
      throw new TypeError('Text-entry active-state listener must be a function.');
    }
    this.activeStateListeners.add(listener);
    if (emitCurrent) {
      listener(Boolean(this.activeSession));
    }
    return () => this.activeStateListeners.delete(listener);
  }

  publishActiveState(active) {
    for (const listener of this.activeStateListeners) {
      listener(active === true);
    }
  }

  publishKeyboardInset(keyboardInset) {
    const normalizedInset = Math.max(0, Number(keyboardInset) || 0);
    if (normalizedInset === this.keyboardInset) {
      return false;
    }
    this.keyboardInset = normalizedInset;
    for (const listener of this.keyboardInsetListeners) {
      listener(normalizedInset);
    }
    return true;
  }

  clearActive(session) {
    if (this.activeSession !== session) {
      return;
    }

    this.activeSession = null;
    this.activeAdapter = null;
    this.publishActiveState(false);
  }

  assertActive(session) {
    if (!session || session !== this.activeSession || session.closed) {
      throw new Error('Text-entry session is not active.');
    }
  }
}
