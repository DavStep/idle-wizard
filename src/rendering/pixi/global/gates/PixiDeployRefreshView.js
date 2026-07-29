import {
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';

const DEPLOY_REFRESH_CONTENT_WIDTH = 260;
const DEPLOY_REFRESH_CONTENT_HEIGHT = 80;
const DEPLOY_REFRESH_TITLE = 'New Version';
const DEPLOY_REFRESH_MESSAGE = 'Refreshing...';

export class PixiDeployRefreshView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: DEPLOY_REFRESH_TITLE,
      contentWidth: DEPLOY_REFRESH_CONTENT_WIDTH,
      contentHeight: DEPLOY_REFRESH_CONTENT_HEIGHT,
      opaqueBackdrop: true,
      inputRouter,
      modalId: 'gate.deployRefresh',
      label: 'deployRefresh',
    });
    this.message = new PixiTextLabel({
      text: DEPLOY_REFRESH_MESSAGE,
      align: 'center',
      anchor: { x: 0.5, y: 0.5 },
      wordWrap: true,
      wrapWidth: DEPLOY_REFRESH_CONTENT_WIDTH,
      label: 'deployRefresh:message',
    });
    this.message.position.set(
      DEPLOY_REFRESH_CONTENT_WIDTH / 2,
      DEPLOY_REFRESH_CONTENT_HEIGHT / 2,
    );
    this.panel.content.addChild(this.message);
    this.preferredLayer = 'interactionLocks';
  }

  onBind(model = {}) {
    this.panel.setTitle(model.title ?? DEPLOY_REFRESH_TITLE);
    this.message.setText(model.message ?? DEPLOY_REFRESH_MESSAGE);
    this.show();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    this.message.applyTheme(
      this.panel.getContentTheme?.() ?? theme,
    );
  }
}
