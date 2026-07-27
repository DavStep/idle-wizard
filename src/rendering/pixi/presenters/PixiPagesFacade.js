import { DEFAULT_PAGE_SWIPE_ORDER } from '../../../pages/managers/pageOrder.js';
import { PageUnlockManager } from '../../../pages/managers/PageUnlockManager.js';
import {
  WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL,
} from '../../../pages/workshop/managers/WorkshopSecondaryActionGateManager.js';
import {
  PageNotificationStateManager,
  getGardenNotificationContext,
  hasGardenTileNotification,
} from '../../../pages/notifications/managers/PageNotificationStateManager.js';
import {
  getItemDisplay,
  isItemResearched,
  shouldShowItemInActionList,
} from '../../../pages/shared/itemResearchStatus.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { BrewingPixiPage } from '../pages/brewing/index.js';
import { GardenPixiPage } from '../pages/garden/index.js';
import {
  GUILD_DIALOG_IDS,
  GuildPixiPage,
  createGuildPixiViewModel,
} from '../pages/guild/index.js';
import { PrestigePixiPage } from '../pages/prestige/index.js';
import { ResearchPixiPage } from '../pages/research/index.js';
import {
  SHOP_DIALOG_IDS,
  ShopPixiPage,
  createShopPixiViewModel,
} from '../pages/shop/index.js';
import { WorkshopPixiPage } from '../pages/workshop/index.js';
import {
  normalizeTutorialNotificationPolicy,
  projectChromeNotificationPages,
  projectPageNotificationState,
  projectPageViewModelNotifications,
} from './PixiNotificationProjection.js';
import { PixiViewModelFactory } from './PixiViewModelFactory.js';

const PAGE_IDS = Object.freeze([
  'workshop',
  'brewing',
  'garden',
  'research',
  'shop',
  'guild',
  'prestige',
]);

const SWIPE_PAGE_IDS = new Set(PAGE_IDS);
const COLLAPSED_INVENTORY_ITEM_COUNT = 6;
const INVENTORY_KINDS_BY_PAGE = Object.freeze({
  garden: Object.freeze(['herbs', 'seeds']),
  brewing: Object.freeze(['herbs', 'potions']),
});
const WORKSHOP_BAG_TAB_IDS = new Set([
  'currencies',
  'seeds',
  'herbs',
  'potions',
  'ingredients',
]);
const WORKSHOP_STATS_TAB_IDS = new Set([
  'seeds',
  'herbs',
  'potions',
  'coin',
]);
const WORKSHOP_LEADERBOARD_TAB_IDS = new Set([
  'singlePlayer',
  'alliance',
]);

/**
 * Renderer-neutral coordinator for the retained Pixi room views.
 *
 * Gameplay and backend facades remain authoritative. This class projects
 * their snapshots into display-ready models and routes view actions back to
 * those facades without constructing or querying DOM.
 */
export class PixiPagesFacade {
  static explain =
    'Keeps every Pixi room alive, binds authoritative game state, and switches rooms without rebuilding them.';

  constructor({
    renderFacade,
    experienceFacade = null,
    globalDialogPresenter = null,
    announcementPresenter = null,
    gameplayFacade,
    playerFacade,
    leaderboardFacade = null,
    worldEventLeaderboardFacade = null,
    worldChatFacade = null,
    feedbackFacade = null,
    playerInboxFacade = null,
    playerInfoFacade = null,
    playerShopFacade = null,
    tradeAllianceFacade = null,
    npcMarketFacade = null,
    authFacade = null,
    hapticsFacade = null,
    soundSettingsFacade = null,
    appPlugin = null,
    defaultPageId = 'workshop',
    viewModelFactory = new PixiViewModelFactory(),
    pageUnlockManager = new PageUnlockManager({
      pageOrder: DEFAULT_PAGE_SWIPE_ORDER,
    }),
    notificationManager = new PageNotificationStateManager(),
  } = {}) {
    if (!renderFacade) {
      throw new Error('PixiPagesFacade requires the production RenderFacade.');
    }

    this.renderFacade = renderFacade;
    this.experienceFacade = experienceFacade;
    this.globalDialogPresenter = globalDialogPresenter;
    this.announcementPresenter = announcementPresenter;
    this.gameplayFacade = gameplayFacade;
    this.playerFacade = playerFacade;
    this.leaderboardFacade = leaderboardFacade;
    this.worldEventLeaderboardFacade = worldEventLeaderboardFacade;
    this.worldChatFacade = worldChatFacade;
    this.feedbackFacade = feedbackFacade;
    this.playerInboxFacade = playerInboxFacade;
    this.playerInfoFacade = playerInfoFacade;
    this.playerShopFacade = playerShopFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.npcMarketFacade = npcMarketFacade;
    this.authFacade = authFacade;
    this.hapticsFacade = hapticsFacade;
    this.soundSettingsFacade = soundSettingsFacade;
    this.appPlugin = appPlugin;
    this.viewModelFactory = viewModelFactory;
    this.pageUnlockManager = pageUnlockManager;
    this.notificationManager = notificationManager;
    this.defaultPageId = PAGE_IDS.includes(defaultPageId)
      ? defaultPageId
      : 'workshop';
    this.currentPageId = this.defaultPageId;
    this.mounted = false;
    this.registered = false;
    this.refreshing = false;
    this.refreshQueued = false;
    this.unsubscribers = [];
    this.pageSwipeRegistration = null;
    this.nativeBackHandle = null;
    this.releaseNpcMarket = null;
    this.releasePlayerMarket = null;
    this.releaseTradeAlliancePublic = null;
    this.gameplaySnapshot = {};
    this.playerSnapshot = {};
    this.worldChatSnapshot = {};
    this.leaderboardSnapshot = {};
    this.worldEventLeaderboardSnapshot = {};
    this.playerInboxSnapshot = {};
    this.playerShopSnapshot = {};
    this.tradeAllianceSnapshot = {};
    this.pageStates = [];
    this.notifications = { pages: {}, active: false };
    this.tutorialNotificationPolicy = null;
    this.devNotifications = null;
    this.questProgressPreview = null;
    this.workshopBagTabId = 'currencies';
    this.workshopStatsTabId = 'seeds';
    this.workshopLeaderboardTabId = 'singlePlayer';
    this.researchTabId = 'regular';
    this.shopTabId = 'traders';
    this.shopStallItemTypeIdBySlot = new Map();
    this.shopStallAllocationPercentBySlot = new Map();
    this.shopStallItemKindBySlot = new Map();
    this.guildTabId = 'hall';
    this.prestigeTabId = 'main';
    this.gardenInventoryTabId = null;
    this.brewingInventoryTabId = null;
    this.expandedInventoryKindsByPage = new Map();
    this.prestigeConfirm = null;
    this.selectedRecipeByCauldron = new Map();
    this.selectedBrewingCauldronIndex = 0;
    this.worldViewportByPage = new Map();
    this.dirtyPageIds = new Set(PAGE_IDS);
    this.registerViews();
  }

  registerViews() {
    if (this.registered) {
      return;
    }

    const createSharedOptions = (context) => ({
      assetManager: context.assets,
      inputRouter: context.inputRouter,
      semanticTargets: context.semanticRegistry,
      dialogRegistry: context.dialogRegistry(),
      dialogLayer: context.layers.dialogsSource ?? context.layers.dialogs,
      counters: context.counters,
      textEntryService: context.textEntryService,
      ticker: context.application?.ticker,
      theme: context.theme(),
    });

    this.renderFacade
      .registerPage(
        'workshop',
        (context) => new WorkshopPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        'brewing',
        (context) => new BrewingPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        'garden',
        (context) => new GardenPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        'research',
        (context) => new ResearchPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        'shop',
        (context) =>
          new ShopPixiPage({
            ...createSharedOptions(context),
            semanticRegistry: context.semanticRegistry,
            textEntryService: context.textEntryService,
          }),
      )
      .registerPage(
        'guild',
        (context) =>
          new GuildPixiPage({
            ...createSharedOptions(context),
            semanticRegistry: context.semanticRegistry,
            textEntryService: context.textEntryService,
          }),
      )
      .registerPage(
        'prestige',
        (context) => new PrestigePixiPage(createSharedOptions(context)),
      );
    this.registered = true;
  }

