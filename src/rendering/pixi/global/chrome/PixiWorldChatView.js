import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { normalizePixiTextStroke } from '../../primitives/PixiTextLabel.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RetainedPanel,
  applyTextTheme,
  createRetainedInputId,
  createText,
  normalizeRows,
  setText,
} from '../../pages/workshop/RetainedPageKit.js';

const WORLD_CHAT_TITLE = 'World Chat';
const WORLD_CHAT_TITLE_STROKE = '#0a0a0a';
const WORLD_CHAT_PREVIEW_INSET_X = 10;
const WORLD_CHAT_PREVIEW_ROW_HEIGHT = 16;
const WORLD_CHAT_PREVIEW_AVATAR_SIZE = 14;
const WORLD_CHAT_PREVIEW_TEXT_GAP = 3;
const WORLD_CHAT_PREVIEW_OPTICAL_Y = 2;
const WORLD_CHAT_PREVIEW_TAG_COLORS = Object.freeze({
  ink: '#d4d4d4',
  red: '#d66f75',
  amber: '#d2a857',
  green: '#73ba7d',
  teal: '#6ab8b3',
  blue: '#7fa4d6',
  violet: '#a98ac8',
  magenta: '#cc82ae',
  brown: '#bb9070',
  slate: '#9ca5b4',
});
const PRESS_SCALE = 0.94;
const RELEASE_PEAK_SCALE = 1.055;
const RELEASE_DURATION_MS = 180;

/**
 * Shared room chrome for the compact world-chat preview.
 *
 * The full dialog remains registered by the Workshop page, while this opener
 * stays mounted above the bottom room tabs regardless of the active page.
 */
