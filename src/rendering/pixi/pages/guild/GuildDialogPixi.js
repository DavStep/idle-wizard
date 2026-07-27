import {
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  TRADE_ALLIANCE_TAG_COLORS,
  normalizeTradeAllianceTagColor,
} from '../../../../shared/tradeAllianceTagColors.js';
import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';
import { PixiScrollView } from '../../primitives/PixiScrollView.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

export const GUILD_DIALOG_IDS = Object.freeze({
  CHARTER: 'guild.charter',
  SETTINGS: 'guild.settings',
  REQUEST: 'guild.request',
  REQUEST_STACK: 'guild.requestStack',
  ADVENTURER: 'guild.adventurer',
  APPLICANT: 'guild.applicant',
});

const CARD_TABS = Object.freeze([
  Object.freeze({ id: 'stats', label: 'stats' }),
  Object.freeze({ id: 'life', label: 'life' }),
  Object.freeze({ id: 'history', label: 'history' }),
]);

const PROFILE_DIALOG_WIDTH = 304;
const CHARTER_DIALOG_WIDTH = 324;
const CARD_DIALOG_WIDTH = 304;
const CARD_DIALOG_HEIGHT = 364;
const REQUEST_DIALOG_WIDTH = 304;
const REQUEST_DIALOG_HEIGHT = 250;
const STACK_DIALOG_WIDTH = 350;
const STACK_DIALOG_HEIGHT = 391;
const STACK_LIST_WIDTH = 128;
const STACK_GAP = 9;
const GUILD_PAPER_SURFACE = '#f6f3ec';
const GUILD_PAPER_TEXT = '#221d17';
const GUILD_QUEST_INDEX = '#5b3d26';

const SWATCH_COLORS = Object.freeze({
  ink: null,
  red: '#8a3530',
  amber: '#815b24',
  green: '#356a3f',
  teal: '#276566',
  blue: '#3a587d',
  violet: '#65457c',
  magenta: '#793b68',
  brown: '#604b37',
  slate: '#4e5967',
});

/**
 * Retained Guild profile, quest-paper, and adventurer-card dialog.
 */
export class GuildDialogPixi extends BasePixiRetainedView {
  constructor({
    dialogId,
    parent = null,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    textEntryService = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!Object.values(GUILD_DIALOG_IDS).includes(dialogId)) {
      throw new Error(`Unknown retained Guild dialog: ${dialogId}`);
    }
    if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
      throw new Error(
        'Use GuildRequestStackDialogPixi for guild.requestStack.',
      );
    }

    super({ label: `${dialogId}:dialog` });
    this.dialogId = dialogId;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.textEntryService = textEntryService;
    this.onClose = onClose;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = {};
    this.modalHandle = null;
    this.selectedCardTab = 'stats';
    this.profileDraft = {
      name: '',
      tag: '',
      color: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    };

    this.backdrop = new Graphics();
    this.backdrop.label = `${dialogId}:backdrop`;
    this.backdrop.eventMode = 'static';
    this.backdropRegistration =
      inputRouter?.registerPressTarget?.(this.backdrop, {
        enabled: () => this.active,
        onActivate: () => this.onClose?.(),
        haptic: false,
        sound: false,
      }) ?? null;