  mount() {
    if (this.mounted) {
      return;
    }

    const runtime = this.requireRuntime();
    this.mounted = true;
    this.readInitialSnapshots();
    this.subscribeToState();
    this.installInputBoundaries();
    this.refresh();
    runtime.activatePage(this.getUnlockedPageId(this.currentPageId));
    this.syncExternalDataRetention();
    this.globalDialogPresenter?.mount?.();
    this.experienceFacade?.mount?.();
    this.announcementPresenter?.mount?.();
  }

  unmount() {
    if (!this.mounted) {
      return;
    }

    this.mounted = false;
    this.announcementPresenter?.unmount?.();
    this.experienceFacade?.unmount?.();
    this.globalDialogPresenter?.unmount?.();
    for (const unsubscribe of this.unsubscribers.splice(0).reverse()) {
      unsubscribe?.();
    }
    this.setSwipeTargetPageId(null);
    this.pageSwipeRegistration?.unregister?.();
    this.pageSwipeRegistration = null;
    this.renderFacade.getInputRouter()?.setBackHandler?.(null);
    this.renderFacade.getInputRouter()?.setEscapeHandler?.(null);
    void this.removeNativeBackHandler();
    this.releaseExternalData();
    const runtime = this.renderFacade.getUiRuntime();
    runtime?.closeAllDialogs?.();
    runtime?.deactivatePage?.();
    this.resetInventoryUiState('garden');
    this.resetInventoryUiState('brewing');
    this.dirtyPageIds = new Set(PAGE_IDS);
  }

  readInitialSnapshots() {
    this.gameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? {};
    this.playerSnapshot = this.playerFacade?.getSnapshot?.() ?? {};
    this.worldChatSnapshot = this.worldChatFacade?.getSnapshot?.() ?? {};
    this.leaderboardSnapshot =
      this.leaderboardFacade?.getSnapshot?.() ?? {};
    this.worldEventLeaderboardSnapshot =
      this.worldEventLeaderboardFacade?.getSnapshot?.() ?? {};
    this.playerInboxSnapshot =
      this.playerInboxFacade?.getSnapshot?.() ?? {};
    this.playerShopSnapshot = this.playerShopFacade?.getSnapshot?.() ?? {};
    this.tradeAllianceSnapshot =
      this.tradeAllianceFacade?.getSnapshot?.() ?? {};
  }

  subscribeToState() {
    this.trackSubscription(
      this.gameplayFacade?.subscribe?.((snapshot) => {
        this.gameplaySnapshot = snapshot ?? {};
        this.refresh();
      }),
    );
    this.trackSubscription(
      this.gameplayFacade?.subscribeFrameResources?.((resources) => {
        const frameResources = resources ?? {};
        this.gameplaySnapshot = {
          ...this.gameplaySnapshot,
          ...frameResources,
          tasks: frameResources.tasks
            ? {
                ...(this.gameplaySnapshot.tasks ?? {}),
                ...frameResources.tasks,
              }
            : this.gameplaySnapshot.tasks,
        };
        this.refreshChrome();
      }),
    );
    this.trackSubscription(
      this.playerFacade?.subscribe?.((snapshot) => {
        this.playerSnapshot = snapshot ?? {};
        this.refresh();
      }),
    );
    this.trackSubscription(
      this.worldChatFacade?.subscribe?.((snapshot) => {
        this.worldChatSnapshot = snapshot ?? {};
        this.refreshChrome();
        this.refreshOpenWorldChatDialog();
      }),
    );
    this.trackSubscription(
      this.leaderboardFacade?.subscribe?.((snapshot) => {
        this.leaderboardSnapshot = snapshot ?? {};
        this.refreshPage('workshop');
      }),
    );
    this.trackSubscription(
      this.worldEventLeaderboardFacade?.subscribe?.((snapshot) => {
        this.worldEventLeaderboardSnapshot = snapshot ?? {};
        this.refreshPage('workshop');
      }),
    );
    this.trackSubscription(
      this.playerInboxFacade?.subscribe?.((snapshot) => {
        this.playerInboxSnapshot = snapshot ?? {};
        this.refreshPage('workshop');
      }),
    );
    this.trackSubscription(
      this.playerShopFacade?.subscribe?.((snapshot) => {
        this.playerShopSnapshot = snapshot ?? {};
        this.refresh();
      }),
    );
    this.trackSubscription(
      this.tradeAllianceFacade?.subscribe?.((snapshot) => {
        this.tradeAllianceSnapshot = snapshot ?? {};
        this.refresh();
      }),
    );
  }

  trackSubscription(unsubscribe) {
    if (typeof unsubscribe === 'function') {
      this.unsubscribers.push(unsubscribe);
    }
  }

  installInputBoundaries() {
    const router = this.renderFacade.getInputRouter();
    const layers = this.renderFacade.getPixiLayers();
    this.pageSwipeRegistration =
      router?.registerPageSwipe?.({
        id: 'pages.navigation',
        displayObject: layers?.pageUi,
        enabled: () => this.mounted,
        onSwipeStart: () => {
          this.setSwipeTargetPageId(null);
          return true;
        },
        onSwipeMove: ({ movement } = {}) => {
          const deltaX = Number(movement?.screen?.x) || 0;
          this.setSwipeTargetPageId(
            deltaX === 0
              ? null
              : this.getAdjacentPageId(
                  deltaX < 0 ? 'next' : 'previous',
                ),
          );
        },
        onSwipe: ({ direction }) => this.showAdjacent(direction),
        onSwipeEnd: () => this.setSwipeTargetPageId(null),
      }) ?? null;
    router?.setBackHandler?.(() => this.handleBack());
    router?.setEscapeHandler?.(() => this.handleBack());

    const nativeHandle = this.appPlugin?.addListener?.('backButton', () => {
      router?.handleBack?.({ source: 'native' });
    });
    if (nativeHandle?.then) {
      void nativeHandle.then((handle) => {
        if (this.mounted) {
          this.nativeBackHandle = handle;
        } else {
          void handle?.remove?.();
        }
      });
    } else {
      this.nativeBackHandle = nativeHandle ?? null;
    }
  }

  async removeNativeBackHandler() {
    const handle = this.nativeBackHandle;
    this.nativeBackHandle = null;
    await handle?.remove?.();
  }

  refresh() {
    if (!this.mounted || this.refreshing) {
      this.refreshQueued = this.mounted;
      return;
    }

    this.refreshing = true;
    try {
      this.gameplayFacade?.withSnapshotCache?.(() => {
        this.gameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.gameplaySnapshot;
      });
      this.pageStates = this.pageUnlockManager.getPageStates(
        this.gameplaySnapshot,
      );
      this.notifications =
        this.devNotifications ??
        this.notificationManager.getSnapshot(this.gameplaySnapshot, {
          playerShop: this.playerShopSnapshot,
          tradeAlliance: this.tradeAllianceSnapshot,
        });

      const nextPageId = this.getUnlockedPageId(this.currentPageId);
      if (nextPageId !== this.currentPageId) {
        this.resetInventoryUiState(this.currentPageId);
        this.currentPageId = nextPageId;
        this.requireRuntime().activatePage(nextPageId);
      }

      this.refreshChrome();
      for (const pageId of PAGE_IDS) {
        if (pageId === this.currentPageId) {
          this.refreshPage(pageId, { force: true });
        } else {
          this.dirtyPageIds.add(pageId);
        }
      }
      this.syncExternalDataRetention();
    } finally {
      this.refreshing = false;
      if (this.refreshQueued) {
        this.refreshQueued = false;
        this.refresh();
      }
    }
  }

