import {
  formatCoinAmount,
  formatCoinPriceText,
} from '../../../shared/coinPrice.js';
import { formatBigNumber } from '../../../shared/bigNumber.js';
import {
  getItemDisplay,
  getItemResearchId,
} from '../../../pages/shared/itemResearchStatus.js';
import { formatRemainingTime } from '../../../pages/shared/timerDisplay.js';
import { parseWorldChatSystemPlayerAnnouncement } from '../../../pages/workshop/worldChatSystemAnnouncement.js';
import { getPlayerFrameTint } from '../../../player/playerFrames.js';
import { marketLicences } from '../../../shared/marketLicence.js';
import {
  DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
  DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
} from '../../../shared/tradeAllianceBannerColors.js';
import { DEFAULT_TRADE_ALLIANCE_EMBLEM } from '../../../shared/tradeAllianceEmblems.js';
import {
  getOwnTradeAllianceQuestContribution,
  getTradeAllianceQuestParticipationLock,
  isTradeAllianceQuestClaimable,
} from '../../../pages/workshop/managers/tradeAllianceQuestStatus.js';

const BAG_TABS = Object.freeze([
  Object.freeze({ id: 'currencies', label: 'Currencies' }),
  Object.freeze({ id: 'seeds', label: 'Seeds' }),
  Object.freeze({ id: 'herbs', label: 'Herbs', requiredPageId: 'garden' }),
  Object.freeze({ id: 'potions', label: 'Potions', requiredPageId: 'brewing' }),
  Object.freeze({
    id: 'ingredients',
    label: 'Ingredients',
    requiredPageId: 'brewing',
  }),
]);

const STATS_TABS = Object.freeze([
  Object.freeze({ id: 'seeds', label: 'seeds' }),
  Object.freeze({ id: 'herbs', label: 'herbs' }),
  Object.freeze({ id: 'potions', label: 'potions' }),
  Object.freeze({ id: 'coin', label: 'coin' }),
]);

const LEADERBOARD_TABS = Object.freeze([
  Object.freeze({ id: 'singlePlayer', label: 'Players' }),
  Object.freeze({ id: 'alliance', label: 'Alliances' }),
]);
const LEADERBOARD_PERIODS = Object.freeze([
  Object.freeze({
    id: 'daily',
    label: 'Daily',
    valueKey: 'dailyIncome',
    userListKey: 'topDailyUsers',
    currentUserKey: 'currentDailyUser',
    allianceListKey: 'topDailyAlliances',
  }),
  Object.freeze({
    id: 'weekly',
    label: 'Weekly',
    valueKey: 'weeklyIncome',
    userListKey: 'topWeeklyUsers',
    currentUserKey: 'currentWeeklyUser',
    allianceListKey: 'topWeeklyAlliances',
  }),
  Object.freeze({
    id: 'monthly',
    label: 'Monthly',
    valueKey: 'monthlyIncome',
    userListKey: 'topMonthlyUsers',
    currentUserKey: 'currentMonthlyUser',
    allianceListKey: 'topMonthlyAlliances',
  }),
  Object.freeze({
    id: 'allTime',
    label: 'All Time',
    valueKey: 'totalIncome',
    userListKey: 'topAllTimeUsers',
    currentUserKey: 'currentAllTimeUser',
    allianceListKey: 'topAllTimeAlliances',
  }),
]);
const PERSONAL_TASK_TABS = Object.freeze([
  Object.freeze({ id: 'tasks', label: 'Tasks' }),
  Object.freeze({ id: 'rewards', label: 'Rewards' }),
]);
const WORLD_EVENT_TABS = Object.freeze([
  Object.freeze({ id: 'tasks', label: 'Quests' }),
  Object.freeze({ id: 'leaderboard', label: 'Leaderboard' }),
  Object.freeze({ id: 'rewards', label: 'Rewards' }),
]);
const WORLD_EVENT_ART_ASSET_BY_FAMILY = Object.freeze({
  'village crisis': 'source:assets/world-events/village-crisis.png',
  'military danger': 'source:assets/world-events/military-danger.png',
  'political change': 'source:assets/world-events/political-change.png',
  'exploration discovery':
    'source:assets/world-events/exploration-discovery.png',
  'trade disruption': 'source:assets/world-events/trade-disruption.png',
});
const WORLD_EVENT_MAX_QUEST_ROWS = 2;
const TRADE_ALLIANCE_ROLE_LABELS = Object.freeze({
  tradeMaster: 'Trade Master',
  quartermaster: 'Quartermaster',
  factor: 'Factor',
  broker: 'Broker',
  trader: 'Trader',
});
const TRADE_ALLIANCE_ROLE_RANKS = Object.freeze({
  tradeMaster: 5,
  quartermaster: 4,
  factor: 3,
  broker: 2,
  trader: 1,
});
const TRADE_ALLIANCE_SOLO_TABS = Object.freeze([
  Object.freeze({ id: 'browse', label: 'Browse' }),
  Object.freeze({ id: 'create', label: 'Create' }),
]);
const TRADE_ALLIANCE_MEMBER_TABS = Object.freeze([
  Object.freeze({ id: 'home', label: 'Home' }),
  Object.freeze({ id: 'quests', label: 'Quests' }),
  Object.freeze({ id: 'requests', label: 'Requests' }),
  Object.freeze({ id: 'settings', label: 'Settings' }),
]);
const SEED_DROP_PREFERENCES = Object.freeze(['none', 'low', 'medium', 'high']);
const SEED_DROP_SLIDER_OPTIONS = Object.freeze([
  Object.freeze({ value: 'none', tone: 'root' }),
  Object.freeze({ value: 'low', tone: 'red' }),
  Object.freeze({ value: 'medium', tone: 'yellow' }),
  Object.freeze({ value: 'high', tone: 'green' }),
]);
const SEED_DROP_VALUE_TONES = Object.freeze({
  none: 'text',
  low: 'red',
  medium: 'yellow',
  high: 'green',
});

const MAX_LOCKED_RESEARCHES_PER_BOX = 3;
const RESEARCH_ART_ASSET_BY_BOX_ID = Object.freeze({
  autoBrewCauldrons: 'source:assets/icons/research/icon-research-auto-brew.png',
  autoPlantTiles: 'source:assets/icons/research/icon-research-auto-plant.png',
  autoSeedSpawn:
    'source:assets/icons/research/icon-research-auto-seed-spawn.png',
  automationReserve:
    'source:assets/icons/research/icon-research-automation-reserve.png',
  cauldronBrewing:
    'source:assets/icons/research/icon-research-cauldron-brewing.png',
  cauldronCapacity:
    'source:assets/icons/research/icon-research-cauldron-capacity.png',
  gardenBulkActions:
    'source:assets/icons/research/icon-research-auto-plant.png',
  plotCapacity: 'source:assets/icons/research/icon-research-plot-capacity.png',
  plotGrowth: 'source:assets/icons/research/icon-research-plot-growth.png',
  plotPlanting: 'source:assets/icons/research/icon-research-plot-level.png',
  recipeUnlocks:
    'source:assets/icons/research/icon-research-cauldron-brewing.png',
  researchCost: 'source:assets/icons/research/icon-research-cost.png',
  researchTime: 'source:assets/icons/research/icon-research-time.png',
  seedUnlocks: 'source:assets/icons/research/icon-research-auto-seed-spawn.png',
  stallStaffing: 'source:assets/icons/research/icon-research-fast-sell.png',
  summonSeeds:
    'source:assets/icons/research/icon-research-summon-multiplier.png',
});
const RESEARCH_CAULDRON_LEVEL_ART_ASSET =
  'source:assets/icons/research/icon-research-cauldron-level.png';
const RESEARCH_MANA_ART_ASSET = 'source:assets/icons/icon-mana-drop.png';
const RESEARCH_MANA_CAPACITY_MODIFIER_ASSET =
  'source:assets/icons/research/icon-research-mana-capacity-up.png';
const RESEARCH_MANA_GENERATION_MODIFIER_ASSET =
  'source:assets/icons/research/icon-research-mana-generation-plus.png';
const RESEARCH_ART_EXTRA_ASSET_BY_KEY = Object.freeze({
  timerReduction: 'source:assets/icons/research/icon-research-time.png',
});
const RESEARCH_FALLBACK_ART_ASSET =
  'source:assets/icons/research/icon-research-generic.png';

function getResearchItemArtAssetId(item, fallbackArtAssetId) {
  const researchId = String(item?.id ?? '');

  if (
    researchId.startsWith('manaSphereCap:') ||
    researchId.startsWith('manaProductionRate:')
  ) {
    return RESEARCH_MANA_ART_ASSET;
  }

  if (researchId.startsWith('summonSeedsX')) {
    return RESEARCH_ART_ASSET_BY_BOX_ID.summonSeeds;
  }

  if (researchId.startsWith('garden:')) {
    return RESEARCH_ART_ASSET_BY_BOX_ID.gardenBulkActions;
  }

  if (researchId.startsWith('emerald:cauldronBrewing:')) {
    return RESEARCH_CAULDRON_LEVEL_ART_ASSET;
  }

  return fallbackArtAssetId;
}
const WORLD_CHAT_PRESTIGE_ICON_ASSET =
  'source:assets/icons/icon-prestige-star.png';
const WORLD_CHAT_PRESTIGE_DETAIL_PATTERN =
  /^reached ⭐ \d+, completing prestige level \d+$/u;
const WORLD_CHAT_SYSTEM_INLINE_AVATAR_SIZE = 18;

export const RESEARCH_TAB_UNLOCK_LEVELS = Object.freeze({
  regular: 1,
  emerald: 4,
  automation: 7,
  advanced: 10,
});

export class PixiViewModelFactory {
  createTopPanel({
    gameplay = {},
    player = {},
    friendNotification = false,
    pageId = 'workshop',
    researchTabId = 'regular',
    questPreview = null,
    actions = {},
    reveal = {},
  } = {}) {
    const progress =
      questPreview ?? gameplay.tasks?.level?.questProgress ?? null;
    const visibleLevel = normalizeVisibleLevel(
      questPreview?.targetLevel ??
        gameplay.tasks?.currentLevel ??
        gameplay.playerLevel?.currentLevel,
    );
    const contextResource = getPageContextResource(pageId, researchTabId);

    return {
      pageId,
      username: player.username || 'Wizard',
      character: player.character || 'elara',
      frameTint: getPlayerFrameTint(player.frame),
      showAvatar: true,
      avatarNotification: friendNotification === true,
      coin: gameplay.coin?.current ?? 0,
      contextCurrency: {
        resource: contextResource ?? 'crystal',
        amount: gameplay[contextResource ?? 'crystal']?.current ?? 0,
        cap: gameplay[contextResource ?? 'crystal']?.cap ?? 0,
        perSecond: gameplay[contextResource ?? 'crystal']?.perSecond ?? 0,
        visible: true,
      },
      level: visibleLevel,
      loadRevision: Math.max(
        0,
        Math.floor(Number(gameplay.persistence?.loadRevision) || 0),
      ),
      quest: progress
        ? {
            visible: visibleLevel !== null,
            completed: progress.completedQuests ?? 0,
            total: progress.totalQuests ?? 0,
            activeFraction: getActiveQuestFraction(progress),
            activeTaskId: progress.activeQuest?.taskId ?? null,
            remaining: Math.max(
              0,
              (progress.totalQuests ?? 0) - (progress.completedQuests ?? 0),
            ),
          }
        : { visible: false },
      reveal: {
        top: true,
        avatar: true,
        username: true,
        mana: true,
        manaRegen: true,
        resources: true,
        quest: true,
        ...reveal,
      },
      actions,
    };
  }

  createBottomPanel({
    currentPageId,
    hudMode = 'rooms',
    allianceHud = null,
    guildHud = null,
    prestigeHud = null,
    pages,
    notifications,
    actions,
    reveal = {},
  } = {}) {
    return {
      currentPageId,
      hudMode,
      allianceHud,
      guildHud,
      prestigeHud,
      pages,
      notifications,
      reveal: {
        rooms: true,
        ...reveal,
      },
      actions,
    };
  }

  createWorkshop({
    gameplay = {},
    player = {},
    worldChat = {},
    leaderboard = {},
    worldEventLeaderboard = {},
    tradeAlliance = {},
    playerInbox = {},
    notifications = {},
    guildNotification = false,
    prestigeNotification = false,
    actions = {},
    dialogState = {},
    pageStates = null,
  } = {}) {
    const taskSnapshot = gameplay.tasks ?? {};
    const level = Math.max(
      0,
      Math.floor(
        Number(
          taskSnapshot.currentLevel ?? gameplay.playerLevel?.currentLevel,
        ) || 0,
      ),
    );
    const allTasks = taskSnapshot.level?.tasks ?? [];
    const activeTask =
      allTasks.find((task) => task.isActiveQuest) ??
      allTasks.find((task) => !task.completed) ??
      null;
    const taskRows = activeTask
      ? [this.createTaskRow(activeTask, gameplay.research, actions)]
      : [];

    return {
      workshop: {
        tasks: {
          title: "Elara's Request",
          rows: taskRows,
          expanded: false,
          canToggle: false,
        },
        summon: {
          cost: gameplay.seedSummoning?.cost ?? 0,
          quantity: gameplay.seedSummoning?.quantity ?? 1,
          maxQuantity:
            gameplay.seedSummoning?.maxQuantity ??
            gameplay.seedSummoning?.quantity ??
            1,
          starLevel: gameplay.seedSummoning?.starLevel ?? 0,
          starMaxLevel: gameplay.seedSummoning?.starMaxLevel ?? 4,
          canSummon: gameplay.seedSummoning?.canSummon === true,
          enabled: gameplay.seedSummoning?.canSummon === true,
          pressEnabled:
            gameplay.seedSummoning?.canSummon === true ||
            [
              'no_active_seed_weights',
              'not_enough_mana',
            ].includes(gameplay.seedSummoning?.unavailableReason),
        },
        bag: {
          side: 'left',
          weight: 40,
          enabled: true,
          visible: false,
        },
        inbox: {
          side: 'right',
          weight: 10,
          enabled: true,
          visible: true,
          onActivate: () => actions.openInbox?.() ?? false,
          notification:
            playerInbox.hasNotification === true ||
            Number(playerInbox.unreadCount) > 0 ||
            Number(playerInbox.claimableCount) > 0,
        },
        stats: {
          side: 'right',
          weight: 0,
          enabled: true,
        },
        features: createWorkshopFeatures({
          actions,
          gameplay,
          level,
          notifications: notifications.children ?? {},
          guildNotification,
          prestigeNotification,
          pageStates,
          tradeAlliance,
        }),
        worldChat: this.createWorldChatPreview(worldChat),
        flyouts: [],
        dialogs: {
          summonInfo: this.createSummonInfoDialog(gameplay, actions),
          bag: this.createBagDialog(
            gameplay,
            dialogState.bagTabId,
            actions.selectBagTab,
            pageStates,
            actions,
          ),
          stats: this.createStatsDialog(
            gameplay,
            dialogState.statsTabId,
            actions.selectStatsTab,
          ),
          inbox: this.createInboxDialog(playerInbox, actions),
          alliance: this.createAllianceDialog(
            tradeAlliance,
            dialogState.allianceExpandedId,
            actions,
            dialogState.allianceTabId,
          ),
          leaderboard: this.createLeaderboardDialog(
            leaderboard,
            tradeAlliance,
            dialogState.leaderboardTabId,
            actions,
            dialogState.leaderboardPeriodId,
          ),
          discoveries: this.createDiscoveriesDialog(gameplay, actions),
          personalTasks: this.createPersonalTasksDialog(
            gameplay,
            dialogState.personalTasksTabId,
            actions,
          ),
          worldEvent: this.createWorldEventDialog(
            gameplay,
            worldEventLeaderboard,
            player,
            dialogState.worldEventTabId,
            actions,
          ),
          worldEventDonate: this.createWorldEventDonationDialog(
            gameplay,
            dialogState.worldEventDonation,
            actions,
          ),
          worldChat: this.createWorldChatDialog(worldChat, actions),
        },
      },
      actions,
    };
  }

