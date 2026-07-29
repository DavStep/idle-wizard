import { Container, Sprite, Texture } from 'pixi.js';

import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../primitives/PixiInfoButton.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiResourceLabel } from '../../primitives/PixiResourceLabel.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { normalizePixiTextStroke } from '../../primitives/PixiTextLabel.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RESEARCH_PAPER_INK,
  RESEARCH_PIXI_GEOMETRY,
  RESEARCH_PROGRESS_INK,
  RESEARCH_RANK_FONT,
  RESEARCH_RANK_INK,
  RESEARCH_ROW_TEXT,
  ResearchStationTitlePlaque,
} from '../research/ResearchPixiPage.js';
import { MarketTitleRibbon } from '../shop/MarketTitleRibbon.js';
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedPanel,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from '../workshop/RetainedPageKit.js';

export const PRESTIGE_DESCRIPTION_LINES = Object.freeze([
  'Start a new run at the level and resource totals shown above.',
  'Mana, Coin, Crystal, Items, ordinary Research, Garden, Brewing, and level tasks reset; daily and weekly tasks keep their timer.',
  'Claiming a milestone also credits lower unclaimed milestones and earns 1 Prestige Point.',
  'Prestige Points permanently unlock Market licences at 1, 3, 6, and 10 points; the highest licence stays active.',
]);

const DEFAULT_TABS = Object.freeze([
  Object.freeze({ id: 'main', label: 'Main' }),
  Object.freeze({ id: 'points', label: 'Points' }),
]);

const PRESTIGE_ICON_ASSET_ID =
  'source:assets/icons/icon-prestige-star.png';
const PRESTIGE_CARD_INK = RESEARCH_PAPER_INK;
const PRESTIGE_CARD_MUTED_INK = RESEARCH_PROGRESS_INK;
const PRESTIGE_ROW_HEIGHT = RESEARCH_PIXI_GEOMETRY.rowHeight;
const PRESTIGE_ROW_GAP = RESEARCH_PIXI_GEOMETRY.rowGap;
const PRESTIGE_SECTION_GAP = 12;
const PRESTIGE_TITLE_GAP = 5;
const PRESTIGE_BANNER_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.height;
const PRESTIGE_BANNER_TOP_OVERHANG =
  PRESTIGE_BANNER_HEIGHT -
  RESEARCH_PIXI_GEOMETRY.categoryTitleHeight;
const PRESTIGE_CARD_SOURCE_INSETS =
  PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets;
const PRESTIGE_CARD_BORDER_INSETS =
  PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets;
const PRESTIGE_ART_SOURCE_INSETS = Object.freeze({
  top: 49,
  right: 50,
  bottom: 50,
  left: 49,
});
const PRESTIGE_ART_BORDER_INSETS = Object.freeze({
  top: 49 / 3,
  right: 50 / 3,
  bottom: 50 / 3,
  left: 49 / 3,
});

export class PrestigePixiPage extends BaseRetainedPixiPage {
  constructor({
    assetManager = null,
    semanticTargets = null,
    inputRouter = null,
    actions = {},
    counters = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ pageId: 'prestige', semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.actions = actions;
    this.selectedTabId = 'main';
    this.pendingConfirm = null;

    this.scroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: 'prestige-page-scroll',
      inputRouter: this.inputRouter,
    });
    this.identityLayer = new Container({ label: 'prestige-page-identity' });
    this.titleRibbon = new MarketTitleRibbon({
      assetManager: this.assetManager,
    });
    this.identityLayer.addChild(this.titleRibbon.root);
    this.tabsLayer = new Container({ label: 'prestige-page-tabs' });
    this.descriptionTitle = new ResearchStationTitlePlaque({
      assetManager: this.assetManager,
    });
    this.descriptionTitle.bind('Description', 'regular');
    this.progressionTitle = new ResearchStationTitlePlaque({
      assetManager: this.assetManager,
    });
    this.progressionTitle.bind('Progression', 'crystal');
    this.description = new PrestigeDescriptionPanel({
      assetManager: this.assetManager,
    });
    this.confirm = new PrestigeConfirmPanel({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      onCancel: () => this.cancelConfirm(),
      onProceed: () => this.proceedConfirm(),
    });
    this.tooltip = new PrestigeTooltip({
      assetManager: this.assetManager,
    });
    this.content.addChild(
      this.identityLayer,
      this.scroll.root,
      this.tabsLayer,
      this.tooltip.root,
    );

