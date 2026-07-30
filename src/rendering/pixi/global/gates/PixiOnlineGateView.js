import {
  PixiButton,
  PixiModalSurface,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import { PixiLoadingSplash } from './PixiLoadingSplash.js';

const ONLINE_GATE_CONTENT_WIDTH = 260;
const ONLINE_GATE_CONTENT_HEIGHT = 80;
const ONLINE_GATE_ACTION_CONTENT_HEIGHT = 96;
const ONLINE_GATE_MIN_MESSAGE_TOP_OFFSET = 4;
const ONLINE_GATE_MESSAGE_ACTION_GAP = 12;
const ONLINE_GATE_PRESENTATION_DIALOG = 'dialog';
const ONLINE_GATE_PRESENTATION_SPLASH = 'splash';
const SPLASH_PROGRESS_DURATION_MS = 3000;
const SPLASH_PROGRESS_KEYFRAMES = Object.freeze([
  Object.freeze({ time: 0, value: 0 }),
  Object.freeze({ time: 0.54, value: 0.72 }),
  Object.freeze({ time: 0.82, value: 0.92 }),
  Object.freeze({ time: 1, value: 1 }),
]);

export class PixiOnlineGateView extends PixiModalSurface {
  constructor({
    assets,
    inputRouter,
    application,
    onSplashViewportChange = null,
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
    this.onSplashViewportChange =
      typeof onSplashViewportChange === 'function'
        ? onSplashViewportChange
        : null;
    this.splashViewportActive = false;
    this.reload = reload;
    this.preferredLayer = 'interactionLocks';
    this.model = null;
    this.presentation = ONLINE_GATE_PRESENTATION_DIALOG;
    this.elapsedMs = 0;
    this.splashProgressValue = 0;
    this.splash = new PixiLoadingSplash({ assets });
    this.root.removeChild(this.panel);
    this.root.addChild(this.splash, this.panel);
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
    const previousPresentation = this.presentation;
    this.model = viewModel;
    this.presentation =
      viewModel.presentation === ONLINE_GATE_PRESENTATION_SPLASH
        ? ONLINE_GATE_PRESENTATION_SPLASH
        : ONLINE_GATE_PRESENTATION_DIALOG;
    this.syncPresentation();

    if (this.presentation === ONLINE_GATE_PRESENTATION_SPLASH) {
      this.splash.setText(viewModel.message ?? 'Loading game');
      if (
        previousPresentation !== ONLINE_GATE_PRESENTATION_SPLASH ||
        !this.shown
      ) {
        this.elapsedMs = 0;
        this.splashProgressValue = prefersReducedMotion() ? 1 : 0;
        this.splash.setProgress(this.splashProgressValue);
      }
      this.show();
      this.layoutSplash();
      this.syncTicker();
      return;
    }

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
    this.progress.applyTheme({
      ...contentTheme,
      progressKey: theme?.progressKey ?? contentTheme.progressKey,
      progress: theme?.progress ?? contentTheme.progress,
    });
    this.action.applyTheme(contentTheme);
    this.splash.applyTheme(theme);
  }

  onLayout(projection) {
    super.onLayout(projection);
    this.layoutSplash();
  }

  onActivate() {
    super.onActivate();
    this.syncSplashViewport();
    this.syncTicker();
  }

  onDeactivate() {
    this.setSplashViewportActive(false);
    this.stopTicker();
    super.onDeactivate();
  }

  show() {
    super.show();
    this.syncSplashViewport();
  }

  hide() {
    super.hide();
    this.setSplashViewportActive(false);
    this.stopTicker();
  }

  syncPresentation() {
    const splashVisible =
      this.presentation === ONLINE_GATE_PRESENTATION_SPLASH;
    this.splash.visible = splashVisible;
    this.splash.renderable = splashVisible;
    this.panel.visible = !splashVisible;
    this.panel.renderable = !splashVisible;
    this.syncSplashViewport();
  }

  syncSplashViewport() {
    this.setSplashViewportActive(
      this.shown &&
        this.presentation === ONLINE_GATE_PRESENTATION_SPLASH,
    );
  }

  setSplashViewportActive(active) {
    const nextActive = active === true;
    if (this.splashViewportActive === nextActive) {
      return;
    }
    this.splashViewportActive = nextActive;
    this.onSplashViewportChange?.(nextActive);
  }

  layoutSplash() {
    this.splash.layout(this.viewportProjection);
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
    if (this.presentation === ONLINE_GATE_PRESENTATION_SPLASH) {
      if (this.splashProgressValue >= 1) {
        return;
      }
      this.elapsedMs = Math.min(
        SPLASH_PROGRESS_DURATION_MS,
        this.elapsedMs + (Number(deltaMs) || 0),
      );
      this.splashProgressValue = sampleSplashProgress(
        this.elapsedMs / SPLASH_PROGRESS_DURATION_MS,
      );
      this.splash.setProgress(this.splashProgressValue);
      return;
    }

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
    if (
      this.active &&
      this.shown &&
      (this.presentation === ONLINE_GATE_PRESENTATION_SPLASH ||
        this.progress.visible)
    ) {
      this.application?.ticker?.add?.(this.handleTick);
    }
  }

  stopTicker() {
    this.application?.ticker?.remove?.(this.handleTick);
  }

  onDestroy() {
    this.setSplashViewportActive(false);
    super.onDestroy();
  }
}

export function sampleSplashProgress(progress) {
  const normalizedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  for (let index = 1; index < SPLASH_PROGRESS_KEYFRAMES.length; index += 1) {
    const previous = SPLASH_PROGRESS_KEYFRAMES[index - 1];
    const next = SPLASH_PROGRESS_KEYFRAMES[index];
    if (normalizedProgress > next.time) {
      continue;
    }
    const span = next.time - previous.time;
    const localProgress =
      span > 0 ? (normalizedProgress - previous.time) / span : 1;
    return previous.value + (next.value - previous.value) * localProgress;
  }
  return 1;
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}
