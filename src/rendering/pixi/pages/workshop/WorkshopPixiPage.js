import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import {
  getHerbIconFrameName,
} from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
} from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import {
  getNotificationTone,
  isNotificationActive,
} from '../../../../pages/shared/notificationTone.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PixiInfoButton } from '../../primitives/PixiInfoButton.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  BaseRetainedPixiPage,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedPanel,
  RetainedProgressBar,
  applyTextTheme,
  createRetainedInputId,
  createText,
  finiteOr,
  normalizeRows,
  setText,
} from './RetainedPageKit.js';
import { WorkshopDialogPixi } from './WorkshopDialogPixi.js';

const WORKSHOP_DIALOGS = Object.freeze([
  Object.freeze({ id: 'summonInfo', title: 'summoning seeds' }),
  Object.freeze({ id: 'tasksInfo', title: "elara's request" }),
  Object.freeze({ id: 'bag', title: 'bag' }),
  Object.freeze({ id: 'stats', title: 'stats' }),
  Object.freeze({ id: 'inbox', title: 'inbox' }),
  Object.freeze({ id: 'alliance', title: 'trade alliance' }),
  Object.freeze({ id: 'leaderboard', title: 'leaderboard' }),
  Object.freeze({ id: 'discoveries', title: 'discoveries' }),
  Object.freeze({ id: 'personalTasks', title: 'quests' }),
  Object.freeze({ id: 'worldEvent', title: 'world event' }),
  Object.freeze({ id: 'worldChat', title: 'world chat' }),
]);

const DEFAULT_FEATURES = Object.freeze([
  Object.freeze({ id: 'alliance', label: 'alliance', side: 'left', row: 1 }),
  Object.freeze({ id: 'leaderboard', label: 'leaderboard', side: 'left', row: 2 }),
  Object.freeze({ id: 'discoveries', label: 'discoveries', side: 'right', row: 2 }),
  Object.freeze({ id: 'personalTasks', label: 'tasks', side: 'left', row: 3 }),
  Object.freeze({ id: 'worldEvent', label: 'event', side: 'right', row: 3 }),
]);

const WORKSHOP_FEATURE_PRESENTATIONS = Object.freeze({
  alliance: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopAlliance,
    clothAssetId: PIXI_ROOT_RUN_ASSETS.workshopAllianceCloth,
  }),
  leaderboard: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopLeaderboard,
    scale: 1.35,
  }),
  discoveries: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopDiscoveries,
  }),
  personalTasks: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopPersonalTasks,
  }),
  worldEvent: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopWorldEvent,
    mirrorOnRight: true,
  }),
});

const ALLIANCE_BANNER_TINTS = Object.freeze({
  red: '#8f2530',
  amber: '#82621f',
  green: '#2a713c',
  teal: '#247078',
  blue: '#315d99',
  violet: '#684791',
  magenta: '#8d3c71',
  brown: '#6d4d37',
  slate: '#525c70',
});

const SUMMON_EFFECT_DURATION_MS = 520;
const SIDE_CONTROLS_TASK_GAP = 8;
const SIDE_PANEL_FIRST_ROW_GAP = 25;
const SIDE_PANEL_ROW_GAP = 52.25;
const SUMMON_EFFECT_FRAMES = Object.freeze([
  Object.freeze({ progress: 0, alpha: 0.84, scale: 1 }),
  Object.freeze({ progress: 0.32, alpha: 1, scale: 1.045 }),
  Object.freeze({ progress: 0.62, alpha: 0.95, scale: 1.018 }),
  Object.freeze({ progress: 1, alpha: 1, scale: 1 }),
]);

export class WorkshopPixiPage extends BaseRetainedPixiPage {
  constructor({
    assetManager = null,
    semanticTargets = null,
    dialogRegistry = null,
    dialogLayer = null,
    inputRouter = null,
    textEntryService = null,
    actions = {},
    counters = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
  } = {}) {
    super({ pageId: 'workshop', semanticTargets, theme });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.textEntryService = textEntryService;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.actions = actions;
    this.currentActions = actions;
    this.dialogModels = {};

    this.tasks = new WorkshopTaskPanel({
      page: this,
      assetManager: this.assetManager,
      counters,
    });
    this.summon = new WorkshopSummonControl({
      page: this,
      assetManager: this.assetManager,
      requestFrame,
      cancelFrame,
      timeSource,
      reducedMotion,
    });
    this.bagButton = new WorkshopIconPanelAction({
      page: this,
      assetManager: this.assetManager,
      id: 'bag',
      label: 'bag',
      side: 'left',
      textureId: PIXI_ROOT_RUN_ASSETS.workshopBag,
      onActivate: () => this.openDialog('bag'),
    });
    this.inboxButton = new WorkshopIconPanelAction({
      page: this,
      assetManager: this.assetManager,
      id: 'inbox',
      label: 'inbox',
      side: 'right',
      textureId: PIXI_ROOT_RUN_ASSETS.workshopInbox,
      onActivate: () => this.openDialog('inbox'),
    });
    this.statsButton = new RetainedButton({
      assetManager: this.assetManager,
      label: 'stats',
      buttonLabel: 'workshop-stats',
      inputRouter: this.inputRouter,
      onActivate: () => this.openDialog('stats'),
      variant: 'yellow',
    });
    this.featureLayer = new Container({ label: 'workshop-feature-buttons' });
    this.content.addChild(
      this.tasks.root,
      this.summon.root,
      this.bagButton.root,
      this.inboxButton.root,
      this.statsButton.root,
      this.featureLayer,
    );

    this.featurePool = new WidgetPool({
      name: 'workshop feature button pool',
      counters,
      create: () =>
        new WorkshopFeatureButton({
          page: this,
          assetManager: this.assetManager,
        }),
      reset: (button) => button.reset(),
      dispose: (button) => button.destroy(),
      maxSize: 8,
    });
    this.features = new PooledCollection({
      name: 'workshop feature buttons',
      pool: this.featurePool,
      counters,
      keyOf: (feature) => feature.id,
      bind: (button, feature) => button.bind(feature),
      afterReconcile: (buttons) => this.orderFeatureButtons(buttons),
    });

    this.flyoutLayer = new Container({ label: 'workshop-flyouts' });
    this.content.addChild(this.flyoutLayer);
    this.flyoutPool = new WidgetPool({
      name: 'workshop flyout pool',
      counters,
      create: () => new WorkshopFlyout(),
      reset: (flyout) => flyout.reset(),
      dispose: (flyout) => flyout.destroy(),
      maxSize: 10,
    });
    this.flyouts = new PooledCollection({
      name: 'workshop flyouts',
      pool: this.flyoutPool,
      counters,
      keyOf: (flyout, index) => flyout.id ?? flyout.key ?? index,
      bind: (widget, flyout) => widget.bind(flyout),
      afterReconcile: (widgets) => this.orderFlyouts(widgets),
    });

    this.registerOwnedDialogs({ counters });
    this.features.reconcile(DEFAULT_FEATURES);
    this.applyTheme(theme);
    this.layoutPage(this.sourceWidth, this.sourceHeight);
  }

