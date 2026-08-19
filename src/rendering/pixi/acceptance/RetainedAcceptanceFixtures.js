import { GUILD_DIALOG_IDS } from '../pages/guild/GuildDialogPixi.js';
import {
  SHOP_DIALOG_IDS,
  WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID,
} from '../pages/shop/ShopDialogPixi.js';
import { PRESTIGE_INFO_DIALOG_ID } from '../pages/prestige/PrestigeDialogPixi.js';

export const RETAINED_PAGE_IDS = Object.freeze([
  'workshop',
  'research',
  'prestige',
  'garden',
  'brewing',
  'shop',
  'guild',
]);

export const DIALOG_IDS_BY_PAGE = Object.freeze({
  workshop: Object.freeze([
    'workshop.summonInfo',
    'workshop.bag',
    'workshop.stats',
    'workshop.inbox',
    'workshop.alliance',
    'workshop.leaderboard',
    'workshop.discoveries',
    'workshop.personalTasks',
    'workshop.worldEvent',
    'workshop.worldEventDonate',
    'workshop.worldChat',
  ]),
  research: Object.freeze([]),
  prestige: Object.freeze([PRESTIGE_INFO_DIALOG_ID]),
  garden: Object.freeze(['garden.seed', 'garden.cancel', 'garden.swap']),
  brewing: Object.freeze([
    'brewing.herbs',
    'brewing.recipes',
    'brewing.recipe-choice',
    'brewing.automation-settings',
  ]),
  shop: Object.freeze(Object.values(SHOP_DIALOG_IDS)),
  guild: Object.freeze(Object.values(GUILD_DIALOG_IDS)),
});

export const RETAINED_DIALOG_IDS = Object.freeze(
  RETAINED_PAGE_IDS.flatMap((pageId) => DIALOG_IDS_BY_PAGE[pageId]),
);

const accept = () => true;

export function createPageViewModel(
  pageId,
  variant,
  { subscribe = null } = {},
) {
  const key = normalizeVariant(variant);

  switch (pageId) {
    case 'workshop':
      return createWorkshopModel(key);
    case 'research':
      return createResearchModel(key);
    case 'prestige':
      return createPrestigeModel(key);
    case 'garden':
      return createGardenModel(key);
    case 'brewing':
      return createBrewingModel(key);
    case 'shop':
      return createShopModel(key, subscribe);
    case 'guild':
      return createGuildModel(key, subscribe);
    default:
      throw new Error(`Unknown retained acceptance page: ${pageId}`);
  }
}

