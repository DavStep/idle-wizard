import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopBagManager } from './managers/WorkshopBagManager.js';
import { WorkshopActionBarManager } from './managers/WorkshopActionBarManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';
import { WorkshopFlyoutManager } from './managers/WorkshopFlyoutManager.js';
import { WorkshopLogDialogManager } from './managers/WorkshopLogDialogManager.js';
import { WorkshopDiscoveriesManager } from './managers/WorkshopDiscoveriesManager.js';
import { WorkshopPrestigeManager } from './managers/WorkshopPrestigeManager.js';
import { WorkshopRequirementConnectionManager } from './managers/WorkshopRequirementConnectionManager.js';
import { WorkshopTaskManager } from './managers/WorkshopTaskManager.js';
import { WorkshopTradeAllianceManager } from './managers/WorkshopTradeAllianceManager.js';
import {
  WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
  WorkshopSecondaryActionGateManager,
} from './managers/WorkshopSecondaryActionGateManager.js';

export class WorkshopPageFacade {
  static explain =
    'Shows the wizard workshop: a simple room with a wall behind it and a floor under it.';

  constructor({
    gameplayFacade,
    leaderboardFacade,
    tradeAllianceFacade,
    onOpenPlayerInfo,
    onOpenAllianceInfo,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new WorkshopRoomViewManager();
    this.flyoutManager = new WorkshopFlyoutManager();
    this.requirementConnectionManager = new WorkshopRequirementConnectionManager();
    this.rewardEventsUnsubscribe = null;
    this.secondaryActionGateUnsubscribe = null;
    this.secondaryActionGateManager = new WorkshopSecondaryActionGateManager();
    this.prestigeActionGateManager = new WorkshopSecondaryActionGateManager({
      unlockLevel: WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
    });
    this.bagManager = new WorkshopBagManager({ gameplayFacade });
    this.prestigeManager = new WorkshopPrestigeManager({ gameplayFacade });
    this.actionBarManager = new WorkshopActionBarManager({
      gameplayFacade,
      onBagClick: () => this.bagManager.toggle(),
      onPrestigeClick: () => this.prestigeManager.toggle(),
      onSummonNotice: (message) => this.flyoutManager.show(message),
      rewardEventsAvailable: Boolean(gameplayFacade?.subscribeRewardEvents),
    });
    this.leaderboardManager = new WorkshopLeaderboardManager({
      gameplayFacade,
      leaderboardFacade,
      tradeAllianceFacade,
      onOpenPlayerInfo,
      onOpenAllianceInfo,
    });
    this.tradeAllianceManager = new WorkshopTradeAllianceManager({
      gameplayFacade,
      tradeAllianceFacade,
      onOpenPlayerInfo,
      onOpenAllianceInfo,
    });
    this.logDialogManager = new WorkshopLogDialogManager({ gameplayFacade });
    this.discoveriesManager = new WorkshopDiscoveriesManager({
      gameplayFacade,
      onOpenPlayerInfo,
    });
    this.manaSphereManager = new WorkshopManaSphereManager({ gameplayFacade });
    this.taskManager = new WorkshopTaskManager({
      gameplayFacade,
      onLevelUpNotice: ({ message }) => this.flyoutManager.show(message),
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.requirementConnectionManager.mount(uiLayer);
    this.taskManager.mount(uiLayer, popupLayer);
    this.manaSphereManager.mount(uiLayer);
    this.actionBarManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) => {
        this.flyoutManager.showReward(event);
        this.showRequirementConnection(event);
      }) ?? null;
    this.leaderboardManager.mount(uiLayer, popupLayer);
    this.tradeAllianceManager.mount(uiLayer, popupLayer);
    this.logDialogManager.mount(uiLayer, popupLayer);
    this.discoveriesManager.mount(uiLayer, popupLayer);
    this.bagManager.mount(popupLayer);
    this.prestigeManager.mount(popupLayer);
    this.secondaryActionGateUnsubscribe =
      this.gameplayFacade?.subscribe((snapshot) => this.applySecondaryActionGate(snapshot)) ??
      null;
    this.applySecondaryActionGate(this.gameplayFacade?.getSnapshot?.());
  }

  unmount() {
    this.secondaryActionGateUnsubscribe?.();
    this.secondaryActionGateUnsubscribe = null;
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.requirementConnectionManager.unmount();
    this.prestigeManager.unmount();
    this.bagManager.unmount();
    this.discoveriesManager.unmount();
    this.logDialogManager.unmount();
    this.tradeAllianceManager.unmount();
    this.leaderboardManager.unmount();
    this.taskManager.unmount();
    this.actionBarManager.unmount();
    this.flyoutManager.unmount();
    this.manaSphereManager.unmount();
    this.roomViewManager.unmount();
  }

  showRequirementConnection(event) {
    const target = this.taskManager.getCurrentRequirementRowForItemTypeIds(
      this.getRewardItemTypeIds(event),
    );

    if (!target) {
      return;
    }

    this.requirementConnectionManager.show({
      source: this.getRequirementConnectionSource(event),
      target,
    });
  }

  getRewardItemTypeIds(event) {
    const itemTypeIds = new Set();

    if (event?.type === 'seed_summoned') {
      const seedCounts = Array.isArray(event.seedCounts) ? event.seedCounts : [];

      for (const seedCount of seedCounts) {
        this.addRewardItemTypeId(itemTypeIds, seedCount?.seed);
      }

      this.addRewardItemTypeId(itemTypeIds, event.seed);
      return itemTypeIds;
    }

    if (event?.type === 'herb_harvested') {
      this.addRewardItemTypeId(itemTypeIds, event.herb);
      return itemTypeIds;
    }

    if (event?.type === 'potion_collected') {
      this.addRewardItemTypeId(itemTypeIds, event.potion);
    }

    return itemTypeIds;
  }

  addRewardItemTypeId(itemTypeIds, item) {
    const itemTypeId = Number(item?.itemTypeId ?? item?.id);

    if (Number.isInteger(itemTypeId)) {
      itemTypeIds.add(itemTypeId);
    }
  }

  getRequirementConnectionSource(event) {
    if (event?.type === 'seed_summoned') {
      return this.actionBarManager.refs.summonButton;
    }

    return null;
  }

  applySecondaryActionGate(snapshot) {
    const prestigeUnlocked = this.prestigeActionGateManager.apply(snapshot, [
      this.actionBarManager.refs.prestigeButton,
    ]);
    const secondaryUnlocked = this.secondaryActionGateManager.apply(snapshot, [
      this.leaderboardManager.root,
      this.tradeAllianceManager.root,
      this.logDialogManager.root,
      this.discoveriesManager.root,
    ]);

    if (!prestigeUnlocked) {
      this.prestigeManager.hide();
    }

    if (!secondaryUnlocked) {
      this.leaderboardManager.hide();
      this.tradeAllianceManager.hide();
      this.logDialogManager.hide();
      this.discoveriesManager.hide();
    }
  }
}
