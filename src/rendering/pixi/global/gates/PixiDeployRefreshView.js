import {
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';

export class PixiDeployRefreshView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: 'new version',
      contentWidth: 260,
      contentHeight: 16,
      opaqueBackdrop: true,
      inputRouter,
      modalId: 'gate.deployRefresh',
      label: 'deployRefresh',
    });
    this.message = new PixiTextLabel({
      text: 'refreshing...',
      label: 'deployRefresh:message',
    });
    this.panel.content.addChild(this.message);
    this.preferredLayer = 'interactionLocks';
  }

  onBind(model = {}) {
    this.panel.setTitle(model.title ?? 'new version');
    this.message.setText(model.message ?? 'refreshing...');
    this.show();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    this.message.applyTheme(
      this.panel.getContentTheme?.() ?? theme,
    );
  }
}