    const size = getDialogSize(dialogId);
    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: `${dialogId}.close`,
      title: getDialogTitle(dialogId),
      coreWidth: size.width,
      coreHeight: size.height,
      closeAction: () => this.onClose?.(),
      label: `${dialogId}:panel`,
    });
    this.panel.setContentBoxSize(
      size.width - PIXI_UI_GEOMETRY.dialogPadding * 2,
      size.height - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.root.addChild(this.backdrop, this.panel);

    if (isProfileDialog(dialogId)) {
      this.buildProfileDialog();
    } else if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.buildRequestDialog({ counters });
    } else {
      this.buildCardDialog({ counters });
    }

    parent?.addChild?.(this.root);
    this.onApplyTheme(theme);
    this.relayout();
  }

  buildProfileDialog() {
    this.nameField = new GuildProfileField({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      labelText: 'name',
      maxLength: 24,
      label: `${this.dialogId}:name`,
      onChange: (value) => {
        this.profileDraft.name = value;
      },
    });
    this.tagField = new GuildProfileField({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      labelText: 'tag',
      maxLength: 5,
      label: `${this.dialogId}:tag`,
      onChange: (value) => {
        this.profileDraft.tag = value;
      },
    });
    this.colorLabel = new PixiTextLabel({
      text: 'tag color',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${this.dialogId}:colorLabel`,
    });
    this.swatchLayer = new Container();
    this.swatchLayer.label = `${this.dialogId}:swatches`;
    this.swatches = TRADE_ALLIANCE_TAG_COLORS.map(
      (color) =>
        new GuildColorSwatch({
          inputRouter: this.inputRouter,
          semanticRegistry: this.semanticRegistry,
          semanticId: `${this.dialogId}.color.${color.id}`,
          colorId: color.id,
          label: `${this.dialogId}:color:${color.id}`,
          action: () => this.selectColor(color.id),
        }),
    );
    this.swatchLayer.addChild(...this.swatches.map((swatch) => swatch.root));
    this.submitButton = new PixiButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      semanticId: `${this.dialogId}.submit`,
      text:
        this.dialogId === GUILD_DIALOG_IDS.CHARTER
          ? 'create'
          : 'save',
      label: `${this.dialogId}:submit`,
      action: () => this.submitProfile(),
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      align: 'center',
      label: `${this.dialogId}:status`,
    });
    this.panel.content.addChild(
      this.nameField.root,
      this.tagField.root,
      this.colorLabel,
      this.swatchLayer,
      this.submitButton,
      this.statusLabel,
    );
  }

  buildRequestDialog({ counters }) {
    this.requestPaper = new GuildPaper({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      counters,
      label: `${this.dialogId}:paper`,
    });
    this.panel.content.addChild(this.requestPaper.root);
  }

  buildCardDialog({ counters }) {
    this.cardSummary = new Container();
    this.cardSummary.label = `${this.dialogId}:summary`;
    this.cardIconFrame = new PixiFrame({
      assetManager: this.assetManager,
      width: 72,
      height: 72,
      label: `${this.dialogId}:iconFrame`,
    });
    this.cardIconFrame.visible = false;
    this.cardIconFrame.renderable = false;
    this.cardIcon = new Sprite(Texture.EMPTY);
    this.cardIcon.label = `${this.dialogId}:icon`;
    this.cardIcon.visible = false;
    this.cardInitial = new PixiTextLabel({
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: `${this.dialogId}:initial`,
    });
    this.cardName = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${this.dialogId}:name`,
    });
    this.cardLevel = new PixiTextLabel({
      label: `${this.dialogId}:level`,
    });
    this.cardStatus = new PixiTextLabel({
      label: `${this.dialogId}:status`,
    });
    this.cardSummary.addChild(
      this.cardIconFrame,
      this.cardIcon,
      this.cardInitial,
      this.cardName,
      this.cardLevel,
      this.cardStatus,
    );
    this.detailScroll = new PixiScrollView({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      showProgress: true,
      width: 1,
      height: 1,
      contentPaddingTop: PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
      label: `${this.dialogId}:details`,
    });
    this.detailPool = new WidgetPool({
      name: `${this.dialogId} detail row pool`,
      counters,
      create: () =>
        new GuildDetailRow({
          label: `${this.dialogId}:detailRow`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 24,
    });
    this.detailRows = new PooledCollection({
      name: `${this.dialogId} detail rows`,
      pool: this.detailPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) =>
        orderChildren(this.detailScroll.content, widgets),
    });
    this.cardAction = new PixiButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      semanticId: `${this.dialogId}.action`,
      label: `${this.dialogId}:action`,
    });
    this.cardTabsLayer = new Container();
    this.cardTabsLayer.label = `${this.dialogId}:tabs`;
    this.cardTabs = CARD_TABS.map(
      (tab) =>
        new PixiButton({
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticRegistry: this.semanticRegistry,
          semanticId: `${this.dialogId}.tab.${tab.id}`,
          text: tab.label,
          label: `${this.dialogId}:tab:${tab.id}`,
          action: () => this.selectCardTab(tab.id),
        }),
    );
    this.cardTabsLayer.addChild(...this.cardTabs);
    this.panel.content.addChild(
      this.cardSummary,
      this.detailScroll,
      this.cardAction,
    );
    this.root.addChild(this.cardTabsLayer);
  }

  onBind(viewModel) {
    this.model = viewModel ?? {};
    this.panel.setTitle(this.model.title ?? getDialogTitle(this.dialogId));
    if (isProfileDialog(this.dialogId)) {
      this.bindProfile();
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestPaper.bind(this.model);
    } else {
      this.bindCard();
    }
    this.relayout();
  }

  bindProfile() {
    const profile = this.model.profile ?? this.model;
    const fieldsFocused =
      this.nameField.field.focused || this.tagField.field.focused;
    if (!fieldsFocused) {
      this.profileDraft = {
        name: String(profile.name ?? ''),
        tag: String(profile.tag ?? ''),
        color: normalizeTradeAllianceTagColor(profile.color),
      };
      this.nameField.setValue(this.profileDraft.name);
      this.tagField.setValue(this.profileDraft.tag);
    }
    this.selectColor(this.profileDraft.color, { notify: false });
    this.statusLabel.setText(this.model.status ?? '');
    this.statusLabel.visible = Boolean(this.model.status);
    this.submitButton.setEnabled(this.model.canSubmit !== false);
  }

  bindCard() {
    const card = this.model.card ?? this.model.adventurer ?? this.model;
    const isApplicant = this.dialogId === GUILD_DIALOG_IDS.APPLICANT;
    this.selectedCardTab =
      this.model.selectedTabId ??
      card.selectedTabId ??
      this.selectedCardTab;
    this.cardName.setText(card.displayName ?? card.name ?? 'nameless');
    this.cardLevel.setText(
      card.levelLabel ??
        `level ${card.level ?? 1}`,
    );
    this.cardStatus.setText(
      card.statusLabel ??
        card.status ??
        'idle',
    );
    this.cardInitial.setText(
      String(card.displayName ?? card.name ?? '?')
        .trim()
        .slice(0, 1)
        .toLowerCase() || '?',
    );
    this.cardIcon.visible = false;
    const texture = resolveCharacterTexture(this.assetManager, card);
    if (texture) {
      this.cardIcon.texture = texture;
      this.cardIcon.visible = true;
    }
    this.cardInitial.visible = !this.cardIcon.visible;
    const rows =
      this.model.tabs?.find((tab) => tab.id === this.selectedCardTab)?.rows ??
      card.tabs?.[this.selectedCardTab] ??
      this.model.rows ??
      deriveCardRows(card, this.selectedCardTab);
    this.detailRows.reconcile(safeArray(rows));
    this.cardTabs.forEach((button, index) => {
      const tab = CARD_TABS[index];
      button.setSelected(tab.id === this.selectedCardTab);
    });
    const action = this.model.action ?? card.action;
    this.cardAction
      .setText(
        this.model.actionLabel ??
          card.actionLabel ??
          (isApplicant ? 'hire' : 'fire'),
      )
      .setAction(action)
      .setEnabled(Boolean(action) && this.model.actionEnabled !== false);
    this.cardAction.visible = Boolean(action);
    this.cardAction.renderable = this.cardAction.visible;
  }

  selectCardTab(tabId) {
    if (
      !CARD_TABS.some((tab) => tab.id === tabId) ||
      tabId === this.selectedCardTab
    ) {
      return false;
    }
    this.selectedCardTab = tabId;
    this.model.onSelectTab?.(tabId);
    this.bindCard();
    this.relayout();
    return true;
  }

  selectColor(colorId, { notify = true } = {}) {
    this.profileDraft.color = normalizeTradeAllianceTagColor(colorId);
    for (const swatch of this.swatches) {
      swatch.setSelected(swatch.colorId === this.profileDraft.color);
    }
    if (notify) {
      this.model.onChange?.({ ...this.profileDraft });
    }
  }

  submitProfile() {
    const submit = this.model.onSubmit ?? this.model.action;
    return submit?.({ ...this.profileDraft }) ?? false;
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawBackdrop();
    this.panel?.applyTheme(this.theme);
    const contentTheme =
      this.panel?.getContentTheme?.() ?? this.theme;
    if (isProfileDialog(this.dialogId)) {
      this.nameField?.applyTheme(contentTheme);
      this.tagField?.applyTheme(contentTheme);
      this.colorLabel?.applyTheme(contentTheme);
      this.statusLabel?.applyTheme(contentTheme);
      this.submitButton?.applyTheme(contentTheme);
      for (const swatch of this.swatches ?? []) {
        swatch.applyTheme(contentTheme);
      }
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestPaper?.applyTheme(contentTheme);
    } else {
      this.cardIconFrame?.applyTheme(contentTheme);
      this.cardInitial?.applyTheme(contentTheme);
      this.cardName?.applyTheme(contentTheme);
      this.cardLevel?.applyTheme(contentTheme);
      this.cardStatus?.applyTheme(contentTheme);
      this.detailScroll?.applyTheme(contentTheme);
      this.cardAction?.applyTheme(contentTheme);
      for (const row of this.detailRows?.getWidgets?.() ?? []) {
        row.applyTheme(contentTheme);
      }
      for (const tab of this.cardTabs ?? []) {
        tab.applyTheme(this.theme);
      }
    }
  }

  onLayout(viewportProjection) {
    this.sourceWidth = finiteOr(
      viewportProjection?.sourceWidth,
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    this.sourceHeight = finiteOr(
      viewportProjection?.sourceHeight,
      PIXI_UI_GEOMETRY.sourceHeight,
    );
    this.relayout();
  }

  onActivate() {
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: this.dialogId,
        root: this.root,
        onBack: () => this.onClose?.() ?? true,
        onEscape: () => this.onClose?.() ?? true,
      }) ?? null;
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
  }

  onDeactivate() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.nameField?.blur();
    this.tagField?.blur();
  }

  relayout() {
    if (!this.panel) {
      return;
    }
    const size = getDialogSize(this.dialogId);
    const centerY = getDialogCenterY(this.sourceHeight);
    const shift = finiteOr(this.viewportProjection?.dialogShift, 0);
    const x = Math.round((this.sourceWidth - size.width) / 2);
    const y = Math.round(centerY - size.height / 2 + shift);
    this.panel.position.set(x, y);
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );

    if (isProfileDialog(this.dialogId)) {
      this.layoutProfile();
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestPaper.setBounds(
        0,
        0,
        this.panel.contentWidth,
        this.panel.contentHeight,
      );
    } else {
      this.layoutCard(x, y, size);
    }
    this.redrawBackdrop();
  }

  layoutProfile() {
    const width = this.panel.contentWidth;
    this.nameField.setBounds(0, 0, width, 38);
    this.tagField.setBounds(0, 44, width, 38);
    this.colorLabel.position.set(0, 88);
    this.swatchLayer.position.set(0, 104);
    this.swatches.forEach((swatch, index) => {
      const column = index % 10;
      swatch.setBounds(column * 25, 0, 20);
    });
    this.submitButton.position.set(0, 134);
    this.submitButton.setSize(width, 28);
    this.statusLabel.position.set(
      Math.max(0, (width - this.statusLabel.measuredWidth) / 2),
      168,
    );
  }

  layoutCard(panelX, panelY, size) {
    const width = this.panel.contentWidth;
    const height = this.panel.contentHeight;
    this.cardSummary.position.set(0, 0);
    this.cardIconFrame.position.set(0, 0);
    this.cardIcon.position.set(0, 0);
    this.cardIcon.width = 72;
    this.cardIcon.height = 72;
    this.cardInitial.position.set(36, 36);
    this.cardName.position.set(84, 4);
    this.cardName.setWrapWidth(Math.max(0, width - 84));
    this.cardLevel.position.set(84, 27);
    this.cardStatus.position.set(84, 50);

    const actionHeight = this.cardAction.visible ? 28 : 0;
    const detailsY = 82;
    const detailsHeight = Math.max(
      0,
      height - detailsY - (actionHeight > 0 ? actionHeight + 6 : 0),
    );
    this.detailScroll.position.set(0, detailsY);
    this.detailScroll.setViewportSize(width, detailsHeight);
    let rowY = 0;
    for (const row of this.detailRows.getWidgets()) {
      const rowHeight = row.getPreferredHeight(width);
      row.setBounds(0, rowY, width, rowHeight);
      rowY += rowHeight + 4;
    }
    this.detailScroll.setContentHeight(Math.max(detailsHeight, rowY));
    if (this.cardAction.visible) {
      this.cardAction.position.set(0, height - actionHeight);
      this.cardAction.setSize(width, actionHeight);
    }
    this.cardTabsLayer.position.set(
      panelX,
      panelY + size.height + PIXI_UI_GEOMETRY.dialogTabGap,
    );
    layoutButtons(
      this.cardTabs,
      0,
      0,
      size.width,
      40,
      PIXI_UI_GEOMETRY.dialogTabGap,
    );
  }

  redrawBackdrop() {
    if (!this.backdrop || !this.theme) {
      return;
    }
    this.backdrop
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight)
      .fill({ color: this.theme.backdrop, alpha: 0.78 });
  }

  onDestroy() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    if (isProfileDialog(this.dialogId)) {
      this.nameField.destroy();
      this.tagField.destroy();
      this.submitButton.destroy({ children: true });
      for (const swatch of this.swatches) {
        swatch.destroy();
      }
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestPaper.destroy();
    } else {
      this.detailRows.destroy();
      this.detailPool.destroy();
      this.cardAction.destroy({ children: true });
      for (const tab of this.cardTabs) {
        tab.destroy({ children: true });
      }
      this.detailScroll.destroy({ children: true });
    }
  }
}