export class PixiWorldChatView extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter,
  } = {}) {
    super({ label: 'worldChat' });
    this.model = { visible: false };
    this.pressed = false;
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;
    this.panel = new RetainedPanel({
      assetManager: assets,
      label: WORLD_CHAT_TITLE,
      panelLabel: 'global-world-chat-preview',
    });
    this.preview = createText('', {
      fontSize: 12,
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        WORLD_CHAT_PREVIEW_INSET_X * 2,
    });
    this.preview.anchor.set(0, 0.5);
    this.preview.style.whiteSpace = 'pre-line';
    this.previewRows = [
      new CompactWorldChatPreviewRow({ assets }),
      new CompactWorldChatPreviewRow({ assets }),
    ];
    this.previewContent = new Container({
      label: 'global-world-chat-preview-content',
    });
    this.previewClip = new Graphics({
      label: 'global-world-chat-preview-clip',
    });
    this.previewContent.addChild(
      this.preview,
      ...this.previewRows.map((row) => row.root),
    );
    this.previewContent.mask = this.previewClip;
    this.panel.body.addChild(this.previewContent, this.previewClip);
    this.root.addChild(this.panel.root);
    this.panel.root.eventMode = 'static';
    this.panel.root.cursor = 'pointer';
    this.handleTap = () => this.model.onActivate?.() ?? true;
    this.inputRegistration =
      inputRouter?.registerPressTarget?.({
        id: createRetainedInputId('global-world-chat'),
        displayObject: this.panel.root,
        enabled: () =>
          this.active &&
          this.model.visible !== false &&
          this.panel.root.visible,
        excludePageSwipe: true,
        haptic: 'light',
        onPressChange: (pressed, context) =>
          this.setPressed(pressed, context),
        onActivate: this.handleTap,
      }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.panel.root.on('pointertap', this.handleTap);
    }

    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
    this.layoutChat();
  }

  onBind(model = {}) {
    this.model = model;
    this.panel.setTitle(
      model.label ?? model.channelLabel ?? WORLD_CHAT_TITLE,
    );
    this.applyTitleStroke();
    const messages = normalizeRows(model.messages)
      .slice(-2)
      .map(normalizePreviewMessage);
    const formattedPreview = messages.length
      ? messages.map(formatPreviewMessage).join('\n')
      : model.preview ?? '';
    setText(this.preview, formattedPreview);
    this.preview.visible = messages.length === 0;
    this.preview.renderable = messages.length === 0;
    this.previewRows.forEach((row, index) => {
      if (messages[index]) {
        row.bind(messages[index], this.theme);
      } else {
        row.reset();
      }
    });
    this.layoutPreviewContent();
    this.root.visible = model.visible !== false;
    this.root.renderable = model.visible !== false;
    this.root.eventMode = model.visible === false ? 'none' : 'passive';
  }

  onApplyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(resolvedTheme);
    this.applyTitleStroke();
    applyTextTheme(this.preview, resolvedTheme, {
      fontSize: 12,
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      fill: resolvedTheme.muted,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        WORLD_CHAT_PREVIEW_INSET_X * 2,
    });
    this.preview.style.whiteSpace = 'pre-line';
    this.previewRows.forEach((row) => row.applyTheme(resolvedTheme));
  }

  applyTitleStroke() {
    this.panel.title.style.stroke = normalizePixiTextStroke({
      color: WORLD_CHAT_TITLE_STROKE,
    }, this.panel.title.style.fontSize);
  }

  onLayout() {
    this.layoutChat();
  }

  onActivate() {
    this.onBind(this.model);
  }

  onDestroy() {
    this.cancelReleaseAnimation();
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.panel.root.off('pointertap', this.handleTap);
    }

    this.panel.destroy();
  }

  layoutChat() {
    const sourceWidth =
      this.viewportProjection?.sourceWidth ?? PIXI_UI_GEOMETRY.sourceWidth;
    const sourceHeight =
      this.viewportProjection?.sourceHeight ?? PIXI_UI_GEOMETRY.sourceHeight;
    const width = sourceWidth - PIXI_UI_GEOMETRY.roomChromeEdge * 2;
    const height = PIXI_UI_GEOMETRY.roomChatHeight;

    this.panel.setBounds(
      PIXI_UI_GEOMETRY.roomChromeEdge + width / 2,
      sourceHeight -
        PIXI_UI_GEOMETRY.roomChatBottom -
        height +
        height / 2,
      width,
      height,
    );
    this.panel.root.pivot.set(width / 2, height / 2);
    this.applyTitleStroke();
    this.preview.position.set(
      WORLD_CHAT_PREVIEW_INSET_X,
      height / 2 + WORLD_CHAT_PREVIEW_OPTICAL_Y,
    );
    this.previewClip
      .clear()
      .rect(
        WORLD_CHAT_PREVIEW_INSET_X,
        0,
        width - WORLD_CHAT_PREVIEW_INSET_X * 2,
        height,
      )
      .fill(0xffffff);
    this.layoutPreviewContent();
    this.panel.root.hitArea = new Rectangle(0, 0, width, height);
  }

  layoutPreviewContent() {
    const visibleRows = this.previewRows.filter((row) => row.root.visible);
    if (!visibleRows.length) {
      return;
    }

    const contentHeight = visibleRows.length * WORLD_CHAT_PREVIEW_ROW_HEIGHT;
    const startY =
      (this.panel.height - contentHeight) / 2 +
      WORLD_CHAT_PREVIEW_OPTICAL_Y;
    const rowWidth = Math.max(
      0,
      this.panel.width - WORLD_CHAT_PREVIEW_INSET_X * 2,
    );
    visibleRows.forEach((row, index) => {
      row.setBounds(
        WORLD_CHAT_PREVIEW_INSET_X,
        startY + index * WORLD_CHAT_PREVIEW_ROW_HEIGHT,
        rowWidth,
        WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      );
    });
  }

  setPressed(pressed, context = null) {
    const nextPressed =
      Boolean(pressed) &&
      this.active &&
      this.model.visible !== false &&
      this.panel.root.visible;

    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.panel.root.scale.set(PRESS_SCALE);
      return;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    if (
      wasPressed &&
      context?.confirmed === true &&
      !prefersReducedMotion()
    ) {
      this.startReleaseAnimation();
      return;
    }

    this.cancelReleaseAnimation();
    this.panel.root.scale.set(1);
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - this.releaseStartedAt;
      const progress = Math.min(
        1,
        Math.max(0, elapsed / RELEASE_DURATION_MS),
      );
      this.panel.root.scale.set(releaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = 0;
        this.panel.root.scale.set(1);
        return;
      }
      this.releaseFrame = requestFrame(tick);
    };
    this.releaseFrame = requestFrame(tick);
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame) {
      cancelFrame(this.releaseFrame);
      this.releaseFrame = 0;
    }
  }
}

