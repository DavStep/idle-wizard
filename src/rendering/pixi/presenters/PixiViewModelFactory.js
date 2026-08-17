import {
  formatCoinAmount,
  formatCoinPriceText,
} from '../../../shared/coinPrice.js';
import { formatBigNumber } from '../../../shared/bigNumber.js';
import { getItemDisplay } from '../../../pages/shared/itemResearchStatus.js';
import { formatRemainingTime } from '../../../pages/shared/timerDisplay.js';
import { parseWorldChatSystemPlayerAnnouncement } from '../../../pages/workshop/worldChatSystemAnnouncement.js';
import { getPlayerFrameTint } from '../../../player/playerFrames.js';
import { marketLicences } from '../../../shared/marketLicence.js';
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
const WORLD_EVENT_MAX_QUEST_ROWS = 2;
const TRADE_ALLIANCE_ROLE_LABELS = Object.freeze({
  tradeMaster: 'Trade Master',
  quartermaster: 'Quartermaster',
  factor: 'Factor',
  broker: 'Broker',
  trader: 'Trader',
});
const TRADE_ALLIANCE_JOIN_MODE_LABELS = Object.freeze({
  open: 'Open',
  apply: 'Apply',
  closed: 'Closed',
});
const TRADE_ALLIANCE_SOLO_TABS = Object.freeze([
  Object.freeze({ id: 'browse', label: 'Browse' }),
  Object.freeze({ id: 'create', label: 'Create' }),
]);
const TRADE_ALLIANCE_MEMBER_TABS = Object.freeze([
  Object.freeze({ id: 'home', label: 'Home' }),
  Object.freeze({ id: 'quests', label: 'Quests' }),
  Object.freeze({ id: 'settings', label: 'Settings' }),
]);
const SEED_DROP_PREFERENCES = Object.freeze([
  'none',
  'low',
  'medium',
  'high',
]);
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
  autoBrewCauldrons:
    'source:assets/icons/research/icon-research-auto-brew.png',
  autoPlantTiles:
    'source:assets/icons/research/icon-research-auto-plant.png',
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
  plotCapacity:
    'source:assets/icons/research/icon-research-plot-capacity.png',
  plotGrowth:
    'source:assets/icons/research/icon-research-plot-growth.png',
  plotPlanting:
    'source:assets/icons/research/icon-research-plot-level.png',
  recipeUnlocks:
    'source:assets/icons/research/icon-research-cauldron-brewing.png',
  researchCost:
    'source:assets/icons/research/icon-research-cost.png',
  researchTime:
    'source:assets/icons/research/icon-research-time.png',
  seedUnlocks:
    'source:assets/icons/research/icon-research-auto-seed-spawn.png',
  stallStaffing:
    'source:assets/icons/research/icon-research-fast-sell.png',
  summonSeeds:
    'source:assets/icons/research/icon-research-summon-multiplier.png',
});
const RESEARCH_CAULDRON_LEVEL_ART_ASSET =
  'source:assets/icons/research/icon-research-cauldron-level.png';
const RESEARCH_FALLBACK_ART_ASSET =
  'source:assets/icons/icon-research.png';
const WORLD_CHAT_PRESTIGE_ICON_ASSET =
  'source:assets/icons/icon-prestige-star.png';