  createTaskRow(task, research = {}, actions = {}) {
    const automatic = task.autoProgress === true;
    const canNavigate = typeof actions.navigateToTask === 'function';
    const current = Math.max(0, Number(task.progressQuantity) || 0);
    const required = Math.max(0, Number(task.requiredQuantity) || 0);
    const researchTimer = createTaskResearchTimer(task, research);
    const label = task.requirementLabel ?? task.itemLabel ?? '';
    return {
      id: task.taskId,
      label: researchTimer
        ? label.replace(/^Research\b/, 'Researching')
        : label,
      current,
      required,
      ...(researchTimer
        ? {
            value: researchTimer.remainingLabel,
            researchTimer,
          }
        : {}),
      progress:
        required > 0 ? clampUnit(current / required) : clampUnit(task.progress),
      itemKind: task.itemKind ?? null,
      itemKey: task.itemKey ?? null,
      itemLabel: task.itemLabel ?? null,
      completed: task.completed === true,
      enabled: task.canFill === true,
      showProgress: true,
      semanticId: `workshop.task.${task.taskId}`,
      tutorialId: `task:${task.taskId}`,
      ...(canNavigate
        ? {
            rowEnabled: true,
            onRowActivate: () => actions.navigateToTask(task),
          }
        : {}),
      ...(automatic
        ? {}
        : {
            actionLabel: task.completed ? 'done' : 'Turn In',
            onActivate: () => actions.fillTask?.(task.taskId),
          }),
    };
  }

  createResearch({
    gameplay = {},
    selectedTabId = 'regular',
    actions = {},
  } = {}) {
    const research = gameplay.research ?? {};
    const sourceTabs =
      Array.isArray(research.tabs) && research.tabs.length > 0
        ? research.tabs
        : [
            {
              id: 'regular',
              label: 'regular research',
              boxes: research.boxes ?? [],
            },
          ];
    const researchById = createResearchById(sourceTabs);
    const completedResearchIds = createCompletedResearchIds(
      research,
      sourceTabs,
    );
    const playerLevel = Math.max(
      1,
      Math.floor(
        Number(
          gameplay.playerLevel?.currentLevel ?? gameplay.tasks?.currentLevel,
        ) || 1,
      ),
    );
    const highestReachedLevel = Math.max(
      playerLevel,
      Math.floor(Number(gameplay.playerLevel?.highestReachedLevel) || 0),
      ...(Array.isArray(gameplay.prestige?.completedLevels)
        ? gameplay.prestige.completedLevels.map((level) =>
            Math.max(0, Math.floor(Number(level) || 0)),
          )
        : []),
    );
    const isTabUnlocked = (tab) =>
      highestReachedLevel >= (RESEARCH_TAB_UNLOCK_LEVELS[tab.id] ?? 1);
    const resolvedSelectedTabId =
      sourceTabs.find((tab) => tab.id === selectedTabId && isTabUnlocked(tab))
        ?.id ??
      sourceTabs.find((tab) => tab.selected === true && isTabUnlocked(tab))
        ?.id ??
      sourceTabs.find((tab) => tab.id === 'regular')?.id ??
      sourceTabs.find(isTabUnlocked)?.id ??
      sourceTabs[0]?.id ??
      'regular';
    const prestigeCount = Math.max(
      0,
      Math.floor(
        Number(gameplay.prestige?.completedCount) ||
          (Array.isArray(gameplay.prestige?.completedLevels)
            ? gameplay.prestige.completedLevels.length
            : 0),
      ),
    );
    const tabs = sourceTabs.map((tab) => {
      const requiredLevel = RESEARCH_TAB_UNLOCK_LEVELS[tab.id] ?? 1;
      const unlocked = highestReachedLevel >= requiredLevel;
      const boxes = (tab.boxes ?? [])
        .map((box) =>
          createResearchBoxModel(box, {
            completedResearchIds,
            playerLevel,
            prestigeCount,
            researchById,
          }),
        )
        .filter((box) => box.allResearches.length > 0);

      return {
        ...tab,
        selected: tab.id === resolvedSelectedTabId,
        requiredLevel,
        unlocked,
        locked: !unlocked,
        lockPrompt: unlocked ? '' : `Unlocks at level ${requiredLevel}`,
        notification:
          unlocked &&
          boxes.some((box) =>
            (box.allResearches ?? box.researches).some(
              (item) => item.canResearch === true,
            ),
          ),
        semanticId: `research.tab.${tab.id}`,
        tutorialId: tab.tutorialId ?? `research:tab:${tab.id}`,
        boxes,
      };
    });
    const selectedTab =
      tabs.find((tab) => tab.id === resolvedSelectedTabId) ?? tabs[0] ?? null;

    return {
      research: {
        selectedTabId: resolvedSelectedTabId,
        selectedTab,
        tabs,
        notification: tabs.some((tab) => tab.notification),
      },
      actions,
    };
  }

  createPrestige({
    gameplay = {},
    selectedTabId = 'main',
    confirm = null,
    actions = {},
  } = {}) {
    const prestige = gameplay.prestige ?? {};
    const currentLevel = Math.max(
      1,
      Math.floor(Number(prestige.currentLevel) || 1),
    );
    const summaryMilestone = getSummaryMilestone(prestige);
    const completedPointCount = Array.isArray(prestige.completedLevels)
      ? prestige.completedLevels.length
      : 0;
    const nextPointCount =
      (prestige.unlocks ?? [])
        .map((unlock) => Math.floor(Number(unlock.count)))
        .filter((count) => count > completedPointCount)
        .sort((left, right) => left - right)[0] ?? null;
    const summaryResources = createPrestigeResourceTotals(
      summaryMilestone?.nextRun,
    );

    return {
      prestige: {
        selectedTabId,
        tabs: [
          { id: 'main', label: 'Main', selected: selectedTabId === 'main' },
          {
            id: 'points',
            label: 'Points',
            selected: selectedTabId === 'points',
          },
        ],
        starLevel: completedPointCount,
        summary:
          selectedTabId === 'points'
            ? {
                starLevel: completedPointCount,
                headline: `${completedPointCount} ${pluralize(completedPointCount, 'Prestige Point')}`,
                nextRunLabel: nextPointCount
                  ? `Next reward at ${nextPointCount} ${pluralize(nextPointCount, 'Point')}`
                  : 'All listed rewards unlocked',
                flow: `${completedPointCount} ${pluralize(completedPointCount, 'Prestige Point')} Earned`,
                lines: [
                  `${completedPointCount} ${pluralize(completedPointCount, 'Prestige Point')} Earned`,
                ],
              }
            : {
                starLevel: completedPointCount,
                headline: summaryMilestone?.canComplete
                  ? `Ready at Level ${summaryMilestone.level}`
                  : `Reach Level ${getSummaryTargetLevel(summaryMilestone, currentLevel)}`,
                nextRunLabel: `New run starts at Level ${Math.max(
                  1,
                  Math.floor(Number(summaryMilestone?.nextRun?.level) || 1),
                )}`,
                flow: formatLevelFlow(
                  currentLevel,
                  getSummaryTargetLevel(summaryMilestone, currentLevel),
                ),
                resourceLead: 'Starting Resources',
                resources: summaryResources,
                lines: [
                  formatLevelFlow(
                    currentLevel,
                    getSummaryTargetLevel(summaryMilestone, currentLevel),
                  ),
                  `${summaryMilestone?.canComplete ? 'on prestige' : 'next prestige'}: ${formatPrestigeTotals(
                    summaryMilestone?.nextRun,
                  )}`,
                ],
              },
        milestones: (prestige.milestones ?? []).map(
          (milestone, index, milestones) =>
            createPrestigeMilestone(milestone, {
              upcoming:
                index ===
                milestones.findIndex(
                  (candidate) => !candidate.completed && !candidate.canComplete,
                ),
            }),
        ),
        pointRewards: createPrestigePointRewards({
          unlocks: prestige.unlocks,
          completedPointCount,
          nextPointCount,
        }),
        runFocus: prestige.runFocus ?? {},
        confirm,
      },
      actions,
    };
  }