export function createDialogViewModel(
  dialogId,
  variant,
  { subscribe = null } = {},
) {
  const key = normalizeVariant(variant);

  if (dialogId === 'workshop.personalTasks') {
    return createPersonalTasksDialogModel(key);
  }

  if (dialogId === 'workshop.alliance') {
    return createTradeAllianceDialogModel(key);
  }

  if (dialogId === WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID) {
    const amount = key === 'a' ? 3 : 8;
    return {
      title: 'Quiet The Crowd',
      featuredItem: {
        id: 'giving',
        label: 'Calming Draught',
        detail: 'Owned',
        value: '12',
        itemKind: 'potion',
        itemKey: 'calmingDraught',
        iconSize: 36,
      },
      summaryRows: [
        {
          id: 'total',
          label: 'Already Donated',
          value: '360 points',
        },
        {
          id: 'amount',
          label: 'Amount',
          value: `${amount} / 12`,
        },
        {
          id: 'points',
          label: 'Earn',
          value: `+${amount * 120} points`,
          valueTone: 'root',
        },
      ],
      range: {
        enabled: true,
        tone: 'root',
        min: 1,
        max: 12,
        step: 1,
        value: amount,
        onChange: accept,
      },
      actions: [
        {
          id: 'confirm',
          label: `Donate x${amount}`,
          variant: 'green',
          enabled: true,
          action: accept,
        },
      ],
    };
  }

  if (dialogId.startsWith('workshop.')) {
    return {
      title: dialogId,
      rows: createCompactRows(key, 'workshop'),
      tabs: createTabs(key, 'workshop'),
    };
  }

  if (dialogId === 'garden.seed') {
    return {
      rows: [1, 2].map((index) => ({
        id: `seed-${key}-${index}`,
        key: `seed-${key}-${index}`,
        label: `seed ${key} ${index}`,
        quantity: index + 1,
        onSelect: accept,
      })),
    };
  }

  if (dialogId === 'garden.cancel' || dialogId === 'garden.swap') {
    return {
      message: `${dialogId} ${key}?`,
      confirmLabel: dialogId === 'garden.cancel' ? 'empty' : 'swap',
      payload: { key },
      onConfirm: accept,
    };
  }

  if (dialogId === PRESTIGE_INFO_DIALOG_ID) {
    return {
      text:
        key === 'a'
          ? [
              '• Resets Mana, Coin, Crystal, items, ordinary Research, Garden, Brewing, and level tasks.',
              '• Daily and weekly task timers continue.',
              '• Lower unclaimed milestones are credited automatically.',
              '• Prestige Points permanently unlock Market licences.',
            ].join('\n')
          : 'Prestige Points permanently unlock Market licences.',
      title: 'Info',
    };
  }

  if (dialogId === 'brewing.herbs') {
    return {
      title: 'Choose Herb',
      cauldronIndex: key === 'a' ? 0 : 1,
      slotIndex: key === 'a' ? 0 : 1,
      rows: [1, 2].map((index) => ({
        id: `herb-${key}-${index}`,
        itemTypeId: index,
        key: `herb-${key}-${index}`,
        label: `herb ${key} ${index}`,
        quantity: index + 1,
        enabled: true,
        semanticId: `brewing.herb.${key}.${index}`,
      })),
      actions: {
        selectHerb: accept,
      },
    };
  }

  if (dialogId === 'brewing.recipes') {
    return {
      recipes: [1, 2].map((index) => ({
        id: `recipe-${key}-${index}`,
        key: `recipe-${key}-${index}`,
        label: `recipe ${key} ${index}`,
        unlocked: true,
        ingredients: [1, 2].map((ingredientIndex) => ({
          id: `recipe-${key}-${index}-ingredient-${ingredientIndex}`,
          key: `herb-${key}-${ingredientIndex}`,
          label: `herb ${ingredientIndex}`,
          required: ingredientIndex,
          available: ingredientIndex + 2,
        })),
      })),
      actions: {
        selectRecipe: accept,
        turnSpread: accept,
      },
    };
  }

  if (dialogId === 'brewing.recipe-choice') {
    return {
      cauldronIndex: key === 'a' ? 0 : 1,
      onClearRecipe: accept,
      onChooseAnother: accept,
    };
  }

  if (dialogId === 'brewing.automation-settings') {
    return {
      cauldronIndex: key === 'a' ? 0 : 1,
      cauldronNumber: key === 'a' ? 1 : 2,
      autoBrewEnabled: true,
    };
  }

  if (Object.values(SHOP_DIALOG_IDS).includes(dialogId)) {
    return createShopDialogModel(dialogId, key, subscribe);
  }

  if (Object.values(GUILD_DIALOG_IDS).includes(dialogId)) {
    return createGuildDialogModel(dialogId, key, subscribe);
  }

  throw new Error(`Unknown retained acceptance dialog: ${dialogId}`);
}

function createTradeAllianceDialogModel(key) {
  const members = [
    {
      id: `alliance-${key}-mira`,
      memberIdentity: `identity-${key}-mira`,
      username: 'Mira',
      character: 'mira',
      frame: 'sun',
      roleLabel: 'Trade Master',
      levelLabel: 'Lv 24',
      semanticId: `workshop.alliance.member.${key}.mira`,
      onActivate: accept,
    },
    {
      id: `alliance-${key}-juniper`,
      memberIdentity: `identity-${key}-juniper`,
      username: 'Juniper',
      character: 'juniper',
      frame: 'emerald',
      roleLabel: 'Quartermaster',
      levelLabel: 'Lv 18',
      semanticId: `workshop.alliance.member.${key}.juniper`,
      onActivate: accept,
    },
    {
      id: `alliance-${key}-rowan`,
      memberIdentity: `identity-${key}-rowan`,
      username: 'Rowan',
      character: 'rowan',
      frame: 'classic',
      roleLabel: 'Trader',
      levelLabel: 'Lv 12',
      semanticId: `workshop.alliance.member.${key}.rowan`,
      onActivate: accept,
    },
  ];

  return {
    title: 'Trade Alliance',
    ownedAlliance: true,
    ownedAllianceHome: true,
    selectedTabId: 'home',
    tabs: ['home', 'quests', 'settings'].map((id) => ({
      id,
      label: id[0].toUpperCase() + id.slice(1),
      selected: id === 'home',
      onSelect: accept,
    })),
    tradeInfo: {
      identityLabel: '[OWL] Night Owls',
      description: 'Patient traders building a stronger market together.',
      notice: 'Weekly goal: support every active member.',
      memberCountLabel: `${members.length}/50`,
    },
    tradeInfoRows: [
      {
        id: 'trade-info:members',
        label: 'Members',
        value: `${members.length}/50`,
      },
      { id: 'trade-info:join-mode', label: 'Join Mode', value: 'Apply' },
      {
        id: 'trade-info:season-income',
        label: 'Season Income',
        value: '84.5k',
        itemKind: 'resource',
        itemKey: 'coin',
        resourceKey: 'coin',
      },
      {
        id: 'trade-info:membership',
        label: 'Membership',
        actionLabel: 'Leave',
        actionVariant: 'red',
        enabled: true,
        onActivate: accept,
      },
    ],
    members,
    rows: members,
  };
}

