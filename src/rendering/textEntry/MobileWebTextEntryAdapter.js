const EDITOR_ATTRIBUTE = 'data-idle-wizard-text-entry';

/**
 * Mobile-browser text editor for retained Pixi fields. The one-pixel DOM
 * control stays visually hidden while Safari/Chrome own the software keyboard,
 * composition, selection, and keyboard layout.
 */
export class MobileWebTextEntryAdapter {
  constructor({
    canvas,
    documentTarget = globalThis.document ?? null,
    windowTarget = globalThis.window ?? null,
  } = {}) {
    if (!canvas) {
      throw new Error('MobileWebTextEntryAdapter requires the game canvas.');
    }

    this.canvas = canvas;
    this.documentTarget = documentTarget;
    this.windowTarget = windowTarget;
    this.editor = null;
    this.config = null;
    this.handlers = null;
    this.keyboardInset = 0;
    this.handleInput = () => this.publishValue();
    this.handleSelection = () => this.publishSelection();
    this.handleKeyDown = (event) => this.onKeyDown(event);
    this.handleViewportChange = () => this.publishKeyboardInset();
  }

  async open(config, handlers) {
    if (this.editor) {
      throw new Error('Mobile web text entry already has an active session.');
    }

    const editor = this.createEditor(config);
    this.config = config;
    this.handlers = handlers;
    this.editor = editor;
    this.attachEditorListeners(editor);
    this.attachViewportListeners();
    try {
      const mountTarget =
        this.documentTarget?.body ?? this.documentTarget?.documentElement;
      if (!mountTarget) {
        throw new Error('Mobile web text entry requires a document root.');
      }
      mountTarget.append(editor);
      this.applySnapshot(config);

      // This must remain synchronous with the validated Pixi pointer release.
      // iOS Safari will not summon its software keyboard after an await.
      focusWithoutScroll(editor);
      this.applySelection(config);
      this.publishKeyboardInset();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async update(snapshot) {
    if (!this.isActive(snapshot?.id)) {
      return;
    }

    this.applySnapshot(snapshot);
  }

  async setSelection(snapshot) {
    if (!this.isActive(snapshot?.id)) {
      return;
    }

    this.applySelection(snapshot);
    focusWithoutScroll(this.editor);
    this.applySelection(snapshot);
  }

  async submit() {
    if (!this.editor) {
      return;
    }

    const handlers = this.handlers;
    this.publishValue();
    if (!this.config?.retainOnSubmit) {
      this.cleanup();
    }
    handlers?.onSubmit();
  }

  async cancel() {
    if (!this.editor) {
      return;
    }

    const handlers = this.handlers;
    this.cleanup();
    handlers?.onCancel();
  }

  async close() {
    if (!this.editor) {
      return;
    }

    const handlers = this.handlers;
    this.cleanup();
    handlers?.onClose();
  }

  createEditor(config) {
    if (!this.documentTarget?.createElement) {
      throw new Error('Mobile web text entry requires a document.');
    }

    const editor = config.multiline
      ? this.documentTarget.createElement('textarea')
      : this.documentTarget.createElement('input');
    editor.setAttribute(EDITOR_ATTRIBUTE, '');
    editor.setAttribute('aria-label', 'Game text entry');
    editor.autocomplete = 'off';
    editor.autocorrect = inputUsesSuggestions(config.inputKind) ? 'on' : 'off';
    editor.autocapitalize = inputUsesCapitalization(config.inputKind)
      ? 'sentences'
      : 'none';
    editor.spellcheck = inputUsesSuggestions(config.inputKind);
    editor.enterKeyHint = config.submitOnEnter ? 'done' : 'enter';
    editor.inputMode = resolveInputMode(config.inputKind);
    if (!config.multiline) {
      editor.type = config.inputKind === 'password' ? 'password' : 'text';
    }
    if (config.maxLength !== null) {
      editor.maxLength = config.maxLength;
    }

    Object.assign(editor.style, {
      position: 'fixed',
      inset: '0 auto auto 0',
      width: '1px',
      height: '1px',
      minWidth: '0',
      minHeight: '0',
      margin: '0',
      padding: '0',
      border: '0',
      outline: '0',
      opacity: '0',
      color: 'transparent',
      background: 'transparent',
      caretColor: 'transparent',
      fontSize: '16px',
      lineHeight: '16px',
      pointerEvents: 'none',
      resize: 'none',
      overflow: 'hidden',
      zIndex: '2147483647',
    });
    return editor;
  }

  attachEditorListeners(editor) {
    editor.addEventListener('input', this.handleInput);
    editor.addEventListener('select', this.handleSelection);
    editor.addEventListener('keyup', this.handleSelection);
    editor.addEventListener('keydown', this.handleKeyDown);
    this.documentTarget?.addEventListener?.(
      'selectionchange',
      this.handleSelection,
    );
  }

  detachEditorListeners(editor) {
    editor.removeEventListener('input', this.handleInput);
    editor.removeEventListener('select', this.handleSelection);
    editor.removeEventListener('keyup', this.handleSelection);
    editor.removeEventListener('keydown', this.handleKeyDown);
    this.documentTarget?.removeEventListener?.(
      'selectionchange',
      this.handleSelection,
    );
  }

  attachViewportListeners() {
    this.windowTarget?.visualViewport?.addEventListener?.(
      'resize',
      this.handleViewportChange,
    );
    this.windowTarget?.visualViewport?.addEventListener?.(
      'scroll',
      this.handleViewportChange,
    );
    this.windowTarget?.addEventListener?.('resize', this.handleViewportChange);
  }

  detachViewportListeners() {
    this.windowTarget?.visualViewport?.removeEventListener?.(
      'resize',
      this.handleViewportChange,
    );
    this.windowTarget?.visualViewport?.removeEventListener?.(
      'scroll',
      this.handleViewportChange,
    );
    this.windowTarget?.removeEventListener?.(
      'resize',
      this.handleViewportChange,
    );
  }

  onKeyDown(event) {
    if (!this.editor || event.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      void this.cancel();
      return;
    }

    if (event.key === 'Enter' && this.config?.submitOnEnter) {
      event.preventDefault();
      event.stopPropagation();
      void this.submit();
    }
  }

  publishValue() {
    if (!this.editor || !this.handlers) {
      return;
    }

    const selection = this.readSelection();
    this.handlers.onValue({
      value: this.editor.value,
      ...selection,
    });
  }

  publishSelection() {
    if (!this.editor || !this.handlers) {
      return;
    }

    this.handlers.onSelection(this.readSelection());
  }

  publishKeyboardInset() {
    if (!this.editor || !this.handlers) {
      return;
    }

    const nextInset = measureKeyboardInset({
      canvas: this.canvas,
      windowTarget: this.windowTarget,
    });
    if (nextInset === this.keyboardInset) {
      return;
    }

    this.keyboardInset = nextInset;
    this.handlers.onKeyboardInset(nextInset);
  }

  applySnapshot(snapshot) {
    if (!this.editor) {
      return;
    }

    if (this.editor.value !== snapshot.value) {
      this.editor.value = snapshot.value;
    }
    this.applySelection(snapshot);
  }

  applySelection(snapshot) {
    if (!this.editor?.setSelectionRange) {
      return;
    }

    try {
      this.editor.setSelectionRange(
        snapshot.selectionStart,
        snapshot.selectionEnd,
      );
    } catch {
      // Some browser/input-mode combinations temporarily reject selection.
    }
  }

  readSelection() {
    const fallback = this.editor?.value?.length ?? 0;
    return {
      selectionStart: this.editor?.selectionStart ?? fallback,
      selectionEnd: this.editor?.selectionEnd ?? fallback,
    };
  }

  isActive(sessionId) {
    return Boolean(
      this.editor && this.handlers && this.config?.id === sessionId,
    );
  }

  cleanup() {
    const editor = this.editor;
    const handlers = this.handlers;
    if (!editor) {
      return;
    }

    if (this.keyboardInset !== 0) {
      this.keyboardInset = 0;
      handlers?.onKeyboardInset(0);
    }
    this.detachViewportListeners();
    this.detachEditorListeners(editor);
    editor.remove();
    this.editor = null;
    this.config = null;
    this.handlers = null;
  }
}

export function defaultShouldUseMobileWebAdapter({
  navigatorTarget = globalThis.navigator ?? null,
  windowTarget = globalThis.window ?? null,
} = {}) {
  if (navigatorTarget?.userAgentData?.mobile === true) {
    return true;
  }

  if (Number(navigatorTarget?.maxTouchPoints) > 0) {
    return true;
  }

  try {
    return windowTarget?.matchMedia?.('(pointer: coarse)')?.matches === true;
  } catch {
    return false;
  }
}

function resolveInputMode(inputKind) {
  switch (inputKind) {
    case 'email':
      return 'email';
    case 'search':
      return 'search';
    case 'url':
      return 'url';
    case 'phone':
      return 'tel';
    case 'integer':
      return 'numeric';
    case 'decimal':
      return 'decimal';
    default:
      return 'text';
  }
}

function inputUsesSuggestions(inputKind) {
  return inputKind === 'text' || inputKind === 'search';
}

function inputUsesCapitalization(inputKind) {
  return inputKind === 'text';
}

function focusWithoutScroll(editor) {
  try {
    editor.focus({ preventScroll: true });
  } catch {
    editor.focus();
  }
}

function measureKeyboardInset({ canvas, windowTarget }) {
  const visualViewport = windowTarget?.visualViewport;
  const visualHeight = Number(visualViewport?.height);
  if (!(visualHeight > 0)) {
    return 0;
  }

  const canvasRect = canvas?.getBoundingClientRect?.();
  const canvasHeight = Number(canvasRect?.height);
  if (canvasHeight > 0) {
    const canvasTop = Number(canvasRect.top) || 0;
    const canvasBottom = canvasTop + canvasHeight;
    const visualTop = Number(visualViewport.offsetTop) || 0;
    const visualBottom = visualTop + visualHeight;
    const visibleHeight = Math.max(
      0,
      Math.min(canvasBottom, visualBottom) - Math.max(canvasTop, visualTop),
    );
    return Math.max(0, Math.round(canvasHeight - visibleHeight));
  }

  const layoutHeight = Number(windowTarget?.innerHeight);
  return layoutHeight > 0
    ? Math.max(0, Math.round(layoutHeight - visualHeight))
    : 0;
}

export { EDITOR_ATTRIBUTE };