  createBagDialog(
    gameplay = {},
    selectedTabId = 'currencies',
    onSelectTab = null,
    pageStates = null,
    actions = {},
  ) {
    const visibleTabs = getVisibleBagTabs(pageStates);
    const safeTabId = visibleTabs.some((tab) => tab.id === selectedTabId)
      ? selectedTabId
      : 'currencies';
    return {
      title: 'Bag',
      selectedTabId: safeTabId,
      onSelectTab:
        typeof onSelectTab === 'function'
          ? (tabId) => onSelectTab(tabId)
          : null,
      tabs: visibleTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        selected: tab.id === safeTabId,
      })),
      rows:
        safeTabId === 'currencies'
          ? createCurrencyRows(gameplay)
          : createBagItemRows(gameplay, safeTabId, actions),
    };
  }

  createStatsDialog(
    gameplay = {},
    selectedTabId = 'seeds',
    onSelectTab = null,
  ) {
    const safeTabId = STATS_TABS.some((tab) => tab.id === selectedTabId)
      ? selectedTabId
      : 'seeds';
    return {
      title: 'Stats',
      selectedTabId: safeTabId,
      onSelectTab:
        typeof onSelectTab === 'function'
          ? (tabId) => onSelectTab(tabId)
          : null,
      tabs: STATS_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
      })),
      rows: createStatsRows(gameplay.stats, safeTabId),
    };
  }

  createSummonInfoDialog(gameplay = {}, actions = {}) {
    const auto = gameplay.seedSummoning?.autoSummoning ?? {};
    const autoSummonUnlocked = auto.unlocked === true;
    const seeds = gameplay.seedSummoning?.dropChances ?? [];
    return {
      title: 'Summoning Seeds',
      autoSummonUnlocked,
      summaryRows: autoSummonUnlocked
        ? [
            {
              id: 'auto',
              label: 'Auto Summon',
              value: '',
              icon: { kind: 'automation' },
              iconLeading: true,
            },
            {
              id: 'reserve',
              label: 'Keep Mana Above',
              value: String(auto.manaReserve ?? 0),
              valueIconResourceKey: 'mana',
            },
          ]
        : [],
      settingsToggle: autoSummonUnlocked
        ? {
            value: auto.enabled !== false,
            enabled: true,
            onChange: () => actions.toggleSummonAutomation?.(),
          }
        : null,
      manaSlider: autoSummonUnlocked
        ? {
            mode: 'range',
            min: 0,
            max: Math.max(0, Number(auto.maxManaReserve) || 5_000),
            step: Math.max(1, Number(auto.reserveStep) || 1),
            value: Math.max(0, Number(auto.manaReserve) || 0),
            tone: 'blue',
            enabled: true,
            onChange: (value) => actions.setSummonManaReserve?.(value),
          }
        : null,
      actions: [],
      items: seeds.map((seed) => {
        const preference = normalizeSeedDropPreference(seed.dropPreference);
        return {
          id: seed.key ?? seed.itemTypeId,
          label: toTitleCase(splitCamelCase(seed.label ?? seed.key)),
          detail: `${formatPercent(seed.dropChance)} Chance`,
          value: toTitleCase(preference),
          valueTone: SEED_DROP_VALUE_TONES[preference],
          itemKind: 'seed',
          itemKey: seed.key,
          resourceKey: 'seed',
          semanticId: `workshop.summonInfo.seed.${seed.key ?? seed.itemTypeId}`,
          dropSlider: {
            mode: 'milestones',
            value: preference,
            enabled: true,
            options: SEED_DROP_SLIDER_OPTIONS.map((option) => ({
              ...option,
              enabled: true,
            })),
            onChange: (preference) =>
              actions.setSummonDropPreference?.(seed.key, preference),
          },
        };
      }),
    };
  }

  createDiscoveriesDialog(gameplay = {}, actions = {}) {
    const potions = gameplay.discoveries?.potions ?? [];
    return {
      title: 'Discoveries',
      copy: potions.length === 0 ? 'No potion discoveries yet.' : '',
      rows: potions.map((potion, index) =>
        createPotionDiscoveryRowModel(potion, index, actions),
      ),
    };
  }

  createInboxDialog(playerInbox = {}, actions = {}) {
    const mail = playerInbox.mail ?? [];
    return {
      title: 'Inbox',
      status:
        playerInbox.connected === false
          ? 'connecting...'
          : mail.length === 0
            ? 'No Mail'
            : '',
      rows: mail.map((message, index) => {
        const claimable =
          message.hasReward === true && message.rewardCollected !== true;
        return {
          id: message.mailKey ?? message.id ?? index,
          label:
            message.subject ??
            message.title ??
            (message.read ? 'message' : 'new message'),
          value: message.body ?? message.message ?? message.rewardLabel ?? '',
          notification: !message.read || claimable,
          actionLabel: claimable ? 'claim' : '',
          enabled: claimable,
          onActivate: claimable
            ? () => actions.claimInboxReward?.(message.mailKey)
            : () => actions.markInboxRead?.(message.mailKey),
        };
      }),
    };
  }

  createAllianceDialog(
    tradeAlliance = {},
    legacyExpandedAllianceId = null,
    actions = {},
    selectedTabId = 'home',
  ) {
    void legacyExpandedAllianceId;
    const alliance =
      tradeAlliance.alliance ??
      tradeAlliance.currentAlliance ??
      tradeAlliance.ownAlliance ??
      null;
    const members = tradeAlliance.members ?? alliance?.members ?? [];
    const browse =
      tradeAlliance.alliances ?? tradeAlliance.publicAlliances ?? [];
    if (!alliance) {
      const ownApplications = tradeAlliance.ownApplications ?? [];
      const safeTabId = TRADE_ALLIANCE_SOLO_TABS.some(
        (tab) => tab.id === selectedTabId,
      )
        ? selectedTabId
        : 'browse';
      const creating = safeTabId === 'create';
      const tabs = TRADE_ALLIANCE_SOLO_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
        onSelect: () => actions.selectAllianceTab?.(tab.id),
      }));
      return {
        title: 'Trade Alliance',
        directory: !creating,
        selectedTabId: safeTabId,
        tabs,
        status: tradeAlliance.connected === false ? 'Connecting...' : '',
        settings: creating
          ? {
              allianceId: 'new-alliance',
              mode: 'create',
              name: '',
              tag: '',
              tagColor: 'ink',
              bannerColor: DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
              emblemColor: DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
              emblemId: DEFAULT_TRADE_ALLIANCE_EMBLEM,
              description: '',
              notice: '',
              joinMode: 'apply',
              editable: true,
              onSave: (profile) => actions.createAlliance?.(profile),
            }
          : null,
        rows: creating
          ? []
          : browse.map((candidate, index) => {
              const allianceId = candidate.allianceId ?? candidate.id ?? index;
              const application = ownApplications.find(
                (entry) => entry.allianceId === allianceId,
              );
              const joinMode = candidate.joinMode ?? 'apply';
              const candidateMembers = members.filter(
                (member) => member.allianceId === allianceId,
              );
              const leader =
                candidateMembers.find(
                  (member) =>
                    candidate.leaderIdentity &&
                    String(member.memberIdentity) ===
                      String(candidate.leaderIdentity),
                ) ??
                candidateMembers.find(
                  (member) => member.role === 'tradeMaster',
                );
              const action = application
                ? {
                    label: 'Cancel',
                    variant: 'brown-dark',
                    enabled: true,
                    onActivate: () =>
                      actions.cancelAllianceApplication?.(
                        application.applicationKey,
                      ),
                  }
                : joinMode === 'open'
                  ? {
                      label: 'Join',
                      variant: 'green',
                      enabled: true,
                      onActivate: () => actions.joinAlliance?.(allianceId),
                    }
                  : joinMode === 'closed'
                    ? {
                        label: 'Closed',
                        variant: 'gray',
                        enabled: false,
                      }
                    : {
                        label: 'Apply',
                        variant: 'green',
                        enabled: true,
                        onActivate: () => actions.applyAlliance?.(allianceId),
                      };

              return {
                id: allianceId,
                type: 'allianceDirectory',
                allianceId,
                name: candidate.name ?? candidate.allianceName ?? 'Alliance',
                tag: candidate.tag ?? '',
                tagColor: candidate.tagColor ?? 'ink',
                bannerColor:
                  candidate.bannerColor ?? DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
                emblemColor:
                  candidate.emblemColor ?? DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
                emblemId: candidate.emblemId ?? DEFAULT_TRADE_ALLIANCE_EMBLEM,
                leaderName:
                  candidate.leaderName ??
                  candidate.leaderUsername ??
                  leader?.username ??
                  'Unknown',
                leaderCharacter:
                  candidate.leaderCharacter ?? leader?.character ?? 'elara',
                leaderFrame:
                  candidate.leaderFrame ?? leader?.frame ?? 'classic',
                totalIncomeLabel: formatCoinAmount(candidate.totalIncome ?? 0),
                memberCount: Math.max(
                  candidateMembers.length,
                  Math.floor(Number(candidate.memberCount) || 0),
                ),
                memberCapacity: 50,
                action,
                semanticId: `workshop.alliance.directory.${allianceId}`,
                onActivate:
                  typeof actions.openAlliance === 'function'
                    ? () => actions.openAlliance(candidate)
                    : () => actions.selectAlliance?.(allianceId),
              };
            }),
      };
    }

    const allianceId = alliance.allianceId ?? alliance.id ?? '';
    const ownedMembers = tradeAlliance.members
      ? members.filter(
          (member) =>
            String(member.allianceId ?? '').trim() ===
            String(allianceId).trim(),
        )
      : members;
    const memberRows = ownedMembers
      .map((row, index) => {
        const player = createTradeAlliancePlayerRequest(row);
        const role = String(row.role ?? 'trader');
        return {
          id:
            player.identity ||
            String(row.id ?? '').trim() ||
            `${allianceId || 'alliance'}:member:${index}`,
          identity: player.identity,
          memberIdentity: row.memberIdentity ?? row.identity ?? '',
          username: player.username,
          character: player.character,
          frame: player.frame,
          role,
          roleRank:
            Number(row.roleRank) ||
            TRADE_ALLIANCE_ROLE_RANKS[role] ||
            TRADE_ALLIANCE_ROLE_RANKS.trader,
          roleLabel:
            TRADE_ALLIANCE_ROLE_LABELS[role] ??
            titleCaseTradeAllianceLabel(role),
          levelLabel: `Lv ${normalizeVisibleLevel(row.playerLevel) ?? 1}`,
          prestigeCount: Math.max(
            0,
            Math.floor(Number(row.prestigeCount) || 0),
          ),
          totalContributionLabel: formatCoinAmount(
            row.totalContribution ?? 0,
          ),
          semanticId: `workshop.alliance.member.${player.identity || index}`,
          onActivate: () =>
            actions.openPlayer?.({
              ...player,
              allianceMemberContext: true,
            }),
        };
      })
      .sort((left, right) => {
        if (left.roleRank !== right.roleRank) {
          return right.roleRank - left.roleRank;
        }
        return left.username.localeCompare(right.username);
      })
      .map((member, index, rows) => ({
        ...member,
        showRankHeader: index === 0 || rows[index - 1].role !== member.role,
      }));
    const memberCount = Math.max(
      memberRows.length,
      Math.floor(Number(alliance.memberCount) || 0),
    );
    const tag = String(alliance.tag ?? '')
      .trim()
      .toUpperCase();
    const name = String(
      alliance.name ?? alliance.allianceName ?? 'Alliance',
    ).trim();
    const joinMode = String(alliance.joinMode ?? 'closed');
    const seasonIncome = alliance.seasonIncome ?? alliance.weeklyIncome ?? 0;
    const memberCountLabel = `${memberCount}/50`;
    const canEditSettings = tradeAlliance.canEditSettings === true;
    const canManageApplications = tradeAlliance.canManageApplications === true;
    const applicationRows = (tradeAlliance.applications ?? [])
      .filter(
        (application) =>
          String(application?.allianceId ?? '').trim() ===
          String(allianceId).trim(),
      )
      .map((application, index) => {
        const player = createTradeAlliancePlayerRequest({
          ...application,
          identity: application.applicantIdentity ?? application.playerIdentity,
        });
        const applicationKey =
          String(application.applicationKey ?? '').trim() ||
          `${allianceId || 'alliance'}:application:${index}`;
        const playerLevel = normalizeVisibleLevel(application.playerLevel) ?? 1;
        const prestigeCount = Math.max(
          0,
          Math.floor(Number(application.prestigeCount) || 0),
        );
        return {
          id: applicationKey,
          identity: player.identity,
          username: player.username,
          character: player.character,
          frame: player.frame,
          playerLevel,
          prestigeCount,
          totalProducedCoin: Number(application.totalProducedCoin ?? 0),
          detail: `Lv ${playerLevel}`,
          preview: `${formatCoinAmount(application.totalProducedCoin ?? 0)} Produced`,
          semanticId: `workshop.alliance.request.${applicationKey}`,
          onActivate: () => actions.openPlayer?.(player),
          primaryAction: {
            label: 'Accept',
            variant: 'green',
            enabled: canManageApplications,
            onActivate: () =>
              actions.acceptAllianceApplication?.(applicationKey),
          },
          secondaryAction: {
            label: 'Deny',
            variant: 'red',
            enabled: canManageApplications,
            onActivate: () =>
              actions.rejectAllianceApplication?.(applicationKey),
          },
        };
      });
    const memberTabs = TRADE_ALLIANCE_MEMBER_TABS.filter((tab) => {
      if (tab.id === 'settings') {
        return canEditSettings;
      }
      if (tab.id === 'requests') {
        return canManageApplications;
      }
      return true;
    });
    const safeTabId = memberTabs.some((tab) => tab.id === selectedTabId)
      ? selectedTabId
      : 'home';
    const ownMember = tradeAlliance.ownMember ?? null;
    const canLeave = ownMember?.role !== 'tradeMaster' || memberCount <= 1;
    const tabs = memberTabs.map((tab) => ({
      ...tab,
      selected: tab.id === safeTabId,
      notification:
        (tab.id === 'quests' &&
          (tradeAlliance.quests ?? []).some((quest) =>
            isTradeAllianceQuestClaimable(tradeAlliance, quest),
          )) ||
        (tab.id === 'requests' && applicationRows.length > 0),
      onSelect: () => actions.selectAllianceTab?.(tab.id),
    }));
    const tradeInfoRows = [
      {
        id: 'trade-info:members',
        label: 'Members',
        value: memberCountLabel,
      },
      {
        id: 'trade-info:season-income',
        label: 'Season Income',
        value: formatCoinAmount(seasonIncome),
        itemKind: 'resource',
        itemKey: 'coin',
        resourceKey: 'coin',
      },
      {
        id: 'trade-info:membership',
        label: 'Membership',
        value: canLeave ? '' : 'Remove Members First',
        actionLabel: 'Leave',
        actionVariant: 'red',
        actionWidth: 58,
        actionHeight: 28,
        enabled: canLeave,
        semanticId: 'workshop.alliance.leave',
        onActivate: canLeave ? () => actions.leaveAlliance?.() : null,
      },
    ];
    const questRows = createTradeAllianceQuestRows(
      tradeAlliance,
      allianceId,
      actions,
    );

    return {
      title: 'Trade Alliance',
      ownedAlliance: true,
      ownedAllianceHome: safeTabId === 'home',
      rowWidget:
        safeTabId === 'quests'
          ? 'allianceQuest'
          : safeTabId === 'requests'
            ? 'playerRelationship'
            : null,
      selectedTabId: safeTabId,
      tabs,
      status: tradeAlliance.connected === false ? 'connecting...' : '',
      copy: '',
      tradeInfo: {
        identityLabel: `${tag ? `[${tag}] ` : ''}${name}`,
        name,
        tag,
        description: String(alliance.description ?? '').trim(),
        notice: String(alliance.notice ?? '').trim(),
        memberCountLabel,
      },
      tradeInfoRows,
      members: memberRows,
      rows:
        safeTabId === 'quests'
          ? questRows
          : safeTabId === 'requests'
            ? applicationRows
            : memberRows,
      emptyLabel:
        safeTabId === 'quests' && questRows.length === 0
          ? 'No Alliance Quests'
          : safeTabId === 'requests' && applicationRows.length === 0
            ? 'No Pending Requests'
            : '',
      requestsSettings:
        safeTabId === 'requests' && canManageApplications
          ? {
              allianceId,
              joinMode,
              editable: true,
              onSave: (nextJoinMode) =>
                actions.setAllianceJoinMode?.(nextJoinMode),
            }
          : null,
      settings:
        safeTabId === 'settings'
          ? {
              allianceId,
              mode: 'settings',
              name,
              tag,
              tagColor: alliance.tagColor ?? 'ink',
              bannerColor:
                alliance.bannerColor ?? DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
              emblemColor:
                alliance.emblemColor ?? DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
              emblemId: alliance.emblemId ?? DEFAULT_TRADE_ALLIANCE_EMBLEM,
              description: String(alliance.description ?? ''),
              notice: String(alliance.notice ?? ''),
              joinMode,
              editable: canEditSettings,
              canDisband: memberCount <= 1,
              onSave: (profile) => actions.updateAllianceProfile?.(profile),
              onDisband:
                memberCount <= 1 ? () => actions.leaveAlliance?.() : null,
            }
          : null,
    };
  }

  createAllianceWorkspace(
    tradeAlliance = {},
    selectedTabId = 'home',
    actions = {},
  ) {
    const alliance =
      tradeAlliance.alliance ??
      tradeAlliance.currentAlliance ??
      tradeAlliance.ownAlliance ??
      null;
    const workspace = this.createAllianceDialog(
      tradeAlliance,
      null,
      actions,
      selectedTabId,
    );

    if (!alliance) {
      return {
        ...workspace,
        workspace: true,
        flag: null,
        chat: { rows: [], onSubmit: null },
      };
    }

    const allianceId = String(alliance.allianceId ?? alliance.id ?? '').trim();
    const allianceMembers = (
      tradeAlliance.members ??
      alliance.members ??
      []
    ).filter((member) => {
      const memberAllianceId = String(member.allianceId ?? '').trim();
      return !allianceId || !memberAllianceId || memberAllianceId === allianceId;
    });
    const chatMessages = (tradeAlliance.allianceChatMessages ?? []).map(
      (message) => {
        const isSystem =
          String(message.username ?? message.author ?? '').toLowerCase() ===
          'system';
        const announcedPlayer = isSystem
          ? parseWorldChatSystemPlayerAnnouncement(
              message.body ?? message.message ?? '',
            )
          : null;
        const senderIdentity = String(
          message.senderIdentity ?? message.sender_identity ?? '',
        ).trim();
        const username = String(
          announcedPlayer?.username ?? message.username ?? message.author ?? '',
        ).trim();
        const member = allianceMembers.find((candidate) => {
          const memberIdentity = String(
            candidate.memberIdentity ?? candidate.identity ?? '',
          ).trim();
          const memberUsername = String(candidate.username ?? '').trim();
          return isSystem
            ? Boolean(username && memberUsername === username)
            : Boolean(
                (senderIdentity && memberIdentity === senderIdentity) ||
                  (!senderIdentity && username && memberUsername === username),
              );
        });

        return {
          ...message,
          allianceTag: '',
          allianceTagColor: 'ink',
          rankLabel: isSystem
            ? ''
            : TRADE_ALLIANCE_ROLE_LABELS[member?.role] ??
              (member?.role
                ? titleCaseTradeAllianceLabel(member.role)
                : 'Former Member'),
          character: member?.character ?? message.character ?? 'elara',
          frame: member?.frame ?? message.frame ?? 'classic',
          showSystemAvatar: isSystem && Boolean(announcedPlayer),
        };
      },
    );
    const chat = this.createWorldChatDialog(
      {
        connected: tradeAlliance.connected,
        messages: chatMessages,
      },
      {
        openPlayer: actions.openPlayer,
        sendWorldChat: actions.sendAllianceChat,
      },
    );

    return {
      ...workspace,
      workspace: true,
      flag: {
        bannerColor:
          alliance.bannerColor ?? DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
        emblemColor:
          alliance.emblemColor ?? DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
        emblemId: alliance.emblemId ?? DEFAULT_TRADE_ALLIANCE_EMBLEM,
      },
      chat: {
        ...chat,
        title: 'Alliance Chat',
      },
    };
  }

  createLeaderboardDialog(
    leaderboard = {},
    tradeAlliance = {},
    selectedTabId = 'singlePlayer',
    actions = {},
    selectedPeriodId = 'allTime',
  ) {
    const safeTabId = LEADERBOARD_TABS.some((tab) => tab.id === selectedTabId)
      ? selectedTabId
      : 'singlePlayer';
    const period =
      LEADERBOARD_PERIODS.find(
        (candidate) => candidate.id === selectedPeriodId,
      ) ?? LEADERBOARD_PERIODS.at(-1);
    const users = getLeaderboardUsers(leaderboard, period);
    const currentUser = getLeaderboardCurrentUser(leaderboard, period);
    const visibleUsers = appendCurrentLeaderboardUser(
      users.slice(0, 100),
      currentUser,
    );
    const alliances = getLeaderboardAlliances(tradeAlliance, period);
    const allianceMembers = Array.isArray(tradeAlliance.members)
      ? tradeAlliance.members
      : [];
    const ownAlliance =
      tradeAlliance.ownAlliance ??
      tradeAlliance.currentAlliance ??
      tradeAlliance.alliance ??
      null;
    const ownAllianceId = String(
      ownAlliance?.allianceId ?? ownAlliance?.id ?? '',
    ).trim();
    const ownAllianceTag = String(
      ownAlliance?.tag ?? ownAlliance?.allianceTag ?? '',
    )
      .trim()
      .toLowerCase();
    const rows =
      safeTabId === 'alliance'
        ? alliances.slice(0, 10).map((alliance, index) => {
            const allianceId = alliance.allianceId ?? alliance.id ?? alliance.name ?? index;
            const members = allianceMembers.filter(
              (member) =>
                String(member.allianceId ?? '').trim() === String(allianceId).trim(),
            );
            const leader =
              members.find(
                (member) =>
                  alliance.leaderIdentity &&
                  String(member.memberIdentity) === String(alliance.leaderIdentity),
              ) ?? members.find((member) => member.role === 'tradeMaster');
            return {
              id: allianceId,
              type: 'leaderboardAlliance',
              rank: normalizeLeaderboardRank(alliance.rank, index),
              name: alliance.name ?? alliance.allianceName ?? 'Alliance',
              allianceTag: String(
                alliance.tag ?? alliance.allianceTag ?? '',
              ).trim(),
              allianceTagColor:
                alliance.tagColor ?? alliance.allianceTagColor ?? 'ink',
              bannerColor:
                alliance.bannerColor ?? DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
              emblemColor:
                alliance.emblemColor ?? DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
              emblemId: alliance.emblemId ?? DEFAULT_TRADE_ALLIANCE_EMBLEM,
              leaderName:
                alliance.leaderName ??
                alliance.leaderUsername ??
                leader?.username ??
                'Unknown',
              leaderCharacter:
                alliance.leaderCharacter ?? leader?.character ?? 'elara',
              leaderFrame:
                alliance.leaderFrame ?? leader?.frame ?? 'classic',
              memberCount: Math.max(
                members.length,
                Math.floor(Number(alliance.memberCount) || 0),
              ),
              memberCapacity: Math.max(
                1,
                Math.floor(Number(alliance.memberCapacity) || 50),
              ),
              current:
                alliance.current === true ||
                isCurrentLeaderboardAlliance(alliance, {
                  ownAllianceId,
                  ownAllianceTag,
                }),
              totalCoinLabel: formatCoinAmount(
                alliance[period.valueKey] ??
                  alliance.totalIncome ??
                  alliance.totalGeneratedCoin ??
                  alliance.income ??
                  0,
              ),
              totalSuffix: period.id === 'allTime' ? 'total' : period.label.toLowerCase(),
              onActivate:
                typeof actions.openAlliance === 'function'
                  ? () => actions.openAlliance(alliance)
                  : null,
            };
          })
        : visibleUsers.map((user, index) => ({
            id:
              String(user.identity ?? '').trim() ||
              `${user.name ?? user.username ?? 'Wizard'}:${index}`,
            type: 'leaderboardPlayer',
            rank: normalizeLeaderboardRank(user.rank, index),
            username: user.name ?? user.username ?? 'Wizard',
            allianceTag: String(
              user.allianceTag ?? user.alliance_tag ?? '',
            ).trim(),
            allianceTagColor:
              user.allianceTagColor ?? user.alliance_tag_color ?? 'ink',
            character: user.character ?? 'elara',
            frame: user.frame ?? 'classic',
            playerLevel: Math.max(
              1,
              Math.floor(Number(user.playerLevel ?? user.player_level) || 1),
            ),
            prestigeCount: Math.max(
              0,
              Math.floor(
                Number(user.prestigeCount ?? user.prestige_count) || 0,
              ),
            ),
            current: user === currentUser || user.current === true,
            totalCoinLabel: formatCoinAmount(
              user[period.valueKey] ??
                user.totalIncome ??
                user.totalGeneratedCoin ??
                user.income ??
                0,
            ),
            onActivate:
              typeof actions.openPlayer === 'function'
                ? () => actions.openPlayer(user)
                : null,
          }));

    return {
      title: 'Leaderboard',
      rowWidget: 'leaderboard',
      emptyLabel:
        safeTabId === 'alliance' ? 'No alliances yet' : 'No players yet',
      selectedTabId: safeTabId,
      selectedPeriodId: period.id,
      onSelectTab: (tabId) => actions.selectLeaderboardTab?.(tabId),
      onSelectPeriod: (periodId) => actions.selectLeaderboardPeriod?.(periodId),
      tabs: LEADERBOARD_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
      })),
      periodTabs: LEADERBOARD_PERIODS.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        selected: candidate.id === period.id,
      })),
      rows,
    };
  }

  createPersonalTasksDialog(
    gameplay = {},
    selectedTabId = 'tasks',
    actions = {},
  ) {
    const tasks = gameplay.personalTasks ?? {};
    const safeTabId = selectedTabId === 'rewards' ? 'rewards' : 'tasks';
    const rows = [];
    const daily = tasks.daily;
    const weekly = tasks.weekly;
    const periodSections = [
      createPersonalTaskPeriodSection('daily', 'Today', daily),
      createPersonalTaskPeriodSection('weekly', 'This Week', weekly),
    ].filter(Boolean);

    if (safeTabId === 'rewards') {
      for (const periodId of ['daily', 'weekly']) {
        const period = tasks[periodId];
        if (!period) {
          continue;
        }

        for (const reward of period.rewards ?? period.milestones ?? []) {
          const threshold = Math.max(
            0,
            Math.floor(Number(reward.threshold) || 0),
          );
          const canClaim =
            reward.claimable === true &&
            typeof actions.claimPersonalTaskMilestoneReward === 'function';
          const row = {
            id: `${periodId}:reward:${threshold}`,
            sectionId: periodId,
            label: `${formatPersonalTaskNumber(threshold)} Points`,
            resourceValues: createPersonalTaskRewardValues(reward.reward),
            value: reward.claimed
              ? 'Claimed'
              : canClaim
                ? ''
                : reward.claimable
                  ? 'Ready'
                  : 'Locked',
            height: 30,
            ...(reward.claimed || !reward.claimable ? { muted: true } : {}),
            ...(reward.claimed ? { statusIcon: 'checkmark' } : {}),
          };

          if (canClaim) {
            Object.assign(row, {
              actionLabel: 'Claim',
              actionHeight: 27,
              actionVariant: 'green',
              enabled: true,
              notification: true,
              semanticId: `workshop.personalTasks.${periodId}.reward.${threshold}`,
              onActivate: () =>
                actions.claimPersonalTaskMilestoneReward(periodId, threshold),
            });
          } else if (!reward.claimed) {
            Object.assign(row, {
              actionLabel: reward.claimable ? 'Ready' : 'Locked',
              actionHeight: 27,
              actionVariant: 'green',
              enabled: false,
              value: '',
            });
          }

          rows.push(row);
        }
      }
    } else {
      if (daily) {
        const dailySection = periodSections.find(
          (section) => section.id === 'daily',
        );
        if (dailySection) {
          dailySection.detail = `${daily.completedTasks ?? 0}/${
            daily.totalTasks ?? 0
          } Tasks`;
        }
      }

      for (const task of daily?.tasks ?? []) {
        const progress =
          task.progressQuantity ?? task.progress ?? task.current ?? 0;
        const required =
          task.requiredQuantity ?? task.required ?? task.target ?? 0;
        const pointValue = Math.max(
          0,
          Math.floor(Number(task.pointValue) || 0),
        );
        const completed = task.completed === true;
        rows.push({
          id: `daily:${task.id ?? task.taskId}`,
          sectionId: 'daily',
          label: `${toTitleCase(
            task.label ?? task.description ?? task.id,
          )} · +${pointValue} Points`,
          value: completed ? 'Done' : `${progress}/${required}`,
          muted: completed,
          ...(completed ? { statusIcon: 'checkmark' } : {}),
        });
      }
    }

    const claimableRewards = Number.isFinite(tasks.claimableRewards)
      ? Math.max(0, Math.floor(tasks.claimableRewards))
      : [daily, weekly].reduce(
          (total, period) =>
            total +
            (period?.rewards ?? period?.milestones ?? []).filter(
              (reward) => reward.claimable === true,
            ).length,
          0,
        );

    return {
      title: 'Daily Tasks',
      selectedTabId: safeTabId,
      onSelectTab: (tabId) => actions.selectPersonalTasksTab?.(tabId),
      tabs: PERSONAL_TASK_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
        notification: tab.id === 'rewards' && claimableRewards > 0,
        onSelect: (tabId) => actions.selectPersonalTasksTab?.(tabId),
      })),
      periodSections,
      status: tasks.unlocked
        ? ''
        : `unlocks at level ${tasks.unlockLevel ?? 4}`,
      rows,
    };
  }

  createWorldEventDialog(
    gameplay = {},
    worldEventLeaderboard = {},
    player = {},
    selectedTabId = 'tasks',
    actions = {},
  ) {
    const notice = gameplay.worldNotice ?? {};
    const current = notice.current;
    const safeTabId = WORLD_EVENT_TABS.some((tab) => tab.id === selectedTabId)
      ? selectedTabId
      : 'tasks';
    const localLeaderboard = current?.leaderboard ?? {};
    const sharedLeaderboard =
      worldEventLeaderboard?.periodKey === current?.periodKey &&
      worldEventLeaderboard?.eventId === current?.eventId
        ? worldEventLeaderboard
        : {};
    const leaderboardSource =
      sharedLeaderboard.topWorldEventUsers ??
      sharedLeaderboard.topUsers ??
      localLeaderboard.rows ??
      [];
    const projectedLeaderboardRows = Array.isArray(leaderboardSource)
      ? leaderboardSource
      : [];
    const currentLeaderboardUser =
      sharedLeaderboard.currentWorldEventUser ??
      sharedLeaderboard.currentUser ??
      null;
    const currentEventPoints = Math.max(
      0,
      Math.floor(
        Number(
          localLeaderboard.currentPoints ?? sharedLeaderboard.currentPoints,
        ) || 0,
      ),
    );
    const remainingQualificationPoints = Math.max(
      0,
      Math.floor(
        Number(
          localLeaderboard.remainingQualificationPoints ??
            sharedLeaderboard.remainingQualificationPoints,
        ) || 0,
      ),
    );
    const qualificationPoints = Math.max(
      0,
      Math.floor(
        Number(
          localLeaderboard.qualificationPoints ??
            sharedLeaderboard.qualificationPoints,
        ) || currentEventPoints + remainingQualificationPoints,
      ),
    );
    const qualifiedForLeaderboardRewards =
      localLeaderboard.qualified === true ||
      sharedLeaderboard.qualified === true ||
      currentEventPoints >= qualificationPoints;
    const leaderboardRows =
      projectedLeaderboardRows.length > 0
        ? projectedLeaderboardRows
        : currentLeaderboardUser
          ? [currentLeaderboardUser]
          : [
              {
                rank: '-',
                name: player.username ?? 'Wizard',
                playerLevel:
                  gameplay.tasks?.currentLevel ??
                  gameplay.playerLevel?.currentLevel,
                points: localLeaderboard.currentPoints ?? 0,
                current: true,
              },
            ];
    const currentLeaderboardRank = normalizeWorldEventLeaderboardRank(
      currentLeaderboardUser?.rank ??
        leaderboardRows.find((user) => user?.current === true)?.rank,
    );
    let rows = [];

    if (safeTabId === 'leaderboard') {
      rows = leaderboardRows.map((user, index) => {
        const identity = String(user.identity ?? '').trim();
        const currentIdentity = String(
          currentLeaderboardUser?.identity ?? '',
        ).trim();

        return {
          id: `leaderboard:${user.rank ?? index + 1}:${
            user.identity ?? user.name ?? index
          }`,
          type: 'leaderboardPlayer',
          rank: normalizeLeaderboardRank(user.rank, index),
          username: user.name ?? user.username ?? player.username ?? 'Wizard',
          allianceTag: String(
            user.allianceTag ?? user.alliance_tag ?? '',
          ).trim(),
          allianceTagColor:
            user.allianceTagColor ?? user.alliance_tag_color ?? 'ink',
          character: user.character ?? 'elara',
          frame: user.frame ?? 'classic',
          playerLevel: Math.max(
            1,
            Math.floor(Number(user.playerLevel ?? user.player_level) || 1),
          ),
          prestigeCount: Math.max(
            0,
            Math.floor(Number(user.prestigeCount ?? user.prestige_count) || 0),
          ),
          current:
            user.current === true ||
            user === currentLeaderboardUser ||
            Boolean(
              identity && currentIdentity && identity === currentIdentity,
            ),
          totalMetric: 'points',
          totalLabel: formatWorldEventNumber(user.points),
          onActivate:
            typeof actions.openPlayer === 'function'
              ? () => actions.openPlayer(user)
              : null,
        };
      });
    } else if (safeTabId === 'rewards') {
      rows = (
        localLeaderboard.rewardTiers ??
        sharedLeaderboard.rewardTiers ??
        []
      ).map((tier) => {
        const current =
          qualifiedForLeaderboardRewards &&
          isWorldEventRewardTierForRank(tier, currentLeaderboardRank);

        return {
          id: `reward:${tier.rankLabel}`,
          type: 'worldEventReward',
          rankLabel: toTitleCase(`Rank ${tier.rankLabel}`),
          rewards: [
            { resourceKey: 'emerald', amount: Number(tier.emerald) || 0 },
            { resourceKey: 'crystal', amount: Number(tier.crystal) || 0 },
          ]
            .filter(({ amount }) => amount > 0)
            .map(({ resourceKey, amount }) => ({
              resourceKey,
              amountLabel: formatWorldEventNumber(amount),
            })),
          ...(current ? { current: true } : {}),
        };
      });
    } else {
      rows = (current?.requests ?? current?.options ?? [])
        .slice(0, WORLD_EVENT_MAX_QUEST_ROWS)
        .map((request, index) => {
          const requestId =
            request.requestId ?? request.id ?? request.key ?? index;
          const donationOptions = (request.donationOptions ?? []).map(
            (option, optionIndex) => {
              const optionKey = option.optionKey ?? optionIndex;
              const enabled =
                typeof actions.openWorldEventDonation === 'function';
              const itemKind = getWorldEventDonationItemKind(option);
              return {
                id: `donation:${requestId}:${optionKey}`,
                label: toTitleCase(option.label ?? 'Donation'),
                pointsEachLabel: `${formatWorldEventNumber(
                  option.pointsPerUnit,
                )} points each`,
                totalLabel: `${
                  option.collectedPointText ??
                  `${formatWorldEventNumber(option.contributionPoints)} points`
                } total`,
                itemKind,
                itemKey: option.itemKey,
                resourceKey: option.resourceType === 'coin' ? 'coin' : itemKind,
                actionLabel: enabled ? 'Donate' : 'Unavailable',
                enabled,
                notification: false,
                semanticId: `workshop.worldEvent.quest.${requestId}.donation.${optionKey}`,
                ...(enabled
                  ? {
                      onActivate: () =>
                        actions.openWorldEventDonation(requestId, optionKey),
                    }
                  : {}),
              };
            },
          );
          return {
            id: `quest:${requestId}`,
            requestId,
            type: 'worldEventQuest',
            title: toTitleCase(request.title ?? request.label ?? 'Quest'),
            pointsLabel:
              request.collectedPointText ??
              `${formatWorldEventNumber(request.contributionPoints)} points`,
            description: toSentenceCase(
              [request.situation, request.description]
                .filter(Boolean)
                .join(' '),
            ),
            progressLabel:
              donationOptions.length === 0
                ? (request.collectedPointText ??
                  `${formatWorldEventNumber(
                    request.contributionPoints,
                  )} points total`)
                : '',
            statusLabel:
              donationOptions.length === 0
                ? toSentenceCase(request.actionText ?? '')
                : '',
            donationOptions,
          };
        });
    }

    const qualificationStatus =
      current && safeTabId === 'rewards'
        ? `Leaderboard Rewards: ${formatWorldEventNumber(
            qualificationPoints,
          )} points to qualify`
        : '';

    return {
      title: 'World Event',
      status: notice.unlocked
        ? qualificationStatus
        : `Unlocks at level ${notice.unlockLevel ?? 4}`,
      selectedTabId: safeTabId,
      rowWidget:
        safeTabId === 'tasks'
          ? 'worldEventQuest'
          : safeTabId === 'leaderboard'
            ? 'leaderboard'
            : 'worldEventReward',
      header: current
        ? {
            artAssetId: WORLD_EVENT_ART_ASSET_BY_FAMILY[current.family] ?? '',
            headline: toTitleCase(current.headline ?? 'World Event'),
            body: toSentenceCase(
              Array.isArray(current.body)
                ? current.body.join('\n')
                : (current.body ?? ''),
            ),
            meta: `${formatWorldEventNumber(
              currentEventPoints,
            )} points · ${formatWorldEventTimer(current.resetLabel)}`,
          }
        : null,
      onSelectTab: (tabId) => actions.selectWorldEventTab?.(tabId),
      tabs: WORLD_EVENT_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
        onSelect: (tabId) => actions.selectWorldEventTab?.(tabId),
      })),
      rows,
    };
  }

  createWorldEventDonationDialog(gameplay = {}, draft = null, actions = {}) {
    const requests = gameplay.worldNotice?.current?.requests ?? [];
    const request = requests.find(
      (candidate) => candidate?.requestId === draft?.requestId,
    );
    const option = request?.donationOptions?.find(
      (candidate) => candidate?.optionKey === draft?.optionKey,
    );

    if (!request || !option) {
      return {
        title: 'Donate',
        status: 'Donation is no longer available.',
        rows: [],
      };
    }

    const maximum = Math.max(
      0,
      Math.floor(
        Number(option.maxDonateQuantity ?? option.availableQuantity) || 0,
      ),
    );
    const amount =
      maximum > 0
        ? Math.min(maximum, Math.max(1, Math.floor(Number(draft?.amount) || 1)))
        : 0;
    const points =
      amount * Math.max(0, Math.floor(Number(option.pointsPerUnit) || 0));
    const canDonate =
      maximum > 0 && typeof actions.confirmWorldEventDonation === 'function';
    const itemKind = getWorldEventDonationItemKind(option);
    const isCoinDonation = option.resourceType === 'coin';
    const questTitle = toTitleCase(request.title ?? request.label ?? 'Donate');

    return {
      title: questTitle,
      status: '',
      featuredItem: {
        id: 'giving',
        label: toTitleCase(option.label ?? ''),
        detail: 'Owned',
        value: formatWorldEventNumber(maximum),
        itemKind,
        itemKey: option.itemKey,
        resourceKey: isCoinDonation ? 'coin' : null,
        iconSize: 36,
      },
      summaryRows: [
        {
          id: 'total',
          label: 'Already Donated',
          value:
            option.collectedPointText ??
            `${formatWorldEventNumber(option.contributionPoints)} points`,
        },
        {
          id: 'amount',
          label: 'Amount',
          value: `${formatWorldEventNumber(amount)} / ${formatWorldEventNumber(maximum)}`,
        },
        {
          id: 'points',
          label: 'Earn',
          value: `+${formatWorldEventNumber(points)} points`,
          valueTone: 'root',
        },
      ],
      range: {
        enabled:
          maximum > 0 &&
          typeof actions.adjustWorldEventDonationAmount === 'function',
        tone: 'root',
        min: maximum > 0 ? 1 : 0,
        max: maximum,
        step: 1,
        value: amount,
        onChange: (quantity) =>
          actions.adjustWorldEventDonationAmount?.(quantity - amount),
      },
      actions: [
        {
          id: 'confirm',
          label:
            amount > 0 ? `Donate x${formatWorldEventNumber(amount)}` : 'Donate',
          variant: 'green',
          enabled: canDonate,
          semanticId: `workshop.worldEvent.donate.${request.requestId}.${option.optionKey}`,
          action: () =>
            actions.confirmWorldEventDonation?.(
              request.requestId,
              option.optionKey,
              amount,
            ),
        },
      ],
    };
  }

  createWorldChatDialog(
    worldChat = {},
    actions = {},
    { selectedReportMessageId = null } = {},
  ) {
    const canSend =
      worldChat.connected !== false &&
      typeof actions.sendWorldChat === 'function';
    return {
      title: 'World Chat',
      status: worldChat.connected === false ? 'connecting...' : '',
      composer: {
        placeholder: 'Message',
        maxLength: 160,
        enabled: canSend,
      },
      rows: (worldChat.messages ?? []).map((message, index) => {
        const body = message.body ?? message.message ?? '';
        const username = message.username ?? message.author ?? 'Wizard';
        const isSystem = String(username).toLowerCase() === 'system';
        const systemPlayer = isSystem
          ? parseWorldChatSystemPlayerAnnouncement(body)
          : null;
        const systemPlayerDetail = systemPlayer?.detail.trimStart() ?? '';
        const id = message.id ?? message.messageId ?? index;
        const canReport =
          !isSystem &&
          message.isOwn !== true &&
          typeof actions.selectWorldChatMessageForReport === 'function';
        const selectedForReport =
          canReport && String(id) === String(selectedReportMessageId ?? '');
        const reportHighlightId = canReport ? `world-chat-report:${id}` : null;
        const canOpenPlayer =
          typeof actions.openPlayer === 'function' &&
          (!isSystem || Boolean(systemPlayer));
        const bodyRuns = createWorldChatBodyRuns(
          body,
          {
            bodyRuns: message.bodyRuns,
            character: message.character,
            frame: message.frame,
            isSystem,
            systemPlayer,
          },
        );
        const hasInlinePlayerAvatar = bodyRuns.some(
          (run) => run.kind === 'widget' && run.widget === 'playerAvatar',
        );
        return {
          id,
          type: isSystem ? 'system' : 'player',
          isOwn: !isSystem && message.isOwn === true,
          username: isSystem ? 'System' : username,
          body,
          systemPlayerUsername: systemPlayer?.username ?? '',
          systemPlayerDetail,
          bodyRuns,
          allianceTag: message.allianceTag ?? message.alliance_tag ?? '',
          allianceTagColor:
            message.allianceTagColor ?? message.alliance_tag_color ?? 'ink',
          rankLabel: String(
            message.rankLabel ?? message.rank_label ?? '',
          ).trim(),
          character: message.character ?? 'elara',
          frame: message.frame ?? 'classic',
          showSystemAvatar:
            message.showSystemAvatar === true && !hasInlinePlayerAvatar,
          connected:
            !isSystem &&
            (message.connected === true || message.isOwn === true),
          ageLabel: formatWorldChatMessageAge(message.sentAtMs),
          canReport,
          selectedForReport,
          reportHighlightId,
          semanticId: canOpenPlayer
            ? `${isSystem ? 'world-chat-system-player' : 'world-chat-player'}:${id}`
            : null,
          onActivate: !canOpenPlayer
            ? null
            : () =>
                actions.openPlayer(
                  systemPlayer
                    ? {
                        ...message,
                        username: systemPlayer.username,
                      }
                    : message,
                ),
          onLongPress: canReport
            ? () =>
                actions.selectWorldChatMessageForReport(message, {
                  targetId: reportHighlightId,
                })
            : null,
        };
      }),
      onSubmit: canSend ? (body) => actions.sendWorldChat(body) : null,
    };
  }

  createWorldChatPreview(
    worldChat = {},
    { visible = true, onActivate = null } = {},
  ) {
    return {
      ...createWorldChatPreview(worldChat),
      visible,
      onActivate,
    };
  }
}