const WORLD_CHAT_PRESTIGE_DETAIL_PATTERN =
  /^reached ⭐ \d+, completing prestige level \d+$/u;

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
      username: player.username || 'Wizard',
      character: player.character || 'elara',
      frameTint: getPlayerFrameTint(player.frame),
      showAvatar: true,
      mana: gameplay.mana ?? {},
      coin: gameplay.coin?.current ?? 0,
      contextCurrency: {
        resource: contextResource ?? 'crystal',
        amount:
          gameplay[contextResource ?? 'crystal']?.current ?? 0,
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
              (progress.totalQuests ?? 0) -
                (progress.completedQuests ?? 0),
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
    guildHud = null,
    pages,
    notifications,
    actions,
    reveal = {},
  } = {}) {
    return {
      currentPageId,
      hudMode,
      guildHud,
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
    actions = {},
    dialogState = {},
    pageStates = null,
  } = {}) {
    const taskSnapshot = gameplay.tasks ?? {};
    const level = Math.max(
      0,
      Math.floor(
        Number(
          taskSnapshot.currentLevel ??
            gameplay.playerLevel?.currentLevel,
        ) || 0,
      ),
    );
    const allTasks = taskSnapshot.level?.tasks ?? [];
    const activeTask =
      allTasks.find((task) => task.isActiveQuest) ??
      allTasks.find((task) => !task.completed) ??
      null;
    const taskRows = activeTask ? [this.createTaskRow(activeTask, actions)] : [];

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
          canSummon: gameplay.seedSummoning?.canSummon === true,
          enabled: gameplay.seedSummoning?.canSummon === true,
          pressEnabled:
            gameplay.seedSummoning?.canSummon === true ||
            gameplay.seedSummoning?.unavailableReason ===
              'no_active_seed_weights',
        },
        bag: {
          side: 'left',
          weight: 40,
          enabled: true,
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
          pageStates,
          tradeAlliance,
        }),
        worldChat: this.createWorldChatPreview(worldChat),
        flyouts: [],
        dialogs: {
          summonInfo: this.createSummonInfoDialog(
            gameplay,
            actions,
          ),
          bag: this.createBagDialog(
            gameplay,
            dialogState.bagTabId,
            actions.selectBagTab,
            pageStates,
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

  createTaskRow(task, actions = {}) {
    const automatic = task.autoProgress === true;
    const canNavigate =
      automatic && typeof actions.navigateToTask === 'function';
    const current = Math.max(0, Number(task.progressQuantity) || 0);
    const required = Math.max(0, Number(task.requiredQuantity) || 0);
    return {
      id: task.taskId,
      label: task.requirementLabel ?? task.itemLabel ?? '',
      current,
      required,
      progress:
        required > 0
          ? clampUnit(current / required)
          : clampUnit(task.progress),
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
          gameplay.playerLevel?.currentLevel ??
            gameplay.tasks?.currentLevel,
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
      sourceTabs.find(
        (tab) => tab.id === selectedTabId && isTabUnlocked(tab),
      )?.id ??
      sourceTabs.find(
        (tab) => tab.selected === true && isTabUnlocked(tab),
      )?.id ??
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
      const boxes = (tab.boxes ?? []).map((box) =>
        createResearchBoxModel(box, {
          completedResearchIds,
          playerLevel,
          prestigeCount,
          researchById,
        }),
      );

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
      tabs.find((tab) => tab.id === resolvedSelectedTabId) ??
      tabs[0] ??
      null;

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
    const nextPointCount = (prestige.unlocks ?? [])
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
          { id: 'points', label: 'Points', selected: selectedTabId === 'points' },
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
        milestones: (prestige.milestones ?? []).map((milestone, index, milestones) =>
          createPrestigeMilestone(milestone, {
            upcoming:
              index ===
              milestones.findIndex(
                (candidate) =>
                  !candidate.completed && !candidate.canComplete,
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
          : createBagItemRows(gameplay, safeTabId),
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

  createSummonInfoDialog(
    gameplay = {},
    actions = {},
  ) {
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
        const preference = normalizeSeedDropPreference(
          seed.dropPreference,
        );
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
              actions.setSummonDropPreference?.(
                seed.key,
                preference,
              ),
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
          message.hasReward === true &&
          message.rewardCollected !== true;
        return {
          id: message.mailKey ?? message.id ?? index,
          label:
            message.subject ??
            message.title ??
            (message.read ? 'message' : 'new message'),
          value:
            message.body ??
            message.message ??
            message.rewardLabel ??
            '',
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
    expandedAllianceId = null,
    actions = {},
    selectedTabId = 'home',
  ) {
    const alliance =
      tradeAlliance.alliance ??
      tradeAlliance.currentAlliance ??
      tradeAlliance.ownAlliance ??
      null;
    const members =
      tradeAlliance.members ??
      alliance?.members ??
      [];
    const browse =
      tradeAlliance.alliances ??
      tradeAlliance.publicAlliances ??
      [];
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
        status:
          tradeAlliance.connected === false
            ? 'Connecting...'
            : creating
              ? ''
              : 'Not in an alliance',
        settings: creating
          ? {
              allianceId: 'new-alliance',
              mode: 'create',
              name: '',
              tag: '',
              tagColor: 'ink',
              description: '',
              notice: '',
              joinMode: 'apply',
              editable: true,
              onSave: (profile) => actions.createAlliance?.(profile),
            }
          : null,
        rows: creating ? [] : browse.map((candidate, index) => {
          const allianceId = candidate.allianceId ?? candidate.id ?? index;
          const application = ownApplications.find(
            (entry) => entry.allianceId === allianceId,
          );
          const joinMode = candidate.joinMode ?? 'apply';
          const memberRows = members
            .filter((member) => member.allianceId === allianceId)
            .map((member, memberIndex) => {
              const player = createTradeAlliancePlayerRequest(member);
              return {
                id:
                  player.identity ||
                  `${allianceId}:member:${memberIndex}`,
                identity: player.identity,
                memberIdentity: member.memberIdentity ?? '',
                username: player.username,
                character: player.character,
                frame: player.frame,
                roleLabel:
                  TRADE_ALLIANCE_ROLE_LABELS[member.role] ??
                  member.role ??
                  'trader',
                levelLabel: `Lv ${normalizeVisibleLevel(member.playerLevel) ?? 1}`,
                semanticId: `workshop.alliance.member.${
                  player.identity || memberIndex
                }`,
                onActivate: () => actions.openPlayer?.(player),
              };
            });
          const action =
            application
              ? {
                  label: 'Cancel Application',
                  variant: 'brown-dark',
                  enabled: true,
                  onActivate: () =>
                    actions.cancelAllianceApplication?.(
                      application.applicationKey,
                    ),
                }
              : joinMode === 'open'
                ? {
                    label: 'Join Alliance',
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
            totalIncomeLabel: formatCoinAmount(candidate.totalIncome ?? 0),
            memberCount: Math.max(
              memberRows.length,
              Math.floor(Number(candidate.memberCount) || 0),
            ),
            memberCapacity: 50,
            members: memberRows,
            expanded:
              String(allianceId) === String(expandedAllianceId ?? ''),
            action,
            semanticId: `workshop.alliance.directory.${allianceId}`,
            onActivate: () => actions.selectAlliance?.(allianceId),
          };
        }),
      };
    }

    const allianceId = alliance.allianceId ?? alliance.id ?? '';
    const ownedMembers = tradeAlliance.members
      ? members.filter(
          (member) =>
            String(member.allianceId ?? '').trim() === String(allianceId).trim(),
        )
      : members;
    const memberRows = ownedMembers.map((row, index) => {
      const player = createTradeAlliancePlayerRequest(row);
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
        roleLabel:
          TRADE_ALLIANCE_ROLE_LABELS[row.role] ??
          titleCaseTradeAllianceLabel(row.role ?? 'trader'),
        levelLabel: `Lv ${normalizeVisibleLevel(row.playerLevel) ?? 1}`,
        semanticId: `workshop.alliance.member.${
          player.identity || index
        }`,
        onActivate: () => actions.openPlayer?.(player),
      };
    });
    const memberCount = Math.max(
      memberRows.length,
      Math.floor(Number(alliance.memberCount) || 0),
    );
    const tag = String(alliance.tag ?? '').trim().toUpperCase();
    const name = String(alliance.name ?? alliance.allianceName ?? 'Alliance').trim();
    const joinMode = String(alliance.joinMode ?? 'closed');
    const seasonIncome = alliance.seasonIncome ?? alliance.weeklyIncome ?? 0;
    const memberCountLabel = `${memberCount}/50`;
    const safeTabId = TRADE_ALLIANCE_MEMBER_TABS.some(
      (tab) => tab.id === selectedTabId,
    )
      ? selectedTabId
      : 'home';
    const ownMember = tradeAlliance.ownMember ?? null;
    const canLeave =
      ownMember?.role !== 'tradeMaster' || memberCount <= 1;
    const tabs = TRADE_ALLIANCE_MEMBER_TABS.map((tab) => ({
      ...tab,
      selected: tab.id === safeTabId,
      notification:
        tab.id === 'quests' &&
        (tradeAlliance.quests ?? []).some((quest) =>
          isTradeAllianceQuestClaimable(tradeAlliance, quest),
        ),
      onSelect: () => actions.selectAllianceTab?.(tab.id),
    }));
    const tradeInfoRows = [
      {
        id: 'trade-info:members',
        label: 'Members',
        value: memberCountLabel,
      },
      {
        id: 'trade-info:join-mode',
        label: 'Join Mode',
        value:
          TRADE_ALLIANCE_JOIN_MODE_LABELS[joinMode] ??
          titleCaseTradeAllianceLabel(joinMode),
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
      rowWidget: safeTabId === 'quests' ? 'allianceQuest' : null,
      selectedTabId: safeTabId,
      tabs,
      status:
        tradeAlliance.connected === false
          ? 'connecting...'
          : '',
      copy: alliance?.description ?? '',
      tradeInfo: {
        identityLabel: `${tag ? `[${tag}] ` : ''}${name}`,
        description: String(alliance.description ?? '').trim(),
        notice: String(alliance.notice ?? '').trim(),
        memberCountLabel,
      },
      tradeInfoRows,
      members: memberRows,
      rows: safeTabId === 'quests' ? questRows : memberRows,
      emptyLabel:
        safeTabId === 'quests' && questRows.length === 0
          ? 'No Alliance Quests'
          : '',
      settings:
        safeTabId === 'settings'
          ? {
              allianceId,
              name,
              tag,
              tagColor: alliance.tagColor ?? 'ink',
              description: String(alliance.description ?? ''),
              notice: String(alliance.notice ?? ''),
              joinMode,
              editable: tradeAlliance.canEditSettings === true,
              canDisband: memberCount <= 1,
              onSave: (profile) => actions.updateAllianceProfile?.(profile),
              onDisband:
                memberCount <= 1 ? () => actions.leaveAlliance?.() : null,
            }
          : null,
    };
  }

  createLeaderboardDialog(
    leaderboard = {},
    tradeAlliance = {},
    selectedTabId = 'singlePlayer',
    actions = {},
    selectedPeriodId = 'allTime',
  ) {
    const safeTabId = LEADERBOARD_TABS.some(
      (tab) => tab.id === selectedTabId,
    )
      ? selectedTabId
      : 'singlePlayer';
    const period =
      LEADERBOARD_PERIODS.find((candidate) => candidate.id === selectedPeriodId) ??
      LEADERBOARD_PERIODS.at(-1);
    const users = getLeaderboardUsers(leaderboard, period);
    const currentUser = getLeaderboardCurrentUser(leaderboard, period);
    const visibleUsers = appendCurrentLeaderboardUser(users.slice(0, 100), currentUser);
    const alliances = getLeaderboardAlliances(tradeAlliance, period);
    const rows =
      safeTabId === 'alliance'
        ? alliances.slice(0, 10).map((alliance, index) => ({
            id:
              alliance.allianceId ??
              alliance.id ??
              alliance.name ??
              index,
            type: 'leaderboardAlliance',
            rank: normalizeLeaderboardRank(alliance.rank, index),
            name: alliance.name ?? alliance.allianceName ?? 'Alliance',
            allianceTag: String(alliance.tag ?? alliance.allianceTag ?? '').trim(),
            allianceTagColor:
              alliance.tagColor ?? alliance.allianceTagColor ?? 'ink',
            memberCount: Math.max(0, Math.floor(Number(alliance.memberCount) || 0)),
            totalCoinLabel: formatCoinAmount(
              alliance[period.valueKey] ??
                alliance.totalIncome ??
                alliance.totalGeneratedCoin ??
                alliance.income ??
                0,
            ),
            onActivate:
              typeof actions.openAlliance === 'function'
                ? () => actions.openAlliance(alliance)
                : null,
          }))
        : visibleUsers.map((user, index) => ({
            id:
              String(user.identity ?? '').trim() ||
              `${user.name ?? user.username ?? 'Wizard'}:${index}`,
            type: 'leaderboardPlayer',
            rank: normalizeLeaderboardRank(user.rank, index),
            username: user.name ?? user.username ?? 'Wizard',
            allianceTag: String(user.allianceTag ?? user.alliance_tag ?? '').trim(),
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
      onSelectPeriod: (periodId) =>
        actions.selectLeaderboardPeriod?.(periodId),
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

  createPersonalTasksDialog(gameplay = {}, selectedTabId = 'tasks', actions = {}) {
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
                actions.claimPersonalTaskMilestoneReward(
                  periodId,
                  threshold,
                ),
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
        const dailySection = periodSections.find((section) => section.id === 'daily');
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
      status: tasks.unlocked ? '' : `unlocks at level ${tasks.unlockLevel ?? 4}`,
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
    const safeTabId = WORLD_EVENT_TABS.some(
      (tab) => tab.id === selectedTabId,
    )
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
        ) ||
          currentEventPoints + remainingQualificationPoints,
      ),
    );
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
          username:
            user.name ?? user.username ?? player.username ?? 'Wizard',
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
          current:
            user.current === true ||
            user === currentLeaderboardUser ||
            Boolean(identity && currentIdentity && identity === currentIdentity),
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
      ).map((tier) => ({
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
      }));
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
                option.canDonate === true &&
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
                  `${formatWorldEventNumber(
                    option.contributionPoints,
                  )} points`
                } total`,
                itemKind,
                itemKey: option.itemKey,
                resourceKey:
                  option.resourceType === 'coin' ? 'coin' : itemKind,
                actionLabel: enabled ? 'Donate' : 'Unavailable',
                enabled,
                semanticId: `workshop.worldEvent.quest.${requestId}.donation.${optionKey}`,
                ...(enabled
                  ? {
                      onActivate: () =>
                        actions.openWorldEventDonation(
                          requestId,
                          option.optionKey,
                        ),
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
                ? request.collectedPointText ??
                  `${formatWorldEventNumber(
                    request.contributionPoints,
                  )} points total`
                : '',
            statusLabel:
              donationOptions.length === 0
                ? toSentenceCase(
                    request.completed === true
                      ? 'Completed'
                      : request.actionText ?? '',
                  )
                : '',
            completed: request.completed === true,
            donationOptions,
          };
        });
    }

    return {
      title: 'World Event',
      status: notice.unlocked
        ? ''
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
            headline: toTitleCase(current.headline ?? 'World Event'),
            body: toSentenceCase(
              Array.isArray(current.body)
                ? current.body.join('\n')
                : current.body ?? '',
            ),
            meta: `${formatWorldEventNumber(
              currentEventPoints,
            )} points · ${formatWorldEventTimer(current.resetLabel)}${
              safeTabId === 'rewards'
                ? `\nLeaderboard Rewards: ${formatWorldEventNumber(
                    qualificationPoints,
                  )} points to qualify`
                : ''
            }`,
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

  createWorldEventDonationDialog(
    gameplay = {},
    draft = null,
    actions = {},
  ) {
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
        Number(
          option.maxDonateQuantity ?? option.availableQuantity,
        ) || 0,
      ),
    );
    const amount =
      maximum > 0
        ? Math.min(
            maximum,
            Math.max(1, Math.floor(Number(draft?.amount) || 1)),
          )
        : 0;
    const points = amount * Math.max(
      0,
      Math.floor(Number(option.pointsPerUnit) || 0),
    );
    const canDonate =
      maximum > 0 &&
      typeof actions.confirmWorldEventDonation === 'function';
    const itemKind = getWorldEventDonationItemKind(option);
    const isCoinDonation = option.resourceType === 'coin';
    const questTitle = toTitleCase(
      request.title ?? request.label ?? 'Donate',
    );

    return {
      title: questTitle,
      status: canDonate ? '' : 'Not enough resources.',
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
            amount > 0
              ? `Donate x${formatWorldEventNumber(amount)}`
              : 'Donate',
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
        const systemPlayerDetail =
          systemPlayer?.detail.trimStart() ?? '';
        const id = message.id ?? message.messageId ?? index;
        const canReport =
          !isSystem &&
          message.isOwn !== true &&
          typeof actions.selectWorldChatMessageForReport === 'function';
        const selectedForReport =
          canReport && String(id) === String(selectedReportMessageId ?? '');
        const reportHighlightId = canReport
          ? `world-chat-report:${id}`
          : null;
        const canOpenPlayer =
          typeof actions.openPlayer === 'function' &&
          (!isSystem || Boolean(systemPlayer));
        return {
          id,
          type: isSystem ? 'system' : 'player',
          isOwn: !isSystem && message.isOwn === true,
          username: isSystem ? 'System' : username,
          body,
          systemPlayerUsername: systemPlayer?.username ?? '',
          systemPlayerDetail,
          bodyRuns: createWorldChatBodyRuns(
            systemPlayer ? systemPlayerDetail : body,
            { isSystem },
          ),
          allianceTag: message.allianceTag ?? message.alliance_tag ?? '',
          allianceTagColor:
            message.allianceTagColor ?? message.alliance_tag_color ?? 'ink',
          character: message.character ?? 'elara',
          frame: message.frame ?? 'classic',
          ageLabel: formatWorldChatMessageAge(message.sentAtMs),
          canReport,
          selectedForReport,
          reportHighlightId,
          semanticId: canOpenPlayer
            ? `${isSystem ? 'world-chat-system-player' : 'world-chat-player'}:${id}`
            : null,
          onActivate:
            !canOpenPlayer
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
      onSubmit: canSend
        ? (body) => actions.sendWorldChat(body)
        : null,
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

function getLeaderboardUsers(leaderboard = {}, period = LEADERBOARD_PERIODS.at(-1)) {
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
      ? source.currentGeneratedCoinUser ?? source.currentUser
      : null) ??
    null
  );
}

function appendCurrentLeaderboardUser(users, currentUser) {
  const seenIdentities = new Set();
  const uniqueUsers = users.filter((user) => {
    const identity = String(user.identity ?? '').trim().toLowerCase();
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
  const currentIdentity = String(currentUser.identity ?? '').trim().toLowerCase();
  const currentAlreadyVisible = uniqueUsers.some((user) =>
    currentIdentity
      ? String(user.identity ?? '').trim().toLowerCase() === currentIdentity
      : user === currentUser,
  );
  if (currentAlreadyVisible) {
    return uniqueUsers.map((user) =>
      (currentIdentity &&
        String(user.identity ?? '').trim().toLowerCase() === currentIdentity) ||
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

function normalizeLeaderboardRank(rank, index) {
  const safeRank = Math.floor(Number(rank));
  return Number.isFinite(safeRank) && safeRank >= 1
    ? safeRank
    : index + 1;
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
      member.identity ??
        member.playerIdentity ??
        member.memberIdentity ??
        '',
    ).trim(),
    username:
      member.username ??
      member.name ??
      member.allianceName ??
      'Wizard',
    character: member.character ?? 'elara',
    frame: member.frame ?? 'classic',
  };
}

function createTradeAllianceQuestRows(tradeAlliance, allianceId, actions) {
  const participationLock = getTradeAllianceQuestParticipationLock(tradeAlliance);
  return (tradeAlliance.quests ?? [])
    .filter(
      (quest) =>
        String(quest.allianceId ?? '').trim() === String(allianceId ?? '').trim(),
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
      const itemKind = itemFillQuest
        ? resolveTradeAllianceQuestItemKind(quest)
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
      const routeLabel = itemFillQuest ? 'Your Fill' : 'Your Route';
      const title = toSentenceCase(quest.label ?? 'Alliance Quest');

      return {
        id: quest.questId ?? `alliance-quest-${index}`,
        title,
        contributionLabel: `${routeLabel} ${formatWholeNumber(
          contribution,
        )}/${formatWholeNumber(quest.minContribution)}`,
        progressLabel: `${formatWholeNumber(quest.progress)}/${formatWholeNumber(
          quest.target,
        )}`,
        itemKind,
        itemKey: itemFillQuest ? quest.itemKey : null,
        rewardAmountLabel: formatWholeNumber(quest.crystalReward),
        rewardResource: 'crystal',
        label: `${title}\n${routeLabel} ${formatWholeNumber(
          contribution,
        )}/${formatWholeNumber(quest.minContribution)}`,
        value: `${formatWholeNumber(quest.progress)}/${formatWholeNumber(
          quest.target,
        )}\n${formatWholeNumber(quest.crystalReward)} Crystal`,
        height: 48,
        actionLabel,
        actionVariant: enabled ? 'green' : 'gray',
        actionWidth: 58,
        actionHeight: 28,
        enabled,
        notification: claimable,
        semanticId: `workshop.alliance.quest.${quest.questId ?? index}`,
        onActivate: enabled
          ? () =>
              needsFill
                ? actions.fillAllianceQuest?.(quest)
                : actions.claimAllianceQuest?.(quest.questId)
          : null,
      };
    });
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
  const maxPoints = Math.max(
    1,
    Math.floor(Number(period.maxPoints) || 1),
  );

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
    const amount = Math.max(
      0,
      Math.floor(Number(reward?.[resourceKey]) || 0),
    );
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
  return [
    {
      id: 'alliance',
      label: 'alliance',
      side: 'left',
      weight: 10,
      visible: level >= 4,
      notification: Boolean(notifications.alliance),
      allianceTagColor:
        alliance?.tagColor ?? alliance?.allianceTagColor ?? 'red',
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
      id: 'worldEvent',
      label: 'event',
      side: 'right',
      weight: 30,
      visible: gameplay.worldNotice?.unlocked === true,
      timer: String(notice?.resetLabel ?? '')
        .trim()
        .replace(/^resolves\s+/i, ''),
      notification:
        Array.isArray(notice?.requests) && notice.requests.length > 0
          ? notice.requests.some((request) => request?.completed !== true)
          : Number(notice?.completedRequests ?? 0) <
            Number(notice?.totalRequests ?? 0),
    },
    {
      id: 'guild',
      label: 'guild',
      side: 'right',
      weight: 40,
      visible:
        guildPage?.visible === true && guildPage?.unlocked !== false,
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
        const sourceName =
          message.username ?? message.author ?? 'Wizard';
        const name =
          String(sourceName).toLowerCase() === 'system'
            ? 'System'
            : sourceName;
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
            String(
              ingredient?.label ?? splitCamelCase(key),
            ).trim() || 'Unknown',
          ),
          quantity: Math.max(
            1,
            Math.floor(Number(ingredient?.quantity) || 1),
          ),
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
          String(
            potion.label ?? splitCamelCase(potionKey),
          ).trim() || 'Potion',
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

function createWorldChatBodyRuns(body, { isSystem = false } = {}) {
  const text = String(body ?? '');
  const marker = '⭐';
  const markerIndex =
    isSystem && WORLD_CHAT_PRESTIGE_DETAIL_PATTERN.test(text)
      ? text.indexOf(marker)
      : -1;
  if (markerIndex < 0) {
    return [{ kind: 'text', text }];
  }

  return [
    {
      kind: 'text',
      text: text.slice(0, markerIndex),
    },
    {
      kind: 'icon',
      assetId: WORLD_CHAT_PRESTIGE_ICON_ASSET,
      fallbackText: marker,
      label: 'Prestige star',
      size: 12,
    },
    {
      kind: 'text',
      text: text.slice(markerIndex + marker.length),
    },
  ];
}

function createResearchBoxModel(
  box = {},
  {
    completedResearchIds,
    playerLevel,
    prestigeCount,
    researchById,
  },
) {
  const artAssetId =
    RESEARCH_ART_ASSET_BY_BOX_ID[box.id] ??
    RESEARCH_FALLBACK_ART_ASSET;
  const allResearches = (box.researches ?? []).map((item) =>
    createResearchItemModel(item, {
      artAssetId:
        String(item.id ?? '').startsWith('emerald:cauldronBrewing:')
          ? RESEARCH_CAULDRON_LEVEL_ART_ASSET
          : artAssetId,
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

function createResearchItemModel(
  item = {},
  {
    artAssetId,
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
  const inProgressLabel =
    item.actionType === 'levelUp' ? 'leveling up' : 'researching';
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
  const itemKind = String(item.id ?? '').startsWith('unlockSeed:')
    ? 'seed'
    : String(item.id ?? '').startsWith('unlockRecipe:')
      ? 'potion'
      : null;
  const itemKey =
    itemKind === 'seed'
      ? String(item.id).slice('unlockSeed:'.length)
      : itemKind === 'potion'
        ? String(item.id).slice('unlockRecipe:'.length)
        : null;

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
    rank: {
      current: rankCurrent,
      total: 1,
      label: `Lv. ${String(rankCurrent).padStart(2, '0')}/01`,
    },
    rankLabel: `Lv. ${String(rankCurrent).padStart(2, '0')}/01`,
    star,
    cost,
    timer,
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
      accessibleTitle: [
        displayName,
        star?.ariaLabel,
        actionNoun,
        'information',
      ]
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
          ? `${formatResearchName(
              item,
              displayTitle,
            )} is ${inProgressLabel}`
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
          Number(right.research.completed === true) ||
        left.index - right.index,
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
  const buttonState =
    state === 'unavailable' ? 'unaffordable' : state;
  const amountLabel =
    state === 'locked'
      ? 'Locked'
      : parsed.label || item.displayValue || item.value || '';

  return {
    ...parsed,
    amountLabel,
    enabled: item.canResearch === true,
    state: buttonState,
    lockPrompt:
      state === 'locked' ? formatResearchLockPrompt(lockReason) : '',
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
    ['crystal', 'ruby', 'emerald'].find((key) =>
      Number.isFinite(Number(amountByCurrency[key])) &&
      Number(amountByCurrency[key]) > 0,
    ) ??
    (match?.[2]?.toLowerCase() || (label.toLowerCase() === 'free' ? 'coin' : null));
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

function createResearchTimerModel(
  item = {},
  { actionNoun, displayName },
) {
  const totalMs = normalizeMilliseconds(item.totalMs, item.totalSeconds);
  const remainingMs = normalizeMilliseconds(
    item.remainingMs,
    item.remainingSeconds,
  );
  const derivedProgress =
    totalMs > 0 ? 1 - remainingMs / totalMs : 0;
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
    displayValue: [item.value ?? '', remainingLabel]
      .filter(Boolean)
      .join(' '),
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

  return String(item.value ?? '')
    .match(/\b(coin|crystal|ruby|emerald)\b/i)?.[1]
    ?.toLowerCase() ?? null;
}

function formatResearchName(item = {}, displayTitle = '') {
  return [
    displayTitle,
    item.showEffect === true ? item.effect : '',
  ]
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
    (milestone) =>
      milestone.level === prestige.highestAvailableLevel,
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
    )} crystal ${Math.max(
      0,
      Math.floor(
        Number(milestone.creditedRuby ?? milestone.rewardRuby) || 0,
      ),
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
        `crystal ${Math.floor(Number(milestone.nextRun?.crystal) || 0)}`,
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
      .find((count) => count > completedPointCount) ??
    nextPointCount;

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
          reward.marketLicence?.name ??
          reward.label ??
          reward.rewards[0] ??
          '',
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
    `${Math.floor(Number(nextRun.crystal) || 0)} crystal`,
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
    ...['coin', 'crystal', 'ruby', 'emerald']
      .filter((resource) => gameplay[resource])
      .map((resource) => ({
        id: resource,
        label: toTitleCase(resource),
        value: String(
          Math.floor(Number(gameplay[resource]?.current) || 0),
        ),
        resourceKey: resource,
        itemKind: 'resource',
        itemKey: resource,
      })),
  ];
}

function createBagItemRows(gameplay, tabId) {
  const singular = tabId.slice(0, -1);
  const items =
    tabId === 'seeds'
      ? gameplay.seedInventory
      : tabId === 'ingredients'
        ? gameplay.ingredientInventory
        : (gameplay.inventory ?? []).filter(
            (item) => item.kind === singular,
          );
  return (items ?? [])
    .map((item) => ({
      ...item,
      kind: item.kind ?? singular,
    }))
    .filter((item) =>
      tabId === 'ingredients'
        ? Number(item.quantity) > 0
        : getItemDisplay(gameplay, item, item.quantity).unlocked,
    )
    .map((item) => ({
      id: item.key ?? item.itemTypeId,
      label: toTitleCase(item.label ?? splitCamelCase(item.key)),
      value: String(Math.floor(Number(item.quantity) || 0)),
      resourceKey: singular,
      itemKind: singular,
      itemKey: item.key,
    }));
}

function getVisibleBagTabs(pageStates) {
  if (!Array.isArray(pageStates)) {
    return BAG_TABS;
  }

  const unlockedPageIds = new Set(
    pageStates
      .filter((page) => page?.unlocked === true)
      .map((page) => page.id),
  );

  return BAG_TABS.filter(
    (tab) =>
      !tab.requiredPageId || unlockedPageIds.has(tab.requiredPageId),
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
      label: toTitleCase(
        item.label ?? splitCamelCase(item.key) ?? 'unknown',
      ),
      value: String(
        Math.floor(
          Number(item.total ?? item.quantity ?? item.value) || 0,
        ),
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
    .replace(/(^|[\s-])([a-z])/g, (_, prefix, letter) => (
      `${prefix}${letter.toUpperCase()}`
    ))
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
  return String(value ?? '')
    .trim()
    .replace(/^resolves\s+/i, '') || 'soon';
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
  return SEED_DROP_PREFERENCES.includes(preference)
    ? preference
    : 'medium';
}

function pluralize(count, word) {
  return Number(count) === 1 ? word : `${word}s`;
}
