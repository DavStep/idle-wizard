import { Container, Sprite, Texture } from 'pixi.js';

import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import { PixiInfoButton } from '../../primitives/PixiInfoButton.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
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
  'prestige resets the current run into a new run from the shown start level.',
  'mana, coin, crystal, items, ordinary research, garden, brewing, and level tasks reset.',
  'daily and weekly task progress keeps its normal reset timer.',
  'the shown crystal, ruby, and emerald totals start the next run.',
  'claiming a milestone also credits lower unclaimed milestones.',
  'each completed milestone adds 1 prestige point for concrete rewards.',
  'points 1, 3, 6, and 10 permanently unlock new market licences.',
  'the highest licence stays active after resets. tap its ? in points for details.',
]);

const DEFAULT_TABS = Object.freeze([
  Object.freeze({ id: 'main', label: 'main' }),
  Object.freeze({ id: 'points', label: 'points' }),
]);

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
      label: 'prestige-page-scroll',
      inputRouter: this.inputRouter,
    });
    this.tabsLayer = new Container({ label: 'prestige-page-tabs' });
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
    this.content.addChild(this.scroll.root, this.tabsLayer, this.tooltip.root);

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
    this.description.bind({
      title: 'prestige',
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
      label: tab.label ?? tab.id,
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
    this.scroll.content.addChild(this.description.root);

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
    const tabClearance =
      RETAINED_PAGE_GEOMETRY.tabHeight + RETAINED_PAGE_GEOMETRY.scrollCut * 2;
    this.contentWidth = width;
    this.scroll.setBounds(
      edge,
      RETAINED_PAGE_GEOMETRY.contentTop,
      width,
      contentHeight - tabClearance,
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
    this.description.setBounds(0, y, this.contentWidth);
    y += this.description.height + 14;

    for (const row of this.rows.getWidgets()) {
      row.setBounds(0, y, this.contentWidth, row.getPreferredHeight());
      y += row.getPreferredHeight() + 18;

      if (
        this.confirm.visible &&
        matchesConfirm(row.model, this.pendingConfirm)
      ) {
        this.confirm.setBounds(0, y - 16, this.contentWidth);
        y += this.confirm.height + 2;
      }
    }

    if (
      this.confirm.visible &&
      !this.rows.getWidgets().some((row) =>
        matchesConfirm(row.model, this.pendingConfirm),
      )
    ) {
      this.confirm.setBounds(0, y, this.contentWidth);
      y += this.confirm.height + 2;
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
    this.scroll?.destroy();
    this.confirm?.destroy();
    this.tooltip?.destroy();
  }
}

class PrestigeDescriptionPanel {
  constructor({ assetManager }) {
    this.panel = new RetainedPanel({
      assetManager,
      label: 'prestige',
      panelLabel: 'prestige-description',
    });
    this.root = this.panel.root;
    this.summary = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.description = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: 308,
    });
    this.panel.body.addChild(this.summary, this.description);
    this.height = 0;
  }

  bind({ title, summaryLines, descriptionLines }) {
    this.panel.setTitle(title);
    setText(this.summary, normalizeRows(summaryLines).filter(Boolean).join('\n'));
    setText(
      this.description,
      normalizeRows(descriptionLines).map((line) => `- ${line}`).join('\n'),
    );
  }

  setBounds(x, y, width) {
    this.summary.position.set(10, 8);
    this.description.position.set(10, 8 + this.summary.height + 6);
    this.height = Math.ceil(
      8 + this.summary.height + 6 + this.description.height + 8,
    );
    this.panel.setBounds(x, y, width, this.height);
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    applyTextTheme(this.summary, theme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    applyTextTheme(this.description, theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: theme.muted,
      wordWrapWidth: 308,
    });
  }
}

