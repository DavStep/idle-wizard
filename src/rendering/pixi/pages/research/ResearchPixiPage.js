import {
  CanvasTextMetrics,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { formatRemainingTime } from '../../../../pages/shared/timerDisplay.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiBaseButton } from '../../primitives/PixiBaseButton.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import {
  createTimedProgressWindow,
} from '../../primitives/PixiProgressBar.js';
import { PixiResourceLabel } from '../../primitives/PixiResourceLabel.js';
import {
  PixiTextLabel,
  normalizePixiTextStroke,
} from '../../primitives/PixiTextLabel.js';
import {
  bindPixiSeedPackIcon,
  layoutPixiSeedPackIcon,
} from '../../primitives/PixiSeedPackIcon.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_SQUIRCLE_TINTS,
  PIXI_TEXT_STROKE_WIDTH,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedTimedProgressBar,
  RetainedScrollArea,
  applyTextTheme,
  createRetainedInputId,
  createText,
  finiteOr,
  normalizeRows,
  resolveRetainedPageBottomClearance,
  setText,
} from '../workshop/RetainedPageKit.js';
import { PixiTooltip } from '../shared/PixiTooltip.js';
const MAX_LOCKED_ROWS_PER_BOX = 1;
export const RESEARCH_PAPER_INK = '#634934';
export const RESEARCH_PROGRESS_INK = '#725737';
export const RESEARCH_RANK_INK = '#ffeecf';
const RESEARCH_TIMER_INK = '#d4d4d4';
const RESEARCH_LOCKED_OVERLAY_ALPHA = 0.3;
const RESEARCH_BUTTON_SHINE_DURATION_MS = 220;
export const RESEARCH_WIDGET_SHINE_DURATION_MS = 300;
export const RESEARCH_WIDGET_BOUNCE_DURATION_MS = 360;
const RESEARCH_BUTTON_SHINE_HEIGHT_SCALE = 1.05;
const RESEARCH_BUTTON_SHINE_ALPHA = 0.72;
const RESEARCH_BUTTON_SHINE_CORNER_RADIUS_SCALE = 0.28;
export const RESEARCH_WIDGET_SHINE_HEIGHT_SCALE = 1.05;
export const RESEARCH_WIDGET_SHINE_ALPHA = 0.5;
export const RESEARCH_WIDGET_SHINE_CORNER_RADIUS_SCALE = 0.16;
const RESEARCH_TAB_LOCK_WIDTH = 18;
const RESEARCH_TAB_LOCK_HEIGHT = 20.5;
const RESEARCH_VISIBILITY_BUTTON_SIZE = 28;
const RESEARCH_VISIBILITY_BUTTON_RIGHT_INSET = 8;
const RESEARCH_VISIBILITY_ICON_WIDTH = 22;
const RESEARCH_VISIBILITY_ICON_HEIGHT = 14;
const RESEARCH_VISIBILITY_ICON_INK = 0xfff2df;
const RESEARCH_COMPLETED_CHECK_WIDTH = 30;
const RESEARCH_COMPLETED_CHECK_HEIGHT = 28;
const RESEARCH_TIMER_REVISION_FIELDS = new Set([
  'elapsedMs',
  'percent',
  'progress',
  'remainingLabel',
  'remainingMs',
  'remainingSeconds',
  'timerLabel',
  'timerText',
]);
export const RESEARCH_RANK_FONT =
  '"Lilita One", "Arial Black", Arial, sans-serif';
const RESOURCE_WORD_MATCH_PATTERN =
  /\b(?:crystals?|emeralds?|coin|herbs?|mana|rubies|ruby|seeds?)\b/i;
const RESOURCE_AMOUNT_PREFIX_PATTERN =
  /([+-]?(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?(?:\s*-\s*\d[\d,]*(?:\.\d+)?(?:[a-z])?)?)|(?:\d[\d,]*(?:\/\d[\d,]*)+)|\?)(?:\s*\/\s*(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?)|\?))?\s+)$/i;
const MANA_NON_RESOURCE_PHRASE_PATTERN = /^\s+(?:sphere|tonic)\b/i;

function createResearchVisibilityIcon() {
  return new Graphics({ label: 'research-completed-toggle:icon' })
    .moveTo(1, RESEARCH_VISIBILITY_ICON_HEIGHT / 2)
    .bezierCurveTo(5, 1.5, 17, 1.5, 21, RESEARCH_VISIBILITY_ICON_HEIGHT / 2)
    .bezierCurveTo(17, 12.5, 5, 12.5, 1, RESEARCH_VISIBILITY_ICON_HEIGHT / 2)
    .closePath()
    .stroke({
      color: RESEARCH_VISIBILITY_ICON_INK,
      width: 2,
      cap: 'round',
      join: 'round',
    })
    .circle(
      RESEARCH_VISIBILITY_ICON_WIDTH / 2,
      RESEARCH_VISIBILITY_ICON_HEIGHT / 2,
      2.5,
    )
    .fill(RESEARCH_VISIBILITY_ICON_INK);
}

const CARD_SOURCE_INSETS =
  PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets;
const CARD_BORDER_INSETS =
  PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets;
const ART_SOURCE_INSETS = Object.freeze({
  top: 41,
  right: 41,
  bottom: 41,
  left: 41,
});
const ART_BORDER_INSETS = Object.freeze({
  top: 49 / 3,
  right: 50 / 3,
  bottom: 50 / 3,
  left: 49 / 3,
});
const STATION_TITLE_SOURCE_HEIGHT = 117;
const STATION_TITLE_RENDER_SCALE = 0.75;
const STATION_TITLE_SOURCE_INSETS = Object.freeze({
  top: 0,
  right: 165,
  bottom: 0,
  left: 5,
});
const STATION_TITLE_HEIGHT = 42;
const STATION_TITLE_RENDER_HEIGHT =
  STATION_TITLE_HEIGHT * STATION_TITLE_RENDER_SCALE;
const STATION_TITLE_SCALE =
  STATION_TITLE_HEIGHT / STATION_TITLE_SOURCE_HEIGHT;
const STATION_TITLE_BORDER_INSETS = Object.freeze({
  top: 0,
  right: STATION_TITLE_SOURCE_INSETS.right * STATION_TITLE_SCALE,
  bottom: 0,
  left: STATION_TITLE_SOURCE_INSETS.left * STATION_TITLE_SCALE,
});
const STATION_TITLE_TEXT_INSET_X = 12;
const STATION_TITLE_WIDTH_ALLOWANCE = 60;
const STATION_TITLE_MIN_WIDTH = Math.max(
  STATION_TITLE_WIDTH_ALLOWANCE,
  Math.ceil(
    STATION_TITLE_BORDER_INSETS.left + STATION_TITLE_BORDER_INSETS.right,
  ),
);
const STATION_TITLE_MIN_FONT_SIZE = 13;
const STATION_TITLE_FONT_SIZE = 18;
const STATION_TITLE_TEXT_STYLE = Object.freeze({
  fontFamily: RESEARCH_RANK_FONT,
  fontSize: STATION_TITLE_FONT_SIZE,
  fontWeight: '400',
  fill: '#ffffff',
  lineHeight: 21,
  stroke: Object.freeze({
    color: '#0a0a0a',
    width: PIXI_TEXT_STROKE_WIDTH,
    join: 'round',
  }),
  padding: 2,
});
const STATION_TITLE_VARIANTS = Object.freeze({
  regular: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.researchStationTitleRegular,
  }),
  automation: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.researchStationTitleAutomation,
  }),
  advanced: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.researchStationTitleAdvanced,
  }),
  crystal: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.researchStationTitleCrystal,
  }),
  brewing: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.researchStationTitleBrewing,
  }),
});
const RESEARCH_CARD_OFFSET_X = -2;
const RESEARCH_CARD_WIDTH =
  RETAINED_PAGE_GEOMETRY.width -
  RETAINED_PAGE_GEOMETRY.contentEdge * 2 -
  RESEARCH_CARD_OFFSET_X;

export function getResearchWidgetBounceScale(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(
      `Research widget bounce progress must be between 0 and 1, got ${progress}.`,
    );
  }
  if (progress <= 0.28) {
    return lerp(1, 1.035, easeOutCubic(progress / 0.28));
  }
  if (progress <= 0.62) {
    return lerp(
      1.035,
      0.992,
      easeInOutCubic((progress - 0.28) / 0.34),
    );
  }
  return lerp(
    0.992,
    1,
    easeOutCubic((progress - 0.62) / 0.38),
  );
}

