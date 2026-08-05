import {
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  PixiButton,
  PixiNineSliceFrame,
  PixiTextLabel,
} from '../../primitives/index.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  PooledDialogRows,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';
import {
  PooledCollection,
  WidgetPool,
} from '../../retained/index.js';
import {
  RETAINED_DIALOG_SCROLL_GEOMETRY,
  RetainedScrollArea,
} from '../../pages/workshop/RetainedPageKit.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const ANNOUNCEMENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const WHILE_AWAY_CONTENT_MAX_HEIGHT = 128;
const WHILE_AWAY_CONTENT_PADDING_TOP =
  RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop;
const ANNOUNCEMENT_BACKDROP_ALPHA = 0.68;
const LEVEL_REWARDS_BACKDROP_ALPHA = 0.88;
const LEVEL_REWARD_ROW_GAP = 6;
const LEVEL_REWARD_ROW_INSET_X = 5;
const RESEARCH_COMPLETE_ICON_TO_ROWS_GAP = 6;
const LEVEL_REWARD_ROW_TEXT_STROKE = Object.freeze({
  color: '#050505',
  width: 2,
});
const LEVEL_REWARD_BANNER_WIDTH = 300;
const LEVEL_REWARD_BANNER_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.height;
const LEVEL_REWARD_BANNER_TITLE_OFFSET_Y =
  PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.contentOffsetY;