/**
 * Special retained paper-stack dialog used by available Guild quests.
 */
export class GuildRequestStackDialogPixi extends BasePixiRetainedView {
  constructor({
    parent = null,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ label: `${GUILD_DIALOG_IDS.REQUEST_STACK}:dialog` });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.onClose = onClose;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = {};
    this.modalHandle = null;
    this.requests = [];
    this.selectedIndex = 0;

    this.backdrop = new Graphics();
    this.backdrop.eventMode = 'static';
    this.backdropRegistration =
      inputRouter?.registerPressTarget?.(this.backdrop, {
        enabled: () => this.active,
        onActivate: () => this.onClose?.(),
        haptic: false,
        sound: false,
      }) ?? null;
    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: 'guild.requestStack.close',
      title: 'incoming quests',
      coreWidth: STACK_DIALOG_WIDTH,
      coreHeight: STACK_DIALOG_HEIGHT,
      closeAction: () => this.onClose?.(),
      label: 'guild:requestStack:panel',
    });
    this.panel.setContentBoxSize(
      STACK_DIALOG_WIDTH - PIXI_UI_GEOMETRY.dialogPadding * 2,
      STACK_DIALOG_HEIGHT - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.listLayer = new Container();
    this.listLayer.label = 'guild:requestStack:list';
    this.detail = new GuildQuestDetail({
      assetManager,
      label: 'guild:requestStack:detail',
    });
    this.progress = new PixiProgressBar({
      assetManager,
      label: 'guild:requestStack:progress',
    });
    this.note = new PixiTextLabel({
      text: 'Papers rotate to the back when you open the next one.',
      fontSize: 9,
      fontWeight: 'bold',
      color: '#a89678',
      anchor: { x: 0.5, y: 0 },
      label: 'guild:requestStack:note',
    });
    this.postButton = new GuildQuestButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.requestStack.post',
      green: true,
      label: 'guild:requestStack:post',
      action: () => this.postSelected(),
    });
    this.nextButton = new GuildQuestButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.requestStack.next',
      label: 'guild:requestStack:next',
      action: () => this.nextPage(),
    });
    this.requestPool = new WidgetPool({
      name: 'guild request stack page pool',
      counters,
      create: () =>
        new GuildRequestListItem({
          assetManager,
          inputRouter,
          semanticRegistry,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 12,
    });
    this.requestRows = new PooledCollection({
      name: 'guild request stack pages',
      pool: this.requestPool,
      counters,
      keyOf: (entry) => entry.request.id,
      bind: (widget, entry) =>
        widget.bind(entry.request, {
          selected: entry.selected,
          pageNumber: entry.pageNumber,
          action: () => this.selectRequest(entry.requestIndex),
        }),
      afterReconcile: (widgets) => orderChildren(this.listLayer, widgets),
    });
    this.panel.content.addChild(
      this.listLayer,
      this.detail.root,
      this.progress,
      this.postButton.root,
      this.nextButton.root,
      this.note,
    );
    this.root.addChild(this.backdrop, this.panel);
    parent?.addChild?.(this.root);
    this.onApplyTheme(theme);
    this.relayout();
  }

  onBind(viewModel) {
    this.model = viewModel ?? {};
    this.requests = safeArray(
      this.model.requests ??
        this.model.availableRequests,
    );
    this.selectedIndex = clampInteger(
      this.model.selectedIndex ?? this.selectedIndex,
      0,
      Math.max(0, this.requests.length - 1),
    );
    if (this.requests.length === 0) {
      this.onClose?.();
      return;
    }
    this.renderSelectedRequest();
  }

  renderSelectedRequest() {
    const displayItems = this.requests.map((_, offset) => {
      const requestIndex =
        (this.selectedIndex + offset) % this.requests.length;
      return {
        request: this.requests[requestIndex],
        requestIndex,
        pageNumber: requestIndex + 1,
        selected: offset === 0,
      };
    });
    this.requestRows.reconcile(displayItems);
    const selected = this.requests[this.selectedIndex];
    this.detail.bind(selected, {
      pageLabel: `${this.selectedIndex + 1}/${this.requests.length}`,
    });
    this.progress.setProgress(
      (this.selectedIndex + 1) / Math.max(1, this.requests.length),
    );
    const boardFull = this.model.boardFull === true;
    this.postButton
      .setText(boardFull ? 'Board Full' : 'Post')
      .setEnabled(!boardFull);
    this.nextButton
      .setText(this.requests.length > 1 ? 'Next Page' : 'Only Page')
      .setEnabled(this.requests.length > 1);
    const contentTheme =
      this.panel?.getContentTheme?.() ?? this.theme;
    for (const row of this.requestRows.getWidgets()) {
      row.applyTheme(contentTheme);
    }
    this.relayoutList();
  }

  selectRequest(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.requests.length ||
      index === this.selectedIndex
    ) {
      return false;
    }
    this.selectedIndex = index;
    this.model.onSelect?.(index, this.requests[index]);
    this.renderSelectedRequest();
    return true;
  }

  nextPage() {
    if (this.requests.length <= 1) {
      return false;
    }
    return this.selectRequest(
      (this.selectedIndex + 1) % this.requests.length,
    );
  }

  postSelected() {
    const request = this.requests[this.selectedIndex];
    if (!request || this.model.boardFull) {
      return false;
    }
    return (
      request.postAction?.(request) ??
      this.model.onPost?.(request.id, request) ??
      false
    );
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawBackdrop();
    this.panel?.applyTheme(this.theme);
    const contentTheme =
      this.panel?.getContentTheme?.() ?? this.theme;
    this.note?.applyTheme(contentTheme);
    this.progress?.applyTheme(contentTheme);
    this.detail?.applyTheme(contentTheme);
    this.postButton?.applyTheme(contentTheme);
    this.nextButton?.applyTheme(contentTheme);
    for (const row of this.requestRows?.getWidgets?.() ?? []) {
      row.applyTheme(contentTheme);
    }
  }

  onLayout(viewportProjection) {
    this.sourceWidth = finiteOr(
      viewportProjection?.sourceWidth,
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    this.sourceHeight = finiteOr(
      viewportProjection?.sourceHeight,
      PIXI_UI_GEOMETRY.sourceHeight,
    );
    this.relayout();
  }

  onActivate() {
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: GUILD_DIALOG_IDS.REQUEST_STACK,
        root: this.root,
        onBack: () => this.onClose?.() ?? true,
        onEscape: () => this.onClose?.() ?? true,
      }) ?? null;
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
  }

  onDeactivate() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
  }

  relayout() {
    if (!this.panel) {
      return;
    }
    const centerY = getDialogCenterY(this.sourceHeight) - 52;
    const shift = finiteOr(this.viewportProjection?.dialogShift, 0);
    const x = Math.round((this.sourceWidth - STACK_DIALOG_WIDTH) / 2);
    const y = Math.round(
      centerY - STACK_DIALOG_HEIGHT / 2 + shift,
    );
    this.panel.position.set(x, y);
    this.listLayer.position.set(-1, 5);
    this.detail.root.position.set(
      -1 + STACK_LIST_WIDTH + STACK_GAP,
      5,
    );
    this.detail.setSize(
      STACK_DIALOG_WIDTH - 38 - STACK_LIST_WIDTH - STACK_GAP,
      272,
    );
    this.progress.position.set(16, 282);
    this.progress.setSize(
      STACK_DIALOG_WIDTH - 86,
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    const controlY = 299;
    this.postButton.setBounds(4, controlY, 189, 31);
    this.nextButton.setBounds(206, controlY, 102, 31);
    this.note.position.set(
      this.panel.contentBoxWidth / 2,
      336,
    );
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );
    this.relayoutList();
    this.redrawBackdrop();
  }

  relayoutList() {
    let y = 0;
    for (const row of this.requestRows?.getWidgets?.() ?? []) {
      const height = row.selected ? 88 : 22;
      row.setBounds(0, y, STACK_LIST_WIDTH, height);
      y += height + 2;
    }
  }

  redrawBackdrop() {
    if (!this.backdrop || !this.theme) {
      return;
    }
    this.backdrop
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight)
      .fill({ color: this.theme.backdrop, alpha: 0.78 });
  }

  onDestroy() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    this.requestRows.destroy();
    this.requestPool.destroy();
    this.detail.destroy();
    this.postButton.destroy();
    this.nextButton.destroy();
  }
}