export function getResearchShineLayout(
  bounds,
  textureWidth,
  textureHeight,
  { heightScale, cornerRadiusScale },
) {
  if (
    !Number.isFinite(bounds?.x) ||
    !Number.isFinite(bounds?.y) ||
    !Number.isFinite(bounds?.width) ||
    !Number.isFinite(bounds?.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    !Number.isFinite(textureWidth) ||
    !Number.isFinite(textureHeight) ||
    textureWidth <= 0 ||
    textureHeight <= 0
  ) {
    throw new Error('Research shine requires positive finite bounds and texture dimensions.');
  }
  const shineHeight = bounds.height * heightScale;
  const shineWidth = (shineHeight * textureWidth) / textureHeight;
  return Object.freeze({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    cornerRadius:
      Math.min(bounds.width, bounds.height) * cornerRadiusScale,
    shineWidth,
    shineHeight,
    startX: bounds.x - shineWidth / 2,
    endX: bounds.x + bounds.width + shineWidth / 2,
    centerY: bounds.y + bounds.height / 2,
  });
}

function normalizeStationTitleVariant(tabId) {
  if (
    tabId === 'automation' ||
    tabId === 'advanced' ||
    tabId === 'brewing'
  ) {
    return tabId;
  }
  if (tabId === 'emerald' || tabId === 'crystal') {
    return 'crystal';
  }
  return 'regular';
}

function getResearchStarSlotCount(research, starLevel) {
  const maxLevel = Math.floor(
    Number(research.star?.maxLevel ?? research.starMaxLevel),
  );

  if (Number.isInteger(maxLevel) && maxLevel > 0) {
    return maxLevel > 1 ? Math.min(maxLevel, 3) : 0;
  }

  return starLevel > 0 ? 3 : 0;
}

export const RESEARCH_PIXI_GEOMETRY = Object.freeze({
  cardWidth: RESEARCH_CARD_WIDTH,
  rowHeight: 80,
  contentOffsetY: 3,
  rowGap: 5,
  categoryGap: 18,
  categoryTitleHeight: STATION_TITLE_RENDER_HEIGHT,
  cardOffsetX: RESEARCH_CARD_OFFSET_X,
  artX: 13,
  artY: 14,
  artWidth: 52,
  artHeight: 52,
  artworkSize: 57,
  seedArtworkSize: 46,
  nameX: 10,
  nameY: 0,
  nameMaxWidth: 225,
  infoX: 252 / 3,
  infoWidth: 422 / 3,
  descriptionX: 74,
  descriptionY: 24,
  descriptionWidth: 160,
  descriptionBottom: 7,
  descriptionOpticalOffsetY: -10,
  valueWidth: 281 / 3,
  actionRight: 30 / 3,
  actionTop: 8,
  actionHeight: 64,
  costWidth: 72,
  costHeight: 42,
  progressBottom: 7,
  progressHeight: PIXI_UI_GEOMETRY.progressTotalHeight,
});

export const RESEARCH_ROW_TEXT = Object.freeze({
  nameFontSize: 12,
  nameLineHeight: 14,
  descriptionFontSize: 11,
  descriptionLineHeight: 13,
  descriptionMinFontSize: 8,
  valueFontSize: 12,
  timedValueFontSize: 10,
  valueLineHeight: 14,
  researchingFontSize: 10,
  researchingLineHeight: 11,
  researchingTimerFontSize: 9,
  researchingTimerLineHeight: 10,
  buttonStrokeWidth: 3.5,
  costContentScale: 0.88,
});

function fitResearchDescription(description, geometry) {
  const maxHeight =
    geometry.rowHeight - geometry.descriptionY - geometry.descriptionBottom;
  const lineHeightRatio =
    RESEARCH_ROW_TEXT.descriptionLineHeight /
    RESEARCH_ROW_TEXT.descriptionFontSize;
  let metrics = null;

  for (
    let fontSize = RESEARCH_ROW_TEXT.descriptionFontSize;
    fontSize >= RESEARCH_ROW_TEXT.descriptionMinFontSize;
    fontSize -= 0.25
  ) {
    description.style.fontSize = fontSize;
    description.style.lineHeight =
      Math.round(fontSize * lineHeightRatio * 4) / 4;
    metrics = CanvasTextMetrics.measureText(
      description.text,
      description.style,
    );

    if (
      metrics.width <= geometry.descriptionWidth + 0.5 &&
      metrics.height <= maxHeight + 0.5
    ) {
      break;
    }
  }

  const measuredHeight = Math.min(metrics?.height ?? 0, maxHeight);
  description.position.set(
    geometry.descriptionX,
    Math.round(
      (
        geometry.descriptionY +
        (maxHeight - measuredHeight) / 2 +
        geometry.descriptionOpticalOffsetY
      ) * 2,
    ) / 2,
  );
}

export class ResearchPixiPage extends BaseRetainedPixiPage {
  constructor({
    assetManager = null,
    semanticTargets = null,
    inputRouter = null,
    ticker = null,
    timeSource = () => Date.now(),
    prefersReducedMotion = () =>
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ===
      true,
    actions = {},
    counters = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ pageId: 'research', semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.ticker = ticker;
    this.timeSource = timeSource;
    this.prefersReducedMotion = prefersReducedMotion;
    this.actions = actions;
    this.selectedTabId = 'regular';
    this.completedSectionIds = new Set();
    this.currentResearchBoxes = [];
    this.renderRevision = null;
    this.active = false;
    this.tickHandler = () => this.tick();

    this.scroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: 'research-page-scroll',
      inputRouter: this.inputRouter,
    });
    this.tabsLayer = new Container({ label: 'research-page-tabs' });
    this.lockTooltip = new ResearchLockTooltip({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      prefersReducedMotion: this.prefersReducedMotion,
    });
    this.lockTooltipResearchId = null;
    this.content.addChild(
      this.scroll.root,
      this.tabsLayer,
      this.lockTooltip.root,
    );

    this.boxPool = new WidgetPool({
      name: 'research box pool',
      counters,
      create: () => new ResearchBoxWidget({ page: this }),
      reset: (box) => box.reset(),
      dispose: (box) => box.destroy(),
      maxSize: 24,
    });
    this.boxes = new PooledCollection({
      name: 'research boxes',
      pool: this.boxPool,
      counters,
      keyOf: (box) => box.id,
      bind: (widget, box) => widget.bind(box),
      afterReconcile: (widgets) => this.orderBoxWidgets(widgets),
    });

    this.rowPool = new WidgetPool({
      name: 'research row pool',
      counters,
      create: () =>
        new ResearchRowWidget({
          page: this,
          assetManager: this.assetManager,
          timeSource: this.timeSource,
          prefersReducedMotion: this.prefersReducedMotion,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 128,
    });
    this.rows = new PooledCollection({
      name: 'research rows',
      pool: this.rowPool,
      counters,
      keyOf: (entry) => entry.research.id,
      bind: (widget, entry) =>
        widget.bind(entry.research, this.getRowActions(), entry.boxId),
    });

    this.tabPool = new WidgetPool({
      name: 'research tab pool',
      counters,
      create: () => {
        const button = new RetainedButton({
          assetManager: this.assetManager,
          buttonLabel: 'research-tab',
          inputRouter: this.inputRouter,
          sizeTier: 30,
          variant: 'tab',
        });
        button.control.textLabel
          .setFontSize(10)
          .setLineHeight(12)
          .setAlign('center');
        button.lockIcon = new Sprite({
          texture:
            this.assetManager?.getAtlasTexture?.('status:lockDefault') ??
            this.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.lock) ??
            Texture.EMPTY,
          label: 'research-tab:lock',
          roundPixels: true,
        });
        button.lockIcon.anchor.set(0.5);
        button.lockIcon.width = RESEARCH_TAB_LOCK_WIDTH;
        button.lockIcon.height = RESEARCH_TAB_LOCK_HEIGHT;
        button.lockIcon.visible = false;
        button.lockIcon.renderable = false;
        button.control.visual.addChild(button.lockIcon);
        return button;
      },
      reset: (button) => button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.tabs = new PooledCollection({
      name: 'research tabs',
      pool: this.tabPool,
      counters,
      keyOf: (tab) => tab.id,
      bind: (button, tab) => this.bindTab(button, tab),
      afterReconcile: (buttons) => this.orderTabButtons(buttons),
    });

    this.applyTheme(theme);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  renderViewModel(viewModel) {
    const research = viewModel.research ?? viewModel;
    this.currentActions =
      viewModel.actions ?? research.actions ?? this.actions;
    const renderRevision = createResearchRenderRevision(viewModel);
    if (
      this.renderRevision !== null &&
      renderRevision === this.renderRevision
    ) {
      return;
    }
    this.renderRevision = renderRevision;
    const tabs =
      Array.isArray(research.tabs) && research.tabs.length > 0
        ? research.tabs
        : [
            {
              id: 'regular',
              label: 'regular research',
              boxes: research.boxes ?? [],
            },
          ];
    this.selectedTabId =
      research.selectedTabId ??
      tabs.find((tab) => tab.selected)?.id ??
      this.selectedTabId;
    const selectedTab =
      research.selectedTab ??
      tabs.find((tab) => tab.id === this.selectedTabId) ??
      tabs[0];
    this.selectedTabId = selectedTab?.id ?? 'regular';
    const visibleTabTargetIds = new Set(
      tabs.map((tab) => `research.tab.${tab.id}`),
    );

    for (const semanticId of [...this.registeredTargetIds]) {
      if (
        semanticId.startsWith('research.tab.') &&
        !visibleTabTargetIds.has(semanticId)
      ) {
        this.unregisterSemanticTarget(semanticId);
      }
    }

    this.tabs.reconcile(tabs);
    this.tabsLayer.visible = tabs.length > 1;

    const boxes = normalizeRows(selectedTab?.boxes);
    this.currentResearchBoxes = boxes;
    this.boxes.reconcile(boxes);
    const rows = boxes.flatMap((box) =>
      getOrderedResearches(box).map((item) => ({
        boxId: box.id,
        research: {
          ...item,
          artAssetId:
            item.artAssetId ?? item.artKey ?? box.artAssetId ?? box.artKey,
        },
      })),
    );
    this.rows.reconcile(rows);
    this.attachRowsToBoxes(boxes);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  getRowActions() {
    return {
      buy: (research) => {
        this.hideLockTooltip();
        return (
          research.onBuy?.(research.id) ??
          this.currentActions?.buyResearch?.(research.id)
        );
      },
      locked: (research, target) => {
        const shown = this.showLockTooltip(research, target);
        const action =
          research.onLocked ??
          this.currentActions?.showLockedReason;
        action?.(research);
        return shown;
      },
    };
  }

  showLockTooltip(research, target) {
    const copy =
      research?.cost?.lockPrompt ??
      formatResearchLockPrompt(research?.lockReason);
    if (!copy || !target) {
      this.hideLockTooltip();
      return false;
    }

    this.lockTooltipResearchId = research.id;
    this.lockTooltip.bind(copy);
    this.positionLockTooltip(target);
    return true;
  }

  positionLockTooltip(target, { animate = true } = {}) {
    if (!target) {
      return;
    }
    this.lockTooltip.showNearTarget({
      target,
      container: this.content,
      boundaryWidth: this.sourceWidth,
      boundaryHeight: this.sourceHeight,
      animate,
    });
  }

  hideLockTooltip() {
    this.lockTooltipResearchId = null;
    this.lockTooltip?.hide();
  }

  bindTab(button, tab) {
    const locked = tab.locked === true || tab.unlocked === false;
    button.applyTheme(this.theme);
    button.setModel({
      label: formatResearchTitle(tab.label ?? tab.id),
      locked,
      selected: !locked && tab.id === this.selectedTabId,
      notification:
        !locked &&
        (tab.notification === true ||
          (tab.boxes ?? []).some((box) =>
            (box.allResearches ?? box.researches ?? []).some(
              (item) => item.canResearch === true,
            ),
          )),
      action: () => {
        if (locked) {
          return this.showTabLockTooltip(tab, button.root);
        }
        if (tab.id === this.selectedTabId) {
          return false;
        }
        this.selectedTabId = tab.id;
        return this.currentActions?.selectTab?.(tab.id) ?? true;
      },
    });
    button.control.textLabel.visible = !locked;
    button.control.textLabel.renderable = !locked;
    button.lockIcon.visible = locked;
    button.lockIcon.renderable = locked;
    this.registerSemanticTarget({
      semanticId: `research.tab.${tab.id}`,
      tutorialId: tab.tutorialId ?? null,
      displayObject: button.root,
      state: () => ({
        enabled: true,
        interactive: button.root.eventMode !== 'none',
        locked,
      }),
      activate: () => button.handleTap(),
    });
  }

  showTabLockTooltip(tab, target) {
    const requiredLevel = Math.max(
      1,
      Math.floor(Number(tab?.requiredLevel) || 1),
    );
    const copy = tab?.lockPrompt || `Unlocks at level ${requiredLevel}`;
    this.lockTooltipResearchId = null;
    this.lockTooltip.bind(copy);
    this.positionLockTooltip(target);
    return true;
  }

  orderTabButtons(buttons) {
    this.tabsLayer.removeChildren();
    for (const button of buttons) {
      this.tabsLayer.addChild(button.root);
    }
  }

  orderBoxWidgets(widgets) {
    this.scroll.content.removeChildren();
    for (const widget of widgets) {
      this.scroll.content.addChild(widget.root);
    }
  }

  attachRowsToBoxes(boxes) {
    for (const box of boxes) {
      const boxWidget = this.boxes.get(box.id);
      if (!boxWidget) {
        continue;
      }
      const rowWidgets = getVisibleResearches(
        box,
        this.isShowingCompletedResearches(box.id),
      )
        .map((item) => this.rows.get(item.id))
        .filter(Boolean);
      boxWidget.setRows(rowWidgets);
    }
  }

  applyThemeToChildren(theme) {
    for (const widget of this.boxes?.getWidgets?.() ?? []) {
      widget.applyTheme(theme);
    }
    for (const row of this.rows?.getWidgets?.() ?? []) {
      row.applyTheme(theme);
    }
    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(theme);
    }
    this.lockTooltip?.applyTheme(theme);
  }

  layoutPage(sourceWidth, sourceHeight) {
    if (!this.scroll) {
      return;
    }
    const edge = RETAINED_PAGE_GEOMETRY.contentEdge;
    const contentHeight =
      sourceHeight -
      RETAINED_PAGE_GEOMETRY.contentTop -
      resolveRetainedPageBottomClearance(this.viewModel);
    const width = sourceWidth - edge * 2;
    const scrollWidth = sourceWidth - edge;
    const tabClearance =
      RETAINED_PAGE_GEOMETRY.tabHeight +
      RETAINED_PAGE_GEOMETRY.scrollCut * 2;
    this.contentHeight = contentHeight;
    this.contentWidth = width;
    this.contentEdge = edge;
    this.scrollWidth = scrollWidth;
    this.scroll.setBounds(
      0,
      RETAINED_PAGE_GEOMETRY.contentTop,
      scrollWidth,
      contentHeight - tabClearance,
    );
    this.tabsLayer.position.set(
      edge,
      RETAINED_PAGE_GEOMETRY.contentTop +
        contentHeight -
        6 -
        RETAINED_PAGE_GEOMETRY.tabHeight,
    );
    this.layoutResearchContent();
  }

  layoutResearchContent() {
    if (!this.boxes || !this.scroll) {
      return;
    }
    let y = RETAINED_PAGE_GEOMETRY.scrollCut;

    for (const box of this.boxes.getWidgets()) {
      box.setBounds(
        0,
        y,
        this.scrollWidth,
        this.contentEdge,
      );
      y += box.getPreferredHeight() + RESEARCH_PIXI_GEOMETRY.categoryGap;
    }
    this.scroll.setContentHeight(
      Math.max(
        0,
        y -
          RESEARCH_PIXI_GEOMETRY.categoryGap +
          RETAINED_PAGE_GEOMETRY.scrollCut,
      ),
    );

    const tabButtons = this.tabs.getWidgets();
    const gap = 3;
    const buttonWidth =
      tabButtons.length > 0
        ? (this.contentWidth - gap * (tabButtons.length - 1)) /
          tabButtons.length
        : 0;
    let x = 0;
    for (const button of tabButtons) {
      button.setBounds(
        x,
        0,
        buttonWidth,
        RETAINED_PAGE_GEOMETRY.tabHeight,
      );
      button.control.textLabel.setWrapWidth(
        Math.max(0, buttonWidth - 6),
      );
      button.lockIcon?.position.set(
        buttonWidth / 2,
        RETAINED_PAGE_GEOMETRY.tabHeight / 2,
      );
      x += buttonWidth + gap;
    }

    if (this.lockTooltipResearchId) {
      const row = this.rows.get(this.lockTooltipResearchId);
      if (row?.research?.locked === true) {
        this.positionLockTooltip(row.costButton, { animate: false });
      } else {
        this.hideLockTooltip();
      }
    }
  }

  activate() {
    if (this.active) {
      return;
    }
    super.activate();
    this.active = true;
    this.ticker?.add?.(this.tickHandler);
  }

  deactivate() {
    if (!this.active) {
      return;
    }
    this.ticker?.remove?.(this.tickHandler);
    this.hideLockTooltip();
    this.active = false;
    super.deactivate();
  }

  tick() {
    const now = this.timeSource();
    this.lockTooltip?.updateTime();
    for (const row of this.rows?.getWidgets?.() ?? []) {
      row.updateTime(now);
    }
  }

  destroyPage() {
    this.ticker?.remove?.(this.tickHandler);
    this.active = false;
    this.lockTooltip?.destroy();
    this.lockTooltip = null;
    this.rows?.destroy();
    this.rowPool?.destroy();
    this.boxes?.destroy();
    this.boxPool?.destroy();
    this.tabs?.destroy();
    this.tabPool?.destroy();
    this.scroll?.destroy();
  }

  getCompletedSectionId(boxId) {
    return `${this.selectedTabId}:${boxId}`;
  }

  isShowingCompletedResearches(boxId) {
    return this.completedSectionIds.has(this.getCompletedSectionId(boxId));
  }

  toggleCompletedResearches(boxId) {
    const sectionId = this.getCompletedSectionId(boxId);
    if (this.completedSectionIds.has(sectionId)) {
      this.completedSectionIds.delete(sectionId);
    } else {
      this.completedSectionIds.add(sectionId);
    }
    this.attachRowsToBoxes(this.currentResearchBoxes);
    this.layoutResearchContent();
    return true;
  }
}

export class ResearchLockTooltip extends PixiTooltip {
  constructor(options = {}) {
    super({ label: 'research-lock-tooltip', ...options });
  }
}

export class ResearchBoxWidget {
  constructor({ page }) {
    this.page = page;
    this.theme = page.theme;
    this.root = new Container({ label: 'research-box' });
    this.titlePlaque = new ResearchStationTitlePlaque({
      assetManager: page.assetManager,
    });
    this.title = this.titlePlaque.title;
    this.visibilityButton = new PixiBaseButton({
      assetManager: page.assetManager,
      fallbackHitTest: true,
      height: RESEARCH_VISIBILITY_BUTTON_SIZE,
      inputRouter: page.inputRouter,
      label: 'research-completed-toggle',
      variant: 'inline',
      width: RESEARCH_VISIBILITY_BUTTON_SIZE,
    });
    this.visibilityIcon = createResearchVisibilityIcon();
    this.visibilityIcon.position.set(
      (RESEARCH_VISIBILITY_BUTTON_SIZE - RESEARCH_VISIBILITY_ICON_WIDTH) / 2,
      (RESEARCH_VISIBILITY_BUTTON_SIZE - RESEARCH_VISIBILITY_ICON_HEIGHT) / 2,
    );
    this.visibilityButton.visual.addChild(this.visibilityIcon);
    this.rowsLayer = new Container({ label: 'research-box-rows' });
    this.root.addChild(
      this.titlePlaque.root,
      this.visibilityButton,
      this.rowsLayer,
    );
    this.rowWidgets = [];
    this.preferredHeight = RESEARCH_PIXI_GEOMETRY.categoryTitleHeight;
    this.rows = {
      get: (researchId) => {
        const row = this.page.rows?.get(researchId);
        return row?.boxId === this.box?.id ? row : null;
      },
    };
    this.rowsPool = this.page.rowPool;
  }

  bind(box) {
    this.unregisterVisibilityTarget();
    this.box = box;
    this.hasCompletedResearch = getOrderedResearches(box).some(
      (research) => research.completed === true,
    );
    this.titlePlaque.bind(box.label ?? '', this.page.selectedTabId);
    this.visibilityTargetId =
      `research.completed.${this.page.selectedTabId}.${box.id}`;
    this.visibilityButton
      .setEnabled(this.hasCompletedResearch)
      .setAction(
        this.hasCompletedResearch
          ? () => this.page.toggleCompletedResearches(box.id)
          : null,
      );
    if (this.hasCompletedResearch) {
      this.page.registerSemanticTarget({
        semanticId: this.visibilityTargetId,
        displayObject: this.visibilityButton,
        state: () => ({
          enabled: true,
          interactive: this.visibilityButton.eventMode !== 'none',
          pressed: this.page.isShowingCompletedResearches(box.id),
        }),
        activate: () => this.visibilityButton.activate(),
      });
    } else {
      this.visibilityTargetId = null;
    }
    this.syncVisibilityToggle();
    this.applyTheme(this.page.theme);
  }

  setRows(rows) {
    this.rowWidgets = rows;
    this.rowsLayer.removeChildren();
    let y = 0;
    for (const row of rows) {
      this.rowsLayer.addChild(row.root);
      row.setBounds(0, y);
      y +=
        RESEARCH_PIXI_GEOMETRY.rowHeight +
        RESEARCH_PIXI_GEOMETRY.rowGap;
    }
    this.preferredHeight =
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      (rows.length > 0 ? RESEARCH_PIXI_GEOMETRY.rowGap + y -
        RESEARCH_PIXI_GEOMETRY.rowGap : 0);
    this.syncVisibilityToggle();
  }

  setBounds(x, y, width, rowInsetX = 0) {
    this.root.position.set(x, y);
    this.width = width;
    this.titlePlaque.setMaxWidth(width);
    this.visibilityButton.position.set(
      width -
        RESEARCH_VISIBILITY_BUTTON_SIZE -
        RESEARCH_VISIBILITY_BUTTON_RIGHT_INSET,
      (RESEARCH_PIXI_GEOMETRY.categoryTitleHeight -
        RESEARCH_VISIBILITY_BUTTON_SIZE) /
        2,
    );
    this.rowsLayer.position.set(
      rowInsetX,
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
        RESEARCH_PIXI_GEOMETRY.rowGap,
    );
  }

  getPreferredHeight() {
    return this.preferredHeight;
  }

  applyTheme(theme) {
    this.theme = theme;
    this.visibilityButton.applyTheme(theme);
    for (const row of this.rowWidgets) {
      row.applyTheme(theme);
    }
  }

  reset() {
    this.unregisterVisibilityTarget();
    this.rowsLayer.removeChildren();
    this.rowWidgets = [];
    this.box = null;
    this.hasCompletedResearch = false;
    this.titlePlaque.bind('', 'regular');
    this.visibilityButton.setAction(null).setEnabled(false);
    this.preferredHeight = RESEARCH_PIXI_GEOMETRY.categoryTitleHeight;
    this.syncVisibilityToggle();
  }

  destroy() {
    this.unregisterVisibilityTarget();
    this.root.destroy({ children: true });
  }

  syncVisibilityToggle() {
    const showing = this.box
      ? this.page.isShowingCompletedResearches(this.box.id)
      : false;
    this.visibilityButton.visible = this.hasCompletedResearch === true;
    this.visibilityButton.renderable = this.hasCompletedResearch === true;
    this.visibilityIcon.alpha = showing ? 1 : 0.45;
    this.visibilityButton.alpha = showing ? 1 : 0.72;
  }

  unregisterVisibilityTarget() {
    if (!this.visibilityTargetId) {
      return;
    }
    this.page.unregisterSemanticTarget(this.visibilityTargetId);
    this.visibilityTargetId = null;
  }
}

export class ResearchStationTitlePlaque {
  constructor({
    assetManager,
    trailingContent = null,
    trailingGap = 6,
  } = {}) {
    this.assetManager = assetManager;
    this.label = '';
    this.variant = 'regular';
    this.assetId = STATION_TITLE_VARIANTS.regular.assetId;
    this.maxWidth = Infinity;
    this.width = 0;
    this.trailingContent = trailingContent;
    this.trailingGap = Math.max(0, Number(trailingGap) || 0);
    this.root = new Container({ label: 'research-station-title-plaque' });
    this.root.scale.set(STATION_TITLE_RENDER_SCALE);
    this.frame = new PixiNineSliceFrame({
      texture: this.resolveTexture(this.assetId),
      sourceInsets: STATION_TITLE_SOURCE_INSETS,
      borderInsets: STATION_TITLE_BORDER_INSETS,
      width: STATION_TITLE_MIN_WIDTH,
      height: STATION_TITLE_HEIGHT,
      label: 'research-station-title-plaque-frame',
    });
    this.title = createText('', STATION_TITLE_TEXT_STYLE);
    this.title.anchor.set(0, 0.5);
    this.applyTitleStyle(STATION_TITLE_FONT_SIZE);
    this.root.addChild(this.frame, this.title);
    if (this.trailingContent) {
      this.root.addChild(this.trailingContent);
    }
    this.layout();
  }

  bind(label, tabId = 'regular') {
    this.label = formatResearchTitle(label);
    this.setVariant(normalizeStationTitleVariant(tabId));
    setText(this.title, this.label);
    this.layout();
  }

  setVariant(variant) {
    this.variant = variant;
    this.assetId =
      STATION_TITLE_VARIANTS[variant]?.assetId ??
      STATION_TITLE_VARIANTS.regular.assetId;
    this.frame.setTexture(
      this.resolveTexture(this.assetId),
      STATION_TITLE_SOURCE_INSETS,
    );
  }

  setMaxWidth(maxWidth) {
    this.maxWidth = Math.max(
      STATION_TITLE_MIN_WIDTH,
      finiteOr(maxWidth, STATION_TITLE_MIN_WIDTH),
    );
    this.layout();
  }

  layout() {
    let fontSize = STATION_TITLE_FONT_SIZE;
    this.applyTitleStyle(fontSize);
    const trailingWidth = this.getTrailingWidth();
    const trailingGap = trailingWidth > 0 ? this.trailingGap : 0;
    while (
      this.title.width +
        trailingGap +
        trailingWidth +
        STATION_TITLE_WIDTH_ALLOWANCE >
        this.maxWidth &&
      fontSize > STATION_TITLE_MIN_FONT_SIZE
    ) {
      fontSize -= 1;
      this.applyTitleStyle(fontSize);
    }

    this.width = Math.max(
      STATION_TITLE_MIN_WIDTH,
      Math.min(
        this.maxWidth,
        Math.ceil(
          this.title.width +
            trailingGap +
            trailingWidth +
            STATION_TITLE_WIDTH_ALLOWANCE,
        ),
      ),
    );
    this.frame.setSize(
      this.width,
      STATION_TITLE_HEIGHT,
      STATION_TITLE_BORDER_INSETS,
    );
    this.title.position.set(
      STATION_TITLE_TEXT_INSET_X,
      STATION_TITLE_HEIGHT / 2,
    );
    if (this.trailingContent) {
      this.trailingContent.position.set(
        this.title.x + Math.ceil(this.title.width) + trailingGap,
        Math.round(
          (STATION_TITLE_HEIGHT -
            Math.max(0, Number(this.trailingContent.height) || 0)) /
            2,
        ),
      );
    }
  }

  getTrailingWidth() {
    if (
      !this.trailingContent ||
      this.trailingContent.visible === false ||
      this.trailingContent.renderable === false
    ) {
      return 0;
    }
    return Math.max(
      0,
      Number(
        this.trailingContent.measuredWidth ??
          this.trailingContent.width,
      ) || 0,
    );
  }

  applyTitleStyle(fontSize) {
    this.title.style = {
      ...STATION_TITLE_TEXT_STYLE,
      fontSize,
      lineHeight: Math.round((fontSize * 21) / 18),
      stroke: normalizePixiTextStroke(
        STATION_TITLE_TEXT_STYLE.stroke,
        fontSize,
      ),
    };
  }

  resolveTexture(assetId) {
    return this.assetManager?.has?.(assetId)
      ? this.assetManager.getTexture(assetId)
      : Texture.EMPTY;
  }
}

/**
 * Retained equivalent of main's `setResourceIconText` value cell. The value,
 * icon, and timer objects are constructed once with the row and only rebound.
 */
class ResearchReadonlyValue extends Container {
  constructor({ assetManager, label = 'research-readonly-value' } = {}) {
    super({ label });
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.value = '';
    this.timer = '';
    this.fontSize = 13;
    this.valueStyle = {
      fontSize: 13,
      lineHeight: 15,
      fill: DEFAULT_PIXI_THEME_SNAPSHOT.text,
    };
    this.plain = createText('', this.valueStyle);
    this.prefix = createText('', this.valueStyle);
    this.suffix = createText('', this.valueStyle);
    this.timerLabel = createText('', RETAINED_TEXT_STYLES.tiny);
    for (const text of [
      this.plain,
      this.prefix,
      this.suffix,
      this.timerLabel,
    ]) {
      text.anchor.set(0, 0.5);
    }
    this.resourceLabel = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      amount: '',
      fontSize: this.fontSize,
      includeResourceName: false,
      label: `${label}:resource`,
    });
    this.addChild(
      this.plain,
      this.prefix,
      this.resourceLabel,
      this.suffix,
      this.timerLabel,
    );
    this.applyTheme(this.theme, this.valueStyle);
  }

  setValue(value, timer = '') {
    this.value = String(value ?? '');
    this.timer = String(timer ?? '');
    this.relayout();
    return this;
  }

  applyTheme(theme, style = this.valueStyle) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.valueStyle = { ...this.valueStyle, ...style };
    this.fontSize = Number(this.valueStyle.fontSize) || 13;
    for (const text of [this.plain, this.prefix, this.suffix]) {
      applyTextTheme(text, this.theme, this.valueStyle);
    }
    applyTextTheme(this.timerLabel, this.theme, {
      ...RETAINED_TEXT_STYLES.tiny,
      fill: this.theme.text,
    });
    this.resourceLabel.fontSize = this.fontSize;
    this.resourceLabel.amountLabel
      .setFontSize(this.fontSize)
      .setLineHeight(this.valueStyle.lineHeight ?? this.fontSize)
      .setFontWeight(this.valueStyle.fontWeight ?? '400');
    this.resourceLabel.applyTheme(this.theme);
    this.relayout();
  }

  relayout() {
    const parsed = parseResearchResourceValue(this.value);
    const useResourceIcon =
      this.theme.iconMode === 'icons' && parsed !== null;
    let x = 0;

    this.plain.visible = !useResourceIcon;
    this.plain.renderable = this.plain.visible;
    this.prefix.visible = useResourceIcon;
    this.prefix.renderable = useResourceIcon;
    this.resourceLabel.visible = useResourceIcon;
    this.resourceLabel.renderable = useResourceIcon;
    this.suffix.visible = useResourceIcon;
    this.suffix.renderable = useResourceIcon;

    if (!useResourceIcon) {
      setText(this.plain, this.value);
      this.plain.position.set(0, 0);
      x = this.plain.width;
    } else {
      setText(this.prefix, parsed.prefix);
      setText(this.suffix, parsed.suffix);
      this.prefix.position.set(x, 0);
      x += this.prefix.width;

      this.resourceLabel
        .setResource(parsed.resource)
        .setAmount(parsed.amount);
      const amountWidth = this.resourceLabel.amountLabel.measuredWidth;
      const iconGap = amountWidth > 0 ? this.fontSize * 0.14 : 0;
      this.resourceLabel.amountLabel.position.set(0, this.fontSize * 0.5);
      this.resourceLabel.icon.position.set(
        amountWidth + iconGap,
        this.fontSize * 0.5,
      );
      this.resourceLabel.position.set(x, -this.fontSize * 0.5);
      x +=
        amountWidth +
        iconGap +
        this.resourceLabel.icon.width;

      this.suffix.position.set(x, 0);
      x += this.suffix.width;
    }

    setText(this.timerLabel, this.timer);
    this.timerLabel.visible = this.timer.length > 0;
    this.timerLabel.renderable = this.timerLabel.visible;
    if (this.timerLabel.visible) {
      x += this.fontSize * 0.25;
      this.timerLabel.position.set(x, 0);
      x += this.timerLabel.width;
    }

    this.pivot.set(x / 2, 0);
  }

  get text() {
    return [this.value, this.timer].filter(Boolean).join(' ');
  }
}

export class ResearchRowWidget {
  constructor({ page, assetManager, timeSource, prefersReducedMotion }) {
    this.page = page;
    this.assetManager = assetManager;
    this.timeSource = timeSource;
    this.prefersReducedMotion = prefersReducedMotion;
    this.theme = page.theme;
    this.boxId = null;
    this.root = new Container({ label: 'research-row' });
    this.card = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: CARD_SOURCE_INSETS,
      borderInsets: CARD_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.cardWidth,
      height: RESEARCH_PIXI_GEOMETRY.rowHeight,
      label: 'research-row-card',
    });
    this.infoVisual = new Container({ label: 'research-row-info-visual' });
    this.artWell = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: ART_SOURCE_INSETS,
      borderInsets: ART_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.artWidth,
      height: RESEARCH_PIXI_GEOMETRY.artHeight,
      label: 'research-row-art-well',
    });
    this.artWell.tint = PIXI_SQUIRCLE_TINTS.artWell;
    this.art = new Sprite({
      texture: Texture.EMPTY,
      label: 'research-row-art',
      roundPixels: true,
    });
    this.artOverlay = new Sprite({
      texture: Texture.EMPTY,
      label: 'research-row-art-overlay',
      roundPixels: true,
    });
    this.name = createText('', {
      fontSize: RESEARCH_ROW_TEXT.nameFontSize,
      lineHeight: RESEARCH_ROW_TEXT.nameLineHeight,
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.nameMaxWidth,
    });
    this.name.label = 'research-row-name';
    this.nameStars = new PixiStarLevelLabel({
      assetManager,
      label: 'research-row-name-stars',
    });
    this.description = createText('', {
      fontSize: RESEARCH_ROW_TEXT.descriptionFontSize,
      lineHeight: RESEARCH_ROW_TEXT.descriptionLineHeight,
      align: 'center',
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.infoWidth,
    });
    this.description.label = 'research-row-description';
    this.costButton = new PixiCostButton({
      assetManager,
      inputRouter: this.page.inputRouter,
      research: true,
      width: RESEARCH_PIXI_GEOMETRY.costWidth,
      height: RESEARCH_PIXI_GEOMETRY.costHeight,
      contentScale: RESEARCH_ROW_TEXT.costContentScale,
      label: 'research-row-cost',
    });
    this.valueButton = this.costButton;
    this.valueButton.text = this.costButton.amountLabel.textObject;
    this.researchedButton = new PixiCostButton({
      assetManager,
      research: true,
      tone: 'yellow',
      width: RESEARCH_PIXI_GEOMETRY.costWidth,
      height: RESEARCH_PIXI_GEOMETRY.costHeight,
      contentScale: RESEARCH_ROW_TEXT.costContentScale,
      label: 'research-row-researched',
    });
    this.researchedCheckmark = new Sprite({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.checkmark) ??
        Texture.EMPTY,
      label: 'research-row-researched-checkmark',
      roundPixels: true,
    });
    this.researchedCheckmark.anchor.set(0.5);
    this.researchedCheckmark.eventMode = 'none';
    this.researchedCheckmark.visible = false;
    this.researchedCheckmark.renderable = false;
    this.researchingTimerLabel = new PixiTextLabel({
      fontFamily: RESEARCH_RANK_FONT,
      fontSize: RESEARCH_ROW_TEXT.researchingTimerFontSize,
      lineHeight: RESEARCH_ROW_TEXT.researchingTimerLineHeight,
      align: 'center',
      color: RESEARCH_TIMER_INK,
      stroke: {
        color: '#0a0a0a',
        width: RESEARCH_ROW_TEXT.buttonStrokeWidth,
      },
      anchor: { x: 0.5, y: 0.5 },
      label: 'research-row-researching-timer',
    });
    this.researchingTimerLabel.visible = false;
    this.researchingTimerLabel.renderable = false;
    this.researchedButton.visual.addChild(this.researchingTimerLabel);
    this.readonlyValue = new ResearchReadonlyValue({
      assetManager,
      label: 'research-row-readonly-value',
    });
    this.readonlyStars = new PixiStarLevelLabel({
      assetManager,
      label: 'research-row-value-stars',
    });
    this.progress = new RetainedTimedProgressBar({
      assetManager,
      label: 'research-row-progress',
      tone: 'yellow',
    });
    this.lockedOverlay = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: CARD_SOURCE_INSETS,
      borderInsets: CARD_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.cardWidth,
      height: RESEARCH_PIXI_GEOMETRY.rowHeight,
      label: 'research-row-locked-overlay',
    });
    this.lockedOverlay.eventMode = 'none';
    this.lockedOverlay.tint = 0x000000;
    this.lockedOverlay.alpha = RESEARCH_LOCKED_OVERLAY_ALPHA;
    this.lockedOverlay.visible = false;
    this.lockedOverlay.renderable = false;
    const shineTexture = this.resolveTexture(
      PIXI_ROOT_RUN_ASSETS.researchButtonShine,
    );
    this.widgetShine = createResearchShine({
      texture: shineTexture,
      alpha: RESEARCH_WIDGET_SHINE_ALPHA,
      label: 'research-row-widget-shine',
    });
    this.buttonShine = createResearchShine({
      texture: shineTexture,
      alpha: RESEARCH_BUTTON_SHINE_ALPHA,
      label: 'research-row-button-shine',
    });
    this.purchaseEffect = null;
    this.labelHit = new Container({ label: 'research-row-label-hit' });
    this.labelHit.eventMode = 'static';
    this.labelHit.cursor = 'default';
    this.infoVisual.addChild(
      this.artWell,
      this.art,
      this.artOverlay,
      this.name,
      this.nameStars,
      this.description,
    );
    this.root.addChild(
      this.card,
      this.infoVisual,
      this.costButton,
      this.researchedButton,
      this.researchedCheckmark,
      this.readonlyValue,
      this.readonlyStars,
      this.progress.root,
      this.lockedOverlay,
      this.widgetShine.root,
      this.buttonShine.root,
      this.labelHit,
    );
    this.handleLocked = () =>
      this.research?.locked
        ? this.actions?.locked?.(this.research, this.costButton)
        : false;
    this.inputRegistration =
      this.page.inputRouter?.registerPressTarget?.(this.labelHit, {
        id: createRetainedInputId('research-row-label'),
        enabled: () => this.research?.locked === true,
        excludePageSwipe: true,
        onActivate: this.handleLocked,
      }) ?? null;
    this.usesDirectInput = !this.inputRegistration;
    if (this.usesDirectInput) {
      this.labelHit.on('pointertap', this.handleLocked);
    }
    this.layout();
  }

  bind(research, actions, boxId) {
    this.root.visible = true;
    this.root.renderable = true;
    this.research = research;
    this.actions = actions;
    this.boxId = boxId;
    this.targetId = research.semanticId ?? `research.${research.id}`;
    this.tutorialId = research.tutorialId ?? `research:${research.id}`;
    const state = normalizeResearchState(research);
    const locked = state === 'locked';
    this.lockedOverlay.visible = locked;
    this.lockedOverlay.renderable = locked;
    const starLevel =
      research.star?.level ?? finiteOr(research.starLevel, 0);
    const starSlotCount = getResearchStarSlotCount(research, starLevel);
    setText(
      this.name,
      formatResearchTitle(
        research.displayName ?? research.label ?? research.id,
      ),
    );
    this.nameStars.setLevel(starLevel, {
      slotCount: starSlotCount || 3,
    });
    this.nameStars.visible = starLevel > 0 && starSlotCount > 0;
    this.nameStars.renderable = this.nameStars.visible;
    setText(
      this.description,
      formatResearchDescription(
        research.description ??
          (research.showEffect === false ? '' : research.effect ?? ''),
      ),
    );
    this.bindArtwork(research);

    const interactive =
      state === 'available' || state === 'unavailable' || state === 'locked';
    const readonlyResearchValue =
      research.displayValue ?? research.value ?? research.status ?? '';
    const researched =
      state === 'completed' &&
      String(readonlyResearchValue).trim().toLowerCase() === 'researched';
    const inProgress =
      research.timer?.active === true || research.inProgress === true;
    this.costButton.visible = interactive;
    this.costButton.renderable = interactive;
    this.researchedButton.visible = inProgress;
    this.researchedButton.renderable = this.researchedButton.visible;
    this.researchedCheckmark.visible = researched;
    this.researchedCheckmark.renderable = researched;
    const remainingLabel =
      research.timer?.remainingLabel ??
      formatRemainingTime(
        finiteOr(
          research.timer?.remainingMs,
          finiteOr(research.remainingMs, 0),
        ),
      );
    this.researchedButton.setModel({
      amountLabel: this.formatInProgressButtonLabel(research),
      resource: 'none',
      enabled: false,
      action: null,
    });
    this.setResearchingTimer(inProgress ? remainingLabel : '');
    this.researchedButton.eventMode = 'none';
    this.researchedButton.cursor = 'default';
    this.readonlyValue.visible =
      !interactive && !researched && !inProgress && starLevel <= 0;
    this.readonlyValue.renderable = this.readonlyValue.visible;
    this.readonlyStars.visible =
      !interactive &&
      research.completed === true &&
      starLevel > 0 &&
      starSlotCount > 0;
    this.readonlyStars.renderable = this.readonlyStars.visible;
    this.readonlyStars.setLevel(starLevel, {
      slotCount: starSlotCount || 3,
    });
    const timer = research.timer ?? {};
    this.readonlyValue.setValue(
      timer.active
        ? timer.displayValue ?? readonlyResearchValue
        : readonlyResearchValue,
      timer.active ? timer.remainingLabel ?? '' : '',
    );

    if (interactive) {
      const cost = research.cost ?? {};
      this.costButton.setModel({
        amountLabel:
          cost.amountLabel ??
          research.displayValue ??
          research.value ??
          (state === 'locked' ? 'Locked' : 'Free'),
        resource: cost.resource ?? cost.currency ?? research.costCurrency,
        state:
          state === 'unavailable'
            ? 'unaffordable'
            : state === 'locked'
              ? 'locked'
              : 'available',
        lockReason: '',
        enabled: state === 'available' && research.canResearch === true,
        action: () => this.buyResearch(research),
      });
      this.costButton.setNotification(research.notification === true);
    }

    this.progress.root.visible = timer.active === true ||
      research.inProgress === true;
    this.progress.root.renderable = this.progress.root.visible;
    const now = this.timeSource();
    if (this.progress.root.visible) {
      this.progress
        .setTimer(createTimedProgressWindow({
          ...research,
          ...timer,
          remainingMs:
            timer.remainingMs ?? research.remainingMs,
          totalMs: timer.totalMs ?? research.totalMs,
          progress:
            timer.progress ??
            research.progress ??
            finiteOr(research.percent, 0) / 100,
        }, now))
        .updateTimer(now);
    } else {
      this.progress.clearTimer(0);
    }
    this.labelHit.cursor = locked ? 'pointer' : 'default';
    this.labelHit.eventMode = locked ? 'static' : 'none';
    this.applyTheme(this.page.theme);
    this.layout();

    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: this.tutorialId,
      displayObject: this.costButton,
      state: () => ({
        enabled:
          (state === 'available' && research.canResearch === true) ||
          state === 'locked',
        interactive: state === 'available' || state === 'locked',
        selected: false,
      }),
      activate: () => {
        if (state === 'available') {
          return this.buyResearch(research);
        }
        if (state === 'locked') {
          return this.actions?.locked?.(research, this.costButton);
        }
        return false;
      },
    });
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.layout();
  }

  layout() {
    const geometry = RESEARCH_PIXI_GEOMETRY;
    this.card.position.set(geometry.cardOffsetX, 0);
    this.card.setSize(
      geometry.cardWidth,
      geometry.rowHeight,
      CARD_BORDER_INSETS,
    );
    this.lockedOverlay.position.set(geometry.cardOffsetX, 0);
    this.lockedOverlay.setSize(
      geometry.cardWidth,
      geometry.rowHeight,
      CARD_BORDER_INSETS,
    );
    this.infoVisual.pivot.set(
      (geometry.cardWidth - geometry.valueWidth) / 2,
      geometry.rowHeight / 2,
    );
    this.infoVisual.position.set(
      (geometry.cardWidth - geometry.valueWidth) / 2,
      geometry.rowHeight / 2,
    );
    this.artWell.position.set(
      geometry.artX,
      geometry.artY + geometry.contentOffsetY,
    );
    this.artWell.setSize(
      geometry.artWidth,
      geometry.artHeight,
      ART_BORDER_INSETS,
    );
    const artworkCenterX = geometry.artX + geometry.artWidth / 2;
    const artworkCenterY =
      geometry.artY + geometry.contentOffsetY + geometry.artHeight / 2;
    if (this.usesSeedPackArtwork) {
      layoutPixiSeedPackIcon({
        base: this.art,
        item: this.artOverlay,
        x: artworkCenterX,
        y: artworkCenterY,
        width: geometry.seedArtworkSize,
        height: geometry.seedArtworkSize,
        anchorX: 0.5,
        anchorY: 0.5,
      });
    } else {
      this.art.anchor.set(0.5);
      this.art.position.set(artworkCenterX, artworkCenterY);
      this.art.width = geometry.artworkSize;
      this.art.height = geometry.artworkSize;
      this.artOverlay.anchor.set(0.5);
      this.artOverlay.position.set(artworkCenterX, artworkCenterY);
      this.artOverlay.width = 0;
      this.artOverlay.height = 0;
      this.artOverlay.rotation = 0;
    }
    this.name.position.set(
      geometry.nameX,
      geometry.nameY + geometry.contentOffsetY,
    );
    this.nameStars.position.set(
      Math.min(
        geometry.nameMaxWidth - this.nameStars.measuredWidth,
        geometry.nameX + this.name.width + 4,
      ),
      geometry.nameY + geometry.contentOffsetY + 1,
    );
    fitResearchDescription(this.description, geometry);
    this.description.y += geometry.contentOffsetY;
    const costRight =
      geometry.actionRight +
      (geometry.valueWidth - geometry.costWidth) / 2;
    this.costButton.setBounds(
      geometry.cardWidth - costRight - geometry.costWidth,
      geometry.actionTop +
        geometry.contentOffsetY +
        (geometry.actionHeight - geometry.costHeight) / 2,
      geometry.costWidth,
      geometry.costHeight,
    );
    this.researchedButton.setBounds(
      geometry.cardWidth - costRight - geometry.costWidth,
      geometry.actionTop +
        geometry.contentOffsetY +
        (geometry.actionHeight - geometry.costHeight) / 2,
      geometry.costWidth,
      geometry.costHeight,
    );
    const valueCenterX =
      geometry.cardWidth -
      geometry.actionRight -
      geometry.valueWidth / 2;
    const valueCenterY =
      geometry.actionTop +
      geometry.contentOffsetY +
      geometry.actionHeight / 2;
    this.researchedCheckmark.position.set(valueCenterX, valueCenterY);
    this.researchedCheckmark.width = RESEARCH_COMPLETED_CHECK_WIDTH;
    this.researchedCheckmark.height = RESEARCH_COMPLETED_CHECK_HEIGHT;
    this.readonlyValue.position.set(valueCenterX, valueCenterY);
    this.readonlyStars.position.set(
      valueCenterX - this.readonlyStars.measuredWidth / 2,
      valueCenterY - 6,
    );
    this.progress.setBounds(
      geometry.infoX,
      geometry.rowHeight -
        geometry.progressBottom -
        geometry.progressHeight,
      geometry.infoWidth,
      geometry.progressHeight,
    );
    const infoWidth = geometry.cardWidth;
    this.labelHit.hitArea = new Rectangle(
      geometry.cardOffsetX,
      0,
      infoWidth,
      geometry.rowHeight,
    );
    this.root.hitArea = new Rectangle(
      geometry.cardOffsetX,
      0,
      geometry.cardWidth,
      geometry.rowHeight,
    );
    this.layoutPurchaseEffect();
  }

  buyResearch(research) {
    const result = this.actions?.buy?.(research);
    if (result?.ok === true) {
      this.startPurchaseEffect();
    }
    return result;
  }

  layoutPurchaseEffect() {
    const shineTexture = this.widgetShine.sprite.texture;
    const textureWidth = Math.max(1, Number(shineTexture?.width) || 0);
    const textureHeight = Math.max(1, Number(shineTexture?.height) || 0);
    layoutResearchShine(
      this.widgetShine,
      getResearchShineLayout(
        new Rectangle(
          RESEARCH_PIXI_GEOMETRY.cardOffsetX,
          0,
          RESEARCH_PIXI_GEOMETRY.cardWidth,
          RESEARCH_PIXI_GEOMETRY.rowHeight,
        ),
        textureWidth,
        textureHeight,
        {
          heightScale: RESEARCH_WIDGET_SHINE_HEIGHT_SCALE,
          cornerRadiusScale:
            RESEARCH_WIDGET_SHINE_CORNER_RADIUS_SCALE,
        },
      ),
    );
    layoutResearchShine(
      this.buttonShine,
      getResearchShineLayout(
        new Rectangle(
          this.costButton.x,
          this.costButton.y,
          this.costButton.buttonWidth,
          this.costButton.buttonHeight,
        ),
        textureWidth,
        textureHeight,
        {
          heightScale: RESEARCH_BUTTON_SHINE_HEIGHT_SCALE,
          cornerRadiusScale:
            RESEARCH_BUTTON_SHINE_CORNER_RADIUS_SCALE,
        },
      ),
    );
  }

  startPurchaseEffect() {
    this.finishPurchaseEffect();
    if (this.prefersReducedMotion?.() === true) {
      return false;
    }

    const now = this.timeSource();
    this.purchaseEffect = {
      startedAtMs: now,
      baseScaleX: this.root.scale.x,
      baseScaleY: this.root.scale.y,
      baseOriginX: this.root.origin.x,
      baseOriginY: this.root.origin.y,
    };
    this.root.origin.set(
      RESEARCH_PIXI_GEOMETRY.cardOffsetX +
        RESEARCH_PIXI_GEOMETRY.cardWidth / 2,
      RESEARCH_PIXI_GEOMETRY.rowHeight / 2,
    );
    this.widgetShine.root.visible = true;
    this.widgetShine.root.renderable = true;
    this.buttonShine.root.visible = true;
    this.buttonShine.root.renderable = true;
    this.updatePurchaseEffect(now);
    return true;
  }

  updatePurchaseEffect(now) {
    const effect = this.purchaseEffect;
    if (!effect) {
      return false;
    }

    const elapsedMs = Math.max(
      0,
      finiteOr(now, this.timeSource()) - effect.startedAtMs,
    );
    const bounceProgress = Math.min(
      1,
      elapsedMs / RESEARCH_WIDGET_BOUNCE_DURATION_MS,
    );
    const bounceScale = getResearchWidgetBounceScale(bounceProgress);
    this.root.scale.set(
      effect.baseScaleX * bounceScale,
      effect.baseScaleY * bounceScale,
    );
    updateResearchShine(
      this.widgetShine,
      elapsedMs / RESEARCH_WIDGET_SHINE_DURATION_MS,
    );
    updateResearchShine(
      this.buttonShine,
      elapsedMs / RESEARCH_BUTTON_SHINE_DURATION_MS,
    );

    if (bounceProgress < 1) {
      return true;
    }
    this.finishPurchaseEffect();
    return false;
  }

  finishPurchaseEffect() {
    if (this.purchaseEffect) {
      this.root.scale.set(
        this.purchaseEffect.baseScaleX,
        this.purchaseEffect.baseScaleY,
      );
      this.root.origin.set(
        this.purchaseEffect.baseOriginX,
        this.purchaseEffect.baseOriginY,
      );
    }
    this.purchaseEffect = null;
    hideResearchShine(this.widgetShine);
    hideResearchShine(this.buttonShine);
  }

  updateTime(now) {
    this.updatePurchaseEffect(now);
    if (!this.progress.root.visible || !this.research) {
      return;
    }
    const { remainingMs } = this.progress.updateTimer(
      finiteOr(now, this.timeSource()),
    );
    this.researchedButton.setModel({
      amountLabel: this.formatInProgressButtonLabel(this.research),
      resource: 'none',
      enabled: false,
      action: null,
    });
    this.setResearchingTimer(formatRemainingTime(remainingMs));
    this.styleStatusButton();
  }

  formatInProgressButtonLabel(research) {
    return research?.actionType === 'levelUp'
      ? 'Leveling Up'
      : 'Researching';
  }

  setResearchingTimer(timer) {
    this.researchingTimerLabel.setText(timer);
    const visible = Boolean(String(timer ?? '').trim());
    this.researchingTimerLabel.visible = visible;
    this.researchingTimerLabel.renderable = visible;
  }

  styleStatusButton() {
    const inProgress =
      this.research?.timer?.active === true ||
      this.research?.inProgress === true;
    this.researchedButton.amountLabel
      .setFontSize(RESEARCH_ROW_TEXT.researchingFontSize)
      .setLineHeight(RESEARCH_ROW_TEXT.researchingLineHeight)
      .setAlign('center')
      .setStroke({
        color: '#0a0a0a',
        width: RESEARCH_ROW_TEXT.buttonStrokeWidth,
      });
    this.researchingTimerLabel
      .setFontFamily(RESEARCH_RANK_FONT)
      .setFontSize(RESEARCH_ROW_TEXT.researchingTimerFontSize)
      .setLineHeight(RESEARCH_ROW_TEXT.researchingTimerLineHeight)
      .setAlign('center')
      .setColor(RESEARCH_TIMER_INK)
      .setStroke({
        color: '#0a0a0a',
        width: RESEARCH_ROW_TEXT.buttonStrokeWidth,
      });
    this.researchingTimerLabel.position.set(
      this.researchedButton.buttonWidth / 2,
      this.researchedButton.buttonHeight * 0.68,
    );
    this.researchingTimerLabel.visible =
      inProgress && Boolean(this.researchingTimerLabel.text);
    this.researchingTimerLabel.renderable =
      this.researchingTimerLabel.visible;
    if (inProgress) {
      this.researchedButton.amountLabel.position.set(
        this.researchedButton.buttonWidth / 2,
        this.researchedButton.buttonHeight * 0.34,
      );
    }
  }

  applyTheme(theme) {
    this.theme = theme;
    const locked = normalizeResearchState(this.research) === 'locked';
    this.card.setTexture(
      this.resolveTexture(PIXI_ROOT_RUN_ASSETS.researchCard),
      CARD_SOURCE_INSETS,
    );
    this.artWell.setTexture(
      this.resolveTexture(PIXI_ROOT_RUN_ASSETS.researchArt),
      ART_SOURCE_INSETS,
    );
    this.art.filters = null;
    this.art.tint = 0xffffff;
    this.lockedOverlay.setTexture(
      this.resolveTexture(PIXI_ROOT_RUN_ASSETS.researchCard),
      CARD_SOURCE_INSETS,
    );
    this.lockedOverlay.visible = locked;
    this.lockedOverlay.renderable = locked;
    applyTextTheme(this.name, theme, {
      fontSize: RESEARCH_ROW_TEXT.nameFontSize,
      lineHeight: RESEARCH_ROW_TEXT.nameLineHeight,
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.nameMaxWidth,
      fill: RESEARCH_PAPER_INK,
    });
    applyTextTheme(this.description, theme, {
      fontSize: RESEARCH_ROW_TEXT.descriptionFontSize,
      lineHeight: RESEARCH_ROW_TEXT.descriptionLineHeight,
      align: 'center',
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.descriptionWidth,
      fill: RESEARCH_PAPER_INK,
    });
    fitResearchDescription(this.description, RESEARCH_PIXI_GEOMETRY);
    const inProgress =
      this.research?.timer?.active === true ||
      this.research?.inProgress === true;
    this.readonlyValue.applyTheme(theme, {
      fontSize: inProgress
        ? RESEARCH_ROW_TEXT.timedValueFontSize
        : RESEARCH_ROW_TEXT.valueFontSize,
      lineHeight: RESEARCH_ROW_TEXT.valueLineHeight,
      align: 'center',
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.valueWidth - 8,
      fill: inProgress
        ? RESEARCH_PROGRESS_INK
        : theme.resourceColors?.[this.research?.valueResourceKey] ??
          theme.text,
    });
    this.costButton.applyTheme(theme);
    this.researchedButton.applyTheme(theme);
    this.researchingTimerLabel.applyTheme(theme);
    this.styleStatusButton();
    this.progress.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }
    this.targetId = null;
    this.research = null;
    this.actions = null;
    this.boxId = null;
    this.finishPurchaseEffect();
    this.infoVisual.scale.set(1);
    this.costButton.reset();
    this.researchedButton.visible = false;
    this.researchedButton.renderable = false;
    this.researchedCheckmark.visible = false;
    this.researchedCheckmark.renderable = false;
    this.setResearchingTimer('');
    this.progress.clearTimer(0);
    this.lockedOverlay.visible = false;
    this.lockedOverlay.renderable = false;
    this.progress.root.visible = false;
    this.root.visible = false;
    this.root.renderable = false;
  }

  destroy() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }
    if (typeof this.inputRegistration === 'function') {
      this.inputRegistration();
    } else {
      this.inputRegistration?.unregister?.();
    }
    this.inputRegistration = null;
    if (this.usesDirectInput) {
      this.labelHit.off('pointertap', this.handleLocked);
    }
    this.costButton.destroy({ children: true });
    this.researchedButton.destroy();
    this.progress.destroy();
    this.root.destroy({ children: true });
  }

  resolveTexture(assetId) {
    if (!assetId) {
      return Texture.EMPTY;
    }
    return this.assetManager?.has?.(assetId)
      ? this.assetManager.getTexture(assetId)
      : Texture.EMPTY;
  }

  bindArtwork(research) {
    const itemKind = String(research?.itemKind ?? '').toLowerCase();
    const itemKey = research?.itemKey ?? null;
    this.usesSeedPackArtwork = itemKind === 'seed' && Boolean(itemKey);
    this.artOverlay.texture = Texture.EMPTY;
    this.artOverlay.visible = false;
    this.artOverlay.renderable = false;
    this.artOverlay.rotation = 0;

    if (this.usesSeedPackArtwork) {
      bindPixiSeedPackIcon({
        assetManager: this.assetManager,
        base: this.art,
        item: this.artOverlay,
        seed: {
          key: itemKey,
          label: research.displayName ?? research.label,
        },
      });
      return;
    }

    const itemFrameName =
      itemKind === 'herb' && itemKey
        ? getHerbIconFrameName(itemKey)
        : itemKind === 'potion' && itemKey
          ? getPotionIconFrameName(itemKey)
          : null;
    this.art.texture = itemFrameName
      ? this.assetManager?.getAtlasTexture?.(itemFrameName) ?? Texture.EMPTY
      : this.resolveTexture(research.artAssetId ?? research.artKey);
    this.art.visible = true;
    this.art.renderable = true;
  }
}