  refreshChrome() {
    if (!this.mounted) {
      return;
    }
    const runtime = this.requireRuntime();
    runtime.bindGlobalSurface(
      'chrome.top',
      this.viewModelFactory.createTopPanel({
        gameplay: this.gameplaySnapshot,
        player: this.playerSnapshot,
        pageId: this.currentPageId,
        researchTabId: this.researchTabId,
        questPreview: this.questProgressPreview,
        actions: {
          openAvatar: () =>
            this.openDialog('settings', { tab: 'avatar' }),
          openSettings: () => this.openDialog('settings'),
          openLevel: () => this.openDialog('level'),
        },
      }),
    );
    runtime.bindGlobalSurface(
      'chrome.bottom',
      this.viewModelFactory.createBottomPanel({
        currentPageId: this.currentPageId,
        pages: this.pageStates,
        notifications: projectChromeNotificationPages(
          this.notifications.pages,
          this.tutorialNotificationPolicy,
        ),
        actions: {
          showPage: (pageId) => this.show(pageId),
          onLockedPage: () => true,
        },
      }),
    );
    runtime.bindGlobalSurface(
      'chrome.chat',
      this.viewModelFactory.createWorldChatPreview(
        this.worldChatSnapshot,
        {
          visible: this.isWorldChatUnlocked(),
          onActivate: () => this.openWorldChat(),
        },
      ),
    );
  }

  isWorldChatUnlocked() {
    const level = Math.max(
      1,
      Math.floor(
        Number(
          this.gameplaySnapshot.tasks?.currentLevel ??
            this.gameplaySnapshot.playerLevel?.currentLevel,
        ) || 1,
      ),
    );
    return level >= WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL;
  }

  openWorldChat() {
    if (!this.mounted || !this.isWorldChatUnlocked()) {
      return false;
    }

    return (
      this.requireRuntime()
        .getPage('workshop')
        ?.openDialog?.(
          'worldChat',
          this.viewModelFactory.createWorldChatDialog(
            this.worldChatSnapshot,
            this.createActions().workshop,
          ),
        ) ?? false
    );
  }

  refreshOpenWorldChatDialog() {
    if (
      !this.mounted ||
      !this.requireRuntime()
        .getOpenDialogIds?.()
        ?.includes('workshop.worldChat')
    ) {
      return;
    }

    this.openWorldChat();
  }

  refreshPage(pageId, { force = false } = {}) {
    if (!this.mounted) {
      return;
    }
    if (!force && pageId !== this.currentPageId) {
      this.dirtyPageIds.add(pageId);
      return;
    }
    const runtime = this.requireRuntime();
    const actions = this.createActions();
    const pageNotification = projectPageNotificationState(
      pageId,
      this.notifications.pages?.[pageId],
      this.tutorialNotificationPolicy,
    );
    let viewModel;

    switch (pageId) {
      case 'workshop':
        viewModel = this.viewModelFactory.createWorkshop({
          gameplay: this.gameplaySnapshot,
          player: this.playerSnapshot,
          worldChat: this.worldChatSnapshot,
          leaderboard: this.leaderboardSnapshot,
          worldEventLeaderboard: this.worldEventLeaderboardSnapshot,
          tradeAlliance: this.tradeAllianceSnapshot,
          playerInbox: this.playerInboxSnapshot,
          notifications: pageNotification,
          actions: actions.workshop,
          pageStates: this.pageStates,
          dialogState: {
            bagTabId: this.workshopBagTabId,
            statsTabId: this.workshopStatsTabId,
            leaderboardTabId: this.workshopLeaderboardTabId,
          },
        });
        break;
      case 'research':
        viewModel = this.viewModelFactory.createResearch({
          gameplay: this.gameplaySnapshot,
          selectedTabId: this.researchTabId,
          actions: actions.research,
        });
        break;
      case 'prestige':
        viewModel = this.viewModelFactory.createPrestige({
          gameplay: this.gameplaySnapshot,
          selectedTabId: this.prestigeTabId,
          confirm: this.prestigeConfirm,
          actions: actions.prestige,
        });
        break;
      case 'garden':
        viewModel = this.createGardenViewModel(actions.garden);
        break;
      case 'brewing':
        viewModel = this.createBrewingViewModel(actions.brewing);
        break;
      case 'shop':
        viewModel = createShopPixiViewModel({
          gameplaySnapshot: this.gameplaySnapshot,
          playerShopSnapshot: this.playerShopSnapshot,
          notificationSnapshot: pageNotification,
          selectedTabId: this.shopTabId,
          gameplayActions: this.gameplayFacade,
          playerShopActions: this.playerShopFacade,
          actions: { ui: actions.shop },
          uiState: {
            stallItemTypeIdBySlot: Object.fromEntries(
              this.shopStallItemTypeIdBySlot,
            ),
            stallAllocationPercentBySlot: Object.fromEntries(
              this.shopStallAllocationPercentBySlot,
            ),
            stallItemKindBySlot: Object.fromEntries(
              this.shopStallItemKindBySlot,
            ),
          },
        });
        break;
      case 'guild':
        viewModel = createGuildPixiViewModel({
          gameplaySnapshot: this.gameplaySnapshot,
          selectedTabId: this.guildTabId,
          gameplayActions: this.gameplayFacade,
          actions: { ui: actions.guild },
          tabNotifications: pageNotification?.children ?? null,
        });
        break;
      default:
        return;
    }

    const projectedViewModel = projectPageViewModelNotifications(
      pageId,
      viewModel,
      this.tutorialNotificationPolicy,
      { pageNotification },
    );
    runtime.bindPage(pageId, projectedViewModel);
    this.dirtyPageIds.delete(pageId);
    return projectedViewModel;
  }

  refreshShopStallDialog(slotNumber) {
    const viewModel = this.refreshPage('shop');
    const runtime = this.requireRuntime();
    if (
      !viewModel ||
      !runtime.getOpenDialogIds?.().includes(SHOP_DIALOG_IDS.STALL)
    ) {
      return viewModel;
    }
    const stall = viewModel.shop?.traders?.stalls?.find(
      (candidate) => candidate.slotNumber === slotNumber,
    );
    if (stall) {
      runtime
        .getPage('shop')
        ?.openDialog?.(
          SHOP_DIALOG_IDS.STALL,
          stall.dialog ?? stall,
        );
    }
    return viewModel;
  }