function getLeaderboardUsers(
  leaderboard = {},
  period = LEADERBOARD_PERIODS.at(-1),
) {
  const source = leaderboard.leaderboard ?? leaderboard;
  const users =
    source[period.userListKey] ??
    (period.id === 'allTime' ? source.topAllTimeUsers : null) ??
    source.topGeneratedCoinUsers ??
    source.topUsers ??
    source.topIncomeUsers ??
    [];
  return Array.isArray(users) ? users : [];
}

function getLeaderboardCurrentUser(
  leaderboard = {},
  period = LEADERBOARD_PERIODS.at(-1),
) {
  const source = leaderboard.leaderboard ?? leaderboard;
  return (
    source[period.currentUserKey] ??
    (period.id === 'allTime'
      ? (source.currentGeneratedCoinUser ?? source.currentUser)
      : null) ??
    null
  );
}

function appendCurrentLeaderboardUser(users, currentUser) {
  const seenIdentities = new Set();
  const uniqueUsers = users.filter((user) => {
    const identity = String(user.identity ?? '')
      .trim()
      .toLowerCase();
    if (!identity) {
      return true;
    }
    if (seenIdentities.has(identity)) {
      return false;
    }
    seenIdentities.add(identity);
    return true;
  });

  if (!currentUser) {
    return uniqueUsers;
  }
  const currentIdentity = String(currentUser.identity ?? '')
    .trim()
    .toLowerCase();
  const currentAlreadyVisible = uniqueUsers.some((user) =>
    currentIdentity
      ? String(user.identity ?? '')
          .trim()
          .toLowerCase() === currentIdentity
      : user === currentUser,
  );
  if (currentAlreadyVisible) {
    return uniqueUsers.map((user) =>
      (currentIdentity &&
        String(user.identity ?? '')
          .trim()
          .toLowerCase() === currentIdentity) ||
      user === currentUser
        ? { ...user, current: true }
        : user,
    );
  }
  return [...uniqueUsers, { ...currentUser, current: true }];
}

