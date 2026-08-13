import { DEFAULT_PAGE_SWIPE_ORDER } from "../../../pages/managers/pageOrder.js";
import { PageUnlockManager } from "../../../pages/managers/PageUnlockManager.js";
import { automationResearchIds } from "../../../gameplay/automation/automationResearchIds.js";
import { WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL } from "../../../pages/workshop/managers/WorkshopSecondaryActionGateManager.js";
import {
  PageNotificationStateManager,
  getGardenNotificationContext,
  hasGardenTileNotification,
} from "../../../pages/notifications/managers/PageNotificationStateManager.js";
import {
  getItemDisplay,
  isItemResearched,
  shouldShowItemInActionList,
} from "../../../pages/shared/itemResearchStatus.js";
import { formatCoinPriceText } from "../../../shared/coinPrice.js";
import { PLAYER_MARKET_MAX_QUANTITY } from "../../../shared/playerMarketLimits.js";
import { BrewingPixiPage } from "../pages/brewing/index.js";
import { GardenPixiPage } from "../pages/garden/index.js";
import {
  GUILD_DIALOG_IDS,
  GuildPixiPage,
  createGuildPixiViewModel,
} from "../pages/guild/index.js";
import { PrestigePixiPage } from "../pages/prestige/index.js";
import { ResearchPixiPage } from "../pages/research/index.js";
import {
  SHOP_DIALOG_IDS,
  ShopPixiPage,
  createShopPixiViewModel,
} from "../pages/shop/index.js";
import { WorkshopPixiPage } from "../pages/workshop/index.js";
import {
  normalizeTutorialNotificationPolicy,
  projectChromeNotificationPages,
  projectPageNotificationState,
  projectPageViewModelNotifications,
} from "./PixiNotificationProjection.js";
import { PixiViewModelFactory } from "./PixiViewModelFactory.js";

const PAGE_IDS = Object.freeze([
  "workshop",
  "brewing",
  "garden",
  "research",
  "shop",
  "guild",
  "prestige",
]);

