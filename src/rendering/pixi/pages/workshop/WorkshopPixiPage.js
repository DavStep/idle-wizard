import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import {
  getNotificationTone,
  isNotificationActive,
} from '../../../../pages/shared/notificationTone.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { ClickableWidget } from '../../primitives/ClickableWidget.js';
import { AllianceFlagWidget } from '../../primitives/AllianceFlagWidget.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../primitives/PixiInfoButton.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { normalizePixiTextStroke } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  ShopDialogPixi,
  WORKSHOP_SUMMON_INFO_DIALOG_ID,
  WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID,
} from '../shop/ShopDialogPixi.js';
import { MarketTitleRibbon } from '../shop/MarketTitleRibbon.js';
import {
  AMBIENT_FIREFLY_COUNT,
  AmbientFireflyLayer,
} from '../shared/AmbientFireflyLayer.js';
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
import {
  QUEST_REQUEST_BOX_BOINK_DURATION_MS,
  QUEST_REQUEST_SHINE_DURATION_MS,
} from '../../managers/QuestCompletionMotionCoordinator.js';

const WORKSHOP_DIALOGS = Object.freeze([
  Object.freeze({ id: 'summonInfo', title: 'Summoning Seeds' }),
  Object.freeze({ id: 'bag', title: 'bag' }),
  Object.freeze({ id: 'stats', title: 'stats' }),
  Object.freeze({ id: 'inbox', title: 'inbox' }),
  Object.freeze({ id: 'alliance', title: 'trade alliance' }),
  Object.freeze({ id: 'leaderboard', title: 'leaderboard' }),
  Object.freeze({ id: 'discoveries', title: 'Discoveries' }),
  Object.freeze({ id: 'personalTasks', title: 'Daily Tasks' }),
  Object.freeze({ id: 'worldEvent', title: 'World Event' }),
  Object.freeze({ id: 'worldEventDonate', title: 'Donate' }),
  Object.freeze({ id: 'worldChat', title: 'World Chat' }),
]);

const DEFAULT_FEATURES = Object.freeze([
  Object.freeze({
    id: 'alliance',
    label: 'Alliance',
    side: 'left',
    weight: 10,
  }),
  Object.freeze({
    id: 'leaderboard',
    label: 'Leaderboard',
    side: 'left',
    weight: 20,
  }),
  Object.freeze({
    id: 'discoveries',
    label: 'Discoveries',
    side: 'right',
    weight: 20,
  }),
  Object.freeze({
    id: 'personalTasks',
    label: 'Tasks',
    side: 'left',
    weight: 30,
  }),
  Object.freeze({
    id: 'prestige',
    label: 'Prestige',
    side: 'left',
    weight: 35,
    visible: false,
  }),
  Object.freeze({
    id: 'worldEvent',
    label: 'Event',
    side: 'right',
    weight: 30,
  }),
  Object.freeze({
    id: 'guild',
    label: 'Guild',
    side: 'right',
    weight: 40,
  }),
]);

const WORKSHOP_FLYOUT_VISUALS = Object.freeze({
  backgroundColor: 0x000000,
  backgroundAlpha: 0.62,
  height: 24,
  horizontalPadding: 8,
  radius: 8,
  textStyle: Object.freeze({
    ...RETAINED_TEXT_STYLES.bold,
    fill: '#ffffff',
    stroke: Object.freeze({
      color: '#0a0a0a',
      width: 2,
      join: 'round',
    }),
  }),
});

const WORKSHOP_FEATURE_PRESENTATIONS = Object.freeze({
  alliance: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopAlliance,
  }),
  leaderboard: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopLeaderboard,
  }),
  discoveries: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopDiscoveries,
  }),
  personalTasks: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopPersonalTasks,
  }),
  prestige: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopPrestige,
  }),
  worldEvent: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopWorldEvent,
  }),
  guild: Object.freeze({
    assetId: PIXI_ROOT_RUN_ASSETS.workshopAlliance,
  }),
});

const SUMMON_EFFECT_DURATION_MS = 520;
const SUMMON_HOLD_REPEAT_MS = 100;
const SUMMON_BUTTON_WIDTH = 120;
const SUMMON_BUTTON_HEIGHT = 52;
const SUMMON_BUTTON_UP_OFFSET = 4;
const SUMMON_CHAT_GAP = 128;
export const WORKSHOP_WINDOW_ASSET_ID =
  'source:assets/rooms/workshop/workshop-window.png';
export const WORKSHOP_WINDOW_GEOMETRY = Object.freeze({
  top: 172,
  width: 150,
  height: 300,
  alpha: 0.86,
});
export const WORKSHOP_FIREFLY_COUNT = AMBIENT_FIREFLY_COUNT;
const WORKSHOP_FIREFLY_FIELD = Object.freeze({
  top: 166,
  bottomInset: 188,
  maxBottom: 610,
});
export const ROOT_RUN_SIDE_ACTION_GEOMETRY = Object.freeze({
  taskGap: 18,
  rowPitch: 62,
  stageEdge: 10,
  width: 50,
  height: 60,
  iconSize: 50,
  iconScale: 0.72,
  iconEdgeNudge: 2,
  iconLabelGap: -10,
  labelFontSize: 13.5,
  labelLineHeight: 16.5,
  labelMaxWidth: 58,
  timerFontSize: 6.75,
  timerLineHeight: 8.25,
});
const SIDE_CONTROLS_TASK_GAP = ROOT_RUN_SIDE_ACTION_GEOMETRY.taskGap;
const SIDE_PANEL_ROW_GAP = ROOT_RUN_SIDE_ACTION_GEOMETRY.rowPitch;
const SIDE_PANEL_EDGE = ROOT_RUN_SIDE_ACTION_GEOMETRY.stageEdge;
const SIDE_PANEL_ICON_WIDTH = ROOT_RUN_SIDE_ACTION_GEOMETRY.width;
const SIDE_PANEL_ICON_HEIGHT = ROOT_RUN_SIDE_ACTION_GEOMETRY.height;
const SIDE_PANEL_ART_HEIGHT = ROOT_RUN_SIDE_ACTION_GEOMETRY.iconSize;
const SIDE_PANEL_ART_TOP = 0;
const SIDE_PANEL_HIT_HEIGHT = SIDE_PANEL_ICON_HEIGHT;
const SIDE_PANEL_ART_EDGE_OFFSET = 0;
const SIDE_PANEL_ART_BOUNDS = Object.freeze({
  left: Object.freeze({
    x: -SIDE_PANEL_ART_EDGE_OFFSET,
    y: SIDE_PANEL_ART_TOP,
    width: SIDE_PANEL_ICON_WIDTH,
    height: SIDE_PANEL_ART_HEIGHT,
  }),
  right: Object.freeze({
    x: SIDE_PANEL_ART_EDGE_OFFSET,
    y: SIDE_PANEL_ART_TOP,
    width: SIDE_PANEL_ICON_WIDTH,
    height: SIDE_PANEL_ART_HEIGHT,
  }),
});
const SIDE_PANEL_ENTER_DURATION_MS = 200;
const SIDE_PANEL_EXIT_DURATION_MS = 150;
const SIDE_PANEL_MOVE_DURATION_MS = 180;
const SIDE_PANEL_ENTER_OFFSET = 10;
const SIDE_PANEL_ENTER_SCALE = 0.96;
const SIDE_PANEL_STAGGER_MS = 16;
const WORKSHOP_REQUEST_TEXT_FILL = '#634934';
const WORKSHOP_REQUEST_TITLE_FILL = '#ffffff';
const WORKSHOP_REQUEST_TITLE_STROKE = '#0a0a0a';
const WORKSHOP_REQUEST_ROW_TEXT_STYLE = Object.freeze({
  ...RETAINED_TEXT_STYLES.body,
  fontSize: 16,
  lineHeight: 19,
});
const WORKSHOP_TASK_ICON_SIZE = 32;
const WORKSHOP_TASK_ROW_TEXT_TOP = 5;
const WORKSHOP_TASK_PROGRESS_GAP = 6;
const WORKSHOP_TASK_DEFAULT_PROGRESS_TOP =
  WORKSHOP_TASK_ICON_SIZE + WORKSHOP_TASK_PROGRESS_GAP;
const WORKSHOP_TASK_DEFAULT_ROW_HEIGHT =
  WORKSHOP_TASK_DEFAULT_PROGRESS_TOP + PIXI_UI_GEOMETRY.progressTotalHeight;