class GuildProfileField {
  constructor({
    assetManager,
    inputRouter,
    textEntryService,
    labelText,
    maxLength,
    label,
    onChange,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.label = new PixiTextLabel({
      text: labelText,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:label`,
    });
    this.field = new PixiTextField({
      assetManager,
      inputRouter,
      textEntryService,
      inputKind: 'text',
      maxLength,
      label: `${label}:field`,
      onChange,
    });
    this.root.addChild(this.label, this.field);
  }

  setValue(value) {
    this.field.setValue(value);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.label.position.set(0, 0);
    this.field.position.set(0, 14);
    this.field.setSize(width, Math.max(24, height - 14));
  }

  applyTheme(theme) {
    this.label.applyTheme(theme);
    this.field.applyTheme(theme);
  }

  blur() {
    this.field.blur();
  }

  destroy() {
    this.field.destroy({ children: true });
    this.root.destroy({ children: true });
  }
}

class GuildColorSwatch {
  constructor({
    inputRouter,
    semanticRegistry,
    semanticId,
    colorId,
    action,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.graphic = new Graphics();
    this.root.addChild(this.graphic);
    this.colorId = colorId;
    this.action = action;
    this.selected = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'selection',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.action?.(),
      }) ?? null;
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.redraw();
  }

  setBounds(x, y, size) {
    this.root.position.set(x, y);
    this.size = size;
    this.root.hitArea = new Rectangle(0, 0, size, size);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
  }

  redraw() {
    const color =
      SWATCH_COLORS[this.colorId] ??
      this.theme.text;
    this.graphic
      .clear()
      .rect(0, 0, this.size ?? 20, this.size ?? 20)
      .fill(color)
      .stroke({
        color: this.selected ? this.theme.text : this.theme.stroke,
        width: this.selected ? 2 : 1,
        alignment: 1,
      });
  }

  destroy() {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = null;
    }
    this.root.destroy({ children: true });
  }
}

class GuildPaper {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.frame = new GuildAssetNineSlice({
      assetManager,
      textureId: 'public:ui/guild-quest/paper-9slice.png',
      sourceInsets: { left: 41, top: 41, right: 42, bottom: 42 },
      outputInsets: { left: 5, top: 5, right: 5, bottom: 5 },
      label: `${label}:frame`,
    });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.actionButton = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.request.action',
      label: `${label}:action`,
    });
    this.root.addChild(
      this.frame.root,
      this.rowsLayer,
      this.actionButton,
    );
    this.rowPool = new WidgetPool({
      name: `${label} row pool`,
      counters,
      create: () =>
        new GuildDetailRow({
          paper: true,
          label: `${label}:row`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 8,
    });
    this.rows = new PooledCollection({
      name: `${label} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
  }

  bind(model = {}) {
    const request = model.request ?? model;
    const rows =
      model.rows ??
      [
        { id: 'difficulty', label: 'difficulty', value: request.difficulty },
        { id: 'stats', label: 'stats', value: request.statLabel },
        {
          id: 'reward',
          label: 'reward',
          value: request.rewardText,
          valueResourceKey: 'coin',
        },
        {
          id: 'expires',
          label: 'expires',
          value: request.expiresLabel ?? 'now',
        },
        {
          id: 'lore',
          text: request.lore ?? '',
          paragraph: true,
        },
        ...(request.eventLabel
          ? [
              {
                id: 'event',
                label: 'event',
                value: request.eventLabel,
              },
            ]
          : []),
      ];
    this.rows.reconcile(rows);
    const action = model.action ?? request.action;
    this.actionButton
      .setText(
        model.actionLabel ??
          request.actionLabel ??
          '',
      )
      .setAction(action)
      .setEnabled(Boolean(action) && model.actionDisabled !== true);
    this.actionButton.visible = Boolean(action);
    this.actionButton.renderable = this.actionButton.visible;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.frame.setBounds(0, 0, width, height);
    this.rowsLayer.position.set(10, 10);
    let rowY = 0;
    for (const row of this.rows.getWidgets()) {
      const rowHeight = row.getPreferredHeight(width - 20);
      row.setBounds(0, rowY, width - 20, rowHeight);
      rowY += rowHeight + 2;
    }
    if (this.actionButton.visible) {
      this.actionButton.position.set(10, height - 38);
      this.actionButton.setSize(width - 20, 28);
    }
  }

  applyTheme(theme) {
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(theme);
    }
    this.actionButton.applyTheme(theme);
  }

  destroy() {
    this.rows.destroy();
    this.rowPool.destroy();
    this.actionButton.destroy({ children: true });
    this.frame.destroy();
    this.root.destroy({ children: true });
  }
}

class GuildDetailRow {
  constructor({ paper = false, label }) {
    this.root = new Container();
    this.root.label = label;
    this.paper = paper;
    this.keyLabel = new PixiTextLabel({
      fontSize: paper
        ? PIXI_UI_GEOMETRY.bodyFontSize
        : PIXI_UI_GEOMETRY.bodyFontSize,
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.paragraph = new PixiTextLabel({
      wordWrap: true,
      label: `${label}:paragraph`,
    });
    this.root.addChild(
      this.keyLabel,
      this.valueLabel,
      this.paragraph,
    );
  }

  bind(key, row = {}) {
    this.key = key;
    this.model = row;
    this.root.visible = true;
    this.root.renderable = true;
    const paragraph = row.paragraph === true || row.text != null;
    this.keyLabel.visible = !paragraph;
    this.valueLabel.visible = !paragraph;
    this.paragraph.visible = paragraph;
    if (paragraph) {
      this.paragraph.setText(row.text ?? '');
    } else {
      this.keyLabel.setText(row.label ?? row.keyText ?? '');
      this.valueLabel.setText(row.value ?? row.valueText ?? '');
    }
  }

  getPreferredHeight(width) {
    if (this.paragraph.visible) {
      this.paragraph.setWrapWidth(width);
      return Math.max(
        PIXI_UI_GEOMETRY.rowMinHeight,
        this.paragraph.measuredHeight,
      );
    }
    return PIXI_UI_GEOMETRY.rowMinHeight;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    if (this.paragraph.visible) {
      this.paragraph.position.set(0, 0);
      this.paragraph.setWrapWidth(width);
      return;
    }
    const textY = Math.max(1, (height - 16) / 2);
    this.keyLabel.position.set(0, textY);
    this.valueLabel.position.set(width, textY);
    this.keyLabel.setWrapWidth(
      Math.max(
        0,
        width -
          this.valueLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
  }

  applyTheme(theme) {
    this.keyLabel.applyTheme(theme);
    this.valueLabel.applyTheme(theme);
    this.paragraph.applyTheme(theme);
    if (this.paper) {
      this.keyLabel.setColor(GUILD_PAPER_TEXT);
      this.valueLabel.setColor(
        this.model?.valueResourceKey
          ? guildPaperResourceColor(this.model.valueResourceKey)
          : GUILD_PAPER_TEXT,
      );
      this.paragraph.setColor(GUILD_PAPER_TEXT);
    } else {
      this.valueLabel.setColor(
        resolveThemeColor(
          this.model?.valueResourceKey ?? 'text',
        ),
      );
    }
  }

  reset() {
    this.model = null;
    this.key = null;
    this.root.visible = false;
    this.root.renderable = false;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class GuildRequestListItem {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
  }) {
    this.assetManager = assetManager;
    this.semanticRegistry = semanticRegistry;
    this.root = new Container();
    this.frame = new GuildAssetNineSlice({
      assetManager,
      textureId: 'public:ui/guild-quest/list-row-9slice.png',
      sourceInsets: { left: 31, top: 24, right: 32, bottom: 23 },
      outputInsets: { left: 7, top: 7, right: 7, bottom: 7 },
      label: 'guild:requestStack:listItem:frame',
    });
    this.number = new PixiTextLabel({
      fontSize: 9,
      fontWeight: 'bold',
      anchor: { x: 1, y: 0 },
      color: GUILD_QUEST_INDEX,
      label: 'guild:requestStack:listItem:number',
    });
    this.title = new PixiTextLabel({
      fontSize: 8.8,
      fontWeight: 'bold',
      label: 'guild:requestStack:listItem:title',
    });
    this.photo = createAssetSprite(
      assetManager,
      'public:ui/guild-quest/quest-photo-smuggler-tunnel.png',
      'guild:requestStack:listItem:photo',
    );
    this.clip = createAssetSprite(
      assetManager,
      'public:ui/guild-quest/paperclip.png',
      'guild:requestStack:listItem:clip',
    );
    this.root.addChild(
      this.frame.root,
      this.number,
      this.title,
      this.photo,
      this.clip,
    );
    this.action = null;
    this.enabled = true;
    this.selected = false;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'selection',
      }) ?? null;
  }

  bind(request, { selected, pageNumber, action }) {
    this.unregisterSemantic();
    this.request = request;
    this.selected = selected;
    this.action = action;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'static';
    this.number.setText(pageNumber);
    this.title.setText(toDisplayCase(request.title));
    this.photo.visible = selected;
    this.clip.visible = selected;
    this.frame.setTextureId(
      selected
        ? 'public:ui/guild-quest/paper-9slice.png'
        : 'public:ui/guild-quest/list-row-9slice.png',
      selected
        ? { left: 41, top: 41, right: 42, bottom: 42 }
        : { left: 31, top: 24, right: 32, bottom: 23 },
      selected
        ? { left: 9, top: 9, right: 9, bottom: 9 }
        : { left: 7, top: 7, right: 7, bottom: 7 },
    );
    this.semanticId = `guild.requestStack.request.${request.id}`;
    if (this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.action?.(),
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setBounds(0, 0, width, height);
    this.number.position.set(19, this.selected ? 8 : 2);
    this.title.position.set(23, this.selected ? 8 : 2);
    this.title.setWrapWidth(width - 30);
    this.photo.position.set(20, 31);
    this.photo.width = 88;
    this.photo.height = 46;
    this.clip.position.set(-14, -14);
    this.clip.width = 22;
    this.clip.height = 32;
  }

  applyTheme(theme) {
    this.number.applyTheme(theme);
    this.title.applyTheme(theme);
    this.number.setColor(GUILD_QUEST_INDEX);
    this.title.setColor(GUILD_PAPER_TEXT);
  }

  reset() {
    this.unregisterSemantic();
    this.request = null;
    this.action = null;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.frame.destroy();
    this.root.destroy({ children: true });
  }
}

class GuildQuestDetail {
  constructor({ assetManager, label }) {
    this.root = new Container();
    this.root.label = label;
    this.frame = new GuildAssetNineSlice({
      assetManager,
      textureId: 'public:ui/guild-quest/paper-9slice.png',
      sourceInsets: { left: 41, top: 41, right: 42, bottom: 42 },
      outputInsets: { left: 9, top: 9, right: 9, bottom: 9 },
      label: `${label}:frame`,
    });
    this.page = new PixiTextLabel({
      fontSize: 10,
      fontWeight: 'bold',
      anchor: { x: 1, y: 0 },
      color: GUILD_QUEST_INDEX,
      label: `${label}:page`,
    });
    this.lore = new PixiTextLabel({
      fontSize: 9.6,
      fontWeight: 'bold',
      wordWrap: true,
      color: GUILD_PAPER_TEXT,
      label: `${label}:lore`,
    });
    this.rows = [
      new GuildQuestDetailLine({
        assetManager,
        icon: 'icon-difficulty.png',
        label: 'Difficulty',
      }),
      new GuildQuestDetailLine({
        assetManager,
        icon: 'icon-stats.png',
        label: 'Stats',
      }),
      new GuildQuestDetailLine({
        assetManager,
        icon: 'icon-reward.png',
        label: 'Reward',
      }),
      new GuildQuestDetailLine({
        assetManager,
        icon: 'icon-expires.png',
        label: 'Expires',
      }),
      new GuildQuestDetailLine({
        assetManager,
        icon: 'wax-seal.png',
        label: 'Event',
      }),
    ];
    this.seal = createAssetSprite(
      assetManager,
      'public:ui/guild-quest/wax-seal.png',
      `${label}:seal`,
    );
    this.root.addChild(
      this.frame.root,
      this.page,
      this.lore,
      ...this.rows.map((row) => row.root),
      this.seal,
    );
  }

  bind(request = {}, { pageLabel = '' } = {}) {
    this.page.setText(pageLabel);
    this.lore.setText(request.lore ?? '');
    const values = [
      toDisplayCase(request.difficulty),
      toDisplayCase(request.statLabel),
      request.rewardText ?? '',
      request.expiresLabel ?? 'now',
      request.eventLabel ?? '',
    ];
    this.rows.forEach((row, index) => {
      row.setValue(values[index]);
      row.root.visible = index < 4 || Boolean(values[index]);
    });
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.frame.setBounds(0, 0, width, height);
    this.page.position.set(width - 12, 12);
    this.lore.position.set(15, 39);
    this.lore.setWrapWidth(Math.min(91, width - 30));
    let y = 101;
    for (const row of this.rows) {
      if (!row.root.visible) {
        continue;
      }
      const rowHeight = row.labelText === 'Reward' ? 32 : 17;
      row.setBounds(15, y, width - 30, rowHeight);
      y += rowHeight;
    }
    this.seal.position.set(width - 37, height - 37);
    this.seal.width = 28;
    this.seal.height = 28;
  }

  applyTheme(theme) {
    this.page.applyTheme(theme);
    this.lore.applyTheme(theme);
    this.page.setColor(GUILD_QUEST_INDEX);
    this.lore.setColor(GUILD_PAPER_TEXT);
    for (const row of this.rows) {
      row.applyTheme(theme);
    }
  }

  destroy() {
    this.frame.destroy();
    for (const row of this.rows) {
      row.destroy();
    }
    this.root.destroy({ children: true });
  }
}

class GuildQuestDetailLine {
  constructor({ assetManager, icon, label }) {
    this.root = new Container();
    this.labelText = label;
    this.icon = createAssetSprite(
      assetManager,
      `public:ui/guild-quest/${icon}`,
      `guild:questDetail:${label}:icon`,
    );
    this.label = new PixiTextLabel({
      text: label,
      fontSize: 7.8,
      fontWeight: 'bold',
      color: GUILD_PAPER_TEXT,
      label: `guild:questDetail:${label}:label`,
    });
    this.value = new PixiTextLabel({
      fontSize: 7,
      fontWeight: 'bold',
      align: 'right',
      anchor: { x: 1, y: 0 },
      color: GUILD_PAPER_TEXT,
      wordWrap: true,
      label: `guild:questDetail:${label}:value`,
    });
    this.separator = new Graphics();
    this.root.addChild(
      this.separator,
      this.icon,
      this.label,
      this.value,
    );
  }

  setValue(value) {
    this.value.setText(value ?? '');
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.separator
      .clear()
      .moveTo(0, 0)
      .lineTo(width, 0)
      .stroke({ color: '#483726', alpha: 0.22, width: 1 });
    this.icon.position.set(0, 3);
    this.icon.width = 11;
    this.icon.height = 11;
    this.label.position.set(16, 3);
    this.value.position.set(width, 3);
    this.value.setWrapWidth(Math.max(0, width - 55));
  }

  applyTheme(theme) {
    this.label.applyTheme(theme);
    this.value.applyTheme(theme);
    this.label.setColor(GUILD_PAPER_TEXT);
    this.value.setColor(GUILD_PAPER_TEXT);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class GuildAssetNineSlice {
  constructor({
    assetManager,
    textureId,
    sourceInsets,
    outputInsets,
    label,
  }) {
    this.assetManager = assetManager;
    this.textureId = textureId;
    this.sourceInsets = sourceInsets;
    this.outputInsets = outputInsets;
    this.root = new Container();
    this.root.label = label;
    this.fallback = new Graphics();
    this.sprite = new NineSliceSprite({
      texture: resolveTexture(assetManager, textureId) ?? Texture.EMPTY,
      leftWidth: sourceInsets.left,
      topHeight: sourceInsets.top,
      rightWidth: sourceInsets.right,
      bottomHeight: sourceInsets.bottom,
    });
    this.sprite.visible = Boolean(resolveTexture(assetManager, textureId));
    this.root.addChild(this.fallback, this.sprite);
  }

  setTextureId(textureId, sourceInsets, outputInsets) {
    this.textureId = textureId;
    this.sourceInsets = sourceInsets;
    this.outputInsets = outputInsets;
    const texture = resolveTexture(this.assetManager, textureId);
    if (texture) {
      this.sprite.texture = texture;
      this.sprite.leftWidth = sourceInsets.left;
      this.sprite.topHeight = sourceInsets.top;
      this.sprite.rightWidth = sourceInsets.right;
      this.sprite.bottomHeight = sourceInsets.bottom;
      this.sprite.visible = true;
    } else {
      this.sprite.visible = false;
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    const scaleX = this.outputInsets.left / this.sourceInsets.left;
    const scaleY = this.outputInsets.top / this.sourceInsets.top;
    this.sprite.scale.set(scaleX, scaleY);
    this.sprite.setSize(
      scaleX > 0 ? width / scaleX : width,
      scaleY > 0 ? height / scaleY : height,
    );
    this.fallback
      .clear()
      .rect(0, 0, width, height)
      .fill(GUILD_PAPER_SURFACE)
      .stroke({ color: '#8c765c', width: 1, alignment: 1 });
    this.fallback.visible = !this.sprite.visible;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class GuildQuestButton {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticId,
    green = false,
    action,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.frame = new GuildAssetNineSlice({
      assetManager,
      textureId: `public:ui/guild-quest/button-${green ? 'green' : 'brown'}-9slice.png`,
      sourceInsets: { left: 43, top: 27, right: 43, bottom: 28 },
      outputInsets: { left: 10, top: 10, right: 10, bottom: 10 },
      label: `${label}:frame`,
    });
    this.text = new PixiTextLabel({
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: '#f0e2ca',
      label: `${label}:text`,
    });
    this.root.addChild(this.frame.root, this.text);
    this.action = action;
    this.enabled = true;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled && this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'light',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => (this.enabled ? this.action?.() : false),
      }) ?? null;
  }

  setText(text) {
    this.text.setText(text);
    return this;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.alpha = this.enabled ? 1 : 0.72;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    return this;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setBounds(0, 0, width, height);
    this.text.position.set(width / 2, height / 2 - 1);
  }

  applyTheme(theme) {
    this.text.applyTheme(theme);
    this.text.setColor('#f0e2ca');
  }

  destroy() {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = null;
    }
    this.frame.destroy();
    this.root.destroy({ children: true });
  }
}

function getDialogSize(dialogId) {
  if (dialogId === GUILD_DIALOG_IDS.CHARTER) {
    return { width: CHARTER_DIALOG_WIDTH, height: 230 };
  }
  if (dialogId === GUILD_DIALOG_IDS.SETTINGS) {
    return { width: PROFILE_DIALOG_WIDTH, height: 230 };
  }
  if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
    return {
      width: REQUEST_DIALOG_WIDTH,
      height: REQUEST_DIALOG_HEIGHT,
    };
  }
  return { width: CARD_DIALOG_WIDTH, height: CARD_DIALOG_HEIGHT };
}

function resolveThemeColor(token) {
  return (theme) =>
    theme?.[token] ??
    theme?.resourceColors?.[token] ??
    token ??
    theme?.text;
}

function getDialogTitle(dialogId) {
  const titles = {
    [GUILD_DIALOG_IDS.CHARTER]: 'guild charter',
    [GUILD_DIALOG_IDS.SETTINGS]: 'guild settings',
    [GUILD_DIALOG_IDS.REQUEST]: 'request',
    [GUILD_DIALOG_IDS.ADVENTURER]: 'adventurer info',
    [GUILD_DIALOG_IDS.APPLICANT]: 'applicant info',
  };
  return titles[dialogId] ?? 'guild';
}

function isProfileDialog(dialogId) {
  return (
    dialogId === GUILD_DIALOG_IDS.CHARTER ||
    dialogId === GUILD_DIALOG_IDS.SETTINGS
  );
}

function deriveCardRows(card, tabId) {
  if (tabId === 'life') {
    return [
      { id: 'morale', label: 'morale', value: card.morale },
      { id: 'fatigue', label: 'fatigue', value: card.fatigue },
      { id: 'injury', label: 'injury', value: card.injury },
      {
        id: 'lifeText',
        text: card.lifeText ?? card.personalityLife ?? '',
        paragraph: true,
      },
    ];
  }
  if (tabId === 'history') {
    const history = safeArray(card.history);
    return history.length > 0
      ? history.map((entry, index) => ({
          id: entry.id ?? index,
          text: entry.text ?? entry,
          paragraph: true,
        }))
      : [{ id: 'empty', text: 'no history', paragraph: true }];
  }
  return [
    {
      id: 'xp',
      label: 'xp',
      value: `${card.xp ?? 0}/${card.nextLevelXp ?? '?'}`,
    },
    {
      id: 'personality',
      label: 'personality',
      value: card.personalityLabel ?? '',
    },
    ...Object.entries(card.stats ?? {}).map(([key, value]) => ({
      id: `stat:${key}`,
      label: key,
      value,
    })),
  ];
}

function createAssetSprite(assetManager, textureId, label) {
  const texture = resolveTexture(assetManager, textureId);
  const sprite = new Sprite(texture ?? Texture.EMPTY);
  sprite.label = label;
  sprite.visible = Boolean(texture);
  return sprite;
}

function resolveTexture(assetManager, textureId) {
  if (!assetManager?.loaded || !textureId) {
    return null;
  }
  return assetManager.getTexture(textureId);
}

function resolveCharacterTexture(assetManager, model = {}) {
  if (!assetManager?.loaded) {
    return null;
  }
  if (model.textureId) {
    return assetManager.getTexture(model.textureId);
  }
  if (model.iconKey) {
    return assetManager.getTexture(
      `source:assets/characters/${model.iconKey}.png`,
    );
  }
  return null;
}

function guildPaperResourceColor(resourceKey) {
  if (resourceKey === 'seed') {
    return '#795a3d';
  }
  if (resourceKey === 'herb') {
    return '#356b3e';
  }
  if (resourceKey === 'coin') {
    return '#7a641d';
  }
  return GUILD_PAPER_TEXT;
}

function getDialogCenterY(sourceHeight) {
  const chatClearance =
    PIXI_UI_GEOMETRY.roomChatBottom +
    PIXI_UI_GEOMETRY.roomChatHeight +
    PIXI_UI_GEOMETRY.roomChatTitleOverhang +
    PIXI_UI_GEOMETRY.roomChatGap;
  return (
    PIXI_UI_GEOMETRY.roomContentTop +
    (sourceHeight - chatClearance)
  ) / 2;
}

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function layoutButtons(buttons, x, y, width, height, gap) {
  if (buttons.length === 0) {
    return;
  }
  const buttonWidth =
    (width - gap * (buttons.length - 1)) / buttons.length;
  let cursorX = x;
  for (const button of buttons) {
    button.position.set(cursorX, y);
    button.setSize(buttonWidth, height);
    cursorX += buttonWidth + gap;
  }
}

function toDisplayCase(value) {
  return String(value ?? '').replace(
    /\b[a-z]/g,
    (letter) => letter.toUpperCase(),
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clampInteger(value, min, max) {
  const number = Math.floor(Number(value) || min);
  return Math.max(min, Math.min(max, number));
}