function createPersonalTasksDialogModel(key) {
  const alternate = key === 'b';
  const claimed = alternate;
  return {
    title: 'Daily Tasks',
    selectedTabId: 'rewards',
    periodSections: [
      {
        id: 'daily',
        title: 'Today',
        currentPoints: alternate ? 100 : 70,
        maxPoints: 100,
        pointsLabel: `${alternate ? 100 : 70} / 100 Points`,
        progress: alternate ? 1 : 0.7,
        resetLabel: 'Resets in 2h',
      },
      {
        id: 'weekly',
        title: 'This Week',
        currentPoints: alternate ? 200 : 170,
        maxPoints: 700,
        pointsLabel: `${alternate ? 200 : 170} / 700 Points`,
        progress: alternate ? 2 / 7 : 17 / 70,
        resetLabel: 'Resets in 4d 2h',
      },
    ],
    rows: [
      ...[30, 50, 70, 100].map((threshold) => ({
        id: `daily:reward:${threshold}`,
        sectionId: 'daily',
        label: `${threshold} Points`,
        resourceValues: [
          { resourceKey: 'coin', amountLabel: `+${threshold * 45}` },
        ],
        value: threshold <= 70 || claimed ? 'Claimed' : '',
        height: 30,
        muted: threshold <= 70 || claimed,
        ...(threshold <= 70 || claimed
          ? { statusIcon: 'checkmark' }
          : {
              actionLabel: 'Claim',
              actionHeight: 27,
              actionVariant: 'green',
              enabled: true,
              onActivate: accept,
            }),
      })),
      ...[100, 250, 500, 700].map((threshold) => ({
        id: `weekly:reward:${threshold}`,
        sectionId: 'weekly',
        label: `${threshold} Points`,
        resourceValues: [
          { resourceKey: 'coin', amountLabel: `+${threshold * 20}` },
          ...(threshold === 700
            ? [{ resourceKey: 'crystal', amountLabel: '+1' }]
            : []),
        ],
        value: threshold <= 100 ? 'Claimed' : '',
        height: 30,
        muted: true,
        ...(threshold <= 100
          ? { statusIcon: 'checkmark' }
          : {
              actionLabel: 'Locked',
              actionHeight: 27,
              actionVariant: 'green',
              enabled: false,
            }),
      })),
    ],
    tabs: [
      { id: 'tasks', label: 'Tasks' },
      { id: 'rewards', label: 'Rewards', selected: true },
    ],
  };
}

function createWorkshopModel(key) {
  return {
    workshop: {
      tasks: {
        rows: [1, 2].map((index) => ({
          id: `task-${key}-${index}`,
          label: `task ${key} ${index}`,
          current: index,
          required: 3,
        })),
      },
      summon: {
        cost: 10,
      },
      flyouts: [1, 2].map((index) => ({
        id: `flyout-${key}-${index}`,
        text: `+${index} ${key}`,
      })),
      worldChat: {
        label: `chat ${key}`,
      },
    },
    actions: {
      summonSeed: accept,
    },
  };
}

