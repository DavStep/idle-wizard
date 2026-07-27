import {
  PixiButton,
  PixiModalSurface,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';

const ONLINE_GATE_CONTENT_WIDTH = 260;
const ONLINE_GATE_CONTENT_HEIGHT = 80;
const ONLINE_GATE_ACTION_CONTENT_HEIGHT = 96;
const ONLINE_GATE_MIN_MESSAGE_TOP_OFFSET = 4;
const ONLINE_GATE_MESSAGE_ACTION_GAP = 12;

export class PixiOnlineGateView extends PixiModalSurface {
  constructor({
    assets,
    inputRouter,
    application,
    reload = () => globalThis.location?.reload?.(),
  } = {}) {
    super({
      assetManager: assets,
      title: '',
      contentWidth: ONLINE_GATE_CONTENT_WIDTH,
      contentHeight: 16,
      opaqueBackdrop: true,
      inputRouter,
      modalId: 'gate.online',
      label: 'onlineGate',
    });
    this.application = application;
    this.reload = reload;
    this.preferredLayer = 'interactionLocks';
    this.model = null;
    this.elapsedMs = 0;
    this.message = new PixiTextLabel({
      label: 'onlineGate:message',
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      wordWrap: true,
      wrapWidth: ONLINE_GATE_CONTENT_WIDTH,
    });
    this.progress = new PixiProgressBar({
      assetManager: assets,
      width: ONLINE_GATE_CONTENT_WIDTH,
      label: 'onlineGate:progress',
    });
    this.action = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: '',
      width: ONLINE_GATE_CONTENT_WIDTH,
      variant: 'yellow',
      label: 'onlineGate:action',
    });
    this.panel.content.addChild(this.message, this.progress, this.action);
    this.handleTick = (ticker) => this.tick(ticker.deltaMS);
  }

  onBind(viewModel = {}) {
    this.model = viewModel;
    this.panel.setTitle(viewModel.title ?? '');
    this.message.setText(viewModel.message ?? '');
    this.progress.visible = viewModel.progress === true;
    this.progress.renderable = this.progress.visible;
    this.action.visible = Boolean(viewModel.actionLabel && viewModel.onAction);
    this.action.renderable = this.action.visible;
    this.action
      .setText(viewModel.actionLabel ?? '')
      .setAction(viewModel.onAction ?? null)
      .setEnabled(this.action.visible);
    this.show();
    this.relayoutContent();
    this.syncTicker();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    const contentTheme =
      this.panel.getContentTheme?.() ?? theme;
    this.message.applyTheme(contentTheme);
    this.progress.applyTheme(contentTheme);
    this.action.applyTheme(contentTheme);
  }

  onActivate() {
    super.onActivate();
    this.syncTicker();
  }

  onDeactivate() {
    this.stopTicker();
    super.onDeactivate();
  }

  hide() {
    super.hide();
    this.stopTicker();
  }

  relayoutContent() {
    const measuredMessageHeight = Math.max(0, this.message.measuredHeight);
    const messageHeight = Math.max(16, measuredMessageHeight);
    let messageY = Math.max(
      0,
      (ONLINE_GATE_CONTENT_HEIGHT - measuredMessageHeight) / 2,
    );
    let y = ONLINE_GATE_CONTENT_HEIGHT;
    if (this.action.visible) {
      messageY = ONLINE_GATE_MIN_MESSAGE_TOP_OFFSET;
      y = messageY + messageHeight;
      if (this.progress.visible) {
        y += 12;
        this.progress.position.set(0, y);
        y += this.progress.barHeight;
      }
      const actionY = Math.max(
        y + ONLINE_GATE_MESSAGE_ACTION_GAP,
        ONLINE_GATE_ACTION_CONTENT_HEIGHT - this.action.buttonHeight,
      );
      const centeredMessageY = (actionY - messageHeight) / 2;
      const maximumMessageY =
        actionY - ONLINE_GATE_MESSAGE_ACTION_GAP - messageHeight;
      messageY = Math.max(
        ONLINE_GATE_MIN_MESSAGE_TOP_OFFSET,
        Math.min(centeredMessageY, maximumMessageY),
      );
      this.action.position.set(0, actionY);
      y = actionY + this.action.buttonHeight;
    } else if (this.progress.visible) {
      this.progress.position.set(
        0,
        ONLINE_GATE_CONTENT_HEIGHT - this.progress.barHeight,
      );
    }
    this.message.position.set(ONLINE_GATE_CONTENT_WIDTH / 2, messageY);
    this.panel.setContentBoxSize(
      ONLINE_GATE_CONTENT_WIDTH,
      y,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.panel.pivot.set(this.panel.outerWidth / 2, this.panel.outerHeight / 2);
    this.onLayout(this.viewportProjection);
  }

  tick(deltaMs) {
    if (!this.progress.visible) {
      return;
    }
    this.elapsedMs = (this.elapsedMs + (Number(deltaMs) || 0)) % 1100;
    const translated = -0.4 + (this.elapsedMs / 1100) * 1.4;
    this.progress.setRange(
      Math.max(0, translated),
      Math.min(1, translated + 0.4),
    );
  }

  syncTicker() {
    this.stopTicker();
    if (this.active && this.shown && this.progress.visible) {
      this.application?.ticker?.add?.(this.handleTick);
    }
  }

  stopTicker() {
    this.application?.ticker?.remove?.(this.handleTick);
  }
}
