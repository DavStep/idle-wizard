export const TEXT_ENTRY_INPUT_KINDS = Object.freeze([
  'text',
  'username',
  'email',
  'search',
  'url',
  'phone',
  'integer',
  'decimal',
  'password',
]);

export const TEXT_ENTRY_EVENT_TYPES = Object.freeze({
  VALUE: 'value',
  SELECTION: 'selection',
  KEYBOARD_INSET: 'keyboardInset',
  SUBMIT: 'submit',
  CANCEL: 'cancel',
  CLOSE: 'close',
});

const INPUT_KIND_SET = new Set(TEXT_ENTRY_INPUT_KINDS);
const MAX_SUPPORTED_LENGTH = 1_000_000;

/**
 * Mutable text-entry state shared by the Pixi renderer and a platform adapter.
 * The session never renders a visible field and never creates a DOM element.
 */
export class TextEntrySession {
  constructor({ id, options, controller }) {
    this.id = id;
    this.controller = controller;
    this.listeners = new Set();
    this.callbacks = readCallbacks(options);

    const normalizedOptions = normalizeTextEntryOptions(options);
    this.inputKind = normalizedOptions.inputKind;
    this.multiline = normalizedOptions.multiline;
    this.maxLength = normalizedOptions.maxLength;
    this.submitOnEnter = normalizedOptions.submitOnEnter;
    this.retainOnSubmit = normalizedOptions.retainOnSubmit;
    this.value = normalizedOptions.value;
    this.selectionStart = normalizedOptions.selectionStart;
    this.selectionEnd = normalizedOptions.selectionEnd;
    this.keyboardInset = 0;
    this.status = 'active';
    this.closed = false;
  }