  registerOwnedDialogs({ counters }) {
    if (!this.dialogRegistry || !this.dialogLayer) {
      return;
    }

    for (const definition of WORKSHOP_DIALOGS) {
      const dialogId = `workshop.${definition.id}`;

      if (this.dialogRegistry.has(dialogId)) {
        continue;
      }

      this.dialogRegistry.register(
        dialogId,
        () =>
          new WorkshopDialogPixi({
            dialogId,
            parent: this.dialogLayer,
            assetManager: this.assetManager,
            semanticTargets: this.semanticTargets,
            inputRouter: this.inputRouter,
            textEntryService: this.textEntryService,
            counters,
            onClose: () => this.dialogRegistry.close(dialogId),
            theme: this.theme,
          }),
      );
    }
  }

  renderViewModel(viewModel) {
    const workshop = viewModel.workshop ?? viewModel;
    this.currentActions = viewModel.actions ?? workshop.actions ?? this.actions;
    this.dialogModels = workshop.dialogs ?? {};
    this.rebindOpenDialogs();
    this.tasks.bind(workshop.tasks ?? {});
    this.summon.bind(workshop.summon ?? {}, {
      summon: () =>
        workshop.summon?.onActivate?.() ??
        this.currentActions?.summonSeed?.(),
      info: () => this.openDialog('summonInfo'),
    });
    this.bagButton.setModel({
      label: 'bag',
      enabled: workshop.bag?.enabled !== false,
      visible: workshop.bag?.visible !== false,
      notification: workshop.bag?.notification === true,
      action: () => workshop.bag?.onActivate?.() ?? this.openDialog('bag'),
    });
    const providedFeatures = new Map(
      normalizeRows(workshop.features).map((feature) => [feature.id, feature]),
    );
    const inbox = workshop.inbox ?? providedFeatures.get('inbox') ?? {};
    this.inboxButton.setModel({
      label: inbox.label ?? 'inbox',
      enabled: inbox.enabled !== false,
      visible: inbox.visible !== false,
      notification: inbox.notification === true,
      notificationTone: inbox.notificationTone,
      action: () => inbox.onActivate?.() ?? this.openDialog('inbox'),
    });
    this.statsButton.setModel({
      label: 'stats',
      enabled: workshop.stats?.enabled !== false,
      notification: workshop.stats?.notification === true,
      action: () => workshop.stats?.onActivate?.() ?? this.openDialog('stats'),
    });

    const features = DEFAULT_FEATURES.map((defaults) => ({
      ...defaults,
      ...(providedFeatures.get(defaults.id) ?? {}),
    }));
    this.features.reconcile(features);
    this.flyouts.reconcile(normalizeRows(workshop.flyouts));
    this.layoutWorkshop();
  }

  openDialog(id, explicitModel = null) {
    const dialogId = id.startsWith('workshop.') ? id : `workshop.${id}`;
    const shortId = dialogId.slice('workshop.'.length);
    const definition = WORKSHOP_DIALOGS.find((entry) => entry.id === shortId);
    const model = explicitModel ?? this.dialogModels[shortId] ?? {
      title: definition?.title ?? shortId,
      rows: [],
    };
    const action = this.currentActions?.openDialog;

    if (action) {
      const handled = action(shortId, model);

      if (handled === true) {
        return true;
      }
    }

    if (!this.dialogRegistry?.has(dialogId)) {
      return false;
    }

    this.dialogRegistry.open(dialogId, model);
    return true;
  }

  rebindOpenDialogs() {
    for (const dialogId of this.dialogRegistry?.getOpenDialogIds?.() ?? []) {
      if (!dialogId.startsWith('workshop.')) {
        continue;
      }

      const shortId = dialogId.slice('workshop.'.length);
      const model = this.dialogModels[shortId];
      if (model) {
        this.dialogRegistry.open(dialogId, model);
      }
    }
  }

  orderFeatureButtons(buttons) {
    this.featureLayer.removeChildren();

    for (const button of buttons) {
      this.featureLayer.addChild(button.root);
    }
  }

  orderFlyouts(flyouts) {
    this.flyoutLayer.removeChildren();
    let y = 0;

    for (const flyout of flyouts) {
      this.flyoutLayer.addChild(flyout.root);
      flyout.root.position.set(
        (this.sourceWidth - flyout.text.width) / 2,
        y,
      );
      y += 18;
    }
  }

  applyThemeToChildren(theme) {
    this.tasks?.applyTheme(theme);
    this.summon?.applyTheme(theme);
    this.bagButton?.applyTheme(theme);
    this.inboxButton?.applyTheme(theme);
    this.statsButton?.applyTheme(theme);
    for (const feature of this.features?.getWidgets?.() ?? []) {
      feature.applyTheme(theme);
    }

    for (const flyout of this.flyouts?.getWidgets?.() ?? []) {
      flyout.applyTheme(theme);
    }
  }

  layoutPage() {
    this.layoutWorkshop();
  }

  activate() {
    super.activate();
    this.summon?.setActive(true);
  }

  deactivate() {
    this.summon?.setActive(false);
    super.deactivate();
  }