function createResearchModel(key) {
  return {
    research: {
      selectedTabId: 'regular',
      tabs: [
        {
          id: 'regular',
          label: 'regular research',
          boxes: [1, 2].map((boxIndex) => ({
            id: `research-box-${key}-${boxIndex}`,
            label: `box ${key} ${boxIndex}`,
            researches: [1, 2].map((rowIndex) => ({
              id: `research-${key}-${boxIndex}-${rowIndex}`,
              displayName:
                boxIndex === 1 && rowIndex === 1
                  ? 'five-level research'
                  : boxIndex === 1 && rowIndex === 2
                    ? 'two-level research'
                    : `research ${rowIndex}`,
              effect: `+${rowIndex}`,
              displayValue: `${rowIndex * 10} mana`,
              canResearch: true,
              ...(boxIndex === 1 && rowIndex === 1
                ? { starLevel: 1, starMaxLevel: 5 }
                : {}),
              ...(boxIndex === 1 && rowIndex === 2
                ? { starLevel: 1, starMaxLevel: 2 }
                : {}),
              info: {
                title: `research ${rowIndex}`,
                copy: `research copy ${key}`,
              },
            })),
          })),
        },
        {
          id: 'advanced',
          label: 'advanced research',
          boxes: [],
        },
      ],
      runFocus: {
        unlocked: true,
        selected: `focus-${key}-1`,
        options: [1, 2].map((index) => ({
          id: `focus-${key}-${index}`,
          label: `focus ${index}`,
        })),
      },
    },
    actions: {
      buyResearch: accept,
      setRunFocus: accept,
    },
  };
}

function createPrestigeModel(key) {
  return {
    prestige: {
      selectedTabId: 'main',
      tabs: [
        { id: 'main', label: 'main' },
        { id: 'points', label: 'points' },
      ],
      summary: {
        lines: [`run ${key}`, 'receive crystal'],
      },
      milestones: [1, 2].map((index) => ({
        id: `milestone-${key}-${index}`,
        level: index * 10,
        title: `level ${index * 10}`,
        reward: `${index * 10} crystal`,
        canComplete: true,
        confirm: {
          milestoneId: `milestone-${key}-${index}`,
          level: index * 10,
          lines: ['reset this run?'],
        },
      })),
    },
    actions: {
      completePrestige: accept,
      requestPrestige: accept,
    },
  };
}

function createGardenModel(key) {
  const tileOffset = key === 'a' ? 0 : 2;

  return {
    garden: {
      now: 0,
      maxPlots: 9,
      plots: [1, 2].map((index) => ({
        id: `plot-${key}-${index}`,
        tileNumber: tileOffset + index,
        soilLevel: 1,
        phase: 'growing',
        label: `herb ${key} ${index}`,
        herbKey: `herb-${key}-${index}`,
        actionText: 'growing',
        process: {
          durationMs: 10_000,
          endTimeMs: 5_000,
        },
        acceptsSeedDrop: true,
      })),
      inventory: {
        activeTab: 'seeds',
        herbs: {
          rows: createInventoryRows(key, 'herb', 'quantity'),
        },
        seeds: {
          rows: createInventoryRows(key, 'seed', 'quantity'),
        },
      },
    },
    actions: {
      activatePlot: accept,
      dropSeed: accept,
      openInventory: accept,
    },
  };
}

function createBrewingModel(key) {
  const cauldronOffset = key === 'a' ? 0 : 2;

  return {
    brewing: {
      now: 0,
      cauldrons: [0, 1].map((index) => {
        const cauldronIndex = cauldronOffset + index;

        return {
          id: `cauldron-${key}-${cauldronIndex}`,
          cauldronIndex,
          cauldronNumber: cauldronIndex + 1,
          unlocked: true,
          maxIngredients: 3,
          ingredients: [1, 2].map((ingredientIndex) => ({
            id: `ingredient-${key}-${cauldronIndex}-${ingredientIndex}`,
            key: `herb-${key}-${ingredientIndex}`,
            label: `herb ${ingredientIndex}`,
            quantity: ingredientIndex,
            removable: true,
          })),
          preview: {
            key: `potion-${key}-${cauldronIndex}`,
            label: `potion ${cauldronIndex + 1}`,
          },
          canSelectRecipe: true,
          primaryAction: {
            id: 'brew',
            label: 'brew',
            enabled: true,
            onActivate: accept,
          },
          quantityAction: {
            label: 'x1',
            enabled: true,
            nextQuantity: 2,
          },
          autoAction: {
            label: 'manual',
            enabled: true,
          },
          acceptsHerbDrop: true,
        };
      }),
      inventory: {
        activeTab: 'herbs',
        herbs: {
          rows: createInventoryRows(key, 'herb', 'availableQuantity'),
        },
        potions: {
          rows: createInventoryRows(key, 'potion', 'availableQuantity'),
        },
      },
    },
    actions: {
      selectCauldron: accept,
      dropHerb: accept,
      openInventory: accept,
    },
  };
}