const WORKSHOP_REQUEST_TITLE_RIBBON_WIDTH = 300;
const WORKSHOP_REQUEST_TITLE_RIBBON_Y = -18;
const WORKSHOP_REQUEST_CONTENT_TOP = 42;
const WORKSHOP_SIDE_LABEL_FILL = '#ffffff';
const WORKSHOP_SIDE_LABEL_STROKE = '#0a0a0a';
const REQUEST_PROGRESS_UPDATE_DURATION_MS = 220;
const REQUEST_PROGRESS_SHINE_ALPHA = 0.5;
const REQUEST_PROGRESS_SHINE_HEIGHT_SCALE = 2.4;
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
    ambientRequestFrame = defaultRequestFrame,
    ambientCancelFrame = defaultCancelFrame,
    ambientTimeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    isUnlockAnimationBlocked = null,
    questCompletionMotionCoordinator = null,
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
    this.hasObservedAutoSummonUnlock = false;
    this.wasAutoSummonUnlocked = false;
    this.pendingAutoSummonUnlockReveal = false;
    this.hasBoundSideControls = false;
    this.sideControlMotionStates = new Map();
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function' ? reducedMotion : () => Boolean(reducedMotion);
    this.isUnlockAnimationBlocked =
      typeof isUnlockAnimationBlocked === 'function'
        ? isUnlockAnimationBlocked
        : () =>
            this.dialogRegistry?.isOpen?.('global.announcement') === true;
    this.questCompletionMotionCoordinator =
      questCompletionMotionCoordinator;

    this.workshopWindow = new Sprite({
      texture:
        this.assetManager?.getTexture?.(WORKSHOP_WINDOW_ASSET_ID) ?? Texture.EMPTY,
      label: 'workshop-window',
    });
    this.workshopWindow.anchor.set(0.5, 0);
    this.workshopWindow.alpha = WORKSHOP_WINDOW_GEOMETRY.alpha;
    this.workshopWindow.eventMode = 'none';
    this.fireflies = new AmbientFireflyLayer({
      label: 'workshop',
      field: WORKSHOP_FIREFLY_FIELD,
      requestFrame: ambientRequestFrame,
      cancelFrame: ambientCancelFrame,
      timeSource: ambientTimeSource,
      reducedMotion: this.reducedMotion,
    });
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
      label: 'Bag',
      side: 'left',
      weight: 40,
      textureId: PIXI_ROOT_RUN_ASSETS.workshopBag,
      onActivate: () => this.openDialog('bag'),
    });
    this.inboxButton = new WorkshopIconPanelAction({
      page: this,
      assetManager: this.assetManager,
      id: 'inbox',
      label: 'Inbox',
      side: 'right',
      weight: 10,
      textureId: PIXI_ROOT_RUN_ASSETS.workshopInbox,
      onActivate: () => this.openDialog('inbox'),
    });
    this.statsButton = new WorkshopIconPanelAction({
      page: this,
      assetManager: this.assetManager,
      id: 'stats',
      label: 'Stats',
      side: 'right',
      weight: 0,
      textureId: PIXI_ROOT_RUN_ASSETS.workshopStats,
      onActivate: () => this.openDialog('stats'),
    });
    this.featureLayer = new Container({ label: 'workshop-feature-buttons' });
    this.content.addChild(
      this.workshopWindow,
      this.fireflies.root,
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

      this.dialogRegistry.register(dialogId, () =>
        dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID ||
        dialogId === WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID
          ? new ShopDialogPixi({
              dialogId,
              parent: this.dialogLayer,
              assetManager: this.assetManager,
              semanticRegistry: this.semanticTargets,
              inputRouter: this.inputRouter,
              textEntryService: this.textEntryService,
              counters,
              onClose: () => this.dialogRegistry.close(dialogId),
              theme: this.theme,
              requestFrame: this.requestFrame,
              cancelFrame: this.cancelFrame,
              timeSource: this.timeSource,
              reducedMotion: this.reducedMotion,
            })
          : new WorkshopDialogPixi({
              dialogId,
              parent: this.dialogLayer,
              assetManager: this.assetManager,
              semanticTargets: this.semanticTargets,
              inputRouter: this.inputRouter,
              textEntryService: this.textEntryService,
              counters,
              onClose: () => this.dialogRegistry.close(dialogId),
              theme: this.theme,
              requestFrame: this.requestFrame,
              cancelFrame: this.cancelFrame,
              timeSource: this.timeSource,
              reducedMotion: this.reducedMotion,
            }),
      );
    }
  }

  renderViewModel(viewModel) {
    const workshop = viewModel.workshop ?? viewModel;
    this.currentActions = viewModel.actions ?? workshop.actions ?? this.actions;
    this.observeAutoSummonUnlock(workshop.dialogs?.summonInfo);
    this.dialogModels = workshop.dialogs ?? {};
    this.rebindOpenDialogs();
    this.tasks.bind(workshop.tasks ?? {});
    this.summon.bind(workshop.summon ?? {}, {
      summon: () => workshop.summon?.onActivate?.() ?? this.currentActions?.summonSeed?.(),
      info: () => this.openDialog('summonInfo'),
    });
    this.bagButton.setModel({
      label: 'Bag',
      side: workshop.bag?.side ?? 'left',
      weight: workshop.bag?.weight ?? 40,
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
      label: inbox.label ?? 'Inbox',
      side: inbox.side ?? 'right',
      weight: inbox.weight ?? 10,
      enabled: inbox.enabled !== false,
      visible: inbox.visible !== false,
      notification: inbox.notification === true,
      notificationTone: inbox.notificationTone,
      action: () => inbox.onActivate?.() ?? this.openDialog('inbox'),
    });
    this.statsButton.setModel({
      label: 'Stats',
      side: workshop.stats?.side ?? 'right',
      weight: workshop.stats?.weight ?? 0,
      enabled: workshop.stats?.enabled !== false,
      visible: workshop.stats?.visible !== false,
      notification: workshop.stats?.notification === true,
      action: () => workshop.stats?.onActivate?.() ?? this.openDialog('stats'),
    });

    const features = DEFAULT_FEATURES.map((defaults) => ({
      ...defaults,
      ...(providedFeatures.get(defaults.id) ?? {}),
    }));
    this.features.reconcile(features);
    this.flyouts.reconcile(normalizeRows(workshop.flyouts));
    this.layoutWorkshop({
      animateSideControls: this.hasBoundSideControls,
    });
    this.hasBoundSideControls = true;
  }

  openDialog(id, explicitModel = null) {
    const dialogId = id.startsWith('workshop.') ? id : `workshop.${id}`;
    const shortId = dialogId.slice('workshop.'.length);
    const definition = WORKSHOP_DIALOGS.find((entry) => entry.id === shortId);
    const baseModel = explicitModel ??
      this.dialogModels[shortId] ?? {
        title: definition?.title ?? shortId,
        rows: [],
      };
    const model = this.prepareDialogModel(shortId, baseModel);
    const action = this.currentActions?.openDialog;

    if (action) {
      const handled = action(shortId, model);

      if (handled === true) {
        this.consumeAutoSummonUnlockReveal(shortId, model);
        return true;
      }
    }

    if (!this.dialogRegistry?.has(dialogId)) {
      return false;
    }

    this.dialogRegistry.open(dialogId, model);
    this.consumeAutoSummonUnlockReveal(shortId, model);
    return true;
  }

  rebindOpenDialogs() {
    for (const dialogId of this.dialogRegistry?.getOpenDialogIds?.() ?? []) {
      if (!dialogId.startsWith('workshop.')) {
        continue;
      }

      const shortId = dialogId.slice('workshop.'.length);
      const model = this.prepareDialogModel(shortId, this.dialogModels[shortId]);
      if (model) {
        this.dialogRegistry.refresh(dialogId, model);
        this.consumeAutoSummonUnlockReveal(shortId, model);
      }
    }
  }

  observeAutoSummonUnlock(model = null) {
    const unlocked = model?.autoSummonUnlocked === true;

    if (!this.hasObservedAutoSummonUnlock) {
      this.hasObservedAutoSummonUnlock = true;
      this.wasAutoSummonUnlocked = unlocked;
      return;
    }

    if (!this.wasAutoSummonUnlocked && unlocked) {
      this.pendingAutoSummonUnlockReveal = true;
    } else if (!unlocked) {
      this.pendingAutoSummonUnlockReveal = false;
    }

    this.wasAutoSummonUnlocked = unlocked;
  }

  prepareDialogModel(shortId, model) {
    if (shortId !== 'summonInfo' || !model || !this.pendingAutoSummonUnlockReveal) {
      return model;
    }

    return {
      ...model,
      revealAutoSummonUnlock: true,
    };
  }

  consumeAutoSummonUnlockReveal(shortId, model) {
    if (shortId === 'summonInfo' && model?.revealAutoSummonUnlock === true) {
      this.pendingAutoSummonUnlockReveal = false;
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
      flyout.root.position.set((this.sourceWidth - flyout.text.width) / 2, y);
      y += 28;
    }
  }

  applyThemeToChildren(theme) {
    if (this.workshopWindow && this.assetManager?.getTexture) {
      this.workshopWindow.texture = this.assetManager.getTexture(
        theme.chrome?.workshopWindow ??
          PIXI_ROOT_RUN_ASSETS.workshopWindowNight,
      );
    }
    this.fireflies?.applyTheme(theme);
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
    this.layoutWorkshop({ animateSideControls: false });
  }

  activate() {
    super.activate();
    this.fireflies?.setActive(true);
    this.tasks?.resumeMotion();
    this.summon?.setActive(true);
  }

  deactivate() {
    this.fireflies?.setActive(false);
    this.tasks?.pauseMotion();
    this.summon?.setActive(false);
    super.deactivate();
  }

  layoutWorkshop({ animateSideControls = false } = {}) {
    if (!this.tasks) {
      return;
    }

    const width = this.sourceWidth - RETAINED_PAGE_GEOMETRY.contentEdge * 2;
    this.workshopWindow.position.set(
      this.sourceWidth / 2,
      WORKSHOP_WINDOW_GEOMETRY.top,
    );
    this.workshopWindow.width = WORKSHOP_WINDOW_GEOMETRY.width;
    this.workshopWindow.height = WORKSHOP_WINDOW_GEOMETRY.height;
    this.fireflies.setBounds(this.sourceWidth, this.sourceHeight);
    this.tasks.setBounds(
      RETAINED_PAGE_GEOMETRY.contentEdge,
      RETAINED_PAGE_GEOMETRY.contentTop,
      width,
    );
    const worldChatTop =
      this.sourceHeight -
      PIXI_UI_GEOMETRY.roomChatBottom -
      PIXI_UI_GEOMETRY.roomChatHeight;
    this.summon.setBounds(
      this.sourceWidth / 2,
      worldChatTop -
        SUMMON_BUTTON_HEIGHT -
        SUMMON_CHAT_GAP +
        SUMMON_BUTTON_UP_OFFSET,
    );
    const sideControlsTop =
      RETAINED_PAGE_GEOMETRY.contentTop + this.tasks.height + SIDE_CONTROLS_TASK_GAP;
    this.layoutSideControls(sideControlsTop, {
      animate: animateSideControls,
    });

    this.flyoutLayer.position.set(0, RETAINED_PAGE_GEOMETRY.contentTop + 182);
    this.registerStaticTargets();
  }

  layoutSideControls(top, { animate = false } = {}) {
    const entries = this.getSideControlEntries();
    const destinations = new Map();

    for (const side of ['left', 'right']) {
      entries
        .filter((entry) => entry.visible && entry.side === side)
        .sort(compareSideControlEntries)
        .forEach((entry, slot) => {
          destinations.set(entry.id, {
            x:
              side === 'right' ? this.sourceWidth - SIDE_PANEL_EDGE - entry.width : SIDE_PANEL_EDGE,
            y: top + slot * SIDE_PANEL_ROW_GAP,
            slot,
          });
        });
    }

    for (const entry of entries) {
      const state = this.sideControlMotionStates.get(entry.id) ?? null;
      const destination = destinations.get(entry.id) ??
        state?.destination ?? {
          x:
            entry.side === 'right'
              ? this.sourceWidth - SIDE_PANEL_EDGE - entry.width
              : SIDE_PANEL_EDGE,
          y: top,
          slot: 0,
        };
      this.layoutSideControl(entry, destination, {
        animate: animate && this.hasBoundSideControls && !this.reducedMotion(),
      });
    }
  }

  getSideControlEntries() {
    return [
      {
        id: 'stats',
        control: this.statsButton,
        root: this.statsButton.root,
        side: this.statsButton.side,
        weight: this.statsButton.weight,
        visible: this.statsButton.visible,
        width: SIDE_PANEL_ICON_WIDTH,
        height: SIDE_PANEL_ICON_HEIGHT,
        setBounds: (x, y) => this.statsButton.setBounds(x, y),
      },
      {
        id: 'bag',
        control: this.bagButton,
        root: this.bagButton.root,
        side: this.bagButton.side,
        weight: this.bagButton.weight,
        visible: this.bagButton.visible,
        width: SIDE_PANEL_ICON_WIDTH,
        height: SIDE_PANEL_ICON_HEIGHT,
        setBounds: (x, y) => this.bagButton.setBounds(x, y),
      },
      {
        id: 'inbox',
        control: this.inboxButton,
        root: this.inboxButton.root,
        side: this.inboxButton.side,
        weight: this.inboxButton.weight,
        visible: this.inboxButton.visible,
        width: SIDE_PANEL_ICON_WIDTH,
        height: SIDE_PANEL_ICON_HEIGHT,
        setBounds: (x, y) => this.inboxButton.setBounds(x, y),
      },
      ...this.features.getWidgets().map((feature) => ({
        id: `feature:${feature.model.id}`,
        control: feature,
        root: feature.root,
        side: feature.side,
        weight: feature.weight,
        visible: feature.visible,
        width: SIDE_PANEL_ICON_WIDTH,
        height: SIDE_PANEL_ICON_HEIGHT,
        setBounds: (x, y, width, height) => feature.setBounds(x, y, width, height),
      })),
    ];
  }

  layoutSideControl(entry, destination, { animate }) {
    const previous = this.sideControlMotionStates.get(entry.id) ?? null;
    const current = {
      x: entry.root.position.x,
      y: entry.root.position.y,
      alpha: entry.root.alpha,
      scale: entry.root.scale.x,
    };

    entry.setBounds(destination.x, destination.y, entry.width, entry.height);
    entry.root.position.set(current.x, current.y);

    const unchanged =
      previous &&
      previous.visible === entry.visible &&
      previous.side === entry.side &&
      previous.destination.x === destination.x &&
      previous.destination.y === destination.y;

    if (unchanged) {
      previous.destination = destination;
      previous.side = entry.side;
      if (!previous.frame) {
        this.finishSideControlTransition(entry, previous);
      }
      return;
    }

    if (previous?.frame) {
      this.cancelFrame(previous.frame);
    }

    const wasVisible = previous?.visible;
    const state = previous ?? {
      frame: 0,
      visible: entry.visible,
      side: entry.side,
      destination,
    };
    state.frame = 0;
    state.visible = entry.visible;
    state.side = entry.side;
    state.destination = destination;
    this.sideControlMotionStates.set(entry.id, state);

    const appearing = wasVisible === false && entry.visible;
    const waitForUnlockAnnouncement =
      appearing && this.getIsUnlockAnimationBlocked();

    if ((!animate || !previous) && !waitForUnlockAnnouncement) {
      this.finishSideControlTransition(entry, state);
      return;
    }

    const disappearing = wasVisible === true && !entry.visible;
    const offset = entry.side === 'right' ? SIDE_PANEL_ENTER_OFFSET : -SIDE_PANEL_ENTER_OFFSET;
    const from = {
      x: appearing ? destination.x + offset : current.x,
      y: appearing ? destination.y + 3 : current.y,
      alpha: appearing ? 0 : current.alpha,
      scale: appearing ? SIDE_PANEL_ENTER_SCALE : current.scale,
    };
    const to = {
      x: disappearing ? current.x + offset : destination.x,
      y: disappearing ? current.y + 2 : destination.y,
      alpha: disappearing ? 0 : 1,
      scale: disappearing ? SIDE_PANEL_ENTER_SCALE : 1,
    };
    const duration = disappearing
      ? SIDE_PANEL_EXIT_DURATION_MS
      : appearing
        ? SIDE_PANEL_ENTER_DURATION_MS
        : SIDE_PANEL_MOVE_DURATION_MS;
    const delay = appearing ? Math.min(destination.slot, 2) * SIDE_PANEL_STAGGER_MS : 0;

    entry.root.visible = true;
    entry.root.renderable = !waitForUnlockAnnouncement;
    entry.root.position.set(from.x, from.y);
    entry.root.alpha = from.alpha;
    entry.root.scale.set(from.scale);

    let startedAt = null;
    const tick = (timestamp) => {
      if (appearing && this.getIsUnlockAnimationBlocked()) {
        entry.root.renderable = false;
        state.frame = this.requestFrame(tick);
        return;
      }

      entry.root.renderable = true;
      if (!animate) {
        state.frame = 0;
        this.finishSideControlTransition(entry, state);
        return;
      }

      if (startedAt === null) {
        startedAt = timestamp;
      }
      const elapsed = Math.max(0, timestamp - startedAt - delay);
      const linearProgress = Math.min(1, elapsed / duration);
      const progress = easeOutQuart(linearProgress);
      entry.root.position.set(
        interpolate(from.x, to.x, progress),
        interpolate(from.y, to.y, progress),
      );
      entry.root.alpha = interpolate(from.alpha, to.alpha, progress);
      entry.root.scale.set(interpolate(from.scale, to.scale, progress));

      if (linearProgress >= 1) {
        state.frame = 0;
        this.finishSideControlTransition(entry, state);
        return;
      }

      state.frame = this.requestFrame(tick);
    };

    state.frame = this.requestFrame(tick);
  }

  getIsUnlockAnimationBlocked() {
    try {
      return Boolean(this.isUnlockAnimationBlocked());
    } catch {
      return false;
    }
  }

  finishSideControlTransition(entry, state) {
    entry.root.position.set(state.destination.x, state.destination.y);
    entry.root.alpha = 1;
    entry.root.scale.set(1);
    entry.root.visible = state.visible;
    entry.root.renderable = state.visible;
  }

  cancelSideControlAnimations() {
    for (const state of this.sideControlMotionStates.values()) {
      if (state.frame) {
        this.cancelFrame(state.frame);
        state.frame = 0;
      }
    }
    this.sideControlMotionStates.clear();
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
    this.cancelSideControlAnimations();
    this.fireflies?.destroy();
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

export class WorkshopTaskPanel {
  constructor({ page, assetManager, counters }) {
    this.page = page;
    this.assetManager = assetManager;
    this.panel = new RetainedPanel({
      assetManager,
      label: "Elara's Request",
      panelLabel: 'workshop-tasks',
    });
    this.root = this.panel.root;
    this.background = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.researchCard,
        ) ?? Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: 'workshop-tasks:research-card-background',
    });
    this.background.eventMode = 'none';
    this.root.addChildAt(this.background, 0);
    this.titleRibbon = new MarketTitleRibbon({
      assetManager,
      label: 'workshop-tasks:title-ribbon',
      showStars: false,
    });
    this.titleRibbon.root.eventMode = 'none';
    this.titleRibbon.bind("Elara's Request");
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
    this.root.addChild(this.titleRibbon.root);
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
    this.panel.title.eventMode = 'none';
    this.panel.title.cursor = 'default';
    this.panel.title.visible = false;
    this.panel.titleBacking.visible = false;

    this.height = 34;
    this.pendingModel = null;
    this.completionBoink = null;
    this.motionFrame = null;
    this.handleMotionFrame = (timestamp) => {
      this.motionFrame = null;
      this.updateMotion(
        Number.isFinite(timestamp)
          ? timestamp
          : this.page.timeSource(),
      );
    };
    this.questMotionUnsubscribe =
      this.page.questCompletionMotionCoordinator?.subscribe?.(
        (snapshot) => this.handleQuestCompletionMotion(snapshot),
      ) ?? null;
  }

  bind(model) {
    const nextModel = model ?? {};
    const transition =
      this.page.questCompletionMotionCoordinator?.getSnapshot?.();
    const currentTaskId = this.getActiveRow()?.model?.id ?? null;
    const nextTaskId = getRequestTaskId(nextModel);
    if (
      transition?.active === true &&
      currentTaskId === transition.previousTaskId &&
      nextTaskId !== currentTaskId
    ) {
      this.pendingModel = nextModel;
      return;
    }
    this.pendingModel = null;
    this.applyModel(nextModel);
  }

  applyModel(model) {
    this.model = model;
    const title = this.model.title ?? "Elara's Request";
    this.panel.setTitle(title);
    this.panel.title.visible = false;
    this.panel.titleBacking.visible = false;
    this.titleRibbon.bind(title);
    setText(this.next, this.model.nextText ?? this.model.next ?? '');
    setText(this.rewards, normalizeRows(this.model.rewardLines ?? this.model.rewards).join('\n'));
    this.rows.reconcile(normalizeRows(this.model.rows ?? this.model.tasks));
    const expanded = this.model.expanded !== false;
    this.rewardsTitle.visible = expanded && Boolean(this.rewards.text);
    this.rewards.visible = this.rewardsTitle.visible;
    const canToggle = this.model.canToggle === true;
    this.pinButton.root.visible = canToggle && this.model.showPin === true;
    this.expandButton.root.visible = canToggle || this.model.showToggle === true;
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

  handleQuestCompletionMotion(snapshot) {
    const row = this.getActiveRow();
    if (
      snapshot?.phase === 'filling' &&
      row?.model?.id === snapshot.previousTaskId
    ) {
      row.startCompletionFill(snapshot.fillDurationMs);
      return;
    }
    if (
      snapshot?.phase === 'flying' &&
      row?.model?.id === snapshot.previousTaskId
    ) {
      row.holdCompletedProgress();
      return;
    }
    if (snapshot?.phase === 'complete') {
      const previousTaskId = row?.model?.id ?? null;
      row?.holdCompletedProgress();
      if (this.pendingModel) {
        const pendingModel = this.pendingModel;
        const nextTaskId = getRequestTaskId(pendingModel);
        this.pendingModel = null;
        this.applyModel(pendingModel);
        if (nextTaskId && nextTaskId !== previousTaskId) {
          this.startCompletionBoink();
        }
      }
    }
  }

  getActiveRow() {
    return this.rows.getWidgets()[0] ?? null;
  }

  pauseMotion() {
    this.stopMotionFrame();
    this.applyCompletionBoinkScale(1);
    for (const row of this.rows.getWidgets()) {
      row.pauseMotion();
    }
  }

  resumeMotion() {
    this.updateMotion(this.page.timeSource());
    for (const row of this.rows.getWidgets()) {
      row.resumeMotion();
    }
  }

  startCompletionBoink(startedAtMs = this.page.timeSource()) {
    if (
      this.page.reducedMotion?.() === true ||
      !this.page.root.visible
    ) {
      this.completionBoink = null;
      this.applyCompletionBoinkScale(1);
      return;
    }
    this.completionBoink = { startedAtMs };
    this.updateMotion(startedAtMs);
  }

  updateMotion(now = this.page.timeSource()) {
    if (!this.page.root.visible || this.page.reducedMotion?.() === true) {
      this.stopMotionFrame();
      this.completionBoink = null;
      this.applyCompletionBoinkScale(1);
      return false;
    }
    if (!this.completionBoink) {
      this.applyCompletionBoinkScale(1);
      return false;
    }
    const progress = clampUnit(
      (now - this.completionBoink.startedAtMs) /
        QUEST_REQUEST_BOX_BOINK_DURATION_MS,
    );
    this.applyCompletionBoinkScale(getRequestBoinkScale(progress));
    if (progress >= 1) {
      this.completionBoink = null;
      this.applyCompletionBoinkScale(1);
      return false;
    }
    this.scheduleMotionFrame();
    return true;
  }

  scheduleMotionFrame() {
    if (this.motionFrame !== null || !this.page.root.visible) {
      return;
    }
    this.motionFrame = this.page.requestFrame(this.handleMotionFrame);
  }

  stopMotionFrame() {
    if (this.motionFrame === null) {
      return;
    }
    this.page.cancelFrame(this.motionFrame);
    this.motionFrame = null;
  }

  applyCompletionBoinkScale(scale) {
    const safeScale = Number.isFinite(scale) ? scale : 1;
    const width = this.width ?? this.panel.width;
    const height = this.height ?? this.panel.height;
    const x = this.x ?? this.root.x;
    const y = this.y ?? this.root.y;
    this.root.pivot.set(width / 2, height / 2);
    this.root.position.set(x + width / 2, y + height / 2);
    this.root.scale.set(safeScale);
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
    this.x = x;
    this.y = y;
    this.width = width;
    this.titleRibbon.setMaxWidth(
      Math.min(WORKSHOP_REQUEST_TITLE_RIBBON_WIDTH, width - 24),
    );
    this.titleRibbon.root.position.set(
      (width - this.titleRibbon.width) / 2,
      WORKSHOP_REQUEST_TITLE_RIBBON_Y,
    );
    let contentY = WORKSHOP_REQUEST_CONTENT_TOP;
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

    this.height = Math.max(
      WORKSHOP_REQUEST_CONTENT_TOP + 34,
      Math.ceil(contentY + 9),
    );
    this.panel.setBounds(x, y, width, this.height);
    this.background.setSize(
      width,
      this.height,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    this.panel.frame.visible = false;
    this.panel.fallback.visible = false;
    this.applyCompletionBoinkScale(this.root.scale.x);
    applyWorkshopRequestTitleTheme(this.panel.title, this.page.theme);
    this.pinButton.setBounds(8, this.height - 7, 42, 14);
    this.expandButton.setBounds(width / 2 - 30, this.height - 7, 60, 14);
    this.page.registerSemanticTarget({
      semanticId: 'workshop.tasks',
      tutorialId: this.model?.tutorialId ?? 'workshop:tasks',
      displayObject: this.root,
      activate: () => this.model?.onToggleExpanded?.() ?? false,
    });
  }

  applyTheme(theme) {
    this.panel.applyTheme(theme);
    this.background.setTexture(
      this.assetManager?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.researchCard,
      ) ?? Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    this.panel.frame.visible = false;
    this.panel.fallback.visible = false;
    applyWorkshopRequestTitleTheme(this.panel.title, theme);
    applyWorkshopRequestTextTheme(this.next, theme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 308,
    });
    applyWorkshopRequestTextTheme(this.rewardsTitle, theme, RETAINED_TEXT_STYLES.body);
    applyWorkshopRequestTextTheme(this.rewards, theme, {
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
    this.stopMotionFrame();
    this.questMotionUnsubscribe?.();
    this.questMotionUnsubscribe = null;
    this.rows.destroy();
    this.rowPool.destroy();
    this.pinButton.destroy();
    this.expandButton.destroy();
    this.panel.destroy();
  }
}

export class WorkshopTaskRow {
  constructor({ page, assetManager }) {
    this.clickable = new ClickableWidget({
      fallbackHitTest: true,
      hitTest: (point) => this.containsGlobalPoint(point),
      inputRouter: page.inputRouter,
      label: 'workshop-task-row',
    });
    this.root = this.clickable.root;
    this.page = page;
    this.assetManager = assetManager;
    this.visual = new Container({ label: 'workshop-task-row:visual' });
    this.clickable.setClickableVisual(this.visual);
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'workshop-task-row:icon';
    this.icon.anchor.set(0.5);
    this.icon.visible = false;
    this.iconOverlay = new Sprite(Texture.EMPTY);
    this.iconOverlay.label = 'workshop-task-row:icon-overlay';
    this.iconOverlay.anchor.set(0.5);
    this.iconOverlay.visible = false;
    this.label = createText('', WORKSHOP_REQUEST_ROW_TEXT_STYLE);
    this.value = createText('', WORKSHOP_REQUEST_ROW_TEXT_STYLE);
    this.value.anchor.set(1, 0);
    this.action = new RetainedButton({
      assetManager,
      buttonLabel: 'workshop-task-action',
      fallbackHitTest: true,
      inputRouter: this.page.inputRouter,
      sizeTier: 30,
      variant: 'yellow',
    });
    this.progress = new RetainedProgressBar({
      assetManager,
      label: 'workshop-task-progress',
      tone: 'root',
    });
    this.progressShineRoot = new Container({
      label: 'workshop-task-progress-shine',
      eventMode: 'none',
    });
    this.progressShine = new Sprite({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.researchButtonShine,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      alpha: REQUEST_PROGRESS_SHINE_ALPHA,
      blendMode: 'add',
      eventMode: 'none',
      label: 'workshop-task-progress-shine-sprite',
    });
    this.progressShineMask = new Graphics({
      label: 'workshop-task-progress-shine-mask',
      eventMode: 'none',
    });
    this.progressShineRoot.addChild(
      this.progressShine,
      this.progressShineMask,
    );
    this.progressShineRoot.mask = this.progressShineMask;
    this.progressShineRoot.visible = false;
    this.progressShineRoot.renderable = false;
    this.progress.root.addChild(this.progressShineRoot);
    this.preferredHeight = WORKSHOP_TASK_DEFAULT_ROW_HEIGHT;
    this.displayedProgress = 0;
    this.targetProgress = 0;
    this.progressMotion = null;
    this.progressFeedback = null;
    this.motionFrame = null;
    this.handleMotionFrame = (timestamp) => {
      this.motionFrame = null;
      this.updateMotion(
        Number.isFinite(timestamp)
          ? timestamp
          : this.page.timeSource(),
      );
    };
    this.visual.addChild(
      this.icon,
      this.iconOverlay,
      this.label,
      this.value,
      this.action.root,
      this.progress.root,
    );
    this.root.addChild(this.visual);
  }

  bind(model) {
    const previousTaskId = this.model?.id ?? null;
    this.model = model;
    this.root.visible = true;
    setText(this.label, model.label ?? model.text ?? '');
    setText(
      this.value,
      model.value ?? `${finiteOr(model.current, 0)}/${finiteOr(model.required, 0)}`,
    );
    const iconFrames = resolveTaskIconFrames(model);
    this.icon.texture =
      iconFrames.base && this.assetManager?.getAtlasTexture
        ? (this.assetManager.getAtlasTexture(iconFrames.base) ?? Texture.EMPTY)
        : Texture.EMPTY;
    this.iconOverlay.texture =
      iconFrames.overlay && this.assetManager?.getAtlasTexture
        ? (this.assetManager.getAtlasTexture(iconFrames.overlay) ?? Texture.EMPTY)
        : Texture.EMPTY;
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.iconOverlay.visible = this.icon.visible && this.iconOverlay.texture !== Texture.EMPTY;
    const hasAction = Boolean(model.actionLabel || model.onActivate);
    const hasRowAction = typeof model.onRowActivate === 'function';
    this.action.root.visible = hasAction;
    this.action.setModel({
      label: model.actionLabel ?? 'turn in',
      enabled: model.enabled !== false,
      notification: model.notification === true,
      action: () => model.onActivate?.(model),
    });
    this.clickable.setClickableState({
      action: hasRowAction ? () => model.onRowActivate(model) : null,
      enabled: hasRowAction && model.rowEnabled !== false,
    });
    if (!hasRowAction) {
      this.root.eventMode = 'passive';
      this.root.cursor = 'default';
    }
    const nextProgress = resolveRequestProgress(model);
    const isNewTask = previousTaskId === null || previousTaskId !== model.id;
    if (isNewTask) {
      this.setProgressImmediate(nextProgress);
    } else {
      this.animateProgressTo(nextProgress);
    }
    this.progress.root.visible = model.showProgress !== false;
    this.updateShineVisibility();
    this.targetId = model.semanticId ?? `workshop.task.${model.id}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: hasAction ? this.action.root : this.root,
      state: () => ({
        enabled: hasAction
          ? model.enabled !== false
          : hasRowAction && model.rowEnabled !== false,
        interactive: hasAction || hasRowAction,
      }),
      activate: () =>
        (hasAction
          ? model.onActivate?.(model)
          : model.onRowActivate?.(model)) ?? false,
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    const iconSize = WORKSHOP_TASK_ICON_SIZE;
    if (this.iconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.icon,
        item: this.iconOverlay,
        x: iconSize / 2,
        y: iconSize / 2,
        width: iconSize,
        height: iconSize,
        fitPositionX: 0,
      });
    } else {
      this.icon.position.set(iconSize / 2, iconSize / 2);
      this.icon.width = iconSize;
      this.icon.height = iconSize;
      this.iconOverlay.rotation = 0;
    }
    this.label.position.set(
      this.icon.visible ? iconSize + 4 : 0,
      WORKSHOP_TASK_ROW_TEXT_TOP,
    );
    this.value.position.set(
      width - (this.action.root.visible ? 64 : 0),
      WORKSHOP_TASK_ROW_TEXT_TOP,
    );
    this.action.setBounds(width - 58, 4, 58, 20);
    const contentBottom = Math.max(
      iconSize,
      WORKSHOP_TASK_ROW_TEXT_TOP + this.label.height,
      WORKSHOP_TASK_ROW_TEXT_TOP + this.value.height,
      this.action.root.visible ? 24 : 0,
    );
    const progressTop = contentBottom + WORKSHOP_TASK_PROGRESS_GAP;
    this.progress.setBounds(
      0,
      progressTop,
      width,
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    this.preferredHeight = this.progress.root.visible
      ? progressTop + PIXI_UI_GEOMETRY.progressTotalHeight
      : Math.max(28, contentBottom);
    const height = this.getPreferredHeight();
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.layoutProgressShine();
    this.updateShineVisibility();
    if (this.progressFeedback) {
      this.updateProgressFeedback(this.page.timeSource());
    }
  }

  getPreferredHeight() {
    return this.preferredHeight;
  }

  containsGlobalPoint(point) {
    const local = this.root?.toLocal?.(point);
    return Boolean(
      local &&
        local.x >= 0 &&
        local.x <= this.width &&
        local.y >= 0 &&
        local.y <= this.getPreferredHeight(),
    );
  }

  applyTheme(theme) {
    const color = this.model?.disabled ? theme.disabled : theme.text;
    applyWorkshopRequestTextTheme(this.label, theme, {
      ...WORKSHOP_REQUEST_ROW_TEXT_STYLE,
      fill: this.model?.disabled ? color : WORKSHOP_REQUEST_TEXT_FILL,
      wordWrapWidth: 190,
    });
    applyWorkshopRequestTextTheme(this.value, theme, {
      ...WORKSHOP_REQUEST_ROW_TEXT_STYLE,
      fill: this.model?.disabled ? color : WORKSHOP_REQUEST_TEXT_FILL,
    });
    this.action.applyTheme(theme);
    this.progress.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.clickable.resetClickableState();
    this.pauseMotion();
    this.progressMotion = null;
    this.progressFeedback = null;
    this.setProgressImmediate(0);
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

    this.pauseMotion();
    this.action.destroy();
    this.progress.destroy();
    this.clickable.destroy({ children: true });
  }

  startCompletionFill(durationMs) {
    this.animateProgressTo(1, {
      durationMs,
      completion: true,
    });
  }

  holdCompletedProgress() {
    this.progressMotion = null;
    this.setProgressImmediate(1);
    if (this.progressFeedback) {
      this.scheduleMotionFrame();
    }
  }

  animateProgressTo(
    progress,
    {
      durationMs = REQUEST_PROGRESS_UPDATE_DURATION_MS,
      completion = false,
    } = {},
  ) {
    const nextProgress = clampUnit(progress);
    this.targetProgress = nextProgress;
    if (
      this.page.reducedMotion?.() === true ||
      !this.page.root.visible ||
      nextProgress <= this.displayedProgress
    ) {
      this.progressMotion = null;
      this.progressFeedback = null;
      this.setProgressImmediate(nextProgress);
      return;
    }
    if (
      this.progressMotion &&
      this.progressMotion.end === nextProgress &&
      this.progressMotion.completion === completion
    ) {
      return;
    }
    const now = this.page.timeSource();
    this.progressMotion = {
      start: this.displayedProgress,
      end: nextProgress,
      startedAtMs: now + QUEST_REQUEST_SHINE_DURATION_MS,
      durationMs: Math.max(1, Number(durationMs) || REQUEST_PROGRESS_UPDATE_DURATION_MS),
      completion,
    };
    this.startProgressFeedback(now, nextProgress);
    this.scheduleMotionFrame();
  }

  setProgressImmediate(progress) {
    this.displayedProgress = clampUnit(progress);
    this.targetProgress = this.displayedProgress;
    this.progress.setProgress(this.displayedProgress);
    this.layoutProgressShine();
    this.updateShineVisibility();
  }

  updateMotion(now = this.page.timeSource()) {
    if (!this.page.root.visible || this.page.reducedMotion?.() === true) {
      this.pauseMotion();
      this.progressFeedback = null;
      if (this.progressMotion) {
        this.setProgressImmediate(this.progressMotion.end);
        this.progressMotion = null;
      }
      return false;
    }

    if (this.progressMotion) {
      const progress = clampUnit(
        (now - this.progressMotion.startedAtMs) /
          this.progressMotion.durationMs,
      );
      const eased = easeOutQuart(progress);
      this.displayedProgress = interpolate(
        this.progressMotion.start,
        this.progressMotion.end,
        eased,
      );
      this.progress.setProgress(this.displayedProgress);
      this.layoutProgressShine();
      if (progress >= 1) {
        this.progressMotion = null;
        this.displayedProgress = this.targetProgress;
        this.progress.setProgress(this.displayedProgress);
        this.layoutProgressShine();
      }
    }

    this.updateProgressFeedback(now);
    const keepAnimating = Boolean(
      this.progressMotion || this.progressFeedback,
    );
    if (keepAnimating) {
      this.scheduleMotionFrame();
    } else {
      this.progressShineRoot.visible = false;
      this.progressShineRoot.renderable = false;
    }
    return keepAnimating;
  }

  startProgressFeedback(
    startedAtMs = this.page.timeSource(),
    targetProgress = this.targetProgress,
  ) {
    if (
      this.page.reducedMotion?.() === true ||
      !this.page.root.visible
    ) {
      this.progressFeedback = null;
      return;
    }
    this.progressFeedback = {
      startedAtMs,
      targetProgress: clampUnit(targetProgress),
    };
    this.layoutProgressShine();
    this.updateShineVisibility();
    this.updateProgressFeedback(this.progressFeedback.startedAtMs);
    this.scheduleMotionFrame();
  }

  updateProgressFeedback(now) {
    const feedback = this.progressFeedback;
    if (!feedback) {
      return;
    }
    const elapsedMs = Math.max(0, now - feedback.startedAtMs);
    const layout = this.progressShineLayout;
    const shineProgress = clampUnit(
      elapsedMs / QUEST_REQUEST_SHINE_DURATION_MS,
    );
    if (layout && shineProgress < 1) {
      this.progressShineRoot.visible = true;
      this.progressShineRoot.renderable = true;
      this.progressShine.position.set(
        interpolate(layout.startX, layout.endX, shineProgress),
        layout.centerY,
      );
    } else {
      this.progressShineRoot.visible = false;
      this.progressShineRoot.renderable = false;
    }
    if (elapsedMs >= QUEST_REQUEST_SHINE_DURATION_MS) {
      this.progressFeedback = null;
    }
  }

  layoutProgressShine() {
    const border = PIXI_UI_GEOMETRY.progressRailBorderWidth;
    const innerWidth = Math.max(0, this.progress.width - border * 2);
    const innerHeight = Math.max(0, this.progress.height - border * 2);
    const shineLimit = this.progressFeedback
      ? this.progressFeedback.targetProgress
      : this.displayedProgress;
    const fillWidth = innerWidth * shineLimit;
    this.progressShineMask.clear();
    if (fillWidth <= 0 || innerHeight <= 0) {
      this.progressShineLayout = null;
      return;
    }
    const radius = Math.min(fillWidth / 2, innerHeight / 2);
    this.progressShineMask
      .roundRect(border, border, fillWidth, innerHeight, radius)
      .fill(0xffffff);
    const shineHeight = innerHeight * REQUEST_PROGRESS_SHINE_HEIGHT_SCALE;
    const textureWidth = Math.max(1, Number(this.progressShine.texture?.width) || 1);
    const textureHeight = Math.max(1, Number(this.progressShine.texture?.height) || 1);
    const shineWidth = (shineHeight * textureWidth) / textureHeight;
    this.progressShine.width = shineWidth;
    this.progressShine.height = shineHeight;
    this.progressShineLayout = {
      startX: border - shineWidth / 2,
      endX: border + fillWidth + shineWidth / 2,
      centerY: border + innerHeight / 2,
    };
  }

  updateShineVisibility() {
    const visible = Boolean(
      this.progress.root.visible &&
      this.progressShineLayout &&
      this.page.reducedMotion?.() !== true &&
      this.progressFeedback,
    );
    this.progressShineRoot.visible = visible;
    this.progressShineRoot.renderable = visible;
    if (visible) {
      this.scheduleMotionFrame();
    }
  }

  scheduleMotionFrame() {
    if (this.motionFrame !== null || !this.page.root.visible) {
      return;
    }
    this.motionFrame = this.page.requestFrame(this.handleMotionFrame);
  }

  stopMotionFrame() {
    if (this.motionFrame === null) {
      return;
    }
    this.page.cancelFrame(this.motionFrame);
    this.motionFrame = null;
  }

  pauseMotion() {
    this.stopMotionFrame();
    this.progressShineRoot.visible = false;
    this.progressShineRoot.renderable = false;
  }

  resumeMotion() {
    this.updateMotion(this.page.timeSource());
    if (this.progressMotion || this.progressFeedback) {
      this.scheduleMotionFrame();
    }
  }

}

export class WorkshopSummonControl {
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
    this.root.eventMode = 'passive';
    this.circle = new Sprite(Texture.EMPTY);
    this.circle.label = 'workshop-summon-circle';
    this.circle.anchor.set(0.5);
    this.button = new PixiCostButton({
      assetManager,
      width: SUMMON_BUTTON_WIDTH,
      height: SUMMON_BUTTON_HEIGHT,
      stacked: true,
      tone: 'purple',
      sizeTier: 50,
      label: 'workshop-summon-button',
    });
    this.info = new PixiInfoButton({
      assetManager,
      label: 'workshop-summon-info',
      inputRouter: this.page.inputRouter,
      action: () => this.actions?.info?.(),
    });
    this.notification = new PixiNotificationBadge({ assetManager });
    this.notification.root.label = 'workshop-summon-notification';
    this.root.addChild(this.circle, this.button, this.info);
    this.holdPointerId = null;
    this.holdTriggered = false;
    this.holdTimer = null;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function' ? reducedMotion : () => Boolean(reducedMotion);
    this.active = false;
    this.enabled = false;
    this.pressEnabled = false;
    this.effectFrame = 0;
    this.effectStart = 0;
    this.effectTick = (time) => this.tickSummonEffect(time);
    this.beginHold = (pointerId) => {
      if (!this.active || !this.enabled || this.holdPointerId !== null) {
        return;
      }

      this.holdPointerId = pointerId;
      this.holdTriggered = false;
      this.scheduleHold();
    };
    this.handlePointerDown = (event) => {
      this.button.setPressed(true);
      this.beginHold(event.pointerId);
    };
    this.handlePointerEnd = (event) => {
      this.button.setPressed(false, {
        confirmed: event.type === 'pointerup',
      });
      if (event.pointerId === this.holdPointerId) {
        this.stopHold();
      }
    };
    this.handlePressChange = (pressed, context) => {
      this.button.setPressed(pressed, context);
      if (pressed) {
        this.beginHold(context?.pointerId ?? 'router');
      } else if (
        context?.pointerId == null ||
        context.pointerId === this.holdPointerId
      ) {
        this.stopHold();
      }
    };
    this.handleTap = () => {
      if (this.pressEnabled && !this.holdTriggered) {
        return this.activateSummon();
      }

      return false;
    };
    this.inputRegistration =
      this.page.inputRouter?.registerPressTarget?.({
        id: createRetainedInputId('workshop-summon'),
        displayObject: this.button,
        enabled: () => this.pressEnabled,
        visible: () => this.button.visible && this.button.renderable,
        fallbackHitTest: true,
        excludePageSwipe: true,
        onActivate: this.handleTap,
        onPressChange: this.handlePressChange,
      }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.button.on('pointerdown', this.handlePointerDown);
      this.button.on('pointerup', this.handlePointerEnd);
      this.button.on('pointerupoutside', this.handlePointerEnd);
      this.button.on('pointercancel', this.handlePointerEnd);
      this.button.on('pointertap', this.handleTap);
    }
  }

  bind(model, actions) {
    this.model = model;
    this.actions = actions;
    this.enabled = model.enabled ?? model.canSummon ?? true;
    this.pressEnabled = model.pressEnabled ?? this.enabled;
    const actionLabel =
      model.label ??
      (finiteOr(model.quantity, 1) > 1 ? `Summon x${finiteOr(model.quantity, 1)}` : 'Summon Seed');
    this.button.setModel({
      actionLabel,
      amount: finiteOr(model.cost, 0),
      resource: 'mana',
      enabled: this.enabled,
    });
    this.button.eventMode = this.pressEnabled ? 'static' : 'none';
    this.button.cursor = this.pressEnabled ? 'pointer' : 'default';
    this.info.setModel({
      enabled: model.infoEnabled !== false,
      action: () => this.actions?.info?.(),
    });
    this.notification.bind('workshop.summon', {
      active: isNotificationActive(model.notification),
      tone: getNotificationTone(model.notification, model.notificationTone),
      parent: this.button,
      bounds: {
        x: 0,
        y: 0,
        width: SUMMON_BUTTON_WIDTH,
        height: SUMMON_BUTTON_HEIGHT,
      },
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(centerX, centerY) {
    this.root.position.set(centerX, centerY);
    this.circleBaseWidth = 196;
    this.circleBaseHeight = 196 * (592 / 1374);
    this.circle.position.set(0, -60 + this.circleBaseHeight / 2);
    this.setCircleEffectFrame({ alpha: this.enabled ? 1 : 0.38, scale: 1 });
    this.button.setBounds(
      -SUMMON_BUTTON_WIDTH / 2,
      -SUMMON_BUTTON_UP_OFFSET,
      SUMMON_BUTTON_WIDTH,
      SUMMON_BUTTON_HEIGHT,
    );
    this.info.setBounds(60, -50, 18, 18);
    this.page.registerSemanticTarget({
      semanticId: 'workshop.summonArea',
      displayObject: this.circle,
    });
    this.page.registerSemanticTarget({
      semanticId: 'workshop.summon',
      tutorialId: this.model?.tutorialId ?? 'workshop:summonSeed',
      displayObject: this.button,
      state: () => ({
        enabled: this.pressEnabled,
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
    this.button.applyTheme(theme);
    this.notification.applyTheme(theme);

    if (this.assetManager?.getAtlasTexture && this.circle.texture === Texture.EMPTY) {
      this.circle.texture = this.assetManager.getAtlasTexture('ui:summonCircle');
    }

    this.circle.alpha = this.enabled ? 1 : 0.38;
  }

  scheduleHold() {
    this.clearHoldTimer();
    this.holdTimer = globalThis.setTimeout(() => {
      this.holdTimer = null;

      if (
        this.holdPointerId === null ||
        !this.active ||
        !this.enabled
      ) {
        this.stopHold();
        return;
      }

      this.holdTriggered = true;
      const shouldContinue = this.activateSummon();

      if (shouldContinue !== false && this.enabled) {
        this.scheduleHold();
      } else {
        this.stopHold();
      }
    }, SUMMON_HOLD_REPEAT_MS);
  }

  stopHold() {
    this.clearHoldTimer();
    this.holdPointerId = null;
  }

  clearHoldTimer() {
    if (this.holdTimer !== null) {
      globalThis.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  setActive(active) {
    this.active = Boolean(active);
    if (!this.active) {
      this.stopHold();
      this.stopSummonEffect();
    }
  }

  activateSummon() {
    if (!this.pressEnabled) {
      return false;
    }
    this.playSummonEffect();
    let result;
    try {
      result = this.actions?.summon?.();
    } catch (error) {
      this.stopSummonEffect();
      this.setCircleEffectFrame({
        alpha: this.enabled ? 1 : 0.38,
        scale: 1,
      });
      throw error;
    }
    const succeeded = result !== false && result?.ok !== false;
    if (!succeeded) {
      this.stopSummonEffect();
      this.setCircleEffectFrame({
        alpha: this.enabled ? 1 : 0.38,
        scale: 1,
      });
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
    this.circle.height = (this.circleBaseHeight ?? 196 * (592 / 1374)) * scale;
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
      this.button.off('pointerdown', this.handlePointerDown);
      this.button.off('pointerup', this.handlePointerEnd);
      this.button.off('pointerupoutside', this.handlePointerEnd);
      this.button.off('pointercancel', this.handlePointerEnd);
      this.button.off('pointertap', this.handleTap);
    }

    this.notification.destroy();
    this.info.destroy();
    this.button.destroy();
    this.root.destroy({ children: true });
  }
}

export class WorkshopIconPanelAction {
  constructor({
    page,
    assetManager,
    id,
    label,
    side,
    weight = 0,
    textureId,
    scale = 1,
    onActivate,
  }) {
    this.page = page;
    this.assetManager = assetManager;
    this.id = id;
    this.side = side === 'right' ? 'right' : 'left';
    this.weight = finiteOr(weight, 0);
    this.textureId = textureId;
    this.iconScale = finiteOr(scale, 1) * ROOT_RUN_SIDE_ACTION_GEOMETRY.iconScale;
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
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelLineHeight,
    });
    this.label.anchor.set(0.5, 0);
    this.notification = new PixiNotificationBadge({ assetManager });
    this.notification.root.label = `workshop-${id}-icon-panel-action:notification`;
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
    side = this.side,
    weight = this.weight,
    enabled = true,
    visible = true,
    notification = false,
    notificationTone = null,
    action = null,
  } = {}) {
    this.activation = typeof action === 'function' ? action : null;
    this.side = side === 'right' ? 'right' : 'left';
    this.weight = finiteOr(weight, this.weight);
    this.enabled = enabled !== false;
    this.visible = visible !== false;
    this.root.eventMode = this.enabled && this.visible ? 'static' : 'none';
    this.root.cursor = this.enabled && this.visible ? 'pointer' : 'default';
    this.label.anchor.set(0.5, 0);
    setText(this.label, capitalizeInitial(label));
    fitRootRunSideActionLabel(this.label);
    this.icon.alpha = this.enabled ? 1 : 0.55;
    this.label.alpha = this.enabled ? 1 : 0.55;
    this.notification.bind(`workshop.${this.id}`, {
      active: isNotificationActive(notification),
      tone: getNotificationTone(notification, notificationTone),
      parent: this.root,
      bounds: SIDE_PANEL_ART_BOUNDS[this.side],
    });
    this.layoutVisual();
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      SIDE_PANEL_ART_TOP,
      SIDE_PANEL_ICON_WIDTH,
      SIDE_PANEL_HIT_HEIGHT,
    );
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

    this.icon.texture = this.assetManager.getTexture(this.textureId) ?? Texture.EMPTY;
  }

  layoutVisual() {
    const frameWidth = SIDE_PANEL_ICON_WIDTH;
    const frameHeight = SIDE_PANEL_ART_HEIGHT;
    const frameLeft = SIDE_PANEL_ART_BOUNDS[this.side].x;
    const frameTop = SIDE_PANEL_ART_TOP;
    const textureWidth = Math.max(
      1,
      Number(this.icon.texture?.orig?.width ?? this.icon.texture?.width) || 1,
    );
    const textureHeight = Math.max(
      1,
      Number(this.icon.texture?.orig?.height ?? this.icon.texture?.height) || 1,
    );
    const fit = Math.min(frameWidth / textureWidth, frameHeight / textureHeight) * this.iconScale;
    this.icon.width = textureWidth * fit;
    this.icon.height = textureHeight * fit;
    const iconX =
      frameWidth / 2 +
      (this.side === 'right' ? 1 : -1) * ROOT_RUN_SIDE_ACTION_GEOMETRY.iconEdgeNudge;
    this.icon.position.set(iconX, frameHeight / 2);
    this.iconFrame.pivot.set(frameWidth / 2, frameHeight / 2);
    this.iconFrame.position.set(frameLeft + frameWidth / 2, frameTop + frameHeight / 2);
    this.iconFrameBaseY = this.iconFrame.y;
    this.label.position.set(
      frameLeft + frameWidth / 2,
      frameTop + frameHeight + ROOT_RUN_SIDE_ACTION_GEOMETRY.iconLabelGap,
    );
    this.labelBaseY = this.label.y;
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelLineHeight,
      fill: WORKSHOP_SIDE_LABEL_FILL,
    });
    this.label.style.stroke = normalizePixiTextStroke({
      color: WORKSHOP_SIDE_LABEL_STROKE,
    }, this.label.style.fontSize);
    fitRootRunSideActionLabel(this.label);
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

export class WorkshopFeatureButton {
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
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'workshop-feature-button:icon';
    this.icon.anchor.set(0.5);
    this.allianceFlag = new AllianceFlagWidget({
      assetManager,
      label: 'workshop-feature-button:alliance-flag',
    });
    this.allianceFlag.visible = false;
    this.allianceFlag.renderable = false;
    this.label = createText('', {
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelLineHeight,
    });
    this.timer = createText('', {
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.timerFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.timerLineHeight,
    });
    this.notification = new PixiNotificationBadge({ assetManager });
    this.notification.root.label = 'workshop-feature-button:notification';
    this.iconFrame.addChild(this.icon, this.allianceFlag);
    this.root.addChild(this.iconFrame, this.label, this.timer);
    this.handleTap = () => {
      if (this.model?.enabled === false) {
        return false;
      }

      return this.model?.onActivate?.() ?? this.page.openDialog(this.model.id, this.model.dialog);
    };
    this.handlePressChange = (pressed) => this.setPressed(pressed);
    this.handlePointerDown = () => this.setPressed(true);
    this.handlePointerUp = () => this.setPressed(false);
    this.inputRegistration =
      this.page.inputRouter?.registerPressTarget?.({
        id: createRetainedInputId('workshop-feature'),
        displayObject: this.root,
        enabled: () =>
          Boolean(this.model) && this.model.visible !== false && this.model.enabled !== false,
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
    this.visible = model.visible !== false;
    this.root.eventMode = this.visible && model.enabled !== false ? 'static' : 'none';
    this.root.cursor = this.visible && model.enabled !== false ? 'pointer' : 'default';
    this.side = model.side === 'right' ? 'right' : 'left';
    this.weight = finiteOr(model.weight, Math.max(0, finiteOr(model.row, 0)) * 10);
    this.label.anchor.set(0.5, 0);
    this.timer.anchor.set(0.5, 0);
    setText(this.label, capitalizeInitial(model.label ?? model.id));
    fitRootRunSideActionLabel(this.label);
    setText(this.timer, model.timer ?? '');
    this.timer.visible = this.timer.text.length > 0;
    this.resolvePresentation();
    this.layoutVisual();
    this.setPressed(false);
    this.notification.bind(`workshop.feature.${model.id}`, {
      active: isNotificationActive(model.notification),
      tone: getNotificationTone(model.notification, model.notificationTone),
      parent: this.root,
      bounds: SIDE_PANEL_ART_BOUNDS[this.side],
    });

    this.targetId = `workshop.feature.${model.id}`;
    this.page.registerSemanticTarget({
      semanticId: this.targetId,
      tutorialId: model.tutorialId ?? null,
      displayObject: this.root,
      state: () => ({
        visible: model.visible !== false && this.root.worldVisible !== false,
        enabled: model.enabled !== false,
        interactive: model.enabled !== false,
      }),
      activate: this.handleTap,
    });
    this.applyTheme(this.page.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, SIDE_PANEL_ART_TOP, width, SIDE_PANEL_HIT_HEIGHT);
    this.layoutVisual();
  }

  resolvePresentation() {
    const presentation = WORKSHOP_FEATURE_PRESENTATIONS[this.model?.id] ?? {};
    const assetId = this.model?.assetId ?? presentation.assetId;
    const allianceFlagModel =
      this.model?.id === 'alliance' ? this.model.allianceFlag : null;
    this.presentation = presentation;
    this.icon.texture =
      this.model?.iconFrame && this.assetManager?.getAtlasTexture
        ? (this.assetManager.getAtlasTexture(this.model.iconFrame) ?? Texture.EMPTY)
        : assetId && this.assetManager?.getTexture
          ? (this.assetManager.getTexture(assetId) ?? Texture.EMPTY)
          : Texture.EMPTY;
    this.icon.visible = !allianceFlagModel && this.icon.texture !== Texture.EMPTY;
    this.icon.renderable = this.icon.visible;
    this.allianceFlag.visible = Boolean(allianceFlagModel);
    this.allianceFlag.renderable = this.allianceFlag.visible;
    if (allianceFlagModel) {
      this.allianceFlag.setColors(allianceFlagModel);
    }
  }

  layoutVisual() {
    const frameWidth = SIDE_PANEL_ICON_WIDTH;
    const frameHeight = SIDE_PANEL_ART_HEIGHT;
    const frameLeft = SIDE_PANEL_ART_BOUNDS[this.side].x;
    const frameTop = SIDE_PANEL_ART_TOP;
    layoutContainedSprite(this.icon, frameWidth, frameHeight, {
      scale:
        (this.presentation?.scale ?? 1) * ROOT_RUN_SIDE_ACTION_GEOMETRY.iconScale,
      mirrored: this.side === 'right' && this.presentation?.mirrorOnRight === true,
    });
    const iconX =
      frameWidth / 2 +
      (this.side === 'right' ? 1 : -1) * ROOT_RUN_SIDE_ACTION_GEOMETRY.iconEdgeNudge;
    this.icon.x = iconX;
    const flagSize = Math.min(frameWidth, frameHeight) *
      (this.presentation?.scale ?? 1) *
      ROOT_RUN_SIDE_ACTION_GEOMETRY.iconScale;
    this.allianceFlag.setSize(flagSize, flagSize);
    this.allianceFlag.position.set(
      iconX - this.allianceFlag.flagWidth / 2,
      frameHeight / 2 - this.allianceFlag.flagHeight / 2,
    );
    this.iconFrame.pivot.set(frameWidth / 2, frameHeight / 2);
    this.iconFrame.position.set(frameLeft + frameWidth / 2, frameTop + frameHeight / 2);
    this.iconFrameBaseY = this.iconFrame.y;
    const textX = frameLeft + frameWidth / 2;
    this.label.position.set(
      textX,
      frameTop + frameHeight + ROOT_RUN_SIDE_ACTION_GEOMETRY.iconLabelGap,
    );
    this.labelBaseY = this.label.y;
    this.timer.position.set(textX, SIDE_PANEL_ICON_HEIGHT);
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
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.labelLineHeight,
      fill: WORKSHOP_SIDE_LABEL_FILL,
    });
    this.label.style.stroke = normalizePixiTextStroke({
      color: WORKSHOP_SIDE_LABEL_STROKE,
    }, this.label.style.fontSize);
    fitRootRunSideActionLabel(this.label);
    this.label.alpha = this.model?.enabled === false ? 0.55 : 1;
    applyTextTheme(this.timer, theme, {
      fontSize: ROOT_RUN_SIDE_ACTION_GEOMETRY.timerFontSize,
      lineHeight: ROOT_RUN_SIDE_ACTION_GEOMETRY.timerLineHeight,
      fill: theme.muted,
    });
    this.timer.style.stroke = normalizePixiTextStroke({
      color: theme.surface,
    }, this.timer.style.fontSize);
    this.icon.alpha = this.model?.enabled === false ? 0.55 : 1;
    this.allianceFlag.alpha = this.icon.alpha;
    this.notification.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.page.unregisterSemanticTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.presentation = null;
    this.visible = false;
    this.weight = 0;
    this.setPressed(false);
    this.icon.texture = Texture.EMPTY;
    this.allianceFlag.visible = false;
    this.allianceFlag.renderable = false;
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
    this.background = new Graphics({
      label: 'workshop-flyout-background',
    });
    this.text = createText('', WORKSHOP_FLYOUT_VISUALS.textStyle);
    this.root.addChild(this.background, this.text);
  }

  bind(model) {
    this.model = model;
    this.root.visible = true;
    setText(this.text, model.message ?? model.text ?? '');
    this.drawBackground();
  }

  applyTheme(theme) {
    applyTextTheme(this.text, theme, WORKSHOP_FLYOUT_VISUALS.textStyle);
    this.drawBackground();
  }

  drawBackground() {
    const width =
      this.text.width + WORKSHOP_FLYOUT_VISUALS.horizontalPadding * 2;
    const height = WORKSHOP_FLYOUT_VISUALS.height;
    this.background
      .clear()
      .roundRect(
        -WORKSHOP_FLYOUT_VISUALS.horizontalPadding,
        (this.text.height - height) / 2,
        width,
        height,
        WORKSHOP_FLYOUT_VISUALS.radius,
      )
      .fill({
        color: WORKSHOP_FLYOUT_VISUALS.backgroundColor,
        alpha: WORKSHOP_FLYOUT_VISUALS.backgroundAlpha,
      });
  }

  reset() {
    this.root.visible = false;
    this.model = null;
    this.background.clear();
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function resolveTaskIconFrames(model = {}) {
  const kind = String(model.itemKind ?? '')
    .trim()
    .toLowerCase();
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
  const fit = Math.min(frameWidth / textureWidth, frameHeight / textureHeight) * scale;
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
      (progress - previous.progress) / Math.max(0.0001, next.progress - previous.progress);
    return {
      alpha: previous.alpha + (next.alpha - previous.alpha) * segment,
      scale: previous.scale + (next.scale - previous.scale) * segment,
    };
  }
  return SUMMON_EFFECT_FRAMES.at(-1);
}

function compareSideControlEntries(left, right) {
  return finiteOr(left.weight, 0) - finiteOr(right.weight, 0) || left.id.localeCompare(right.id);
}

function getRequestTaskId(model = {}) {
  const row = normalizeRows(model.rows ?? model.tasks)[0];
  const taskId = String(row?.id ?? '').trim();
  return taskId || null;
}

function resolveRequestProgress(model = {}) {
  const required = finiteOr(model.required, 0);
  return clampUnit(
    required > 0
      ? finiteOr(model.current, 0) / required
      : finiteOr(model.progress, 0),
  );
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function getRequestBoinkScale(progress) {
  const value = clampUnit(progress);
  if (value <= 0.35) {
    return interpolate(1, 1.04, easeOutQuart(value / 0.35));
  }
  if (value <= 0.7) {
    return interpolate(
      1.04,
      0.992,
      easeOutQuart((value - 0.35) / 0.35),
    );
  }
  return interpolate(
    0.992,
    1,
    easeOutQuart((value - 0.7) / 0.3),
  );
}

function easeOutQuart(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  return 1 - (1 - clamped) ** 4;
}

function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function fitRootRunSideActionLabel(label) {
  label.scale.set(1);
  const width = Math.max(1, Number(label.width) || 1);
  if (width > ROOT_RUN_SIDE_ACTION_GEOMETRY.labelMaxWidth) {
    label.scale.set(ROOT_RUN_SIDE_ACTION_GEOMETRY.labelMaxWidth / width);
  }
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(defaultTimeSource()), 16);
}

function capitalizeInitial(value) {
  const label = String(value ?? '');
  return label.length > 0 ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

function applyWorkshopRequestTextTheme(text, theme, style = RETAINED_TEXT_STYLES.body) {
  applyTextTheme(text, theme, {
    ...style,
    fill: style.fill ?? WORKSHOP_REQUEST_TEXT_FILL,
  });
  text.style.stroke = null;
}

function applyWorkshopRequestTitleTheme(text, theme) {
  applyTextTheme(text, theme, {
    ...RETAINED_TEXT_STYLES.body,
    fill: WORKSHOP_REQUEST_TITLE_FILL,
  });
  text.style.stroke = normalizePixiTextStroke({
    color: WORKSHOP_REQUEST_TITLE_STROKE,
  }, text.style.fontSize);
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