  layoutWorkshop() {
    if (!this.tasks) {
      return;
    }

    const width = this.sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge * 2;
    this.tasks.setBounds(
      RETAINED_PAGE_GEOMETRY.contentEdge,
      RETAINED_PAGE_GEOMETRY.contentTop,
      width,
    );
    this.summon.setBounds(this.sourceWidth / 2, this.sourceHeight * 0.595);
    const sideControlsTop =
      RETAINED_PAGE_GEOMETRY.contentTop +
      this.tasks.height +
      SIDE_CONTROLS_TASK_GAP;
    const sidePanelTop = sideControlsTop + SIDE_PANEL_FIRST_ROW_GAP;
    this.bagButton.setBounds(
      16,
      sidePanelTop + 3 * SIDE_PANEL_ROW_GAP,
    );
    this.inboxButton.setBounds(
      this.sourceWidth - 16 - 45.5,
      sidePanelTop,
    );
    this.statsButton.setBounds(
      this.sourceWidth - 116,
      sideControlsTop,
      100,
      22,
    );

    for (const feature of this.features.getWidgets()) {
      const top =
        sidePanelTop +
        (Math.max(1, feature.model.row) - 1) * SIDE_PANEL_ROW_GAP;
      const left =
        feature.model.side === 'right'
          ? this.sourceWidth - 16 - 45.5
          : 16;
      feature.setBounds(left, top, 45.5, 80.25);
    }

    this.flyoutLayer.position.set(0, RETAINED_PAGE_GEOMETRY.contentTop + 182);
    this.registerStaticTargets();
  }

  registerStaticTargets() {
    this.registerSemanticTarget({
      semanticId: 'workshop.bag',
      tutorialId: null,
      displayObject: this.bagButton.root,
      activate: () => this.bagButton.handleTap(),
    });
    this.registerSemanticTarget({
      semanticId: 'workshop.stats',
      tutorialId: null,
      displayObject: this.statsButton.root,
      activate: () => this.statsButton.handleTap(),
    });
    this.registerSemanticTarget({
      semanticId: 'workshop.inbox',
      tutorialId: null,
      displayObject: this.inboxButton.root,
      state: () => ({
        visible: this.inboxButton.visible,
        enabled: this.inboxButton.enabled,
        interactive: this.inboxButton.enabled,
      }),
      activate: () => this.inboxButton.handleTap(),
    });
  }

  destroyPage() {
    this.tasks?.destroy();
    this.summon?.destroy();
    this.bagButton?.destroy();
    this.inboxButton?.destroy();
    this.statsButton?.destroy();
    this.features?.destroy();
    this.featurePool?.destroy();
    this.flyouts?.destroy();
    this.flyoutPool?.destroy();
  }
}

class WorkshopTaskPanel {
  constructor({ page, assetManager, counters }) {
    this.page = page;
    this.panel = new RetainedPanel({
      assetManager,
      label: "elara's request",
      panelLabel: 'workshop-tasks',
    });
    this.root = this.panel.root;
    this.next = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.rewardsTitle = createText('rewards', RETAINED_TEXT_STYLES.bold);
    this.rewardsTitle.anchor.set(0.5, 0);
    this.rewards = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.pinButton = new RetainedButton({
      assetManager,
      label: 'pin',
      buttonLabel: 'workshop-task-pin',
      inputRouter: this.page.inputRouter,
      onActivate: () => this.model?.onTogglePinned?.(),
      variant: 'border-label',
    });
    this.expandButton = new RetainedButton({
      assetManager,
      label: 'collapse',
      buttonLabel: 'workshop-task-expand',
      inputRouter: this.page.inputRouter,
      onActivate: () => this.model?.onToggleExpanded?.(),
      variant: 'border-label',
    });
    this.panel.body.addChild(
      this.next,
      this.rewardsTitle,
      this.rewards,
      this.pinButton.root,
      this.expandButton.root,
    );
    this.rowPool = new WidgetPool({
      name: 'workshop task row pool',
      counters,
      create: () => new WorkshopTaskRow({ page, assetManager }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 12,
    });
    this.rows = new PooledCollection({
      name: 'workshop task rows',
      pool: this.rowPool,
      counters,
      keyOf: (task, index) => task.id ?? index,
      bind: (row, task) => row.bind(task),
      afterReconcile: (rows) => this.orderRows(rows),
    });
    this.handleTitleActivate = () =>
      this.model?.onInfo?.(this.model) ??
      this.page.openDialog('tasksInfo', this.model?.info ?? null);
    this.panel.title.eventMode = 'static';
    this.panel.title.cursor = 'pointer';
    this.titleInputRegistration = this.page.inputRouter?.registerPressTarget?.({
      id: createRetainedInputId('workshop-tasks-info'),
      displayObject: this.panel.title,
      enabled: () => Boolean(this.model),
      excludePageSwipe: true,
      onActivate: this.handleTitleActivate,
    }) ?? null;
    this.usesDirectTitleInput = !this.titleInputRegistration;

    if (this.usesDirectTitleInput) {
      this.panel.title.on('pointertap', this.handleTitleActivate);
    }

    this.height = 34;
  }

  bind(model) {
    this.model = model ?? {};
    this.panel.setTitle(this.model.title ?? "elara's request");
    setText(this.next, this.model.nextText ?? this.model.next ?? '');
    setText(
      this.rewards,
      normalizeRows(this.model.rewardLines ?? this.model.rewards).join('\n'),
    );
    this.rows.reconcile(normalizeRows(this.model.rows ?? this.model.tasks));
    const expanded = this.model.expanded !== false;
    this.rewardsTitle.visible = expanded && Boolean(this.rewards.text);
    this.rewards.visible = this.rewardsTitle.visible;
    const canToggle = this.model.canToggle === true;
    this.pinButton.root.visible =
      canToggle && this.model.showPin === true;
    this.expandButton.root.visible =
      canToggle || this.model.showToggle === true;
    this.expandButton.setModel({
      label: expanded ? 'collapse' : 'expand',
      action: () => this.model?.onToggleExpanded?.(),
    });
    this.pinButton.setModel({
      label: this.model.pinned ? 'unpin' : 'pin',
      action: () => this.model?.onTogglePinned?.(),
    });
    this.applyTheme(this.page.theme);
  }

  orderRows(rows) {
    this.panel.body.removeChildren();
    this.panel.body.addChild(
      this.next,
      this.rewardsTitle,
      this.rewards,
      this.pinButton.root,
      this.expandButton.root,
    );

    for (const row of rows) {
      this.panel.body.addChild(row.root);
    }
  }

  setBounds(x, y, width) {
    this.width = width;
    let contentY = 8;
    this.next.position.set(10, contentY);
    contentY += this.next.text ? this.next.height + 3 : 0;

    for (const row of this.rows.getWidgets()) {
      row.setBounds(10, contentY, width - 20);
      contentY += row.getPreferredHeight() + 4;
    }

    if (this.rewardsTitle.visible) {
      contentY += 4;
      this.rewardsTitle.position.set(width / 2, contentY);
      contentY += this.rewardsTitle.height + 2;
      this.rewards.position.set(10, contentY);
      contentY += this.rewards.height + 5;
    }

    this.height = Math.max(34, Math.ceil(contentY + 9));
    this.panel.setBounds(x, y, width, this.height);
    this.pinButton.setBounds(8, this.height - 7, 42, 14);
    this.expandButton.setBounds(width / 2 - 30, this.height - 7, 60, 14);
    this.page.registerSemanticTarget({
      semanticId: 'workshop.tasks',
      tutorialId: this.model?.tutorialId ?? 'workshop:tasks',
      displayObject: this.root,
      activate: () => this.model?.onToggleExpanded?.() ?? false,
    });
    this.page.registerSemanticTarget({
      semanticId: 'workshop.tasks.info',
      tutorialId: null,
      displayObject: this.panel.title,
      activate: this.handleTitleActivate,
    });
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    applyTextTheme(this.next, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: theme.muted,
      wordWrapWidth: 308,
    });
    applyTextTheme(this.rewardsTitle, theme, RETAINED_TEXT_STYLES.bold);
    applyTextTheme(this.rewards, theme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    this.pinButton.applyTheme(theme);
    this.expandButton.applyTheme(theme);

    for (const row of this.rows.getWidgets()) {
      row.applyTheme(theme);
    }
  }

  destroy() {
    this.titleInputRegistration?.unregister?.();
    this.titleInputRegistration = null;

    if (this.usesDirectTitleInput) {
      this.panel.title.off('pointertap', this.handleTitleActivate);
    }

    this.rows.destroy();
    this.rowPool.destroy();
    this.pinButton.destroy();
    this.expandButton.destroy();
    this.panel.destroy();
  }
}

class WorkshopTaskRow {
  constructor({ page, assetManager }) {
    this.page = page;
    this.assetManager = assetManager;
    this.root = new Container({ label: 'workshop-task-row' });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'workshop-task-row:icon';
    this.icon.anchor.set(0.5);
    this.icon.visible = false;
    this.iconOverlay = new Sprite(Texture.EMPTY);
    this.iconOverlay.label = 'workshop-task-row:icon-overlay';
    this.iconOverlay.anchor.set(0.5);
    this.iconOverlay.visible = false;
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.value = createText('', RETAINED_TEXT_STYLES.body);
    this.value.anchor.set(1, 0);
    this.action = new RetainedButton({
      assetManager,
      buttonLabel: 'workshop-task-action',
      inputRouter: this.page.inputRouter,
    });
    this.progress = new RetainedProgressBar({
      label: 'workshop-task-progress',
      tone: 'root',
    });
    this.root.addChild(
      this.icon,
      this.iconOverlay,
      this.label,
      this.value,
      this.action.root,
      this.progress.root,
    );
  }