    this.rowPool = new WidgetPool({
      name: 'prestige row pool',
      counters,
      create: () =>
        new PrestigeRowWidget({
          page: this,
          assetManager: this.assetManager,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 12,
    });
    this.rows = new PooledCollection({
      name: 'prestige rows',
      pool: this.rowPool,
      counters,
      keyOf: (row) => row.id ?? `${row.kind ?? 'milestone'}:${row.level ?? row.count}`,
      bind: (widget, row) => widget.bind(row, this.currentActions),
      afterReconcile: (widgets) => this.orderRows(widgets),
    });

    this.tabPool = new WidgetPool({
      name: 'prestige tab pool',
      counters,
      create: () =>
        new RetainedButton({
          assetManager: this.assetManager,
          buttonLabel: 'prestige-tab',
          inputRouter: this.inputRouter,
          variant: 'tab',
        }),
      reset: (button) => button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 2,
    });
    this.tabs = new PooledCollection({
      name: 'prestige tabs',
      pool: this.tabPool,
      counters,
      keyOf: (tab) => tab.id,
      bind: (button, tab) => this.bindTab(button, tab),
      afterReconcile: (buttons) => this.orderTabs(buttons),
    });

    this.applyTheme(theme);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  renderViewModel(viewModel) {
    const prestige = viewModel.prestige ?? viewModel;
    this.currentActions = viewModel.actions ?? prestige.actions ?? this.actions;
    const tabs = normalizeRows(prestige.tabs).length > 0
      ? prestige.tabs
      : DEFAULT_TABS;
    this.selectedTabId =
      prestige.selectedTabId ??
      tabs.find((tab) => tab.selected)?.id ??
      this.selectedTabId;
    this.tabs.reconcile(tabs);

    const summary = prestige.summary ?? {};
    this.titleRibbon.bind(
      'Prestige',
      prestige.starLevel ?? summary.starLevel ?? 0,
    );
    this.description.bind({
      flow: summary.flow,
      resourceLead: summary.resourceLead,
      resources: summary.resources,
      summaryLines:
        summary.lines ??
        [summary.flow, summary.receive].filter(Boolean),
      descriptionLines: prestige.descriptionLines ?? PRESTIGE_DESCRIPTION_LINES,
    });

    const rows =
      this.selectedTabId === 'points'
        ? normalizeRows(prestige.pointRewards ?? prestige.points)
        : normalizeRows(prestige.milestones);
    this.rows.reconcile(
      rows.map((row) => ({
        ...row,
        kind: row.kind ?? (this.selectedTabId === 'points' ? 'point' : 'milestone'),
      })),
    );
    if (Object.hasOwn(prestige, 'confirm')) {
      this.pendingConfirm = prestige.confirm;
    }
    this.confirm.bind(this.pendingConfirm);
    this.layoutPrestigeContent();
  }

  bindTab(button, tab) {
    button.applyTheme(this.theme);
    button.setModel({
      label: formatPrestigeTitle(tab.label ?? tab.id),
      selected: tab.id === this.selectedTabId,
      notification: tab.notification === true,
      action: () => {
        if (tab.id === this.selectedTabId) {
          return;
        }

        this.selectedTabId = tab.id;
        this.pendingConfirm = null;
        this.confirm.bind(null);
        this.tooltip.hide();
        this.currentActions?.selectTab?.(tab.id);
      },
    });
    this.registerSemanticTarget({
      semanticId: `prestige.tab.${tab.id}`,
      tutorialId: tab.tutorialId ?? null,
      displayObject: button.root,
      activate: () => button.handleTap(),
    });
  }

  requestPrestige(row) {
    this.currentActions?.requestPrestige?.(row);
    this.pendingConfirm = row.confirm ?? {
      milestoneId: row.id,
      level: row.level,
      lines: row.confirmLines ?? [],
    };
    this.confirm.bind(this.pendingConfirm);
    this.layoutPrestigeContent();
    this.scroll.scrollRectIntoView(
      {
        y: this.confirm.root.y,
        height: this.confirm.height,
      },
      { padding: RETAINED_PAGE_GEOMETRY.scrollCut },
    );
  }

  cancelConfirm() {
    const pending = this.pendingConfirm;
    this.pendingConfirm = null;
    this.confirm.bind(null);
    this.currentActions?.cancelPrestige?.(pending);
    this.layoutPrestigeContent();
  }

  proceedConfirm() {
    if (!this.pendingConfirm) {
      return;
    }

    const pending = this.pendingConfirm;
    this.currentActions?.completePrestige?.(
      pending.level ?? pending.milestoneLevel,
      pending,
    );
  }

  showTooltip(model, target) {
    if (!model) {
      this.tooltip.hide();
      return;
    }

    this.tooltip.bind(model);
    const targetBounds = target.getBounds();
    const targetRight = Number.isFinite(targetBounds.maxX)
      ? targetBounds.maxX
      : targetBounds.x + targetBounds.width;
    const targetTop = Number.isFinite(targetBounds.minY)
      ? targetBounds.minY
      : targetBounds.y;
    this.tooltip.show({
      x: Math.min(
        this.sourceWidth - 196,
        Math.max(8, targetRight - 180),
      ),
      y: Math.max(8, targetTop - this.tooltip.height - 6),
    });
  }

  orderRows(widgets) {
    this.scroll.content.removeChildren();
    this.scroll.content.addChild(
      this.descriptionTitle.root,
      this.description.root,
      this.progressionTitle.root,
    );

    for (const widget of widgets) {
      this.scroll.content.addChild(widget.root);
    }

    if (this.confirm.visible) {
      this.scroll.content.addChild(this.confirm.root);
    }
  }

  orderTabs(buttons) {
    this.tabsLayer.removeChildren();

    for (const button of buttons) {
      this.tabsLayer.addChild(button.root);
    }
  }

  applyThemeToChildren(theme) {
    this.description?.applyTheme(theme);
    this.confirm?.applyTheme(theme);
    this.tooltip?.applyTheme(theme);

    for (const row of this.rows?.getWidgets?.() ?? []) {
      row.applyTheme(theme);
    }

    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(theme);
    }
  }

  layoutPage(sourceWidth, sourceHeight) {
    if (!this.scroll) {
      return;
    }

    const edge = RETAINED_PAGE_GEOMETRY.contentEdge;
    const contentHeight =
      sourceHeight -
      RETAINED_PAGE_GEOMETRY.contentTop -
      RETAINED_PAGE_GEOMETRY.chatClearance;
    const width = sourceWidth - edge * 2;
    const scrollWidth = sourceWidth - edge;
    const tabClearance =
      RETAINED_PAGE_GEOMETRY.tabHeight + RETAINED_PAGE_GEOMETRY.scrollCut * 2;
    const panelTop =
      RETAINED_PAGE_GEOMETRY.contentTop +
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      PRESTIGE_TITLE_GAP;
    this.contentWidth = width;
    this.contentEdge = edge;
    this.scrollWidth = scrollWidth;
    this.identityLayer.position.set(
      0,
      RETAINED_PAGE_GEOMETRY.contentTop -
        PRESTIGE_BANNER_TOP_OVERHANG,
    );
    this.titleRibbon.setMaxWidth(sourceWidth);
    this.titleRibbon.root.position.set(
      (sourceWidth - this.titleRibbon.width) / 2,
      0,
    );
    this.scroll.setBounds(
      0,
      panelTop,
      scrollWidth,
      contentHeight -
        tabClearance -
        (panelTop - RETAINED_PAGE_GEOMETRY.contentTop),
    );
    this.tabsLayer.position.set(
      edge,
      RETAINED_PAGE_GEOMETRY.contentTop + contentHeight - 6 -
        RETAINED_PAGE_GEOMETRY.tabHeight,
    );
    this.layoutPrestigeContent();
  }

  layoutPrestigeContent() {
    if (!this.rows || !this.scroll) {
      return;
    }

    let y = RETAINED_PAGE_GEOMETRY.scrollCut;
    this.descriptionTitle.root.position.set(0, y);
    this.descriptionTitle.setMaxWidth(this.scrollWidth);
    y +=
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      PRESTIGE_TITLE_GAP;
    this.description.setBounds(
      this.contentEdge,
      y,
      this.contentWidth,
    );
    y += this.description.height + PRESTIGE_SECTION_GAP;
    this.progressionTitle.root.position.set(0, y);
    this.progressionTitle.setMaxWidth(this.scrollWidth);
    y +=
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
      PRESTIGE_TITLE_GAP;

    for (const row of this.rows.getWidgets()) {
      row.setBounds(
        this.contentEdge,
        y,
        this.contentWidth,
        row.getPreferredHeight(),
      );
      y += row.getPreferredHeight() + PRESTIGE_ROW_GAP;

      if (
        this.confirm.visible &&
        matchesConfirm(row.model, this.pendingConfirm)
      ) {
        this.confirm.setBounds(
          this.contentEdge,
          y,
          this.contentWidth,
        );
        y += this.confirm.height + PRESTIGE_ROW_GAP;
      }
    }

    if (
      this.confirm.visible &&
      !this.rows.getWidgets().some((row) =>
        matchesConfirm(row.model, this.pendingConfirm),
      )
    ) {
      this.confirm.setBounds(
        this.contentEdge,
        y,
        this.contentWidth,
      );
      y += this.confirm.height + PRESTIGE_ROW_GAP;
    }

    this.orderRows(this.rows.getWidgets());
    this.scroll.setContentHeight(y + RETAINED_PAGE_GEOMETRY.scrollCut);
    const tabButtons = this.tabs.getWidgets();
    const gap = 3;
    const width =
      tabButtons.length > 0
        ? (this.contentWidth - gap * (tabButtons.length - 1)) / tabButtons.length
        : 0;
    let x = 0;

    for (const button of tabButtons) {
      button.setBounds(x, 0, width, RETAINED_PAGE_GEOMETRY.tabHeight);
      x += width + gap;
    }
  }

  destroyPage() {
    this.rows?.destroy();
    this.rowPool?.destroy();
    this.tabs?.destroy();
    this.tabPool?.destroy();
    this.description?.destroy();
    this.confirm?.destroy();
    this.titleRibbon?.root.destroy({ children: true });
    this.descriptionTitle?.root.destroy({ children: true });
    this.progressionTitle?.root.destroy({ children: true });
    this.scroll?.destroy();
    this.tooltip?.destroy();
  }
}

class PrestigeDescriptionPanel {
  constructor({ assetManager }) {
    this.assetManager = assetManager;
    this.root = new Container({ label: 'prestige-description' });
    this.card = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PRESTIGE_CARD_SOURCE_INSETS,
      borderInsets: PRESTIGE_CARD_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.cardWidth,
      height: PRESTIGE_ROW_HEIGHT,
      label: 'prestige-description-card',
    });
    this.flow = createText('', {
      fontSize: 13,
      lineHeight: 15,
      fill: PRESTIGE_CARD_INK,
    });
    this.flow.label = 'prestige-description-flow';
    this.resourceLead = createText('', {
      fontSize: 11,
      lineHeight: 13,
      fill: PRESTIGE_CARD_MUTED_INK,
    });
    this.resourceLead.label = 'prestige-description-resource-lead';
    this.resources = Array.from({ length: 3 }, (_, index) =>
      new PixiResourceLabel({
        assetManager,
        resource: 'crystal',
        amount: 0,
        fontSize: 11,
        fontWeight: '700',
        includeResourceName: false,
        label: `prestige-description-resource-${index}`,
      }),
    );
    this.summary = createText('', {
      fontSize: 11,
      lineHeight: 13,
      fill: PRESTIGE_CARD_MUTED_INK,
      wordWrapWidth: 292,
    });
    this.summary.label = 'prestige-description-summary-fallback';
    this.description = createText('', {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth: 294,
    });
    this.description.label = 'prestige-description-copy';
    this.root.addChild(
      this.card,
      this.flow,
      this.resourceLead,
      ...this.resources,
      this.summary,
      this.description,
    );
    this.height = 0;
    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  }

  bind({
    flow,
    resourceLead,
    resources,
    summaryLines,
    descriptionLines,
  }) {
    const fallbackLines = normalizeRows(summaryLines).filter(Boolean);
    setText(this.flow, flow ?? fallbackLines[0] ?? '');
    setText(this.resourceLead, resourceLead ?? '');
    const resourceRows = normalizeRows(resources);
    this.resources.forEach((label, index) => {
      const resource = resourceRows[index];
      label.bind(index, {
        resource: resource?.resource ?? 'crystal',
        amount: resource?.amount ?? 0,
        includeResourceName: false,
        hidden: !resource,
      });
    });
    setText(
      this.summary,
      flow || resourceRows.length > 0
        ? ''
        : fallbackLines.slice(1).join('\n'),
    );
    setText(
      this.description,
      normalizeRows(descriptionLines).map((line) => `• ${line}`).join('\n'),
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    const inset = 14;
    const copyWidth = Math.max(0, width - inset * 2);
    this.flow.style.wordWrap = true;
    this.flow.style.wordWrapWidth = copyWidth;
    this.flow.position.set(inset, 10);

    let headerBottom = this.flow.y + this.flow.height;
    const hasResources = this.resources.some((label) => label.visible);
    this.resourceLead.visible = hasResources;
    this.resourceLead.renderable = hasResources;
    if (hasResources) {
      this.resourceLead.position.set(inset, headerBottom + 4);
      let resourceX = inset + this.resourceLead.width + 6;
      for (const label of this.resources) {
        if (!label.visible) {
          continue;
        }
        label.position.set(resourceX, headerBottom + 3);
        resourceX += label.measuredWidth + 9;
      }
      headerBottom += 16;
    }

    this.summary.style.wordWrapWidth = copyWidth;
    this.summary.position.set(inset, headerBottom + 3);
    if (this.summary.text) {
      headerBottom = this.summary.y + this.summary.height;
    }
    this.description.style.wordWrapWidth = copyWidth;
    this.description.position.set(inset, headerBottom + 7);
    this.height = Math.max(
      PRESTIGE_ROW_HEIGHT,
      Math.ceil(this.description.y + this.description.height + 11),
    );
    this.card.setSize(width, this.height, PRESTIGE_CARD_BORDER_INSETS);
  }

  applyTheme(theme) {
    this.card.setTexture(
      resolvePrestigeTexture(
        this.assetManager,
        PIXI_ROOT_RUN_ASSETS.researchCard,
      ),
      PRESTIGE_CARD_SOURCE_INSETS,
    );
    applyTextTheme(this.flow, theme, {
      fontSize: 13,
      lineHeight: 15,
      fill: PRESTIGE_CARD_INK,
    });
    applyTextTheme(this.resourceLead, theme, {
      fontSize: 11,
      lineHeight: 13,
      fill: PRESTIGE_CARD_MUTED_INK,
    });
    applyTextTheme(this.summary, theme, {
      fontSize: 11,
      lineHeight: 13,
      fill: PRESTIGE_CARD_MUTED_INK,
      wordWrapWidth: 292,
    });
    applyTextTheme(this.description, theme, {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth: 294,
    });
    for (const label of this.resources) {
      label.applyTheme(theme);
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class PrestigeRowWidget {
  constructor({ page, assetManager }) {
    this.page = page;
    this.assetManager = assetManager;
    this.root = new Container({ label: 'prestige-row' });
    this.card = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PRESTIGE_CARD_SOURCE_INSETS,
      borderInsets: PRESTIGE_CARD_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.cardWidth,
      height: PRESTIGE_ROW_HEIGHT,
      label: 'prestige-row-card',
    });
    this.artWell = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PRESTIGE_ART_SOURCE_INSETS,
      borderInsets: PRESTIGE_ART_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.artWidth,
      height: RESEARCH_PIXI_GEOMETRY.artHeight,
      label: 'prestige-row-art-well',
    });
    this.stateIcon = new Sprite({
      texture: Texture.EMPTY,
      label: 'prestige-row-state-icon',
      roundPixels: true,
    });
    this.stateIcon.anchor.set(0.5);
    this.pointStars = new PixiStarLevelLabel({
      assetManager,
      size: 10,
      gap: 0,
      label: 'prestige-row-stars',
    });
    this.title = createText('', {
      fontSize: RESEARCH_ROW_TEXT.nameFontSize,
      lineHeight: RESEARCH_ROW_TEXT.nameLineHeight,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.nameMaxWidth,
    });
    this.title.label = 'prestige-row-title';
    this.rewardLead = createText('Reward', {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_MUTED_INK,
    });
    this.rewardLead.label = 'prestige-row-reward-lead';
    this.reward = createText('', {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth: 156,
    });
    this.reward.label = 'prestige-row-reward';
    this.rewardResources = Array.from({ length: 3 }, (_, index) =>
      new PixiResourceLabel({
        assetManager,
        resource: 'crystal',
        amount: 0,
        fontSize: 11,
        fontWeight: '700',
        includeResourceName: false,
        label: `prestige-row-resource-${index}`,
      }),
    );
    this.rank = new Sprite({
      texture: Texture.EMPTY,
      label: 'prestige-row-rank',
      roundPixels: true,
    });
    this.rankLabel = createText('', {
      fontFamily: RESEARCH_RANK_FONT,
      fontSize: RESEARCH_ROW_TEXT.rankFontSize,
      lineHeight: RESEARCH_ROW_TEXT.rankLineHeight,
      align: 'center',
      fill: RESEARCH_RANK_INK,
    });
    this.rankLabel.anchor.set(0.5);
    this.action = new PixiCostButton({
      assetManager,
      inputRouter: this.page.inputRouter,
      research: true,
      width: RESEARCH_PIXI_GEOMETRY.costWidth,
      height: RESEARCH_PIXI_GEOMETRY.costHeight,
      label: 'prestige-row-action',
    });
    this.help = new PixiInfoButton({
      assetManager,
      label: 'prestige-point-help',
      inputRouter: this.page.inputRouter,
      action: () => this.page.showTooltip(this.model.tooltip, this.help),
    });
    this.lockedOverlay = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PRESTIGE_CARD_SOURCE_INSETS,
      borderInsets: PRESTIGE_CARD_BORDER_INSETS,
      width: RESEARCH_PIXI_GEOMETRY.cardWidth,
      height: PRESTIGE_ROW_HEIGHT,
      label: 'prestige-row-locked-overlay',
    });
    this.lockedOverlay.tint = 0x000000;
    this.lockedOverlay.alpha = 0.28;
    this.lockedOverlay.eventMode = 'none';
    this.root.addChild(
      this.card,
      this.artWell,
      this.stateIcon,
      this.pointStars,
      this.title,
      this.rewardLead,
      this.reward,
      ...this.rewardResources,
      this.rank,
      this.rankLabel,
      this.action,
      this.help,
      this.lockedOverlay,
    );
  }

  bind(model, actions) {
    this.model = model;
    this.actions = actions;
    this.root.visible = true;
    this.root.renderable = true;
    const isPoint = model.kind === 'point';
    setText(
      this.title,
      isPoint
        ? model.title ?? `${model.count} ${model.count === 1 ? 'Point' : 'Points'}`
        : model.title ?? `Level ${model.level}`,
    );
    const status =
      model.status ??
      model.state ??
      (model.completed ? 'completed' : model.locked ? 'locked' : '');
    setText(this.rankLabel, formatPrestigeTitle(status));
    const rewardLines = normalizeRows(model.rewardLines ?? model.rewards);
    const rewardResources = normalizeRows(model.rewardResources);
    this.reward.style.wordWrapWidth =
      isPoint || model.canComplete !== true ? 230 : 156;
    this.rewardResources.forEach((label, index) => {
      const resource = rewardResources[index];
      label.bind(index, {
        resource: resource?.resource ?? 'crystal',
        amount: resource?.amount ?? 0,
        includeResourceName: false,
        hidden: !resource,
      });
    });
    setText(
      this.reward,
      rewardResources.length > 0
        ? ''
        : formatPrestigeCopy(
            model.rewardText ??
              model.reward ??
              rewardLines.join('\n'),
          ),
    );
    const canComplete = model.canComplete === true && model.included !== true;
    this.action.visible = canComplete;
    this.action.renderable = canComplete;
    this.action.setModel({
      amountLabel: formatPrestigeTitle(model.actionLabel ?? 'Prestige'),
      resource: 'none',
      enabled: canComplete,
      action: () => this.page.requestPrestige(model),
    });
    this.help.visible = Boolean(model.tooltip);
    this.help.renderable = this.help.visible;
    this.help.setModel({
      action: () => this.page.showTooltip(model.tooltip, this.help),
    });
    this.pointStars.setLevel(isPoint ? model.count : 0);
    this.pointStars.visible = isPoint;
    this.pointStars.renderable = isPoint;
    this.applyStateIcon(status);
    const locked = model.locked === true || status === 'locked';
    this.lockedOverlay.visible = locked;
    this.lockedOverlay.renderable = locked;
    this.applyTheme(this.page.theme);
    this.targetId =
      model.semanticId ??
      `prestige.${isPoint ? 'point' : 'milestone'}.${model.count ?? model.level}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: canComplete ? this.action : this.root,
      state: () => ({
        enabled: canComplete,
        interactive: canComplete,
      }),
      activate: () => {
        if (!canComplete) {
          return false;
        }

        this.page.requestPrestige(model);
        return true;
      },
    });
  }

  applyStateIcon(state) {
    const frameName =
      state === 'completed' || state === 'complete'
        ? 'status:checkDefault'
        : state === 'locked'
          ? 'status:lockDefault'
          : null;
    this.stateIcon.texture =
      frameName && this.assetManager?.getAtlasTexture
        ? this.assetManager.getAtlasTexture(frameName)
        : resolvePrestigeTexture(
            this.assetManager,
            PRESTIGE_ICON_ASSET_ID,
          );
    fitPrestigeIcon(this.stateIcon, 42, 42);
    this.stateIcon.visible = true;
    this.stateIcon.renderable = true;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.card.setSize(width, height, PRESTIGE_CARD_BORDER_INSETS);
    this.artWell.position.set(
      RESEARCH_PIXI_GEOMETRY.artX,
      RESEARCH_PIXI_GEOMETRY.artY + RESEARCH_PIXI_GEOMETRY.contentOffsetY,
    );
    this.artWell.setSize(
      RESEARCH_PIXI_GEOMETRY.artWidth,
      RESEARCH_PIXI_GEOMETRY.artHeight,
      PRESTIGE_ART_BORDER_INSETS,
    );
    const artCenterX =
      RESEARCH_PIXI_GEOMETRY.artX + RESEARCH_PIXI_GEOMETRY.artWidth / 2;
    const artCenterY =
      RESEARCH_PIXI_GEOMETRY.artY +
      RESEARCH_PIXI_GEOMETRY.contentOffsetY +
      RESEARCH_PIXI_GEOMETRY.artHeight / 2;
    this.stateIcon.position.set(artCenterX, artCenterY - 3);
    this.pointStars.position.set(
      artCenterX - this.pointStars.measuredWidth / 2,
      artCenterY + 17,
    );
    this.title.position.set(
      RESEARCH_PIXI_GEOMETRY.nameX,
      RESEARCH_PIXI_GEOMETRY.nameY +
        RESEARCH_PIXI_GEOMETRY.contentOffsetY,
    );
    this.rewardLead.position.set(RESEARCH_PIXI_GEOMETRY.descriptionX, 29);
    this.reward.position.set(RESEARCH_PIXI_GEOMETRY.descriptionX, 43);
    let resourceX =
      RESEARCH_PIXI_GEOMETRY.descriptionX + this.rewardLead.width + 5;
    for (const label of this.rewardResources) {
      if (!label.visible) {
        continue;
      }
      label.position.set(resourceX, 28);
      resourceX += label.measuredWidth + 8;
    }
    this.rank.position.set(
      width -
        RESEARCH_PIXI_GEOMETRY.rankRight -
        RESEARCH_PIXI_GEOMETRY.rankWidth,
      0,
    );
    this.rank.width = RESEARCH_PIXI_GEOMETRY.rankWidth;
    this.rank.height = RESEARCH_PIXI_GEOMETRY.rankHeight;
    this.rankLabel.position.set(
      this.rank.x + RESEARCH_PIXI_GEOMETRY.rankWidth / 2,
      RESEARCH_PIXI_GEOMETRY.rankHeight / 2 + 0.5,
    );
    this.action.setBounds(
      width -
        RESEARCH_PIXI_GEOMETRY.actionRight -
        RESEARCH_PIXI_GEOMETRY.costWidth,
      31,
      RESEARCH_PIXI_GEOMETRY.costWidth,
      RESEARCH_PIXI_GEOMETRY.costHeight,
    );
    this.help.setBounds(
      Math.min(
        width - RESEARCH_PIXI_GEOMETRY.valueWidth - 4,
        RESEARCH_PIXI_GEOMETRY.nameX + this.title.width + 3,
      ),
      7,
      18,
      18,
    );
    this.lockedOverlay.setSize(width, height, PRESTIGE_CARD_BORDER_INSETS);
  }

  getPreferredHeight() {
    return PRESTIGE_ROW_HEIGHT;
  }

  applyTheme(theme) {
    this.card.setTexture(
      resolvePrestigeTexture(
        this.assetManager,
        PIXI_ROOT_RUN_ASSETS.researchCard,
      ),
      PRESTIGE_CARD_SOURCE_INSETS,
    );
    this.artWell.setTexture(
      resolvePrestigeTexture(
        this.assetManager,
        PIXI_ROOT_RUN_ASSETS.researchArt,
      ),
      PRESTIGE_ART_SOURCE_INSETS,
    );
    this.lockedOverlay.setTexture(
      resolvePrestigeTexture(
        this.assetManager,
        PIXI_ROOT_RUN_ASSETS.researchCard,
      ),
      PRESTIGE_CARD_SOURCE_INSETS,
    );
    applyTextTheme(this.title, theme, {
      fontSize: RESEARCH_ROW_TEXT.nameFontSize,
      lineHeight: RESEARCH_ROW_TEXT.nameLineHeight,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth: RESEARCH_PIXI_GEOMETRY.nameMaxWidth,
    });
    applyTextTheme(this.rewardLead, theme, {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_MUTED_INK,
    });
    applyTextTheme(this.reward, theme, {
      fontSize: 10,
      lineHeight: 12,
      fill: PRESTIGE_CARD_INK,
      wordWrapWidth:
        this.model?.kind === 'point' || this.model?.canComplete !== true
          ? 230
          : 156,
    });
    applyTextTheme(this.rankLabel, theme, {
      fontFamily: RESEARCH_RANK_FONT,
      fontSize: RESEARCH_ROW_TEXT.rankFontSize,
      lineHeight: RESEARCH_ROW_TEXT.rankLineHeight,
      align: 'center',
      fill: RESEARCH_RANK_INK,
    });
    this.rankLabel.style.stroke = normalizePixiTextStroke({
      color: '#0a0a0a',
    });
    this.action.applyTheme(theme);
    for (const label of this.rewardResources) {
      label.applyTheme(theme);
    }
    this.rank.texture = resolvePrestigeTexture(
      this.assetManager,
      PIXI_ROOT_RUN_ASSETS.researchRank,
    );
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.root.visible = false;
    this.root.renderable = false;
    this.action.reset();
  }

  destroy() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.action.destroy();
    this.help.destroy();
    this.root.destroy({ children: true });
  }
}

class PrestigeConfirmPanel {
  constructor({ assetManager, inputRouter, onCancel, onProceed }) {
    this.panel = new RetainedPanel({
      assetManager,
      label: 'On Prestige',
      panelLabel: 'prestige-confirm',
    });
    this.root = this.panel.root;
    this.message = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.cancel = new RetainedButton({
      assetManager,
      label: 'Cancel',
      buttonLabel: 'prestige-confirm-cancel',
      inputRouter,
      onActivate: onCancel,
    });
    this.proceed = new RetainedButton({
      assetManager,
      label: 'Prestige',
      buttonLabel: 'prestige-confirm-proceed',
      inputRouter,
      onActivate: onProceed,
    });
    this.panel.body.addChild(this.message, this.cancel.root, this.proceed.root);
    this.visible = false;
    this.root.visible = false;
    this.height = 0;
  }

  bind(model) {
    this.model = model;
    this.visible = Boolean(model);
    this.root.visible = this.visible;
    setText(
      this.message,
      normalizeRows(model?.lines ?? model?.messageLines).join('\n'),
    );
  }

  setBounds(x, y, width) {
    this.message.position.set(10, 8);
    this.height = Math.max(82, Math.ceil(this.message.height) + 48);
    this.panel.setBounds(x, y, width, this.height);
    const buttonWidth = (width - 26) / 2;
    this.cancel.setBounds(10, this.height - 30, buttonWidth, 20);
    this.proceed.setBounds(16 + buttonWidth, this.height - 30, buttonWidth, 20);
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    applyTextTheme(this.message, theme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.cancel.applyTheme(theme);
    this.proceed.applyTheme(theme);
  }

  destroy() {
    this.cancel.destroy();
    this.proceed.destroy();
    this.panel.destroy();
  }
}

class PrestigeTooltip {
  constructor({ assetManager }) {
    this.panel = new RetainedPanel({
      assetManager,
      panelLabel: 'prestige-tooltip',
      strong: true,
      shadowKind: 'tooltip',
    });
    this.root = this.panel.root;
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: 160,
    });
    this.panel.body.addChild(this.copy);
    this.root.visible = false;
    this.height = 0;
  }

  bind(model) {
    setText(this.copy, model.copy ?? model.text ?? String(model));
    this.copy.position.set(10, 8);
    this.height = Math.ceil(this.copy.height + 16);
    this.panel.setBounds(0, 0, 180, this.height);
  }

  show({ x, y }) {
    this.root.position.set(x, y);
    this.root.visible = true;
  }

  hide() {
    this.root.visible = false;
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    applyTextTheme(this.copy, theme, {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: 160,
    });
  }

  destroy() {
    this.panel.destroy();
  }
}

function matchesConfirm(row, confirm) {
  if (!row || !confirm) {
    return false;
  }

  return (
    row.id === confirm.milestoneId ||
    Number(row.level) === Number(confirm.level ?? confirm.milestoneLevel)
  );
}

function formatPrestigeTitle(value) {
  return String(value ?? '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrestigeCopy(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim().replace(/^reward:\s*/i, '');
      return trimmed
        ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
        : '';
    })
    .filter(Boolean)
    .join('\n');
}

function resolvePrestigeTexture(assetManager, assetId) {
  return assetManager?.has?.(assetId)
    ? assetManager.getTexture(assetId)
    : Texture.EMPTY;
}

function fitPrestigeIcon(icon, maxWidth, maxHeight) {
  const bounds = icon.texture?.orig ?? icon.texture?.frame;
  const width = Math.max(1, Number(bounds?.width) || 1);
  const height = Math.max(1, Number(bounds?.height) || 1);
  const scale = Math.min(maxWidth / width, maxHeight / height);
  icon.width = width * scale;
  icon.height = height * scale;
}
