import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopBagManager } from './managers/WorkshopBagManager.js';
import { WorkshopActionBarManager } from './managers/WorkshopActionBarManager.js';
import { WorkshopSummonInfoManager } from './managers/WorkshopSummonInfoManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';
import { WorkshopFlyoutManager } from './managers/WorkshopFlyoutManager.js';
import { WorkshopDiscoveriesManager } from './managers/WorkshopDiscoveriesManager.js';
import { WorkshopRequirementConnectionManager } from './managers/WorkshopRequirementConnectionManager.js';
import { WorkshopPersonalTasksManager } from './managers/WorkshopPersonalTasksManager.js';
import { WorkshopTaskManager } from './managers/WorkshopTaskManager.js';
import { WorkshopTradeAllianceManager } from './managers/WorkshopTradeAllianceManager.js';
import { WorkshopWorldNoticeManager } from './managers/WorkshopWorldNoticeManager.js';
import {
  WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL,
  WorkshopSecondaryActionGateManager,
} from './managers/WorkshopSecondaryActionGateManager.js';

export class WorkshopPageFacade {
  static explain =
    'Shows the wizard workshop: a simple room with a wall behind it and a floor under it.';

  constructor({
    gameplayFacade,
    hapticsFacade,
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
    this.discoveryAllianceActionGateManager = new WorkshopSecondaryActionGateManager({
      unlockLevel: WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL,
    });
    this.bagManager = new WorkshopBagManager({ gameplayFacade });
    this.summonInfoManager = new WorkshopSummonInfoManager({ gameplayFacade });
    this.actionBarManager = new WorkshopActionBarManager({
      gameplayFacade,
      hapticsFacade,
      onBagClick: () => this.bagManager.toggle(),
      onSummonInfoClick: () => this.summonInfoManager.show(),
      onSummonNotice: (message, options) => this.flyoutManager.show(message, options),
      onSummonNoticeList: (notices) => this.flyoutManager.showList(notices),
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
    this.discoveriesManager = new WorkshopDiscoveriesManager({
      gameplayFacade,
      onOpenPlayerInfo,
    });
    this.taskManager = new WorkshopTaskManager({
      gameplayFacade,
      onLevelUpNotice: ({ message }) => this.flyoutManager.show(message),
    });
    this.personalTasksManager = new WorkshopPersonalTasksManager({ gameplayFacade });
    this.worldNoticeManager = new WorkshopWorldNoticeManager({
      gameplayFacade,
      onOpenPlayerInfo,
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.requirementConnectionManager.mount(uiLayer);
    this.taskManager.mount(uiLayer, popupLayer);
    this.personalTasksManager.mount(uiLayer, popupLayer);
    this.worldNoticeManager.mount(uiLayer, popupLayer);
    this.actionBarManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) => {
        this.flyoutManager.showReward(event);
        this.showRequirementConnection(event);
      }) ?? null;
    this.leaderboardManager.mount(uiLayer, popupLayer);
    this.tradeAllianceManager.mount(uiLayer, popupLayer);
    this.discoveriesManager.mount(uiLayer, popupLayer);
    this.bagManager.mount(popupLayer);
    this.summonInfoManager.mount(popupLayer);
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
    this.summonInfoManager.unmount();
    this.bagManager.unmount();
    this.discoveriesManager.unmount();
    this.tradeAllianceManager.unmount();
    this.leaderboardManager.unmount();
    this.worldNoticeManager.unmount();
    this.personalTasksManager.unmount();
    this.taskManager.unmount();
    this.actionBarManager.unmount();
    this.flyoutManager.unmount();
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

  applySecondaryActionGate(snapshot) {
    const secondaryUnlocked = this.secondaryActionGateManager.apply(snapshot, [
      this.leaderboardManager.root,
    ]);
    const discoveryAllianceUnlocked = this.discoveryAllianceActionGateManager.apply(snapshot, [
      this.tradeAllianceManager.root,
      this.discoveriesManager.root,
    ]);

    if (!secondaryUnlocked) {
      this.leaderboardManager.hide();
    }

    if (!discoveryAllianceUnlocked) {
      this.tradeAllianceManager.hide();
      this.discoveriesManager.hide();
    }
  }
}