  bind(model) {
    this.model = model;
    this.root.visible = true;
    setText(this.label, model.label ?? model.text ?? '');
    setText(
      this.value,
      model.value ??
        `${finiteOr(model.current, 0)}/${finiteOr(model.required, 0)}`,
    );
    const iconFrames = resolveTaskIconFrames(model);
    this.icon.texture =
      iconFrames.base && this.assetManager?.getAtlasTexture
        ? this.assetManager.getAtlasTexture(iconFrames.base) ?? Texture.EMPTY
        : Texture.EMPTY;
    this.iconOverlay.texture =
      iconFrames.overlay && this.assetManager?.getAtlasTexture
        ? this.assetManager.getAtlasTexture(iconFrames.overlay) ?? Texture.EMPTY
        : Texture.EMPTY;
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.iconOverlay.visible =
      this.icon.visible && this.iconOverlay.texture !== Texture.EMPTY;
    const hasAction = Boolean(model.actionLabel || model.onActivate);
    this.action.root.visible = hasAction;
    this.action.setModel({
      label: model.actionLabel ?? 'turn in',
      enabled: model.enabled !== false,
      notification: model.notification === true,
      action: () => model.onActivate?.(model),
    });
    this.progress.setProgress(
      finiteOr(
        model.progress,
        finiteOr(model.required, 0) > 0
          ? finiteOr(model.current, 0) / finiteOr(model.required, 1)
          : 0,
      ),
    );
    this.progress.root.visible = model.showProgress !== false;
    this.targetId = model.semanticId ?? `workshop.task.${model.id}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: hasAction ? this.action.root : this.root,
      state: () => ({
        enabled: model.enabled !== false,
        interactive: hasAction,
      }),
      activate: () => model.onActivate?.(model) ?? false,
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    const iconSize = 16;
    this.icon.position.set(iconSize / 2, 9);
    this.icon.width = iconSize;
    this.icon.height = iconSize;
    this.iconOverlay.position.set(iconSize / 2, 9 - iconSize * 0.035);
    this.iconOverlay.width = iconSize * 0.44;
    this.iconOverlay.height = iconSize * 0.44;
    this.iconOverlay.rotation = (6 * Math.PI) / 180;
    this.label.position.set(this.icon.visible ? iconSize + 3 : 0, 1);
    this.value.position.set(width - (this.action.root.visible ? 64 : 0), 1);
    this.action.setBounds(width - 58, 0, 58, 20);
    this.progress.setBounds(
      0,
      22,
      width,
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
  }

  getPreferredHeight() {
    return this.progress.root.visible ? 32 : 20;
  }

  applyTheme(theme) {
    const color = this.model?.disabled ? theme.disabled : theme.text;
    applyTextTheme(this.label, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      wordWrapWidth: 190,
    });
    applyTextTheme(this.value, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    this.action.applyTheme(theme);
    this.progress.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.icon.texture = Texture.EMPTY;
    this.icon.visible = false;
    this.iconOverlay.texture = Texture.EMPTY;
    this.iconOverlay.visible = false;
    this.iconOverlay.rotation = 0;
    this.root.visible = false;
  }

  destroy() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.action.destroy();
    this.progress.destroy();
    this.root.destroy({ children: true });
  }
}

class WorkshopSummonControl {
  constructor({
    page,
    assetManager,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
  }) {
    this.page = page;
    this.assetManager = assetManager;
    this.theme = page.theme;
    this.root = new Container({ label: 'workshop-summon' });
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    this.circle = new Sprite(Texture.EMPTY);
    this.circle.label = 'workshop-summon-circle';
    this.circle.anchor.set(0.5);
    this.plate = new RetainedPanel({
      assetManager,
      panelLabel: 'workshop-summon-label',
    });
    this.label = createText('summon seed', RETAINED_TEXT_STYLES.bold);
    this.label.anchor.set(0.5, 0);
    this.cost = createText('', RETAINED_TEXT_STYLES.tiny);
    this.cost.anchor.set(0.5, 0);
    this.info = new PixiInfoButton({
      assetManager,
      label: 'workshop-summon-info',
      inputRouter: this.page.inputRouter,
      action: () => this.actions?.info?.(),
    });
    this.notification = new PixiNotificationBadge();
    this.notification.root.label = 'workshop-summon-notification';
    this.plate.body.addChild(this.label, this.cost);
    this.root.addChild(this.circle, this.plate.root, this.info);
    this.pointerId = null;
    this.holdTriggered = false;
    this.holdTimer = null;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.active = false;
    this.effectFrame = 0;
    this.effectStart = 0;
    this.effectTick = (time) => this.tickSummonEffect(time);
    this.beginHold = (pointerId) => {
      if (!this.enabled || this.pointerId !== null) {
        return;
      }

      this.pointerId = pointerId;
      this.holdTriggered = false;
      this.scheduleHold();
    };
    this.handlePointerDown = (event) => {
      this.beginHold(event.pointerId);
    };
    this.handlePointerEnd = (event) => {
      if (event.pointerId === this.pointerId) {
        this.stopHold();
      }
    };
    this.handlePressChange = (pressed) => {
      if (pressed) {
        this.beginHold('router');
      } else {
        this.stopHold();
      }
    };
    this.handleTap = () => {
      if (this.enabled && !this.holdTriggered) {
        return this.activateSummon();
      }

      return false;
    };
    this.inputRegistration = this.page.inputRouter?.registerPressTarget?.({
      id: createRetainedInputId('workshop-summon'),
      displayObject: this.root,
      enabled: () => this.enabled,
      excludePageSwipe: true,
      onActivate: this.handleTap,
      onPressChange: this.handlePressChange,
    }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.root.on('pointerdown', this.handlePointerDown);
      this.root.on('pointerup', this.handlePointerEnd);
      this.root.on('pointerupoutside', this.handlePointerEnd);
      this.root.on('pointercancel', this.handlePointerEnd);
      this.root.on('pointertap', this.handleTap);
    }
  }

  bind(model, actions) {
    this.model = model;
    this.actions = actions;
    this.enabled = model.enabled ?? model.canSummon ?? true;
    setText(
      this.label,
      model.label ??
        (finiteOr(model.quantity, 1) > 1
          ? `summon x${finiteOr(model.quantity, 1)}`
          : 'summon seed'),
    );
    setText(this.cost, model.costLabel ?? `${finiteOr(model.cost, 0)} mana`);
    this.root.cursor = this.enabled ? 'pointer' : 'default';
    this.info.setModel({
      enabled: model.infoEnabled !== false,
      action: () => this.actions?.info?.(),
    });
    this.notification.bind('workshop.summon', {
      active: isNotificationActive(model.notification),
      tone: getNotificationTone(
        model.notification,
        model.notificationTone,
      ),
      parent: this.plate.root,
      bounds: {
        x: 0,
        y: 0,
        width: 96,
        height: 36,
      },
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(centerX, centerY) {
    this.root.position.set(centerX, centerY);
    this.root.hitArea = new Rectangle(-98, -60, 196, 100);
    this.circleBaseWidth = 196;
    this.circleBaseHeight = 196 * (592 / 1374);
    this.circle.position.set(0, -60 + this.circleBaseHeight / 2);
    this.setCircleEffectFrame({ alpha: this.enabled ? 1 : 0.38, scale: 1 });
    this.plate.setBounds(-48, -17, 96, 36);
    this.notification.root.position.set(96, 0);
    this.label.position.set(48, 3);
    this.cost.position.set(48, 18);
    this.info.setBounds(60, -50, 18, 18);
    this.page.registerSemanticTarget({
      semanticId: 'workshop.summon',
      tutorialId: this.model?.tutorialId ?? 'workshop:summonSeed',
      displayObject: this.plate.root,
      state: () => ({
        enabled: this.enabled,
        interactive: true,
      }),
      activate: () => this.activateSummon(),
    });
    this.page.registerSemanticTarget({
      semanticId: 'workshop.summon.info',
      tutorialId: null,
      displayObject: this.info,
      state: () => ({
        enabled: this.model?.infoEnabled !== false,
        interactive: true,
      }),
      activate: () => this.actions?.info?.(),
    });
  }

  applyTheme(theme) {
    this.theme = theme;
    this.plate.applyTheme(theme);
    applyTextTheme(this.label, theme, RETAINED_TEXT_STYLES.bold);
    applyTextTheme(this.cost, theme, {
      ...RETAINED_TEXT_STYLES.tiny,
      fill: theme.resourceColors?.mana ?? theme.text,
    });
    this.notification.applyTheme(theme);

    if (
      this.assetManager?.getAtlasTexture &&
      this.circle.texture === Texture.EMPTY
    ) {
      this.circle.texture = this.assetManager.getAtlasTexture('ui:summonCircle');
    }

    this.circle.alpha = this.enabled ? 1 : 0.38;
    this.label.alpha = this.enabled ? 1 : 0.55;
    this.cost.alpha = this.enabled ? 1 : 0.55;
  }

  scheduleHold() {
    this.clearTimer();
    this.holdTimer = globalThis.setTimeout(() => {
      this.holdTimer = null;

      if (this.pointerId === null || !this.enabled) {
        return;
      }

      this.holdTriggered = true;
      const shouldContinue = this.activateSummon();

      if (shouldContinue !== false) {
        this.scheduleHold();
      } else {
        this.stopHold();
      }
    }, 100);
  }

  stopHold() {
    this.clearTimer();
    this.pointerId = null;
  }

  clearTimer() {
    if (this.holdTimer !== null) {
      globalThis.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  setActive(active) {
    this.active = Boolean(active);
    if (!this.active) {
      this.stopSummonEffect();
    }
  }

  activateSummon() {
    const result = this.actions?.summon?.();
    const succeeded = result !== false && result?.ok !== false;
    if (succeeded) {
      this.playSummonEffect();
    }
    return succeeded;
  }

  playSummonEffect() {
    this.stopSummonEffect();
    if (!this.active || this.reducedMotion()) {
      this.setCircleEffectFrame({
        alpha: this.enabled ? 1 : 0.38,
        scale: 1,
      });
      return;
    }
    this.effectStart = this.timeSource();
    this.tickSummonEffect(this.effectStart);
  }

  tickSummonEffect(time) {
    const progress = Math.max(
      0,
      Math.min(1, (Number(time) - this.effectStart) / SUMMON_EFFECT_DURATION_MS),
    );
    this.setCircleEffectFrame(interpolateSummonEffect(progress));
    this.effectFrame = 0;
    if (progress < 1 && this.active) {
      this.effectFrame = this.requestFrame(this.effectTick);
    }
  }

  setCircleEffectFrame({ alpha, scale }) {
    const enabledAlpha = this.enabled ? 1 : 0.38;
    this.circle.alpha = Math.min(enabledAlpha, alpha);
    this.circle.width = (this.circleBaseWidth ?? 196) * scale;
    this.circle.height =
      (this.circleBaseHeight ?? 196 * (592 / 1374)) * scale;
  }

  stopSummonEffect() {
    if (this.effectFrame) {
      this.cancelFrame(this.effectFrame);
      this.effectFrame = 0;
    }
    this.effectStart = 0;
    this.setCircleEffectFrame({
      alpha: this.enabled ? 1 : 0.38,
      scale: 1,
    });
  }

  destroy() {
    this.stopHold();
    this.stopSummonEffect();
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.root.off('pointerdown', this.handlePointerDown);
      this.root.off('pointerup', this.handlePointerEnd);
      this.root.off('pointerupoutside', this.handlePointerEnd);
      this.root.off('pointercancel', this.handlePointerEnd);
      this.root.off('pointertap', this.handleTap);
    }

    this.notification.destroy();
    this.info.destroy();
    this.plate.destroy();
    this.root.destroy({ children: true });
  }
}

class WorkshopIconPanelAction {
  constructor({
    page,
    assetManager,
    id,
    label,
    side,
    textureId,
    onActivate,
  }) {
    this.page = page;
    this.assetManager = assetManager;
    this.id = id;
    this.side = side === 'right' ? 'right' : 'left';
    this.textureId = textureId;
    this.activation = onActivate;
    this.enabled = true;
    this.visible = true;
    this.root = new Container({ label: `workshop-${id}-icon-panel-action` });
    this.iconFrame = new Container({
      label: `workshop-${id}-icon-panel-action:icon-frame`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `workshop-${id}-icon-panel-action:icon`;
    this.icon.anchor.set(0.5);
    this.label = createText(label, {
      fontSize: 8.8,
      lineHeight: 11.2,
    });
    this.label.anchor.set(this.side === 'right' ? 1 : 0, 0);
    this.notification = new PixiNotificationBadge();
    this.notification.root.label =
      `workshop-${id}-icon-panel-action:notification`;
    this.iconFrame.addChild(this.icon);
    this.root.addChild(this.iconFrame, this.label);
    this.handleTap = () => {
      if (!this.enabled || !this.visible) {
        return false;
      }

      return this.activation?.() ?? true;
    };
    this.handlePressChange = (pressed) => this.setPressed(pressed);
    this.inputRegistration =
      this.page.inputRouter?.registerPressTarget?.({
        id: createRetainedInputId(`workshop-${id}-icon-panel-action`),
        displayObject: this.root,
        enabled: () => this.enabled && this.visible,
        excludePageSwipe: true,
        onActivate: this.handleTap,
        onPressChange: this.handlePressChange,
      }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.root.on('pointertap', this.handleTap);
      this.root.on('pointerdown', () => this.setPressed(true));
      this.root.on('pointerup', () => this.setPressed(false));
      this.root.on('pointerupoutside', () => this.setPressed(false));
      this.root.on('pointercancel', () => this.setPressed(false));
    }

    this.resolveTexture();
    this.layoutVisual();
    this.applyTheme(this.page.theme);
  }

  setModel({
    label = this.id,
    enabled = true,
    visible = true,
    notification = false,
    notificationTone = null,
    action = null,
  } = {}) {
    this.activation = typeof action === 'function' ? action : null;
    this.enabled = enabled !== false;
    this.visible = visible !== false;
    this.root.visible = this.visible;
    this.root.renderable = this.visible;
    this.root.eventMode = this.enabled && this.visible ? 'static' : 'none';
    this.root.cursor = this.enabled && this.visible ? 'pointer' : 'default';
    setText(this.label, label);
    this.icon.alpha = this.enabled ? 1 : 0.55;
    this.label.alpha = this.enabled ? 1 : 0.55;
    this.notification.bind(`workshop.${this.id}`, {
      active: isNotificationActive(notification),
      tone: getNotificationTone(notification, notificationTone),
      parent: this.root,
      bounds: {
        x: 0,
        y: 12,
        width: 45.5,
        height: 68.25,
      },
    });
    this.layoutVisual();
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 12, 45.5, 68.25);
  }

  setPressed(pressed) {
    const active = Boolean(pressed) && this.enabled;
    this.iconFrame.scale.set(active ? 0.965 : 1);
    this.iconFrame.y = this.iconFrameBaseY + (active ? 1 : 0);
    this.label.y = this.labelBaseY + (active ? 1 : 0);
  }

  resolveTexture() {
    if (!this.assetManager?.getTexture) {
      return;
    }

    this.icon.texture =
      this.assetManager.getTexture(this.textureId) ?? Texture.EMPTY;
  }

  layoutVisual() {
    const frameWidth = 45.5;
    const frameHeight = 59.15;
    const frameLeft = this.side === 'right' ? 10 : -10;
    const frameTop = 22;
    const textureWidth = Math.max(
      1,
      Number(this.icon.texture?.orig?.width ?? this.icon.texture?.width) || 1,
    );
    const textureHeight = Math.max(
      1,
      Number(this.icon.texture?.orig?.height ?? this.icon.texture?.height) || 1,
    );
    const fit = Math.min(frameWidth / textureWidth, frameHeight / textureHeight);
    this.icon.width = textureWidth * fit;
    this.icon.height = textureHeight * fit;
    this.icon.position.set(frameWidth / 2, frameHeight / 2);
    this.iconFrame.pivot.set(frameWidth / 2, frameHeight * 0.78);
    this.iconFrame.position.set(
      frameLeft + frameWidth / 2,
      frameTop + frameHeight * 0.78,
    );
    this.iconFrameBaseY = this.iconFrame.y;
    this.label.position.set(
      this.side === 'right' ? 45.5 : 0,
      80.25 - 3.9 - 11.2,
    );
    this.labelBaseY = this.label.y;
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      fontSize: 8.8,
      lineHeight: 11.2,
      fill: this.enabled ? theme.text : theme.disabled,
    });
    this.label.style.stroke = {
      color: theme.surface,
      width: 2,
    };
    this.notification.applyTheme(theme);
  }

  destroy() {
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.root.off('pointertap', this.handleTap);
    }

    this.notification.destroy();
    this.root.destroy({ children: true });
  }
}

class WorkshopFeatureButton {
  constructor({ page, assetManager }) {
    this.page = page;
    this.assetManager = assetManager;
    this.root = new Container({
      label: 'workshop-feature-button',
    });
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    this.iconFrame = new Container({
      label: 'workshop-feature-button:icon-frame',
    });
    this.cloth = new Sprite(Texture.EMPTY);
    this.cloth.label = 'workshop-feature-button:cloth';
    this.cloth.anchor.set(0.5);
    this.cloth.visible = false;
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'workshop-feature-button:icon';
    this.icon.anchor.set(0.5);
    this.label = createText('', {
      fontSize: 8.8,
      lineHeight: 11.2,
    });
    this.timer = createText('', {
      fontSize: 7.15,
      lineHeight: 9.1,
    });
    this.notification = new PixiNotificationBadge();
    this.notification.root.label = 'workshop-feature-button:notification';
    // The DOM reference paints the alliance-color cloth mask over the
    // illustrated banner base. Keep that order here or the opaque base hides
    // the selected alliance tint entirely.
    this.iconFrame.addChild(this.icon, this.cloth);
    this.root.addChild(this.iconFrame, this.label, this.timer);
    this.handleTap = () => {
      if (this.model?.enabled === false) {
        return false;
      }

      return this.model?.onActivate?.() ??
        this.page.openDialog(this.model.id, this.model.dialog);
    };
    this.handlePressChange = (pressed) => this.setPressed(pressed);
    this.handlePointerDown = () => this.setPressed(true);
    this.handlePointerUp = () => this.setPressed(false);
    this.inputRegistration = this.page.inputRouter?.registerPressTarget?.({
      id: createRetainedInputId('workshop-feature'),
      displayObject: this.root,
      enabled: () =>
        Boolean(this.model) &&
        this.model.visible !== false &&
        this.model.enabled !== false,
      excludePageSwipe: true,
      onActivate: this.handleTap,
      onPressChange: this.handlePressChange,
    }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.root.on('pointertap', this.handleTap);
      this.root.on('pointerdown', this.handlePointerDown);
      this.root.on('pointerup', this.handlePointerUp);
      this.root.on('pointerupoutside', this.handlePointerUp);
      this.root.on('pointercancel', this.handlePointerUp);
    }
  }

  bind(model) {
    this.model = model;
    this.root.visible = model.visible !== false;
    this.root.renderable = this.root.visible;
    this.root.eventMode = model.enabled === false ? 'none' : 'static';
    this.root.cursor = model.enabled === false ? 'default' : 'pointer';
    this.side = model.side === 'right' ? 'right' : 'left';
    this.label.anchor.set(this.side === 'right' ? 1 : 0, 0);
    this.timer.anchor.set(this.side === 'right' ? 1 : 0, 0);
    setText(this.label, model.label ?? model.id);
    setText(this.timer, model.timer ?? '');
    this.timer.visible = this.timer.text.length > 0;
    this.resolvePresentation();
    this.layoutVisual();
    this.setPressed(false);
    this.notification.bind(`workshop.feature.${model.id}`, {
      active: isNotificationActive(model.notification),
      tone: getNotificationTone(model.notification, model.notificationTone),
      parent: this.root,
      bounds: {
        x: 0,
        y: 22,
        width: 45.5,
        height: 59.15,
      },
    });

    this.targetId = `workshop.feature.${model.id}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: this.root,
      state: () => ({
        visible:
          model.visible !== false &&
          this.root.worldVisible !== false,
        enabled: model.enabled !== false,
        interactive: model.enabled !== false,
      }),
      activate: this.handleTap,
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 12, width, height - 12);
    this.layoutVisual();
  }