  createActions() {
    const gameplay = this.gameplayFacade;
    return {
      workshop: {
        summonSeed: () => {
          const result = gameplay?.summonSeed?.();
          if (result?.reason === 'no_active_seed_weights') {
            this.experienceFacade?.transientEffects?.emitReward?.({
              message: 'Select a seed to drop',
              flyoutKey: 'workshop-summon-seed-selection',
            });
          }
          return result;
        },
        setSummonDropPreference: (seedKey, preference) => {
          const result = gameplay?.setSeedDropPreference?.(
            seedKey,
            preference,
          );
          this.refreshPage('workshop');
          return result ?? false;
        },
        toggleSummonAutomation: () => {
          const result = gameplay?.toggleSeedSummoningAutoEnabled?.();
          this.refreshPage('workshop');
          return result ?? false;
        },
        setSummonManaReserve: (manaReserve) => {
          const result = gameplay?.setSeedSummoningManaReserve?.(
            manaReserve,
          );
          this.refreshPage('workshop');
          return result ?? false;
        },
        fillTask: (taskId) => gameplay?.fillTask?.(taskId),
        sendWorldChat: (body) => this.worldChatFacade?.sendMessage?.(body),
        claimInboxReward: (mailKey) =>
          this.playerInboxFacade?.claimReward?.(mailKey),
        markInboxRead: (mailKey) =>
          this.playerInboxFacade?.markRead?.(mailKey),
        selectBagTab: (tabId) => {
          this.workshopBagTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_BAG_TAB_IDS,
            'currencies',
          );
          this.refreshPage('workshop');
          return true;
        },
        selectStatsTab: (tabId) => {
          this.workshopStatsTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_STATS_TAB_IDS,
            'seeds',
          );
          this.refreshPage('workshop');
          return true;
        },
        selectLeaderboardTab: (tabId) => {
          this.workshopLeaderboardTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_LEADERBOARD_TAB_IDS,
            'singlePlayer',
          );
          this.refreshPage('workshop');
          return true;
        },
        openPlayer: (player) =>
          this.globalDialogPresenter?.open?.('player', {
            player,
          }) ?? false,
        openAlliance: (alliance) =>
          this.globalDialogPresenter?.open?.('alliance', {
            alliance,
          }) ?? false,
      },
      research: {
        buyResearch: (researchId) => gameplay?.buyResearch?.(researchId),
        showLockedReason: () => false,
        selectTab: (tabId) => {
          this.researchTabId = String(tabId || 'regular');
          this.refreshPage('research');
          this.refreshChrome();
          return true;
        },
        setRunFocus: (focusId) => gameplay?.setPrestigeRunFocus?.(focusId),
      },
      prestige: {
        selectTab: (tabId) => {
          this.prestigeTabId = tabId === 'points' ? 'points' : 'main';
          this.refreshPage('prestige');
          return true;
        },
        requestPrestige: (row) => {
          this.prestigeConfirm = row?.confirm ?? row ?? null;
          this.refreshPage('prestige');
          return true;
        },
        cancelPrestige: () => {
          this.prestigeConfirm = null;
          this.refreshPage('prestige');
          return true;
        },
        completePrestige: (level) => {
          const result = gameplay?.completePrestigeMilestone?.(level);
          if (result?.ok) {
            this.prestigeConfirm = null;
          }
          return result;
        },
      },
      garden: this.createGardenActions(),
      brewing: this.createBrewingActions(),
      shop: {
        selectTab: (_legacyId, tabId) => {
          this.shopTabId = tabId ?? _legacyId ?? 'traders';
          this.refreshPage('shop');
          this.syncExternalDataRetention();
          return true;
        },
        collectCoinOffer: () => gameplay?.collectShopCoinOffer?.(),
        claimPlayerMarketProceeds: async () => {
          const result = await this.playerShopFacade?.claimProceeds?.();
          if (result?.ok && result.coin > 0) {
            gameplay?.claimPlayerShopSaleProceeds?.(
              result.coin,
              result.statsBreakdown,
            );
          }
          return result;
        },
        clearPlayerRequest: () => false,
        selectStallItem: (slotNumber, item) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopStallItemTypeIdBySlot.set(
            safeSlotNumber,
            item?.itemTypeId ?? null,
          );
          this.shopStallAllocationPercentBySlot.set(
            safeSlotNumber,
            100,
          );
          if (item?.kind) {
            this.shopStallItemKindBySlot.set(
              safeSlotNumber,
              item.kind,
            );
          }
          this.refreshShopStallDialog(safeSlotNumber);
          return {
            ok: true,
            slotNumber: safeSlotNumber,
            itemTypeId: item?.itemTypeId ?? null,
          };
        },
        setStallAllocationDraft: (
          slotNumber,
          percentage,
          item,
        ) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          const safePercentage = Math.max(
            0,
            Math.min(
              100,
              Math.round((Number(percentage) || 0) / 5) * 5,
            ),
          );
          if (item?.itemTypeId !== undefined) {
            this.shopStallItemTypeIdBySlot.set(
              safeSlotNumber,
              item.itemTypeId,
            );
          }
          this.shopStallAllocationPercentBySlot.set(
            safeSlotNumber,
            safePercentage,
          );
          this.refreshShopStallDialog(safeSlotNumber);
          return {
            ok: true,
            slotNumber: safeSlotNumber,
            percentage: safePercentage,
          };
        },
        selectStallItemKind: (slotNumber, kind) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopStallItemKindBySlot.set(
            safeSlotNumber,
            String(kind ?? ''),
          );
          this.refreshShopStallDialog(safeSlotNumber);
          return true;
        },
        markStall: (slotNumber, item, percentage) => {
          const selected = gameplay?.selectShopShelfSlot?.(
            slotNumber,
          );
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result =
            gameplay?.setSelectedShopShelfSlotAllocation?.(
              item?.itemTypeId,
              percentage,
            );
          if (result?.ok) {
            this.requireRuntime().closeDialog(
              SHOP_DIALOG_IDS.STALL,
            );
          }
          return result;
        },
        clearStall: (slotNumber) => {
          const selected = gameplay?.selectShopShelfSlot?.(
            slotNumber,
          );
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result =
            gameplay?.clearSelectedShopShelfSlot?.();
          if (result?.ok) {
            this.shopStallItemTypeIdBySlot.delete(slotNumber);
            this.shopStallAllocationPercentBySlot.delete(slotNumber);
            this.requireRuntime().closeDialog(
              SHOP_DIALOG_IDS.STALL,
            );
          }
          return result;
        },
        toggleStallFuture: (
          slotNumber,
          item,
          enabled,
        ) => {
          const selected = gameplay?.selectShopShelfSlot?.(
            slotNumber,
          );
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result =
            gameplay?.setSelectedShopShelfFutureItem?.(
              item?.itemTypeId,
              enabled,
            );
          if (result?.ok) {
            this.requireRuntime().closeDialog(
              SHOP_DIALOG_IDS.STALL,
            );
          }
          return result;
        },
      },
      guild: {
        selectTab: (tabId) => {
          this.guildTabId = String(tabId || 'hall');
          this.refreshPage('guild');
          return true;
        },
        createGuild: (profile) => gameplay?.createGuild?.(profile),
        updateGuildProfile: (profile) =>
          gameplay?.updateGuildProfile?.(profile),
        upgradeGuildSecretary: () => gameplay?.upgradeGuildSecretary?.(),
        postRequest: (requestId) => gameplay?.postGuildRequest?.(requestId),
        postGuildRequest: (requestId) =>
          gameplay?.postGuildRequest?.(requestId),
        removeRequest: (requestId) =>
          gameplay?.removeGuildRequest?.(requestId),
        removeGuildRequest: (requestId) =>
          gameplay?.removeGuildRequest?.(requestId),
        hireApplicant: (applicantId) =>
          gameplay?.hireGuildApplicant?.(applicantId),
        fireAdventurer: (adventurerId) =>
          gameplay?.fireGuildAdventurer?.(adventurerId),
      },
    };
  }

  createGardenViewModel(actions) {
    const garden = this.gameplaySnapshot.garden ?? {};
    const plot = garden.plot ?? {};
    const notificationContext = getGardenNotificationContext(
      this.gameplaySnapshot,
    );
    const tiles = (plot.tiles ?? []).map((tile) =>
      createGardenPlotModel({
        tile,
        plot,
        coin: this.gameplaySnapshot.coin,
        ...notificationContext,
      }),
    );
    const herbs = garden.herbs ?? [];
    const seeds = garden.seeds ?? [];

    return {
      garden: {
        ...garden,
        now: Date.now(),
        maxPlots: plot.maxTiles ?? tiles.length,
        plots: tiles,
        world: this.worldViewportByPage.get('garden') ?? {},
        inventory: {
          activeTab: this.gardenInventoryTabId,
          herbs: this.createInventoryPanelModel(
            'garden',
            'herbs',
            herbs,
          ),
          seeds: this.createInventoryPanelModel(
            'garden',
            'seeds',
            seeds,
          ),
        },
      },
      actions,
    };
  }

  createGardenActions() {
    const gameplay = this.gameplayFacade;
    return {
      activatePlot: (plot) => {
        if (plot?.unlocked === false) {
          if (plot.disabled === true) {
            return {
              ok: false,
              reason: plot.lockReason ?? 'tile_locked',
            };
          }
          if (plot.affordable === false) {
            return {
              ok: false,
              reason: 'insufficient_coin',
              cost: plot.costCoin,
              missingCoin: plot.missingCoin,
              tileNumber: plot.tileNumber,
            };
          }
          return gameplay?.buyGardenTile?.();
        }
        if (plot?.phase === 'ready') {
          return gameplay?.startGardenHarvest?.(plot.tileNumber);
        }
        if (plot?.phase === 'empty') {
          if (
            plot.selectedSeedItemTypeId &&
            plot.canPlantSelectedSeed === true
          ) {
            return gameplay?.plantSelectedGardenSeed?.(plot.tileNumber);
          }
          return this.openGardenSeedDialog(plot);
        }
        if (plot?.process) {
          return this.openGardenConfirmDialog('cancel', plot);
        }
        return this.openGardenSeedDialog(plot);
      },
      activatePlotLabel: (plot) =>
        plot?.process
          ? this.openGardenConfirmDialog('cancel', plot)
          : this.openGardenSeedDialog(plot),
      dropSeed: (seed, plot) =>
        !canUseGardenSeedOnPlot(seed, plot)
          ? { ok: false, reason: 'not_enough_seed' }
          : plot?.phase === 'growing'
          ? this.openGardenConfirmDialog('swap', {
              ...plot,
              seedTypeId: seed?.itemTypeId,
            })
          : gameplay?.plantGardenSeed?.(
              plot?.tileNumber,
              seed?.itemTypeId,
            ),
      toggleInventory: (tabId) => {
        this.gardenInventoryTabId =
          this.gardenInventoryTabId === tabId ? null : tabId;
        this.resetInventoryExpansion('garden');
        this.refreshPage('garden');
        return true;
      },
      toggleInventoryExpanded: (kind) =>
        this.toggleInventoryExpanded('garden', kind),
      selectSeed: (seed, plot) => {
        const result = gameplay?.selectGardenSeed?.(
          plot?.tileNumber,
          seed?.itemTypeId ?? null,
        );
        if (result?.ok === true) {
          this.requireRuntime().closeDialog?.('garden.seed');
        }
        return result;
      },
      confirmCancel: (plot) =>
        gameplay?.cancelGardenPlanting?.(plot?.tileNumber),
      confirmSwap: (plot) =>
        gameplay?.replaceGardenSeed?.(
          plot?.tileNumber,
          plot?.seedTypeId,
        ),
      closeDialog: () => true,
      setWorldViewport: (viewport) => {
        this.worldViewportByPage.set('garden', {
          ...viewport,
          controlled: true,
        });
      },
    };
  }

  openGardenSeedDialog(plot) {
    const rows = createGardenSeedDialogRows(
      this.gameplaySnapshot,
      plot,
    );
    return this.requireRuntime()
      .getPage('garden')
      .openDialog('seed', {
        open: true,
        title: 'choose seed',
        plot,
        rows,
      });
  }

  openGardenConfirmDialog(kind, plot) {
    return this.requireRuntime()
      .getPage('garden')
      .openDialog(kind, {
        title: kind === 'swap' ? 'swap seed?' : 'cancel progress?',
        message:
          kind === 'swap'
            ? 'replace the growing seed?'
            : 'return this plot to empty?',
        confirmLabel: kind === 'swap' ? 'swap' : 'empty',
        payload: plot,
        onConfirm: () =>
          kind === 'swap'
            ? this.gameplayFacade?.replaceGardenSeed?.(
                plot?.tileNumber,
                plot?.seedTypeId,
              )
            : this.gameplayFacade?.cancelGardenPlanting?.(
                plot?.tileNumber,
              ),
      });
  }

  createBrewingViewModel(actions) {
    const brewingSnapshot = this.gameplaySnapshot.brewing ?? {};
    const brewing = {
      ...brewingSnapshot,
      recipes: this.decorateBrewingRecipes(brewingSnapshot.recipes),
    };
    const cauldrons = [...(brewing.cauldrons ?? [])].map((cauldron) =>
      this.decorateCauldron(cauldron, brewing),
    );
    if (
      Number.isInteger(brewing.nextCauldronNumber) &&
      brewing.nextCauldronNumber > cauldrons.length
    ) {
      const nextCauldronCost = Number(brewing.nextCauldronCost);
      const cauldronGateOpen =
        !brewing.nextCauldronLockedByLevel &&
        !brewing.nextCauldronLockedByResearch;
      const canAffordCauldron =
        Number.isFinite(nextCauldronCost) &&
        Number(this.gameplaySnapshot.coin?.current ?? 0) >= nextCauldronCost;
      cauldrons.push({
        id: `buy:${brewing.nextCauldronNumber}`,
        cauldronIndex: brewing.nextCauldronNumber - 1,
        cauldronNumber: brewing.nextCauldronNumber,
        unlocked: false,
        canBuyCauldron: cauldronGateOpen && canAffordCauldron,
        canAffordCauldron,
        nextCauldronCost: brewing.nextCauldronCost,
        nextCauldronLockedByLevel: brewing.nextCauldronLockedByLevel,
        nextCauldronLockedByResearch:
          brewing.nextCauldronLockedByResearch,
        nextCauldronRequiresLevel: brewing.nextCauldronRequiresLevel,
        nextCauldronRequiresResearchId:
          brewing.nextCauldronRequiresResearchId,
      });
    }
    const potions = (this.gameplaySnapshot.inventory ?? []).filter(
      (item) => item.kind === 'potion',
    );
    const herbs = brewing.herbs ?? [];

    return {
      brewing: {
        ...brewing,
        now: Date.now(),
        cauldrons,
        selectedCauldronIndex: Math.min(
          this.selectedBrewingCauldronIndex,
          Math.max(0, cauldrons.length - 1),
        ),
        world: this.worldViewportByPage.get('brewing') ?? {},
        inventory: {
          activeTab: this.brewingInventoryTabId,
          herbs: this.createInventoryPanelModel(
            'brewing',
            'herbs',
            herbs,
          ),
          potions: this.createInventoryPanelModel(
            'brewing',
            'potions',
            potions,
          ),
        },
      },
      actions,
    };
  }

  decorateCauldron(cauldron, brewing) {
    const index = Math.max(
      0,
      Math.floor(Number(cauldron?.cauldronIndex) || 0),
    );
    const selectedRecipe = this.selectedRecipeByCauldron.get(index) ?? null;
    const herbsByKey = new Map(
      (brewing.herbs ?? []).map((herb) => [herb.key, herb]),
    );
    const decoratedRecipe = selectedRecipe
      ? {
          ...selectedRecipe,
          ingredients: (selectedRecipe.ingredients ?? []).map((ingredient) => ({
            ...ingredient,
            owned:
              herbsByKey.get(ingredient.itemKey ?? ingredient.key)?.quantity ??
              0,
          })),
        }
      : null;
    const primaryAction = cauldron.activeBrew?.canStartBottling
      ? {
          id: 'bottle',
          label: 'bottle',
          enabled: true,
        }
      : {
          id: 'brew',
          label: `brew x${cauldron.brewQuantity ?? 1}`,
          enabled: cauldron.canBrew === true,
        };
    return {
      ...cauldron,
      id: cauldron.id ?? index,
      unlocked: true,
      selectedRecipe: decoratedRecipe,
      primaryAction,
      recipesDialog: {
        title: 'recipes',
        cauldronIndex: index,
        recipes: brewing.recipes ?? [],
      },
      acceptsHerbDrop: cauldron.canAddIngredient === true,
    };
  }

  decorateBrewingRecipes(recipes) {
    return (recipes ?? []).map((recipe) => {
      if (
        recipe?.unlocked === true ||
        recipe?.unknown === true ||
        recipe?.known === false ||
        recipe?.discoveryType === 'unknown'
      ) {
        return {
          ...recipe,
          canResearch: false,
        };
      }
      const researchId =
        recipe.researchId ??
        (recipe.key ? `unlockRecipe:${recipe.key}` : null);
      const research = findResearchSnapshot(
        this.gameplaySnapshot.research,
        researchId,
      );
      return {
        ...recipe,
        researchId,
        canResearch: research?.canResearch === true,
      };
    });
  }

  openBrewingRecipesDialog(cauldronIndex = 0) {
    return (
      this.requireRuntime()
        .getPage('brewing')
        .openDialog('recipes', {
          open: true,
          title: 'recipes',
          cauldronIndex,
          recipes: this.decorateBrewingRecipes(
            this.gameplaySnapshot.brewing?.recipes,
          ),
        }) ?? false
    );
  }

  createBrewingActions() {
    const gameplay = this.gameplayFacade;
    return {
      selectCauldron: (cauldronIndex) => {
        this.selectedBrewingCauldronIndex = Math.max(
          0,
          Math.floor(Number(cauldronIndex) || 0),
        );
        this.refreshPage('brewing');
        return true;
      },
      openRecipes: (cauldronIndex) =>
        this.openBrewingRecipesDialog(cauldronIndex),
      researchRecipe: (recipe, cauldronIndex = 0) => {
        if (recipe?.canResearch !== true || !recipe?.researchId) {
          return false;
        }
        const result = gameplay?.buyResearch?.(recipe.researchId);
        if (result?.ok === true) {
          this.openBrewingRecipesDialog(cauldronIndex);
        }
        return result ?? false;
      },
      selectRecipe: (recipe, cauldronIndex = 0) => {
        const key = recipe?.key ?? recipe?.id ?? null;
        this.selectedRecipeByCauldron.set(cauldronIndex, recipe ?? null);
        const result = key
          ? gameplay?.prepareBrewingRecipe?.(key, cauldronIndex)
          : gameplay?.setBrewingAutoBrewRecipe?.(null, cauldronIndex);
        this.requireRuntime().closeDialog?.('brewing.recipes');
        return result;
      },
      performCauldronAction: (cauldron, action) => {
        const index = cauldron?.cauldronIndex ?? 0;
        if (cauldron?.unlocked === false || action?.id === 'buy') {
          return gameplay?.buyBrewingCauldron?.();
        }
        if (action?.id === 'bottle' || cauldron?.activeBrew?.canStartBottling) {
          return gameplay?.startBrewingBottling?.(index);
        }
        if (action?.id === 'fill' && cauldron?.selectedRecipe?.key) {
          return gameplay?.prepareBrewingRecipe?.(
            cauldron.selectedRecipe.key,
            index,
          );
        }
        return gameplay?.brewCauldron?.(index);
      },
      selectBrewQuantity: (quantity, cauldronIndex) =>
        gameplay?.setBrewingBrewQuantity?.(quantity, cauldronIndex),
      toggleAutoBrew: (cauldronIndex) =>
        gameplay?.toggleBrewingAutoBrewEnabled?.(cauldronIndex),
      toggleAutoCollect: (cauldronIndex) =>
        gameplay?.toggleBrewingAutoCollectEnabled?.(cauldronIndex),
      cancelBrew: (cauldronIndex) =>
        gameplay?.cancelBrewing?.(cauldronIndex),
      collectBrew: (cauldronIndex) =>
        gameplay?.collectBrewing?.(cauldronIndex),
      addHerb: (herb, cauldron) =>
        gameplay?.addBrewingIngredient?.(
          herb?.itemTypeId,
          cauldron?.cauldronIndex ?? 0,
        ),
      dropHerb: (herb, cauldron) =>
        gameplay?.addBrewingIngredient?.(
          herb?.itemTypeId,
          cauldron?.cauldronIndex ?? 0,
        ),
      addIngredient: (herb, cauldron) =>
        gameplay?.addBrewingIngredient?.(
          herb?.itemTypeId,
          cauldron?.cauldronIndex ?? 0,
        ),
      removeIngredient: (ingredient, cauldron) =>
        gameplay?.removeBrewingIngredientAt?.(
          ingredient?.slotIndex,
          cauldron?.cauldronIndex ?? 0,
        ),
      toggleInventory: (tabId) => {
        this.brewingInventoryTabId =
          this.brewingInventoryTabId === tabId ? null : tabId;
        this.resetInventoryExpansion('brewing');
        this.refreshPage('brewing');
        return true;
      },
      toggleInventoryExpanded: (kind) =>
        this.toggleInventoryExpanded('brewing', kind),
      inspectPotion: () => true,
      closeDialog: () => true,
      setWorldViewport: (viewport) => {
        this.worldViewportByPage.set('brewing', {
          ...viewport,
          controlled: true,
          touched: true,
        });
      },
      clearRecipe: (cauldronIndex) => {
        this.selectedRecipeByCauldron.delete(cauldronIndex);
        return gameplay?.clearBrewingCauldron?.(cauldronIndex);
      },
      chooseAnother: (cauldronIndex) =>
        this.openBrewingRecipesDialog(cauldronIndex),
    };
  }

  show(pageId) {
    if (!this.mounted) {
      return false;
    }
    const state = this.pageStates.find((page) => page.id === pageId);
    if (!state || state.visible === false || !SWIPE_PAGE_IDS.has(pageId)) {
      return false;
    }
    if (state.unlocked === false) {
      this.requireRuntime()
        .getGlobalSurface('chrome.bottom')
        .showLockedPage?.(pageId, state);
      return false;
    }
    if (this.currentPageId === pageId) {
      if (this.dirtyPageIds.has(pageId)) {
        this.refreshPage(pageId, { force: true });
      }
      return true;
    }
    this.resetInventoryUiState(this.currentPageId);
    this.currentPageId = pageId;
    this.requireRuntime().activatePage(pageId);
    this.refreshChrome();
    this.refreshPage(pageId, { force: true });
    this.syncExternalDataRetention();
    return true;
  }

  createInventoryPanelModel(pageId, kind, rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const expanded = this.isInventoryExpanded(pageId, kind);
    const total = safeRows.length;
    const visibleCount = expanded
      ? total
      : Math.min(total, COLLAPSED_INVENTORY_ITEM_COUNT);

    return {
      rows: safeRows,
      expanded,
      canToggle: total > COLLAPSED_INVENTORY_ITEM_COUNT,
      countText: `${visibleCount}/${total}`,
    };
  }

  toggleInventoryExpanded(pageId, kind) {
    if (!INVENTORY_KINDS_BY_PAGE[pageId]?.includes(kind)) {
      return false;
    }

    const expandedKinds =
      this.expandedInventoryKindsByPage.get(pageId) ?? new Set();
    if (expandedKinds.has(kind)) {
      expandedKinds.delete(kind);
    } else {
      expandedKinds.add(kind);
    }

    if (expandedKinds.size > 0) {
      this.expandedInventoryKindsByPage.set(pageId, expandedKinds);
    } else {
      this.expandedInventoryKindsByPage.delete(pageId);
    }
    this.refreshPage(pageId);
    return true;
  }

  isInventoryExpanded(pageId, kind) {
    return this.expandedInventoryKindsByPage.get(pageId)?.has(kind) === true;
  }

  resetInventoryExpansion(pageId) {
    return this.expandedInventoryKindsByPage.delete(pageId);
  }

  resetInventoryUiState(pageId) {
    if (pageId === 'garden') {
      this.gardenInventoryTabId = null;
    } else if (pageId === 'brewing') {
      this.brewingInventoryTabId = null;
    } else {
      return false;
    }

    this.resetInventoryExpansion(pageId);
    this.dirtyPageIds.add(pageId);
    return true;
  }

  showAdjacent(direction) {
    const nextPageId = this.getAdjacentPageId(direction);
    return nextPageId ? this.show(nextPageId) : false;
  }

  getAdjacentPageId(direction) {
    const visible = this.pageStates
      .filter(
        (page) =>
          page.visible !== false &&
          SWIPE_PAGE_IDS.has(page.id),
      )
      .map((page) => page.id);
    const index = visible.indexOf(this.currentPageId);
    const offset = direction === 'previous' ? -1 : 1;
    return index < 0 ? null : visible[index + offset] ?? null;
  }

  setSwipeTargetPageId(pageId) {
    if (!this.mounted) {
      return false;
    }
    return (
      this.requireRuntime()
        .getGlobalSurface('chrome.bottom')
        .setSwipeTargetPageId?.(pageId) ?? false
    );
  }

  handleBack() {
    const runtime = this.requireRuntime();
    if (runtime.getOpenDialogIds().length > 0) {
      return runtime.closeTopDialog();
    }
    if (this.currentPageId !== 'workshop') {
      return this.show('workshop');
    }
    return false;
  }

  syncExternalDataRetention() {
    if (!this.mounted) {
      return;
    }
    const shouldRetainNpc = this.currentPageId === 'shop';
    if (shouldRetainNpc && !this.releaseNpcMarket) {
      this.releaseNpcMarket =
        this.npcMarketFacade?.retainPrices?.() ??
        this.npcMarketFacade?.retainPublicData?.() ??
        null;
    } else if (!shouldRetainNpc && this.releaseNpcMarket) {
      this.releaseNpcMarket();
      this.releaseNpcMarket = null;
    }

    const shouldRetainPlayers =
      this.currentPageId === 'shop' && this.shopTabId === 'players';
    if (shouldRetainPlayers && !this.releasePlayerMarket) {
      this.releasePlayerMarket =
        this.playerShopFacade?.retainMarketData?.() ??
        this.playerShopFacade?.retainPublicData?.() ??
        null;
    } else if (!shouldRetainPlayers && this.releasePlayerMarket) {
      this.releasePlayerMarket();
      this.releasePlayerMarket = null;
    }

    const shouldRetainTradeAlliance = this.currentPageId === 'workshop';
    if (
      shouldRetainTradeAlliance &&
      !this.releaseTradeAlliancePublic
    ) {
      this.releaseTradeAlliancePublic =
        this.tradeAllianceFacade?.retainPublicData?.() ?? null;
    } else if (
      !shouldRetainTradeAlliance &&
      this.releaseTradeAlliancePublic
    ) {
      this.releaseTradeAlliancePublic();
      this.releaseTradeAlliancePublic = null;
    }
  }

  releaseExternalData() {
    this.releaseNpcMarket?.();
    this.releaseNpcMarket = null;
    this.releasePlayerMarket?.();
    this.releasePlayerMarket = null;
    this.releaseTradeAlliancePublic?.();
    this.releaseTradeAlliancePublic = null;
  }

  getUnlockedPageId(pageId) {
    const requested = this.pageStates.find(
      (page) => page.id === pageId && page.unlocked,
    );
    if (requested && SWIPE_PAGE_IDS.has(requested.id)) {
      return requested.id;
    }
    return this.pageStates.some(
      (page) => page.id === 'workshop' && page.unlocked,
    )
      ? 'workshop'
      : this.pageStates.find(
          (page) => page.unlocked && SWIPE_PAGE_IDS.has(page.id),
        )?.id ?? 'workshop';
  }

  getCurrentPageId() {
    return this.currentPageId;
  }

  setTopPanelQuestProgressPreview(progress = null) {
    if (!this.mounted) {
      return { ok: false, reason: 'pages_not_mounted' };
    }
    this.questProgressPreview = progress;
    this.refreshChrome();
    return { ok: true, progress };
  }

  setDevNotifications(snapshot) {
    this.devNotifications =
      snapshot?.pages
        ? snapshot
        : this.notificationManager.getSnapshot(this.gameplaySnapshot);
    if (snapshot?.pages) {
      this.devNotifications = snapshot;
    }
    this.refresh();
    return { ok: true, snapshot: this.devNotifications };
  }

  clearDevNotifications() {
    this.devNotifications = null;
    this.refresh();
    return { ok: true, snapshot: this.notifications };
  }

  openDialog(dialogId, options = {}) {
    if (!this.mounted) {
      return { ok: false, reason: 'pages_not_mounted' };
    }
    const normalized = normalizeDialogId(dialogId);
    if (
      normalized === 'featureunlockannouncement' ||
      normalized === 'featureunlocks'
    ) {
      return (
        this.announcementPresenter?.showFeatureUnlockPreview?.(
          options,
        ) ?? {
          ok: false,
          reason: 'announcements_missing',
        }
      );
    }
    const target = DEV_DIALOG_TARGETS[normalized];
    if (!target) {
      return { ok: false, reason: 'unknown_dialog', dialogId };
    }

    if (target.pageId) {
      this.show(target.pageId);
    }
    const page = target.pageId
      ? this.requireRuntime().getPage(target.pageId)
      : null;
    const resolvedOptions = {
      ...(target.options ?? {}),
      ...(options ?? {}),
    };
    const opened = target.pageMethod
      ? page?.openDialog?.(target.pageMethod, resolvedOptions)
      : this.globalDialogPresenter?.open?.(
          target.dialogId,
          resolvedOptions,
        ) ??
        this.requireRuntime().openDialog?.(
          target.dialogId,
          resolvedOptions,
        );
    return opened === false
      ? { ok: false, reason: 'dialog_unavailable', dialogId }
      : {
          ok: true,
          dialogId: target.resultId ?? dialogId,
          ...(resolvedOptions.tab
            ? { tabId: resolvedOptions.tab }
            : {}),
        };
  }

  resetTutorialProgress() {
    return this.experienceFacade?.resetTutorialProgress?.() ?? false;
  }

  resetFirstRunIntroProgress() {
    return (
      this.experienceFacade?.resetFirstRunIntroProgress?.() ?? false
    );
  }

  showFirstRunIntroPreview(options = {}) {
    return (
      this.experienceFacade?.showFirstRunIntroPreview?.(options) ?? {
        ok: false,
        reason: 'intro_missing',
      }
    );
  }

  listTutorialStages() {
    return (
      this.experienceFacade?.listTutorialStages?.() ?? {
        ok: false,
        reason: 'tutorial_missing',
      }
    );
  }

  setTutorialStage(stageId) {
    return (
      this.experienceFacade?.setTutorialStage?.(stageId) ?? {
        ok: false,
        reason: 'tutorial_missing',
      }
    );
  }

  applyTutorialNotificationVisibilityPolicy(policy = null) {
    this.tutorialNotificationPolicy =
      normalizeTutorialNotificationPolicy(policy);
    if (this.mounted) {
      this.refresh();
    }
    return this.tutorialNotificationPolicy;
  }

  requireRuntime() {
    const runtime = this.renderFacade.getUiRuntime();
    if (!runtime?.initialized) {
      throw new Error(
        'PixiPagesFacade requires RenderFacade.initialize() before mounting.',
      );
    }
    return runtime;
  }
}