function getLeaderboardAlliances(
  tradeAlliance = {},
  period = LEADERBOARD_PERIODS.at(-1),
) {
  const alliances =
    tradeAlliance[period.allianceListKey] ??
    (period.id === 'allTime' ? tradeAlliance.topAllTimeAlliances : null) ??
    tradeAlliance.topAlliances ??
    tradeAlliance.alliances ??
    [];
  return Array.isArray(alliances) ? alliances : [];
}

function isCurrentLeaderboardAlliance(
  alliance = {},
  { ownAllianceId = '', ownAllianceTag = '' } = {},
) {
  const allianceId = String(alliance.allianceId ?? alliance.id ?? '').trim();
  if (ownAllianceId && allianceId) {
    return allianceId === ownAllianceId;
  }

  const allianceTag = String(alliance.tag ?? alliance.allianceTag ?? '')
    .trim()
    .toLowerCase();
  return Boolean(ownAllianceTag && allianceTag && allianceTag === ownAllianceTag);
}

function normalizeLeaderboardRank(rank, index) {
  const safeRank = Math.floor(Number(rank));
  return Number.isFinite(safeRank) && safeRank >= 1 ? safeRank : index + 1;
}

function normalizeWorldEventLeaderboardRank(rank) {
  const safeRank = Math.floor(Number(rank));
  return Number.isFinite(safeRank) && safeRank >= 1 ? safeRank : null;
}

function isWorldEventRewardTierForRank(tier = {}, rank = null) {
  if (rank === null) {
    return false;
  }

  const explicitMin = normalizeWorldEventLeaderboardRank(
    tier.minRank ?? tier.min_rank,
  );
  const explicitMax = normalizeWorldEventLeaderboardRank(
    tier.maxRank ?? tier.max_rank,
  );
  if (explicitMin !== null) {
    return rank >= explicitMin && (explicitMax === null || rank <= explicitMax);
  }

  const label = String(tier.rankLabel ?? tier.rank_label ?? '').trim();
  const range = label.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return rank >= Number(range[1]) && rank <= Number(range[2]);
  }

  const openEnded = label.match(/(\d+)\s*\+/);
  if (openEnded) {
    return rank >= Number(openEnded[1]);
  }

  const exact = label.match(/^\D*(\d+)\D*$/);
  return exact ? rank === Number(exact[1]) : false;
}

function normalizeVisibleLevel(value) {
  const level = Math.floor(Number(value));
  return Number.isFinite(level) && level >= 1 ? level : null;
}