class PrestigeRowWidget {
  constructor({ page, assetManager }) {
    this.page = page;
    this.assetManager = assetManager;
    this.panel = new RetainedPanel({
      assetManager,
      panelLabel: 'prestige-row',
    });
    this.root = this.panel.root;
    this.stateIcon = new Sprite(Texture.EMPTY);
    this.stateIcon.visible = false;
    this.state = createText('', RETAINED_TEXT_STYLES.body);
    this.state.anchor.set(0.5);
    this.title = createText('', RETAINED_TEXT_STYLES.body);
    this.reward = createText('', RETAINED_TEXT_STYLES.body);
    this.action = new RetainedButton({
      assetManager,
      label: 'prestige',
      buttonLabel: 'prestige-row-action',
      inputRouter: this.page.inputRouter,
      onActivate: () => this.page.requestPrestige(this.model),
      variant: 'brown-dark',
    });
    this.help = new PixiInfoButton({
      assetManager,
      label: 'prestige-point-help',
      inputRouter: this.page.inputRouter,
      action: () => this.page.showTooltip(this.model.tooltip, this.help),
    });
    this.panel.body.addChild(
      this.stateIcon,
      this.state,
      this.title,
      this.reward,
      this.action.root,
      this.help,
    );
  }

  bind(model, actions) {
    this.model = model;
    this.actions = actions;
    this.root.visible = true;
    const isPoint = model.kind === 'point';
    setText(
      this.title,
      isPoint
        ? model.title ?? `${model.count} ${model.count === 1 ? 'point' : 'points'}`
        : model.title ?? `level ${model.level}`,
    );
    setText(
      this.state,
      model.status ??
        model.state ??
        (model.completed ? 'complete' : model.locked ? 'locked' : ''),
    );
    const rewardLines = normalizeRows(model.rewardLines ?? model.rewards);
    setText(
      this.reward,
      model.rewardText ??
        model.reward ??
        rewardLines.map((line) => `- ${line}`).join('\n'),
    );
    const canComplete = model.canComplete === true && model.included !== true;
    this.action.root.visible = canComplete;
    this.action.setModel({
      label: model.actionLabel ?? 'prestige',
      enabled: canComplete,
      action: () => this.page.requestPrestige(model),
    });
    this.help.visible = Boolean(model.tooltip);
    this.help.renderable = this.help.visible;
    this.help.setModel({
      action: () => this.page.showTooltip(model.tooltip, this.help),
    });
    this.applyStateIcon(model.state ?? model.status);
    this.applyTheme(this.page.theme);
    this.targetId =
      model.semanticId ??
      `prestige.${isPoint ? 'point' : 'milestone'}.${model.count ?? model.level}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: canComplete ? this.action.root : this.root,
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
    this.stateIcon.visible = false;
    this.state.visible = true;

    if (frameName && this.assetManager?.getAtlasTexture) {
      this.stateIcon.texture = this.assetManager.getAtlasTexture(frameName);
      this.stateIcon.width = 26;
      this.stateIcon.height = 26;
      this.stateIcon.visible = true;
      this.state.visible = false;
    }
  }

  setBounds(x, y, width, height) {
    this.panel.setBounds(x, y, width, height);
    this.stateIcon.position.set(29, (height - 26) / 2);
    this.state.position.set(32, height / 2);
    this.title.position.set(74, 8);
    this.reward.position.set(74, 30);
    const actionWidth = 72;
    this.action.setBounds(width - actionWidth - 10, height - 28, actionWidth, 20);
    this.help.setBounds(
      Math.min(width - 28, 74 + this.title.width + 3),
      6,
      18,
      18,
    );
  }

  getPreferredHeight() {
    return this.model?.kind === 'point'
      ? Math.max(72, 38 + this.reward.height)
      : 59;
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    const disabled =
      this.model?.state === 'locked' ||
      this.model?.state === 'completed' ||
      this.model?.completed === true;
    const color = disabled ? theme.disabled : theme.text;
    applyTextTheme(this.state, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      fontWeight: this.model?.state === 'ready' ? '700' : '400',
    });
    applyTextTheme(this.title, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    applyTextTheme(this.reward, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      wordWrapWidth: 230,
    });
    this.action.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.root.visible = false;
  }

  destroy() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.action.destroy();
    this.help.destroy();
    this.panel.destroy();
  }
}

class PrestigeConfirmPanel {
  constructor({ assetManager, inputRouter, onCancel, onProceed }) {
    this.panel = new RetainedPanel({
      assetManager,
      label: 'on prestige',
      panelLabel: 'prestige-confirm',
    });
    this.root = this.panel.root;
    this.message = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.cancel = new RetainedButton({
      assetManager,
      label: 'cancel',
      buttonLabel: 'prestige-confirm-cancel',
      inputRouter,
      onActivate: onCancel,
    });
    this.proceed = new RetainedButton({
      assetManager,
      label: 'prestige',
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