  resolvePresentation() {
    const presentation =
      WORKSHOP_FEATURE_PRESENTATIONS[this.model?.id] ?? {};
    const assetId = this.model?.assetId ?? presentation.assetId;
    const clothAssetId =
      this.model?.clothAssetId ?? presentation.clothAssetId;
    this.presentation = presentation;
    this.icon.texture =
      this.model?.iconFrame && this.assetManager?.getAtlasTexture
        ? this.assetManager.getAtlasTexture(this.model.iconFrame) ?? Texture.EMPTY
        : assetId && this.assetManager?.getTexture
          ? this.assetManager.getTexture(assetId) ?? Texture.EMPTY
          : Texture.EMPTY;
    this.cloth.texture =
      clothAssetId && this.assetManager?.getTexture
        ? this.assetManager.getTexture(clothAssetId) ?? Texture.EMPTY
        : Texture.EMPTY;
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.cloth.visible = this.cloth.texture !== Texture.EMPTY;
  }

  layoutVisual() {
    const frameWidth = 45.5;
    const frameHeight = 59.15;
    const frameLeft = this.side === 'right' ? 10 : -10;
    const frameTop = 22;
    layoutContainedSprite(this.icon, frameWidth, frameHeight, {
      scale: this.presentation?.scale ?? 1,
      mirrored:
        this.side === 'right' && this.presentation?.mirrorOnRight === true,
    });
    layoutContainedSprite(this.cloth, frameWidth, frameHeight);
    this.iconFrame.pivot.set(frameWidth / 2, frameHeight * 0.78);
    this.iconFrame.position.set(
      frameLeft + frameWidth / 2,
      frameTop + frameHeight * 0.78,
    );
    this.iconFrameBaseY = this.iconFrame.y;
    const textX = this.side === 'right' ? 45.5 : 0;
    this.label.position.set(textX, 80.25 - 3.9 - 11.2);
    this.labelBaseY = this.label.y;
    this.timer.position.set(textX, 82);
    this.timerBaseY = this.timer.y;
  }