function createShopModel(key, subscribe) {
  const slotOffset = key === 'a' ? 0 : 2;

  return {
    shop: {
      selectedTabId: 'traders',
      market: {
        name: 'Small Town Market',
        rank: 1,
      },
      traders: {
        timerLabel: `refresh ${key}`,
        stalls: [1, 2].map((index) => ({
          id: `stall-${key}-${index}`,
          slotNumber: slotOffset + index,
          itemLabel: `herb ${index}`,
          quantityLabel: `${index}`,
          priceLabel: `${index * 10} coin`,
          progress: 0.5,
          dialog: {
            title: 'load stall',
            items: [],
          },
        })),
      },
      players: {
        requests: {
          countLabel: '2/3',
          slots: createShopSlots(key, 'request', slotOffset),
        },
        market: {
          countLabel: '2/3',
          slots: createShopSlots(key, 'listing', slotOffset),
        },
      },
      crystals: {
        coinOffer: {
          rewardLabel: '100 coin',
          actionLabel: 'collect',
          canCollect: true,
        },
        dailyCrystalOffer: {
          rewardLabel: '1 crystal',
          actionLabel: 'free',
          canCollect: true,
        },
        offers: [1, 2].map((index) => ({
          id: `crystal-${key}-${index}`,
          crystalCount: (slotOffset + index) * 10,
          bundleLabel: `${(slotOffset + index) * 10} crystals`,
          priceLabel: `$${index}.99`,
        })),
      },
    },
    subscribe,
    actions: {
      clearPlayerRequest: accept,
      collectCoinOffer: accept,
      onActivate: accept,
      onDeactivate: accept,
    },
  };
}

function createGuildModel(key, subscribe) {
  const quests = [
    {
      id: `quest-${key}-1`,
      title: 'Smuggler Tunnel',
      lore: 'Map the lantern-lit route beneath the fish market and return unseen.',
      difficulty: 'medium',
      statLabel: 'Cunning / Agility',
      rewardText: '120-180 coin, 2-4 seeds, or 1-3 herbs',
      expiresLabel: '2h',
    },
    {
      id: `quest-${key}-2`,
      title: 'Broken Bridge Watch',
      lore: 'Guard the bridge crew through dusk while raiders test the unfinished crossing.',
      difficulty: 'easy',
      statLabel: 'Endurance / Discipline',
      rewardText: '80-120 coin, 1-3 seeds, or 1-2 herbs',
      expiresLabel: '4h',
    },
  ];

  return {
    guild: {
      unlocked: true,
      created: true,
      selectedTabId: 'hall',
      profile: {
        name: `Moss Hall ${key}`,
        tag: 'MOSS',
        color: 'green',
      },
      secretary: {
        level: 1,
        hiredCap: 3,
        boardSlots: 3,
        canUpgrade: true,
        next: {
          level: 2,
          hiredCap: 4,
          boardSlots: 4,
          costCoin: 100,
        },
      },
      board: quests,
      normalBoard: quests,
      availableRequests: [1, 2].map((index) => ({
        ...quests[index - 1],
        id: `available-${key}-${index}`,
      })),
      adventurers: createGuildPeople(key, 'adventurer'),
      applicants: createGuildPeople(key, 'applicant'),
      logs: [1, 2].map((index) => ({
        id: `log-${key}-${index}`,
        text: `guild log ${key} ${index}`,
      })),
      applicantResetLabel: '5h',
      boardWaveLabel: '2h',
    },
    subscribe,
    actions: {
      fireAdventurer: accept,
      hireApplicant: accept,
      postRequest: accept,
      removeRequest: accept,
      upgradeSecretary: accept,
      updateGuildProfile: accept,
      onActivate: accept,
      onDeactivate: accept,
    },
  };
}