const SWIPE_PAGE_IDS = new Set(PAGE_IDS);
const COLLAPSED_INVENTORY_ITEM_COUNT = 6;
const INVENTORY_KINDS_BY_PAGE = Object.freeze({
  garden: Object.freeze(["herbs", "seeds"]),
  brewing: Object.freeze(["herbs", "potions"]),
});
const WORKSHOP_BAG_TAB_IDS = new Set([
  "currencies",
  "seeds",
  "herbs",
  "potions",
  "ingredients",
]);
const WORKSHOP_STATS_TAB_IDS = new Set(["seeds", "herbs", "potions", "coin"]);
const WORKSHOP_LEADERBOARD_TAB_IDS = new Set(["singlePlayer", "alliance"]);
const WORKSHOP_PERSONAL_TASK_TAB_IDS = new Set(["tasks", "rewards"]);
const WORKSHOP_WORLD_EVENT_TAB_IDS = new Set([
  "tasks",
  "leaderboard",
  "rewards",
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
    "Keeps every Pixi room alive, binds authoritative game state, and switches rooms without rebuilding them.";

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
    gardenHarvestSoundFacade = null,
    playerInboxFacade = null,
    playerInfoFacade = null,
    playerShopFacade = null,
    tradeAllianceFacade = null,
    npcMarketFacade = null,
    authFacade = null,
    hapticsFacade = null,
    soundSettingsFacade = null,
    uiClickSoundFacade = null,
    appPlugin = null,
    defaultPageId = "workshop",
    viewModelFactory = new PixiViewModelFactory(),
    pageUnlockManager = new PageUnlockManager({
      pageOrder: DEFAULT_PAGE_SWIPE_ORDER,
    }),
    notificationManager = new PageNotificationStateManager(),
  } = {}) {
    if (!renderFacade) {
      throw new Error("PixiPagesFacade requires the production RenderFacade.");
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
    this.gardenHarvestSoundFacade = gardenHarvestSoundFacade;
    this.playerInboxFacade = playerInboxFacade;
    this.playerInfoFacade = playerInfoFacade;
    this.playerShopFacade = playerShopFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.npcMarketFacade = npcMarketFacade;
    this.authFacade = authFacade;
    this.hapticsFacade = hapticsFacade;
    this.soundSettingsFacade = soundSettingsFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.appPlugin = appPlugin;
    this.viewModelFactory = viewModelFactory;
    this.pageUnlockManager = pageUnlockManager;
    this.notificationManager = notificationManager;
    this.defaultPageId = PAGE_IDS.includes(defaultPageId)
      ? defaultPageId
      : "workshop";
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
    this.workshopBagTabId = "currencies";
    this.workshopStatsTabId = "seeds";
    this.workshopLeaderboardTabId = "singlePlayer";
    this.workshopPersonalTasksTabId = "tasks";
    this.workshopWorldEventTabId = "tasks";
    this.workshopAllianceExpandedId = null;
    this.worldEventDonationDraft = null;
    this.researchTabId = "regular";
    this.shopTabId = "traders";
    this.shopLedgerKind = "seed";
    this.shopStallItemTypeIdBySlot = new Map();
    this.shopStallTargetQuantityBySlot = new Map();
    this.shopStallItemKindBySlot = new Map();
    this.shopSelectedRequestSlotNumber = 1;
    this.shopSelectedListingSlotNumber = 1;
    this.shopRequestDraftBySlot = new Map();
    this.shopRequestItemKindBySlot = new Map();
    this.shopListingDraftBySlot = new Map();
    this.shopListingItemKindBySlot = new Map();
    this.guildTabId = "hall";
    this.prestigeTabId = "main";
    this.gardenInventoryTabId = null;
    this.gardenSelectedSeedItemTypeId = null;
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
      questCompletionMotionCoordinator:
        context.questCompletionMotionCoordinator,
    });

    this.renderFacade
      .registerPage(
        "workshop",
        (context) => new WorkshopPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        "brewing",
        (context) => new BrewingPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        "garden",
        (context) => new GardenPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        "research",
        (context) => new ResearchPixiPage(createSharedOptions(context)),
      )
      .registerPage(
        "shop",
        (context) =>
          new ShopPixiPage({
            ...createSharedOptions(context),
            semanticRegistry: context.semanticRegistry,
            textEntryService: context.textEntryService,
          }),
      )
      .registerPage(
        "guild",
        (context) =>
          new GuildPixiPage({
            ...createSharedOptions(context),
            semanticRegistry: context.semanticRegistry,
            textEntryService: context.textEntryService,
          }),
      )
      .registerPage(
        "prestige",
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
    this.resetInventoryUiState("garden");
    this.resetInventoryUiState("brewing");
    this.dirtyPageIds = new Set(PAGE_IDS);
  }

  readInitialSnapshots() {
    this.gameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? {};
    this.playerSnapshot = this.playerFacade?.getSnapshot?.() ?? {};
    this.worldChatSnapshot = this.worldChatFacade?.getSnapshot?.() ?? {};
    this.leaderboardSnapshot = this.leaderboardFacade?.getSnapshot?.() ?? {};
    this.worldEventLeaderboardSnapshot =
      this.worldEventLeaderboardFacade?.getSnapshot?.() ?? {};
    this.playerInboxSnapshot = this.playerInboxFacade?.getSnapshot?.() ?? {};
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
        this.refreshPage("workshop");
      }),
    );
    this.trackSubscription(
      this.worldEventLeaderboardFacade?.subscribe?.((snapshot) => {
        this.worldEventLeaderboardSnapshot = snapshot ?? {};
        this.refreshPage("workshop");
      }),
    );
    this.trackSubscription(
      this.playerInboxFacade?.subscribe?.((snapshot) => {
        this.playerInboxSnapshot = snapshot ?? {};
        this.refreshPage("workshop");
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
        const availableAllianceIds = new Set(
          (this.tradeAllianceSnapshot.alliances ?? []).map((alliance) =>
            String(alliance.allianceId ?? ""),
          ),
        );
        if (
          this.tradeAllianceSnapshot.ownAlliance ||
          (this.workshopAllianceExpandedId &&
            !availableAllianceIds.has(this.workshopAllianceExpandedId))
        ) {
          this.workshopAllianceExpandedId = null;
        }
        this.refresh();
      }),
    );
  }

  trackSubscription(unsubscribe) {
    if (typeof unsubscribe === "function") {
      this.unsubscribers.push(unsubscribe);
    }
  }

  installInputBoundaries() {
    const router = this.renderFacade.getInputRouter();
    const layers = this.renderFacade.getPixiLayers();
    this.pageSwipeRegistration =
      router?.registerPageSwipe?.({
        id: "pages.navigation",
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
              : this.getAdjacentPageId(deltaX < 0 ? "next" : "previous"),
          );
        },
        onSwipe: ({ direction }) => this.showAdjacent(direction),
        onSwipeEnd: () => this.setSwipeTargetPageId(null),
      }) ?? null;
    router?.setBackHandler?.(() => this.handleBack());
    router?.setEscapeHandler?.(() => this.handleBack());

    const nativeHandle = this.appPlugin?.addListener?.("backButton", () => {
      router?.handleBack?.({ source: "native" });
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
        this.gameplaySnapshot =
          this.gameplayFacade?.getSnapshot?.() ?? this.gameplaySnapshot;
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
      "chrome.top",
      this.viewModelFactory.createTopPanel({
        gameplay: this.gameplaySnapshot,
        player: this.playerSnapshot,
        pageId: this.currentPageId,
        researchTabId: this.researchTabId,
        questPreview: this.questProgressPreview,
        actions: {
          openAvatar: () => this.openDialog("settings", { tab: "account" }),
          openAccount: () => this.openDialog("settings", { tab: "account" }),
          openSettings: () => this.openDialog("settings"),
          openLevel: () => this.openDialog("level"),
        },
      }),
    );
    runtime.bindGlobalSurface(
      "chrome.bottom",
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
      "chrome.chat",
      this.viewModelFactory.createWorldChatPreview(this.worldChatSnapshot, {
        visible: this.isWorldChatUnlocked(),
        onActivate: () => this.openWorldChat(),
      }),
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
        .getPage("workshop")
        ?.openDialog?.(
          "worldChat",
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
        ?.includes("workshop.worldChat")
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
      case "workshop":
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
            allianceExpandedId: this.workshopAllianceExpandedId,
            leaderboardTabId: this.workshopLeaderboardTabId,
            personalTasksTabId: this.workshopPersonalTasksTabId,
            worldEventTabId: this.workshopWorldEventTabId,
            worldEventDonation: this.worldEventDonationDraft,
          },
        });
        break;
      case "research":
        viewModel = this.viewModelFactory.createResearch({
          gameplay: this.gameplaySnapshot,
          selectedTabId: this.researchTabId,
          actions: actions.research,
        });
        break;
      case "prestige":
        viewModel = this.viewModelFactory.createPrestige({
          gameplay: this.gameplaySnapshot,
          selectedTabId: this.prestigeTabId,
          confirm: this.prestigeConfirm,
          actions: actions.prestige,
        });
        break;
      case "garden":
        viewModel = this.createGardenViewModel(actions.garden);
        break;
      case "brewing":
        viewModel = this.createBrewingViewModel(actions.brewing);
        break;
      case "shop":
        viewModel = createShopPixiViewModel({
          gameplaySnapshot: this.gameplaySnapshot,
          playerShopSnapshot: this.playerShopSnapshot,
          notificationSnapshot: pageNotification,
          selectedTabId: this.shopTabId,
          gameplayActions: this.gameplayFacade,
          playerShopActions: this.playerShopFacade,
          actions: { ui: actions.shop },
          uiState: {
            ledgerKind: this.shopLedgerKind,
            selectedRequestSlotNumber: this.shopSelectedRequestSlotNumber,
            stallItemTypeIdBySlot: Object.fromEntries(
              this.shopStallItemTypeIdBySlot,
            ),
            stallTargetQuantityBySlot: Object.fromEntries(
              this.shopStallTargetQuantityBySlot,
            ),
            stallItemKindBySlot: Object.fromEntries(
              this.shopStallItemKindBySlot,
            ),
            requestDraftBySlot: Object.fromEntries(this.shopRequestDraftBySlot),
            requestItemKindBySlot: Object.fromEntries(
              this.shopRequestItemKindBySlot,
            ),
            listingDraftBySlot: Object.fromEntries(this.shopListingDraftBySlot),
            listingItemKindBySlot: Object.fromEntries(
              this.shopListingItemKindBySlot,
            ),
          },
        });
        break;
      case "guild":
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
    const chromeAwareViewModel = {
      ...projectedViewModel,
      chrome: {
        ...(projectedViewModel.chrome ?? {}),
        worldChatVisible: this.isWorldChatUnlocked(),
      },
    };
    runtime.bindPage(pageId, chromeAwareViewModel);
    this.dirtyPageIds.delete(pageId);
    return chromeAwareViewModel;
  }

  refreshShopStallDialog(slotNumber) {
    const viewModel = this.refreshPage("shop");
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
        .getPage("shop")
        ?.openDialog?.(SHOP_DIALOG_IDS.STALL, stall.dialog ?? stall);
    }
    return viewModel;
  }

  refreshShopLedgerDialog() {
    const viewModel = this.refreshPage("shop");
    const runtime = this.requireRuntime();
    if (
      !viewModel ||
      !runtime.getOpenDialogIds?.().includes(SHOP_DIALOG_IDS.LEDGER)
    ) {
      return viewModel;
    }
    const ledger =
      viewModel.shop?.dialogs?.ledger ?? viewModel.shop?.traders?.ledger;
    if (ledger) {
      runtime.getPage("shop")?.openDialog?.(SHOP_DIALOG_IDS.LEDGER, ledger);
    }
    return viewModel;
  }

  refreshShopRequestDialog(slotNumber) {
    const viewModel = this.refreshPage("shop");
    const runtime = this.requireRuntime();
    if (
      !viewModel ||
      !runtime.getOpenDialogIds?.().includes(SHOP_DIALOG_IDS.REQUEST)
    ) {
      return viewModel;
    }
    const request = viewModel.shop?.players?.requests?.slots?.find(
      (candidate) => candidate.slotNumber === slotNumber,
    );
    if (request) {
      runtime
        .getPage("shop")
        ?.openDialog?.(SHOP_DIALOG_IDS.REQUEST, request.dialog ?? request);
    }
    return viewModel;
  }

  refreshShopListingDialog(slotNumber) {
    const viewModel = this.refreshPage("shop");
    const runtime = this.requireRuntime();
    if (
      !viewModel ||
      !runtime.getOpenDialogIds?.().includes(SHOP_DIALOG_IDS.LISTING)
    ) {
      return viewModel;
    }
    const listing = viewModel.shop?.players?.market?.slots?.find(
      (candidate) => candidate.slotNumber === slotNumber,
    );
    if (listing) {
      runtime
        .getPage("shop")
        ?.openDialog?.(SHOP_DIALOG_IDS.LISTING, listing.dialog ?? listing);
    }
    return viewModel;
  }

  getShopRequestSlot(slotNumber) {
    return (
      this.gameplaySnapshot?.shop?.playerRequests?.slots?.find(
        (slot) => slot.slotNumber === slotNumber,
      ) ?? {}
    );
  }

  getShopListingSlot(slotNumber) {
    return (
      this.gameplaySnapshot?.shop?.playerShelf?.slots?.find(
        (slot) => slot.slotNumber === slotNumber,
      ) ?? {}
    );
  }

  updateShopDraft(drafts, slotNumber, patch, fallbackSlot = {}) {
    const safeSlotNumber = Math.max(1, Math.floor(Number(slotNumber) || 1));
    const previous = drafts.get(safeSlotNumber) ?? fallbackSlot ?? {};
    drafts.set(safeSlotNumber, {
      ...previous,
      ...patch,
      slotNumber: safeSlotNumber,
    });
    return safeSlotNumber;
  }

  createActions() {
    const gameplay = this.gameplayFacade;
    return {
      workshop: {
        summonSeed: () => {
          const result = gameplay?.summonSeed?.();
          if (result?.reason === "no_active_seed_weights") {
            this.experienceFacade?.transientEffects?.emitReward?.({
              message: "Select a seed to drop",
              flyoutKey: "workshop-summon-seed-selection",
            });
          }
          return result;
        },
        setSummonDropPreference: (seedKey, preference) => {
          const result = gameplay?.setSeedDropPreference?.(seedKey, preference);
          this.refreshPage("workshop");
          return result ?? false;
        },
        toggleSummonAutomation: () => {
          const result = gameplay?.toggleSeedSummoningAutoEnabled?.();
          this.refreshPage("workshop");
          return result ?? false;
        },
        setSummonManaReserve: (manaReserve) => {
          const result = gameplay?.setSeedSummoningManaReserve?.(manaReserve);
          this.refreshPage("workshop");
          return result ?? false;
        },
        fillTask: (taskId) => gameplay?.fillTask?.(taskId),
        sendWorldChat: (body) => this.worldChatFacade?.sendMessage?.(body),
        openInbox: () =>
          this.globalDialogPresenter?.open?.("inbox") ?? false,
        claimInboxReward: (mailKey) =>
          this.playerInboxFacade?.claimReward?.(mailKey),
        markInboxRead: (mailKey) => this.playerInboxFacade?.markRead?.(mailKey),
        selectBagTab: (tabId) => {
          this.workshopBagTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_BAG_TAB_IDS,
            "currencies",
          );
          this.refreshPage("workshop");
          return true;
        },
        selectStatsTab: (tabId) => {
          this.workshopStatsTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_STATS_TAB_IDS,
            "seeds",
          );
          this.refreshPage("workshop");
          return true;
        },
        selectAlliance: (allianceId) => {
          const nextId = String(allianceId ?? "");
          this.workshopAllianceExpandedId =
            this.workshopAllianceExpandedId === nextId ? null : nextId;
          this.refreshPage("workshop");
          return true;
        },
        joinAlliance: (allianceId) =>
          this.tradeAllianceFacade?.joinAlliance?.(allianceId),
        applyAlliance: (allianceId) =>
          this.tradeAllianceFacade?.applyAlliance?.(allianceId),
        cancelAllianceApplication: (applicationKey) =>
          this.tradeAllianceFacade?.cancelApplication?.(applicationKey),
        selectLeaderboardTab: (tabId) => {
          this.workshopLeaderboardTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_LEADERBOARD_TAB_IDS,
            "singlePlayer",
          );
          this.refreshPage("workshop");
          return true;
        },
        selectPersonalTasksTab: (tabId) => {
          this.workshopPersonalTasksTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_PERSONAL_TASK_TAB_IDS,
            "tasks",
          );
          this.refreshPage("workshop");
          return true;
        },
        selectWorldEventTab: (tabId) => {
          this.workshopWorldEventTabId = normalizeWorkshopTabId(
            tabId,
            WORKSHOP_WORLD_EVENT_TAB_IDS,
            "tasks",
          );
          this.refreshPage("workshop");
          return true;
        },
        openWorldEventDonation: (requestId, optionKey) => {
          this.worldEventDonationDraft = {
            requestId,
            optionKey,
            amount: 1,
          };
          this.refreshPage("workshop");
          return (
            this.requireRuntime()
              .getPage("workshop")
              ?.openDialog?.("worldEventDonate") ?? false
          );
        },
        adjustWorldEventDonationAmount: (delta) => {
          if (!this.worldEventDonationDraft) {
            return false;
          }
          this.worldEventDonationDraft = {
            ...this.worldEventDonationDraft,
            amount: Math.max(
              1,
              Math.floor(Number(this.worldEventDonationDraft.amount) || 1) +
                Math.floor(Number(delta) || 0),
            ),
          };
          this.refreshPage("workshop");
          return true;
        },
        confirmWorldEventDonation: (requestId, optionKey, amount) => {
          const result = gameplay?.donateWorldNoticeResource?.(
            requestId,
            optionKey,
            amount,
          );
          if (result?.ok === true) {
            this.worldEventDonationDraft = null;
            this.requireRuntime().closeDialog?.("workshop.worldEventDonate");
            this.refreshPage("workshop");
          }
          return result ?? false;
        },
        claimPersonalTaskMilestoneReward: (periodType, threshold) =>
          gameplay?.claimPersonalTaskMilestoneReward?.(periodType, threshold),
        openPlayer: (player) =>
          this.globalDialogPresenter?.open?.("player", {
            player,
          }) ?? false,
        openAlliance: (alliance) =>
          this.globalDialogPresenter?.open?.("alliance", {
            alliance,
          }) ?? false,
      },
      research: {
        buyResearch: (researchId) => {
          const result = gameplay?.buyResearch?.(researchId);
          this.emitPurchaseSpendBurstForResult(result, {
            anchorId: `research.${researchId}`,
            resource: result?.costCurrency ?? "coin",
            amount: result?.cost,
          });
          return result;
        },
        showLockedReason: () => false,
        selectTab: (tabId) => {
          this.researchTabId = String(tabId || "regular");
          this.refreshPage("research");
          this.refreshChrome();
          return true;
        },
        setRunFocus: (focusId) => gameplay?.setPrestigeRunFocus?.(focusId),
      },
      prestige: {
        selectTab: (tabId) => {
          this.prestigeTabId = tabId === "points" ? "points" : "main";
          this.refreshPage("prestige");
          return true;
        },
        requestPrestige: (row) => {
          this.prestigeConfirm = row?.confirm ?? row ?? null;
          this.refreshPage("prestige");
          return true;
        },
        cancelPrestige: () => {
          this.prestigeConfirm = null;
          this.refreshPage("prestige");
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
          this.shopTabId = tabId ?? _legacyId ?? "traders";
          this.refreshPage("shop");
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
        selectPlayerRequestSlot: (slotNumber) => {
          this.shopSelectedRequestSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          return null;
        },
        selectRequestItem: (slotNumber, item) => {
          const safeSlotNumber = this.updateShopDraft(
            this.shopRequestDraftBySlot,
            slotNumber,
            {
              itemTypeId: item?.itemTypeId ?? null,
              itemKey: item?.key ?? null,
              itemLabel: item?.label ?? null,
              itemKind: item?.kind ?? null,
            },
            this.getShopRequestSlot(slotNumber),
          );
          if (item?.kind) {
            this.shopRequestItemKindBySlot.set(safeSlotNumber, item.kind);
          }
          this.refreshShopRequestDialog(safeSlotNumber);
          return true;
        },
        setRequestDraftField: (slotNumber, field, value) => {
          const safeSlotNumber = this.updateShopDraft(
            this.shopRequestDraftBySlot,
            slotNumber,
            { [field]: value },
            this.getShopRequestSlot(slotNumber),
          );
          this.refreshShopRequestDialog(safeSlotNumber);
          return true;
        },
        selectRequestItemKind: (slotNumber, kind) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopRequestItemKindBySlot.set(
            safeSlotNumber,
            String(kind ?? ""),
          );
          this.refreshShopRequestDialog(safeSlotNumber);
          return true;
        },
        closePlayerRequestDialog: (slotNumber) => {
          this.shopRequestDraftBySlot.delete(slotNumber);
          this.requireRuntime().closeDialog(SHOP_DIALOG_IDS.REQUEST);
          this.refreshPage("shop");
          return true;
        },
        clearPlayerRequest: async (slotNumber) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(
              Number(slotNumber ?? this.shopSelectedRequestSlotNumber) || 1,
            ),
          );
          const published =
            await this.playerShopFacade?.clearSlotRequest?.(safeSlotNumber);
          if (published === false || published?.ok === false) {
            return published;
          }
          const result = gameplay?.clearPlayerShopRequest?.(safeSlotNumber);
          if (result?.ok) {
            this.shopRequestDraftBySlot.delete(safeSlotNumber);
            this.refreshPage("shop");
          }
          return result;
        },
        selectPlayerListingSlot: (slotNumber) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopSelectedListingSlotNumber = safeSlotNumber;
          gameplay?.selectPlayerShopShelfSlot?.(safeSlotNumber);
          return null;
        },
        selectListingItem: (slotNumber, item) => {
          const slot = this.getShopListingSlot(slotNumber);
          const availableQuantity = Math.min(
            PLAYER_MARKET_MAX_QUANTITY,
            Math.max(0, Math.floor(Number(item?.quantity) || 0)) +
              (slot.itemTypeId === item?.itemTypeId
                ? Math.max(0, Math.floor(Number(slot.quantity) || 0))
                : 0),
          );
          const safeSlotNumber = this.updateShopDraft(
            this.shopListingDraftBySlot,
            slotNumber,
            {
              itemTypeId: item?.itemTypeId ?? null,
              itemKey: item?.key ?? null,
              itemLabel: item?.label ?? null,
              itemKind: item?.kind ?? null,
              quantity: Math.max(1, availableQuantity),
            },
            slot,
          );
          if (item?.kind) {
            this.shopListingItemKindBySlot.set(safeSlotNumber, item.kind);
          }
          this.refreshShopListingDialog(safeSlotNumber);
          return true;
        },
        setListingDraftField: (slotNumber, field, value) => {
          const safeSlotNumber = this.updateShopDraft(
            this.shopListingDraftBySlot,
            slotNumber,
            { [field]: value },
            this.getShopListingSlot(slotNumber),
          );
          this.refreshShopListingDialog(safeSlotNumber);
          return true;
        },
        selectListingItemKind: (slotNumber, kind) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopListingItemKindBySlot.set(
            safeSlotNumber,
            String(kind ?? ""),
          );
          this.refreshShopListingDialog(safeSlotNumber);
          return true;
        },
        closePlayerListingDialog: (slotNumber) => {
          this.shopListingDraftBySlot.delete(slotNumber);
          this.requireRuntime().closeDialog(SHOP_DIALOG_IDS.LISTING);
          this.refreshPage("shop");
          return true;
        },
        selectLedgerKind: (kind) => {
          this.shopLedgerKind = String(kind || "seed");
          this.refreshShopLedgerDialog();
          return true;
        },
        selectStallItem: (slotNumber, item) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopStallItemTypeIdBySlot.set(
            safeSlotNumber,
            item?.itemTypeId ?? null,
          );
          const shelf = gameplay?.getSnapshot?.()?.shop?.shelf;
          const slot = shelf?.slots?.find(
            (candidate) =>
              candidate?.slotNumber === safeSlotNumber,
          );
          const loadedQuantity =
            slot?.sellItemTypeId === item?.itemTypeId
              ? Math.max(
                  0,
                  Math.floor(Number(slot?.loadedQuantity) || 0),
                )
              : 0;
          this.shopStallTargetQuantityBySlot.set(
            safeSlotNumber,
            loadedQuantity +
              Math.max(0, Math.floor(Number(item?.quantity) || 0)),
          );
          if (item?.kind) {
            this.shopStallItemKindBySlot.set(safeSlotNumber, item.kind);
          }
          this.refreshShopStallDialog(safeSlotNumber);
          return {
            ok: true,
            slotNumber: safeSlotNumber,
            itemTypeId: item?.itemTypeId ?? null,
          };
        },
        setStallTargetQuantityDraft: (slotNumber, quantity, item) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          const safeQuantity = Math.max(
            0,
            Math.floor(Number(quantity) || 0),
          );
          if (item?.itemTypeId !== undefined) {
            this.shopStallItemTypeIdBySlot.set(safeSlotNumber, item.itemTypeId);
          }
          this.shopStallTargetQuantityBySlot.set(
            safeSlotNumber,
            safeQuantity,
          );
          this.refreshShopStallDialog(safeSlotNumber);
          return {
            ok: true,
            slotNumber: safeSlotNumber,
            quantity: safeQuantity,
          };
        },
        selectStallItemKind: (slotNumber, kind) => {
          const safeSlotNumber = Math.max(
            1,
            Math.floor(Number(slotNumber) || 1),
          );
          this.shopStallItemKindBySlot.set(safeSlotNumber, String(kind ?? ""));
          this.refreshShopStallDialog(safeSlotNumber);
          return true;
        },
        markStall: (slotNumber, item, quantity) => {
          const selected = gameplay?.selectShopShelfSlot?.(slotNumber);
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result = gameplay?.setSelectedShopShelfSlotQuantity?.(
            item?.itemTypeId,
            quantity,
          );
          if (result?.ok) {
            this.requireRuntime().closeDialog(SHOP_DIALOG_IDS.STALL);
          }
          return result;
        },
        clearStall: (slotNumber) => {
          const selected = gameplay?.selectShopShelfSlot?.(slotNumber);
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result = gameplay?.clearSelectedShopShelfSlot?.();
          if (result?.ok) {
            this.shopStallItemTypeIdBySlot.delete(slotNumber);
            this.shopStallTargetQuantityBySlot.delete(slotNumber);
            this.requireRuntime().closeDialog(SHOP_DIALOG_IDS.STALL);
          }
          return result;
        },
        toggleStallFuture: (slotNumber, item, enabled) => {
          const selected = gameplay?.selectShopShelfSlot?.(slotNumber);
          if (selected === false || selected?.ok === false) {
            return selected;
          }
          const result = gameplay?.setSelectedShopShelfFutureItem?.(
            item?.itemTypeId,
            enabled,
          );
          if (result?.ok) {
            this.requireRuntime().closeDialog(SHOP_DIALOG_IDS.STALL);
          }
          return result;
        },
      },
      guild: {
        selectTab: (tabId) => {
          this.guildTabId = String(tabId || "hall");
          this.refreshPage("guild");
          return true;
        },
        createGuild: (profile) => gameplay?.createGuild?.(profile),
        updateGuildProfile: (profile) =>
          gameplay?.updateGuildProfile?.(profile),
        upgradeGuildSecretary: () => gameplay?.upgradeGuildSecretary?.(),
        postRequest: (requestId) => gameplay?.postGuildRequest?.(requestId),
        postGuildRequest: (requestId) =>
          gameplay?.postGuildRequest?.(requestId),
        removeRequest: (requestId) => gameplay?.removeGuildRequest?.(requestId),
        removeGuildRequest: (requestId) =>
          gameplay?.removeGuildRequest?.(requestId),
        hireApplicant: (applicantId) =>
          gameplay?.hireGuildApplicant?.(applicantId),
        fireAdventurer: (adventurerId) =>
          gameplay?.fireGuildAdventurer?.(adventurerId),
      },
    };
  }

  emitPurchaseSpendBurstForResult(
    result,
    { anchorId, resource = "coin", amount = null } = {},
  ) {
    const spentAmount = Number(amount ?? result?.cost ?? 0);
    if (result?.ok !== true || spentAmount <= 0 || !anchorId) {
      return false;
    }
    this.uiClickSoundFacade?.playPurchase?.();
    this.experienceFacade?.transientEffects?.emitReward?.({
      visualOnly: true,
      spendBursts: [
        {
          anchorId,
          resource,
        },
      ],
    });
    return true;
  }

  createGardenViewModel(actions) {
    const garden = this.gameplaySnapshot.garden ?? {};
    const plot = garden.plot ?? {};
    const seeds = garden.seeds ?? [];
    const selectedSeed =
      seeds.find(
        (seed) => seed.itemTypeId === this.gardenSelectedSeedItemTypeId,
      ) ?? null;
    const notificationContext = getGardenNotificationContext(
      this.gameplaySnapshot,
    );
    const tiles = (plot.tiles ?? []).map((tile) =>
      createGardenPlotModel({
        tile,
        plot,
        coin: this.gameplaySnapshot.coin,
        selectedSeed,
        ...notificationContext,
      }),
    );

    return {
      garden: {
        ...garden,
        now: Date.now(),
        plots: tiles,
        actionBar: {
          canPlantAll: garden.bulkActions?.canPlantAll === true,
          canHarvestAll: garden.bulkActions?.canHarvestAll === true,
          selectedSeed: selectedSeed
            ? createGardenSelectedSeedModel(this.gameplaySnapshot, selectedSeed)
            : null,
          readyHarvestCount: tiles.filter(
            (tile) => tile.phase === "ready" && tile.hidden !== true,
          ).length,
          hasSeedChoices:
            createGardenSeedDialogRows(
              this.gameplaySnapshot,
              this.gardenSelectedSeedItemTypeId,
            ).length > 0,
        },
      },
      actions,
    };
  }

  createGardenActions() {
    const gameplay = this.gameplayFacade;
    const activatePlot = (plot) => {
      if (plot?.unlocked === false) {
        if (plot.lockReason === "research_locked") {
          return {
            ok: false,
            reason: "research_locked",
            tileNumber: plot.tileNumber,
            tooltip:
              "You need to research first to unlock buying this slot.",
          };
        }
        if (plot.disabled === true) {
          return {
            ok: false,
            reason: plot.lockReason ?? "tile_locked",
          };
        }
        if (plot.affordable === false) {
          return {
            ok: false,
            reason: "insufficient_coin",
            cost: plot.costCoin,
            missingCoin: plot.missingCoin,
            tileNumber: plot.tileNumber,
          };
        }
        const result = gameplay?.buyGardenTile?.();
        this.emitPurchaseSpendBurstForResult(result, {
          anchorId: `garden.plot.${result?.tileNumber ?? plot?.tileNumber}`,
          resource: "coin",
          amount: result?.cost,
        });
        return result;
      }
      if (plot?.phase === "ready") {
        const result = gameplay?.startGardenHarvest?.(plot.tileNumber);
        if (result?.ok === true) {
          this.gardenHarvestSoundFacade?.playHarvest?.();
        }
        return result;
      }
      if (plot?.phase === "empty") {
        if (plot.toolbarSeedItemTypeId) {
          if (!plot.canPlantSelectedSeed) {
            this.experienceFacade?.transientEffects?.emitReward?.({
              message: "no seed",
              flyoutKey: `garden-no-seed-${plot.tileNumber}`,
            });
            return {
              ok: false,
              reason: "not_enough_seed",
              tileNumber: plot.tileNumber,
            };
          }
          return gameplay?.plantGardenSeed?.(
            plot.tileNumber,
            plot.toolbarSeedItemTypeId,
          );
        }
        return this.openGardenSeedDialog();
      }
      if (plot?.phase === "growing") {
        if (!plot.toolbarSeedItemTypeId) {
          return this.openGardenSeedDialog();
        }
        if (plot.toolbarSeedItemTypeId === plot.seedItemTypeId) {
          return {
            ok: false,
            reason: "same_seed",
            tileNumber: plot.tileNumber,
          };
        }
        return this.openGardenConfirmDialog("swap", {
          ...plot,
          seedTypeId: plot.toolbarSeedItemTypeId,
        });
      }
      if (plot?.process) {
        return this.openGardenConfirmDialog("cancel", plot);
      }
      return false;
    };

    return {
      activatePlot,
      activatePlotLabel: activatePlot,
      openSeedPicker: () => this.openGardenSeedDialog(),
      plantAll: () => {
        const result = gameplay?.plantAllGardenSeeds?.(
          this.gardenSelectedSeedItemTypeId,
        ) ?? {
          ok: false,
          reason: "unavailable",
        };
        const messageByReason = {
          no_seed_selected: "Select a seed",
          no_empty_tiles: "No empty plots",
          not_enough_seed: "Not enough seeds",
        };
        const message = messageByReason[result?.reason];
        if (result?.ok !== true && message) {
          this.experienceFacade?.transientEffects?.emitReward?.({ message });
        }
        return result;
      },
      harvestAll: () => {
        const result = gameplay?.startAllReadyGardenHarvests?.() ?? {
          ok: false,
          reason: "unavailable",
        };
        if (result?.ok !== true && result?.reason === "no_ready_tiles") {
          this.experienceFacade?.transientEffects?.emitReward?.({
            message: "Nothing to harvest",
          });
        }
        return result;
      },
      selectSeed: (seed) => {
        if (!Number.isInteger(seed?.itemTypeId)) {
          return {
            ok: false,
            reason: "invalid_seed",
          };
        }
        this.gardenSelectedSeedItemTypeId = seed.itemTypeId;
        this.requireRuntime().closeDialog?.("garden.seed");
        this.refreshPage("garden");
        return {
          ok: true,
          selectedSeedItemTypeId: seed.itemTypeId,
        };
      },
      confirmCancel: (plot) =>
        gameplay?.cancelGardenPlanting?.(plot?.tileNumber),
      confirmSwap: (plot) =>
        gameplay?.replaceGardenSeed?.(plot?.tileNumber, plot?.seedTypeId),
      closeDialog: () => true,
    };
  }

  openGardenSeedDialog() {
    const rows = createGardenSeedDialogRows(
      this.gameplaySnapshot,
      this.gardenSelectedSeedItemTypeId,
    );
    return this.requireRuntime().getPage("garden").openDialog("seed", {
      open: true,
      title: "Choose Seed",
      rows,
    });
  }

  openGardenConfirmDialog(kind, plot) {
    const selectedSeed = (this.gameplaySnapshot.garden?.seeds ?? []).find(
      (seed) => seed.itemTypeId === plot?.seedTypeId,
    );
    const currentSeedLabel =
      stripSeedSuffix(plot?.seedLabel ?? plot?.selectedSeedLabel) ??
      "current crop";
    const selectedSeedLabel =
      stripSeedSuffix(selectedSeed?.label) ?? "selected seed";
    return this.requireRuntime()
      .getPage("garden")
      .openDialog(kind, {
        title: kind === "swap" ? "Swap Seed?" : "Cancel Progress?",
        message:
          kind === "swap"
            ? `Swap ${currentSeedLabel} for ${selectedSeedLabel}? Growth will restart.`
            : "Return This Plot To Empty?",
        confirmLabel: kind === "swap" ? "Swap" : "Empty",
        payload: plot,
        onConfirm: () =>
          kind === "swap"
            ? this.gameplayFacade?.replaceGardenSeed?.(
                plot?.tileNumber,
                plot?.seedTypeId,
              )
            : this.gameplayFacade?.cancelGardenPlanting?.(plot?.tileNumber),
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
      brewing.nextCauldronNumber > cauldrons.length &&
      !brewing.nextCauldronLockedByLevel &&
      !brewing.nextCauldronLockedByResearch &&
      Number.isFinite(Number(brewing.nextCauldronCost))
    ) {
      const nextCauldronCost = Number(brewing.nextCauldronCost);
      const canAffordCauldron =
        Number.isFinite(nextCauldronCost) &&
        Number(this.gameplaySnapshot.coin?.current ?? 0) >= nextCauldronCost;
      cauldrons.push({
        id: brewing.nextCauldronNumber - 1,
        cauldronIndex: brewing.nextCauldronNumber - 1,
        cauldronNumber: brewing.nextCauldronNumber,
        unlocked: false,
        canBuyCauldron: canAffordCauldron,
        canAffordCauldron,
        nextCauldronCost,
        nextCauldronLockedByLevel: brewing.nextCauldronLockedByLevel,
        nextCauldronLockedByResearch: brewing.nextCauldronLockedByResearch,
        nextCauldronRequiresLevel: brewing.nextCauldronRequiresLevel,
        nextCauldronRequiresResearchId: brewing.nextCauldronRequiresResearchId,
      });
    }
    const potions = (this.gameplaySnapshot.inventory ?? []).filter(
      (item) => item.kind === "potion",
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
        world: this.worldViewportByPage.get("brewing") ?? {},
        inventory: {
          activeTab: this.brewingInventoryTabId,
          herbs: this.createInventoryPanelModel("brewing", "herbs", herbs),
          potions: this.createInventoryPanelModel(
            "brewing",
            "potions",
            potions,
          ),
        },
      },
      actions,
    };
  }

  decorateCauldron(cauldron, brewing) {
    const index = Math.max(0, Math.floor(Number(cauldron?.cauldronIndex) || 0));
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
    const completedResearchIds = new Set(
      this.gameplaySnapshot.research?.completedResearchIds ?? [],
    );
    const autoBrewAvailable =
      cauldron.autoBrewEnabled === true ||
      completedResearchIds.has(
        automationResearchIds.autoBrewCauldron(index + 1),
      );
    const primaryAction = cauldron.activeBrew?.canStartBottling
      ? {
          id: "bottle",
          label: "bottle",
          enabled: true,
        }
      : {
          id: "brew",
          label: `brew x${cauldron.brewQuantity ?? 1}`,
          enabled: cauldron.canBrew === true,
        };
    return {
      ...cauldron,
      id: index,
      unlocked: true,
      autoBrewAvailable,
      selectedRecipe: decoratedRecipe,
      primaryAction,
      recipesDialog: {
        title: "recipes",
        cauldronIndex: index,
        recipes: brewing.recipes ?? [],
      },
      acceptsHerbDrop: cauldron.canAddIngredient === true,
    };
  }

  decorateBrewingRecipes(recipes, cauldronIndex = 0) {
    const safeCauldronIndex = Math.max(
      0,
      Math.floor(Number(cauldronIndex) || 0),
    );
    const selectedRecipe =
      this.selectedRecipeByCauldron.get(safeCauldronIndex) ?? null;

    return (recipes ?? []).map((recipe) => {
      const selected =
        recipe?.key === (selectedRecipe?.key ?? selectedRecipe?.id);
      const canSelect =
        selected ||
        (recipe?.unlocked === true &&
          this.canSelectBrewingRecipe(recipe, safeCauldronIndex));

      if (
        recipe?.unlocked === true ||
        recipe?.unknown === true ||
        recipe?.known === false ||
        recipe?.discoveryType === "unknown"
      ) {
        return {
          ...recipe,
          canResearch: false,
          canSelect,
          selected,
        };
      }
      const researchId =
        recipe.researchId ?? (recipe.key ? `unlockRecipe:${recipe.key}` : null);
      const research = findResearchSnapshot(
        this.gameplaySnapshot.research,
        researchId,
      );
      return {
        ...recipe,
        researchId,
        canResearch: research?.canResearch === true,
        canSelect: false,
        selected: false,
      };
    });
  }

  canSelectBrewingRecipe(recipe, cauldronIndex = 0) {
    const brewing = this.gameplaySnapshot.brewing ?? {};
    const safeCauldronIndex = Math.max(
      0,
      Math.floor(Number(cauldronIndex) || 0),
    );
    const cauldron =
      (brewing.cauldrons ?? []).find(
        (candidate) =>
          Math.max(
            0,
            Math.floor(Number(candidate?.cauldronIndex) || 0),
          ) === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? brewing : null);
    const brewQuantity = Math.max(
      1,
      Math.floor(Number(cauldron?.brewQuantity) || 1),
    );
    const ownedByItemTypeId = new Map();
    const ownedByKey = new Map();

    for (const herb of brewing.herbs ?? []) {
      const quantity = Math.max(0, Math.floor(Number(herb?.quantity) || 0));
      if (Number.isInteger(herb?.itemTypeId)) {
        ownedByItemTypeId.set(herb.itemTypeId, quantity);
      }
      if (typeof herb?.key === "string") {
        ownedByKey.set(herb.key, quantity);
      }
    }

    for (const otherCauldron of brewing.cauldrons ?? []) {
      const otherCauldronIndex = Math.max(
        0,
        Math.floor(Number(otherCauldron?.cauldronIndex) || 0),
      );
      if (otherCauldronIndex === safeCauldronIndex) {
        continue;
      }

      for (const ingredient of otherCauldron?.ingredients ?? []) {
        if (Number.isInteger(ingredient?.itemTypeId)) {
          ownedByItemTypeId.set(
            ingredient.itemTypeId,
            Math.max(
              0,
              (ownedByItemTypeId.get(ingredient.itemTypeId) ?? 0) - 1,
            ),
          );
        }
        const ingredientKey = ingredient?.itemKey ?? ingredient?.key;
        if (typeof ingredientKey === "string") {
          ownedByKey.set(
            ingredientKey,
            Math.max(0, (ownedByKey.get(ingredientKey) ?? 0) - 1),
          );
        }
      }
    }

    const requiredByItemTypeId = new Map();
    const requiredByKey = new Map();

    for (const ingredient of recipe?.ingredients ?? []) {
      const requiredQuantity =
        Math.max(1, Math.floor(Number(ingredient?.quantity) || 1)) *
        brewQuantity;
      if (Number.isInteger(ingredient?.itemTypeId)) {
        requiredByItemTypeId.set(
          ingredient.itemTypeId,
          (requiredByItemTypeId.get(ingredient.itemTypeId) ?? 0) +
            requiredQuantity,
        );
        continue;
      }
      const ingredientKey = ingredient?.itemKey ?? ingredient?.key;
      if (typeof ingredientKey !== "string") {
        return false;
      }
      requiredByKey.set(
        ingredientKey,
        (requiredByKey.get(ingredientKey) ?? 0) + requiredQuantity,
      );
    }

    for (const [itemTypeId, requiredQuantity] of requiredByItemTypeId) {
      if ((ownedByItemTypeId.get(itemTypeId) ?? 0) < requiredQuantity) {
        return false;
      }
    }
    for (const [key, requiredQuantity] of requiredByKey) {
      if ((ownedByKey.get(key) ?? 0) < requiredQuantity) {
        return false;
      }
    }
    return true;
  }

  openBrewingRecipesDialog(cauldronIndex = 0) {
    return (
      this.requireRuntime()
        .getPage("brewing")
        .openDialog("recipes", {
          open: true,
          title: "recipes",
          cauldronIndex,
          recipes: this.decorateBrewingRecipes(
            this.gameplaySnapshot.brewing?.recipes,
            cauldronIndex,
          ),
        }) ?? false
    );
  }

  openBrewingHerbDialog(cauldronIndex = 0, slotIndex = 0) {
    return (
      this.requireRuntime()
        .getPage("brewing")
        .openDialog("herbs", {
          open: true,
          title: "Choose Herb",
          cauldronIndex,
          slotIndex,
          rows: createBrewingHerbDialogRows(this.gameplaySnapshot),
        }) ?? false
    );
  }

  setBrewingHerbSlotQuantity(
    herb,
    quantity,
    cauldronIndex = 0,
    slotIndex = 0,
  ) {
    if (!Number.isInteger(herb?.itemTypeId)) {
      return {
        ok: false,
        reason: "invalid_herb",
      };
    }
    const result =
      this.gameplayFacade?.setBrewingIngredientSlotQuantity?.(
        herb.itemTypeId,
        quantity,
        slotIndex,
        cauldronIndex,
      ) ?? false;
    if (result?.ok !== true && result !== true) {
      return result;
    }
    return {
      ...(result === true ? { ok: true } : result),
      item: herb,
      quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
      maxQuantity: 1,
    };
  }

  createBrewingActions() {
    const gameplay = this.gameplayFacade;
    return {
      selectCauldron: (cauldronIndex) => {
        this.selectedBrewingCauldronIndex = Math.max(
          0,
          Math.floor(Number(cauldronIndex) || 0),
        );
        this.refreshPage("brewing");
        return true;
      },
      openRecipes: (cauldronIndex) =>
        this.openBrewingRecipesDialog(cauldronIndex),
      openHerbPicker: (cauldronIndex, slotIndex) =>
        this.openBrewingHerbDialog(cauldronIndex, slotIndex),
      selectHerb: (herb, cauldronIndex = 0, slotIndex = 0) => {
        const result = this.setBrewingHerbSlotQuantity(
          herb,
          1,
          cauldronIndex,
          slotIndex,
        );
        if (result === true || result?.ok === true) {
          this.requireRuntime().closeDialog?.("brewing.herbs");
        }
        return result;
      },
      researchRecipe: (recipe, cauldronIndex = 0) => {
        if (recipe?.canResearch !== true || !recipe?.researchId) {
          return false;
        }
        const result = gameplay?.buyResearch?.(recipe.researchId);
        if (result?.ok === true) {
          this.emitPurchaseSpendBurstForResult(result, {
            anchorId: `brewing.cauldron.${cauldronIndex}`,
            resource: result?.costCurrency ?? "coin",
            amount: result?.cost,
          });
          this.openBrewingRecipesDialog(cauldronIndex);
        }
        return result ?? false;
      },
      selectRecipe: (recipe, cauldronIndex = 0) => {
        const key = recipe?.key ?? recipe?.id ?? null;
        const result = key
          ? gameplay?.prepareBrewingRecipe?.(key, cauldronIndex)
          : gameplay?.setBrewingAutoBrewRecipe?.(null, cauldronIndex);
        if (result === true || result?.ok === true) {
          if (recipe) {
            this.selectedRecipeByCauldron.set(cauldronIndex, recipe);
          } else {
            this.selectedRecipeByCauldron.delete(cauldronIndex);
          }
          this.requireRuntime().closeDialog?.("brewing.recipes");
        }
        return result;
      },
      performCauldronAction: (cauldron, action) => {
        const index = cauldron?.cauldronIndex ?? 0;
        if (cauldron?.unlocked === false || action?.id === "buy") {
          const result = gameplay?.buyBrewingCauldron?.();
          this.emitPurchaseSpendBurstForResult(result, {
            anchorId: `brewing.cauldron.${index}`,
            resource: "coin",
            amount: result?.cost,
          });
          return result;
        }
        if (action?.id === "bottle" || cauldron?.activeBrew?.canStartBottling) {
          return gameplay?.startBrewingBottling?.(index);
        }
        if (action?.id === "fill" && cauldron?.selectedRecipe?.key) {
          return gameplay?.prepareBrewingRecipe?.(
            cauldron.selectedRecipe.key,
            index,
          );
        }
        return gameplay?.brewCauldron?.(index);
      },
      selectBrewQuantity: (quantity, cauldronIndex) =>
        gameplay?.setBrewingBrewQuantity?.(quantity, cauldronIndex),
      toggleAutoBrew: (cauldronIndex = 0) => {
        const index = Math.max(0, Math.floor(Number(cauldronIndex) || 0));
        const cauldron =
          (this.gameplaySnapshot.brewing?.cauldrons ?? []).find(
            (entry) => Number(entry?.cauldronIndex) === index,
          ) ?? (index === 0 ? this.gameplaySnapshot.brewing : null);
        if (cauldron?.autoBrewEnabled === true) {
          return typeof gameplay?.setBrewingAutoBrewEnabled === "function"
            ? gameplay.setBrewingAutoBrewEnabled(false, index)
            : gameplay?.toggleBrewingAutoBrewEnabled?.(index);
        }

        const selectedRecipe = this.selectedRecipeByCauldron.get(index);
        const recipeKey =
          selectedRecipe?.key ??
          selectedRecipe?.id ??
          cauldron?.autoBrewRecipeKey ??
          null;
        if (recipeKey && recipeKey !== cauldron?.autoBrewRecipeKey) {
          const recipeResult = gameplay?.setBrewingAutoBrewRecipe?.(
            recipeKey,
            index,
          );
          if (recipeResult?.ok === false) {
            return recipeResult;
          }
        }

        return typeof gameplay?.setBrewingAutoBrewEnabled === "function"
          ? gameplay.setBrewingAutoBrewEnabled(true, index)
          : gameplay?.toggleBrewingAutoBrewEnabled?.(index);
      },
      toggleAutoCollect: (cauldronIndex) =>
        gameplay?.toggleBrewingAutoCollectEnabled?.(cauldronIndex),
      cancelBrew: (cauldronIndex) => {
        const result = gameplay?.cancelBrewing?.(cauldronIndex);
        if (result?.ok === false) {
          this.experienceFacade?.transientEffects?.emitReward?.({
            message: "No potion is brewing to cancel",
            flyoutKey: "brewing-cancel-empty",
          });
        }
        return result;
      },
      collectBrew: (cauldronIndex) => {
        const result = gameplay?.collectBrewing?.(cauldronIndex);
        if (result?.ok === false) {
          this.experienceFacade?.transientEffects?.emitReward?.({
            message: "No potion is ready to collect",
            flyoutKey: "brewing-collect-empty",
          });
        }
        return result;
      },
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
        this.resetInventoryExpansion("brewing");
        this.refreshPage("brewing");
        return true;
      },
      toggleInventoryExpanded: (kind) =>
        this.toggleInventoryExpanded("brewing", kind),
      inspectPotion: () => true,
      closeDialog: () => true,
      setWorldViewport: (viewport) => {
        this.worldViewportByPage.set("brewing", {
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
        .getGlobalSurface("chrome.bottom")
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
    this.experienceFacade?.onPageChanged?.(pageId);
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
    if (pageId === "garden") {
      this.gardenInventoryTabId = null;
    } else if (pageId === "brewing") {
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
      .filter((page) => page.visible !== false && SWIPE_PAGE_IDS.has(page.id))
      .map((page) => page.id);
    const index = visible.indexOf(this.currentPageId);
    const offset = direction === "previous" ? -1 : 1;
    return index < 0 ? null : (visible[index + offset] ?? null);
  }

  setSwipeTargetPageId(pageId) {
    if (!this.mounted) {
      return false;
    }
    return (
      this.requireRuntime()
        .getGlobalSurface("chrome.bottom")
        .setSwipeTargetPageId?.(pageId) ?? false
    );
  }

  handleBack() {
    const runtime = this.requireRuntime();
    if (runtime.getOpenDialogIds().length > 0) {
      return runtime.closeTopDialog();
    }
    if (this.currentPageId !== "workshop") {
      return this.show("workshop");
    }
    return false;
  }

  syncExternalDataRetention() {
    if (!this.mounted) {
      return;
    }
    const shouldRetainNpc = this.currentPageId === "shop";
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
      this.currentPageId === "shop" && this.shopTabId === "players";
    if (shouldRetainPlayers && !this.releasePlayerMarket) {
      this.releasePlayerMarket =
        this.playerShopFacade?.retainMarketData?.() ??
        this.playerShopFacade?.retainPublicData?.() ??
        null;
    } else if (!shouldRetainPlayers && this.releasePlayerMarket) {
      this.releasePlayerMarket();
      this.releasePlayerMarket = null;
    }

    const shouldRetainTradeAlliance = this.currentPageId === "workshop";
    if (shouldRetainTradeAlliance && !this.releaseTradeAlliancePublic) {
      this.releaseTradeAlliancePublic =
        this.tradeAllianceFacade?.retainPublicData?.() ?? null;
    } else if (!shouldRetainTradeAlliance && this.releaseTradeAlliancePublic) {
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
      (page) => page.id === "workshop" && page.unlocked,
    )
      ? "workshop"
      : (this.pageStates.find(
          (page) => page.unlocked && SWIPE_PAGE_IDS.has(page.id),
        )?.id ?? "workshop");
  }

  getCurrentPageId() {
    return this.currentPageId;
  }

  setTopPanelQuestProgressPreview(progress = null) {
    if (!this.mounted) {
      return { ok: false, reason: "pages_not_mounted" };
    }
    this.questProgressPreview = progress;
    this.refreshChrome();
    return { ok: true, progress };
  }

  setDevNotifications(snapshot) {
    this.devNotifications = snapshot?.pages
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
      return { ok: false, reason: "pages_not_mounted" };
    }
    const normalized = normalizeDialogId(dialogId);
    if (
      normalized === "featureunlockannouncement" ||
      normalized === "featureunlocks"
    ) {
      return (
        this.announcementPresenter?.showFeatureUnlockPreview?.(options) ?? {
          ok: false,
          reason: "announcements_missing",
        }
      );
    }
    if (
      normalized === "levelupannouncement" ||
      normalized === "levelrewardsannouncement"
    ) {
      return (
        this.announcementPresenter?.showLevelUpPreview?.(options) ?? {
          ok: false,
          reason: "announcements_missing",
        }
      );
    }
    if (
      normalized === "researchcompleteannouncement" ||
      normalized === "researchcomplete"
    ) {
      return (
        this.announcementPresenter?.showResearchCompletePreview?.(options) ?? {
          ok: false,
          reason: "announcements_missing",
        }
      );
    }
    if (normalized === "whileawayannouncement" || normalized === "whileaway") {
      return (
        this.announcementPresenter?.showWhileAwayPreview?.(options) ?? {
          ok: false,
          reason: "announcements_missing",
        }
      );
    }
    const target = DEV_DIALOG_TARGETS[normalized];
    if (!target) {
      return { ok: false, reason: "unknown_dialog", dialogId };
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
    if (target.pageMethod === "worldEvent") {
      this.workshopWorldEventTabId = normalizeWorkshopTabId(
        resolvedOptions.tab,
        WORKSHOP_WORLD_EVENT_TAB_IDS,
        this.workshopWorldEventTabId,
      );
      this.refreshPage("workshop", { force: true });
    }
    const opened = target.pageMethod
      ? page?.openDialog?.(
          target.pageMethod,
          target.pageMethod === "worldEvent" ? null : resolvedOptions,
        )
      : (this.globalDialogPresenter?.open?.(target.dialogId, resolvedOptions) ??
        this.requireRuntime().openDialog?.(target.dialogId, resolvedOptions));
    return opened === false
      ? { ok: false, reason: "dialog_unavailable", dialogId }
      : {
          ok: true,
          dialogId: target.resultId ?? dialogId,
          ...(resolvedOptions.tab ? { tabId: resolvedOptions.tab } : {}),
        };
  }

  resetTutorialProgress() {
    return this.experienceFacade?.resetTutorialProgress?.() ?? false;
  }

  resetFirstRunIntroProgress() {
    return this.experienceFacade?.resetFirstRunIntroProgress?.() ?? false;
  }

  showFirstRunIntroPreview(options = {}) {
    return (
      this.experienceFacade?.showFirstRunIntroPreview?.(options) ?? {
        ok: false,
        reason: "intro_missing",
      }
    );
  }

  listTutorialStages() {
    return (
      this.experienceFacade?.listTutorialStages?.() ?? {
        ok: false,
        reason: "tutorial_missing",
      }
    );
  }

  setTutorialStage(stageId) {
    return (
      this.experienceFacade?.setTutorialStage?.(stageId) ?? {
        ok: false,
        reason: "tutorial_missing",
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
        "PixiPagesFacade requires RenderFacade.initialize() before mounting.",
      );
    }
    return runtime;
  }
}

function createGardenPlotModel({
  tile = {},
  plot = {},
  coin = {},
  selectedSeed = null,
  seedQuantityById = new Map(),
  hasPlantableSeed = false,
} = {}) {
  const unlocked = tile.unlocked !== false;
  const nextLockedTile = !unlocked && tile.tileNumber === plot.nextTileNumber;
  const lockedByLevel = nextLockedTile && plot.nextTileLockedByLevel === true;
  const lockedByResearch =
    nextLockedTile && plot.nextTileLockedByResearch === true;
  const costCoin = Number(plot.nextTileCost);
  const currentCoin = Number(coin?.current ?? 0);
  const affordable =
    !nextLockedTile || !Number.isFinite(costCoin) || currentCoin >= costCoin;
  const selectedSeedRequirement = Math.max(
    1,
    Math.floor(Number(tile.level) || 1),
  );
  const selectedSeedQuantity = selectedSeed?.itemTypeId
    ? Number(
        seedQuantityById.get(selectedSeed.itemTypeId) ??
          selectedSeed.quantity ??
          0,
      )
    : 0;
  const hasSelectedSeed = Boolean(selectedSeed?.itemTypeId);
  const canPlantSelectedSeed =
    hasSelectedSeed && selectedSeedQuantity >= selectedSeedRequirement;
  let label = tile.label;
  let labelResource = tile.labelResource;
  let actionText = tile.actionText;
  let actionResource = tile.actionResource;

  if (!unlocked) {
    label = "";
    actionText = nextLockedTile ? formatGardenLockedPlotAction(plot) : "";
    actionResource =
      nextLockedTile &&
      !lockedByLevel &&
      !lockedByResearch &&
      affordable &&
      Number.isFinite(costCoin) &&
      costCoin > 0
        ? "coin"
        : null;
  } else if (tile.phase === "empty") {
    label = "";
    labelResource = null;
    actionText =
      hasSelectedSeed && canPlantSelectedSeed
        ? selectedSeedRequirement > 1
          ? `plant x${selectedSeedRequirement}`
          : "plant"
        : "";
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
      (!unlocked && (!nextLockedTile || lockedByLevel)),
    lockReason: lockedByLevel
      ? "level_locked"
      : lockedByResearch
        ? "research_locked"
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
    toolbarSeedItemTypeId: selectedSeed?.itemTypeId ?? null,
    toolbarSeedKey: selectedSeed?.key ?? null,
    toolbarSeedLabel: selectedSeed?.label ?? null,
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
      unlocked && (tile.phase === "empty" || tile.phase === "growing"),
  };
}

function formatGardenLockedPlotAction(plot = {}) {
  if (plot.nextTileLockedByLevel === true) {
    return `level ${plot.nextTileRequiresLevel}`;
  }
  if (plot.nextTileLockedByResearch === true) {
    return "Research";
  }
  const cost = Number(plot.nextTileCost);
  return `buy ${cost === 0 ? "free" : formatCoinPriceText(cost)}`;
}

function createGardenSeedDialogRows(
  snapshot = {},
  selectedSeedItemTypeId = null,
) {
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
      (seed) => Number(seed.quantity) <= 0 && seed.researched === true,
    ),
  ];

  return orderedSeeds.map((seed) => {
    const display = getItemDisplay(snapshot, seed, seed.quantity);
    return {
      ...seed,
      id: seed.itemTypeId,
      label: display.label,
      displayLabel: display.label,
      quantityText: String(seed.quantity ?? 0),
      detail: `${Number(seed.quantity) || 0} Available`,
      selected: selectedSeedItemTypeId === seed.itemTypeId,
      enabled: true,
      known: display.known,
      researched: display.researched,
      owned: display.owned,
      empty: display.empty,
      notification: Number(seed.quantity) > 0,
      itemKind: "seed",
      itemKey: seed.key,
      icon: {
        kind: "seed",
        key: seed.key,
      },
      semanticId: `garden.seed.${seed.key ?? seed.itemTypeId}`,
      tutorialId: seed.key ? `garden:seed:${seed.key}` : null,
    };
  });
}

function createBrewingHerbDialogRows(snapshot = {}) {
  const herbs = (snapshot.brewing?.herbs ?? [])
    .map((herb) => ({
      ...herb,
      researched: isItemResearched(snapshot, herb),
    }))
    .filter((herb) =>
      shouldShowItemInActionList(
        snapshot,
        herb,
        herb.availableQuantity ?? herb.quantity,
      ),
    );
  const orderedHerbs = [
    ...herbs.filter(
      (herb) =>
        Number(herb.availableQuantity ?? herb.quantity) > 0,
    ),
    ...herbs.filter(
      (herb) =>
        Number(herb.availableQuantity ?? herb.quantity) <= 0 &&
        herb.researched === true,
    ),
  ];

  return orderedHerbs.map((herb) => {
    const quantity = Math.max(
      0,
      Number(herb.availableQuantity ?? herb.quantity) || 0,
    );
    const display = getItemDisplay(snapshot, herb, quantity);
    return {
      ...herb,
      id: herb.itemTypeId,
      label: display.label,
      displayLabel: display.label,
      quantity,
      quantityText: String(quantity),
      detail: `${quantity} Available`,
      selected: false,
      enabled: quantity > 0,
      disabled: quantity <= 0,
      known: display.known,
      researched: display.researched,
      owned: display.owned,
      empty: display.empty,
      itemKind: "herb",
      itemKey: herb.key,
      icon: {
        kind: "herb",
        key: herb.key,
      },
      semanticId: `brewing.herb.${herb.key ?? herb.itemTypeId}`,
    };
  });
}

function createGardenSelectedSeedModel(snapshot = {}, seed = {}) {
  const display = getItemDisplay(snapshot, seed, seed.quantity);
  return {
    ...seed,
    label: stripSeedSuffix(display.label) ?? display.label,
    quantity: Number(seed.quantity) || 0,
    quantityText: String(seed.quantity ?? 0),
    itemKind: "seed",
    icon: {
      kind: "seed",
      key: seed.key,
    },
  };
}

function stripSeedSuffix(label) {
  const value = String(label ?? "").trim();
  return value ? value.replace(/\s+seed$/i, "") : null;
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

const DEV_BREWING_HERB_ROWS = Object.freeze([
  Object.freeze({
    id: 1001,
    itemTypeId: 1001,
    key: "sageHerb",
    label: "Sage",
    detail: "17 Available",
    quantity: 17,
    itemKind: "herb",
    icon: Object.freeze({ kind: "herb", key: "sageHerb" }),
    enabled: true,
  }),
  Object.freeze({
    id: 1002,
    itemTypeId: 1002,
    key: "mintHerb",
    label: "Mint",
    detail: "14 Available",
    quantity: 14,
    itemKind: "herb",
    icon: Object.freeze({ kind: "herb", key: "mintHerb" }),
    enabled: true,
  }),
  Object.freeze({
    id: 1003,
    itemTypeId: 1003,
    key: "lavenderHerb",
    label: "Lavender",
    detail: "1 Available",
    quantity: 1,
    itemKind: "herb",
    icon: Object.freeze({ kind: "herb", key: "lavenderHerb" }),
    enabled: true,
  }),
]);

const DEV_BREWING_HERB_DIALOG_OPTIONS = Object.freeze({
  title: "Choose Herb",
  cauldronIndex: 0,
  slotIndex: 0,
  rows: DEV_BREWING_HERB_ROWS,
  selectedItem: Object.freeze({
    ...DEV_BREWING_HERB_ROWS[0],
    selectedQuantity: 3,
    quantity: 3,
    maxQuantity: 6,
  }),
});

const DEV_DIALOG_TARGETS = Object.freeze({
  bag: { pageId: "workshop", pageMethod: "bag" },
  inventory: { pageId: "workshop", pageMethod: "bag" },
  seeds: { pageId: "workshop", pageMethod: "bag" },
  herbs: { pageId: "workshop", pageMethod: "bag" },
  potions: { pageId: "workshop", pageMethod: "bag" },
  brewingherbs: {
    pageId: "brewing",
    pageMethod: "herbs",
    resultId: "brewing.herbs",
    options: DEV_BREWING_HERB_DIALOG_OPTIONS,
  },
  chooseherb: {
    pageId: "brewing",
    pageMethod: "herbs",
    resultId: "brewing.herbs",
    options: DEV_BREWING_HERB_DIALOG_OPTIONS,
  },
  summon: { pageId: "workshop", pageMethod: "summonInfo" },
  summoninfo: { pageId: "workshop", pageMethod: "summonInfo" },
  leaderboard: { pageId: "workshop", pageMethod: "leaderboard" },
  leaderboards: { pageId: "workshop", pageMethod: "leaderboard" },
  alliance: { pageId: "workshop", pageMethod: "alliance" },
  alliances: { pageId: "workshop", pageMethod: "alliance" },
  discoveries: { pageId: "workshop", pageMethod: "discoveries" },
  discovery: { pageId: "workshop", pageMethod: "discoveries" },
  personaltasks: { pageId: "workshop", pageMethod: "personalTasks" },
  tasks: { pageId: "workshop", pageMethod: "personalTasks" },
  worldevent: { pageId: "workshop", pageMethod: "worldEvent" },
  event: { pageId: "workshop", pageMethod: "worldEvent" },
  worldnotice: { pageId: "workshop", pageMethod: "worldEvent" },
  chat: { pageId: "workshop", pageMethod: "worldChat" },
  worldchat: { pageId: "workshop", pageMethod: "worldChat" },
  market: { pageId: "shop", pageMethod: SHOP_DIALOG_IDS.MARKET },
  shop: { pageId: "shop", pageMethod: SHOP_DIALOG_IDS.MARKET },
  guild: { pageId: "guild", pageMethod: GUILD_DIALOG_IDS.CHARTER },
  guildcharter: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.CHARTER,
  },
  guildsettings: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.SETTINGS,
  },
  guildrequest: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.REQUEST,
  },
  guildrequeststack: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildquestposting: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildquests: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.REQUEST_STACK,
  },
  guildadventurer: {
    pageId: "guild",
    pageMethod: GUILD_DIALOG_IDS.ADVENTURER,
  },
  settings: { dialogId: "global.settings" },
  configurations: {
    dialogId: "global.settings",
    options: { tab: "configurations" },
  },
  feedback: {
    dialogId: "global.feedback",
    options: { tab: "report", kind: "feedback" },
  },
  bug: {
    dialogId: "global.feedback",
    options: { tab: "report", kind: "bug" },
  },
  feature: {
    dialogId: "global.feedback",
    options: { tab: "report", kind: "feature" },
  },
  level: { dialogId: "global.level" },
  levels: { dialogId: "global.level" },
  mail: { dialogId: "global.inbox" },
  inbox: { dialogId: "global.inbox" },
  player: { dialogId: "global.player" },
  playerinfo: { dialogId: "global.player" },
  allianceinfo: { dialogId: "global.alliance" },
});

function normalizeDialogId(dialogId) {
  return String(dialogId ?? "")
    .trim()
    .replace(/[_\s-]/g, "")
    .toLowerCase();
}

function normalizeWorkshopTabId(tabId, allowedTabIds, fallback) {
  const normalized = String(tabId ?? "");
  return allowedTabIds.has(normalized) ? normalized : fallback;
}
