import { Rectangle } from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_TEXT_STYLES,
  RetainedPanel,
  applyTextTheme,
  createRetainedInputId,
  createText,
  normalizeRows,
  setText,
} from '../../pages/workshop/RetainedPageKit.js';

const WORLD_CHAT_TITLE = 'World Chat';
const WORLD_CHAT_TITLE_STROKE = '#0a0a0a';

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
    this.panel = new RetainedPanel({
      assetManager: assets,
      label: WORLD_CHAT_TITLE,
      panelLabel: 'global-world-chat-preview',
    });
    this.preview = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        10,
    });
    this.preview.style.whiteSpace = 'pre-line';
    this.panel.body.addChild(this.preview);
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
    setText(
      this.preview,
      model.preview ??
        normalizeRows(model.messages)
          .slice(-2)
          .map((message) => message.text ?? message.body ?? '')
          .join('\n'),
    );
    this.root.visible = model.visible !== false;
    this.root.renderable = model.visible !== false;
    this.root.eventMode = model.visible === false ? 'none' : 'passive';
  }

  onApplyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(resolvedTheme);
    this.applyTitleStroke();
    applyTextTheme(this.preview, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        10,
    });
    this.preview.style.whiteSpace = 'pre-line';
  }

  applyTitleStroke() {
    this.panel.title.style.stroke = {
      color: WORLD_CHAT_TITLE_STROKE,
      width: 2,
      join: 'round',
    };
  }

  onLayout() {
    this.layoutChat();
  }

  onActivate() {
    this.onBind(this.model);
  }

  onDestroy() {
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
      PIXI_UI_GEOMETRY.roomChromeEdge,
      sourceHeight - PIXI_UI_GEOMETRY.roomChatBottom - height,
      width,
      height,
    );
    this.applyTitleStroke();
    this.preview.position.set(5, 4);
    this.panel.root.hitArea = new Rectangle(0, 0, width, height);
  }
}