function createShopDialogModel(dialogId, key, subscribe) {
  if (dialogId === SHOP_DIALOG_IDS.MARKET) {
    return {
      title: 'Player Market',
      status: key === 'a' ? '3 Matching Offers' : '',
      fields:
        key === 'a'
          ? [
              { id: 'item', label: 'Item', value: 'Sage Seed' },
              { id: 'minPrice', label: 'Min Price', value: '5' },
              { id: 'username', label: 'Username', value: 'Mira' },
            ]
          : [],
      items: [
        ['Mira', 'Sage Seed', 12],
        ['Rowan', 'Mint Seed', 18],
        ['Juniper', 'Briar Seed', 25],
      ].map(([username, itemLabel, priceCoin], index) => ({
        id: `shop-market-${key}-${index}`,
        indexLabel: `${index + 1}.`,
        itemLabel: `${itemLabel} (${index + 2}) · ${username}`,
        priceLabel: `${priceCoin} coin`,
        valueResourceKey: 'coin',
        action: accept,
      })),
      actions:
        key === 'a'
          ? [
              { id: 'clear', label: 'Clear', action: accept },
              { id: 'apply', label: 'Apply Filter', action: accept },
            ]
          : [{ id: 'filter', label: 'Filter', action: accept }],
      tabs: [
        { id: 'selling', label: 'Selling', selected: true, action: accept },
        { id: 'buying', label: 'Buying', action: accept },
      ],
      subscribe,
    };
  }

  return {
    title: `${dialogId} ${key}`,
    summaryRows: createCompactRows(key, `${dialogId}-summary`),
    items: createCompactRows(key, `${dialogId}-item`).map((item) => ({
      ...item,
      action: accept,
    })),
    actions: [1, 2].map((index) => ({
      id: `${dialogId}-action-${key}-${index}`,
      label: `action ${index}`,
      enabled: true,
      action: accept,
    })),
    tabs: createTabs(key, dialogId),
    fields: [
      {
        id: `${dialogId}-field-${key}-1`,
        label: 'name',
        value: key,
      },
      {
        id: `${dialogId}-field-${key}-2`,
        label: 'tag',
        value: key.toUpperCase(),
      },
    ],
    range: {
      value: key === 'a' ? 0.25 : 0.75,
      onChange: accept,
    },
    amount: {
      value: key === 'a' ? 1 : 2,
      onChange: accept,
    },
    subscribe,
  };
}

