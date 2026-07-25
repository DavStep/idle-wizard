const CLIPBOARD_KEYS = new Set(['a', 'c', 'v', 'x']);
const NON_TEXT_KEYS = new Set(['Dead', 'Process', 'Unidentified']);

/**
 * Physical-keyboard editor for desktop web. It deliberately uses only the
 * existing focusable canvas: there is no input, textarea, contenteditable, or
 * hidden DOM mirror. Full browser IME composition is intentionally unsupported.
 */
export class CanvasTextEntryAdapter {
  constructor({ canvas, clipboardProvider = defaultClipboardProvider } = {}) {
    if (!canvas?.addEventListener) {
      throw new Error('CanvasTextEntryAdapter requires the game canvas.');
    }

    this.canvas = canvas;
    this.clipboardProvider = clipboardProvider;
    this.handlers = null;
    this.config = null;
    this.originalTabIndex = null;
    this.hadTabIndex = false;
    this.selectionAnchor = 0;
    this.selectionFocus = 0;
    this.handleKeyDown = (event) => this.onKeyDown(event);
    this.handleComposition = (event) => this.blockComposition(event);
  }

  async open(config, handlers) {
    if (this.handlers) {
      throw new Error('Canvas text entry already has an active session.');
    }

    this.config = config;
    this.handlers = handlers;
    this.selectionAnchor = config.selectionStart;
    this.selectionFocus = config.selectionEnd;
    this.hadTabIndex = this.canvas.hasAttribute?.('tabindex') ?? false;
    this.originalTabIndex = this.canvas.getAttribute?.('tabindex') ?? null;
    this.canvas.tabIndex = 0;
    this.canvas.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('compositionstart', this.handleComposition);
    this.canvas.addEventListener('compositionupdate', this.handleComposition);
    this.canvas.addEventListener('compositionend', this.handleComposition);
    this.canvas.focus?.({ preventScroll: true });
  }

  async update(snapshot) {
    this.selectionAnchor = snapshot.selectionStart;
    this.selectionFocus = snapshot.selectionEnd;
  }

  async setSelection(snapshot) {
    this.selectionAnchor = snapshot.selectionStart;
    this.selectionFocus = snapshot.selectionEnd;
  }

  async submit() {
    if (!this.handlers) {
      return;
    }

    const handlers = this.handlers;
    this.cleanup();
    handlers.onSubmit();
  }

  async cancel() {
    if (!this.handlers) {
      return;
    }

    const handlers = this.handlers;
    this.cleanup();
    handlers.onCancel();
  }

  async close() {
    if (!this.handlers) {
      return;
    }

    const handlers = this.handlers;
    this.cleanup();
    handlers.onClose();
  }

  onKeyDown(event) {
    if (!this.handlers || event.isComposing || NON_TEXT_KEYS.has(event.key)) {
      return;
    }

    const key = String(event.key ?? '');
    const shortcut = event.ctrlKey || event.metaKey;

    if (shortcut && CLIPBOARD_KEYS.has(key.toLowerCase())) {
      this.handleClipboardShortcut(event, key.toLowerCase());
      return;
    }

    switch (key) {
      case 'Escape':
        stopEvent(event);
        void this.cancel();
        return;
      case 'Enter':
        stopEvent(event);
        if (this.config.submitOnEnter) {
          void this.submit();
        } else if (this.config.multiline) {
          this.replaceSelection('\n');
        }
        return;
      case 'Backspace':
        stopEvent(event);
        this.deleteBackward();
        return;
      case 'Delete':
        stopEvent(event);
        this.deleteForward();
        return;
      case 'ArrowLeft':
        stopEvent(event);
        this.moveSelection(-1, event.shiftKey);
        return;
      case 'ArrowRight':
        stopEvent(event);
        this.moveSelection(1, event.shiftKey);
        return;
      case 'Home':
        stopEvent(event);
        this.moveToBoundary(0, event.shiftKey);
        return;
      case 'End':
        stopEvent(event);
        this.moveToBoundary(this.snapshot().value.length, event.shiftKey);
        return;
      default:
        break;
    }

    const usesAltGraph = event.getModifierState?.('AltGraph');
    if (
      key.length === 1 &&
      !event.metaKey &&
      (!event.ctrlKey || usesAltGraph) &&
      (!event.altKey || usesAltGraph)
    ) {
      stopEvent(event);
      this.replaceSelection(key);
    }
  }

  handleClipboardShortcut(event, key) {
    stopEvent(event);

    if (key === 'a') {
      this.updateSelection(0, this.snapshot().value.length);
      return;
    }

    if (key === 'c') {
      void this.writeSelectedText();
      return;
    }

    if (key === 'x') {
      void this.cutSelectedText();
      return;
    }

    if (key === 'v') {
      void this.pasteClipboardText();
    }
  }

  async writeSelectedText() {
    const clipboard = this.clipboardProvider?.();
    const snapshot = this.snapshot();
    const selection = snapshot.value.slice(
      snapshot.selectionStart,
      snapshot.selectionEnd,
    );

    if (!selection || typeof clipboard?.writeText !== 'function') {
      return;
    }

    try {
      await clipboard.writeText(selection);
    } catch {
      // Browser clipboard permission is optional; keep the session usable.
    }
  }

  async cutSelectedText() {
    const snapshot = this.snapshot();
    if (snapshot.selectionStart === snapshot.selectionEnd) {
      return;
    }

    const write = this.writeSelectedText();
    this.replaceSelection('');
    await write;
  }

  async pasteClipboardText() {
    const clipboard = this.clipboardProvider?.();
    if (typeof clipboard?.readText !== 'function') {
      return;
    }

    try {
      this.replaceSelection(await clipboard.readText());
    } catch {
      // Browser clipboard permission is optional; keep the session usable.
    }
  }