function titleCaseTradeAllianceLabel(value) {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createTradeAlliancePlayerRequest(member = {}) {
  return {
    ...member,
    identity: String(
      member.identity ?? member.playerIdentity ?? member.memberIdentity ?? '',
    ).trim(),
    username: member.username ?? member.name ?? member.allianceName ?? 'Wizard',
    character: member.character ?? 'elara',
    frame: member.frame ?? 'classic',
  };
}

function createTradeAllianceQuestRows(tradeAlliance, allianceId, actions) {
  const participationLock =
    getTradeAllianceQuestParticipationLock(tradeAlliance);
  return (tradeAlliance.quests ?? [])
    .filter(
      (quest) =>
        String(quest.allianceId ?? '').trim() ===
        String(allianceId ?? '').trim(),
    )
    .map((quest, index) => ({ quest, index }))
    .sort((left, right) => {
      const claimedDifference =
        Number(Boolean(left.quest.claimed)) -
        Number(Boolean(right.quest.claimed));
      return claimedDifference || left.index - right.index;
    })
    .map(({ quest, index }) => {
      const contribution = getOwnTradeAllianceQuestContribution(
        tradeAlliance,
        quest,
      );
      const itemFillQuest =
        quest.questType === 'itemFill' && Boolean(quest.itemKey);
      const incomeRouteQuest = quest.questType === 'allianceIncome';
      const itemKind = itemFillQuest
        ? resolveTradeAllianceQuestItemKind(quest)
        : incomeRouteQuest
          ? 'resource'
          : null;
      const remainingProgress = Math.max(
        0,
        Number(quest.target ?? 0) - Number(quest.progress ?? 0),
      );
      const remainingContribution = Math.max(
        0,
        Number(quest.minContribution ?? 0) - contribution,
      );
      const needsFill =
        itemFillQuest && Math.max(remainingProgress, remainingContribution) > 0;
      const locked = Boolean(participationLock);
      const claimed = quest.claimed === true;
      const claimable = isTradeAllianceQuestClaimable(tradeAlliance, quest, {
        locked,
      });
      const actionLabel = claimed
        ? 'Claimed'
        : locked
          ? 'Locked'
          : needsFill
            ? 'Fill'
            : 'Claim';
      const canFill =
        needsFill && actions.canFillAllianceQuest?.(quest) !== false;
      const enabled = !claimed && !locked && (canFill || claimable);
      const routeLabel = 'Your contribution';
      const title = toSentenceCase(quest.label ?? 'Alliance Quest');
      const target = Math.max(0, Number(quest.target ?? 0));
      const currentProgress = Math.max(0, Number(quest.progress ?? 0));
      const objectiveLabel = formatTradeAllianceQuestObjective(quest, {
        incomeRouteQuest,
        itemFillQuest,
        title,
      });
      const lockReason = locked
        ? formatTradeAllianceQuestLockReason(participationLock)
        : '';

      return {
        id: quest.questId ?? `alliance-quest-${index}`,
        title,
        objectiveLabel,
        contributionLabel: `${routeLabel} ${formatWholeNumber(
          contribution,
        )}/${formatWholeNumber(quest.minContribution)}`,
        progressLabel: `${formatWholeNumber(quest.progress)}/${formatWholeNumber(
          quest.target,
        )}`,
        progress: target > 0 ? currentProgress / target : 0,
        itemKind,
        itemKey: itemFillQuest
          ? quest.itemKey
          : incomeRouteQuest
            ? 'coin'
            : null,
        rewardAmountLabel: formatWholeNumber(quest.crystalReward),
        rewardResource: 'crystal',
        label: `${title}\n${routeLabel} ${formatWholeNumber(
          contribution,
        )}/${formatWholeNumber(quest.minContribution)}`,
        value: `${formatWholeNumber(quest.progress)}/${formatWholeNumber(
          quest.target,
        )}\n${formatWholeNumber(quest.crystalReward)} Amber`,
        height: 48,
        actionLabel,
        actionVariant: enabled ? 'green' : 'gray',
        actionWidth: 72,
        actionHeight: 42,
        enabled,
        claimed,
        lockReason,
        notification: claimable,
        semanticId: `workshop.alliance.quest.${quest.questId ?? index}`,
        onActivate: locked
          ? () => actions.showAllianceQuestLockReason?.(lockReason)
          : enabled
            ? () =>
                needsFill
                  ? actions.fillAllianceQuest?.(quest)
                  : actions.claimAllianceQuest?.(quest.questId)
            : null,
      };
    });
}

function formatTradeAllianceQuestObjective(
  quest = {},
  { incomeRouteQuest = false, itemFillQuest = false, title = '' } = {},
) {
  const target = Math.max(0, Math.floor(Number(quest.target) || 0));
  const amount = formatWholeNumber(target);

  if (incomeRouteQuest) {
    return `Collect ${amount} ${pluralize(target, 'Gold Coin')}`;
  }

  if (itemFillQuest) {
    const itemLabel = String(quest.label ?? '')
      .replace(/^fill\s+/i, '')
      .replace(/^\d[\d,]*\s+/, '')
      .trim();
    const readableItem = itemLabel || titleCaseTradeAllianceLabel(quest.itemKey);
    return `Donate ${amount} ${pluralizeQuestItem(target, readableItem)}`;
  }

  return `Complete ${title || 'this alliance quest'}`;
}

function pluralizeQuestItem(count, itemLabel) {
  const label = toTitleCase(String(itemLabel ?? '').trim());
  if (Number(count) === 1 || !label || /s$/i.test(label)) {
    return label;
  }
  return `${label}s`;
}

function formatTradeAllianceQuestLockReason(participationLock = {}) {
  const allianceName = String(
    participationLock.allianceName ?? 'another alliance',
  ).trim();
  return `Quest progress this week belongs to ${allianceName}. Rejoin that alliance to continue, or wait for the weekly reset.`;
}

function resolveTradeAllianceQuestItemKind(quest = {}) {
  const explicitKind = String(quest.itemKind ?? '')
    .trim()
    .toLowerCase();
  if (explicitKind) {
    return explicitKind;
  }

  const itemKey = String(quest.itemKey ?? '').trim();
  if (itemKey.endsWith('Seed')) {
    return 'seed';
  }
  if (itemKey.endsWith('Herb')) {
    return 'herb';
  }

  return itemKey ? 'potion' : null;
}

function formatWholeNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function createPersonalTaskPeriodSection(id, title, period) {
  if (!period) {
    return null;
  }

  const currentPoints = Math.max(
    0,
    Math.floor(Number(period.currentPoints) || 0),
  );
  const maxPoints = Math.max(1, Math.floor(Number(period.maxPoints) || 1));

  return {
    id,
    title,
    currentPoints,
    maxPoints,
    pointsLabel: `${formatPersonalTaskNumber(currentPoints)} / ${formatPersonalTaskNumber(maxPoints)} Points`,
    progress: Math.min(1, currentPoints / maxPoints),
    resetLabel: formatPersonalTaskResetLabel(period.resetLabel),
  };
}

function createPersonalTaskRewardValues(reward = {}) {
  const values = [];

  for (const resourceKey of ['coin', 'crystal']) {
    const amount = Math.max(0, Math.floor(Number(reward?.[resourceKey]) || 0));
    if (amount > 0) {
      values.push({
        resourceKey,
        amountLabel: `+${formatPersonalTaskNumber(amount)}`,
      });
    }
  }

  return values;
}

function formatPersonalTaskResetLabel(value) {
  const remaining = String(value ?? '')
    .trim()
    .replace(/^resets\s+/i, '');

  if (!remaining) {
    return '';
  }

  return remaining.toLowerCase() === 'now'
    ? 'Resets now'
    : `Resets in ${remaining}`;
}

function formatPersonalTaskNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function getPageContextResource(pageId, researchTabId) {
  if (pageId === 'workshop' || pageId === 'brewing') return 'mana';
  if (pageId === 'prestige') return 'ruby';
  if (pageId !== 'research') return null;
  if (researchTabId === 'automation') return 'ruby';
  if (researchTabId === 'advanced') return 'emerald';
  if (researchTabId === 'emerald') return 'crystal';
  return null;
}

function getActiveQuestFraction(progress = {}) {
  const total = Math.max(0, Number(progress.totalQuests) || 0);
  const completed = Math.max(0, Number(progress.completedQuests) || 0);
  const normalized = Math.max(0, Math.min(1, Number(progress.progress) || 0));
  return total > 0
    ? Math.max(0, Math.min(1, normalized * total - completed))
    : 0;
}

function createWorkshopFeatures({
  actions = {},
  gameplay,
  level,
  notifications,
  guildNotification = false,
  prestigeNotification = false,
  pageStates = [],
  tradeAlliance = {},
}) {
  const alliance =
    tradeAlliance.alliance ??
    tradeAlliance.currentAlliance ??
    tradeAlliance.ownAlliance ??
    tradeAlliance.membership?.alliance ??
    null;
  const notice = gameplay.worldNotice?.current ?? null;
  const guildPage = Array.isArray(pageStates)
    ? pageStates.find((page) => page?.id === 'guild')
    : null;
  const prestigePage = Array.isArray(pageStates)
    ? pageStates.find((page) => page?.id === 'prestige')
    : null;
  return [
    {
      id: 'alliance',
      label: 'alliance',
      side: 'left',
      weight: 10,
      visible: level >= 4,
      notification: Boolean(notifications.alliance),
      onActivate: () => actions.openAllianceWorkspace?.(),
      allianceTagColor:
        alliance?.tagColor ?? alliance?.allianceTagColor ?? 'red',
      allianceFlag: alliance
        ? {
            bannerColor:
              alliance.bannerColor ?? DEFAULT_TRADE_ALLIANCE_BANNER_COLOR,
            emblemColor:
              alliance.emblemColor ?? DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR,
            emblemId: alliance.emblemId ?? DEFAULT_TRADE_ALLIANCE_EMBLEM,
          }
        : null,
    },
    {
      id: 'inbox',
      label: 'inbox',
      side: 'right',
      weight: 10,
      visible: level >= 4,
    },
    {
      id: 'leaderboard',
      label: 'leaderboard',
      side: 'left',
      weight: 20,
      visible: level >= 3,
    },
    {
      id: 'discoveries',
      label: 'discoveries',
      side: 'right',
      weight: 20,
      visible: level >= 4,
    },
    {
      id: 'personalTasks',
      label: 'tasks',
      side: 'left',
      weight: 30,
      visible: gameplay.personalTasks?.unlocked === true,
      notification: Boolean(notifications.personalTasks),
    },
    {
      id: 'prestige',
      label: 'prestige',
      side: 'left',
      weight: 35,
      visible:
        prestigePage?.visible === true && prestigePage?.unlocked !== false,
      notification: prestigeNotification,
      onActivate: () => actions.openPrestige?.(),
    },
    {
      id: 'worldEvent',
      label: 'event',
      side: 'right',
      weight: 30,
      visible: gameplay.worldNotice?.unlocked === true,
      timer: String(notice?.resetLabel ?? '')
        .trim()
        .replace(/^resolves\s+/i, ''),
      notification: false,
    },
    {
      id: 'guild',
      label: 'guild',
      side: 'right',
      weight: 40,
      visible: guildPage?.visible === true && guildPage?.unlocked !== false,
      notification: guildNotification,
      onActivate: () => actions.openGuild?.(),
    },
  ];
}

function createWorldChatPreview(worldChat = {}) {
  const messages = worldChat.messages ?? [];
  return {
    visible: true,
    label: 'World Chat',
    messages,
    preview: messages
      .slice(-2)
      .map((message) => {
        const sourceName = message.username ?? message.author ?? 'Wizard';
        const name =
          String(sourceName).toLowerCase() === 'system' ? 'System' : sourceName;
        const body = message.body ?? message.message ?? '';
        return `${name}: ${body}`;
      })
      .join('\n'),
  };
}

function createPotionDiscoveryRowModel(potion = {}, index = 0, actions = {}) {
  const discovered = potion.discovered === true;
  const potionKey = String(potion.key ?? potion.itemKey ?? '').trim();
  const discovererUsername = discovered
    ? String(potion.discoveredByUsername ?? '').trim() || 'Wizard'
    : '';
  const discovererIdentity = discovered
    ? String(potion.discoveredByIdentity ?? '').trim()
    : '';
  const ingredients = discovered
    ? (potion.ingredients ?? []).map((ingredient, ingredientIndex) => {
        const key = String(
          ingredient?.key ??
            ingredient?.itemKey ??
            ingredient?.itemTypeId ??
            ingredientIndex,
        ).trim();
        return {
          id: key || ingredientIndex,
          key,
          label: toTitleCase(
            String(ingredient?.label ?? splitCamelCase(key)).trim() ||
              'Unknown',
          ),
          quantity: Math.max(1, Math.floor(Number(ingredient?.quantity) || 1)),
        };
      })
    : [];
  const player = {
    identity: discovererIdentity,
    name: discovererUsername,
    username: discovererUsername,
  };

  return {
    id: `potion:${potionKey || potion.itemTypeId || index}`,
    type: 'potionDiscovery',
    discovered,
    potionKey: discovered ? potionKey || 'generic' : 'unknownPotion',
    label: discovered
      ? toTitleCase(
          String(potion.label ?? splitCamelCase(potionKey)).trim() || 'Potion',
        )
      : 'Undiscovered Potion',
    discovererUsername,
    discovererIdentity,
    discoveredAtLabel: discovered
      ? formatDiscoveryDate(potion.discoveredAtMs)
      : '',
    ingredients,
    manaLabel: discovered
      ? `${formatDiscoveryWholeNumber(potion.manaCost)} Mana`
      : '',
    durationLabel: discovered
      ? `${formatDiscoveryDuration(potion.brewDurationMs)} Brew`
      : '',
    royaltyLabel: discovered
      ? `${formatDiscoveryCoin(potion.royaltyCoin)} Coin Royalty`
      : '',
    discovererSemanticId:
      discovered && discovererIdentity
        ? `workshop.discovery.player:${discovererIdentity}`
        : null,
    onDiscovererActivate:
      discovered && typeof actions.openPlayer === 'function'
        ? () => actions.openPlayer(player)
        : null,
  };
}

function formatDiscoveryDate(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Date Unknown';
  }

  try {
    return new Date(value).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return 'Date Unknown';
  }
}

function formatDiscoveryDuration(durationMs) {
  const value = Number(durationMs);
  if (!Number.isFinite(value) || value < 0) {
    return '?s';
  }
  return `${Math.ceil(value / 1_000)}s`;
}

function formatDiscoveryWholeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? String(Math.floor(number))
    : '?';
}

function formatDiscoveryCoin(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return '?';
  }
  return Number(number.toFixed(2)).toString();
}