  setPressed(pressed) {
    const active = Boolean(pressed) && this.model?.enabled !== false;
    this.iconFrame.scale.set(active ? 0.965 : 1);
    this.iconFrame.y = this.iconFrameBaseY + (active ? 1 : 0);
    this.label.y = this.labelBaseY + (active ? 1 : 0);
    this.timer.y = this.timerBaseY + (active ? 1 : 0);
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      fontSize: 8.8,
      lineHeight: 11.2,
      fill: this.model?.enabled === false ? theme.disabled : theme.text,
    });
    this.label.style.stroke = {
      color: theme.surface,
      width: 2,
    };
    applyTextTheme(this.timer, theme, {
      fontSize: 7.15,
      lineHeight: 9.1,
      fill: theme.muted,
    });
    this.timer.style.stroke = {
      color: theme.surface,
      width: 2,
    };
    this.cloth.tint =
      ALLIANCE_BANNER_TINTS[this.model?.allianceTagColor] ?? theme.text;
    this.icon.alpha = this.model?.enabled === false ? 0.55 : 1;
    this.cloth.alpha = this.icon.alpha;
    this.notification.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.presentation = null;
    this.setPressed(false);
    this.icon.texture = Texture.EMPTY;
    this.cloth.texture = Texture.EMPTY;
    this.notification.reset();
    this.root.visible = false;
    this.root.eventMode = 'none';
  }

  destroy() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.root.off('pointertap', this.handleTap);
      this.root.off('pointerdown', this.handlePointerDown);
      this.root.off('pointerup', this.handlePointerUp);
      this.root.off('pointerupoutside', this.handlePointerUp);
      this.root.off('pointercancel', this.handlePointerUp);
    }

    this.notification.destroy();
    this.root.destroy({ children: true });
  }
}