function createGardenPlotModel({
  tile = {},
  plot = {},
  coin = {},
  seedQuantityById = new Map(),
  hasPlantableSeed = false,
} = {}) {
  const unlocked = tile.unlocked !== false;
  const nextLockedTile =
    !unlocked && tile.tileNumber === plot.nextTileNumber;
  const lockedByLevel =
    nextLockedTile && plot.nextTileLockedByLevel === true;
  const lockedByResearch =
    nextLockedTile && plot.nextTileLockedByResearch === true;
  const costCoin = Number(plot.nextTileCost);
  const currentCoin = Number(coin?.current ?? 0);
  const affordable =
    !nextLockedTile ||
    !Number.isFinite(costCoin) ||
    currentCoin >= costCoin;
  const selectedSeedRequirement = Math.max(
    1,
    Math.floor(Number(tile.level) || 1),
  );
  const selectedSeedQuantity = tile.selectedSeedItemTypeId
    ? Number(seedQuantityById.get(tile.selectedSeedItemTypeId) ?? 0)
    : 0;
  const hasSelectedSeed = Boolean(tile.selectedSeedItemTypeId);
  const canPlantSelectedSeed =
    hasSelectedSeed &&
    selectedSeedQuantity >= selectedSeedRequirement;
  let label = tile.label;
  let labelResource = tile.labelResource;
  let actionText = tile.actionText;
  let actionResource = tile.actionResource;

  if (!unlocked) {
    label = '';
    actionText = nextLockedTile
      ? formatGardenLockedPlotAction(plot)
      : '';
    actionResource =
      nextLockedTile &&
      !lockedByLevel &&
      !lockedByResearch &&
      affordable &&
      Number.isFinite(costCoin) &&
      costCoin > 0
        ? 'coin'
        : null;
  } else if (tile.phase === 'empty') {
    label = hasSelectedSeed
      ? tile.selectedHerbLabel ??
        stripSeedSuffix(tile.selectedSeedLabel) ??
        'empty'
      : 'choose';
    labelResource = hasSelectedSeed ? 'herb' : null;
    actionText = hasSelectedSeed
      ? canPlantSelectedSeed
        ? selectedSeedRequirement > 1
          ? `plant x${selectedSeedRequirement}`
          : 'plant'
        : selectedSeedRequirement > 1
          ? `no x${selectedSeedRequirement} seed`
          : 'no seeds'
      : 'empty';
    actionResource = null;
  }

  return {
    ...tile,
    id: tile.id ?? tile.tileNumber,
    soilLevel: tile.level ?? 1,
    progress: tile.process,
    hidden: !unlocked && !nextLockedTile,
    buySlot: nextLockedTile,
    disabled:
      tile.disabled === true ||
      (!unlocked &&
        (!nextLockedTile || lockedByLevel || lockedByResearch)),
    lockReason: lockedByLevel
      ? 'level_locked'
      : lockedByResearch
        ? 'research_locked'
        : null,
    costCoin: Number.isFinite(costCoin) ? costCoin : null,
    affordable,
    missingCoin:
      nextLockedTile && Number.isFinite(costCoin)
        ? Math.max(0, costCoin - currentCoin)
        : 0,
    showNumber: nextLockedTile ? false : tile.showNumber,
    showLevel: nextLockedTile ? false : tile.showLevel,
    label,
    labelResource,
    actionText,
    actionResource,
    selectedSeedRequirement,
    selectedSeedQuantity,
    hasSelectedSeed,
    canPlantSelectedSeed,
    notification:
      tile.notification === true ||
      hasGardenTileNotification({
        tile,
        plot,
        coin,
        seedQuantityById,
        hasPlantableSeed,
      }),
    acceptsSeedDrop:
      unlocked &&
      (tile.phase === 'empty' || tile.phase === 'growing'),
  };
}