  replaceSelection(replacement) {
    if (!this.handlers) {
      return;
    }

    const snapshot = this.snapshot();
    const availableLength =
      snapshot.maxLength === null
        ? Infinity
        : Math.max(
            0,
            snapshot.maxLength -
              (snapshot.value.length -
                (snapshot.selectionEnd - snapshot.selectionStart)),
          );
    const insertedText = String(replacement ?? '').slice(0, availableLength);
    const value =
      snapshot.value.slice(0, snapshot.selectionStart) +
      insertedText +
      snapshot.value.slice(snapshot.selectionEnd);
    const caret = snapshot.selectionStart + insertedText.length;

    this.selectionAnchor = caret;
    this.selectionFocus = caret;
    this.handlers.onValue({
      value,
      selectionStart: caret,
      selectionEnd: caret,
    });
  }

  deleteBackward() {
    const snapshot = this.snapshot();
    if (snapshot.selectionStart !== snapshot.selectionEnd) {
      this.replaceSelection('');
      return;
    }

    if (snapshot.selectionStart <= 0) {
      return;
    }

    const start = previousCodePointIndex(snapshot.value, snapshot.selectionStart);
    this.updateSelection(start, snapshot.selectionEnd);
    this.replaceSelection('');
  }

  deleteForward() {
    const snapshot = this.snapshot();
    if (snapshot.selectionStart !== snapshot.selectionEnd) {
      this.replaceSelection('');
      return;
    }

    if (snapshot.selectionEnd >= snapshot.value.length) {
      return;
    }

    const end = nextCodePointIndex(snapshot.value, snapshot.selectionEnd);
    this.updateSelection(snapshot.selectionStart, end);
    this.replaceSelection('');
  }

  moveSelection(direction, extend) {
    const snapshot = this.snapshot();
    if (!extend && snapshot.selectionStart !== snapshot.selectionEnd) {
      const caret =
        direction < 0 ? snapshot.selectionStart : snapshot.selectionEnd;
      this.updateSelection(caret, caret);
      return;
    }

    if (!extend) {
      const caret =
        direction < 0
          ? previousCodePointIndex(snapshot.value, snapshot.selectionStart)
          : nextCodePointIndex(snapshot.value, snapshot.selectionEnd);
      this.updateSelection(caret, caret);
      return;
    }

    if (snapshot.selectionStart === snapshot.selectionEnd) {
      this.selectionAnchor = snapshot.selectionStart;
      this.selectionFocus = snapshot.selectionEnd;
    }

    this.selectionFocus =
      direction < 0
        ? previousCodePointIndex(snapshot.value, this.selectionFocus)
        : nextCodePointIndex(snapshot.value, this.selectionFocus);
    this.updateSelection(this.selectionAnchor, this.selectionFocus, false);
  }

  moveToBoundary(boundary, extend) {
    if (!extend) {
      this.updateSelection(boundary, boundary);
      return;
    }

    const snapshot = this.snapshot();
    if (snapshot.selectionStart === snapshot.selectionEnd) {
      this.selectionAnchor = snapshot.selectionStart;
    }

    this.selectionFocus = boundary;
    this.updateSelection(this.selectionAnchor, this.selectionFocus, false);
  }

  updateSelection(selectionStart, selectionEnd, resetDirection = true) {
    if (!this.handlers) {
      return;
    }

    const orderedStart = Math.min(selectionStart, selectionEnd);
    const orderedEnd = Math.max(selectionStart, selectionEnd);
    if (resetDirection) {
      this.selectionAnchor = orderedStart;
      this.selectionFocus = orderedEnd;
    }

    this.handlers.onSelection({
      selectionStart: orderedStart,
      selectionEnd: orderedEnd,
    });
  }

  blockComposition(event) {
    stopEvent(event);
  }

  snapshot() {
    return this.handlers.getSnapshot();
  }

  cleanup() {
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('compositionstart', this.handleComposition);
    this.canvas.removeEventListener('compositionupdate', this.handleComposition);
    this.canvas.removeEventListener('compositionend', this.handleComposition);

    if (this.hadTabIndex) {
      this.canvas.setAttribute?.('tabindex', this.originalTabIndex);
    } else {
      this.canvas.removeAttribute?.('tabindex');
    }

    this.handlers = null;
    this.config = null;
    this.selectionAnchor = 0;
    this.selectionFocus = 0;
  }
}

export const CANVAS_TEXT_ENTRY_SUPPORTS_FULL_IME = false;

function previousCodePointIndex(value, index) {
  if (index <= 0) {
    return 0;
  }

  const previous = value.charCodeAt(index - 1);
  const beforePrevious = index >= 2 ? value.charCodeAt(index - 2) : 0;
  const isLowSurrogate = previous >= 0xdc00 && previous <= 0xdfff;
  const isHighSurrogate =
    beforePrevious >= 0xd800 && beforePrevious <= 0xdbff;
  return index - (isLowSurrogate && isHighSurrogate ? 2 : 1);
}

function nextCodePointIndex(value, index) {
  if (index >= value.length) {
    return value.length;
  }

  const current = value.charCodeAt(index);
  const next = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;
  const isHighSurrogate = current >= 0xd800 && current <= 0xdbff;
  const isLowSurrogate = next >= 0xdc00 && next <= 0xdfff;
  return Math.min(value.length, index + (isHighSurrogate && isLowSurrogate ? 2 : 1));
}

function defaultClipboardProvider() {
  return globalThis.navigator?.clipboard;
}

function stopEvent(event) {
  if (event.cancelable) {
    event.preventDefault();
  }

  event.stopPropagation?.();
}
