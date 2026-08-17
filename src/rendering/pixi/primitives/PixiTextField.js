import {
  CanvasTextMetrics,
  Container,
  Graphics,
  Rectangle,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../theme/PixiThemeTokens.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const BROWN_INSET_TEXT = '#ffe7c8';
const BROWN_INSET_PLACEHOLDER = '#c8a67a';
const BROWN_INSET_FOCUS = '#f1b84b';
const MULTILINE_LINE_HEIGHT = 16;
const CARET_WIDTH = 1;
const CARET_BLINK_HALF_CYCLE_MS = 530;

function resolveInsetSkin(variant) {
  if (variant === 'clean-inset') {
    return {
      assetId: PIXI_ROOT_RUN_ASSETS.textFieldCleanInset,
      geometry: PIXI_ROOT_RUN_GEOMETRY.textFieldCleanInset,
    };
  }
  return {
    assetId: PIXI_ROOT_RUN_ASSETS.textFieldBrownInset,
    geometry: PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset,
  };
}

export class PixiTextField extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    textEntryService = null,
    width = 222,
    height = 30,
    placeholder = '',
    multiline = false,
    inputKind = 'text',
    maxLength = null,
    retainOnSubmit = false,
    onSubmit = null,
    onCancel = null,
    onChange = null,
    onKeyboardInset = null,
    motionRuntime = null,
    variant = 'brown-inset',
    label = 'textField',
  } = {}) {
    super();
    this.label = label;
    this.fieldWidth = width;
    this.fieldHeight = height;
    this.placeholder = placeholder;
    this.multiline = multiline;
    this.inputKind = inputKind;
    this.maxLength = maxLength;
    this.retainOnSubmit = retainOnSubmit === true;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.onChange = onChange;
    this.onKeyboardInset = onKeyboardInset;
    this.assetManager = assetManager;
    this.textEntryService = textEntryService;
    this.variant = variant;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.textScrollX = 0;
    this.textScrollY = 0;
    this.textAreaWidth = 0;
    this.textAreaHeight = 0;
    this.focused = false;
    this.session = null;
    this.sessionUnsubscribe = null;
    this.focusRequestToken = 0;
    this.fieldDestroying = false;
    this.requestFrame = motionRuntime?.requestFrame ?? requestFrame;
    this.cancelFrame = motionRuntime?.cancelFrame ?? cancelFrame;
    this.timeSource = motionRuntime?.now ?? now;
    this.reducedMotion =
      motionRuntime?.prefersReducedMotion ?? prefersReducedMotion;
    this.caretBlinkFrame = null;
    this.caretBlinkStartedAt = null;
    const insetSkin = resolveInsetSkin(variant);
    this.insetFrame = new PixiNineSliceFrame({
      texture: assetManager?.getTexture?.(insetSkin.assetId) ?? Texture.EMPTY,
      sourceInsets: insetSkin.geometry.sourceInsets,
      borderInsets: insetSkin.geometry.borderInsets,
      width,
      height,
      label: `${label}:brownInsetFrame`,
    });
    this.focusGraphic = new Graphics({ label: `${label}:focus` });
    this.selectionGraphic = new Graphics();
    this.selectionGraphic.label = `${label}:selection`;
    this.textLabel = new PixiTextLabel({
      text: placeholder,
      color: 'muted',
      label: `${label}:text`,
    });
    this.caretGraphic = new Graphics();
    this.caretGraphic.label = `${label}:caret`;
    this.textViewport = new Container();
    this.textViewport.label = `${label}:textViewport`;
    this.textMask = new Graphics();
    this.textMask.label = `${label}:mask`;
    this.textViewport.addChild(
      this.selectionGraphic,
      this.textLabel,
      this.caretGraphic,
    );
    this.textViewport.mask = this.textMask;
    this.addChild(
      this.insetFrame,
      this.focusGraphic,
      this.textViewport,
      this.textMask,
    );
    this.registration = inputRouter?.registerPressTarget?.(this, {
      enabled: () => this.visible && this.renderable,
      fallbackHitTest: true,
      onActivate: (payload) => this.activate(payload),
      onFocusChange: (focused) => {
        if (!focused) {
          this.blur();
        }
      },
      haptic: 'selection',
      sound: false,
    }) ?? null;
    this.relayout();
    this.redrawTextState();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.textLabel.applyTheme(this.theme);
    this.redrawTextState();
  }

  setValue(value, { notify = false } = {}) {
    this.value = String(value ?? '');
    if (this.focused) {
      this.selectionStart = Math.min(this.selectionStart, this.value.length);
      this.selectionEnd = Math.min(this.selectionEnd, this.value.length);
    } else {
      this.selectionStart = this.value.length;
      this.selectionEnd = this.value.length;
    }
    void Promise.resolve(this.session?.setValue?.(this.value)).catch(() => {});
    this.redrawTextState();
    this.restartCaretBlink();
    if (notify) {
      this.onChange?.(this.value);
    }
    return this;
  }

  async activate(payload = {}) {
    const selectionIndex = this.resolveSelectionIndex(payload?.point);
    if (selectionIndex !== null) {
      this.selectionStart = selectionIndex;
      this.selectionEnd = selectionIndex;
      this.redrawTextState();
      this.restartCaretBlink();
      if (this.focused && this.session) {
        await this.session.setSelection(selectionIndex, selectionIndex);
        return this.session;
      }
    }

    return this.focus();
  }

  resolveSelectionIndex(point) {
    if (
      this.multiline ||
      !point ||
      typeof this.toLocal !== 'function'
    ) {
      return null;
    }

    const localPoint = this.toLocal(point);
    const textX = Math.max(
      0,
      localPoint.x - this.textViewport.x + this.textScrollX,
    );
    return findNearestCaretIndex(this.textLabel, this.value, textX);
  }

  async focus() {
    if (this.focused || !this.textEntryService) {
      return this.session;
    }
    const requestToken = ++this.focusRequestToken;
    this.focused = true;
    this.redrawTextState();
    this.restartCaretBlink();
    const session = await this.textEntryService.open({
      value: this.value,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      multiline: this.multiline,
      inputKind: this.inputKind,
      maxLength: this.maxLength,
      retainOnSubmit: this.retainOnSubmit,
      onValue: (snapshot) => {
        this.applySessionSnapshot(snapshot);
        this.onChange?.(this.value);
      },
      onSelection: (snapshot) => this.applySessionSnapshot(snapshot),
      onKeyboardInset: (snapshot) => {
        this.applySessionSnapshot(snapshot);
        this.onKeyboardInset?.(snapshot.keyboardInset);
      },
      onSubmit: (snapshot) => {
        this.applySessionSnapshot(snapshot);
        this.onSubmit?.(snapshot.value);
      },
      onCancel: () => {
        this.onCancel?.();
      },
      onClose: () => {
        if (!this.fieldDestroying) {
          this.endSession();
        }
      },
    });
    if (requestToken !== this.focusRequestToken || !this.focused) {
      void Promise.resolve(session?.close?.()).catch(() => {});
      return null;
    }
    this.session = session;
    this.sessionUnsubscribe = this.session?.subscribe?.((event) =>
      this.applySessionSnapshot(event.snapshot),
    ) ?? null;
    this.applySessionSnapshot(this.session?.getSnapshot?.());
    return this.session;
  }

  blur() {
    this.focusRequestToken += 1;
    const session = this.session;
    this.endSession();
    void Promise.resolve(session?.close?.()).catch(() => {});
  }

  endSession() {
    this.sessionUnsubscribe?.();
    this.sessionUnsubscribe = null;
    this.session = null;
    this.focused = false;
    this.stopCaretBlink();
    if (!this.fieldDestroying) {
      this.redrawTextState();
    }
  }

  applySessionSnapshot(snapshot = {}) {
    this.value = String(snapshot?.value ?? this.value);
    this.selectionStart = Number.isInteger(snapshot?.selectionStart)
      ? snapshot.selectionStart
      : this.selectionStart;
    this.selectionEnd = Number.isInteger(snapshot?.selectionEnd)
      ? snapshot.selectionEnd
      : this.selectionEnd;
    this.focused = snapshot?.active !== false;
    this.redrawTextState();
    this.restartCaretBlink();
  }

  setSize(width, height = this.fieldHeight) {
    this.fieldWidth = Math.max(0, Number(width) || 0);
    this.fieldHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  setVariant(variant) {
    this.variant = String(variant || 'brown-inset');
    this.relayout();
    return this;
  }

  relayout() {
    const border = PIXI_UI_GEOMETRY.ordinaryBorderWidth;
    const paddingX = PIXI_UI_GEOMETRY.panelPaddingX;
    const paddingY = PIXI_UI_GEOMETRY.panelPaddingY;
    const insetSkin = resolveInsetSkin(this.variant);
    this.insetFrame.setSkin({
      assetId: insetSkin.assetId,
      borderInsets: insetSkin.geometry.borderInsets,
      height: this.fieldHeight,
      sourceInsets: insetSkin.geometry.sourceInsets,
      texture:
        this.assetManager?.getTexture?.(insetSkin.assetId) ?? Texture.EMPTY,
      width: this.fieldWidth,
    });
    const brownInset = this.variant === 'brown-inset';
    const cleanInset = this.variant === 'clean-inset';
    const illustratedInset = brownInset || cleanInset;
    const accountUsername = this.variant === 'account-username';
    const textInsetX = accountUsername ? 0 : border + paddingX;
    const textInsetY =
      accountUsername ? 0 : border + paddingY - (illustratedInset ? 2 : 0);
    const textStrokeBleed = accountUsername
      ? resolvePixiTextStrokeWidth(
          PIXI_ROOT_RUN_GEOMETRY.account.username.fontSize,
        )
      : 0;
    this.insetFrame.visible = illustratedInset;
    this.textViewport.position.set(textInsetX, textInsetY);
    this.textAreaWidth = Math.max(
      0,
      this.fieldWidth - textInsetX * 2 + textStrokeBleed * 2,
    );
    this.textAreaHeight = Math.max(
      0,
      this.fieldHeight - textInsetY * 2 + textStrokeBleed * 2,
    );
    this.textMask
      .clear()
      .rect(
        textInsetX - textStrokeBleed,
        textInsetY - textStrokeBleed,
        this.textAreaWidth,
        this.textAreaHeight,
      )
      .fill('#ffffff');
    this.hitArea = new Rectangle(0, 0, this.fieldWidth, this.fieldHeight);
    this.eventMode = 'static';
    this.redrawTextState();
  }

  redrawTextState() {
    const showingPlaceholder = this.value.length === 0 && !this.focused;
    const brownInset = this.variant === 'brown-inset';
    const cleanInset = this.variant === 'clean-inset';
    const illustratedInset = brownInset || cleanInset;
    const accountUsername = this.variant === 'account-username';
    this.textLabel
      .setText(showingPlaceholder ? this.placeholder : this.value)
      .setColor(
        accountUsername
          ? '#ffffff'
          : illustratedInset
          ? showingPlaceholder
            ? BROWN_INSET_PLACEHOLDER
            : BROWN_INSET_TEXT
          : showingPlaceholder
            ? 'muted'
            : 'text',
      );
    if (accountUsername) {
      this.textLabel
        .setFontFamily('"Lilita One", "Arial Black", Arial, sans-serif')
        .setFontSize(PIXI_ROOT_RUN_GEOMETRY.account.username.fontSize)
        .setStroke({
          color: '#0a0a0a',
          width: PIXI_ROOT_RUN_GEOMETRY.account.username.textStroke,
        });
    } else {
      this.textLabel
        .setFontFamily(null)
        .setFontSize(PIXI_UI_GEOMETRY.bodyFontSize)
        .setStroke(null);
    }
    this.configureTextLayout();
    this.selectionGraphic.clear();
    this.caretGraphic.clear();
    this.focusGraphic.clear();
    if (!this.focused) {
      this.textLabel.position.set(-this.textScrollX, -this.textScrollY);
      return;
    }

    if (illustratedInset) {
      const focusInset = cleanInset ? 1 : -1;
      const focusExpansion = cleanInset ? -2 : 2;
      this.focusGraphic
        .roundRect(
          focusInset,
          focusInset,
          Math.max(0, this.fieldWidth + focusExpansion),
          Math.max(0, this.fieldHeight + focusExpansion),
          cleanInset ? 4 : 5,
        )
        .stroke({
          color: BROWN_INSET_FOCUS,
          width: cleanInset ? 1 : 2,
          alpha: cleanInset ? 0.9 : 1,
          join: 'round',
        });
    }
    const startPosition = this.measureCaretPosition(this.selectionStart);
    const endPosition = this.measureCaretPosition(this.selectionEnd);
    const caretHeight = Math.max(
      PIXI_UI_GEOMETRY.bodyFontSize + 2,
      endPosition.lineHeight,
    );
    this.keepCaretVisible(endPosition, caretHeight);
    this.textLabel.position.set(-this.textScrollX, -this.textScrollY);
    this.drawSelection(
      startPosition,
      endPosition,
      accountUsername
        ? '#ffffff'
        : illustratedInset
          ? BROWN_INSET_TEXT
          : this.theme.text,
    );
    this.caretGraphic
      .rect(
        endPosition.x - this.textScrollX,
        endPosition.y - this.textScrollY,
        CARET_WIDTH,
        caretHeight,
      )
      .fill(
        accountUsername
          ? '#ffffff'
          : illustratedInset
            ? BROWN_INSET_TEXT
            : this.theme.text,
      );
    this.caretGraphic.alpha = 1;
  }

  restartCaretBlink() {
    this.stopCaretBlink();
    this.caretGraphic.alpha = 1;
    if (!this.focused || this.reducedMotion()) {
      return;
    }

    this.caretBlinkStartedAt = this.timeSource();
    const tick = () => {
      if (!this.focused || this.fieldDestroying) {
        this.stopCaretBlink();
        return;
      }
      const elapsed = Math.max(0, this.timeSource() - this.caretBlinkStartedAt);
      const phase = Math.floor(elapsed / CARET_BLINK_HALF_CYCLE_MS);
      this.caretGraphic.alpha = phase % 2 === 0 ? 1 : 0;
      this.caretBlinkFrame = this.requestFrame(tick);
    };
    this.caretBlinkFrame = this.requestFrame(tick);
  }

  stopCaretBlink() {
    if (this.caretBlinkFrame !== null) {
      this.cancelFrame(this.caretBlinkFrame);
    }
    this.caretBlinkFrame = null;
    this.caretBlinkStartedAt = null;
    this.caretGraphic.alpha = 1;
  }

  configureTextLayout() {
    const multiline = this.multiline && this.variant !== 'account-username';
    const style = this.textLabel.textObject.style;
    style.wordWrap = multiline;
    style.breakWords = multiline;
    style.whiteSpace = multiline ? 'pre-wrap' : 'pre';
    style.wordWrapWidth = multiline ? Math.max(1, this.textAreaWidth) : 0;
    style.lineHeight = multiline ? MULTILINE_LINE_HEIGHT : 0;
    if (multiline) {
      this.textScrollX = 0;
    } else {
      this.textScrollY = 0;
    }
  }

  measureCaretPosition(index) {
    if (!this.multiline || this.variant === 'account-username') {
      return {
        line: 0,
        lineHeight: this.textLabel.fontSize + 2,
        x: measurePrefix(this.textLabel, this.value.slice(0, index)),
        y: 0,
      };
    }

    const prefix = this.value.slice(0, index);
    const { text, trailingLineBreaks } = stripTrailingLineBreaks(prefix);
    const metrics = CanvasTextMetrics.measureText(
      text,
      this.textLabel.textObject.style,
    );
    const line = Math.max(0, metrics.lines.length - 1) + trailingLineBreaks;
    return {
      line,
      lineHeight: metrics.lineHeight || MULTILINE_LINE_HEIGHT,
      x:
        trailingLineBreaks > 0
          ? 0
          : (metrics.lineWidths.at(-1) ?? 0),
      y: line * (metrics.lineHeight || MULTILINE_LINE_HEIGHT),
    };
  }

  keepCaretVisible(caret, caretHeight) {
    if (!this.multiline || this.variant === 'account-username') {
      this.textScrollY = 0;
      if (this.textAreaWidth <= 0) {
        this.textScrollX = 0;
        return;
      }

      let nextScrollX = this.textScrollX;
      if (caret.x < nextScrollX) {
        nextScrollX = caret.x;
      } else if (
        caret.x + CARET_WIDTH >
        nextScrollX + this.textAreaWidth
      ) {
        nextScrollX = caret.x + CARET_WIDTH - this.textAreaWidth;
      }
      const contentWidth = Math.max(
        this.textLabel.measuredWidth,
        caret.x + CARET_WIDTH,
      );
      this.textScrollX = Math.max(
        0,
        Math.min(nextScrollX, contentWidth - this.textAreaWidth),
      );
      return;
    }

    this.textScrollX = 0;
    if (this.textAreaHeight <= 0) {
      this.textScrollY = 0;
      return;
    }

    let nextScrollY = this.textScrollY;
    if (caret.y < nextScrollY) {
      nextScrollY = caret.y;
    } else if (caret.y + caretHeight > nextScrollY + this.textAreaHeight) {
      nextScrollY = caret.y + caretHeight - this.textAreaHeight;
    }
    const contentHeight = Math.max(
      this.textLabel.measuredHeight,
      caret.y + caretHeight,
    );
    this.textScrollY = Math.max(
      0,
      Math.min(nextScrollY, contentHeight - this.textAreaHeight),
    );
  }

  drawSelection(start, end, color) {
    if (
      this.selectionStart === this.selectionEnd ||
      end.line < start.line
    ) {
      return;
    }

    const lineHeight = Math.max(start.lineHeight, end.lineHeight);
    if (start.line === end.line) {
      this.selectionGraphic
        .rect(
          start.x - this.textScrollX,
          start.y - this.textScrollY,
          Math.max(0, end.x - start.x),
          lineHeight,
        )
        .fill({ color, alpha: 0.25 });
      return;
    }

    this.selectionGraphic
      .rect(
        start.x - this.textScrollX,
        start.y - this.textScrollY,
        Math.max(0, this.textAreaWidth - start.x),
        lineHeight,
      )
      .fill({ color, alpha: 0.25 });
    for (let line = start.line + 1; line < end.line; line += 1) {
      this.selectionGraphic
        .rect(
          0,
          line * lineHeight - this.textScrollY,
          this.textAreaWidth,
          lineHeight,
        )
        .fill({ color, alpha: 0.25 });
    }
    this.selectionGraphic
      .rect(
        0,
        end.y - this.textScrollY,
        Math.max(0, end.x),
        lineHeight,
      )
      .fill({ color, alpha: 0.25 });
  }

  destroy(options) {
    this.fieldDestroying = true;
    this.stopCaretBlink();
    this.registration?.();
    this.registration = null;
    this.blur();
    super.destroy(options);
  }
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function requestFrame(callback) {
  return typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame(callback)
    : null;
}

function cancelFrame(frameId) {
  globalThis.cancelAnimationFrame?.(frameId);
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function measurePrefix(label, prefix) {
  const original = label.text;
  label.setText(prefix);
  const width = label.measuredWidth;
  label.setText(original);
  return width;
}

function findNearestCaretIndex(label, value, targetX) {
  const boundaries = graphemeBoundaries(value);
  let previousIndex = boundaries[0];
  let previousWidth = 0;

  for (const boundary of boundaries.slice(1)) {
    const width = measurePrefix(label, value.slice(0, boundary));
    if (targetX <= (previousWidth + width) / 2) {
      return previousIndex;
    }
    previousIndex = boundary;
    previousWidth = width;
  }

  return previousIndex;
}

function graphemeBoundaries(value) {
  const text = String(value ?? '');
  const Segmenter = globalThis.Intl?.Segmenter;
  if (typeof Segmenter === 'function') {
    const boundaries = [0];
    for (const segment of new Segmenter(undefined, {
      granularity: 'grapheme',
    }).segment(text)) {
      boundaries.push(segment.index + segment.segment.length);
    }
    return boundaries;
  }

  const boundaries = [0];
  let index = 0;
  for (const character of text) {
    index += character.length;
    boundaries.push(index);
  }
  return boundaries;
}

function stripTrailingLineBreaks(value) {
  let text = String(value ?? '');
  let trailingLineBreaks = 0;
  while (text.endsWith('\n') || text.endsWith('\r')) {
    if (text.endsWith('\r\n')) {
      text = text.slice(0, -2);
    } else {
      text = text.slice(0, -1);
    }
    trailingLineBreaks += 1;
  }
  return { text, trailingLineBreaks };
}