function formatGardenLockedPlotAction(plot = {}) {
  if (plot.nextTileLockedByLevel === true) {
    return `level ${plot.nextTileRequiresLevel}`;
  }
  if (plot.nextTileLockedByResearch === true) {
    return 'research';
  }
  const cost = Number(plot.nextTileCost);
  return `buy ${cost === 0 ? 'free' : formatCoinPriceText(cost)}`;
}

function createGardenSeedDialogRows(snapshot = {}, plot = {}) {
  const selectedSeedItemTypeId = plot?.selectedSeedItemTypeId ?? null;
  const seeds = (snapshot.garden?.seeds ?? [])
    .map((seed) => ({
      ...seed,
      researched: isItemResearched(snapshot, seed),
    }))
    .filter((seed) =>
      shouldShowItemInActionList(snapshot, seed, seed.quantity),
    );
  const orderedSeeds = [
    ...seeds.filter((seed) => Number(seed.quantity) > 0),
    ...seeds.filter(
      (seed) =>
        Number(seed.quantity) <= 0 && seed.researched === true,
    ),
  ];

  return [
    {
      id: 'empty',
      key: 'empty',
      itemTypeId: null,
      label: 'empty',
      quantity: null,
      quantityText: '',
      emptyOption: true,
      selected: Boolean(plot) && !selectedSeedItemTypeId,
      enabled: true,
      semanticId: 'garden.seed.empty',
    },
    ...orderedSeeds.map((seed) => {
      const display = getItemDisplay(snapshot, seed, seed.quantity);
      return {
        ...seed,
        id: seed.itemTypeId,
        label: display.label,
        displayLabel: display.label,
        quantityText: String(seed.quantity ?? 0),
        selected: selectedSeedItemTypeId === seed.itemTypeId,
        enabled: true,
        known: display.known,
        researched: display.researched,
        owned: display.owned,
        empty: display.empty,
        notification: Number(seed.quantity) > 0,
        itemKind: 'seed',
        itemKey: seed.key,
        icon: {
          kind: 'seed',
          key: seed.key,
        },
        semanticId: `garden.seed.${seed.key ?? seed.itemTypeId}`,
        tutorialId: seed.key ? `garden:seed:${seed.key}` : null,
      };
    }),
  ];
}

