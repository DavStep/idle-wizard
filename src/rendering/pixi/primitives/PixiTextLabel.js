import { Container, Text } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_TEXT_STROKE_COLOR,
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../theme/PixiThemeTokens.js';

export class PixiTextLabel extends Container {
  constructor({
    text = '',
    fontSize = PIXI_UI_GEOMETRY.bodyFontSize,
    fontWeight = 'normal',
    fontFamily = null,
    lineHeight = null,
    align = 'left',
    anchor = { x: 0, y: 0 },
    color = null,
    wordWrap = false,
    wrapWidth = 0,
    resolution = PIXI_UI_GEOMETRY.sourceScale,
    stroke = null,
    letterSpacing = 0,
    label = 'textLabel',
  } = {}) {
    super();
    this.label = label;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.colorToken = color;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.fontFamily = fontFamily;
    this.lineHeight = lineHeight;
    this.align = align;
    this.wordWrap = wordWrap;
    this.wrapWidth = wrapWidth;
    this.strokeSource = stroke;
    this.stroke = stroke
      ? normalizePixiTextStroke(stroke, this.fontSize)
      : null;
    this.letterSpacing = letterSpacing;
    this.textObject = new Text({
      text: String(text ?? ''),
      anchor,
      resolution,
      roundPixels: true,
      style: this.createStyle(),
    });
    this.textObject.label = `${label}:text`;
    this.addChild(this.textObject);
  }

  createStyle() {
    const style = {
      fontFamily: this.fontFamily ?? this.theme.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontStyle: 'normal',
      fontVariant: 'normal',
      fill: this.resolveColor(),
      align: this.align,
      wordWrap: this.wordWrap,
      breakWords: false,
      whiteSpace: this.wordWrap ? 'normal' : 'pre',
      wordWrapWidth: Math.max(0, this.wrapWidth),
      leading: 0,
      letterSpacing: this.letterSpacing,
      padding: 0,
    };
    if (Number.isFinite(this.lineHeight)) {
      style.lineHeight = this.lineHeight;
    }
    if (this.stroke) {
      style.stroke = this.stroke;
    }
    return style;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.textObject.style = this.createStyle();
  }

  setText(text) {
    const value = String(text ?? '');
    if (this.textObject.text !== value) {
      this.textObject.text = value;
    }
    return this;
  }

  setColor(color) {
    this.colorToken = color;
    this.textObject.style.fill = this.resolveColor();
    return this;
  }

  setFontWeight(fontWeight) {
    this.fontWeight = fontWeight;
    this.textObject.style.fontWeight = fontWeight;
    return this;
  }

  setFontSize(fontSize) {
    this.fontSize = Number(fontSize);
    this.textObject.style.fontSize = this.fontSize;
    if (this.strokeSource) {
      this.stroke = normalizePixiTextStroke(
        this.strokeSource,
        this.fontSize,
      );
      this.textObject.style.stroke = this.stroke;
    }
    return this;
  }

  setLineHeight(lineHeight) {
    this.lineHeight = Number(lineHeight);
    this.textObject.style.lineHeight = this.lineHeight;
    return this;
  }

  setAlign(align) {
    this.align = String(align || 'left');
    this.textObject.style.align = this.align;
    return this;
  }

  setFontFamily(fontFamily) {
    this.fontFamily = fontFamily || null;
    this.textObject.style.fontFamily = this.fontFamily ?? this.theme.fontFamily;
    return this;
  }

  setStroke(stroke) {
    this.strokeSource = stroke;
    this.stroke = stroke
      ? normalizePixiTextStroke(stroke, this.fontSize)
      : null;
    this.textObject.style.stroke = this.stroke;
    return this;
  }

  setWrapWidth(width) {
    this.wrapWidth = Math.max(0, Number(width) || 0);
    this.wordWrap = this.wrapWidth > 0;
    this.textObject.style.wordWrap = this.wordWrap;
    this.textObject.style.wordWrapWidth = this.wrapWidth;
    this.textObject.style.whiteSpace = this.wordWrap ? 'normal' : 'pre';
    return this;
  }

  setAnchor(x, y = x) {
    this.textObject.anchor.set(x, y);
    return this;
  }

  resolveColor() {
    if (typeof this.colorToken === 'function') {
      return this.colorToken(this.theme);
    }
    if (typeof this.colorToken === 'string' && this.colorToken in this.theme) {
      return this.theme[this.colorToken];
    }
    return this.colorToken ?? this.theme.text;
  }

  get text() {
    return this.textObject.text;
  }

  get measuredWidth() {
    return this.textObject.width;
  }

  get measuredHeight() {
    return this.textObject.height;
  }
}

export function normalizePixiTextStroke(
  stroke,
  fontSize = PIXI_UI_GEOMETRY.bodyFontSize,
) {
  if (typeof stroke === 'string' || typeof stroke === 'number') {
    return {
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(fontSize),
      join: 'round',
    };
  }
  return {
    color: PIXI_TEXT_STROKE_COLOR,
    width: resolvePixiTextStrokeWidth(fontSize),
    join: stroke.join ?? 'round',
  };
}