function formatWorldChatMessageAge(sentAtMs, nowMs = Date.now()) {
  const timestamp = Number(sentAtMs);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '';
  }

  const elapsedMs = Math.max(0, nowMs - timestamp);
  if (elapsedMs < 60_000) {
    return 'now';
  }

  const totalMinutes = Math.floor(elapsedMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h ago`;
  }

  return `${Math.floor(totalHours / 24)}d ago`;
}

function createWorldChatBodyRuns(
  body,
  {
    bodyRuns = null,
    character = 'elara',
    frame = 'classic',
    isSystem = false,
    systemPlayer = null,
  } = {},
) {
  const text = String(body ?? '');
  const dynamicRuns = isSystem
    ? normalizeWorldChatDynamicRuns(bodyRuns, { character, frame })
    : null;
  if (dynamicRuns) {
    return dynamicRuns;
  }
  const marker = '⭐';
  const textRuns =
    isSystem && systemPlayer?.mentions?.length > 0
      ? createSystemPlayerTextRuns(text, systemPlayer.mentions, {
          character,
          frame,
          username: systemPlayer.username,
        })
      : [{ kind: 'text', text }];

  const prestigeDetail = systemPlayer?.detail?.trimStart() ?? text;
  if (!isSystem || !WORLD_CHAT_PRESTIGE_DETAIL_PATTERN.test(prestigeDetail)) {
    return textRuns;
  }

  return textRuns.flatMap((run) => {
    if (run.kind !== 'text') {
      return [run];
    }
    const markerIndex = run.text.indexOf(marker);
    if (markerIndex < 0) {
      return [run];
    }
    return [
      { ...run, text: run.text.slice(0, markerIndex) },
      {
        kind: 'icon',
        assetId: WORLD_CHAT_PRESTIGE_ICON_ASSET,
        fallbackText: marker,
        label: 'Prestige star',
        size: 12,
      },
      { ...run, text: run.text.slice(markerIndex + marker.length) },
    ].filter((candidate) => candidate.kind === 'icon' || candidate.text);
  });
}

function normalizeWorldChatDynamicRuns(runs, { character, frame }) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }

  const normalized = runs.flatMap((run) => {
    if (typeof run === 'string') {
      return run ? [{ kind: 'text', text: run }] : [];
    }
    if (!run || typeof run !== 'object') {
      return [];
    }
    if (run.kind === 'icon') {
      return [{
        kind: 'icon',
        assetId: String(run.assetId ?? ''),
        fallbackText: String(run.fallbackText ?? ''),
        label: String(run.label ?? 'Inline icon'),
        size: Math.max(1, Number(run.size) || 12),
        offsetY: Number(run.offsetY) || 0,
      }];
    }
    if (
      run.kind === 'widget' &&
      (run.widget === 'playerAvatar' || run.widgetType === 'playerAvatar')
    ) {
      return [{
        kind: 'widget',
        widget: 'playerAvatar',
        character: String(run.character ?? character ?? 'elara'),
        frame: String(run.frame ?? frame ?? 'classic'),
        fallbackText: String(run.fallbackText ?? ''),
        label: String(run.label ?? 'Player avatar'),
        size: Math.max(1, Number(run.size) || WORLD_CHAT_SYSTEM_INLINE_AVATAR_SIZE),
        offsetY: Number(run.offsetY) || 0,
        interactive: run.interactive !== false,
      }];
    }
    if (run.kind === 'widget') {
      const fallbackText = String(run.fallbackText ?? '');
      return fallbackText
        ? [{
            kind: 'widget',
            widget: String(run.widget ?? run.widgetType ?? 'unknown'),
            fallbackText,
            label: String(run.label ?? 'Inline widget'),
          }]
        : [];
    }

    const value = String(run.text ?? '');
    if (!value) {
      return [];
    }
    return [{
      kind: 'text',
      text: value,
      ...(run.tone === 'systemPlayer' ? { tone: 'systemPlayer' } : {}),
    }];
  });

  return normalized.length > 0 ? normalized : null;
}

function createSystemPlayerTextRuns(
  text,
  mentions,
  { character = 'elara', frame = 'classic', username = '' } = {},
) {
  const runs = [];
  let cursor = 0;
  let avatarInjected = false;

  for (const mention of mentions) {
    const start = Math.max(cursor, Number(mention.start) || 0);
    const end = Math.min(text.length, Number(mention.end) || 0);
    if (end <= start || text.slice(start, end) !== mention.username) {
      continue;
    }
    if (start > cursor) {
      runs.push({ kind: 'text', text: text.slice(cursor, start) });
    }
    if (!avatarInjected && mention.username === username) {
      runs.push(
        {
          kind: 'widget',
          widget: 'playerAvatar',
          character: String(character ?? 'elara'),
          frame: String(frame ?? 'classic'),
          fallbackText: '',
          label: `${mention.username} avatar`,
          size: WORLD_CHAT_SYSTEM_INLINE_AVATAR_SIZE,
          offsetY: 0,
          interactive: true,
        },
        { kind: 'text', text: ' ' },
      );
      avatarInjected = true;
    }
    runs.push({
      kind: 'text',
      text: text.slice(start, end),
      tone: 'systemPlayer',
    });
    cursor = end;
  }

  if (cursor < text.length) {
    runs.push({ kind: 'text', text: text.slice(cursor) });
  }
  return runs.length > 0 ? runs : [{ kind: 'text', text }];
}

function createResearchBoxModel(
  box = {},
  { completedResearchIds, playerLevel, prestigeCount, researchById },
) {
  const artAssetId =
    RESEARCH_ART_ASSET_BY_BOX_ID[box.id] ?? RESEARCH_FALLBACK_ART_ASSET;
  const allResearches = (box.researches ?? [])
    .filter((item) =>
      hasReachedResearchReveal(item, { playerLevel, prestigeCount }),
    )
    .map((item) =>
      createResearchItemModel(item, {
        artAssetId: getResearchItemArtAssetId(item, artAssetId),
        artExtraAssetId: String(item.id ?? '').startsWith('manaSphereCap:')
          ? RESEARCH_MANA_CAPACITY_MODIFIER_ASSET
          : String(item.id ?? '').startsWith('manaProductionRate:')
            ? RESEARCH_MANA_GENERATION_MODIFIER_ASSET
            : null,
        completedResearchIds,
        playerLevel,
        prestigeCount,
        researchById,
      }),
    );
  const researches = orderResearchesNewestFirst(
    getDisplayedResearches(allResearches),
  );

  return {
    ...box,
    artKey: box.id ?? 'research',
    artAssetId,
    allResearches,
    researches,
    hiddenLockedCount: allResearches.length - researches.length,
  };
}

function hasReachedResearchReveal(item = {}, { playerLevel, prestigeCount }) {
  if (item.completed === true || item.inProgress === true) {
    return true;
  }

  if (
    Number.isInteger(item.requiredPlayerLevel) &&
    playerLevel < item.requiredPlayerLevel
  ) {
    return false;
  }

  if (
    Number.isInteger(item.requiredPrestigeCount) &&
    prestigeCount < item.requiredPrestigeCount
  ) {
    return false;
  }

  return true;
}

function createResearchItemModel(
  item = {},
  {
    artAssetId,
    artExtraAssetId,
    completedResearchIds,
    playerLevel,
    prestigeCount,
    researchById,
  },
) {
  const displayName = item.displayName ?? item.label ?? item.id ?? 'research';
  const displayValue = item.displayValue ?? item.value ?? '';
  const lockReason = createResearchLockReason(item, {
    completedResearchIds,
    playerLevel,
    prestigeCount,
    researchById,
  });
  const state = getResearchState(item);
  const star = createResearchStarModel(item.starLevel);
  const displayTitle = [displayName, star?.text].filter(Boolean).join(' ');
  const description = getResearchDescription(item, displayName);
  const actionNoun = item.actionType === 'levelUp' ? 'level up' : 'research';
  const actionVerb = actionNoun;
  const rankCurrent = item.completed === true ? 1 : 0;
  const cost = createResearchCostModel(item, {
    displayName: displayTitle,
    lockReason,
    state,
  });
  const timer = createResearchTimerModel(item, {
    actionNoun,
    displayName: displayTitle,
  });
  const itemKind = item.itemKind
    ? String(item.itemKind).toLowerCase()
    : String(item.id ?? '').startsWith('unlockSeed:')
      ? 'seed'
      : String(item.id ?? '').startsWith('unlockRecipe:')
        ? 'potion'
        : null;
  const itemKey =
    item.itemKey ??
    (itemKind === 'seed'
      ? String(item.id).slice('unlockSeed:'.length)
      : itemKind === 'potion'
        ? String(item.id).slice('unlockRecipe:'.length)
        : null);

  return {
    ...item,
    displayName,
    displayTitle,
    displayValue,
    description,
    lockReason,
    state,
    artKey: artAssetId,
    artAssetId,
    artExtraAssetId:
      artExtraAssetId ??
      RESEARCH_ART_EXTRA_ASSET_BY_KEY[item.artExtraKey] ??
      null,
    rank: {
      current: rankCurrent,
      total: 1,
      label: `Lv. ${String(rankCurrent).padStart(2, '0')}/01`,
    },
    rankLabel: `Lv. ${String(rankCurrent).padStart(2, '0')}/01`,
    star,
    cost,
    timer,
    skip: createResearchSkipModel(item, displayTitle),
    itemKind,
    itemKey,
    resourceKey:
      item.completed === true &&
      ['crystal', 'ruby', 'emerald'].includes(item.costCurrency)
        ? item.costCurrency
        : itemKind,
    valueResourceKey: getResearchValueResourceKey(item),
    notification: item.canResearch === true,
    semanticId: item.semanticId ?? `research.${item.id}`,
    tutorialId: item.tutorialId ?? `research:${item.id}`,
    info: {
      title: displayTitle,
      label: displayName,
      description,
      lockReason,
      copy: [description, lockReason].filter(Boolean).join(' '),
      actionNoun,
      star,
      starLevel: star?.level ?? 0,
      accessibleTitle: [displayName, star?.ariaLabel, actionNoun, 'information']
        .filter(Boolean)
        .join(' '),
    },
    accessibility: {
      name: formatResearchName(item, displayTitle),
      actionLabel: item.locked
        ? `${formatResearchName(item, displayTitle)} is locked, ${formatResearchLockPrompt(
            lockReason,
          )}`
        : item.inProgress
          ? `skip ${formatResearchName(item, displayTitle)} for ${item.skipCostAmethyst ?? 1} Amethyst`
          : `${actionVerb} ${formatResearchName(
              item,
              displayTitle,
            )} for ${displayValue}`,
      progressLabel: `${formatResearchName(
        item,
        displayTitle,
      )} ${actionNoun} progress`,
    },
  };
}

function createResearchSkipModel(item = {}, displayName = 'research') {
  const amount = Math.max(1, Math.floor(Number(item.skipCostAmethyst) || 1));
  return {
    amount,
    amountLabel: String(amount),
    currency: 'amethyst',
    resource: 'amethyst',
    enabled: item.inProgress === true && item.canSkipResearch === true,
    ariaLabel: `skip ${displayName} for ${amount} Amethyst`,
  };
}

function createResearchLockReason(
  item = {},
  {
    completedResearchIds = new Set(),
    playerLevel = 1,
    prestigeCount = 0,
    researchById = new Map(),
  } = {},
) {
  if (!item.locked) return '';

  const missingResearchLabels = (item.requiredResearchIds ?? [])
    .filter((researchId) => !completedResearchIds.has(researchId))
    .map((researchId) => {
      const requiredResearch = researchById.get(researchId);
      const label = requiredResearch?.label ?? researchId;
      return requiredResearch?.actionType === 'levelUp'
        ? `${label} level up`
        : `${label} research`;
    });
  const requirements = [];

  if (missingResearchLabels.length > 0) {
    requirements.push(formatNaturalList(missingResearchLabels));
  }

  if (
    Number.isInteger(item.requiredPlayerLevel) &&
    playerLevel < item.requiredPlayerLevel
  ) {
    requirements.push(`level ${item.requiredPlayerLevel}`);
  }

  if (
    Number.isInteger(item.requiredPrestigeCount) &&
    prestigeCount < item.requiredPrestigeCount
  ) {
    requirements.push(
      `${item.requiredPrestigeCount} prestige${
        item.requiredPrestigeCount === 1 ? '' : 's'
      }`,
    );
  }

  return requirements.length > 0
    ? `requires ${formatNaturalList(requirements)}.`
    : 'this research is still locked.';
}

function createResearchById(tabs = []) {
  const researchById = new Map();

  for (const tab of tabs) {
    for (const box of tab.boxes ?? []) {
      for (const item of box.researches ?? []) {
        if (typeof item?.id === 'string') {
          researchById.set(item.id, item);
        }
      }
    }
  }

  return researchById;
}

function createTaskResearchTimer(task = {}, research = {}) {
  if (task.type !== 'research' || !task.researchId) {
    return null;
  }

  const activeResearch = (research.inProgressResearches ?? []).find(
    (entry) => entry?.researchId === task.researchId,
  );
  if (!activeResearch) {
    return null;
  }

  const totalMs = normalizeMilliseconds(
    activeResearch.totalMs,
    activeResearch.totalSeconds,
  );
  const remainingMs = Math.min(
    totalMs,
    normalizeMilliseconds(
      activeResearch.remainingMs,
      activeResearch.remainingSeconds,
    ),
  );
  if (totalMs <= 0) {
    return null;
  }

  return {
    active: true,
    totalMs,
    remainingMs,
    progress: clampUnit(1 - remainingMs / totalMs),
    remainingLabel: formatRemainingTime(remainingMs),
  };
}

function createCompletedResearchIds(research = {}, tabs = []) {
  const completedResearchIds = new Set(
    Array.isArray(research.completedResearchIds)
      ? research.completedResearchIds
      : [],
  );

  for (const tab of tabs) {
    for (const box of tab.boxes ?? []) {
      for (const item of box.researches ?? []) {
        if (item?.completed === true && typeof item.id === 'string') {
          completedResearchIds.add(item.id);
        }
      }
    }
  }

  return completedResearchIds;
}

function orderResearchesNewestFirst(researches = []) {
  return researches
    .map((research, index) => ({ research, index }))
    .sort(
      (left, right) =>
        Number(left.research.completed === true) -
          Number(right.research.completed === true) || left.index - right.index,
    )
    .map(({ research }) => research);
}

function getDisplayedResearches(researches = []) {
  let lockedCount = 0;

  return researches.filter((item) => {
    if (item.locked !== true) {
      return true;
    }

    lockedCount += 1;
    return lockedCount <= MAX_LOCKED_RESEARCHES_PER_BOX;
  });
}

function getResearchState(item = {}) {
  if (item.completed === true) return 'completed';
  if (item.inProgress === true) return 'in-progress';
  if (item.locked === true) return 'locked';
  if (item.canResearch === true) return 'available';
  return 'unavailable';
}

function createResearchCostModel(
  item = {},
  { displayName, lockReason, state },
) {
  const parsed = parseResearchCost(item);
  const buttonState = state === 'unavailable' ? 'unaffordable' : state;
  const amountLabel =
    state === 'locked'
      ? 'Locked'
      : parsed.label || item.displayValue || item.value || '';

  return {
    ...parsed,
    amountLabel,
    enabled: item.canResearch === true,
    state: buttonState,
    lockPrompt: state === 'locked' ? formatResearchLockPrompt(lockReason) : '',
    title: item.canResearch === true ? '' : lockReason,
    ariaLabel:
      state === 'locked'
        ? `${formatResearchName(item, displayName)} is locked, ${formatResearchLockPrompt(
            lockReason,
          )}`
        : `${item.actionType === 'levelUp' ? 'level up' : 'research'} ${formatResearchName(
            item,
            displayName,
          )} for ${item.displayValue ?? item.value ?? ''}`,
  };
}

function parseResearchCost(item = {}) {
  const label = String(item.displayValue ?? item.value ?? '').trim();
  const match = label.match(
    /^(-?\d+(?:\.\d+)?)\s+(coin|crystal|ruby|emerald)$/i,
  );
  const explicitCurrency = ['coin', 'crystal', 'ruby', 'emerald'].find(
    (currency) => item.costCurrency === currency,
  );
  const amountByCurrency = {
    coin: item.costCoin,
    crystal: item.costCrystal,
    ruby: item.costRuby,
    emerald: item.costEmerald,
  };
  const currency =
    explicitCurrency ??
    ['crystal', 'ruby', 'emerald'].find(
      (key) =>
        Number.isFinite(Number(amountByCurrency[key])) &&
        Number(amountByCurrency[key]) > 0,
    ) ??
    (match?.[2]?.toLowerCase() ||
      (label.toLowerCase() === 'free' ? 'coin' : null));
  const explicitAmount =
    currency && Number.isFinite(Number(amountByCurrency[currency]))
      ? Number(amountByCurrency[currency])
      : null;
  const amount =
    explicitAmount ??
    (match ? Number(match[1]) : label.toLowerCase() === 'free' ? 0 : null);

  return {
    amount,
    currency,
    resource: currency,
    label,
  };
}

function createResearchTimerModel(item = {}, { actionNoun, displayName }) {
  const totalMs = normalizeMilliseconds(item.totalMs, item.totalSeconds);
  const remainingMs = normalizeMilliseconds(
    item.remainingMs,
    item.remainingSeconds,
  );
  const derivedProgress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const progress = clampUnit(
    Number.isFinite(Number(item.progress))
      ? Number(item.progress)
      : derivedProgress,
  );
  const remainingLabel =
    item.inProgress === true ? formatRemainingTime(remainingMs) : '';

  return {
    active: item.inProgress === true,
    totalMs,
    remainingMs,
    progress,
    remainingLabel,
    statusLabel: item.value ?? '',
    displayValue: [item.value ?? '', remainingLabel].filter(Boolean).join(' '),
    ariaLabel: `${displayName} ${actionNoun} progress`,
  };
}

function normalizeMilliseconds(milliseconds, seconds) {
  if (Number.isFinite(Number(milliseconds))) {
    return Math.max(0, Number(milliseconds));
  }

  if (Number.isFinite(Number(seconds))) {
    return Math.max(0, Number(seconds) * 1_000);
  }

  return 0;
}

function createResearchStarModel(starLevel) {
  const level = Math.max(0, Math.floor(Number(starLevel) || 0));
  if (level === 0) return null;

  const tones = ['yellow', 'orange', 'red', 'purple'];
  const visualLevel = Math.min(level, tones.length * 3);
  const zeroBasedLevel = visualLevel - 1;
  const tone = tones[Math.floor(zeroBasedLevel / 3)];
  const count = (zeroBasedLevel % 3) + 1;

  return {
    level,
    tone,
    count,
    slotCount: 3,
    text: '\u2605'.repeat(count),
    ariaLabel: `${tone} star ${count}`,
  };
}

function getResearchDescription(item = {}, label = 'research') {
  if (typeof item.description === 'string' && item.description.trim()) {
    return item.description.trim();
  }

  if (String(item.id ?? '').startsWith('unlockSeed:')) {
    return `allows ${label} to drop from summon seed.`;
  }

  if (String(item.id ?? '').startsWith('unlockRecipe:')) {
    return `allows valid cauldron ingredients to brew ${label}.`;
  }

  return `${label} records this study as complete.`;
}

function getResearchValueResourceKey(item = {}) {
  if (
    item.completed === true &&
    ['crystal', 'ruby', 'emerald'].includes(item.costCurrency)
  ) {
    return item.costCurrency;
  }

  return (
    String(item.value ?? '')
      .match(/\b(coin|crystal|ruby|emerald)\b/i)?.[1]
      ?.toLowerCase() ?? null
  );
}

function formatResearchName(item = {}, displayTitle = '') {
  return [displayTitle, item.showEffect === true ? item.effect : '']
    .filter(Boolean)
    .join(' ');
}

function formatResearchLockPrompt(lockReason = '') {
  const reason = String(lockReason).trim().replace(/\.$/, '');
  const levelMatch = reason.match(/^requires level (\d+)$/i);

  if (levelMatch) {
    return `Reach level ${levelMatch[1]}`;
  }

  if (!reason || reason.toLowerCase() === 'this research is still locked') {
    return 'Complete prior research';
  }

  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
}

function formatNaturalList(values = []) {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function getSummaryMilestone(prestige = {}) {
  const milestones = prestige.milestones ?? [];
  const highest = milestones.find(
    (milestone) => milestone.level === prestige.highestAvailableLevel,
  );
  return (
    highest ??
    milestones.find((milestone) => milestone.canComplete) ??
    milestones.find((milestone) => !milestone.completed) ??
    milestones.at(-1) ??
    null
  );
}

function getSummaryTargetLevel(milestone, currentLevel) {
  const nextRunLevel = Math.floor(Number(milestone?.nextRun?.level));
  if (
    milestone?.canComplete &&
    Number.isFinite(nextRunLevel) &&
    nextRunLevel >= 1
  ) {
    return nextRunLevel;
  }
  const milestoneLevel = Math.floor(Number(milestone?.level));
  return Number.isFinite(milestoneLevel) && milestoneLevel >= 1
    ? milestoneLevel
    : currentLevel;
}

function createPrestigeMilestone(milestone = {}, { upcoming = false } = {}) {
  const state = milestone.completed
    ? 'completed'
    : milestone.canComplete
      ? milestone.lowerThanHighestAvailable
        ? 'included'
        : 'ready'
      : upcoming || milestone.unlocked
        ? 'upcoming'
        : 'locked';
  return {
    ...milestone,
    id: `level-${milestone.level}`,
    title: `Level ${milestone.level}`,
    state,
    status: state === 'completed' ? 'complete' : state,
    included: state === 'included',
    locked: state === 'locked',
    reward: `reward: ${Math.max(
      0,
      Math.floor(Number(milestone.nextRun?.crystal) || 0),
    )} amber ${Math.max(
      0,
      Math.floor(Number(milestone.creditedRuby ?? milestone.rewardRuby) || 0),
    )} ruby`,
    rewardResources: [
      {
        resource: 'crystal',
        amount: Math.max(
          0,
          Math.floor(Number(milestone.nextRun?.crystal) || 0),
        ),
      },
      {
        resource: 'ruby',
        amount: Math.max(
          0,
          Math.floor(
            Number(milestone.creditedRuby ?? milestone.rewardRuby) || 0,
          ),
        ),
      },
    ],
    canComplete:
      milestone.canComplete === true &&
      milestone.lowerThanHighestAvailable !== true,
    confirm: {
      milestoneId: `level-${milestone.level}`,
      level: milestone.level,
      lines: [
        formatLevelFlow(milestone.currentLevel, milestone.nextRun?.level),
        `on prestige: ${formatPrestigeTotals(milestone.nextRun)}`,
        ...(milestone.creditedLevels?.length > 1
          ? [`also credits levels ${milestone.creditedLevels.join(', ')}`]
          : []),
        `start level ${milestone.nextRun?.level ?? 1}`,
        `mana ${Math.floor(Number(milestone.nextRun?.mana) || 0)}`,
        `coin ${Math.floor(Number(milestone.nextRun?.coin) || 0)}`,
        `amber ${Math.floor(Number(milestone.nextRun?.crystal) || 0)}`,
        `emerald ${Math.floor(Number(milestone.nextRun?.emerald) || 0)}`,
        `ruby ${Math.floor(Number(milestone.nextRun?.ruby) || 0)}`,
      ],
    },
  };
}

function createPrestigeResourceTotals(nextRun = {}) {
  return ['crystal', 'ruby', 'emerald'].map((resource) => ({
    resource,
    amount: Math.max(0, Math.floor(Number(nextRun?.[resource]) || 0)),
  }));
}

function createPrestigePointRewards({
  unlocks = [],
  completedPointCount = 0,
  nextPointCount = null,
} = {}) {
  const rewardsByCount = new Map();

  for (const unlock of Array.isArray(unlocks) ? unlocks : []) {
    const count = Math.max(0, Math.floor(Number(unlock?.count) || 0));
    if (count <= 0) {
      continue;
    }
    rewardsByCount.set(count, {
      count,
      label: unlock.label ?? '',
      rewards: Array.isArray(unlock.rewards) ? unlock.rewards : [],
    });
  }

  for (const licence of marketLicences) {
    if (licence.requiredStars <= 0) {
      continue;
    }
    const reward = rewardsByCount.get(licence.requiredStars) ?? {
      count: licence.requiredStars,
      label: '',
      rewards: [],
    };
    reward.marketLicence = licence;
    rewardsByCount.set(licence.requiredStars, reward);
  }

  const resolvedNextCount =
    [...rewardsByCount.keys()]
      .sort((left, right) => left - right)
      .find((count) => count > completedPointCount) ?? nextPointCount;

  return [...rewardsByCount.values()]
    .sort((left, right) => left.count - right.count)
    .map((reward) => {
      const completed = completedPointCount >= reward.count;
      const next = reward.count === resolvedNextCount;
      const rewardLines = [
        reward.marketLicence?.name,
        reward.label,
        ...reward.rewards,
      ].filter(Boolean);

      return {
        id: `point-${reward.count}`,
        kind: 'point',
        count: reward.count,
        title: `${reward.count} ${pluralize(reward.count, 'Point')}`,
        status: completed ? 'unlocked' : next ? 'next' : 'locked',
        completed,
        locked: !completed && !next,
        rewardText:
          reward.marketLicence?.name ?? reward.label ?? reward.rewards[0] ?? '',
        rewardLines: [...new Set(rewardLines)],
        tooltip: reward.marketLicence
          ? {
              text: formatMarketLicenceTooltip(reward.marketLicence),
            }
          : null,
      };
    });
}

function formatMarketLicenceTooltip(licence = {}) {
  const requiredPoints = Math.max(
    0,
    Math.floor(Number(licence.requiredStars) || 0),
  );
  return `${licence.name} unlocks at ${requiredPoints} ${pluralize(
    requiredPoints,
    'Prestige Point',
  )}. All trader and player-market trade permanently moves here. It has its own prices, demand, stock, listings, requests, and proceeds. Earlier goods remain available, but earlier markets do not.`;
}

function formatPrestigeTotals(nextRun = {}) {
  return [
    `${Math.floor(Number(nextRun.crystal) || 0)} amber`,
    `${Math.floor(Number(nextRun.ruby) || 0)} ruby`,
    `${Math.floor(Number(nextRun.emerald) || 0)} emerald`,
    'total',
  ].join(' ');
}

function formatLevelFlow(current, target) {
  return `Level ${Math.max(1, Math.floor(Number(current) || 1))} > Level ${Math.max(
    1,
    Math.floor(Number(target) || 1),
  )}`;
}

function createCurrencyRows(gameplay) {
  return [
    {
      id: 'mana',
      label: 'Mana',
      value: `${Math.floor(Number(gameplay.mana?.current) || 0)}/${Math.floor(
        Number(gameplay.mana?.cap) || 0,
      )}`,
      resourceKey: 'mana',
      itemKind: 'resource',
      itemKey: 'mana',
    },
    ...['coin', 'crystal', 'amethyst', 'ruby', 'emerald']
      .filter((resource) => gameplay[resource])
      .map((resource) => ({
        id: resource,
        label: resource === 'crystal' ? 'Amber' : toTitleCase(resource),
        value: String(Math.floor(Number(gameplay[resource]?.current) || 0)),
        resourceKey: resource,
        itemKind: 'resource',
        itemKey: resource,
      })),
  ];
}

function createBagItemRows(gameplay, tabId, actions = {}) {
  const singular = tabId.slice(0, -1);
  const items =
    tabId === 'seeds'
      ? gameplay.seedInventory
      : tabId === 'ingredients'
        ? gameplay.ingredientInventory
        : (gameplay.inventory ?? []).filter((item) => item.kind === singular);
  return (items ?? [])
    .map((item) => {
      const normalizedItem = {
        ...item,
        kind: item.kind ?? singular,
      };
      return {
        ...normalizedItem,
        display: getItemDisplay(
          gameplay,
          normalizedItem,
          normalizedItem.quantity,
        ),
      };
    })
    .filter((item) => {
      if (tabId === 'seeds' || tabId === 'herbs') {
        return item.display.owned && !item.display.locked;
      }

      return tabId === 'ingredients'
        ? Number(item.quantity) > 0
        : item.display.unlocked ||
            (!item.display.unknown && item.display.locked);
    })
    .map((item) => {
      const researchId = getItemResearchId(item);
      const locked = item.display.locked === true && Boolean(researchId);
      return {
        id: item.key ?? item.itemTypeId,
        label: toTitleCase(
          item.display.label ?? item.label ?? splitCamelCase(item.key),
        ),
        value: item.display.quantity,
        resourceKey: singular,
        itemKind: singular,
        itemKey: item.key,
        locked,
        researchId,
        semanticId: `workshop.bag.${singular}.${item.key ?? item.itemTypeId}`,
        ...(locked
          ? {
              action: () => actions.navigateToResearch?.(researchId) ?? false,
            }
          : {}),
      };
    });
}

function getVisibleBagTabs(pageStates) {
  if (!Array.isArray(pageStates)) {
    return BAG_TABS;
  }

  const unlockedPageIds = new Set(
    pageStates.filter((page) => page?.unlocked === true).map((page) => page.id),
  );

  return BAG_TABS.filter(
    (tab) => !tab.requiredPageId || unlockedPageIds.has(tab.requiredPageId),
  );
}

function createStatsRows(stats = {}, tabId) {
  if (tabId === 'coin') {
    return Object.entries(stats.coin ?? {}).map(([key, value]) => ({
      id: key,
      label: toTitleCase(splitCamelCase(key)),
      value: formatCoinPriceText(value ?? 0),
      resourceKey: 'coin',
    }));
  }
  const section = stats[tabId] ?? {};
  const itemRows = Array.isArray(section.items)
    ? section.items
    : Object.entries(section.items ?? {}).map(([key, value]) => ({
        key,
        ...(typeof value === 'object' ? value : { total: value }),
      }));
  return [
    {
      id: `${tabId}:total`,
      label: 'Total',
      value: String(Math.floor(Number(section.total) || 0)),
    },
    ...itemRows.map((item, index) => ({
      id: item.key ?? item.itemTypeId ?? index,
      label: toTitleCase(item.label ?? splitCamelCase(item.key) ?? 'unknown'),
      value: String(
        Math.floor(Number(item.total ?? item.quantity ?? item.value) || 0),
      ),
      itemKind: tabId.slice(0, -1),
      itemKey: item.key ?? null,
      resourceKey: tabId.slice(0, -1),
    })),
  ];
}

function splitCamelCase(value) {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

function toTitleCase(value) {
  return String(value ?? '')
    .replace(
      /(^|[\s-])([a-z])/g,
      (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
    )
    .replace(/\bNpc\b/g, 'NPC');
}

function toSentenceCase(value) {
  return String(value ?? '').replace(
    /(^|[.!?]\s+|\n)([a-z])/g,
    (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}

function formatPercent(value) {
  const percent = Math.max(0, Math.min(1, Number(value) || 0)) * 100;
  return `${Number(percent.toFixed(percent < 1 ? 2 : 1))}%`;
}

function formatWorldEventNumber(value) {
  return formatBigNumber(Math.max(0, Math.floor(Number(value) || 0)));
}

function formatWorldEventTimer(value) {
  return (
    String(value ?? '')
      .trim()
      .replace(/^resolves\s+/i, '') || 'soon'
  );
}

function getWorldEventDonationItemKind(option = {}) {
  if (option.resourceType === 'coin') {
    return 'resource';
  }

  const explicitKind = String(option.itemKind ?? option.kind ?? '')
    .trim()
    .toLowerCase();
  if (['seed', 'herb', 'potion', 'ingredient'].includes(explicitKind)) {
    return explicitKind;
  }

  const itemKey = String(option.itemKey ?? option.optionKey ?? '')
    .trim()
    .toLowerCase();
  if (itemKey.endsWith('seed')) {
    return 'seed';
  }
  if (itemKey.endsWith('herb')) {
    return 'herb';
  }
  return 'potion';
}

function normalizeSeedDropPreference(preference) {
  return SEED_DROP_PREFERENCES.includes(preference) ? preference : 'medium';
}

function pluralize(count, word) {
  return Number(count) === 1 ? word : `${word}s`;
}