class WorkshopFlyout {
  constructor() {
    this.root = new Container({ label: 'workshop-flyout' });
    this.text = createText('', RETAINED_TEXT_STYLES.bold);
    this.root.addChild(this.text);
  }

  bind(model) {
    this.model = model;
    this.root.visible = true;
    setText(this.text, model.message ?? model.text ?? '');
  }

  applyTheme(theme) {
    applyTextTheme(this.text, theme, RETAINED_TEXT_STYLES.bold);
  }

  reset() {
    this.root.visible = false;
    this.model = null;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function resolveTaskIconFrames(model = {}) {
  const kind = String(model.itemKind ?? '').trim().toLowerCase();
  const key = model.itemKey ?? null;
  if (kind === 'seed') {
    return {
      base: getSeedIconFrameName(key),
      overlay: getSeedPackItemFrameName(model),
    };
  }
  if (kind === 'herb') {
    return { base: getHerbIconFrameName(key), overlay: null };
  }
  if (kind === 'potion') {
    return { base: getPotionIconFrameName(key), overlay: null };
  }
  return { base: null, overlay: null };
}

function layoutContainedSprite(
  sprite,
  frameWidth,
  frameHeight,
  { scale = 1, mirrored = false } = {},
) {
  const textureWidth = Math.max(
    1,
    Number(sprite.texture?.orig?.width ?? sprite.texture?.width) || 1,
  );
  const textureHeight = Math.max(
    1,
    Number(sprite.texture?.orig?.height ?? sprite.texture?.height) || 1,
  );
  const fit =
    Math.min(frameWidth / textureWidth, frameHeight / textureHeight) *
    scale;
  sprite.width = textureWidth * fit;
  sprite.height = textureHeight * fit;
  if (mirrored) {
    sprite.scale.x = -Math.abs(sprite.scale.x);
  }
  sprite.position.set(frameWidth / 2, frameHeight / 2);
}

function interpolateSummonEffect(progress) {
  for (let index = 1; index < SUMMON_EFFECT_FRAMES.length; index += 1) {
    const next = SUMMON_EFFECT_FRAMES[index];
    if (progress > next.progress) {
      continue;
    }
    const previous = SUMMON_EFFECT_FRAMES[index - 1];
    const segment =
      (progress - previous.progress) /
      Math.max(0.0001, next.progress - previous.progress);
    return {
      alpha: previous.alpha + (next.alpha - previous.alpha) * segment,
      scale: previous.scale + (next.scale - previous.scale) * segment,
    };
  }
  return SUMMON_EFFECT_FRAMES.at(-1);
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(defaultTimeSource()), 16);
}

function defaultCancelFrame(frame) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frame);
    return;
  }
  globalThis.clearTimeout(frame);
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}
