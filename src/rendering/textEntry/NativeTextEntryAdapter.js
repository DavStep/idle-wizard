import { IdleWizardTextEntryPlugin } from './nativeTextEntryPlugin.js';

const NATIVE_EVENT_NAMES = Object.freeze({
  VALUE: 'textEntryValueChanged',
  SELECTION: 'textEntrySelectionChanged',
  SUBMIT: 'textEntrySubmit',
  CANCEL: 'textEntryCancel',
  KEYBOARD_INSET: 'textEntryKeyboardInset',
  CLOSED: 'textEntryClosed',
});

export class NativeTextEntryAdapter {
  constructor({ plugin = IdleWizardTextEntryPlugin } = {}) {
    this.plugin = plugin;
    this.sessionId = null;
    this.config = null;
    this.handlers = null;
    this.listenerHandles = [];
  }

  async open(config, handlers) {
    if (this.sessionId) {
      throw new Error('Native text entry already has an active session.');
    }

    this.sessionId = config.id;
    this.config = config;
    this.handlers = handlers;

    try {
      await this.attachListeners();
      await this.plugin.start(toNativeStartPayload(config));
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async update(snapshot) {
    if (!this.isActive(snapshot.id)) {
      return;
    }

    await this.plugin.update({
      sessionId: snapshot.id,
      value: snapshot.value,
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd,
    });
  }

  async setSelection(snapshot) {
    if (!this.isActive(snapshot.id)) {
      return;
    }

    await this.plugin.setSelection({
      sessionId: snapshot.id,
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd,
    });
  }

  async submit() {
    if (!this.sessionId) {
      return;
    }

    const sessionId = this.sessionId;
    try {
      await this.plugin.submit({ sessionId });
    } finally {
      await this.cleanup();
    }
  }

  async cancel() {
    if (!this.sessionId) {
      return;
    }

    const sessionId = this.sessionId;
    try {
      await this.plugin.cancel({ sessionId });
    } finally {
      await this.cleanup();
    }
  }

  async close() {
    if (!this.sessionId) {
      return;
    }

    const sessionId = this.sessionId;
    try {
      await this.plugin.close({ sessionId });
    } finally {
      await this.cleanup();
    }
  }

  async attachListeners() {
    const registrations = [
      [NATIVE_EVENT_NAMES.VALUE, (event) => this.onValue(event)],
      [NATIVE_EVENT_NAMES.SELECTION, (event) => this.onSelection(event)],
      [NATIVE_EVENT_NAMES.SUBMIT, (event) => this.onSubmit(event)],
      [NATIVE_EVENT_NAMES.CANCEL, (event) => this.onCancel(event)],
      [
        NATIVE_EVENT_NAMES.KEYBOARD_INSET,
        (event) => this.onKeyboardInset(event),
      ],
      [NATIVE_EVENT_NAMES.CLOSED, (event) => this.onClosed(event)],
    ];

    for (const [eventName, listener] of registrations) {
      const handle = await this.plugin.addListener(eventName, listener);
      this.listenerHandles.push(handle);
    }
  }

  onValue(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onValue({
      value: event.value,
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
    });
  }

  onSelection(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onSelection({
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
    });
  }

  onSubmit(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onValue({
      value: event.value,
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
    });
    this.handlers.onSubmit();
    if (!this.config?.retainOnSubmit) {
      void this.cleanup();
    }
  }

  onCancel(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onCancel();
    void this.cleanup();
  }

  onKeyboardInset(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onKeyboardInset(event.keyboardInset);
  }

  onClosed(event) {
    if (!this.accepts(event)) {
      return;
    }

    this.handlers.onClose();
    void this.cleanup();
  }

  accepts(event) {
    return Boolean(
      this.handlers &&
        this.sessionId &&
        String(event?.sessionId ?? '') === this.sessionId,
    );
  }

  isActive(sessionId) {
    return Boolean(this.handlers && this.sessionId === sessionId);
  }

  async cleanup() {
    const handles = this.listenerHandles.splice(0);
    this.sessionId = null;
    this.config = null;
    this.handlers = null;

    await Promise.allSettled(
      handles.map((handle) => {
        try {
          return handle?.remove?.();
        } catch {
          return undefined;
        }
      }),
    );
  }
}

export { NATIVE_EVENT_NAMES };

function toNativeStartPayload(config) {
  const payload = {
    sessionId: config.id,
    value: config.value,
    selectionStart: config.selectionStart,
    selectionEnd: config.selectionEnd,
    inputKind: config.inputKind,
    multiline: config.multiline,
    submitOnEnter: config.submitOnEnter,
  };

  if (config.retainOnSubmit) {
    payload.retainOnSubmit = true;
  }

  if (config.maxLength !== null) {
    payload.maxLength = config.maxLength;
  }

  return payload;
}