const LEVEL_REWARD_BANNER_TITLE_COLOR = '#ffffff';
const LEVEL_REWARD_BANNER_TITLE_STROKE = '#160e19';
const LEVEL_REWARD_CONTINUE_GAP = 26;
const LEVEL_REWARD_CONTINUE_HEIGHT = 20;
const LEVEL_REWARD_CONTINUE_DELAY_MS = 120;
const LEVEL_REWARD_COUNT_DELAY_MS = 120;
const LEVEL_REWARD_COUNT_DURATION_MS = 560;
const CONFIRMATION_WIDTH = 260;
const UNLOCK_ITEM_WIDTH = 72;
const UNLOCK_ITEM_GAP_X = 4;
const UNLOCK_ITEM_GAP_Y = 10;
const UNLOCK_SINGLE_STAGE = Object.freeze({
  width: 86,
  height: 92,
  iconWidth: 76,
  iconHeight: 86,
});
const UNLOCK_COMPACT_STAGE = Object.freeze({
  width: 62,
  height: 64,
  iconWidth: 52,
  iconHeight: 60,
});
const PAGE_ICON_ART_SCALE = Object.freeze({
  brewing: 0.72,
  garden: 1,
  workshop: 0.84,
  research: 1.04,
  shop: 1,
  prestige: 0.9,
});
const ANNOUNCEMENT_EASE = Object.freeze([
  0.37, 0, 0.63, 1,
]);
const ANNOUNCEMENT_EASE_RUBBER = Object.freeze([
  0.39, 0.575, 0.565, 1,
]);
const ANNOUNCEMENT_MOTION_DEFAULTS = Object.freeze({
  overlayDurationMs: 225,
  panelDurationMs: 130,
  levelOverlayDurationMs: 140,
  levelPanelDurationMs: 205,
  levelTitleDelayMs: 1220,
  levelRowDelayMs: 1260,
  levelRowStaggerMs: 55,
  rowDurationMs: 215,
  researchTitleDurationMs: 260,
  researchSilhouetteDurationMs: 380,
  researchIconDurationMs: 390,
  researchIconDelayMs: 180,
  researchLabelDelayMs: 540,
  researchDetailDelayMs: 610,
  unlockIconStaggerMs: 45,
  fallbackIconDurationMs: 310,
});
const ANNOUNCEMENT_PANEL_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.99, x: 0, y: 5 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_BANNER_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.72, x: 0, y: 0 },
  { offset: 0.72, alpha: 1, scale: 1.04, x: 0, y: 0 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_PROMPT_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.99, x: 0, y: 3 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_RESEARCH_TITLE_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.86, x: 0, y: 8 },
  { offset: 0.62, alpha: 1, scale: 1.05, x: 0, y: -2 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_ROW_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.982, x: 0, y: 7 },
  { offset: 0.72, alpha: 1, scale: 1.012, x: 0, y: -2 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_SILHOUETTE_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.96, x: 0, y: 2 },
  { offset: 0.14, alpha: 0.9, scale: 1.02, x: -1, y: 0 },
  { offset: 0.26, alpha: 0.95, scale: 1.012, x: 1, y: -1 },
  { offset: 0.38, alpha: 0.9, scale: 1.018, x: -1, y: 1 },
  { offset: 0.52, alpha: 0.75, scale: 1, x: 1, y: 0 },
  { offset: 1, alpha: 0, scale: 0.982, x: 0, y: 0 },
]);
const ANNOUNCEMENT_ICON_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.82, x: 0, y: 4 },
  { offset: 0.44, alpha: 1, scale: 1.045, x: 0, y: -2 },
  { offset: 0.74, alpha: 1, scale: 0.992, x: 0, y: 1 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const ANNOUNCEMENT_FALLBACK_FRAMES = freezeMotionFrames([
  { offset: 0, alpha: 0, scale: 0.82, x: -8, y: 1 },
  { offset: 0.58, alpha: 1, scale: 1.08, x: 2, y: -1 },
  { offset: 1, alpha: 1, scale: 1, x: 0, y: 0 },
]);
const DISPLAY_MOTION_BASES = new WeakMap();

/**
 * Retained announcement surface. Progress and feature-unlock announcements
 * are full-screen compositions; report-style announcements opt into dialog
 * chrome.
 */
export class PixiAnnouncementSurface extends RetainedGlobalDialog {
  constructor({
    context,
    dialogId = 'global.announcement',
    motionRuntime =
      context?.announcementMotionRuntime ??
      context?.motionRuntime ??
      null,
  } = {}) {
    super({
      context,
      dialogId,
      title: '',
      contentWidth: ANNOUNCEMENT_WIDTH,
      contentHeight: 176,
      placement: 'center',
      includeClose: true,
      backdropAlpha: ANNOUNCEMENT_BACKDROP_ALPHA,
      label: `${dialogId}:announcementSurface`,
    });
    // Announcements use their own shorter panel motion and staged content
    // choreography from main, not the general 225ms dialog scale.
    this.openMotion = false;
    this.stopOpenMotion();
    this.requestAnnouncementFrame =
      motionRuntime?.requestFrame ?? requestFrame;
    this.cancelAnnouncementFrame =
      motionRuntime?.cancelFrame ?? cancelFrame;
    this.announcementMotionNow =
      motionRuntime?.now ?? now;
    this.announcementMotionReduced =
      motionRuntime?.prefersReducedMotion ??
      prefersReducedMotion;
    this.announcementMotionFrame = null;
    this.announcementMotionStartedAt = 0;
    this.announcementMotionDuration = 0;
    this.announcementPanelBaseX = 0;
    this.announcementPanelBaseY = 0;
    this.announcementHeadingBaseX = 0;
    this.announcementHeadingBaseY = 0;
    this.levelAdvanceReady = false;
    this.announcementMotionSample = {
      alpha: 1,
      scale: 1,
      x: 0,
      y: 0,
    };
    this.handleAnnouncementMotionFrame = () =>
      this.tickAnnouncementMotion();
    this.heading = new PixiTextLabel({
      fontSize: 20,
      fontWeight: 'bold',
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      label: `${dialogId}:heading`,
    });
    this.levelBannerLayer = new Container();
    this.levelBannerLayer.label = `${dialogId}:levelBanner`;
    this.levelBannerLayer.pivot.set(
      LEVEL_REWARD_BANNER_WIDTH / 2,
      LEVEL_REWARD_BANNER_HEIGHT / 2,
    );
    this.levelBannerFrame = new PixiNineSliceFrame({
      texture:
        this.context.assets?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.marketTitleRibbon,
        ) ?? Texture.EMPTY,
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.sourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.borderInsets,
      width: LEVEL_REWARD_BANNER_WIDTH,
      height: LEVEL_REWARD_BANNER_HEIGHT,
      label: `${dialogId}:levelBannerFrame`,
    });
    this.levelBannerTitle = new PixiTextLabel({
      fontSize:
        PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.titleFontSize,
      fontWeight: 'normal',
      lineHeight:
        PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.titleLineHeight,
      color: LEVEL_REWARD_BANNER_TITLE_COLOR,
      stroke: {
        color: LEVEL_REWARD_BANNER_TITLE_STROKE,
        width:
          PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.titleStroke,
      },
      align: 'center',
      anchor: { x: 0.5, y: 0.5 },
      label: `${dialogId}:levelBannerTitle`,
    });
    this.levelBannerTitle.position.set(
      LEVEL_REWARD_BANNER_WIDTH / 2,
      LEVEL_REWARD_BANNER_HEIGHT / 2 +
        LEVEL_REWARD_BANNER_TITLE_OFFSET_Y,
    );
    this.levelBannerLayer.addChild(
      this.levelBannerFrame,
      this.levelBannerTitle,
    );
    this.copy = new PixiTextLabel({
      align: 'center',
      wordWrap: true,
      wrapWidth: ANNOUNCEMENT_WIDTH,
      label: `${dialogId}:copy`,
    });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${dialogId}:rows`;
    this.levelRewardRowsBackingLayer = new Container();
    this.levelRewardRowsBackingLayer.label =
      `${dialogId}:levelRewardRowBackings`;
    this.levelRewardRowBackings = [];
    this.continuePrompt = new PixiTextLabel({
      text: 'Tap to continue',
      fontWeight: 'bold',
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      color: 'muted',
      stroke: LEVEL_REWARD_ROW_TEXT_STROKE,
      label: `${dialogId}:continuePrompt`,
    });
    this.reportScroll = new RetainedScrollArea({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      label: `${dialogId}:reportScroll`,
    });
    this.reportScroll.root.visible = false;
    this.reportScroll.root.renderable = false;
    this.unlockItemsLayer = new Container();
    this.unlockItemsLayer.label = `${dialogId}:unlockItems`;
    this.researchItemLayer = new Container();
    this.researchItemLayer.label = `${dialogId}:researchItem`;
    this.panel.content.addChild(
      this.levelBannerLayer,
      this.heading,
      this.copy,
      this.levelRewardRowsBackingLayer,
      this.rowsLayer,
      this.reportScroll.root,
      this.unlockItemsLayer,
      this.researchItemLayer,
      this.continuePrompt,
    );
    this.rows = new PooledDialogRows({
      assetManager: this.context.assets,
      parent: this.rowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} announcement rows`,
      maxSize: 40,
      theme: this.theme,
    });
    this.unlockItems = new FeatureUnlockAnnouncementItems({
      parent: this.unlockItemsLayer,
      assets: this.context.assets,
      counters: this.context.counters,
      name: `${dialogId} unlock items`,
      theme: this.theme,
    });
    this.researchItem = new FeatureUnlockAnnouncementItem({
      assets: this.context.assets,
      label: `${dialogId}:researchItem`,
      theme: this.theme,
    });
    this.researchItemLayer.addChild(this.researchItem.root);
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    if (this.announcementMotionFrame !== null) {
      this.stopAnnouncementMotion();
    }
    this.announcementModel = normalizeAnnouncementModel(viewModel);
    const model = this.announcementModel;
    const bannerRows = isBannerRowsAnnouncement(model);
    this.backdropAlpha =
      bannerRows
        ? LEVEL_REWARDS_BACKDROP_ALPHA
        : ANNOUNCEMENT_BACKDROP_ALPHA;
    this.redrawBackdrop(this.theme);
    this.panel.setTitle(model.framed ? model.title : '');
    this.copy.setText(model.copy);
    const featureUnlock = model.kind === 'unlock';
    const research = model.kind === 'research';
    const whileAway = model.kind === 'whileAway';
    const levelRewards =
      model.animation?.kind === 'level-rewards';
    this.heading.setText(
      model.framed || bannerRows ? '' : model.title,
    );
    this.levelBannerTitle.setText(
      bannerRows ? model.title : '',
    );
    this.levelAdvanceReady = false;
    this.backdrop.tint = bannerRows ? 0x000000 : 0xffffff;
    setDisplayObjectVisible(this.levelBannerLayer, bannerRows);
    setDisplayObjectVisible(
      this.levelRewardRowsBackingLayer,
      bannerRows,
    );
    setDisplayObjectVisible(this.continuePrompt, levelRewards);
    this.continuePrompt.setText(
      model.continueLabel || 'Tap to continue',
    );
    this.setRowsScrollMode(whileAway);
    const researchFeature = research && !bannerRows;
    this.copy.visible = !researchFeature;
    this.copy.renderable = !researchFeature;
    this.rowsLayer.visible =
      !featureUnlock && !researchFeature;
    this.rowsLayer.renderable = this.rowsLayer.visible;
    this.unlockItemsLayer.visible = featureUnlock;
    this.unlockItemsLayer.renderable = featureUnlock;
    this.researchItemLayer.visible = research;
    this.researchItemLayer.renderable = research;
    if (featureUnlock) {
      this.rows.clear();
      this.researchItem.reset();
      this.unlockItems.reconcile(model.items ?? model.rows);
    } else if (research) {
      this.unlockItems.clear();
      if (researchFeature) {
        this.rows.clear();
        this.researchItem.bind({
          id: `${model.announcementId ?? 'research'}:presentation`,
          label: model.copy,
          value: getAnnouncementResearchDetail(model.rows),
          icon: model.icon ?? {},
          variant: 'research',
        });
      } else {
        this.rows.reconcile(model.rows);
        this.syncLevelRewardRowBackings(
          this.rows.collection.getWidgets().length,
        );
        this.applyLevelRewardRowTypography(true);
        this.researchItem.bind({
          id: `${model.announcementId ?? 'research'}:celebration`,
          label: '',
          value: '',
          icon: model.icon ?? {},
          variant: 'research',
        });
      }
    } else {
      this.unlockItems.clear();
      this.researchItem.reset();
      this.rows.reconcile(model.rows);
      this.syncLevelRewardRowBackings(
        bannerRows
          ? this.rows.collection.getWidgets().length
          : 0,
      );
      this.applyLevelRewardRowTypography(bannerRows);
      if (whileAway) {
        this.reportScroll.scrollTo(0);
      }
    }
    if (this.closeControl) {
      const showClose =
        model.framed &&
        model.dismissible &&
        model.showClose !== false;
      this.closeControl.root.visible = showClose;
      this.closeControl.root.renderable = showClose;
      this.closeControl.setEnabled(showClose);
    }
    this.applyAnnouncementPresentationMode();
    this.applyAnnouncementContentTheme();
    this.layoutDialog();
    if (this.active && this.shown) {
      this.startAnnouncementMotion();
    }
  }

  requestClose(source = 'close') {
    if (
      this.announcementModel?.animation?.kind ===
        'level-rewards' &&
      !this.levelAdvanceReady
    ) {
      return false;
    }
    if (
      !this.announcementModel?.dismissible &&
      source !== 'complete'
    ) {
      return false;
    }
    const result =
      this.actions.advance?.({
        source,
        announcement: this.announcementModel,
      }) ??
      this.model.onAdvance?.({
        source,
        announcement: this.announcementModel,
      });
    if (result === false) {
      return false;
    }
    return super.requestClose(source);
  }

  positionPanel() {
    super.positionPanel();
    if (!this.panel) {
      return;
    }
    this.panel.y += this.announcementModel?.framed
      ? -20
      : -28;
  }

  getModalContentRoots() {
    if (
      this.announcementModel?.animation?.kind ===
      'level-rewards'
    ) {
      return [];
    }
    return super.getModalContentRoots();
  }

  isModalContentPoint(point) {
    if (
      this.announcementModel?.animation?.kind ===
        'level-rewards'
    ) {
      return false;
    }
    return super.isModalContentPoint(point);
  }

  applyAnnouncementPresentationMode() {
    if (!this.announcementModel) {
      return;
    }
    const framed = this.announcementModel.framed;
    setDisplayObjectVisible(this.panel.shadow, framed);
    setDisplayObjectVisible(this.panel.outerFrame, framed);
    setDisplayObjectVisible(this.panel.paperFrame, framed);
    setDisplayObjectVisible(
      this.panel.titleFrame,
      framed && Boolean(this.announcementModel.title),
    );
    setDisplayObjectVisible(
      this.panel.titleLabel,
      framed && Boolean(this.announcementModel.title),
    );
    if (!framed) {
      setDisplayObjectVisible(this.panel.closeControl, false);
    }
  }

  applyAnnouncementContentTheme() {
    const contentTheme = this.announcementModel?.framed
      ? this.panel.getContentTheme()
      : this.theme;
    this.heading?.applyTheme(contentTheme);
    this.levelBannerTitle?.applyTheme(contentTheme);
    this.copy?.applyTheme(contentTheme);
    this.continuePrompt?.applyTheme(contentTheme);
    this.rows?.applyTheme(contentTheme);
    this.unlockItems?.applyTheme(contentTheme);
    this.researchItem?.applyTheme(contentTheme);
    if (
      isBannerRowsAnnouncement(this.announcementModel)
    ) {
      this.applyLevelRewardRowTypography(true);
    }
  }

  setRowsScrollMode(enabled) {
    const scrollEnabled = Boolean(enabled);
    const targetParent = scrollEnabled
      ? this.reportScroll.content
      : this.panel.content;
    if (this.rowsLayer.parent !== targetParent) {
      targetParent.addChild(this.rowsLayer);
    }
    this.reportScroll.root.visible = scrollEnabled;
    this.reportScroll.root.renderable = scrollEnabled;
    if (!scrollEnabled) {
      this.reportScroll.setContentHeight(0);
      this.reportScroll.scrollTo(0);
    }
  }

  layoutDialog() {
    if (!this.rows || !this.announcementModel) {
      return;
    }
    const model = this.announcementModel;
    const width = model.width;
    const rowsWidth = model.framed
      ? width
      : Math.min(260, width);
    const featureUnlock = model.kind === 'unlock';
    const research = model.kind === 'research';
    const whileAway = model.kind === 'whileAway';
    const levelRewards =
      model.animation?.kind === 'level-rewards';
    const bannerRows = isBannerRowsAnnouncement(model);
    const researchFeature = research && !bannerRows;
    const researchCelebration = research && bannerRows;
    const researchItemHeight = research
      ? this.researchItem.setBounds(
          0,
          0,
          rowsWidth,
          false,
        ).preferredHeight
      : 0;
    const rowsHeight = featureUnlock
      ? this.unlockItems.layout(rowsWidth)
      : researchFeature
        ? researchItemHeight
          : this.rows.layout(
            rowsWidth,
            {
              gap: whileAway
                ? GLOBAL_DIALOG_GEOMETRY.rowGap
                : bannerRows
                  ? LEVEL_REWARD_ROW_GAP
                  : 2,
            },
          );
    this.copy.setWrapWidth(width);
    const headingHeight = bannerRows
      ? LEVEL_REWARD_BANNER_HEIGHT
      : this.heading.text
        ? Math.max(24, Math.ceil(this.heading.measuredHeight))
        : 0;
    const copyHeight = !research && this.copy.text
      ? Math.ceil(this.copy.measuredHeight)
      : 0;
    const bodyGap =
      copyHeight > 0 && rowsHeight > 0 ? 10 : 0;
    const whileAwayContentHeight =
      WHILE_AWAY_CONTENT_PADDING_TOP +
      rowsHeight;
    const whileAwayViewportHeight = Math.min(
      WHILE_AWAY_CONTENT_MAX_HEIGHT,
      whileAwayContentHeight,
    );
    const continueHeight = levelRewards
      ? LEVEL_REWARD_CONTINUE_GAP +
        LEVEL_REWARD_CONTINUE_HEIGHT
      : 0;
    const researchIconHeight = researchCelebration
      ? researchItemHeight
      : 0;
    const researchIconGap =
      researchIconHeight > 0 && rowsHeight > 0
        ? RESEARCH_COMPLETE_ICON_TO_ROWS_GAP
        : 0;
    const bodyContentHeight = whileAway
      ? whileAwayViewportHeight
      : copyHeight +
        bodyGap +
        researchIconHeight +
        researchIconGap +
        rowsHeight +
        continueHeight;
    const bodyHeight = model.framed
      ? bodyContentHeight
      : Math.max(128, bodyContentHeight);
    const headingGap =
      headingHeight > 0 && bodyHeight > 0 ? 10 : 0;
    const compositionHeight =
      headingHeight + headingGap + bodyHeight;
    const height = Math.max(
      model.minHeight,
      compositionHeight,
      model.contentHeight,
    );
    const compositionY = Math.max(
      0,
      (height - compositionHeight) / 2,
    );
    this.heading.position.set(
      width / 2,
      compositionY,
    );
    this.levelBannerLayer.position.set(
      width / 2,
      compositionY + LEVEL_REWARD_BANNER_HEIGHT / 2,
    );
    const bodyY =
      compositionY + headingHeight + headingGap;
    const bodyContentY =
      bodyY + Math.max(0, (bodyHeight - bodyContentHeight) / 2);
    this.copy.position.set(0, bodyContentY);
    const rowsPosition = {
      x: (width - rowsWidth) / 2,
      y:
        bodyContentY +
        copyHeight +
        bodyGap +
        researchIconHeight +
        researchIconGap,
    };
    if (whileAway) {
      this.reportScroll.setBounds(
        rowsPosition.x,
        bodyContentY,
        rowsWidth +
          RETAINED_DIALOG_SCROLL_GEOMETRY.scrollbarShiftRight,
        whileAwayViewportHeight,
      );
      this.reportScroll.setContentHeight(
        whileAwayContentHeight,
      );
      this.rowsLayer.position.set(
        0,
        WHILE_AWAY_CONTENT_PADDING_TOP,
      );
    } else {
      this.rowsLayer.position.set(
        rowsPosition.x + (bannerRows ? LEVEL_REWARD_ROW_INSET_X : 0),
        rowsPosition.y,
      );
      this.levelRewardRowsBackingLayer.position.set(
        rowsPosition.x,
        rowsPosition.y,
      );
      if (bannerRows) {
        this.layoutLevelRewardRowBackings(
          rowsWidth,
        );
      }
      if (levelRewards) {
        this.continuePrompt.position.set(
          width / 2,
          rowsPosition.y +
            rowsHeight +
            LEVEL_REWARD_CONTINUE_GAP,
        );
      }
    }
    this.unlockItemsLayer.position.set(
      rowsPosition.x,
      rowsPosition.y,
    );
    this.researchItemLayer.position.set(
      rowsPosition.x,
      researchCelebration
        ? bodyContentY + copyHeight + bodyGap
        : rowsPosition.y,
    );
    this.setPanelContentSize(width, height);
    this.applyAnnouncementPresentationMode();
    this.positionPanel();
  }

  applyDialogTheme(theme) {
    this.applyAnnouncementContentTheme(theme);
    this.applyAnnouncementPresentationMode();
  }

  activateDialog() {
    this.actions.activate?.(this.announcementModel);
    this.startAnnouncementMotion();
  }

  deactivateDialog() {
    this.stopAnnouncementMotion();
    this.actions.deactivate?.(this.announcementModel);
  }

  destroyDialog() {
    this.stopAnnouncementMotion();
    this.rows?.destroy();
    this.rows = null;
    this.reportScroll?.destroy();
    this.reportScroll = null;
    this.unlockItems?.destroy();
    this.unlockItems = null;
    this.researchItem?.destroy();
    this.researchItem = null;
    for (const backing of this.levelRewardRowBackings) {
      backing.destroy();
    }
    this.levelRewardRowBackings.length = 0;
  }

  onLayout(projection) {
    const restartMotion =
      this.announcementMotionFrame !== null &&
      this.active &&
      this.shown;
    if (restartMotion) {
      this.stopAnnouncementMotion();
    }
    super.onLayout(projection);
    if (restartMotion) {
      this.startAnnouncementMotion();
    }
  }

  startAnnouncementMotion() {
    if (this.announcementMotionFrame !== null) {
      this.stopAnnouncementMotion();
    }
    if (!this.active || !this.shown || !this.announcementModel) {
      return false;
    }
    this.captureAnnouncementMotionBases();
    if (getReducedMotion(this.announcementMotionReduced)) {
      this.settleAnnouncementMotion();
      return false;
    }
    this.levelAdvanceReady = false;
    this.announcementMotionStartedAt =
      this.announcementMotionNow();
    this.announcementMotionDuration =
      this.getAnnouncementMotionDuration();
    this.applyAnnouncementMotion(0);
    this.announcementMotionFrame =
      this.requestAnnouncementFrame(
        this.handleAnnouncementMotionFrame,
      );
    return true;
  }

  tickAnnouncementMotion() {
    this.announcementMotionFrame = null;
    if (!this.active || !this.shown) {
      this.settleAnnouncementMotion();
      return;
    }
    const elapsed = Math.max(
      0,
      this.announcementMotionNow() -
        this.announcementMotionStartedAt,
    );
    this.applyAnnouncementMotion(elapsed);
    if (elapsed >= this.announcementMotionDuration) {
      this.settleAnnouncementMotion();
      return;
    }
    this.announcementMotionFrame =
      this.requestAnnouncementFrame(
        this.handleAnnouncementMotionFrame,
      );
  }

  stopAnnouncementMotion() {
    if (this.announcementMotionFrame !== null) {
      this.cancelAnnouncementFrame(
        this.announcementMotionFrame,
      );
      this.announcementMotionFrame = null;
    }
    this.settleAnnouncementMotion();
  }

  captureAnnouncementMotionBases() {
    this.announcementPanelBaseX = this.panel.position.x;
    this.announcementPanelBaseY = this.panel.position.y;
    this.announcementHeadingBaseX = this.heading.position.x;
    this.announcementHeadingBaseY = this.heading.position.y;
    captureDisplayMotionBase(this.panel);
    captureDisplayMotionBase(this.heading);
    captureDisplayMotionBase(this.levelBannerLayer);
    captureDisplayMotionBase(this.levelBannerTitle);
    captureDisplayMotionBase(this.continuePrompt);
    for (const row of this.rows.collection.getWidgets()) {
      captureDisplayMotionBase(row.root);
    }
    for (const backing of this.levelRewardRowBackings) {
      captureDisplayMotionBase(backing);
    }
    for (
      const item of
      this.unlockItems.collection.getWidgets()
    ) {
      item.captureMotionBase();
    }
    this.researchItem.captureMotionBase();
  }

  applyAnnouncementMotion(elapsed) {
    const model = this.announcementModel;
    const animation = model.animation ?? {};
    const kind = animation.kind ?? model.kind;
    const levelRewards = kind === 'level-rewards';
    const revealDelay = levelRewards
      ? finiteDuration(animation.revealDelayMs)
      : 0;
    const overlayDuration = finiteDuration(
      animation.overlayDurationMs,
      levelRewards
        ? ANNOUNCEMENT_MOTION_DEFAULTS.levelOverlayDurationMs
        : ANNOUNCEMENT_MOTION_DEFAULTS.overlayDurationMs,
    );
    const overlayProgress = sampleMotionProgress(
      elapsed,
      revealDelay,
      overlayDuration,
      ANNOUNCEMENT_EASE,
    );
    this.backdrop.alpha = overlayProgress;

    const panelDuration = finiteDuration(
      animation.panelDurationMs,
      levelRewards
        ? ANNOUNCEMENT_MOTION_DEFAULTS.levelPanelDurationMs
        : ANNOUNCEMENT_MOTION_DEFAULTS.panelDurationMs,
    );
    const panelState = sampleMotionFrames(
      elapsed,
      revealDelay,
      panelDuration,
      ANNOUNCEMENT_PANEL_FRAMES,
      ANNOUNCEMENT_EASE_RUBBER,
      this.announcementMotionSample,
    );
    applyDisplayMotion(
      this.panel,
      levelRewards
        ? { ...panelState, scale: 1, x: 0, y: 0 }
        : panelState,
    );

    if (kind === 'research-complete') {
      if (isBannerRowsAnnouncement(model)) {
        this.applyLevelAnnouncementMotion(
          elapsed,
          animation,
        );
      } else {
        this.applyResearchAnnouncementMotion(
          elapsed,
          animation,
        );
      }
      return;
    }
    if (kind === 'feature-unlock') {
      this.applyFeatureUnlockMotion(elapsed, animation);
      return;
    }
    if (levelRewards) {
      this.applyLevelAnnouncementMotion(
        elapsed,
        animation,
      );
    }
  }

  applyResearchAnnouncementMotion(elapsed, animation) {
    const sample = this.announcementMotionSample;
    applyDisplayMotion(
      this.heading,
      sampleMotionFrames(
        elapsed,
        0,
        finiteDuration(
          animation.titleDurationMs,
          ANNOUNCEMENT_MOTION_DEFAULTS
            .researchTitleDurationMs,
        ),
        ANNOUNCEMENT_RESEARCH_TITLE_FRAMES,
        ANNOUNCEMENT_EASE_RUBBER,
        sample,
      ),
    );
    const item = this.researchItem;
    if (item.hasFallbackIcon()) {
      item.applyFallbackMotion(
        sampleMotionFrames(
          elapsed,
          0,
          finiteDuration(
            animation.fallbackIconDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .fallbackIconDurationMs,
          ),
          ANNOUNCEMENT_FALLBACK_FRAMES,
          ANNOUNCEMENT_EASE_RUBBER,
          sample,
        ),
      );
    } else {
      item.applySilhouetteMotion(
        sampleMotionFrames(
          elapsed,
          0,
          finiteDuration(
            animation.silhouetteDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchSilhouetteDurationMs,
          ),
          ANNOUNCEMENT_SILHOUETTE_FRAMES,
          ANNOUNCEMENT_EASE_RUBBER,
          sample,
        ),
      );
      item.applyIconMotion(
        sampleMotionFrames(
          elapsed,
          finiteDuration(
            animation.iconDelayMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchIconDelayMs,
          ),
          finiteDuration(
            animation.iconDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchIconDurationMs,
          ),
          ANNOUNCEMENT_ICON_FRAMES,
          ANNOUNCEMENT_EASE_RUBBER,
          sample,
        ),
      );
    }
    item.applyLabelMotion(
      sampleMotionFrames(
        elapsed,
        finiteDuration(
          animation.labelDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS
            .researchLabelDelayMs,
        ),
        finiteDuration(
          animation.labelDurationMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
        ),
        ANNOUNCEMENT_ROW_FRAMES,
        ANNOUNCEMENT_EASE_RUBBER,
        sample,
      ),
    );
    item.applyDetailMotion(
      sampleMotionFrames(
        elapsed,
        finiteDuration(
          animation.detailDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS
            .researchDetailDelayMs,
        ),
        finiteDuration(
          animation.detailDurationMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
        ),
        ANNOUNCEMENT_ROW_FRAMES,
        ANNOUNCEMENT_EASE_RUBBER,
        sample,
      ),
    );
  }

  applyFeatureUnlockMotion(elapsed, animation) {
    const iconDelay = finiteDuration(
      animation.iconDelayMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.researchIconDelayMs,
    );
    const iconStagger = finiteDuration(
      animation.iconStaggerMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.unlockIconStaggerMs,
    );
    const iconDuration = finiteDuration(
      animation.iconDurationMs,
      ANNOUNCEMENT_MOTION_DEFAULTS
        .researchIconDurationMs,
    );
    const labelDelay = finiteDuration(
      animation.labelDelayMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.researchLabelDelayMs,
    );
    const labelDuration = finiteDuration(
      animation.labelDurationMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
    );
    const detailDelay = finiteDuration(
      animation.detailDelayMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.researchDetailDelayMs,
    );
    const detailDuration = finiteDuration(
      animation.detailDurationMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
    );
    const sample = this.announcementMotionSample;
    this.unlockItems.collection
      .getWidgets()
      .forEach((item, index) => {
        item.applyIconMotion(
          sampleMotionFrames(
            elapsed,
            iconDelay + index * iconStagger,
            iconDuration,
            ANNOUNCEMENT_ICON_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
        item.applyLabelMotion(
          sampleMotionFrames(
            elapsed,
            labelDelay,
            labelDuration,
            ANNOUNCEMENT_ROW_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
        item.applyDetailMotion(
          sampleMotionFrames(
            elapsed,
            detailDelay,
            detailDuration,
            ANNOUNCEMENT_ROW_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
      });
  }

  applyLevelAnnouncementMotion(elapsed, animation) {
    const sample = this.announcementMotionSample;
    const revealDelay = finiteDuration(
      animation.revealDelayMs,
    );
    applyDisplayMotion(
      this.levelBannerLayer,
      sampleMotionFrames(
        elapsed,
        revealDelay,
        finiteDuration(
          animation.panelDurationMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.levelPanelDurationMs,
        ),
        ANNOUNCEMENT_BANNER_FRAMES,
        ANNOUNCEMENT_EASE_RUBBER,
        sample,
      ),
    );
    applyDisplayMotion(
      this.levelBannerTitle,
      sampleMotionFrames(
        elapsed,
        finiteDuration(
          animation.titleDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.levelTitleDelayMs,
        ),
        finiteDuration(
          animation.titleDurationMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
        ),
        ANNOUNCEMENT_ROW_FRAMES,
        ANNOUNCEMENT_EASE_RUBBER,
        sample,
      ),
    );
    if (
      this.announcementModel?.kind === 'research' &&
      isBannerRowsAnnouncement(this.announcementModel)
    ) {
      const item = this.researchItem;
      if (item.hasFallbackIcon()) {
        item.applyFallbackMotion(
          sampleMotionFrames(
            elapsed,
            finiteDuration(
              animation.iconDelayMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .researchIconDelayMs,
            ),
            finiteDuration(
              animation.fallbackIconDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .fallbackIconDurationMs,
            ),
            ANNOUNCEMENT_FALLBACK_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
      } else {
        item.applySilhouetteMotion(
          sampleMotionFrames(
            elapsed,
            0,
            finiteDuration(
              animation.silhouetteDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .researchSilhouetteDurationMs,
            ),
            ANNOUNCEMENT_SILHOUETTE_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
        item.applyIconMotion(
          sampleMotionFrames(
            elapsed,
            finiteDuration(
              animation.iconDelayMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .researchIconDelayMs,
            ),
            finiteDuration(
              animation.iconDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .researchIconDurationMs,
            ),
            ANNOUNCEMENT_ICON_FRAMES,
            ANNOUNCEMENT_EASE_RUBBER,
            sample,
          ),
        );
      }
    }
    const rowDelay = finiteDuration(
      animation.rowDelayMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.levelRowDelayMs,
    );
    const rowStagger = finiteDuration(
      animation.rowStaggerMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.levelRowStaggerMs,
    );
    const rowDuration = finiteDuration(
      animation.rowDurationMs,
      ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
    );
    this.rows.collection
      .getWidgets()
      .forEach((row, index) => {
        const rowState = sampleMotionFrames(
          elapsed,
          rowDelay + index * rowStagger,
          rowDuration,
          ANNOUNCEMENT_ROW_FRAMES,
          ANNOUNCEMENT_EASE_RUBBER,
          sample,
        );
        applyDisplayMotion(
          row.root,
          rowState,
        );
        applyDisplayMotion(
          this.levelRewardRowBackings[index],
          rowState,
        );
        this.applyLevelRewardCountUp(
          row,
          elapsed,
          rowDelay +
            index * rowStagger +
            rowDuration +
            LEVEL_REWARD_COUNT_DELAY_MS,
        );
      });
    const countUpTail = this.hasLevelRewardCountUp()
      ? LEVEL_REWARD_COUNT_DELAY_MS +
        LEVEL_REWARD_COUNT_DURATION_MS
      : 0;
    const promptDelay =
      rowDelay +
      Math.max(
        0,
        this.rows.collection.getWidgets().length - 1,
      ) *
        rowStagger +
      rowDuration +
      countUpTail +
      LEVEL_REWARD_CONTINUE_DELAY_MS;
    applyDisplayMotion(
      this.continuePrompt,
      sampleMotionFrames(
        elapsed,
        promptDelay,
        rowDuration,
        ANNOUNCEMENT_PROMPT_FRAMES,
        ANNOUNCEMENT_EASE,
        sample,
      ),
    );
  }

  getAnnouncementMotionDuration() {
    const model = this.announcementModel;
    const animation = model.animation ?? {};
    const kind = animation.kind ?? model.kind;
    const levelRewards = kind === 'level-rewards';
    let duration =
      (levelRewards
        ? finiteDuration(animation.revealDelayMs)
        : 0) +
      finiteDuration(
        animation.overlayDurationMs,
        levelRewards
          ? ANNOUNCEMENT_MOTION_DEFAULTS.levelOverlayDurationMs
          : ANNOUNCEMENT_MOTION_DEFAULTS.overlayDurationMs,
      );
    if (kind === 'research-complete') {
      if (isBannerRowsAnnouncement(model)) {
        const rowCount =
          this.rows.collection.getWidgets().length;
        duration = Math.max(
          duration,
          finiteDuration(
            animation.titleDelayMs,
          ) +
            finiteDuration(
              animation.titleDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
            ),
          finiteDuration(
            animation.rowDelayMs,
          ) +
            Math.max(0, rowCount - 1) *
              finiteDuration(
                animation.rowStaggerMs,
                ANNOUNCEMENT_MOTION_DEFAULTS
                  .levelRowStaggerMs,
              ) +
            finiteDuration(
              animation.rowDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
            ),
          finiteDuration(
            animation.iconDelayMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchIconDelayMs,
          ) +
            finiteDuration(
              animation.iconDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .researchIconDurationMs,
            ),
        );
      } else {
        duration = Math.max(
          duration,
          finiteDuration(
            animation.detailDelayMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchDetailDelayMs,
          ) +
            finiteDuration(
              animation.detailDurationMs,
              ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
            ),
        );
      }
    } else if (kind === 'feature-unlock') {
      const itemCount =
        this.unlockItems.collection.getWidgets().length;
      duration = Math.max(
        duration,
        finiteDuration(
          animation.detailDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS
            .researchDetailDelayMs,
        ) +
          finiteDuration(
            animation.detailDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
          ),
        finiteDuration(
          animation.iconDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS
            .researchIconDelayMs,
        ) +
          Math.max(0, itemCount - 1) *
            finiteDuration(
              animation.iconStaggerMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .unlockIconStaggerMs,
            ) +
          finiteDuration(
            animation.iconDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS
              .researchIconDurationMs,
          ),
      );
    } else if (levelRewards) {
      const rowCount =
        this.rows.collection.getWidgets().length;
      const countUpTail = this.hasLevelRewardCountUp()
        ? LEVEL_REWARD_COUNT_DELAY_MS +
          LEVEL_REWARD_COUNT_DURATION_MS
        : 0;
      duration = Math.max(
        duration,
        finiteDuration(
          animation.rowDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.levelRowDelayMs,
        ) +
          Math.max(
            0,
            rowCount - 1,
          ) *
            finiteDuration(
              animation.rowStaggerMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .levelRowStaggerMs,
            ) +
          finiteDuration(
            animation.rowDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
          ),
        finiteDuration(
          animation.rowDelayMs,
          ANNOUNCEMENT_MOTION_DEFAULTS.levelRowDelayMs,
        ) +
          Math.max(0, rowCount - 1) *
            finiteDuration(
              animation.rowStaggerMs,
              ANNOUNCEMENT_MOTION_DEFAULTS
                .levelRowStaggerMs,
            ) +
          finiteDuration(
            animation.rowDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
          ) +
          countUpTail +
          LEVEL_REWARD_CONTINUE_DELAY_MS +
          finiteDuration(
            animation.rowDurationMs,
            ANNOUNCEMENT_MOTION_DEFAULTS.rowDurationMs,
          ),
      );
    }
    return duration;
  }

  settleAnnouncementMotion() {
    if (!this.panel || !this.heading) {
      return;
    }
    restoreDisplayMotion(this.panel);
    restoreDisplayMotion(this.heading);
    restoreDisplayMotion(this.levelBannerLayer);
    restoreDisplayMotion(this.levelBannerTitle);
    restoreDisplayMotion(this.continuePrompt);
    this.backdrop.alpha = 1;
    for (const row of this.rows.collection.getWidgets()) {
      restoreDisplayMotion(row.root);
    }
    for (const backing of this.levelRewardRowBackings) {
      restoreDisplayMotion(backing);
    }
    for (
      const item of
      this.unlockItems.collection.getWidgets()
    ) {
      item.restoreMotion();
    }
    this.researchItem?.restoreMotion();
    this.settleLevelRewardCountUps();
    this.levelAdvanceReady =
      this.announcementModel?.animation?.kind ===
      'level-rewards';
  }

  syncLevelRewardRowBackings(count) {
    while (this.levelRewardRowBackings.length < count) {
      const index = this.levelRewardRowBackings.length;
      const backing = new PixiNineSliceFrame({
        texture:
          this.context.assets?.getTexture?.(
            PIXI_ROOT_RUN_ASSETS.settingsRow,
          ) ?? Texture.EMPTY,
        sourceInsets:
          PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
        borderInsets:
          PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
        label: `${this.dialogId}:levelRewardRowBacking:${index}`,
      });
      backing.tint = 0x24252c;
      this.levelRewardRowBackings.push(backing);
      this.levelRewardRowsBackingLayer.addChild(backing);
    }
    this.levelRewardRowBackings.forEach((backing, index) => {
      setDisplayObjectVisible(backing, index < count);
    });
  }

  layoutLevelRewardRowBackings(width) {
    const rowWidth = Math.max(0, width);
    const contentWidth = Math.max(
      0,
      rowWidth - LEVEL_REWARD_ROW_INSET_X * 2,
    );
    this.rows.collection
      .getWidgets()
      .forEach((row, index) => {
        const backing = this.levelRewardRowBackings[index];
        if (!backing) {
          return;
        }
        backing.position.set(0, row.root.position.y);
        backing.setSize(
          rowWidth,
          Math.max(
            row.rowHeight,
            GLOBAL_DIALOG_GEOMETRY.rowHeight,
          ),
        );
        row.setBounds(
          0,
          row.root.position.y,
          contentWidth,
          row.rowHeight,
        );
      });
  }

  applyLevelRewardRowTypography(enabled) {
    for (const row of this.rows.collection.getWidgets()) {
      if (!enabled) {
        row.keyLabel.setStroke(null);
        row.valueLabel.setStroke(null);
        continue;
      }
      row.keyLabel
        .setColor('#ffffff')
        .setStroke(LEVEL_REWARD_ROW_TEXT_STROKE);
      row.valueLabel.setStroke(
        LEVEL_REWARD_ROW_TEXT_STROKE,
      );
    }
  }

  hasLevelRewardCountUp() {
    return this.rows.collection
      .getWidgets()
      .some((row) => normalizeLevelRewardCountUp(row.data));
  }

  applyLevelRewardCountUp(row, elapsed, startMs) {
    const countUp = normalizeLevelRewardCountUp(row?.data);
    if (!countUp) {
      return;
    }
    if (elapsed < startMs) {
      row.valueLabel.setText(row.data.value ?? '');
      row.layoutCurrent();
      return;
    }
    const progress = sampleMotionProgress(
      elapsed,
      startMs,
      LEVEL_REWARD_COUNT_DURATION_MS,
      ANNOUNCEMENT_EASE,
    );
    row.valueLabel.setText(
      formatLevelRewardCountUp(countUp, progress),
    );
    row.layoutCurrent();
  }

  settleLevelRewardCountUps() {
    for (const row of this.rows.collection.getWidgets()) {
      const countUp = normalizeLevelRewardCountUp(row.data);
      if (!countUp) {
        continue;
      }
      row.valueLabel.setText(
        formatLevelRewardCountUp(countUp, 1),
      );
      row.layoutCurrent();
    }
  }

  getPoolStats() {
    return this.rows?.getStats() ?? null;
  }

  getFeatureSourceBounds() {
    return this.unlockItems?.getSourceBounds() ?? [];
  }
}

class FeatureUnlockAnnouncementItems {
  constructor({
    parent,
    assets,
    counters = null,
    name,
    theme,
  }) {
    this.parent = parent;
    this.assets = assets;
    this.theme = theme;
    this.pool = new WidgetPool({
      name: `${name} pool`,
      counters,
      maxSize: 40,
      create: () =>
        new FeatureUnlockAnnouncementItem({
          assets: this.assets,
          label: `${name}:item`,
          theme: this.theme,
        }),
      reset: (item) => item.reset(),
      dispose: (item) => item.destroy(),
    });
    this.collection = new PooledCollection({
      name,
      pool: this.pool,
      counters,
      keyOf: (item, index) =>
        item.id ?? item.key ?? `${item.feature ?? 'feature'}:${index}`,
      bind: (widget, item) => widget.bind(item),
      afterReconcile: (widgets) => this.order(widgets),
    });
  }

  reconcile(items) {
    return this.collection.reconcile(
      Array.isArray(items) ? items : [],
    );
  }

  order(widgets) {
    this.parent.removeChildren();
    for (const widget of widgets) {
      this.parent.addChild(widget.root);
    }
  }

  layout(width) {
    const widgets = this.collection.getWidgets();
    if (widgets.length === 0) {
      return 0;
    }
    if (widgets.length === 1) {
      widgets[0].setBounds(0, 0, width, false);
      return widgets[0].preferredHeight;
    }

    const columns = Math.max(
      1,
      Math.floor(
        (width + UNLOCK_ITEM_GAP_X) /
          (UNLOCK_ITEM_WIDTH + UNLOCK_ITEM_GAP_X),
      ),
    );
    let y = 0;
    for (let start = 0; start < widgets.length; start += columns) {
      const row = widgets.slice(start, start + columns);
      const rowWidth =
        row.length * UNLOCK_ITEM_WIDTH +
        Math.max(0, row.length - 1) * UNLOCK_ITEM_GAP_X;
      const startX = (width - rowWidth) / 2;
      let rowHeight = 0;
      row.forEach((widget, index) => {
        widget.setBounds(
          startX +
            index * (UNLOCK_ITEM_WIDTH + UNLOCK_ITEM_GAP_X),
          y,
          UNLOCK_ITEM_WIDTH,
          true,
        );
        rowHeight = Math.max(rowHeight, widget.preferredHeight);
      });
      y += rowHeight + UNLOCK_ITEM_GAP_Y;
    }
    return Math.max(0, y - UNLOCK_ITEM_GAP_Y);
  }

  applyTheme(theme) {
    this.theme = theme;
    for (const widget of this.collection.getWidgets()) {
      widget.applyTheme(theme);
    }
  }

  getSourceBounds() {
    return this.collection
      .getWidgets()
      .map((item) => item.getSourceBounds())
      .filter(Boolean);
  }

  clear() {
    return this.collection.clear();
  }

  destroy() {
    this.collection.destroy();
    this.pool.destroy();
  }
}

class FeatureUnlockAnnouncementItem {
  constructor({
    assets,
    label,
    theme,
  }) {
    this.assets = assets;
    this.theme = theme;
    this.data = {};
    this.compact = false;
    this.preferredHeight = 0;
    this.root = new Container({ label });
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.iconStage = new Container({
      label: `${label}:iconStage`,
    });
    this.iconStage.eventMode = 'none';
    this.stageBounds = new Graphics({
      label: `${label}:stageBounds`,
    });
    this.silhouette = new Sprite({
      texture: Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:silhouette`,
    });
    this.icon = new Sprite({
      texture: Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:icon`,
    });
    this.iconOverlay = new Sprite({
      texture: Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:iconOverlay`,
    });
    this.fallbackIcon = new PixiTextLabel({
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: `${label}:fallbackIcon`,
    });
    this.label = new PixiTextLabel({
      fontSize: 14,
      fontWeight: 'bold',
      lineHeight: 17,
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      wordWrap: true,
      label: `${label}:label`,
    });
    this.detail = new PixiTextLabel({
      fontSize: 13,
      lineHeight: 16,
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      color: 'muted',
      wordWrap: true,
      label: `${label}:detail`,
    });
    this.iconStage.addChild(
      this.stageBounds,
      this.silhouette,
      this.icon,
      this.iconOverlay,
      this.fallbackIcon,
    );
    this.root.addChild(
      this.iconStage,
      this.label,
      this.detail,
    );
    this.applyTheme(theme);
  }

  bind(data = {}) {
    this.data = data;
    this.compact = data.compact === true;
    this.root.visible = true;
    this.root.renderable = true;
    this.label.setText(data.label ?? data.feature ?? '');
    this.detail.setText(data.value ?? data.detail ?? '');
    this.bindIcon(data.icon ?? {});
    this.layoutCurrent();
  }

  bindIcon(presentation) {
    const iconTexture = resolveAnnouncementIconTexture(
      this.assets,
      presentation,
    );
    const silhouetteTexture = presentation.silhouetteFrameName
      ? resolveAnnouncementIconTexture(this.assets, {
          frameName: presentation.silhouetteFrameName,
        })
      : Texture.EMPTY;
    const overlayTexture = presentation.itemFrameName
      ? resolveAnnouncementIconTexture(this.assets, {
          frameName: presentation.itemFrameName,
        })
      : Texture.EMPTY;
    this.icon.texture = iconTexture;
    this.silhouette.texture = silhouetteTexture;
    this.iconOverlay.texture = overlayTexture;
    this.icon.visible = iconTexture !== Texture.EMPTY;
    this.icon.renderable = this.icon.visible;
    this.silhouette.visible =
      silhouetteTexture !== Texture.EMPTY &&
      presentation.assetId === undefined;
    this.silhouette.renderable = this.silhouette.visible;
    this.iconOverlay.visible = overlayTexture !== Texture.EMPTY;
    this.iconOverlay.renderable = this.iconOverlay.visible;
    this.fallbackIcon.setText(
      presentation.fallbackLabel ?? '',
    );
    this.fallbackIcon.visible =
      iconTexture === Texture.EMPTY &&
      Boolean(this.fallbackIcon.text);
    this.fallbackIcon.renderable = this.fallbackIcon.visible;
  }

  setBounds(x, y, width, compact = this.compact) {
    this.root.position.set(x, y);
    this.rowWidth = width;
    this.compact = compact;
    this.layoutCurrent();
    return this;
  }

  layoutCurrent() {
    const geometry = this.compact
      ? UNLOCK_COMPACT_STAGE
      : UNLOCK_SINGLE_STAGE;
    const width = Math.max(
      0,
      Number(this.rowWidth) ||
        (this.compact ? UNLOCK_ITEM_WIDTH : 260),
    );
    this.stageBounds
      .clear()
      .rect(0, 0, geometry.width, geometry.height)
      .fill({ color: 0xffffff, alpha: 0 });
    this.iconStage.position.set(
      (width - geometry.width) / 2,
      0,
    );
    const centerX = geometry.width / 2;
    const centerY = geometry.height / 2;
    const artScale =
      PAGE_ICON_ART_SCALE[this.data.pageId] ?? 1;
    fitAnnouncementSprite(
      this.icon,
      geometry.iconWidth * artScale,
      geometry.iconHeight * artScale,
    );
    this.icon.position.set(centerX, centerY);
    fitAnnouncementSprite(
      this.silhouette,
      geometry.iconWidth * artScale * 1.08,
      geometry.iconHeight * artScale * 1.08,
    );
    this.silhouette.position.set(centerX, centerY);
    if (this.iconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.icon,
        item: this.iconOverlay,
        x: centerX,
        y: centerY,
        width: this.icon.width,
        height: this.icon.height,
      });
    } else {
      this.iconOverlay.rotation = 0;
    }
    this.fallbackIcon.position.set(centerX, centerY);

    const labelWidth = this.compact
      ? UNLOCK_ITEM_WIDTH
      : width;
    this.label
      .setFontSize(this.compact ? 11 : 14)
      .setLineHeight(this.compact ? 14 : 17)
      .setWrapWidth(labelWidth);
    this.label.position.set(
      width / 2,
      geometry.height + 4,
    );
    this.detail
      .setWrapWidth(width)
      .setFontSize(13)
      .setLineHeight(16);
    this.detail.visible =
      !this.compact && Boolean(this.detail.text);
    this.detail.renderable = this.detail.visible;
    this.detail.position.set(
      width / 2,
      this.label.y + this.label.measuredHeight + 2,
    );
    this.preferredHeight =
      geometry.height +
      4 +
      this.label.measuredHeight +
      (
        this.detail.visible
          ? 2 + this.detail.measuredHeight
          : 0
      );
  }

  applyTheme(theme) {
    this.theme = theme;
    this.label.applyTheme(theme);
    this.detail.applyTheme(theme);
    this.detail.setColor('muted');
    this.fallbackIcon.applyTheme(theme);
    this.fallbackIcon.setColor('muted');
    this.silhouette.tint = theme?.muted ?? 0x5e5e5e;
    this.silhouette.alpha = 0.28;
  }

  getSourceBounds() {
    if (!this.root.visible || !this.root.renderable) {
      return null;
    }
    const bounds = this.iconStage.getBounds();
    return {
      value: this.data.feature ?? this.data.label ?? '',
      pageId: this.data.pageId ?? null,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
    };
  }

  hasFallbackIcon() {
    return this.fallbackIcon.visible;
  }

  captureMotionBase() {
    this.silhouette.alpha = this.silhouette.visible ? 0.28 : 0;
    captureDisplayMotionBase(this.silhouette);
    captureDisplayMotionBase(this.icon);
    captureDisplayMotionBase(this.iconOverlay);
    captureDisplayMotionBase(this.fallbackIcon);
    captureDisplayMotionBase(this.label);
    captureDisplayMotionBase(this.detail);
  }

  applyFallbackMotion(state) {
    applyDisplayMotion(this.fallbackIcon, state);
  }

  applySilhouetteMotion(state) {
    applyDisplayMotion(this.silhouette, state);
  }

  applyIconMotion(state) {
    applyDisplayMotion(this.icon, state);
    applyDisplayMotion(this.iconOverlay, state);
  }

  applyLabelMotion(state) {
    applyDisplayMotion(this.label, state);
  }

  applyDetailMotion(state) {
    applyDisplayMotion(this.detail, state);
  }

  restoreMotion() {
    restoreDisplayMotion(this.silhouette);
    restoreDisplayMotion(this.icon);
    restoreDisplayMotion(this.iconOverlay);
    restoreDisplayMotion(this.fallbackIcon);
    restoreDisplayMotion(this.label);
    restoreDisplayMotion(this.detail);
    this.silhouette.alpha = 0;
    this.icon.alpha = 1;
    this.iconOverlay.alpha = 1;
    this.fallbackIcon.alpha = 1;
    this.label.alpha = 1;
    this.detail.alpha = 1;
  }

  reset() {
    this.restoreMotion();
    this.data = {};
    this.compact = false;
    this.label.setText('');
    this.detail.setText('');
    this.fallbackIcon.setText('');
    this.icon.texture = Texture.EMPTY;
    this.silhouette.texture = Texture.EMPTY;
    this.iconOverlay.texture = Texture.EMPTY;
    this.fallbackIcon.visible = false;
    this.fallbackIcon.renderable = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.preferredHeight = 0;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * One retained confirmation modal used for renderer-neutral destructive or
 * transactional confirmations.
 */
export class PixiConfirmationDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.confirmation' } = {}) {
    super({
      context,
      dialogId,
      title: 'confirm',
      contentWidth: CONFIRMATION_WIDTH,
      contentHeight: 102,
      placement: 'center',
      includeClose: false,
      backdropAlpha: 0.68,
      label: `${dialogId}:confirmationDialog`,
    });
    this.pending = false;
    this.message = new PixiTextLabel({
      wordWrap: true,
      wrapWidth: CONFIRMATION_WIDTH,
      label: `${dialogId}:message`,
    });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${dialogId}:rows`;
    this.status = new PixiTextLabel({
      color: 'muted',
      label: `${dialogId}:status`,
    });
    this.cancelButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.cancel`,
      text: 'cancel',
      width: 126,
      height: 30,
      action: () => this.cancel(),
      label: `${dialogId}:cancel`,
    });
    this.confirmButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.confirm`,
      text: 'confirm',
      width: 126,
      height: 30,
      action: () => this.confirm(),
      label: `${dialogId}:confirm`,
    });
    this.panel.content.addChild(
      this.message,
      this.rowsLayer,
      this.status,
      this.cancelButton,
      this.confirmButton,
    );
    this.rows = new PooledDialogRows({
      parent: this.rowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} confirmation rows`,
      maxSize: 20,
      theme: this.theme,
    });
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.confirmationModel = normalizeConfirmationModel(viewModel);
    this.pending = Boolean(this.confirmationModel.pending);
    this.message.setText(this.confirmationModel.message);
    this.rows.reconcile(this.confirmationModel.rows);
    this.status.setText(this.confirmationModel.status);
    this.cancelButton
      .setText(this.confirmationModel.cancelLabel)
      .setEnabled(
        !this.pending &&
          this.confirmationModel.cancelEnabled,
      );
    this.confirmButton
      .setText(
        this.pending
          ? '...'
          : this.confirmationModel.confirmLabel,
      )
      .setEnabled(
        !this.pending &&
          this.confirmationModel.confirmEnabled,
      );
    this.layoutDialog();
  }

  requestClose(source = 'close') {
    return this.cancel(source);
  }

  cancel(source = 'cancel') {
    if (this.pending || !this.confirmationModel.cancelEnabled) {
      return false;
    }
    const result =
      this.actions.cancel?.({
        source,
        value: this.confirmationModel.value,
      }) ??
      this.model.onCancel?.({
        source,
        value: this.confirmationModel.value,
      });
    if (result === false) {
      return false;
    }
    this.closeThroughRegistry();
    return result ?? true;
  }

  async confirm() {
    if (
      this.pending ||
      !this.confirmationModel.confirmEnabled
    ) {
      return false;
    }
    const action =
      this.actions.confirm ??
      this.model.onConfirm;
    if (!action) {
      return false;
    }
    this.setPending(true);
    let result;
    try {
      result = await action(this.confirmationModel.value);
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.setPending(false);
    if (result?.ok === false || result === false) {
      this.status.setText(
        result?.message ??
          (result?.reason === 'offline'
            ? 'offline'
            : 'not saved'),
      );
      return result;
    }
    this.closeThroughRegistry();
    return result ?? true;
  }

  setPending(pending) {
    this.pending = Boolean(pending);
    this.cancelButton.setEnabled(
      !this.pending &&
        this.confirmationModel.cancelEnabled,
    );
    this.confirmButton
      .setText(
        this.pending
          ? '...'
          : this.confirmationModel.confirmLabel,
      )
      .setEnabled(
        !this.pending &&
          this.confirmationModel.confirmEnabled,
      );
  }

  layoutDialog() {
    if (!this.rows || !this.confirmationModel) {
      return;
    }
    this.message.setWrapWidth(CONFIRMATION_WIDTH);
    this.message.position.set(0, 0);
    let y = this.message.text
      ? Math.ceil(this.message.measuredHeight) + 10
      : 0;
    this.rowsLayer.position.set(0, y);
    const rowsHeight = this.rows.layout(
      CONFIRMATION_WIDTH,
      { gap: 4 },
    );
    y += rowsHeight;
    if (this.status.text) {
      y += rowsHeight > 0 ? 8 : 0;
      this.status.position.set(0, y);
      y += Math.ceil(this.status.measuredHeight) + 8;
    } else {
      y += rowsHeight > 0 ? 10 : 0;
    }
    const buttonGap = 8;
    const buttonWidth =
      (CONFIRMATION_WIDTH - buttonGap) / 2;
    this.cancelButton.position.set(0, y);
    this.cancelButton.setSize(buttonWidth, 30);
    this.confirmButton.position.set(
      buttonWidth + buttonGap,
      y,
    );
    this.confirmButton.setSize(buttonWidth, 30);
    this.setPanelContentSize(
      CONFIRMATION_WIDTH,
      Math.max(70, y + 30),
    );
    this.positionPanel();
  }

  applyDialogTheme(theme) {
    this.message?.applyTheme(theme);
    this.status?.applyTheme(theme);
    this.cancelButton?.applyTheme(theme);
    this.confirmButton?.applyTheme(theme);
    this.rows?.applyTheme(theme);
  }

  deactivateDialog() {
    this.pending = false;
  }

  destroyDialog() {
    this.rows?.destroy();
    this.rows = null;
  }

  getPoolStats() {
    return this.rows?.getStats() ?? null;
  }
}

function normalizeAnnouncementModel(model = {}) {
  const framed =
    Boolean(model.framed) ||
    model.variant === 'report' ||
    model.kind === 'whileAway';
  return {
    ...model,
    title: String(model.title ?? ''),
    copy: String(
      model.copy ?? model.body ?? model.description ?? '',
    ),
    rows: normalizeRows(model.rows ?? model.items).map(
      (row) => ({
        ...row,
        mutedLabel: row.mutedLabel ?? true,
        boldValue: row.boldValue ?? true,
      }),
    ),
    framed,
    dismissible:
      model.dismissible ??
      model.showClose ??
      framed,
    width: Math.max(
      200,
      Number(model.width) ||
        (framed ? 260 : ANNOUNCEMENT_WIDTH),
    ),
    minHeight: Math.max(
      0,
      Number(model.minHeight) || (framed ? 0 : 176),
    ),
    contentHeight: Math.max(
      0,
      Number(model.contentHeight) || 0,
    ),
  };
}

function isBannerRowsAnnouncement(model = {}) {
  return (
    model.variant === 'banner-rows' ||
    model.animation?.kind === 'level-rewards'
  );
}

function setDisplayObjectVisible(displayObject, visible) {
  if (!displayObject) {
    return;
  }
  displayObject.visible = Boolean(visible);
  displayObject.renderable = Boolean(visible);
}

function normalizeConfirmationModel(model = {}) {
  return {
    ...model,
    message: String(
      model.message ??
        model.copy ??
        model.description ??
        '',
    ),
    rows: normalizeRows(model.rows),
    status: String(model.status ?? ''),
    cancelLabel: String(model.cancelLabel ?? 'cancel'),
    confirmLabel: String(
      model.confirmLabel ?? model.actionLabel ?? 'confirm',
    ),
    cancelEnabled: model.cancelEnabled !== false,
    confirmEnabled: model.confirmEnabled !== false,
    pending: Boolean(model.pending),
    value: model.value ?? model.payload,
  };
}

function resolveAnnouncementIconTexture(assets, presentation = {}) {
  try {
    if (presentation.assetId) {
      return assets?.getTexture?.(presentation.assetId) ?? Texture.EMPTY;
    }
    if (presentation.frameName) {
      return (
        assets?.getAtlasTexture?.(presentation.frameName) ??
        Texture.EMPTY
      );
    }
  } catch {
    return Texture.EMPTY;
  }
  return Texture.EMPTY;
}

function fitAnnouncementSprite(sprite, maxWidth, maxHeight) {
  const source =
    sprite.texture?.orig ?? sprite.texture?.frame;
  const sourceWidth = Number(source?.width) || 1;
  const sourceHeight = Number(source?.height) || 1;
  const scale = Math.min(
    Math.max(0, Number(maxWidth) || 0) / sourceWidth,
    Math.max(0, Number(maxHeight) || 0) / sourceHeight,
  );
  sprite.width = sourceWidth * scale;
  sprite.height = sourceHeight * scale;
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(
    (row, index) => {
      if (typeof row === 'string') {
        return {
          id: index,
          kind: 'message',
          text: row,
        };
      }
      return {
        ...row,
        id: row.id ?? row.key ?? index,
      };
    },
  );
}

function getAnnouncementResearchDetail(rows) {
  for (const row of Array.isArray(rows) ? rows : []) {
    const detail = String(
      row?.text ?? row?.value ?? row?.label ?? '',
    ).trim();
    if (detail) {
      return detail;
    }
  }
  return '';
}

function freezeMotionFrames(frames) {
  return Object.freeze(
    frames.map((frame) =>
      Object.freeze({
        offset: clampUnit(frame.offset),
        alpha: Number.isFinite(frame.alpha) ? frame.alpha : 1,
        scale: Number.isFinite(frame.scale) ? frame.scale : 1,
        x: Number.isFinite(frame.x) ? frame.x : 0,
        y: Number.isFinite(frame.y) ? frame.y : 0,
      }),
    ),
  );
}

function finiteDuration(value, fallback = 0) {
  const candidate =
    value === undefined || value === null ? fallback : value;
  const duration = Number(candidate);
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

function sampleMotionProgress(
  elapsed,
  delay,
  duration,
  easing,
) {
  const safeDelay = finiteDuration(delay);
  const safeDuration = finiteDuration(duration);
  const localElapsed = finiteDuration(elapsed) - safeDelay;
  if (localElapsed <= 0) {
    return 0;
  }
  if (safeDuration === 0 || localElapsed >= safeDuration) {
    return 1;
  }
  return sampleCubicBezier(
    localElapsed / safeDuration,
    ...(easing ?? ANNOUNCEMENT_EASE),
  );
}

function sampleMotionFrames(
  elapsed,
  delay,
  duration,
  frames,
  easing,
  target,
) {
  const progress = sampleMotionProgress(
    elapsed,
    delay,
    duration,
    easing,
  );
  let rightIndex = frames.findIndex(
    (frame) => frame.offset >= progress,
  );
  if (rightIndex <= 0) {
    return copyMotionFrame(
      target,
      frames[Math.max(0, rightIndex)],
    );
  }
  if (rightIndex < 0) {
    return copyMotionFrame(target, frames.at(-1));
  }
  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const span = Math.max(0.0001, right.offset - left.offset);
  const local = (progress - left.offset) / span;
  target.alpha = interpolate(left.alpha, right.alpha, local);
  target.scale = interpolate(left.scale, right.scale, local);
  target.x = interpolate(left.x, right.x, local);
  target.y = interpolate(left.y, right.y, local);
  return target;
}

function copyMotionFrame(target, frame) {
  target.alpha = frame.alpha;
  target.scale = frame.scale;
  target.x = frame.x;
  target.y = frame.y;
  return target;
}

function captureDisplayMotionBase(displayObject) {
  if (!displayObject) {
    return null;
  }
  let base = DISPLAY_MOTION_BASES.get(displayObject);
  if (!base) {
    base = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
    };
    DISPLAY_MOTION_BASES.set(displayObject, base);
  }
  base.x = displayObject.position?.x ?? displayObject.x ?? 0;
  base.y = displayObject.position?.y ?? displayObject.y ?? 0;
  base.scaleX = displayObject.scale?.x ?? 1;
  base.scaleY = displayObject.scale?.y ?? 1;
  base.alpha = displayObject.alpha ?? 1;
  return base;
}

function applyDisplayMotion(displayObject, state) {
  if (!displayObject || !state) {
    return;
  }
  const base =
    DISPLAY_MOTION_BASES.get(displayObject) ??
    captureDisplayMotionBase(displayObject);
  displayObject.position.set(
    base.x + state.x,
    base.y + state.y,
  );
  displayObject.scale.set(
    base.scaleX * state.scale,
    base.scaleY * state.scale,
  );
  displayObject.alpha = state.alpha;
}

function restoreDisplayMotion(displayObject) {
  const base = DISPLAY_MOTION_BASES.get(displayObject);
  if (!displayObject || !base) {
    return;
  }
  displayObject.position.set(base.x, base.y);
  displayObject.scale.set(base.scaleX, base.scaleY);
  displayObject.alpha = base.alpha;
}

function getReducedMotion(preference) {
  try {
    return Boolean(
      typeof preference === 'function'
        ? preference()
        : preference,
    );
  } catch {
    return false;
  }
}

function sampleCubicBezier(progress, x1, y1, x2, y2) {
  const target = clampUnit(progress);
  if (target === 0 || target === 1) {
    return target;
  }
  let low = 0;
  let high = 1;
  let parameter = target;
  for (let index = 0; index < 10; index += 1) {
    const x = sampleBezierCoordinate(parameter, x1, x2);
    if (Math.abs(x - target) < 0.00001) {
      break;
    }
    if (x < target) {
      low = parameter;
    } else {
      high = parameter;
    }
    parameter = (low + high) / 2;
  }
  return sampleBezierCoordinate(parameter, y1, y2);
}

function sampleBezierCoordinate(parameter, first, second) {
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * parameter * first +
    3 * inverse * parameter * parameter * second +
    parameter * parameter * parameter
  );
}

function interpolate(from, to, progress) {
  return from + (to - from) * clampUnit(progress);
}

function normalizeLevelRewardCountUp(data = {}) {
  const from = Number(data.countUp?.from);
  const to = Number(data.countUp?.to);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    to <= from
  ) {
    return null;
  }
  return {
    from,
    to,
    suffix: String(data.countUp?.suffix ?? ''),
    precision: Math.max(
      getDecimalPrecision(from),
      getDecimalPrecision(to),
    ),
  };
}

function formatLevelRewardCountUp(countUp, progress) {
  const value = interpolate(
    countUp.from,
    countUp.to,
    progress,
  );
  const factor = 10 ** countUp.precision;
  const rounded = Math.round(value * factor) / factor;
  const fixed = rounded.toFixed(countUp.precision);
  const formatted = fixed.includes('.')
    ? fixed.replace(/\.?0+$/, '')
    : fixed;
  return `${formatted}${countUp.suffix}`;
}

function getDecimalPrecision(value) {
  const text = String(Number(value));
  const decimal = text.indexOf('.');
  return decimal < 0
    ? 0
    : Math.min(4, text.length - decimal - 1);
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches,
  );
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(callback, 16) ?? null;
}

function cancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}
