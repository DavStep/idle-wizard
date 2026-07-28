import { Container, Graphics, Rectangle, Texture } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiFrame } from './PixiFrame.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const BROWN_INSET_TEXT = '#ffe7c8';
const BROWN_INSET_PLACEHOLDER = '#c8a67a';
const BROWN_INSET_FOCUS = '#f1b84b';

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
    onSubmit = null,
    onCancel = null,
    onChange = null,
    onKeyboardInset = null,
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
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.onChange = onChange;
    this.onKeyboardInset = onKeyboardInset;
    this.textEntryService = textEntryService;
    this.variant = variant;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.focused = false;
    this.session = null;
    this.sessionUnsubscribe = null;
    this.fieldDestroying = false;
    this.frame = new PixiFrame({
      assetManager,
      variant: 'control',
      width,
      height,
      label: `${label}:frame`,
    });
    this.insetFrame = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.textFieldBrownInset) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.borderInsets,
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
      this.frame,
      this.insetFrame,
      this.focusGraphic,
      this.textViewport,
      this.textMask,
    );
    this.registration = inputRouter?.registerPressTarget?.(this, {
      enabled: () => this.visible && this.renderable,
      onActivate: () => this.focus(),
      haptic: 'selection',
      sound: false,
    }) ?? null;
    this.relayout();
    this.redrawTextState();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.applyTheme(this.theme);
    this.textLabel.applyTheme(this.theme);
    this.redrawTextState();
  }

  setValue(value, { notify = false } = {}) {
    this.value = String(value ?? '');
    this.selectionStart = Math.min(this.selectionStart, this.value.length);
    this.selectionEnd = Math.min(this.selectionEnd, this.value.length);
    void Promise.resolve(this.session?.setValue?.(this.value)).catch(() => {});
    this.redrawTextState();
    if (notify) {
      this.onChange?.(this.value);
    }
    return this;
  }

  async focus() {
    if (this.focused || !this.textEntryService) {
      return this.session;
    }
    this.focused = true;
    this.session = await this.textEntryService.open({
      value: this.value,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      multiline: this.multiline,
      inputKind: this.inputKind,
      maxLength: this.maxLength,
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
    this.sessionUnsubscribe = this.session?.subscribe?.((event) =>
      this.applySessionSnapshot(event.snapshot),
    ) ?? null;
    this.applySessionSnapshot(this.session?.getSnapshot?.());
    return this.session;
  }

  blur() {
    const session = this.session;
    this.endSession();
    void Promise.resolve(session?.close?.()).catch(() => {});
  }

  endSession() {
    this.sessionUnsubscribe?.();
    this.sessionUnsubscribe = null;
    this.session = null;
    this.focused = false;
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
  }

  setSize(width, height = this.fieldHeight) {
    this.fieldWidth = Math.max(0, Number(width) || 0);
    this.fieldHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  setVariant(variant) {
    this.variant = String(variant || 'control');
    this.relayout();
    return this;
  }

  relayout() {
    const border = PIXI_UI_GEOMETRY.ordinaryBorderWidth;
    const paddingX = PIXI_UI_GEOMETRY.panelPaddingX;
    const paddingY = PIXI_UI_GEOMETRY.panelPaddingY;
    this.frame.setSize(this.fieldWidth, this.fieldHeight);
    this.insetFrame.setSize(
      this.fieldWidth,
      this.fieldHeight,
      PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.borderInsets,
    );
    const brownInset = this.variant === 'brown-inset';
    const accountUsername = this.variant === 'account-username';
    const textInsetX = accountUsername ? 0 : border + paddingX;
    const textInsetY =
      accountUsername ? 0 : border + paddingY - (brownInset ? 2 : 0);
    this.frame.visible = !brownInset && !accountUsername;
    this.insetFrame.visible = brownInset;
    this.textViewport.position.set(textInsetX, textInsetY);
    this.textMask
      .clear()
      .rect(
        textInsetX,
        textInsetY,
        Math.max(0, this.fieldWidth - textInsetX * 2),
        Math.max(0, this.fieldHeight - textInsetY * 2),
      )
      .fill('#ffffff');
    this.hitArea = new Rectangle(0, 0, this.fieldWidth, this.fieldHeight);
    this.eventMode = 'static';
    this.redrawTextState();
  }

  redrawTextState() {
    const showingPlaceholder = this.value.length === 0 && !this.focused;
    const brownInset = this.variant === 'brown-inset';
    const accountUsername = this.variant === 'account-username';
    this.textLabel
      .setText(showingPlaceholder ? this.placeholder : this.value)
      .setColor(
        accountUsername
          ? '#ffffff'
          : brownInset
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
    this.textLabel.position.set(0, 0);
    this.selectionGraphic.clear();
    this.caretGraphic.clear();
    this.focusGraphic.clear();
    if (!this.focused) {
      return;
    }

    if (brownInset) {
      this.focusGraphic
        .roundRect(
          -1,
          -1,
          Math.max(0, this.fieldWidth + 2),
          Math.max(0, this.fieldHeight + 2),
          5,
        )
        .stroke({
          color: BROWN_INSET_FOCUS,
          width: 2,
          alpha: 1,
          join: 'round',
        });
    }
    const beforeStart = this.value.slice(0, this.selectionStart);
    const beforeEnd = this.value.slice(0, this.selectionEnd);
    const startX = measurePrefix(this.textLabel, beforeStart);
    const endX = measurePrefix(this.textLabel, beforeEnd);
    const textHeight = Math.max(
      PIXI_UI_GEOMETRY.bodyFontSize + 2,
      this.textLabel.measuredHeight,
    );
    if (endX > startX) {
      this.selectionGraphic
        .rect(startX, 0, endX - startX, textHeight)
        .fill({
          color: accountUsername
            ? '#ffffff'
            : brownInset
              ? BROWN_INSET_TEXT
              : this.theme.text,
          alpha: 0.25,
        });
    }
    this.caretGraphic
      .rect(endX, 0, 1, textHeight)
      .fill(
        accountUsername
          ? '#ffffff'
          : brownInset
            ? BROWN_INSET_TEXT
            : this.theme.text,
      );
  }

  destroy(options) {
    this.fieldDestroying = true;
    this.registration?.();
    this.registration = null;
    this.blur();
    super.destroy(options);
  }
}

function measurePrefix(label, prefix) {
  const original = label.text;
  label.setText(prefix);
  const width = label.measuredWidth;
  label.setText(original);
  return width;
}
