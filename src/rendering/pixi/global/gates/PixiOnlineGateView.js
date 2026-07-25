import {
  PixiButton,
  PixiModalSurface,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';

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
      contentWidth: 260,
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
    this.message = new PixiTextLabel({ label: 'onlineGate:message' });
    this.progress = new PixiProgressBar({
      assetManager: assets,
      width: 260,
      label: 'onlineGate:progress',
    });
    this.action = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: '',
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
    let y = 0;
    this.message.position.set(0, y);
    y += Math.max(16, this.message.measuredHeight);
    if (this.progress.visible) {
      y += 12;
      this.progress.position.set(0, y);
      y += this.progress.barHeight;
    }
    if (this.action.visible) {
      y += 12;
      this.action.position.set(0, y);
      y += this.action.buttonHeight;
    }
    this.panel.setContentSize(260, y);
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
