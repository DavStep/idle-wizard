import {
  Container,
  FillGradient,
  Graphics,
  Sprite,
} from 'pixi.js';

import {
  PixiTextButton,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  createPixiThemeSnapshot,
  PIXI_FONT_FAMILIES,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { getClientReleaseVersion } from '../../../../shared/clientReleaseVersion.js';

const SPLASH_TEXTURE_ID =
  'source:assets/ui/idle-witch-craft-splash/splash-screen.png';
const SPLASH_IMAGE_ASPECT = 818 / 1923;
const SPLASH_BAR_WIDTH_RATIO = 0.84;
const SPLASH_BAR_BOTTOM_RATIO = 0.0465;
const SPLASH_STATUS_BAR_GAP = 10;
const SPLASH_LABEL_STATUS_GAP = 17;
const SPLASH_VERSION_INSET = 12;
const SPLASH_IDENTITY_GAP = 6;
const SPLASH_IDENTITY_COPY_WIDTH = 58;
const SPLASH_IDENTITY_COPY_HEIGHT = 24;
const SPLASH_PROGRESS_THEME = createPixiThemeSnapshot({
  progressBar: 'gradient',
});

export class PixiLoadingSplash extends Container {
  constructor({ assets, inputRouter = null, getUserId = () => '' } = {}) {
    super({ label: 'loadingSplash' });
    this.assets = assets;
    this.projection = null;
    this.progressValue = 0;
    this.progressRange = null;
    this.userId = null;
    this.getUserId =
      typeof getUserId === 'function' ? getUserId : () => '';
    this.background = new Graphics({
      label: 'loadingSplash:background',
    });
    this.art = new Sprite({
      texture: assets.getTexture(SPLASH_TEXTURE_ID, { allowPartial: true }),
      label: 'loadingSplash:art',
    });
    this.art.anchor.set(0.5, 0);
    this.verticalShade = new Graphics({
      label: 'loadingSplash:verticalShade',
    });
    this.horizontalShade = new Graphics({
      label: 'loadingSplash:horizontalShade',
    });
    this.loadingLabel = new PixiTextLabel({
      text: 'Loading',
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'normal',
      fontFamily: PIXI_FONT_FAMILIES['lilita-one'],
      anchor: { x: 0.5, y: 0.5 },
      align: 'center',
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:label',
    });
    this.statusLabel = new PixiTextLabel({
      text: 'Loading assets...',
      fontSize: 10,
      fontWeight: 'normal',
      fontFamily: PIXI_FONT_FAMILIES['lilita-one'],
      anchor: { x: 0.5, y: 0.5 },
      align: 'center',
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:status',
    });
    this.versionLabel = new PixiTextLabel({
      text: `v${getClientReleaseVersion()}`,
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'normal',
      fontFamily: PIXI_FONT_FAMILIES['lilita-one'],
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:version',
    });
    this.userIdLabel = new PixiTextLabel({
      fontSize: 10,
      fontFamily: PIXI_FONT_FAMILIES['lilita-one'],
      anchor: { x: 1, y: 0.5 },
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:userId',
    });
    this.inputRouter = inputRouter;
    this.copyButton = null;
    this.progressBar = new PixiProgressBar({
      assetManager: assets,
      width: 0,
      height: PIXI_UI_GEOMETRY.progressTotalHeight,
      allowPartialAssets: true,
      label: 'loadingSplash:progress',
    });
    this.progressBar.applyTheme(SPLASH_PROGRESS_THEME);
    this.verticalGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: '#05030a38' },
        { offset: 0.22, color: '#05030a00' },
        { offset: 0.66, color: '#05030a00' },
        { offset: 0.88, color: '#07040e57' },
        { offset: 1, color: '#05030ac2' },
      ],
    });
    this.horizontalGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: '#05030a61' },
        { offset: 0.13, color: '#05030a00' },
        { offset: 0.87, color: '#05030a00' },
        { offset: 1, color: '#05030a61' },
      ],
    });
    this.addChild(
      this.background,
      this.art,
      this.verticalShade,
      this.horizontalShade,
      this.versionLabel,
      this.userIdLabel,
      this.loadingLabel,
      this.statusLabel,
      this.progressBar,
    );
    this.syncUserIdentity();
  }

  setText(text) {
    return this.setStatus(text);
  }

  setStatus(text) {
    this.statusLabel.setText(text ?? 'Loading assets...');
    this.syncUserIdentity();
    return this;
  }

  setProgress(value) {
    this.progressRange = null;
    this.progressValue = Math.max(0, Math.min(1, Number(value) || 0));
    this.progressBar.setProgress(this.progressValue);
    this.syncUserIdentity();
    return this;
  }

  setProgressRange(start, end) {
    const normalizedStart = Math.max(0, Math.min(1, Number(start) || 0));
    const normalizedEnd = Math.max(
      normalizedStart,
      Math.min(1, Number(end) || 0),
    );
    this.progressRange = {
      start: normalizedStart,
      end: normalizedEnd,
    };
    this.progressBar.setRange(normalizedStart, normalizedEnd);
    this.syncUserIdentity();
    return this;
  }

  applyTheme(theme) {
    this.loadingLabel.applyTheme(theme);
    this.statusLabel.applyTheme(theme);
    this.versionLabel.applyTheme(theme);
    this.userIdLabel.applyTheme(theme);
    this.copyButton?.applyTheme(theme);
    this.progressBar.applyTheme({
      ...theme,
      progress: SPLASH_PROGRESS_THEME.progress,
    });
  }

  layout(projection) {
    if (!projection) {
      return;
    }
    this.projection = projection;
    this.syncUserIdentity();
    const sourceStageWidth =
      projection.stageLogicalWidth / projection.sourceScale;
    const sourceHeight = projection.sourceHeight;
    const sourceOffsetX = projection.sourceOffsetX;
    const artWidth = PIXI_UI_GEOMETRY.sourceWidth;
    const artLeft = PIXI_UI_GEOMETRY.sourceWidth / 2 - artWidth / 2;
    const barWidth = artWidth * SPLASH_BAR_WIDTH_RATIO;
    const barHeight = PIXI_UI_GEOMETRY.progressTotalHeight;
    const barX = PIXI_UI_GEOMETRY.sourceWidth / 2 - barWidth / 2;
    const barY = sourceHeight * (1 - SPLASH_BAR_BOTTOM_RATIO) - barHeight;
    const statusY = barY - SPLASH_STATUS_BAR_GAP;
    const labelY = statusY - SPLASH_LABEL_STATUS_GAP;
    const safeTop =
      Math.max(0, Number(projection.safeInsets?.top) || 0) /
      Math.max(Number(projection.uiScale) || 1, Number.EPSILON);

    this.background
      .clear()
      .rect(-sourceOffsetX, 0, sourceStageWidth, sourceHeight)
      .fill('#07040e');
    this.art.position.set(PIXI_UI_GEOMETRY.sourceWidth / 2, 0);
    this.art.width = artWidth;
    this.art.height = artWidth / SPLASH_IMAGE_ASPECT;
    this.verticalShade
      .clear()
      .rect(artLeft, 0, artWidth, sourceHeight)
      .fill(this.verticalGradient);
    this.horizontalShade
      .clear()
      .rect(artLeft, 0, artWidth, sourceHeight)
      .fill(this.horizontalGradient);
    this.versionLabel.position.set(
      artLeft + SPLASH_VERSION_INSET,
      safeTop + SPLASH_VERSION_INSET,
    );
    const copyX =
      artLeft + artWidth - SPLASH_VERSION_INSET - SPLASH_IDENTITY_COPY_WIDTH;
    this.copyButton?.position.set(copyX, SPLASH_VERSION_INSET);
    this.userIdLabel.position.set(
      copyX - SPLASH_IDENTITY_GAP,
      SPLASH_VERSION_INSET + SPLASH_IDENTITY_COPY_HEIGHT / 2,
    );
    this.loadingLabel.position.set(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
      labelY,
    );
    this.statusLabel.position.set(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
      statusY,
    );
    this.progressBar.position.set(barX, barY);
    this.progressBar.setSize(barWidth, barHeight);
    if (this.progressRange) {
      this.progressBar.setRange(
        this.progressRange.start,
        this.progressRange.end,
      );
    } else {
      this.progressBar.setProgress(this.progressValue);
    }
  }

  syncUserIdentity() {
    const userId = normalizeUserId(this.getUserId());
    if (userId === this.userId && (!userId || this.copyButton)) {
      return;
    }
    this.userId = userId;
    const hasUserId = Boolean(userId);
    if (hasUserId && !this.copyButton && this.assets?.loaded !== false) {
      this.copyButton = new PixiTextButton({
        assetManager: this.assets,
        inputRouter: this.inputRouter,
        text: 'Copy',
        width: SPLASH_IDENTITY_COPY_WIDTH,
        height: SPLASH_IDENTITY_COPY_HEIGHT,
        sizeTier: 30,
        variant: 'yellow',
        action: () => this.copyUserId(),
        label: 'loadingSplash:copy',
      });
      this.addChild(this.copyButton);
      if (this.projection) {
        this.layout(this.projection);
      }
    }
    this.userIdLabel.setText(hasUserId ? compactIdentity(userId) : '');
    const identityReady = hasUserId && Boolean(this.copyButton);
    this.copyButton
      ?.setText('Copy')
      .setEnabled(identityReady);
    this.userIdLabel.visible = identityReady;
    this.userIdLabel.renderable = identityReady;
    if (this.copyButton) {
      this.copyButton.visible = identityReady;
      this.copyButton.renderable = identityReady;
    }
  }

  async copyUserId() {
    if (!this.userId || !this.copyButton || this.copyButton.copyPending) {
      return false;
    }
    this.copyButton.copyPending = true;
    this.copyButton.setText('...');
    const copied = await copyTextToClipboard(this.userId);
    this.copyButton.copyPending = false;
    this.copyButton
      .setText(copied ? 'Copied' : 'Retry')
      .setEnabled(true);
    return copied;
  }

  destroy(options) {
    this.verticalGradient.destroy();
    this.horizontalGradient.destroy();
    super.destroy(options);
  }
}

function compactIdentity(identity) {
  const value = String(identity ?? '').trim();
  if (value.length <= 22) {
    return value;
  }
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function normalizeUserId(identity) {
  if (!identity) {
    return '';
  }
  if (typeof identity === 'string') {
    return identity.trim();
  }
  if (typeof identity.toHexString === 'function') {
    try {
      return String(identity.toHexString()).trim();
    } catch {
      return '';
    }
  }
  return String(identity).trim();
}

async function copyTextToClipboard(text) {
  const clipboard = globalThis.navigator?.clipboard;
  if (typeof clipboard?.writeText !== 'function') {
    return false;
  }
  try {
    await clipboard.writeText(String(text ?? ''));
    return true;
  } catch {
    return false;
  }
}