class CompactWorldChatPreviewRow {
  constructor({ assets } = {}) {
    this.assets = assets;
    this.model = {};
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: 'global-world-chat-preview-row' });
    this.avatar = new Sprite(Texture.EMPTY);
    this.avatar.label = 'global-world-chat-preview-row:avatar';
    this.avatar.anchor.set(0.5);
    this.tag = createText('', {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
    });
    this.username = createText('', {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
    });
    this.body = createText('', {
      fontSize: 12,
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
    });
    this.root.addChild(this.avatar, this.tag, this.username, this.body);
    this.reset();
  }

  bind(model, theme) {
    this.model = model ?? {};
    this.isSystem = this.model.type === 'system';
    const tag = normalizePreviewAllianceTag(this.model.allianceTag);
    setText(this.tag, tag ? `[${tag}]` : '');
    setText(
      this.username,
      `${this.isSystem ? 'System' : this.model.username || 'Wizard'}:`,
    );
    setText(this.body, this.model.body ?? '');
    this.avatar.texture = this.isSystem
      ? Texture.EMPTY
      : resolvePreviewCharacterTexture(this.assets, this.model.character);
    this.avatar.visible = !this.isSystem;
    this.avatar.renderable = !this.isSystem;
    this.tag.visible = Boolean(tag);
    this.tag.renderable = Boolean(tag);
    this.root.visible = true;
    this.root.renderable = true;
    this.applyTheme(theme);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.avatar.position.set(
      WORLD_CHAT_PREVIEW_AVATAR_SIZE / 2,
      height / 2,
    );
    this.avatar.width = WORLD_CHAT_PREVIEW_AVATAR_SIZE;
    this.avatar.height = WORLD_CHAT_PREVIEW_AVATAR_SIZE;
    let contentX = this.avatar.visible
      ? WORLD_CHAT_PREVIEW_AVATAR_SIZE + 3
      : 0;
    this.tag.position.set(contentX, 0);
    if (this.tag.visible) {
      contentX += this.tag.width + 2;
    }
    this.username.position.set(contentX, 0);
    contentX += this.username.width + WORLD_CHAT_PREVIEW_TEXT_GAP;
    this.body.position.set(contentX, 0);
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  applyTheme(theme) {
    this.theme = theme ?? this.theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const tagColor = normalizePreviewAllianceTagColor(
      this.model.allianceTagColor,
    );
    applyTextTheme(this.tag, this.theme, {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      fill:
        tagColor === 'ink'
          ? this.theme.text
          : WORLD_CHAT_PREVIEW_TAG_COLORS[tagColor] ?? this.theme.text,
    });
    applyTextTheme(this.username, this.theme, {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      fill: this.isSystem ? this.theme.systemText : this.theme.text,
    });
    applyTextTheme(this.body, this.theme, {
      fontSize: 12,
      lineHeight: WORLD_CHAT_PREVIEW_ROW_HEIGHT,
      fill: this.theme.muted,
    });
  }

  reset() {
    this.model = {};
    this.isSystem = false;
    this.avatar.texture = Texture.EMPTY;
    setText(this.tag, '');
    setText(this.username, '');
    setText(this.body, '');
    this.root.visible = false;
    this.root.renderable = false;
  }
}

function normalizePreviewMessage(message = {}) {
  const sourceName = message.username ?? message.author ?? 'Wizard';
  const isSystem =
    message.type === 'system' ||
    String(sourceName).toLowerCase() === 'system';
  return {
    type: isSystem ? 'system' : 'player',
    username: isSystem ? 'System' : sourceName,
    body: message.body ?? message.message ?? message.text ?? '',
    character: message.character ?? 'elara',
    allianceTag: message.allianceTag ?? message.alliance_tag ?? '',
    allianceTagColor:
      message.allianceTagColor ?? message.alliance_tag_color ?? 'ink',
  };
}

function formatPreviewMessage(message) {
  const tag = normalizePreviewAllianceTag(message.allianceTag);
  const sender = `${tag ? `[${tag}] ` : ''}${message.username}`;
  return `${sender}: ${message.body}`;
}

function normalizePreviewAllianceTag(tag) {
  const normalized = String(tag ?? '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .toUpperCase();
  return /^[A-Z]{2,5}$/.test(normalized) ? normalized : '';
}

function normalizePreviewAllianceTagColor(color) {
  const normalized = String(color ?? '').trim().toLowerCase();
  return normalized in WORLD_CHAT_PREVIEW_TAG_COLORS
    ? normalized
    : 'ink';
}

function resolvePreviewCharacterTexture(assets, character) {
  const key = String(character ?? 'elara')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]/g, '');
  try {
    return (
      assets?.getTexture?.(
        `source:assets/avatars/${key || 'elara'}.png`,
      ) ??
      assets?.getTexture?.('source:assets/avatars/elara.png') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}

function releaseScale(progress) {
  if (progress <= 0.36) {
    return (
      PRESS_SCALE +
      (RELEASE_PEAK_SCALE - PRESS_SCALE) *
        easeOutCubic(progress / 0.36)
    );
  }
  return (
    RELEASE_PEAK_SCALE +
    (1 - RELEASE_PEAK_SCALE) *
      easeOutCubic((progress - 0.36) / 0.64)
  );
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(callback, 16) ?? 0;
}

function cancelFrame(frame) {
  if (!frame) {
    return;
  }
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frame);
    return;
  }
  globalThis.clearTimeout?.(frame);
}