function canUseGardenSeedOnPlot(seed, plot) {
  if (
    plot?.unlocked === false ||
    !seed ||
    !Number.isFinite(Number(seed.quantity))
  ) {
    return false;
  }
  const requiredQuantity = Math.max(
    1,
    Math.floor(
      Number(plot.selectedSeedRequirement ?? plot.level) || 1,
    ),
  );
  if (Number(seed.quantity) < requiredQuantity) {
    return false;
  }
  if (plot.phase === 'empty') {
    return true;
  }
  return (
    plot.phase === 'growing' &&
    seed.itemTypeId !== plot.seedItemTypeId
  );
}

function stripSeedSuffix(label) {
  const value = String(label ?? '').trim();
  return value ? value.replace(/\s+seed$/i, '') : null;
}

function findResearchSnapshot(researchSnapshot, researchId) {
  if (!researchId) {
    return null;
  }
  const tabs = Array.isArray(researchSnapshot?.tabs)
    ? researchSnapshot.tabs
    : [{ boxes: researchSnapshot?.boxes ?? [] }];
  for (const tab of tabs) {
    for (const box of tab?.boxes ?? []) {
      const research = (box?.researches ?? []).find(
        (item) => item?.id === researchId,
      );
      if (research) {
        return research;
      }
    }
  }
  return null;
}

