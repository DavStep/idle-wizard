import {
  CanvasTextMetrics,
  Container,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';

const DEFAULT_STYLE = Object.freeze({
  fontFamily: 'Arial',
  fontSize: 13,
  fontWeight: '400',
  fill: '#ffffff',
  lineHeight: 13,
  align: 'left',
  leading: 0,
  letterSpacing: 0,
  padding: 0,
});

/**
 * Retained inline flow for ordered text, icon, and resolved widget runs.
 *
 * Inline visuals occupy their real rendered width, so adjacent text wraps
 * around them instead of relying on an overpainted placeholder glyph.
 */
export class PixiInlineText extends Container {
  constructor({
    label = 'inline-text',
    runs = [],
    style = DEFAULT_STYLE,
    wrapWidth = 0,
    resolution = 3,
  } = {}) {
    super({ label });
    this.resolution = Math.max(1, Number(resolution) || 1);
    this.wrapWidth = Math.max(0, Number(wrapWidth) || 0);
    this.runs = [];
    this.textObjects = [];
    this.iconObjects = [];
    this.widgetObjects = [];
    this.visibleTextCount = 0;
    this.visibleIconCount = 0;
    this.visibleWidgetObjects = new Set();
    this.layoutWidth = 0;
    this.layoutHeight = 0;
    this._style = normalizeInlineTextStyle(style);
    this.setRuns(runs);
  }

  get style() {
    return this._style;
  }

  set style(style) {
    this.setStyle(style);
  }

  get text() {
    return this.runs
      .map((run) =>
        run.kind === 'icon' || run.kind === 'widget'
          ? String(run.fallbackText ?? '')
          : String(run.text ?? ''),
      )
      .join('');
  }

  set text(text) {
    this.setRuns([{ kind: 'text', text: String(text ?? '') }]);
  }

  setStyle(style = DEFAULT_STYLE) {
    this._style = normalizeInlineTextStyle(style);
    this.layout();
    return this;
  }

  setWrapWidth(width) {
    const nextWidth = Math.max(0, Number(width) || 0);
    if (this.wrapWidth !== nextWidth) {
      this.wrapWidth = nextWidth;
      this.layout();
    }
    return this;
  }

  setRuns(runs = []) {
    this.runs = normalizeInlineRuns(runs);
    this.layout();
    return this;
  }

  layout() {
    this.visibleTextCount = 0;
    this.visibleIconCount = 0;
    this.visibleWidgetObjects.clear();
    const renderStyle = createRenderableTextStyle(this._style);
    const baseLineHeight = Math.max(
      1,
      Number(renderStyle.lineHeight) ||
        Number(renderStyle.fontSize) ||
        DEFAULT_STYLE.lineHeight,
    );
    const lines = [];
    let line = createLine(baseLineHeight);
    let pendingWhitespace = '';

    const pushLine = () => {
      lines.push(line);
      line = createLine(baseLineHeight);
      pendingWhitespace = '';
    };

    for (const [runIndex, run] of this.runs.entries()) {
      const runStyle = run.style
        ? createRenderableTextStyle({ ...this._style, ...run.style })
        : renderStyle;
      if (run.kind === 'icon' || run.kind === 'widget') {
        const inlineVisual =
          run.kind === 'icon'
            ? this.acquireIcon(run)
            : this.acquireWidget(run);
        if (!inlineVisual) {
          this.appendTextTokens(
            String(run.fallbackText ?? ''),
            runStyle,
            baseLineHeight,
            {
              getLine: () => line,
              getPendingWhitespace: () => pendingWhitespace,
              runIndex,
              pushLine,
              setPendingWhitespace: (value) => {
                pendingWhitespace = value;
              },
            },
          );
          continue;
        }

        const metrics = measureInlineVisual(inlineVisual, run);
        const { height, width } = metrics;
        const gap =
          line.items.length > 0
            ? measureInlineText(pendingWhitespace, renderStyle)
            : 0;
        if (
          line.items.length > 0 &&
          this.wrapWidth > 0 &&
          line.width + gap + width > this.wrapWidth
        ) {
          pushLine();
        }
        const x =
          line.width +
          (line.items.length > 0
            ? measureInlineText(pendingWhitespace, renderStyle)
            : 0);
        line.items.push({
          displayObject: inlineVisual,
          height,
          kind: run.kind,
          offsetX: metrics.offsetX,
          offsetY: Number(run.offsetY) || 0,
          width,
          x,
        });
        line.width = x + width;
        line.height = Math.max(line.height, height);
        pendingWhitespace = '';
        continue;
      }

      this.appendTextTokens(
        run.text,
        runStyle,
        baseLineHeight,
        {
          getLine: () => line,
          getPendingWhitespace: () => pendingWhitespace,
          runIndex,
          pushLine,
          setPendingWhitespace: (value) => {
            pendingWhitespace = value;
          },
        },
      );
    }

    if (line.items.length > 0 || lines.length === 0) {
      lines.push(line);
    }

    let y = 0;
    this.layoutWidth = 0;
    const hasContent = lines.some((candidate) => candidate.items.length > 0);
    for (const currentLine of lines) {
      for (const item of currentLine.items) {
        if (item.kind !== 'text') {
          continue;
        }
        item.displayObject = this.acquireText(item.text, item.style);
        item.height = Math.max(baseLineHeight, item.displayObject.height);
        currentLine.height = Math.max(currentLine.height, item.height);
      }
    }
    for (const currentLine of lines) {
      if (!hasContent && currentLine.items.length === 0) {
        continue;
      }
      for (const item of currentLine.items) {
        if (item.kind === 'icon') {
          item.displayObject.position.set(
            item.x + item.width / 2,
            y + currentLine.height / 2 + item.offsetY,
          );
        } else if (item.kind === 'widget') {
          item.displayObject.position.set(
            item.x + item.offsetX,
            y + (currentLine.height - item.height) / 2 + item.offsetY,
          );
        } else {
          item.displayObject.position.set(
            item.x,
            y + Math.max(0, (currentLine.height - item.height) / 2),
          );
        }
      }
      this.layoutWidth = Math.max(this.layoutWidth, currentLine.width);
      y += currentLine.height;
    }
    this.layoutHeight = hasContent ? y : 0;

    this.hideUnusedObjects();
    return this;
  }

  appendTextTokens(
    text,
    renderStyle,
    baseLineHeight,
    {
      getLine,
      getPendingWhitespace,
      runIndex,
      pushLine,
      setPendingWhitespace,
    },
  ) {
    const tokens = String(text ?? '').match(/\r\n|\r|\n|[^\S\r\n]+|[^\s]+/gu) ?? [];

    for (const token of tokens) {
      if (/^(?:\r\n|\r|\n)$/u.test(token)) {
        pushLine();
        continue;
      }
      if (/^[^\S\r\n]+$/u.test(token)) {
        if (getLine().items.length > 0) {
          setPendingWhitespace(getPendingWhitespace() + token);
        }
        continue;
      }

      let line = getLine();
      const pending =
        line.items.length > 0 ? getPendingWhitespace() : '';
      const previousItem = line.items.at(-1);
      if (previousItem?.kind === 'text' && previousItem.runIndex === runIndex) {
        const nextText = `${previousItem.text}${pending}${token}`;
        const nextWidth = measureInlineText(nextText, renderStyle);
        if (
          this.wrapWidth <= 0 ||
          previousItem.x + nextWidth <= this.wrapWidth
        ) {
          previousItem.text = nextText;
          previousItem.width = nextWidth;
          line.width = previousItem.x + nextWidth;
          setPendingWhitespace('');
          continue;
        }
        pushLine();
        line = getLine();
      }

      const width = measureInlineText(token, renderStyle);
      const gap =
        line.items.length > 0
          ? measureInlineText(getPendingWhitespace(), renderStyle)
          : 0;
      if (
        line.items.length > 0 &&
        this.wrapWidth > 0 &&
        line.width + gap + width > this.wrapWidth
      ) {
        pushLine();
        line = getLine();
      }
      const x =
        line.width +
        (line.items.length > 0 ? gap : 0);
      line.items.push({
        kind: 'text',
        runIndex,
        style: renderStyle,
        text: token,
        width,
        x,
      });
      line.width = x + width;
      setPendingWhitespace('');
    }
  }

  acquireText(text, style) {
    const index = this.visibleTextCount++;
    let textObject = this.textObjects[index];
    if (!textObject) {
      textObject = new Text({
        text,
        resolution: this.resolution,
        roundPixels: true,
        style,
      });
      this.textObjects.push(textObject);
      this.addChild(textObject);
    } else {
      textObject.style = style;
      textObject.text = text;
    }
    textObject.label = `${this.label}:text:${index}`;
    textObject.visible = true;
    textObject.renderable = true;
    textObject.eventMode = 'none';
    return textObject;
  }

  acquireIcon(run) {
    const texture = run.texture ?? Texture.EMPTY;
    if (texture === Texture.EMPTY) {
      return null;
    }

    const index = this.visibleIconCount++;
    let icon = this.iconObjects[index];
    if (!icon) {
      icon = new Sprite({
        texture,
        roundPixels: true,
      });
      icon.anchor.set(0.5);
      this.iconObjects.push(icon);
      this.addChild(icon);
    } else {
      icon.texture = texture;
    }
    icon.label = `${this.label}:icon:${index}`;
    icon.eventMode = 'none';
    icon.visible = true;
    icon.renderable = true;
    fitInlineIcon(icon, run);
    return icon;
  }

  acquireWidget(run) {
    const widget = run.displayObject;
    if (!isInlineDisplayObject(widget) || this.visibleWidgetObjects.has(widget)) {
      return null;
    }

    if (widget.parent !== this) {
      this.addChild(widget);
    }
    if (!this.widgetObjects.includes(widget)) {
      this.widgetObjects.push(widget);
    }
    this.visibleWidgetObjects.add(widget);
    widget.label = run.label || widget.label;
    widget.visible = true;
    widget.renderable = true;
    return widget;
  }

  hideUnusedObjects() {
    for (let index = this.visibleTextCount; index < this.textObjects.length; index += 1) {
      this.textObjects[index].visible = false;
      this.textObjects[index].renderable = false;
    }
    for (let index = this.visibleIconCount; index < this.iconObjects.length; index += 1) {
      this.iconObjects[index].texture = Texture.EMPTY;
      this.iconObjects[index].visible = false;
      this.iconObjects[index].renderable = false;
    }
    for (const widget of this.widgetObjects) {
      if (this.visibleWidgetObjects.has(widget)) {
        continue;
      }
      widget.visible = false;
      widget.renderable = false;
    }
  }
}

function normalizeInlineTextStyle(style) {
  return {
    ...DEFAULT_STYLE,
    ...(style ?? {}),
  };
}

function createRenderableTextStyle(style) {
  return new TextStyle({
    ...style,
    breakWords: false,
    whiteSpace: 'pre',
    wordWrap: false,
    wordWrapWidth: 0,
  });
}

function measureInlineText(text, style) {
  if (!text) {
    return 0;
  }
  return CanvasTextMetrics.measureText(text, style).width;
}

function normalizeInlineRuns(runs) {
  const values = Array.isArray(runs) ? runs : [];
  return values
    .map((run) => {
      if (typeof run === 'string') {
        return { kind: 'text', text: run };
      }
      if (run?.kind === 'icon') {
        return {
          ...run,
          fallbackText: String(run.fallbackText ?? ''),
          kind: 'icon',
        };
      }
      if (run?.kind === 'widget') {
        return {
          ...run,
          fallbackText: String(run.fallbackText ?? ''),
          kind: 'widget',
        };
      }
      return {
        ...run,
        kind: 'text',
        text: String(run?.text ?? ''),
        style:
          run?.style && typeof run.style === 'object'
            ? { ...run.style }
            : null,
      };
    })
    .filter(
      (run) =>
        run.kind === 'icon' ||
        run.kind === 'widget' ||
        run.text.length > 0,
    );
}

function createLine(baseLineHeight) {
  return {
    height: baseLineHeight,
    items: [],
    width: 0,
  };
}

function fitInlineIcon(icon, run) {
  const bounds = icon.texture?.orig ?? icon.texture?.frame;
  const sourceWidth = Math.max(1, Number(bounds?.width) || 1);
  const sourceHeight = Math.max(1, Number(bounds?.height) || 1);
  const requestedSize = Math.max(1, Number(run.size) || 1);
  const width = Math.max(1, Number(run.width) || 0);
  const height = Math.max(1, Number(run.height) || 0);

  if (Number(run.width) > 0 && Number(run.height) > 0) {
    icon.width = width;
    icon.height = height;
    return;
  }

  const scale = requestedSize / Math.max(sourceWidth, sourceHeight);
  icon.width = sourceWidth * scale;
  icon.height = sourceHeight * scale;
}

function measureInlineVisual(displayObject, run) {
  if (run.kind === 'icon') {
    return {
      height: displayObject.height,
      offsetX: 0,
      width: displayObject.width,
    };
  }

  const bounds = displayObject.getLocalBounds();
  const sourceWidth = Math.max(1, Number(bounds.width) || 1);
  const sourceHeight = Math.max(1, Number(bounds.height) || 1);
  const requestedWidth = Math.max(0, Number(run.width) || 0);
  const requestedHeight = Math.max(0, Number(run.height) || 0);
  const requestedSize = Math.max(0, Number(run.size) || 0);

  if (requestedWidth > 0 && requestedHeight > 0) {
    displayObject.scale.set(
      requestedWidth / sourceWidth,
      requestedHeight / sourceHeight,
    );
  } else if (requestedSize > 0) {
    const scale = requestedSize / Math.max(sourceWidth, sourceHeight);
    displayObject.scale.set(scale);
  }

  const width = sourceWidth * Math.abs(displayObject.scale.x);
  const height = sourceHeight * Math.abs(displayObject.scale.y);
  return {
    height,
    offsetX: -Number(bounds.x || 0) * displayObject.scale.x,
    width,
  };
}

function isInlineDisplayObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value.position?.set &&
      value.scale?.set &&
      typeof value.getLocalBounds === 'function',
  );
}