function getOrderedResearches(box = {}) {
  const source = normalizeRows(box.researches ?? box.rows ?? box.allResearches);
  let lockedCount = 0;
  return source
    .filter((research) => {
      if (research.locked !== true) {
        return true;
      }
      lockedCount += 1;
      return lockedCount <= MAX_LOCKED_ROWS_PER_BOX;
    })
    .map((research, index) => ({ research, index }))
    .sort(
      (left, right) =>
        Number(left.research.completed === true) -
          Number(right.research.completed === true) ||
        left.index - right.index,
    )
    .map(({ research }) => research);
}

function getVisibleResearches(box = {}, showCompleted = false) {
  return getOrderedResearches(box).filter(
    (research) => showCompleted || research.completed !== true,
  );
}

function normalizeResearchState(research = {}) {
  if (research.state) {
    return research.state;
  }
  if (research.completed === true) return 'completed';
  if (research.inProgress === true) return 'in-progress';
  if (research.locked === true) return 'locked';
  if (research.canResearch === true) return 'available';
  return 'unavailable';
}

function formatResearchTitle(value) {
  return String(value ?? '').replace(
    /(^|[\s/:(-])([a-z])/g,
    (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}

function formatResearchDescription(value) {
  return String(value ?? '').replace(
    /[A-Za-z]/,
    (letter) => letter.toUpperCase(),
  );
}

function formatResearchLockPrompt(lockReason = '') {
  const reason = String(lockReason ?? '').trim().replace(/\.$/, '');
  const levelMatch = reason.match(/^requires level (\d+)$/i);
  if (levelMatch) {
    return `Reach level ${levelMatch[1]}`;
  }
  if (!reason || reason.toLowerCase() === 'this research is still locked') {
    return 'Complete prior research';
  }
  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
}

function parseResearchResourceValue(value) {
  const normalizedValue = String(value ?? '');
  const match = normalizedValue.match(RESOURCE_WORD_MATCH_PATTERN);
  if (!match || !Number.isInteger(match.index)) {
    return null;
  }

  const label = match[0];
  const index = match.index;
  if (
    label.toLowerCase() === 'mana' &&
    MANA_NON_RESOURCE_PHRASE_PATTERN.test(
      normalizedValue.slice(index + label.length),
    )
  ) {
    return null;
  }

  const before = normalizedValue.slice(0, index);
  const amountMatch = before.match(RESOURCE_AMOUNT_PREFIX_PATTERN);
  let amountPrefix = amountMatch?.[1] ?? '';
  if (amountPrefix) {
    const amountStart = before.length - amountPrefix.length;
    if (/\w/.test(before[amountStart - 1] ?? '')) {
      amountPrefix = '';
    }
  }

  return {
    prefix: amountPrefix
      ? before.slice(0, before.length - amountPrefix.length)
      : before,
    amount: amountPrefix.trimEnd(),
    resource: normalizeResearchResource(label),
    suffix: normalizedValue.slice(index + label.length),
  };
}

function createResearchRenderRevision(viewModel) {
  try {
    return JSON.stringify(viewModel, function createRevision(_key, value) {
      if (typeof value === 'function') {
        return undefined;
      }
      if (typeof value === 'bigint') {
        return { bigint: String(value) };
      }

      const timerActive = Boolean(
        this?.active === true ||
          this?.inProgress === true ||
          this?.timer?.active === true,
      );
      if (timerActive && RESEARCH_TIMER_REVISION_FIELDS.has(_key)) {
        return undefined;
      }
      return value;
    });
  } catch {
    return viewModel;
  }
}

export function createResearchShine({ texture, alpha, label }) {
  const root = new Container({ label, eventMode: 'none' });
  const sprite = new Sprite({
    texture,
    anchor: 0.5,
    alpha,
    blendMode: 'add',
    eventMode: 'none',
    label: `${label}-sprite`,
  });
  const mask = new Graphics({
    label: `${label}-mask`,
    eventMode: 'none',
  });
  root.addChild(sprite, mask);
  root.mask = mask;
  root.visible = false;
  root.renderable = false;
  return { root, sprite, mask, layout: null };
}

export function layoutResearchShine(shine, layout) {
  shine.layout = layout;
  shine.sprite.width = layout.shineWidth;
  shine.sprite.height = layout.shineHeight;
  shine.sprite.position.set(layout.startX, layout.centerY);
  shine.mask
    .clear()
    .roundRect(
      layout.x,
      layout.y,
      layout.width,
      layout.height,
      layout.cornerRadius,
    )
    .fill(0xffffff);
}

export function updateResearchShine(shine, progress) {
  if (!shine.layout) {
    return;
  }
  const normalizedProgress = Math.min(1, Math.max(0, progress));
  shine.sprite.x = lerp(
    shine.layout.startX,
    shine.layout.endX,
    normalizedProgress,
  );
  if (normalizedProgress >= 1) {
    hideResearchShine(shine);
  }
}

export function hideResearchShine(shine) {
  shine.root.visible = false;
  shine.root.renderable = false;
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function normalizeResearchResource(resource) {
  const normalized = String(resource ?? '').trim().toLowerCase();
  if (normalized === 'crystals') return 'crystal';
  if (normalized === 'emeralds') return 'emerald';
  if (normalized === 'rubies') return 'ruby';
  if (normalized === 'seeds') return 'seed';
  if (normalized === 'herbs') return 'herb';
  return normalized;
}