const DEV_DIALOG_TARGETS = Object.freeze({
  bag: { pageId: 'workshop', pageMethod: 'bag' },
  inventory: { pageId: 'workshop', pageMethod: 'bag' },
  seeds: { pageId: 'workshop', pageMethod: 'bag' },
  herbs: { pageId: 'workshop', pageMethod: 'bag' },
  potions: { pageId: 'workshop', pageMethod: 'bag' },
  summon: { pageId: 'workshop', pageMethod: 'summonInfo' },
  summoninfo: { pageId: 'workshop', pageMethod: 'summonInfo' },
  leaderboard: { pageId: 'workshop', pageMethod: 'leaderboard' },
  leaderboards: { pageId: 'workshop', pageMethod: 'leaderboard' },
  alliance: { pageId: 'workshop', pageMethod: 'alliance' },
  alliances: { pageId: 'workshop', pageMethod: 'alliance' },
  discoveries: { pageId: 'workshop', pageMethod: 'discoveries' },
  discovery: { pageId: 'workshop', pageMethod: 'discoveries' },
  personaltasks: { pageId: 'workshop', pageMethod: 'personalTasks' },
  tasks: { pageId: 'workshop', pageMethod: 'personalTasks' },
  worldevent: { pageId: 'workshop', pageMethod: 'worldEvent' },
  event: { pageId: 'workshop', pageMethod: 'worldEvent' },
  worldnotice: { pageId: 'workshop', pageMethod: 'worldEvent' },
  chat: { pageId: 'workshop', pageMethod: 'worldChat' },
  worldchat: { pageId: 'workshop', pageMethod: 'worldChat' },
  market: { pageId: 'shop', pageMethod: SHOP_DIALOG_IDS.MARKET },
  shop: { pageId: 'shop', pageMethod: SHOP_DIALOG_IDS.MARKET },
  guild: { pageId: 'guild', pageMethod: GUILD_DIALOG_IDS.CHARTER },
  guildcharter: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.CHARTER,
  },
  guildsettings: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.SETTINGS,
  },
  guildrequest: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.REQUEST,
  },
  guildrequeststack: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildquestposting: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildquests: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildadventurer: {
    pageId: 'guild',
    pageMethod: GUILD_DIALOG_IDS.ADVENTURER,
  },
  settings: { dialogId: 'global.settings' },
  configurations: {
    dialogId: 'global.settings',
    options: { tab: 'configurations' },
  },
  feedback: {
    dialogId: 'global.feedback',
    options: { tab: 'report', kind: 'feedback' },
  },
  bug: {
    dialogId: 'global.feedback',
    options: { tab: 'report', kind: 'bug' },
  },
  feature: {
    dialogId: 'global.feedback',
    options: { tab: 'report', kind: 'feature' },
  },
  level: { dialogId: 'global.level' },
  levels: { dialogId: 'global.level' },
  mail: { dialogId: 'global.inbox' },
  inbox: { dialogId: 'global.inbox' },
  player: { dialogId: 'global.player' },
  playerinfo: { dialogId: 'global.player' },
  allianceinfo: { dialogId: 'global.alliance' },
});

function normalizeDialogId(dialogId) {
  return String(dialogId ?? '')
    .trim()
    .replace(/[_\s-]/g, '')
    .toLowerCase();
}

function normalizeWorkshopTabId(tabId, allowedTabIds, fallback) {
  const normalized = String(tabId ?? '');
  return allowedTabIds.has(normalized) ? normalized : fallback;
}