function createGuildDialogModel(dialogId, key, subscribe) {
  if (
    dialogId === GUILD_DIALOG_IDS.CHARTER ||
    dialogId === GUILD_DIALOG_IDS.SETTINGS
  ) {
    return {
      profile: {
        name: `Moss Hall ${key}`,
        tag: 'MOSS',
        color: 'green',
      },
      onSubmit: accept,
      subscribe,
    };
  }

  if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
    return {
      requests: [
        {
          id: `stack-request-${key}-1`,
          title: 'Smuggler Tunnel',
          lore: 'Map the lantern-lit route beneath the fish market and return unseen.',
          difficulty: 'medium',
          tags: ['crime'],
          statLabel: 'Cunning / Agility',
          rewardText: '120-180 coin, 2-4 seeds, or 1-3 herbs',
          expiresLabel: '2h',
        },
        {
          id: `stack-request-${key}-2`,
          title: 'Broken Bridge Watch',
          lore: 'Guard the bridge crew through dusk while raiders test the unfinished crossing.',
          difficulty: 'easy',
          tags: ['village'],
          statLabel: 'Endurance / Discipline',
          rewardText: '80-120 coin, 1-3 seeds, or 1-2 herbs',
          expiresLabel: '4h',
        },
        {
          id: `stack-request-${key}-3`,
          title: 'Fever Ward Run',
          lore: 'Carry medicine across town before the fever ward closes its doors.',
          difficulty: 'medium',
          tags: ['medical'],
          statLabel: 'Wisdom / Discipline',
          rewardText: '100-140 coin, 2-3 seeds, or 1-3 herbs',
          expiresLabel: '3h',
        },
        {
          id: `stack-request-${key}-4`,
          title: 'Old Road Escort',
          lore: 'Guide a nervous merchant and a damaged wagon through the north road.',
          difficulty: 'easy',
          tags: ['road', 'trade'],
          statLabel: 'Endurance / Charisma',
          rewardText: '90-130 coin, 1-3 seeds, or 1-2 herbs',
          expiresLabel: '5h',
        },
        {
          id: `stack-request-${key}-5`,
          title: 'Charter Audit',
          lore: 'Recover the sealed town charter before the council bell rings.',
          difficulty: 'medium',
          tags: ['political'],
          statLabel: 'Wisdom / Cunning',
          rewardText: '110-160 coin, 2-4 seeds, or 2-3 herbs',
          expiresLabel: '2h',
        },
        {
          id: `stack-request-${key}-6`,
          title: 'Mirror Maze',
          lore: 'Find the one reflection that still remembers where the key was hidden.',
          difficulty: 'hard',
          tags: ['magic'],
          statLabel: 'Wisdom / Luck',
          rewardText: '160-220 coin, 3-5 seeds, or 2-4 herbs',
          expiresLabel: '6h',
        },
        {
          id: `stack-request-${key}-7`,
          title: 'Hilltop Watch',
          lore: 'Survey the ridge and mark every campfire along the valley road.',
          difficulty: 'medium',
          tags: ['exploration'],
          statLabel: 'Wisdom / Agility',
          rewardText: '100-150 coin, 2-4 seeds, or 1-3 herbs',
          expiresLabel: '4h',
        },
        {
          id: `stack-request-${key}-8`,
          title: 'Arena Challenge',
          lore: 'Meet the gate captain at the training ring and answer the guild challenge.',
          difficulty: 'hard',
          tags: ['arena'],
          statLabel: 'Strength / Endurance',
          rewardText: '170-230 coin, 3-5 seeds, or 2-4 herbs',
          expiresLabel: '6h',
        },
      ],
      onPost: accept,
      subscribe,
    };
  }

  if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
    return {
      request: {
        id: `request-${key}`,
        title: `request ${key}`,
        lore: `request lore ${key}`,
        difficulty: 'easy',
        rewardText: '20 coin',
        expiresLabel: '2h',
      },
      rows: createCompactRows(key, 'guild-request'),
      actionLabel: 'remove',
      action: accept,
      subscribe,
    };
  }

  const isApplicant = dialogId === GUILD_DIALOG_IDS.APPLICANT;

  return {
    card: {
      id: `person-${key}`,
      displayName: isApplicant ? 'Orin Moss' : 'Mira Ashveil',
      iconKey: isApplicant
        ? 'adventurer_packscout'
        : 'adventurer_bluescarf_spear',
      level: isApplicant ? 2 : 7,
      xp: isApplicant ? 35 : 410,
      nextLevelXp: isApplicant ? 100 : 600,
      status: isApplicant ? 'waiting' : 'idle',
      statusLabel: isApplicant ? 'Applicant' : 'Resting',
      personalityLabel: isApplicant ? 'Scholar' : 'Loyal',
      stats: {
        strength: isApplicant ? 2 : 7,
        agility: isApplicant ? 4 : 5,
      },
    },
    actionLabel: dialogId === GUILD_DIALOG_IDS.APPLICANT ? 'hire' : 'fire',
    action: accept,
    subscribe,
  };
}

function createInventoryRows(key, kind, quantityField) {
  return [1, 2].map((index) => ({
    id: `${kind}-${key}-${index}`,
    key: `${kind}-${key}-${index}`,
    label: `${kind} ${index}`,
    [quantityField]: index + 2,
  }));
}

function createShopSlots(key, kind, slotOffset) {
  return [1, 2].map((index) => ({
    id: `${kind}-${key}-${index}`,
    slotNumber: slotOffset + index,
    itemLabel: `herb ${index}`,
    value: `${index * 10} coin`,
    dialog: {
      title: kind,
      items: [],
    },
  }));
}

function createGuildPeople(key, kind) {
  return [1, 2].map((index) => ({
    id: `${kind}-${key}-${index}`,
    displayName: `${kind} ${index}`,
    level: index,
    status: 'idle',
    statusLabel: 'idle',
    personalityLabel: 'loyal',
    stats: {
      strength: index,
    },
  }));
}

function createCompactRows(key, prefix) {
  return [1, 2].map((index) => ({
    id: `${prefix}-${key}-${index}`,
    label: `${prefix} ${index}`,
    value: `${key}-${index}`,
  }));
}

function createTabs(key, prefix) {
  return [1, 2].map((index) => ({
    id: `${prefix}-tab-${key}-${index}`,
    label: `tab ${index}`,
    action: accept,
  }));
}

function normalizeVariant(variant) {
  return variant === 'b' ? 'b' : 'a';
}