  getSnapshot() {
    return Object.freeze({
      id: this.id,
      value: this.value,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      inputKind: this.inputKind,
      multiline: this.multiline,
      maxLength: this.maxLength,
      submitOnEnter: this.submitOnEnter,
      retainOnSubmit: this.retainOnSubmit,
      keyboardInset: this.keyboardInset,
      status: this.status,
      active: !this.closed,
    });
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('TextEntrySession.subscribe requires a listener.');
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setValue(value, selection = {}) {
    return this.controller.setValue(this, value, selection);
  }

  setSelection(selectionStart, selectionEnd = selectionStart) {
    return this.controller.setSelection(this, selectionStart, selectionEnd);
  }

  submit() {
    return this.controller.submit(this);
  }

  cancel() {
    return this.controller.cancel(this);
  }

  close() {
    return this.controller.close(this);
  }

  applyValue(value, selectionStart, selectionEnd) {
    if (this.closed) {
      return;
    }

    const normalizedValue = truncateValue(value, this.maxLength);
    const normalizedSelection = normalizeSelection(
      normalizedValue,
      selectionStart,
      selectionEnd,
    );
    const valueChanged = normalizedValue !== this.value;
    const selectionChanged =
      normalizedSelection.selectionStart !== this.selectionStart ||
      normalizedSelection.selectionEnd !== this.selectionEnd;

    this.value = normalizedValue;
    this.selectionStart = normalizedSelection.selectionStart;
    this.selectionEnd = normalizedSelection.selectionEnd;

    if (valueChanged) {
      this.emit(TEXT_ENTRY_EVENT_TYPES.VALUE);
    }

    if (selectionChanged) {
      this.emit(TEXT_ENTRY_EVENT_TYPES.SELECTION);
    }
  }

  applySelection(selectionStart, selectionEnd) {
    if (this.closed) {
      return;
    }

    const normalizedSelection = normalizeSelection(
      this.value,
      selectionStart,
      selectionEnd,
    );

    if (
      normalizedSelection.selectionStart === this.selectionStart &&
      normalizedSelection.selectionEnd === this.selectionEnd
    ) {
      return;
    }

    this.selectionStart = normalizedSelection.selectionStart;
    this.selectionEnd = normalizedSelection.selectionEnd;
    this.emit(TEXT_ENTRY_EVENT_TYPES.SELECTION);
  }

  applyKeyboardInset(keyboardInset) {
    if (this.closed) {
      return;
    }

    const normalizedInset = normalizeKeyboardInset(keyboardInset);
    if (normalizedInset === this.keyboardInset) {
      return;
    }

    this.keyboardInset = normalizedInset;
    this.emit(TEXT_ENTRY_EVENT_TYPES.KEYBOARD_INSET);
  }

  finish(outcome) {
    if (this.closed) {
      return false;
    }

    if (!['submit', 'cancel', 'closed'].includes(outcome)) {
      throw new Error(`Unsupported text-entry outcome "${outcome}".`);
    }

    this.status = outcome;
    this.closed = true;
    if (outcome === 'submit') {
      this.emit(TEXT_ENTRY_EVENT_TYPES.SUBMIT);
    } else if (outcome === 'cancel') {
      this.emit(TEXT_ENTRY_EVENT_TYPES.CANCEL);
    }

    this.emit(TEXT_ENTRY_EVENT_TYPES.CLOSE, { reason: outcome });
    this.listeners.clear();
    return true;
  }

  emitSubmit() {
    if (this.closed) {
      return false;
    }

    this.emit(TEXT_ENTRY_EVENT_TYPES.SUBMIT);
    return true;
  }

  emit(type, extra = {}) {
    const event = Object.freeze({
      type,
      session: this,
      snapshot: this.getSnapshot(),
      ...extra,
    });

    for (const listener of [...this.listeners]) {
      listener(event);
    }

    const callback = callbackForEvent(this.callbacks, type);
    callback?.(event.snapshot, event);
  }
}

export function normalizeTextEntryOptions(options = {}) {
  const inputKind = String(options.inputKind ?? 'text');
  if (!INPUT_KIND_SET.has(inputKind)) {
    throw new RangeError(`Unsupported text-entry input kind "${inputKind}".`);
  }

  const multiline = Boolean(options.multiline);
  const maxLength = normalizeMaxLength(options.maxLength);
  const value = truncateValue(options.value, maxLength);
  const defaultSelection = value.length;
  const selection = normalizeSelection(
    value,
    options.selectionStart ?? defaultSelection,
    options.selectionEnd ?? options.selectionStart ?? defaultSelection,
  );

  return {
    value,
    selectionStart: selection.selectionStart,
    selectionEnd: selection.selectionEnd,
    inputKind,
    multiline,
    maxLength,
    submitOnEnter: Boolean(options.submitOnEnter ?? !multiline),
    retainOnSubmit: Boolean(options.retainOnSubmit),
  };
}

export function truncateValue(value, maxLength) {
  const normalizedValue = String(value ?? '');
  return maxLength === null
    ? normalizedValue
    : normalizedValue.slice(0, maxLength);
}

export function normalizeSelection(value, selectionStart, selectionEnd) {
  const length = String(value ?? '').length;
  const start = clampInteger(selectionStart, 0, length, length);
  const end = clampInteger(selectionEnd, 0, length, start);

  return {
    selectionStart: Math.min(start, end),
    selectionEnd: Math.max(start, end),
  };
}

function normalizeMaxLength(maxLength) {
  if (maxLength === undefined || maxLength === null) {
    return null;
  }

  return clampInteger(maxLength, 0, MAX_SUPPORTED_LENGTH, null);
}

function normalizeKeyboardInset(keyboardInset) {
  const value = Number(keyboardInset);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    if (fallback === null) {
      throw new TypeError('Text-entry maxLength must be a finite number.');
    }

    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function readCallbacks(options) {
  return {
    onValue: asOptionalCallback(options?.onValue),
    onSelection: asOptionalCallback(options?.onSelection),
    onKeyboardInset: asOptionalCallback(options?.onKeyboardInset),
    onSubmit: asOptionalCallback(options?.onSubmit),
    onCancel: asOptionalCallback(options?.onCancel),
    onClose: asOptionalCallback(options?.onClose),
  };
}

function asOptionalCallback(callback) {
  return typeof callback === 'function' ? callback : null;
}

function callbackForEvent(callbacks, eventType) {
  switch (eventType) {
    case TEXT_ENTRY_EVENT_TYPES.VALUE:
      return callbacks.onValue;
    case TEXT_ENTRY_EVENT_TYPES.SELECTION:
      return callbacks.onSelection;
    case TEXT_ENTRY_EVENT_TYPES.KEYBOARD_INSET:
      return callbacks.onKeyboardInset;
    case TEXT_ENTRY_EVENT_TYPES.SUBMIT:
      return callbacks.onSubmit;
    case TEXT_ENTRY_EVENT_TYPES.CANCEL:
      return callbacks.onCancel;
    case TEXT_ENTRY_EVENT_TYPES.CLOSE:
      return callbacks.onClose;
    default:
      return null;
  }
}
