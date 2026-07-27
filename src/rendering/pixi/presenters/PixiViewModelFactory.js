import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { formatRemainingTime } from '../../../pages/shared/timerDisplay.js';

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
  Object.freeze({ id: 'singlePlayer', label: 'single player' }),
  Object.freeze({ id: 'alliance', label: 'alliance' }),
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
      gameplay.tasks?.currentLevel ?? gameplay.playerLevel?.currentLevel,
    );
    const contextResource = getPageContextResource(pageId, researchTabId);

    return {
      username: player.username || 'Wizard',
      character: player.character || 'elara',
      showAvatar: true,
      mana: gameplay.mana ?? {},
      coin: gameplay.coin?.current ?? 0,
      contextCurrency: {
        resource: contextResource ?? 'crystal',
        amount: contextResource
          ? gameplay[contextResource]?.current ?? 0
          : 0,
        visible: Boolean(contextResource),
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
    pages,
    notifications,
    actions,
    reveal = {},
  } = {}) {
    return {
      currentPageId,
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
    const completion = taskSnapshot.level?.completion ?? {};
    const taskRows = activeTask ? [this.createTaskRow(activeTask, actions)] : [];

    return {
      workshop: {
        tasks: {
          title: "Elara's Request",
          rows: taskRows,
          expanded: false,
          canToggle: false,
          info: {
            title: "Elara's Request",
            copy: createTaskHelpCopy(taskSnapshot, completion),
          },
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
          gameplay,
          level,
          notifications: notifications.children ?? {},
          tradeAlliance,
        }),
        worldChat: this.createWorldChatPreview(worldChat),
        flyouts: [],
        dialogs: {
          summonInfo: this.createSummonInfoDialog(
            gameplay,
            actions,
          ),
          tasksInfo: {
            title: "Elara's Request",
            copy: createTaskHelpCopy(taskSnapshot, completion),
          },
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
          alliance: this.createAllianceDialog(tradeAlliance),
          leaderboard: this.createLeaderboardDialog(
            leaderboard,
            tradeAlliance,
            dialogState.leaderboardTabId,
            actions,
          ),
          discoveries: this.createDiscoveriesDialog(gameplay),
          personalTasks: this.createPersonalTasksDialog(gameplay),
          worldEvent: this.createWorldEventDialog(
            gameplay,
            worldEventLeaderboard,
            player,
          ),
          worldChat: this.createWorldChatDialog(worldChat, actions),
        },
      },
      actions,
    };
  }

  createTaskRow(task, actions = {}) {
    const automatic = task.autoProgress === true;
    return {
      id: task.taskId,
      label: task.requirementLabel ?? task.itemLabel ?? '',
      current: task.progressQuantity ?? 0,
      required: task.requiredQuantity ?? 0,
      progress: task.progress ?? 0,
      itemKind: task.itemKind ?? null,
      itemKey: task.itemKey ?? null,
      itemLabel: task.itemLabel ?? null,
      completed: task.completed === true,
      enabled: task.canFill === true,
      showProgress: true,
      semanticId: `workshop.task.${task.taskId}`,
      tutorialId: `task:${task.taskId}`,
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
    const resolvedSelectedTabId =
      sourceTabs.find((tab) => tab.id === selectedTabId)?.id ??
      sourceTabs.find((tab) => tab.selected === true)?.id ??
      sourceTabs.find((tab) => tab.id === 'regular')?.id ??
      sourceTabs[0]?.id ??
      'regular';
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
    const prestigeCount = Math.max(
      0,
      Math.floor(
        Number(gameplay.prestige?.completedCount) ||
          (Array.isArray(gameplay.prestige?.completedLevels)
            ? gameplay.prestige.completedLevels.length
            : 0),
      ),
    );
    const runFocus = createResearchRunFocus(gameplay.prestige?.runFocus);
    const tabs = sourceTabs.map((tab) => {
      const boxes = orderResearchBoxesByRunFocus(
        (tab.boxes ?? []).map((box) =>
          createResearchBoxModel(box, {
            completedResearchIds,
            playerLevel,
            prestigeCount,
            researchById,
          }),
        ),
        runFocus.selected,
      );

      return {
        ...tab,
        selected: tab.id === resolvedSelectedTabId,
        notification: boxes.some((box) =>
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
        runFocus,
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

    return {
      prestige: {
        selectedTabId,
        tabs: [
          { id: 'main', label: 'main', selected: selectedTabId === 'main' },
          { id: 'points', label: 'points', selected: selectedTabId === 'points' },
        ],
        summary:
          selectedTabId === 'points'
            ? { lines: [`${completedPointCount} ${pluralize(completedPointCount, 'point')} earned`] }
            : {
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
        pointRewards: (prestige.unlocks ?? []).map((reward) => ({
          id: `point-${reward.count}`,
          kind: 'point',
          count: reward.count,
          title: `${reward.count} ${pluralize(reward.count, 'point')}`,
          status:
            completedPointCount >= reward.count
              ? 'unlocked'
              : reward.count === nextPointCount
                ? 'next'
                : 'locked',
          completed: completedPointCount >= reward.count,
          locked:
            completedPointCount < reward.count &&
            reward.count !== nextPointCount,
          rewardLines: [
            reward.label,
            ...(Array.isArray(reward.rewards) ? reward.rewards : []),
          ].filter(Boolean),
        })),
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

  createDiscoveriesDialog(gameplay = {}) {
    const discoveries = gameplay.discoveries ?? {};
    return {
      title: 'discoveries',
      rows: ['seeds', 'herbs', 'potions'].flatMap((kind) =>
        (discoveries[kind] ?? []).map((item) => ({
          id: `${kind}:${item.key ?? item.itemTypeId}`,
          label: item.label ?? item.key ?? 'unknown',
          value: item.discovered || item.researched ? 'discovered' : '???',
          resourceKey: kind.slice(0, -1),
        })),
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

  createAllianceDialog(tradeAlliance = {}) {
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
    return {
      title: 'trade alliance',
      status:
        tradeAlliance.connected === false
          ? 'connecting...'
          : alliance
            ? ''
            : 'not in an alliance',
      copy: alliance?.description ?? '',
      rows: (alliance ? members : browse).map((row, index) => ({
        id:
          row.identity ??
          row.allianceId ??
          row.id ??
          index,
        label:
          row.username ??
          row.name ??
          row.allianceName ??
          'Wizard',
        value:
          row.roleLabel ??
          row.role ??
          row.tag ??
          '',
      })),
    };
  }

  createLeaderboardDialog(
    leaderboard = {},
    tradeAlliance = {},
    selectedTabId = 'singlePlayer',
    actions = {},
  ) {
    const safeTabId = LEADERBOARD_TABS.some(
      (tab) => tab.id === selectedTabId,
    )
      ? selectedTabId
      : 'singlePlayer';
    const users = getLeaderboardUsers(leaderboard);
    const alliances = getLeaderboardAlliances(tradeAlliance);
    const rows =
      safeTabId === 'alliance'
        ? alliances.slice(0, 10).map((alliance, index) => ({
            id:
              alliance.allianceId ??
              alliance.id ??
              alliance.name ??
              index,
            label: formatLeaderboardAllianceLabel(alliance, index),
            value: formatCoinPriceText(
              alliance.totalIncome ??
                alliance.totalGeneratedCoin ??
                alliance.income ??
                0,
            ),
            resourceKey: 'coin',
            actionLabel:
              typeof actions.openAlliance === 'function' ? 'open' : '',
            onActivate:
              typeof actions.openAlliance === 'function'
                ? () => actions.openAlliance(alliance)
                : null,
          }))
        : users.slice(0, 100).map((user, index) => ({
            id: user.identity ?? user.name ?? index,
            label: formatLeaderboardUserLabel(user, index),
            value: formatCoinPriceText(
              user.totalIncome ??
                user.totalGeneratedCoin ??
                user.income ??
                0,
            ),
            resourceKey: 'coin',
            actionLabel:
              typeof actions.openPlayer === 'function' ? 'open' : '',
            onActivate:
              typeof actions.openPlayer === 'function'
                ? () => actions.openPlayer(user)
                : null,
          }));

    return {
      title: 'leaderboard',
      selectedTabId: safeTabId,
      onSelectTab: (tabId) => actions.selectLeaderboardTab?.(tabId),
      tabs: LEADERBOARD_TABS.map((tab) => ({
        ...tab,
        selected: tab.id === safeTabId,
      })),
      rows,
    };
  }

  createPersonalTasksDialog(gameplay = {}) {
    const tasks = gameplay.personalTasks ?? {};
    const rows = [];
    for (const periodId of ['daily', 'weekly']) {
      const period = tasks[periodId];
      for (const task of period?.tasks ?? []) {
        rows.push({
          id: `${periodId}:${task.id ?? task.taskId}`,
          label: task.label ?? task.description ?? task.id,
          value: `${task.progress ?? task.current ?? 0}/${task.required ?? task.target ?? 0}`,
        });
      }
    }
    return {
      title: 'quests',
      status: tasks.unlocked ? '' : `unlocks at level ${tasks.unlockLevel ?? 4}`,
      rows,
    };
  }

  createWorldEventDialog(
    gameplay = {},
    worldEventLeaderboard = {},
    player = {},
  ) {
    const notice = gameplay.worldNotice ?? {};
    const current = notice.current;
    return {
      title: 'world event',
      status: notice.unlocked
        ? ''
        : `unlocks at level ${notice.unlockLevel ?? 4}`,
      copy: current?.description ?? current?.situation ?? '',
      rows: [
        ...(current?.requests ?? current?.options ?? []).map(
          (request, index) => ({
            id: request.id ?? request.key ?? index,
            label: request.label ?? request.title ?? 'request',
            value: request.progressText ?? request.value ?? '',
          }),
        ),
        ...(worldEventLeaderboard.topUsers ?? []).map(
          (user, index) => ({
            id: `leaderboard:${user.identity ?? user.name ?? index}`,
            label: `${user.rank ?? index + 1}. ${
              user.name ?? player.username ?? 'Wizard'
            }`,
            value: String(user.points ?? 0),
          }),
        ),
      ],
    };
  }

  createWorldChatDialog(worldChat = {}, actions = {}) {
    const canSend =
      worldChat.connected !== false &&
      typeof actions.sendWorldChat === 'function';
    return {
      title: 'World Chat',
      status: worldChat.connected === false ? 'connecting...' : '',
      composer: {
        placeholder: 'message',
        maxLength: 160,
        enabled: canSend,
      },
      rows: (worldChat.messages ?? []).map((message, index) => {
        const body = message.body ?? message.message ?? '';
        return {
          id: message.id ?? message.messageId ?? index,
          label: message.username ?? message.author ?? 'Wizard',
          value: body,
          onActivate: () => actions.openPlayer?.(message),
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

function getLeaderboardUsers(leaderboard = {}) {
  const source = leaderboard.leaderboard ?? leaderboard;
  const users =
    source.topAllTimeUsers ??
    source.topGeneratedCoinUsers ??
    source.topUsers ??
    source.topIncomeUsers ??
    [];
  return Array.isArray(users) ? users : [];
}

function getLeaderboardAlliances(tradeAlliance = {}) {
  const alliances =
    tradeAlliance.topAllTimeAlliances ??
    tradeAlliance.topAlliances ??
    tradeAlliance.alliances ??
    [];
  return Array.isArray(alliances) ? alliances : [];
}

function formatLeaderboardUserLabel(user = {}, index = 0) {
  const rank = normalizeLeaderboardRank(user.rank, index);
  const allianceTag = String(
    user.allianceTag ?? user.alliance_tag ?? '',
  ).trim();
  const name = user.name ?? user.username ?? 'Wizard';
  const level = Math.max(
    1,
    Math.floor(Number(user.playerLevel ?? user.player_level) || 1),
  );
  return `${rank}. ${allianceTag ? `[${allianceTag}] ` : ''}${name} (${level})`;
}

function formatLeaderboardAllianceLabel(alliance = {}, index = 0) {
  const rank = normalizeLeaderboardRank(alliance.rank, index);
  const name = alliance.name ?? alliance.allianceName ?? 'alliance';
  const tag = String(alliance.tag ?? alliance.allianceTag ?? '').trim();
  return `${rank}. ${name}${tag ? ` [${tag}]` : ''}`;
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

function createTaskHelpCopy(tasks, completion) {
  const nextLevel =
    (completion.level ?? tasks.currentLevel ?? 0) + 1;
  return `complete elara's requests one at a time to reach level ${nextLevel}. completing the final request advances the level automatically. turn-in requests consume items.`;
}

function createWorkshopFeatures({
  gameplay,
  level,
  notifications,
  tradeAlliance = {},
}) {
  const alliance =
    tradeAlliance.alliance ??
    tradeAlliance.currentAlliance ??
    tradeAlliance.ownAlliance ??
    tradeAlliance.membership?.alliance ??
    null;
  const notice = gameplay.worldNotice?.current ?? null;
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
        const name = message.username ?? message.author ?? 'Wizard';
        const body = message.body ?? message.message ?? '';
        return `${name}: ${body}`;
      })
      .join('\n'),
  };
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
  const researches = getDisplayedResearches(allResearches);

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
    itemKind === 'potion'
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

function createResearchRunFocus(runFocus = {}) {
  return {
    unlocked: runFocus?.unlocked === true,
    selected:
      typeof runFocus?.selected === 'string'
        ? runFocus.selected
        : 'none',
    options: Array.isArray(runFocus?.options) ? runFocus.options : [],
    helper:
      runFocus?.helper ??
      (runFocus?.selected && runFocus.selected !== 'none'
        ? `${runFocus.selected} boxes first`
        : 'standard order'),
  };
}

function orderResearchBoxesByRunFocus(boxes = [], selectedFocus = 'none') {
  if (!selectedFocus || selectedFocus === 'none') {
    return boxes;
  }

  return boxes
    .map((box, index) => ({
      box,
      index,
      priority: getRunFocusBoxPriority(box, selectedFocus),
    }))
    .sort(
      (left, right) =>
        right.priority - left.priority || left.index - right.index,
    )
    .map(({ box }) => box);
}

function getRunFocusBoxPriority(box = {}, selectedFocus = 'none') {
  const id = String(box.id ?? '').toLowerCase();

  if (selectedFocus === 'capacity') {
    return /capacity|plotgrowth|cauldronbrewing/.test(id) ? 1 : 0;
  }

  if (selectedFocus === 'automation') {
    return /^auto|automationreserve/.test(id) ? 1 : 0;
  }

  if (selectedFocus === 'research') {
    return /researchcost|researchtime/.test(id) ? 1 : 0;
  }

  if (selectedFocus === 'market') {
    return /fastsell/.test(id) ? 1 : 0;
  }

  return 0;
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
    title: `level ${milestone.level}`,
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

function formatPrestigeTotals(nextRun = {}) {
  return [
    `${Math.floor(Number(nextRun.crystal) || 0)} crystal`,
    `${Math.floor(Number(nextRun.ruby) || 0)} ruby`,
    `${Math.floor(Number(nextRun.emerald) || 0)} emerald`,
    'total',
  ].join(' ');
}

function formatLevelFlow(current, target) {
  return `level ${Math.max(1, Math.floor(Number(current) || 1))} > level ${Math.max(
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
  return (items ?? []).map((item) => ({
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

function formatPercent(value) {
  const percent = Math.max(0, Math.min(1, Number(value) || 0)) * 100;
  return `${Number(percent.toFixed(percent < 1 ? 2 : 1))}%`;
}

function normalizeSeedDropPreference(preference) {
  return SEED_DROP_PREFERENCES.includes(preference)
    ? preference
    : 'medium';
}

function pluralize(count, word) {
  return Number(count) === 1 ? word : `${word}s`;
}
