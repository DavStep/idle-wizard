import { Timestamp, type Identity } from 'spacetimedb';
import {
  schema,
  table,
  t,
  Range,
  type ReducerCtx,
  type InferSchema,
  type Uuid,
} from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const DEFAULT_PLAYER_LEVEL = 1;
const DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL = 1;
const DEFAULT_PLAYER_THEME = 'white';
const DEFAULT_PLAYER_FONT = 'lexend';
const DEFAULT_PLAYER_COLOR_MODE = 'monochrome';
const DEFAULT_PLAYER_ICON_MODE = 'icons';
const DEFAULT_PLAYER_PROGRESS_BAR = 'regular';
const MAX_REPORTED_PLAYER_LEVEL = 100;
const ENABLE_CLIENT_REPORTED_PLAYER_LEVEL = true;
const ENABLE_CLIENT_REPORTED_TOTAL_INCOME = true;
const ENABLE_CLIENT_RESEARCH_ANNOUNCEMENTS = false;
const ENABLE_CLIENT_POTION_DISCOVERY = true;
const ENABLE_PLAYER_SHOP_EXCHANGE = true;
const ENABLE_NPC_MARKET_PRESSURE = true;
const WORLD_CHAT_UNLOCK_LEVEL = 3;
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
const MAX_MAINTENANCE_MESSAGE_LENGTH = 160;
const MAX_FEEDBACK_BODY_LENGTH = 2000;
const MAX_TRADE_ALLIANCE_MEMBERS = 50;
const MAX_TRADE_ALLIANCE_NAME_LENGTH = 32;
const MIN_TRADE_ALLIANCE_NAME_LENGTH = 3;
const MAX_TRADE_ALLIANCE_DESCRIPTION_LENGTH = 160;
const MAX_TRADE_ALLIANCE_NOTICE_LENGTH = 160;
const MAX_TRADE_ALLIANCE_PENDING_APPLICATIONS = 50;
const MAX_TRADE_ALLIANCE_PENDING_APPLICATIONS_PER_PLAYER = 5;
const MAX_TRADE_ALLIANCE_WEEKLY_QUESTS = 8;
const MAX_TRADE_ALLIANCE_QUEST_TARGET = 1_000_000_000n;
const MAX_TRADE_ALLIANCE_QUEST_CRYSTAL_REWARD = 100;
const TRADE_ALLIANCE_CHAT_HISTORY_LIMIT = 200;
const TRADE_ALLIANCE_REWARD_HISTORY_LIMIT = 80;
const DEFAULT_TRADE_ALLIANCE_TAG_COLOR = 'ink';
const WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS = 15n * 1_000_000n;
const WORLD_CHAT_RATE_LIMIT_MAX_MESSAGES = 3;
const WORLD_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES = 8;
const FEEDBACK_RATE_LIMIT_WINDOW_MICROS = 10n * 60n * 1_000_000n;
const FEEDBACK_RATE_LIMIT_MAX_MESSAGES = 5;
const MAX_RESEARCH_NAME_LENGTH = 80;
const MAX_RESEARCH_ID_LENGTH = 96;
const MAX_RESEARCH_LABEL_LENGTH = 80;
const MAX_RESEARCH_GROUP_ID_LENGTH = 32;
const MAX_MAINTENANCE_KEY_LENGTH = 96;
const WORLD_CHAT_HISTORY_LIMIT = 200;
const PLAYER_SHOP_TRADE_HISTORY_LIMIT = 80;
const MAX_PLAYER_SHOP_SLOTS = 5;
const MAX_PLAYER_SHOP_LISTING_QUANTITY = 1_000;
const MAX_PLAYER_SHOP_PRICE_GOLD = 1_000_000;
const POTION_DISCOVERY_PASSIVE_GOLD_BPS = 500;
const MAX_PLAYER_SHOP_TRADE_TOTAL_GOLD = 10_000_000;
const MAX_PLAYER_SHOP_PROCEEDS_GOLD = 50_000_000;
const GOLD_PRICE_SCALE = 100;
const MAX_ITEM_KEY_LENGTH = 64;
const MAX_ITEM_LABEL_LENGTH = 80;
const MAX_ITEM_KIND_LENGTH = 24;
const NPC_MARKET_BUY_BPS = 8_000;
const NPC_MARKET_SELL_BPS = 12_000;
const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;
const NPC_MARKET_MAX_BASE_PRICE_GOLD = 1_000_000_000;
const NPC_MARKET_MAX_TARGET_STOCK = 10_000_000n;
const NPC_MARKET_MAX_VOLATILITY_BPS = 10_000n;
const NPC_MARKET_DEFAULT_CUSTOM_TARGET_STOCK = 100n;
const NPC_MARKET_DEFAULT_CUSTOM_VOLATILITY_BPS = 800n;
const NPC_MARKET_SOFTNESS_BPS = 1_500;
const NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MICROS = 2n * 60n * 60n * 1_000_000n;
const NPC_MARKET_AUTO_TUNE_WINDOW_BPS = 500n;
const NPC_MARKET_AUTO_TUNE_MIN_SIGNAL_QUANTITY = 10n;
const NPC_MARKET_AUTO_TUNE_MAX_STEP_BPS = 250;
const MAX_RESEARCH_COST_GOLD = 1_000_000_000n;
const MAX_RESEARCH_DURATION_SECONDS = 10n * 60n;
const MAX_GAME_CONFIG_KEY_LENGTH = 48;
const MAX_GAME_CONFIG_JSON_LENGTH = 80_000;
const MAX_GAME_CONFIG_LEVELS = 100;
const MAX_GAME_CONFIG_TASKS_PER_LEVEL = 5;
const MAX_GAME_CONFIG_TASK_QUANTITY = 1_000_000;
const MAX_GAME_CONFIG_RESOURCE_LIMIT = 1_000_000;
const MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH = 250_000;
const MAX_PLAYER_SAVE_LOG_ENTRIES = 100;
const MAX_PLAYER_SAVE_LOG_MESSAGE_LENGTH = 240;
const MAX_PLAYER_SAVE_ITEM_STACKS = 400;
const MAX_PLAYER_SAVE_ITEM_QUANTITY = 10_000;
const MAX_PLAYER_SAVE_CAULDRONS = 20;
const MAX_PLAYER_SAVE_MANA_CURRENT = 5_000;
const MAX_PLAYER_SAVE_MANA_PER_SECOND = 100;
const MAX_PLAYER_SAVE_CURRENT_GOLD = 250_000;
const MAX_PLAYER_SAVE_CURRENT_CRYSTAL = 100;
const MAX_PLAYER_SAVE_CURRENT_RUBY = 10_000;
const MAX_PLAYER_SAVE_TIMER_MS = MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000;
const MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD = 1_000_000_000;
const MAX_PLAYER_SAVE_SHOP_GOLD_OFFER_COOLDOWN_SECONDS = 2 * 60 * 60;
const LEADERBOARD_SUMMARY_LIMIT = 100;
const LEADERBOARD_TOTAL_INCOME_CAP_PER_LEVEL = 10_000_000n;
const PERIOD_DAY_MICROS = 86_400_000_000n;
const PERIOD_WEEK_DAYS = 7n;
const PERIOD_MONTH_DAYS = 30n;
const PERIOD_LOOP_ANCHOR_MICROS = 1_780_876_800_000_000n; // 2026-06-08 00:00 UTC, Armenia 04:00.
const PLAYER_DATA_RESET_GUARD_MICROS = 1_781_298_268_808_000n;
const STARTUP_MAINTENANCE_STATE_KEY = 'startup-maintenance:direct-sell-stands-v2';
const RESERVED_USERNAMES = new Set(['admin', 'system']);
const MAINTENANCE_MODE_OFF = 'off';
const MAINTENANCE_MODE_DRAIN = 'drain';
const MAINTENANCE_MODE_LOCKED = 'locked';
const MAINTENANCE_MODES = new Set([
  MAINTENANCE_MODE_OFF,
  MAINTENANCE_MODE_DRAIN,
  MAINTENANCE_MODE_LOCKED,
]);
const PLAYER_THEMES = new Set(['white', 'black', 'midnight', 'witchcraft']);
const TRADE_ALLIANCE_TAG_COLORS = new Set([
  'ink',
  'red',
  'amber',
  'green',
  'teal',
  'blue',
  'violet',
  'magenta',
  'brown',
  'slate',
]);
const PLAYER_THEME_ALIASES = new Map([
  ['mild-white', 'white'],
  ['mild-black', 'black'],
  ['dark-gray', 'black'],
  ['night-black', 'black'],
  ['vs-code-midnight', 'midnight'],
  ['vscode-midnight', 'midnight'],
  ['idle-witch-craft', 'witchcraft'],
  ['idle witch craft', 'witchcraft'],
  ['idle-whitch-craft', 'witchcraft'],
  ['idle whitch craft', 'witchcraft'],
]);
const PLAYER_FONTS = new Set(['lexend', 'comic-sans-mono']);
const PLAYER_FONT_ALIASES = new Map([
  ['comic sans mono', 'comic-sans-mono'],
  ['comic-mono', 'comic-sans-mono'],
  ['google-lexend', 'lexend'],
]);
const PLAYER_COLOR_MODES = new Set(['monochrome', 'resources']);
const PLAYER_ICON_MODES = new Set(['none', 'icons']);
const PLAYER_PROGRESS_BARS = new Set(['regular', 'gradient']);
const DEFAULT_SAVE_COMPLETED_RESEARCH_IDS = new Set(['unlockSeed:sageSeed']);
const TRADE_ALLIANCE_JOIN_MODES = new Set(['open', 'apply', 'closed']);
const TRADE_ALLIANCE_QUEST_TYPE_INCOME = 'allianceIncome';
const TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL = 'itemFill';
const TRADE_ALLIANCE_ITEM_FILL_PREFIX = 'itemFill:';
const MAX_TRADE_ALLIANCE_ITEM_FILL_QUANTITY = 10_000;
const TRADE_ALLIANCE_ROLE_TRADE_MASTER = 'tradeMaster';
const TRADE_ALLIANCE_ROLE_QUARTERMASTER = 'quartermaster';
const TRADE_ALLIANCE_ROLE_FACTOR = 'factor';
const TRADE_ALLIANCE_ROLE_BROKER = 'broker';
const TRADE_ALLIANCE_ROLE_TRADER = 'trader';
const TRADE_ALLIANCE_ROLES = [
  TRADE_ALLIANCE_ROLE_TRADE_MASTER,
  TRADE_ALLIANCE_ROLE_QUARTERMASTER,
  TRADE_ALLIANCE_ROLE_FACTOR,
  TRADE_ALLIANCE_ROLE_BROKER,
  TRADE_ALLIANCE_ROLE_TRADER,
] as const;
const TRADE_ALLIANCE_ROLE_SET = new Set<string>(TRADE_ALLIANCE_ROLES);
const TRADE_ALLIANCE_ROLE_POWER = new Map<string, number>([
  [TRADE_ALLIANCE_ROLE_TRADE_MASTER, 5],
  [TRADE_ALLIANCE_ROLE_QUARTERMASTER, 4],
  [TRADE_ALLIANCE_ROLE_FACTOR, 3],
  [TRADE_ALLIANCE_ROLE_BROKER, 2],
  [TRADE_ALLIANCE_ROLE_TRADER, 1],
]);
const TRADE_ALLIANCE_ROLE_CAPS = new Map<string, number>([
  [TRADE_ALLIANCE_ROLE_TRADE_MASTER, 1],
  [TRADE_ALLIANCE_ROLE_QUARTERMASTER, 2],
  [TRADE_ALLIANCE_ROLE_FACTOR, 5],
  [TRADE_ALLIANCE_ROLE_BROKER, 10],
  [TRADE_ALLIANCE_ROLE_TRADER, MAX_TRADE_ALLIANCE_MEMBERS],
]);

// Fill this with owner SpacetimeDB identity hex strings before publishing a fresh DB.
// Legacy npc_market_admin rows are audit/display only; they are not authorization.
const NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST: string[] = [
  'c20034d8b5052c22876c7a357fe1e1e891ad5cb48c0c09651d92813edc2bba17',
];
const npcMarketAdminIdentityAllowlist = new Set(
  NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST.map((identityHex) =>
    normalizeIdentityHex(identityHex),
  ).filter(Boolean),
);

const DEFAULT_TASKS_CONFIG = {
  "levels": [
    {
      "level": 1,
      "completionCostGold": 10,
      "tasks": [
        {
          "id": "level1-sage-seeds",
          "itemKey": "sageSeed",
          "quantity": 5
        }
      ]
    },
    {
      "level": 2,
      "completionCostGold": 40,
      "tasks": [
        {
          "id": "level2-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 3
        },
        {
          "id": "level2-sage-seeds",
          "itemKey": "sageSeed",
          "quantity": 10
        }
      ]
    },
    {
      "level": 3,
      "completionCostGold": 90,
      "tasks": [
        {
          "id": "level3-sage-seeds",
          "itemKey": "sageSeed",
          "quantity": 40
        },
        {
          "id": "level3-mint-seeds",
          "itemKey": "mintSeed",
          "quantity": 10
        },
        {
          "id": "level3-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 18
        }
      ]
    },
    {
      "level": 4,
      "completionCostGold": 160,
      "tasks": [
        {
          "id": "level4-nettle-seeds",
          "itemKey": "sageSeed",
          "quantity": 50
        },
        {
          "id": "level4-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 40
        },
        {
          "id": "level4-sage-herb",
          "itemKey": "mintHerb",
          "quantity": 20
        },
        {
          "id": "level4-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 5
        }
      ]
    },
    {
      "level": 5,
      "completionCostGold": 250,
      "tasks": [
        {
          "id": "level5-nettle-seeds",
          "itemKey": "mintSeed",
          "quantity": 60
        },
        {
          "id": "level5-lavender-seeds",
          "itemKey": "lavenderHerb",
          "quantity": 48
        },
        {
          "id": "level5-lavender-herb",
          "itemKey": "nettleHerb",
          "quantity": 24
        },
        {
          "id": "level5-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 6
        }
      ]
    },
    {
      "level": 6,
      "completionCostGold": 360,
      "tasks": [
        {
          "id": "level6-nettle-vigor",
          "itemKey": "sageSeed",
          "quantity": 70
        },
        {
          "id": "level6-lavender-seeds",
          "itemKey": "lavenderHerb",
          "quantity": 56
        },
        {
          "id": "level6-lavender-herb",
          "itemKey": "mintHerb",
          "quantity": 28
        },
        {
          "id": "level6-minor-healing-potion",
          "itemKey": "nettleVigor",
          "quantity": 7
        }
      ]
    },
    {
      "level": 7,
      "completionCostGold": 490,
      "tasks": [
        {
          "id": "level7-lavender-seeds",
          "itemKey": "mintSeed",
          "quantity": 80
        },
        {
          "id": "level7-briar-seeds",
          "itemKey": "briarHerb",
          "quantity": 64
        },
        {
          "id": "level7-briar-herb",
          "itemKey": "lavenderHerb",
          "quantity": 32
        },
        {
          "id": "level7-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 8
        }
      ]
    },
    {
      "level": 8,
      "completionCostGold": 640,
      "tasks": [
        {
          "id": "level8-calming-draught",
          "itemKey": "nettleSeed",
          "quantity": 90
        },
        {
          "id": "level8-briar-seeds",
          "itemKey": "briarHerb",
          "quantity": 72
        },
        {
          "id": "level8-briar-herb",
          "itemKey": "lavenderHerb",
          "quantity": 36
        },
        {
          "id": "level8-nettle-vigor",
          "itemKey": "calmingDraught",
          "quantity": 9
        }
      ]
    },
    {
      "level": 9,
      "completionCostGold": 810,
      "tasks": [
        {
          "id": "level9-briar-seeds",
          "itemKey": "lavenderSeed",
          "quantity": 100
        },
        {
          "id": "level9-glowcap-seeds",
          "itemKey": "glowcapHerb",
          "quantity": 80
        },
        {
          "id": "level9-glowcap-herb",
          "itemKey": "briarHerb",
          "quantity": 40
        },
        {
          "id": "level9-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 10
        }
      ]
    },
    {
      "level": 10,
      "completionCostGold": 1000,
      "tasks": [
        {
          "id": "level10-briar-ward",
          "itemKey": "nettleSeed",
          "quantity": 132
        },
        {
          "id": "level10-glowcap-seeds",
          "itemKey": "glowcapHerb",
          "quantity": 99
        },
        {
          "id": "level10-glowcap-herb",
          "itemKey": "lavenderHerb",
          "quantity": 66
        },
        {
          "id": "level10-calming-draught",
          "itemKey": "briarWard",
          "quantity": 11
        },
        {
          "id": "level10-briar-seeds",
          "itemKey": "calmingDraught",
          "quantity": 8
        }
      ]
    },
    {
      "level": 11,
      "completionCostGold": 1210,
      "tasks": [
        {
          "id": "level11-glowcap-seeds",
          "itemKey": "lavenderSeed",
          "quantity": 144
        },
        {
          "id": "level11-mandrake-seeds",
          "itemKey": "mandrakeHerb",
          "quantity": 108
        },
        {
          "id": "level11-mandrake-herb",
          "itemKey": "glowcapHerb",
          "quantity": 72
        },
        {
          "id": "level11-briar-ward",
          "itemKey": "briarWard",
          "quantity": 12
        },
        {
          "id": "level11-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 9
        }
      ]
    },
    {
      "level": 12,
      "completionCostGold": 1440,
      "tasks": [
        {
          "id": "level12-lantern-tonic",
          "itemKey": "lavenderSeed",
          "quantity": 156
        },
        {
          "id": "level12-mandrake-seeds",
          "itemKey": "mandrakeHerb",
          "quantity": 117
        },
        {
          "id": "level12-mandrake-herb",
          "itemKey": "glowcapHerb",
          "quantity": 78
        },
        {
          "id": "level12-briar-ward",
          "itemKey": "lanternTonic",
          "quantity": 13
        },
        {
          "id": "level12-glowcap-seeds",
          "itemKey": "briarWard",
          "quantity": 10
        }
      ]
    },
    {
      "level": 13,
      "completionCostGold": 1690,
      "tasks": [
        {
          "id": "level13-mandrake-seeds",
          "itemKey": "glowcapSeed",
          "quantity": 168
        },
        {
          "id": "level13-sunroot-seeds",
          "itemKey": "sunrootHerb",
          "quantity": 126
        },
        {
          "id": "level13-sunroot-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 84
        },
        {
          "id": "level13-lantern-tonic",
          "itemKey": "lanternTonic",
          "quantity": 14
        },
        {
          "id": "level13-briar-ward",
          "itemKey": "briarWard",
          "quantity": 10
        }
      ]
    },
    {
      "level": 14,
      "completionCostGold": 1960,
      "tasks": [
        {
          "id": "level14-simple-antidote",
          "itemKey": "glowcapSeed",
          "quantity": 180
        },
        {
          "id": "level14-sunroot-seeds",
          "itemKey": "sunrootHerb",
          "quantity": 135
        },
        {
          "id": "level14-sunroot-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 90
        },
        {
          "id": "level14-lantern-tonic",
          "itemKey": "simpleAntidote",
          "quantity": 15
        },
        {
          "id": "level14-mandrake-seeds",
          "itemKey": "lanternTonic",
          "quantity": 11
        }
      ]
    },
    {
      "level": 15,
      "completionCostGold": 2250,
      "tasks": [
        {
          "id": "level15-sunroot-seeds",
          "itemKey": "glowcapSeed",
          "quantity": 192
        },
        {
          "id": "level15-sunroot-herb",
          "itemKey": "sunrootHerb",
          "quantity": 144
        },
        {
          "id": "level15-simple-antidote",
          "itemKey": "mandrakeHerb",
          "quantity": 96
        },
        {
          "id": "level15-lantern-tonic",
          "itemKey": "simpleAntidote",
          "quantity": 16
        },
        {
          "id": "level15-mandrake-seeds",
          "itemKey": "lanternTonic",
          "quantity": 12
        }
      ]
    },
    {
      "level": 16,
      "completionCostGold": 2560,
      "tasks": [
        {
          "id": "level16-sunroot-seeds",
          "itemKey": "mandrakeSeed",
          "quantity": 204
        },
        {
          "id": "level16-moonflower-seeds",
          "itemKey": "moonflowerHerb",
          "quantity": 153
        },
        {
          "id": "level16-moonflower-herb",
          "itemKey": "sunrootHerb",
          "quantity": 102
        },
        {
          "id": "level16-venom-draught",
          "itemKey": "venomDraught",
          "quantity": 17
        },
        {
          "id": "level16-simple-antidote",
          "itemKey": "simpleAntidote",
          "quantity": 12
        }
      ]
    },
    {
      "level": 17,
      "completionCostGold": 2890,
      "tasks": [
        {
          "id": "level17-moonflower-seeds",
          "itemKey": "mandrakeSeed",
          "quantity": 216
        },
        {
          "id": "level17-moonflower-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 162
        },
        {
          "id": "level17-venom-draught",
          "itemKey": "sunrootHerb",
          "quantity": 108
        },
        {
          "id": "level17-simple-antidote",
          "itemKey": "venomDraught",
          "quantity": 18
        },
        {
          "id": "level17-sunroot-seeds",
          "itemKey": "simpleAntidote",
          "quantity": 13
        }
      ]
    },
    {
      "level": 18,
      "completionCostGold": 3240,
      "tasks": [
        {
          "id": "level18-healing-potion",
          "itemKey": "mandrakeSeed",
          "quantity": 228
        },
        {
          "id": "level18-moonflower-seeds",
          "itemKey": "moonflowerHerb",
          "quantity": 171
        },
        {
          "id": "level18-moonflower-herb",
          "itemKey": "sunrootHerb",
          "quantity": 114
        },
        {
          "id": "level18-venom-draught",
          "itemKey": "healingPotion",
          "quantity": 19
        },
        {
          "id": "level18-sunroot-seeds",
          "itemKey": "venomDraught",
          "quantity": 14
        }
      ]
    },
    {
      "level": 19,
      "completionCostGold": 3610,
      "tasks": [
        {
          "id": "level19-moonflower-seeds",
          "itemKey": "sunrootSeed",
          "quantity": 240
        },
        {
          "id": "level19-frostmoss-seeds",
          "itemKey": "frostmossHerb",
          "quantity": 180
        },
        {
          "id": "level19-frostmoss-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 120
        },
        {
          "id": "level19-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 20
        },
        {
          "id": "level19-venom-draught",
          "itemKey": "venomDraught",
          "quantity": 14
        }
      ]
    },
    {
      "level": 20,
      "completionCostGold": 4000,
      "tasks": [
        {
          "id": "level20-sunroot-stamina",
          "itemKey": "mandrakeSeed",
          "quantity": 252
        },
        {
          "id": "level20-frostmoss-seeds",
          "itemKey": "frostmossHerb",
          "quantity": 189
        },
        {
          "id": "level20-frostmoss-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 126
        },
        {
          "id": "level20-healing-potion",
          "itemKey": "sunrootStamina",
          "quantity": 21
        },
        {
          "id": "level20-moonflower-seeds",
          "itemKey": "healingPotion",
          "quantity": 15
        }
      ]
    },
    {
      "level": 21,
      "completionCostGold": 4410,
      "tasks": [
        {
          "id": "level21-frostmoss-seeds",
          "itemKey": "mandrakeSeed",
          "quantity": 264
        },
        {
          "id": "level21-frostmoss-herb",
          "itemKey": "frostmossHerb",
          "quantity": 198
        },
        {
          "id": "level21-sunroot-stamina",
          "itemKey": "moonflowerHerb",
          "quantity": 132
        },
        {
          "id": "level21-healing-potion",
          "itemKey": "sunrootStamina",
          "quantity": 22
        },
        {
          "id": "level21-moonflower-seeds",
          "itemKey": "healingPotion",
          "quantity": 16
        }
      ]
    },
    {
      "level": 22,
      "completionCostGold": 4840,
      "tasks": [
        {
          "id": "level22-frostmoss-seeds",
          "itemKey": "moonflowerSeed",
          "quantity": 276
        },
        {
          "id": "level22-dreambell-seeds",
          "itemKey": "dreambellHerb",
          "quantity": 207
        },
        {
          "id": "level22-dreambell-herb",
          "itemKey": "frostmossHerb",
          "quantity": 138
        },
        {
          "id": "level22-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 23
        },
        {
          "id": "level22-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 17
        }
      ]
    },
    {
      "level": 23,
      "completionCostGold": 5290,
      "tasks": [
        {
          "id": "level23-moonlit-focus",
          "itemKey": "moonflowerSeed",
          "quantity": 288
        },
        {
          "id": "level23-dreambell-seeds",
          "itemKey": "dreambellHerb",
          "quantity": 216
        },
        {
          "id": "level23-dreambell-herb",
          "itemKey": "frostmossHerb",
          "quantity": 144
        },
        {
          "id": "level23-sunroot-stamina",
          "itemKey": "moonlitFocus",
          "quantity": 24
        },
        {
          "id": "level23-frostmoss-seeds",
          "itemKey": "sunrootStamina",
          "quantity": 17
        }
      ]
    },
    {
      "level": 24,
      "completionCostGold": 5760,
      "tasks": [
        {
          "id": "level24-dreambell-seeds",
          "itemKey": "moonflowerSeed",
          "quantity": 300
        },
        {
          "id": "level24-dreambell-herb",
          "itemKey": "dreambellHerb",
          "quantity": 225
        },
        {
          "id": "level24-moonlit-focus",
          "itemKey": "frostmossHerb",
          "quantity": 150
        },
        {
          "id": "level24-sunroot-stamina",
          "itemKey": "moonlitFocus",
          "quantity": 25
        },
        {
          "id": "level24-frostmoss-seeds",
          "itemKey": "sunrootStamina",
          "quantity": 18
        }
      ]
    },
    {
      "level": 25,
      "completionCostGold": 6250,
      "tasks": [
        {
          "id": "level25-dreambell-seeds",
          "itemKey": "frostmossSeed",
          "quantity": 312
        },
        {
          "id": "level25-star-anise-seeds",
          "itemKey": "starAniseHerb",
          "quantity": 234
        },
        {
          "id": "level25-star-anise-herb",
          "itemKey": "dreambellHerb",
          "quantity": 156
        },
        {
          "id": "level25-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 26
        },
        {
          "id": "level25-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 19
        }
      ]
    },
    {
      "level": 26,
      "completionCostGold": 6760,
      "tasks": [
        {
          "id": "level26-frostmoss-cleanse",
          "itemKey": "moonflowerSeed",
          "quantity": 324
        },
        {
          "id": "level26-star-anise-seeds",
          "itemKey": "starAniseHerb",
          "quantity": 243
        },
        {
          "id": "level26-star-anise-herb",
          "itemKey": "dreambellHerb",
          "quantity": 162
        },
        {
          "id": "level26-moonlit-focus",
          "itemKey": "frostmossCleanse",
          "quantity": 27
        },
        {
          "id": "level26-dreambell-seeds",
          "itemKey": "moonlitFocus",
          "quantity": 19
        }
      ]
    },
    {
      "level": 27,
      "completionCostGold": 7290,
      "tasks": [
        {
          "id": "level27-star-anise-seeds",
          "itemKey": "moonflowerSeed",
          "quantity": 336
        },
        {
          "id": "level27-star-anise-herb",
          "itemKey": "starAniseHerb",
          "quantity": 252
        },
        {
          "id": "level27-frostmoss-cleanse",
          "itemKey": "dreambellHerb",
          "quantity": 168
        },
        {
          "id": "level27-moonlit-focus",
          "itemKey": "frostmossCleanse",
          "quantity": 28
        },
        {
          "id": "level27-dreambell-seeds",
          "itemKey": "moonlitFocus",
          "quantity": 20
        }
      ]
    },
    {
      "level": 28,
      "completionCostGold": 7840,
      "tasks": [
        {
          "id": "level28-star-anise-seeds",
          "itemKey": "dreambellSeed",
          "quantity": 348
        },
        {
          "id": "level28-bloodrose-seeds",
          "itemKey": "bloodroseHerb",
          "quantity": 261
        },
        {
          "id": "level28-bloodrose-herb",
          "itemKey": "starAniseHerb",
          "quantity": 174
        },
        {
          "id": "level28-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 29
        },
        {
          "id": "level28-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 21
        }
      ]
    },
    {
      "level": 29,
      "completionCostGold": 8410,
      "tasks": [
        {
          "id": "level29-sleep-draught",
          "itemKey": "dreambellSeed",
          "quantity": 360
        },
        {
          "id": "level29-bloodrose-seeds",
          "itemKey": "bloodroseHerb",
          "quantity": 270
        },
        {
          "id": "level29-bloodrose-herb",
          "itemKey": "starAniseHerb",
          "quantity": 180
        },
        {
          "id": "level29-frostmoss-cleanse",
          "itemKey": "sleepDraught",
          "quantity": 30
        },
        {
          "id": "level29-star-anise-seeds",
          "itemKey": "frostmossCleanse",
          "quantity": 21
        }
      ]
    },
    {
      "level": 30,
      "completionCostGold": 9000,
      "tasks": [
        {
          "id": "level30-bloodrose-seeds",
          "itemKey": "dreambellSeed",
          "quantity": 465
        },
        {
          "id": "level30-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 341
        },
        {
          "id": "level30-sleep-draught",
          "itemKey": "starAniseHerb",
          "quantity": 248
        },
        {
          "id": "level30-frostmoss-cleanse",
          "itemKey": "sleepDraught",
          "quantity": 38
        },
        {
          "id": "level30-star-anise-seeds",
          "itemKey": "frostmossCleanse",
          "quantity": 31
        }
      ]
    },
    {
      "level": 31,
      "completionCostGold": 9610,
      "tasks": [
        {
          "id": "level31-bloodrose-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 480
        },
        {
          "id": "level31-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 352
        },
        {
          "id": "level31-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 256
        },
        {
          "id": "level31-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 39
        },
        {
          "id": "level31-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 32
        }
      ]
    },
    {
      "level": 32,
      "completionCostGold": 10240,
      "tasks": [
        {
          "id": "level32-elixir-of-life",
          "itemKey": "starAniseSeed",
          "quantity": 495
        },
        {
          "id": "level32-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 363
        },
        {
          "id": "level32-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 264
        },
        {
          "id": "level32-sleep-draught",
          "itemKey": "elixirOfLife",
          "quantity": 40
        },
        {
          "id": "level32-bloodrose-seeds",
          "itemKey": "sleepDraught",
          "quantity": 33
        }
      ]
    },
    {
      "level": 33,
      "completionCostGold": 10890,
      "tasks": [
        {
          "id": "level33-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 510
        },
        {
          "id": "level33-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 374
        },
        {
          "id": "level33-elixir-of-life",
          "itemKey": "bloodroseHerb",
          "quantity": 272
        },
        {
          "id": "level33-sleep-draught",
          "itemKey": "elixirOfLife",
          "quantity": 41
        },
        {
          "id": "level33-bloodrose-seeds",
          "itemKey": "sleepDraught",
          "quantity": 34
        }
      ]
    },
    {
      "level": 34,
      "completionCostGold": 11560,
      "tasks": [
        {
          "id": "level34-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 525
        },
        {
          "id": "level34-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 385
        },
        {
          "id": "level34-elixir-of-life",
          "itemKey": "bloodroseHerb",
          "quantity": 280
        },
        {
          "id": "level34-sleep-draught",
          "itemKey": "elixirOfLife",
          "quantity": 42
        },
        {
          "id": "level34-bloodrose-seeds",
          "itemKey": "sleepDraught",
          "quantity": 35
        }
      ]
    },
    {
      "level": 35,
      "completionCostGold": 12250,
      "tasks": [
        {
          "id": "level35-star-luck-philtre",
          "itemKey": "starAniseSeed",
          "quantity": 540
        },
        {
          "id": "level35-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 396
        },
        {
          "id": "level35-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 288
        },
        {
          "id": "level35-elixir-of-life",
          "itemKey": "starLuckPhiltre",
          "quantity": 44
        },
        {
          "id": "level35-bloodrose-seeds",
          "itemKey": "elixirOfLife",
          "quantity": 36
        }
      ]
    },
    {
      "level": 36,
      "completionCostGold": 12960,
      "tasks": [
        {
          "id": "level36-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 555
        },
        {
          "id": "level36-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 407
        },
        {
          "id": "level36-star-luck-philtre",
          "itemKey": "bloodroseHerb",
          "quantity": 296
        },
        {
          "id": "level36-elixir-of-life",
          "itemKey": "starLuckPhiltre",
          "quantity": 45
        },
        {
          "id": "level36-bloodrose-seeds",
          "itemKey": "elixirOfLife",
          "quantity": 37
        }
      ]
    },
    {
      "level": 37,
      "completionCostGold": 13690,
      "tasks": [
        {
          "id": "level37-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 570
        },
        {
          "id": "level37-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 418
        },
        {
          "id": "level37-star-luck-philtre",
          "itemKey": "bloodroseHerb",
          "quantity": 304
        },
        {
          "id": "level37-elixir-of-life",
          "itemKey": "starLuckPhiltre",
          "quantity": 46
        },
        {
          "id": "level37-bloodrose-seeds",
          "itemKey": "elixirOfLife",
          "quantity": 38
        }
      ]
    },
    {
      "level": 38,
      "completionCostGold": 14440,
      "tasks": [
        {
          "id": "level38-deep-dream-vision",
          "itemKey": "starAniseSeed",
          "quantity": 585
        },
        {
          "id": "level38-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 429
        },
        {
          "id": "level38-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 312
        },
        {
          "id": "level38-star-luck-philtre",
          "itemKey": "deepDreamVision",
          "quantity": 47
        },
        {
          "id": "level38-bloodrose-seeds",
          "itemKey": "starLuckPhiltre",
          "quantity": 39
        }
      ]
    },
    {
      "level": 39,
      "completionCostGold": 15210,
      "tasks": [
        {
          "id": "level39-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 600
        },
        {
          "id": "level39-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 440
        },
        {
          "id": "level39-deep-dream-vision",
          "itemKey": "bloodroseHerb",
          "quantity": 320
        },
        {
          "id": "level39-star-luck-philtre",
          "itemKey": "deepDreamVision",
          "quantity": 48
        },
        {
          "id": "level39-bloodrose-seeds",
          "itemKey": "starLuckPhiltre",
          "quantity": 40
        }
      ]
    },
    {
      "level": 40,
      "completionCostGold": 16000,
      "tasks": [
        {
          "id": "level40-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 615
        },
        {
          "id": "level40-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 451
        },
        {
          "id": "level40-deep-dream-vision",
          "itemKey": "bloodroseHerb",
          "quantity": 328
        },
        {
          "id": "level40-star-luck-philtre",
          "itemKey": "deepDreamVision",
          "quantity": 50
        },
        {
          "id": "level40-bloodrose-seeds",
          "itemKey": "starLuckPhiltre",
          "quantity": 41
        }
      ]
    },
    {
      "level": 41,
      "completionCostGold": 16810,
      "tasks": [
        {
          "id": "level41-pact-ward",
          "itemKey": "starAniseSeed",
          "quantity": 630
        },
        {
          "id": "level41-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 462
        },
        {
          "id": "level41-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 336
        },
        {
          "id": "level41-deep-dream-vision",
          "itemKey": "pactWard",
          "quantity": 51
        },
        {
          "id": "level41-bloodrose-seeds",
          "itemKey": "deepDreamVision",
          "quantity": 42
        }
      ]
    },
    {
      "level": 42,
      "completionCostGold": 17640,
      "tasks": [
        {
          "id": "level42-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 645
        },
        {
          "id": "level42-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 473
        },
        {
          "id": "level42-pact-ward",
          "itemKey": "bloodroseHerb",
          "quantity": 344
        },
        {
          "id": "level42-deep-dream-vision",
          "itemKey": "pactWard",
          "quantity": 52
        },
        {
          "id": "level42-bloodrose-seeds",
          "itemKey": "deepDreamVision",
          "quantity": 43
        }
      ]
    },
    {
      "level": 43,
      "completionCostGold": 18490,
      "tasks": [
        {
          "id": "level43-dragonpepper-seeds",
          "itemKey": "starAniseSeed",
          "quantity": 660
        },
        {
          "id": "level43-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 484
        },
        {
          "id": "level43-pact-ward",
          "itemKey": "bloodroseHerb",
          "quantity": 352
        },
        {
          "id": "level43-deep-dream-vision",
          "itemKey": "pactWard",
          "quantity": 53
        },
        {
          "id": "level43-bloodrose-seeds",
          "itemKey": "deepDreamVision",
          "quantity": 44
        }
      ]
    },
    {
      "level": 44,
      "completionCostGold": 19360,
      "tasks": [
        {
          "id": "level44-dragon-courage",
          "itemKey": "starAniseSeed",
          "quantity": 675
        },
        {
          "id": "level44-dragonpepper-seeds",
          "itemKey": "dragonpepperHerb",
          "quantity": 495
        },
        {
          "id": "level44-dragonpepper-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 360
        },
        {
          "id": "level44-pact-ward",
          "itemKey": "dragonCourage",
          "quantity": 54
        },
        {
          "id": "level44-bloodrose-seeds",
          "itemKey": "pactWard",
          "quantity": 45
        }
      ]
    },
    {
      "level": 45,
      "completionCostGold": 20250,
      "tasks": [
        {
          "id": "level45-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 690
        },
        {
          "id": "level45-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 506
        },
        {
          "id": "level45-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 368
        },
        {
          "id": "level45-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 56
        },
        {
          "id": "level45-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 46
        }
      ]
    },
    {
      "level": 46,
      "completionCostGold": 21160,
      "tasks": [
        {
          "id": "level46-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 705
        },
        {
          "id": "level46-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 517
        },
        {
          "id": "level46-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 376
        },
        {
          "id": "level46-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 57
        },
        {
          "id": "level46-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 47
        }
      ]
    },
    {
      "level": 47,
      "completionCostGold": 22090,
      "tasks": [
        {
          "id": "level47-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 720
        },
        {
          "id": "level47-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 528
        },
        {
          "id": "level47-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 384
        },
        {
          "id": "level47-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 58
        },
        {
          "id": "level47-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 48
        }
      ]
    },
    {
      "level": 48,
      "completionCostGold": 23040,
      "tasks": [
        {
          "id": "level48-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 735
        },
        {
          "id": "level48-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 539
        },
        {
          "id": "level48-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 392
        },
        {
          "id": "level48-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 59
        },
        {
          "id": "level48-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 49
        }
      ]
    },
    {
      "level": 49,
      "completionCostGold": 24010,
      "tasks": [
        {
          "id": "level49-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 750
        },
        {
          "id": "level49-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 550
        },
        {
          "id": "level49-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 400
        },
        {
          "id": "level49-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 60
        },
        {
          "id": "level49-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 50
        }
      ]
    },
    {
      "level": 50,
      "completionCostGold": 25000,
      "tasks": [
        {
          "id": "level50-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 765
        },
        {
          "id": "level50-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 561
        },
        {
          "id": "level50-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 408
        },
        {
          "id": "level50-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 62
        },
        {
          "id": "level50-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 51
        }
      ]
    },
    {
      "level": 51,
      "completionCostGold": 26010,
      "tasks": [
        {
          "id": "level51-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 780
        },
        {
          "id": "level51-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 572
        },
        {
          "id": "level51-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 416
        },
        {
          "id": "level51-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 63
        },
        {
          "id": "level51-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 52
        }
      ]
    },
    {
      "level": 52,
      "completionCostGold": 27040,
      "tasks": [
        {
          "id": "level52-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 795
        },
        {
          "id": "level52-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 583
        },
        {
          "id": "level52-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 424
        },
        {
          "id": "level52-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 64
        },
        {
          "id": "level52-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 53
        }
      ]
    },
    {
      "level": 53,
      "completionCostGold": 28090,
      "tasks": [
        {
          "id": "level53-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 810
        },
        {
          "id": "level53-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 594
        },
        {
          "id": "level53-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 432
        },
        {
          "id": "level53-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 65
        },
        {
          "id": "level53-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 54
        }
      ]
    },
    {
      "level": 54,
      "completionCostGold": 29160,
      "tasks": [
        {
          "id": "level54-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 825
        },
        {
          "id": "level54-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 605
        },
        {
          "id": "level54-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 440
        },
        {
          "id": "level54-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 66
        },
        {
          "id": "level54-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 55
        }
      ]
    },
    {
      "level": 55,
      "completionCostGold": 30250,
      "tasks": [
        {
          "id": "level55-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 840
        },
        {
          "id": "level55-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 616
        },
        {
          "id": "level55-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 448
        },
        {
          "id": "level55-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 68
        },
        {
          "id": "level55-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 56
        }
      ]
    },
    {
      "level": 56,
      "completionCostGold": 31360,
      "tasks": [
        {
          "id": "level56-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 855
        },
        {
          "id": "level56-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 627
        },
        {
          "id": "level56-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 456
        },
        {
          "id": "level56-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 69
        },
        {
          "id": "level56-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 57
        }
      ]
    },
    {
      "level": 57,
      "completionCostGold": 32490,
      "tasks": [
        {
          "id": "level57-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 870
        },
        {
          "id": "level57-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 638
        },
        {
          "id": "level57-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 464
        },
        {
          "id": "level57-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 70
        },
        {
          "id": "level57-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 58
        }
      ]
    },
    {
      "level": 58,
      "completionCostGold": 33640,
      "tasks": [
        {
          "id": "level58-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 885
        },
        {
          "id": "level58-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 649
        },
        {
          "id": "level58-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 472
        },
        {
          "id": "level58-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 71
        },
        {
          "id": "level58-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 59
        }
      ]
    },
    {
      "level": 59,
      "completionCostGold": 34810,
      "tasks": [
        {
          "id": "level59-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 900
        },
        {
          "id": "level59-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 660
        },
        {
          "id": "level59-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 480
        },
        {
          "id": "level59-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 72
        },
        {
          "id": "level59-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 60
        }
      ]
    },
    {
      "level": 60,
      "completionCostGold": 36000,
      "tasks": [
        {
          "id": "level60-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1098
        },
        {
          "id": "level60-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 854
        },
        {
          "id": "level60-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 610
        },
        {
          "id": "level60-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 92
        },
        {
          "id": "level60-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 74
        }
      ]
    },
    {
      "level": 61,
      "completionCostGold": 37210,
      "tasks": [
        {
          "id": "level61-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1116
        },
        {
          "id": "level61-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 868
        },
        {
          "id": "level61-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 620
        },
        {
          "id": "level61-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 93
        },
        {
          "id": "level61-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 75
        }
      ]
    },
    {
      "level": 62,
      "completionCostGold": 38440,
      "tasks": [
        {
          "id": "level62-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1134
        },
        {
          "id": "level62-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 882
        },
        {
          "id": "level62-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 630
        },
        {
          "id": "level62-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 95
        },
        {
          "id": "level62-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 76
        }
      ]
    },
    {
      "level": 63,
      "completionCostGold": 39690,
      "tasks": [
        {
          "id": "level63-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1152
        },
        {
          "id": "level63-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 896
        },
        {
          "id": "level63-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 640
        },
        {
          "id": "level63-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 96
        },
        {
          "id": "level63-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 77
        }
      ]
    },
    {
      "level": 64,
      "completionCostGold": 40960,
      "tasks": [
        {
          "id": "level64-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1170
        },
        {
          "id": "level64-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 910
        },
        {
          "id": "level64-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 650
        },
        {
          "id": "level64-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 98
        },
        {
          "id": "level64-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 78
        }
      ]
    },
    {
      "level": 65,
      "completionCostGold": 42250,
      "tasks": [
        {
          "id": "level65-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1188
        },
        {
          "id": "level65-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 924
        },
        {
          "id": "level65-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 660
        },
        {
          "id": "level65-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 99
        },
        {
          "id": "level65-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 80
        }
      ]
    },
    {
      "level": 66,
      "completionCostGold": 43560,
      "tasks": [
        {
          "id": "level66-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1206
        },
        {
          "id": "level66-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 938
        },
        {
          "id": "level66-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 670
        },
        {
          "id": "level66-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 101
        },
        {
          "id": "level66-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 81
        }
      ]
    },
    {
      "level": 67,
      "completionCostGold": 44890,
      "tasks": [
        {
          "id": "level67-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1224
        },
        {
          "id": "level67-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 952
        },
        {
          "id": "level67-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 680
        },
        {
          "id": "level67-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 102
        },
        {
          "id": "level67-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 82
        }
      ]
    },
    {
      "level": 68,
      "completionCostGold": 46240,
      "tasks": [
        {
          "id": "level68-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1242
        },
        {
          "id": "level68-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 966
        },
        {
          "id": "level68-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 690
        },
        {
          "id": "level68-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 104
        },
        {
          "id": "level68-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 83
        }
      ]
    },
    {
      "level": 69,
      "completionCostGold": 47610,
      "tasks": [
        {
          "id": "level69-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1260
        },
        {
          "id": "level69-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 980
        },
        {
          "id": "level69-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 700
        },
        {
          "id": "level69-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 105
        },
        {
          "id": "level69-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 84
        }
      ]
    },
    {
      "level": 70,
      "completionCostGold": 49000,
      "tasks": [
        {
          "id": "level70-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1278
        },
        {
          "id": "level70-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 994
        },
        {
          "id": "level70-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 710
        },
        {
          "id": "level70-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 107
        },
        {
          "id": "level70-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 86
        }
      ]
    },
    {
      "level": 71,
      "completionCostGold": 50410,
      "tasks": [
        {
          "id": "level71-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1296
        },
        {
          "id": "level71-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1008
        },
        {
          "id": "level71-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 720
        },
        {
          "id": "level71-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 108
        },
        {
          "id": "level71-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 87
        }
      ]
    },
    {
      "level": 72,
      "completionCostGold": 51840,
      "tasks": [
        {
          "id": "level72-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1314
        },
        {
          "id": "level72-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1022
        },
        {
          "id": "level72-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 730
        },
        {
          "id": "level72-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 110
        },
        {
          "id": "level72-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 88
        }
      ]
    },
    {
      "level": 73,
      "completionCostGold": 53290,
      "tasks": [
        {
          "id": "level73-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1332
        },
        {
          "id": "level73-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1036
        },
        {
          "id": "level73-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 740
        },
        {
          "id": "level73-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 111
        },
        {
          "id": "level73-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 89
        }
      ]
    },
    {
      "level": 74,
      "completionCostGold": 54760,
      "tasks": [
        {
          "id": "level74-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1350
        },
        {
          "id": "level74-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1050
        },
        {
          "id": "level74-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 750
        },
        {
          "id": "level74-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 113
        },
        {
          "id": "level74-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 90
        }
      ]
    },
    {
      "level": 75,
      "completionCostGold": 56250,
      "tasks": [
        {
          "id": "level75-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1368
        },
        {
          "id": "level75-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1064
        },
        {
          "id": "level75-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 760
        },
        {
          "id": "level75-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 114
        },
        {
          "id": "level75-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 92
        }
      ]
    },
    {
      "level": 76,
      "completionCostGold": 57760,
      "tasks": [
        {
          "id": "level76-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1386
        },
        {
          "id": "level76-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1078
        },
        {
          "id": "level76-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 770
        },
        {
          "id": "level76-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 116
        },
        {
          "id": "level76-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 93
        }
      ]
    },
    {
      "level": 77,
      "completionCostGold": 59290,
      "tasks": [
        {
          "id": "level77-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1404
        },
        {
          "id": "level77-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1092
        },
        {
          "id": "level77-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 780
        },
        {
          "id": "level77-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 117
        },
        {
          "id": "level77-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 94
        }
      ]
    },
    {
      "level": 78,
      "completionCostGold": 60840,
      "tasks": [
        {
          "id": "level78-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1422
        },
        {
          "id": "level78-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1106
        },
        {
          "id": "level78-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 790
        },
        {
          "id": "level78-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 119
        },
        {
          "id": "level78-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 95
        }
      ]
    },
    {
      "level": 79,
      "completionCostGold": 62410,
      "tasks": [
        {
          "id": "level79-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1440
        },
        {
          "id": "level79-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1120
        },
        {
          "id": "level79-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 800
        },
        {
          "id": "level79-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 120
        },
        {
          "id": "level79-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 96
        }
      ]
    },
    {
      "level": 80,
      "completionCostGold": 64000,
      "tasks": [
        {
          "id": "level80-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1782
        },
        {
          "id": "level80-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1377
        },
        {
          "id": "level80-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1053
        },
        {
          "id": "level80-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 162
        },
        {
          "id": "level80-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 122
        }
      ]
    },
    {
      "level": 81,
      "completionCostGold": 65610,
      "tasks": [
        {
          "id": "level81-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1804
        },
        {
          "id": "level81-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1394
        },
        {
          "id": "level81-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1066
        },
        {
          "id": "level81-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 164
        },
        {
          "id": "level81-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 123
        }
      ]
    },
    {
      "level": 82,
      "completionCostGold": 67240,
      "tasks": [
        {
          "id": "level82-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1826
        },
        {
          "id": "level82-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1411
        },
        {
          "id": "level82-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1079
        },
        {
          "id": "level82-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 166
        },
        {
          "id": "level82-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 125
        }
      ]
    },
    {
      "level": 83,
      "completionCostGold": 68890,
      "tasks": [
        {
          "id": "level83-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1848
        },
        {
          "id": "level83-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1428
        },
        {
          "id": "level83-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1092
        },
        {
          "id": "level83-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 168
        },
        {
          "id": "level83-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 126
        }
      ]
    },
    {
      "level": 84,
      "completionCostGold": 70560,
      "tasks": [
        {
          "id": "level84-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1870
        },
        {
          "id": "level84-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1445
        },
        {
          "id": "level84-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1105
        },
        {
          "id": "level84-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 170
        },
        {
          "id": "level84-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 128
        }
      ]
    },
    {
      "level": 85,
      "completionCostGold": 72250,
      "tasks": [
        {
          "id": "level85-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1892
        },
        {
          "id": "level85-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1462
        },
        {
          "id": "level85-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1118
        },
        {
          "id": "level85-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 172
        },
        {
          "id": "level85-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 129
        }
      ]
    },
    {
      "level": 86,
      "completionCostGold": 73960,
      "tasks": [
        {
          "id": "level86-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1914
        },
        {
          "id": "level86-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1479
        },
        {
          "id": "level86-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1131
        },
        {
          "id": "level86-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 174
        },
        {
          "id": "level86-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 131
        }
      ]
    },
    {
      "level": 87,
      "completionCostGold": 75690,
      "tasks": [
        {
          "id": "level87-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1936
        },
        {
          "id": "level87-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1496
        },
        {
          "id": "level87-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1144
        },
        {
          "id": "level87-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 176
        },
        {
          "id": "level87-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 132
        }
      ]
    },
    {
      "level": 88,
      "completionCostGold": 77440,
      "tasks": [
        {
          "id": "level88-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1958
        },
        {
          "id": "level88-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1513
        },
        {
          "id": "level88-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1157
        },
        {
          "id": "level88-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 178
        },
        {
          "id": "level88-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 134
        }
      ]
    },
    {
      "level": 89,
      "completionCostGold": 79210,
      "tasks": [
        {
          "id": "level89-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 1980
        },
        {
          "id": "level89-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1530
        },
        {
          "id": "level89-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1170
        },
        {
          "id": "level89-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 180
        },
        {
          "id": "level89-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 135
        }
      ]
    },
    {
      "level": 90,
      "completionCostGold": 81000,
      "tasks": [
        {
          "id": "level90-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2002
        },
        {
          "id": "level90-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1547
        },
        {
          "id": "level90-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1183
        },
        {
          "id": "level90-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 182
        },
        {
          "id": "level90-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 137
        }
      ]
    },
    {
      "level": 91,
      "completionCostGold": 82810,
      "tasks": [
        {
          "id": "level91-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2024
        },
        {
          "id": "level91-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1564
        },
        {
          "id": "level91-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1196
        },
        {
          "id": "level91-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 184
        },
        {
          "id": "level91-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 138
        }
      ]
    },
    {
      "level": 92,
      "completionCostGold": 84640,
      "tasks": [
        {
          "id": "level92-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2046
        },
        {
          "id": "level92-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1581
        },
        {
          "id": "level92-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1209
        },
        {
          "id": "level92-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 186
        },
        {
          "id": "level92-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 140
        }
      ]
    },
    {
      "level": 93,
      "completionCostGold": 86490,
      "tasks": [
        {
          "id": "level93-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2068
        },
        {
          "id": "level93-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1598
        },
        {
          "id": "level93-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1222
        },
        {
          "id": "level93-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 188
        },
        {
          "id": "level93-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 141
        }
      ]
    },
    {
      "level": 94,
      "completionCostGold": 88360,
      "tasks": [
        {
          "id": "level94-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2090
        },
        {
          "id": "level94-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1615
        },
        {
          "id": "level94-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1235
        },
        {
          "id": "level94-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 190
        },
        {
          "id": "level94-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 143
        }
      ]
    },
    {
      "level": 95,
      "completionCostGold": 90250,
      "tasks": [
        {
          "id": "level95-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2112
        },
        {
          "id": "level95-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1632
        },
        {
          "id": "level95-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1248
        },
        {
          "id": "level95-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 192
        },
        {
          "id": "level95-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 144
        }
      ]
    },
    {
      "level": 96,
      "completionCostGold": 92160,
      "tasks": [
        {
          "id": "level96-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2134
        },
        {
          "id": "level96-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1649
        },
        {
          "id": "level96-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1261
        },
        {
          "id": "level96-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 194
        },
        {
          "id": "level96-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 146
        }
      ]
    },
    {
      "level": 97,
      "completionCostGold": 94090,
      "tasks": [
        {
          "id": "level97-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2156
        },
        {
          "id": "level97-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1666
        },
        {
          "id": "level97-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1274
        },
        {
          "id": "level97-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 196
        },
        {
          "id": "level97-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 147
        }
      ]
    },
    {
      "level": 98,
      "completionCostGold": 96040,
      "tasks": [
        {
          "id": "level98-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2178
        },
        {
          "id": "level98-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1683
        },
        {
          "id": "level98-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1287
        },
        {
          "id": "level98-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 198
        },
        {
          "id": "level98-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 149
        }
      ]
    },
    {
      "level": 99,
      "completionCostGold": 98010,
      "tasks": [
        {
          "id": "level99-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2200
        },
        {
          "id": "level99-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1700
        },
        {
          "id": "level99-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1300
        },
        {
          "id": "level99-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 200
        },
        {
          "id": "level99-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 150
        }
      ]
    },
    {
      "level": 100,
      "completionCostGold": 100000,
      "tasks": [
        {
          "id": "level100-star-anise--seeds-1",
          "itemKey": "starAniseSeed",
          "quantity": 2200
        },
        {
          "id": "level100-dragonpepper--herb-2",
          "itemKey": "dragonpepperHerb",
          "quantity": 1700
        },
        {
          "id": "level100-bloodrose--herb-3",
          "itemKey": "bloodroseHerb",
          "quantity": 1300
        },
        {
          "id": "level100-dragon-courage-4",
          "itemKey": "dragonCourage",
          "quantity": 200
        },
        {
          "id": "level100-pact-ward-5",
          "itemKey": "pactWard",
          "quantity": 150
        }
      ]
    }
  ]
};
const DEFAULT_TASKS_CONFIG_JSON = JSON.stringify(DEFAULT_TASKS_CONFIG);
const DEFAULT_CURRENT_TASKS_CONFIG_JSON = DEFAULT_TASKS_CONFIG_JSON;
const DEFAULT_PLAYER_LEVEL_CONFIG_JSON = JSON.stringify({
  "maxLevel": 100,
  "mana": {
    "baseMaxManaCap": 50,
    "maxManaCapPerLevel": 50,
    "baseManaPerSecond": 1,
    "manaPerSecondPerLevel": 1
  },
  "crystal": {
    "perLevel": 1
  },
  "milestones": [
    {
      "level": 1,
      "maxGardenTiles": 2,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 2,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 3,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 0,
      "maxPlayerMarketStands": 0
    },
    {
      "level": 4,
      "maxGardenTiles": 3,
      "maxCauldrons": 1,
      "maxNpcMarketStands": 1,
      "maxPlayerMarketStands": 1
    },
    {
      "level": 5,
      "maxGardenTiles": 5,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 8,
      "maxGardenTiles": 7,
      "maxCauldrons": 3,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 10,
      "maxGardenTiles": 8,
      "maxCauldrons": 4,
      "maxNpcMarketStands": 3,
      "maxPlayerMarketStands": 3
    },
    {
      "level": 13,
      "maxGardenTiles": 9,
      "maxCauldrons": 4,
      "maxNpcMarketStands": 4,
      "maxPlayerMarketStands": 4
    },
    {
      "level": 17,
      "maxGardenTiles": 10,
      "maxCauldrons": 5,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    }
  ]
});

const herbCatalog = [
  { key: 'sage', label: 'sage', growthDurationMs: 12_000 },
  { key: 'mint', label: 'mint', growthDurationMs: 25_000 },
  { key: 'nettle', label: 'nettle', growthDurationMs: 30_000 },
  { key: 'lavender', label: 'lavender', growthDurationMs: 40_000 },
  { key: 'briar', label: 'briar', growthDurationMs: 50_000 },
  { key: 'glowcap', label: 'glowcap', growthDurationMs: 60_000 },
  { key: 'mandrake', label: 'mandrake', growthDurationMs: 75_000 },
  { key: 'sunroot', label: 'sunroot', growthDurationMs: 90_000 },
  { key: 'moonflower', label: 'moonflower', growthDurationMs: 105_000 },
  { key: 'frostmoss', label: 'frostmoss', growthDurationMs: 120_000 },
  { key: 'dreambell', label: 'dreambell', growthDurationMs: 135_000 },
  { key: 'starAnise', label: 'star anise', growthDurationMs: 150_000 },
  { key: 'bloodrose', label: 'bloodrose', growthDurationMs: 180_000 },
  { key: 'dragonpepper', label: 'dragonpepper', growthDurationMs: 210_000 },
];

const knownPotionCatalog = [
  { key: 'manaTonic', label: 'mana tonic' },
  { key: 'minorHealingPotion', label: 'minor healing potion' },
  { key: 'nettleVigor', label: 'nettle vigor' },
  { key: 'calmingDraught', label: 'calming draught' },
  { key: 'simpleAntidote', label: 'simple antidote' },
  { key: 'venomDraught', label: 'venom draught' },
  { key: 'briarWard', label: 'briar ward' },
  { key: 'lanternTonic', label: 'lantern tonic' },
  { key: 'healingPotion', label: 'healing potion' },
  { key: 'moonlitFocus', label: 'moonlit focus' },
  { key: 'sunrootStamina', label: 'sunroot stamina' },
  { key: 'frostmossCleanse', label: 'frostmoss cleanse' },
  { key: 'sleepDraught', label: 'sleep draught' },
  { key: 'elixirOfLife', label: 'elixir of life' },
  { key: 'starLuckPhiltre', label: 'star-luck philtre' },
  { key: 'dragonCourage', label: 'dragon courage' },
  { key: 'deepDreamVision', label: 'deep dream vision' },
  { key: 'pactWard', label: 'pact ward' },
];

const knownPotionResearchOrder = [
  'manaTonic',
  'minorHealingPotion',
  'nettleVigor',
  'calmingDraught',
  'briarWard',
  'lanternTonic',
  'simpleAntidote',
  'venomDraught',
  'healingPotion',
  'sunrootStamina',
  'moonlitFocus',
  'frostmossCleanse',
  'sleepDraught',
  'elixirOfLife',
  'starLuckPhiltre',
  'deepDreamVision',
  'pactWard',
  'dragonCourage',
];

const knownPotionCatalogByKey = new Map(
  knownPotionCatalog.map((potion) => [potion.key, potion]),
);
const knownPotionResearchCatalog = knownPotionResearchOrder.flatMap((potionKey) => {
  const potion = knownPotionCatalogByKey.get(potionKey);
  return potion ? [potion] : [];
});

const unknownPotionCatalog = [
  { key: 'ashenMemory', label: 'ashen memory' },
  { key: 'silverleafQuiet', label: 'silverleaf quiet' },
  { key: 'emberSight', label: 'ember sight' },
  { key: 'thornSleep', label: 'thorn sleep' },
  { key: 'glassMoonElixir', label: 'glass moon elixir' },
  { key: 'rootboundResolve', label: 'rootbound resolve' },
  { key: 'nightOrchardTonic', label: 'night orchard tonic' },
  { key: 'starlessCourage', label: 'starless courage' },
  { key: 'frostveinDraught', label: 'frostvein draught' },
  { key: 'bloodlightWard', label: 'bloodlight ward' },
];

const herbMarketBasePriceGoldByKey: Record<string, number> = {
  sage: 8,
  mint: 9,
  nettle: 10,
  lavender: 13,
  briar: 15,
  glowcap: 18,
  mandrake: 22,
  sunroot: 25,
  moonflower: 30,
  frostmoss: 35,
  dreambell: 40,
  starAnise: 45,
  bloodrose: 55,
  dragonpepper: 65,
};

const potionMarketBasePriceGoldByKey: Record<string, number> = {
  manaTonic: 69,
  minorHealingPotion: 75,
  nettleVigor: 82,
  calmingDraught: 94,
  simpleAntidote: 125,
  venomDraught: 157,
  briarWard: 132,
  lanternTonic: 125,
  healingPotion: 113,
  moonlitFocus: 157,
  sunrootStamina: 194,
  frostmossCleanse: 200,
  sleepDraught: 250,
  elixirOfLife: 313,
  starLuckPhiltre: 319,
  dragonCourage: 357,
  deepDreamVision: 457,
  pactWard: 338,
  ashenMemory: 163,
  silverleafQuiet: 163,
  emberSight: 319,
  thornSleep: 194,
  glassMoonElixir: 357,
  rootboundResolve: 219,
  nightOrchardTonic: 307,
  starlessCourage: 407,
  frostveinDraught: 282,
  bloodlightWard: 313,
};

const researchDefaultCostGoldById: Record<string, bigint> = {
  'unlockSeed:sageSeed': 0n,
  'unlockSeed:mintSeed': 25n,
  'unlockSeed:nettleSeed': 120n,
  'unlockSeed:lavenderSeed': 300n,
  'unlockSeed:briarSeed': 650n,
  'unlockSeed:glowcapSeed': 1_200n,
  'unlockSeed:mandrakeSeed': 2_100n,
  'unlockSeed:sunrootSeed': 3_400n,
  'unlockSeed:moonflowerSeed': 5_200n,
  'unlockSeed:frostmossSeed': 7_600n,
  'unlockSeed:dreambellSeed': 11_000n,
  'unlockSeed:starAniseSeed': 15_500n,
  'unlockSeed:bloodroseSeed': 22_000n,
  'unlockSeed:dragonpepperSeed': 32_000n,
  'summonSeedsX2': 600n,
  'summonSeedsX3': 1_800n,
  'summonSeedsX4': 4_500n,
  'summonSeedsX5': 10_000n,
  'unlockRecipe:manaTonic': 0n,
  'unlockRecipe:minorHealingPotion': 350n,
  'unlockRecipe:nettleVigor': 750n,
  'unlockRecipe:calmingDraught': 1_300n,
  'unlockRecipe:briarWard': 2_100n,
  'unlockRecipe:lanternTonic': 3_200n,
  'unlockRecipe:simpleAntidote': 4_700n,
  'unlockRecipe:venomDraught': 6_800n,
  'unlockRecipe:healingPotion': 9_500n,
  'unlockRecipe:sunrootStamina': 13_000n,
  'unlockRecipe:moonlitFocus': 17_500n,
  'unlockRecipe:frostmossCleanse': 23_500n,
  'unlockRecipe:sleepDraught': 31_000n,
  'unlockRecipe:elixirOfLife': 40_000n,
  'unlockRecipe:starLuckPhiltre': 52_000n,
  'unlockRecipe:deepDreamVision': 68_000n,
  'unlockRecipe:pactWard': 88_000n,
  'unlockRecipe:dragonCourage': 115_000n,
  'automation:autoPlantTile:1': 1n,
  'automation:autoPlantTile:2': 2n,
  'automation:autoPlantTile:3': 3n,
  'automation:autoPlantTile:4': 4n,
  'automation:autoPlantTile:5': 5n,
  'automation:autoPlantTile:6': 6n,
  'automation:autoPlantTile:7': 7n,
  'automation:autoPlantTile:8': 8n,
  'automation:autoPlantTile:9': 9n,
  'automation:autoPlantTile:10': 10n,
  'automation:autoHarvestPlant:1': 1n,
  'automation:autoHarvestPlant:2': 2n,
  'automation:autoHarvestPlant:3': 3n,
  'automation:autoHarvestPlant:4': 4n,
  'automation:autoHarvestPlant:5': 5n,
  'automation:autoHarvestPlant:6': 6n,
  'automation:autoHarvestPlant:7': 7n,
  'automation:autoHarvestPlant:8': 8n,
  'automation:autoHarvestPlant:9': 9n,
  'automation:autoHarvestPlant:10': 10n,
  'automation:autoBrewCauldron:1': 1n,
  'automation:autoBrewCauldron:2': 2n,
  'automation:autoBrewCauldron:3': 3n,
  'automation:autoBrewCauldron:4': 4n,
  'automation:autoBrewCauldron:5': 5n,
  'automation:autoBottleCauldron:1': 1n,
  'automation:autoBottleCauldron:2': 2n,
  'automation:autoBottleCauldron:3': 3n,
  'automation:autoBottleCauldron:4': 4n,
  'automation:autoBottleCauldron:5': 5n,
  'automation:autoCollectCauldron:1': 1n,
  'automation:autoCollectCauldron:2': 2n,
  'automation:autoCollectCauldron:3': 3n,
  'automation:autoCollectCauldron:4': 4n,
  'automation:autoCollectCauldron:5': 5n,
};

const researchDefaultCostCrystalById: Record<string, number> = {
  'automation:autoSeedSpawn': 10,
  'automation:autoPlantTile:1': 1,
  'automation:autoPlantTile:2': 2,
  'automation:autoPlantTile:3': 3,
  'automation:autoPlantTile:4': 4,
  'automation:autoPlantTile:5': 5,
  'automation:autoPlantTile:6': 6,
  'automation:autoPlantTile:7': 7,
  'automation:autoPlantTile:8': 8,
  'automation:autoPlantTile:9': 9,
  'automation:autoPlantTile:10': 10,
  'automation:autoHarvestPlant:1': 1,
  'automation:autoHarvestPlant:2': 2,
  'automation:autoHarvestPlant:3': 3,
  'automation:autoHarvestPlant:4': 4,
  'automation:autoHarvestPlant:5': 5,
  'automation:autoHarvestPlant:6': 6,
  'automation:autoHarvestPlant:7': 7,
  'automation:autoHarvestPlant:8': 8,
  'automation:autoHarvestPlant:9': 9,
  'automation:autoHarvestPlant:10': 10,
  'automation:autoBrewCauldron:1': 1,
  'automation:autoBrewCauldron:2': 2,
  'automation:autoBrewCauldron:3': 3,
  'automation:autoBrewCauldron:4': 4,
  'automation:autoBrewCauldron:5': 5,
  'automation:autoBottleCauldron:1': 1,
  'automation:autoBottleCauldron:2': 2,
  'automation:autoBottleCauldron:3': 3,
  'automation:autoBottleCauldron:4': 4,
  'automation:autoBottleCauldron:5': 5,
  'automation:autoCollectCauldron:1': 1,
  'automation:autoCollectCauldron:2': 2,
  'automation:autoCollectCauldron:3': 3,
  'automation:autoCollectCauldron:4': 4,
  'automation:autoCollectCauldron:5': 5,
};

const ADVANCED_RESEARCH_MAX_LEVEL = 10;
const FAST_SELL_RESEARCH_MAX_LEVEL = 3;
const fastSellResearchCostsRuby = [2, 5, 10];
const advancedResearchCauldronNumbers = [1, 2, 3, 4, 5];
const advancedResearchPlotNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getAdvancedResearchCostRubyById(): Record<string, number> {
  const costs: Record<string, number> = {};

  for (let level = 1; level <= FAST_SELL_RESEARCH_MAX_LEVEL; level += 1) {
    costs[`fastSellPayout:${level}`] = fastSellResearchCostsRuby[level - 1] ?? 0;
  }

  for (const cauldronNumber of advancedResearchCauldronNumbers) {
    for (let level = 1; level <= ADVANCED_RESEARCH_MAX_LEVEL; level += 1) {
      costs[`advanced:cauldronBrewing:${cauldronNumber}:${level}`] = level;
    }
  }

  for (const plotNumber of advancedResearchPlotNumbers) {
    for (let level = 1; level <= ADVANCED_RESEARCH_MAX_LEVEL; level += 1) {
      costs[`advanced:plotGrowth:${plotNumber}:${level}`] = level;
    }
  }

  return costs;
}

const researchDefaultCostRubyById: Record<string, number> =
  getAdvancedResearchCostRubyById();

const researchDefaultDurationOverrideSecondsById: Record<string, bigint> = {
  'unlockSeed:mintSeed': 15n,
  'unlockRecipe:manaTonic': 60n,
};

const researchLegacyCostGoldById: Record<string, readonly bigint[]> = {
  'unlockRecipe:manaTonic': [150n, 80n],
};

const researchLegacyDurationSecondsById: Record<string, bigint> = {
  'unlockRecipe:manaTonic': 600n,
};

const researchDefaultDurationSecondsById: Record<string, bigint> = {
  ...(Object.fromEntries(
    [
      ...Object.keys(researchDefaultCostGoldById),
      ...Object.keys(researchDefaultCostCrystalById).filter(
        (researchId) => researchDefaultCostGoldById[researchId] === undefined,
      ),
      ...Object.keys(researchDefaultCostRubyById).filter(
        (researchId) =>
          researchDefaultCostGoldById[researchId] === undefined &&
          researchDefaultCostCrystalById[researchId] === undefined,
      ),
    ].map((researchId, index) => [
      researchId,
      BigInt(getDefaultResearchDurationSeconds(index)),
    ]),
  ) as Record<string, bigint>),
  ...researchDefaultDurationOverrideSecondsById,
};

function getDefaultResearchDurationSeconds(index: number): number {
  if (index === 0) {
    return 3;
  }

  if (index === 1) {
    return 60;
  }

  return Math.min(Number(MAX_RESEARCH_DURATION_SECONDS), 300 + Math.max(0, index - 2) * 300);
}

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'wasted potion', basePriceGold: 1 },
];

const potionRecipeCatalog = [
  {
    potionKey: 'manaTonic',
    manaCost: 12,
    brewDurationMs: 30_000,
    ingredients: [{ itemKey: 'sageHerb', quantity: 3 }],
  },
  {
    potionKey: 'minorHealingPotion',
    manaCost: 14,
    brewDurationMs: 35_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'nettleVigor',
    manaCost: 16,
    brewDurationMs: 40_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'calmingDraught',
    manaCost: 18,
    brewDurationMs: 45_000,
    ingredients: [
      { itemKey: 'mintHerb', quantity: 2 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'briarWard',
    manaCost: 24,
    brewDurationMs: 60_000,
    ingredients: [
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'lanternTonic',
    manaCost: 22,
    brewDurationMs: 55_000,
    ingredients: [
      { itemKey: 'glowcapHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'simpleAntidote',
    manaCost: 22,
    brewDurationMs: 50_000,
    ingredients: [
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'venomDraught',
    manaCost: 24,
    brewDurationMs: 60_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'healingPotion',
    manaCost: 26,
    brewDurationMs: 65_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'sunrootStamina',
    manaCost: 34,
    brewDurationMs: 75_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'moonlitFocus',
    manaCost: 30,
    brewDurationMs: 70_000,
    ingredients: [
      { itemKey: 'moonflowerHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'frostmossCleanse',
    manaCost: 38,
    brewDurationMs: 85_000,
    ingredients: [
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'sleepDraught',
    manaCost: 42,
    brewDurationMs: 95_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 2 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'elixirOfLife',
    manaCost: 44,
    brewDurationMs: 100_000,
    ingredients: [
      { itemKey: 'mandrakeHerb', quantity: 3 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'starLuckPhiltre',
    manaCost: 50,
    brewDurationMs: 110_000,
    ingredients: [
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'deepDreamVision',
    manaCost: 62,
    brewDurationMs: 135_000,
    ingredients: [
      { itemKey: 'dreambellHerb', quantity: 2 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'pactWard',
    manaCost: 64,
    brewDurationMs: 145_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'briarHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'dragonCourage',
    manaCost: 58,
    brewDurationMs: 125_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'ashenMemory',
    manaCost: 36,
    brewDurationMs: 80_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'silverleafQuiet',
    manaCost: 34,
    brewDurationMs: 75_000,
    ingredients: [
      { itemKey: 'mintHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'emberSight',
    manaCost: 58,
    brewDurationMs: 120_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'thornSleep',
    manaCost: 44,
    brewDurationMs: 90_000,
    ingredients: [
      { itemKey: 'briarHerb', quantity: 1 },
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'glassMoonElixir',
    manaCost: 52,
    brewDurationMs: 110_000,
    ingredients: [
      { itemKey: 'moonflowerHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'starAniseHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'rootboundResolve',
    manaCost: 48,
    brewDurationMs: 100_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 1 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
      { itemKey: 'briarHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'nightOrchardTonic',
    manaCost: 60,
    brewDurationMs: 125_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'mintHerb', quantity: 2 },
      { itemKey: 'dreambellHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'starlessCourage',
    manaCost: 68,
    brewDurationMs: 140_000,
    ingredients: [
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'frostveinDraught',
    manaCost: 54,
    brewDurationMs: 115_000,
    ingredients: [
      { itemKey: 'frostmossHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 1 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'bloodlightWard',
    manaCost: 62,
    brewDurationMs: 130_000,
    ingredients: [
      { itemKey: 'bloodroseHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
      { itemKey: 'briarHerb', quantity: 1 },
      { itemKey: 'sageHerb', quantity: 1 },
    ],
  },
];

const unknownPotionCatalogByKey = new Map(
  unknownPotionCatalog.map((potion) => [potion.key, potion]),
);

function getSeedMarketBasePriceGold(herb: (typeof herbCatalog)[number]): number {
  return roundGoldPrice((herbMarketBasePriceGoldByKey[herb.key] ?? 2) * 0.4);
}

const npcMarketCatalog = [
  ...herbCatalog.map((herb) => ({
    itemKey: `${herb.key}Seed`,
    itemLabel: `${herb.label} seed`,
    itemKind: 'seed',
    basePriceGold: getSeedMarketBasePriceGold(herb),
    targetStock: 1_000n,
    volatilityBps: 1_200n,
  })),
  ...herbCatalog.map((herb) => ({
    itemKey: `${herb.key}Herb`,
    itemLabel: herb.label,
    itemKind: 'herb',
    basePriceGold: herbMarketBasePriceGoldByKey[herb.key] ?? 2,
    targetStock: 800n,
    volatilityBps: 1_000n,
  })),
  ...potionCatalog.map((potion) => ({
    itemKey: potion.key,
    itemLabel: potion.label,
    itemKind: 'potion',
    basePriceGold:
      'basePriceGold' in potion
        ? potion.basePriceGold
        : potionMarketBasePriceGoldByKey[potion.key] ?? 5,
    targetStock: 300n,
    volatilityBps: 800n,
  })),
];

const npcMarketCatalogByItemKey = new Map(
  npcMarketCatalog.map((item) => [item.itemKey, item]),
);

const potionRecipeCatalogByPotionKey = new Map(
  potionRecipeCatalog.map((recipe) => [recipe.potionKey, recipe]),
);

const summonSeedResearchCatalog = [
  { id: 'summonSeedsX2', label: 'x2 summon' },
  { id: 'summonSeedsX3', label: 'x3 summon' },
  { id: 'summonSeedsX4', label: 'x4 summon' },
  { id: 'summonSeedsX5', label: 'x5 summon' },
];

const automationGardenTileNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const automationCauldronNumbers = [1, 2, 3, 4, 5];
const automationResearchCatalog = [
  {
    id: 'automation:autoSeedSpawn',
    label: 'auto seed spawn',
    groupId: 'autoSeedSpawn',
  },
  ...automationGardenTileNumbers.map((tileNumber) => ({
    id: `automation:autoPlantTile:${tileNumber}`,
    label: `auto plant tile ${tileNumber}`,
    groupId: 'autoPlantTiles',
  })),
  ...automationGardenTileNumbers.map((tileNumber) => ({
    id: `automation:autoHarvestPlant:${tileNumber}`,
    label: `auto harvest tile ${tileNumber}`,
    groupId: 'autoHarvestTiles',
  })),
  ...automationCauldronNumbers.map((cauldronNumber) => ({
    id: `automation:autoBrewCauldron:${cauldronNumber}`,
    label: `auto brew cauldron ${cauldronNumber}`,
    groupId: 'autoBrewCauldrons',
  })),
  ...automationCauldronNumbers.map((cauldronNumber) => ({
    id: `automation:autoBottleCauldron:${cauldronNumber}`,
    label: `auto bottle cauldron ${cauldronNumber}`,
    groupId: 'autoBottleCauldrons',
  })),
  ...automationCauldronNumbers.map((cauldronNumber) => ({
    id: `automation:autoCollectCauldron:${cauldronNumber}`,
    label: `auto collect cauldron ${cauldronNumber}`,
    groupId: 'autoCollectCauldrons',
  })),
];

const advancedResearchCatalog = [
  ...Array.from({ length: FAST_SELL_RESEARCH_MAX_LEVEL }, (_value, index) => {
    const level = index + 1;
    return {
      id: `fastSellPayout:${level}`,
      label: `fast sell lvl ${level}`,
      groupId: 'fastSell',
    };
  }),
  ...advancedResearchCauldronNumbers.flatMap((cauldronNumber) =>
    Array.from({ length: ADVANCED_RESEARCH_MAX_LEVEL }, (_value, index) => {
      const level = index + 1;
      return {
        id: `advanced:cauldronBrewing:${cauldronNumber}:${level}`,
        label: `cauldron ${cauldronNumber} brewing lvl ${level}`,
        groupId: 'cauldronBrewing',
      };
    }),
  ),
  ...advancedResearchPlotNumbers.flatMap((plotNumber) =>
    Array.from({ length: ADVANCED_RESEARCH_MAX_LEVEL }, (_value, index) => {
      const level = index + 1;
      return {
        id: `advanced:plotGrowth:${plotNumber}:${level}`,
        label: `plot ${plotNumber} growth lvl ${level}`,
        groupId: 'plotGrowth',
      };
    }),
  ),
];

const researchCatalog = [
  ...herbCatalog.map((herb) => {
    const id = `unlockSeed:${herb.key}Seed`;
    return {
      researchId: id,
      label: `${herb.label} seed`,
      groupId: 'seedUnlocks',
      defaultCostGold: researchDefaultCostGoldById[id] ?? 0n,
    };
  }),
  ...summonSeedResearchCatalog.map((research) => ({
    researchId: research.id,
    label: research.label,
    groupId: 'summonSeeds',
    defaultCostGold: researchDefaultCostGoldById[research.id] ?? 0n,
  })),
  ...knownPotionResearchCatalog.map((potion) => {
    const id = `unlockRecipe:${potion.key}`;
    return {
      researchId: id,
      label: potion.label,
      groupId: 'recipeUnlocks',
      defaultCostGold: researchDefaultCostGoldById[id] ?? 0n,
    };
  }),
  ...automationResearchCatalog.map((research) => ({
    researchId: research.id,
    label: research.label,
    groupId: research.groupId,
    defaultCostGold: researchDefaultCostGoldById[research.id] ?? 0n,
  })),
  ...advancedResearchCatalog.map((research) => ({
    researchId: research.id,
    label: research.label,
    groupId: research.groupId,
    defaultCostGold: 0n,
  })),
];

const researchCatalogById = new Map(
  researchCatalog.map((research) => [research.researchId, research]),
);

function toGameConfigJson(value: unknown): string {
  return JSON.stringify(value);
}

function toNumberRecord(record: Record<string, bigint>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, Number(value)]),
  );
}

function getDefaultItemsConfig() {
  return {
    seeds: herbCatalog.map((herb, index) => ({
      id: index + 1,
      key: `${herb.key}Seed`,
      label: `${herb.label} seed`,
      producesHerbTypeId: 1001 + index,
      dropWeight: 1,
      summonManaCost: 10,
      baseSellPrice: 1,
    })),
    herbs: herbCatalog.map((herb, index) => ({
      id: 1001 + index,
      key: `${herb.key}Herb`,
      label: herb.label,
      growthDurationMs: herb.growthDurationMs,
      baseSellPrice: roundGoldPrice(
        ((herbMarketBasePriceGoldByKey[herb.key] ?? 0) * NPC_MARKET_BUY_BPS) / 10_000,
      ),
    })),
    potions: potionCatalog.map((potion, index) => ({
      id: 2001 + index,
      key: potion.key,
      label: potion.label,
      ...(unknownPotionCatalogByKey.has(potion.key)
        ? {
            discoveryType: 'unknown',
            type: 'unknown',
            unknown: true,
            known: false,
            researchable: false,
          }
        : {}),
      ...(potion.key === 'wastedPotion' ? { hasRecipe: false } : {}),
      baseSellPrice:
        'basePriceGold' in potion
          ? roundGoldPrice((potion.basePriceGold * NPC_MARKET_BUY_BPS) / 10_000)
          : roundGoldPrice(
              ((potionMarketBasePriceGoldByKey[potion.key] ?? 0) * NPC_MARKET_BUY_BPS) / 10_000,
            ),
    })),
  };
}

const DEFAULT_GARDEN_CONFIG_JSON = toGameConfigJson({
  garden: {
    initialUnlockedTiles: 1,
    tileCostsGold: [0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800],
    tilesPerRow: 4,
    harvestSeconds: 3,
  },
});
const DEFAULT_SHOP_CONFIG_JSON = toGameConfigJson({
  shopShelf: {
    initialUnlockedSlots: 0,
    slotCostsGold: [0, 50, 150, 400, 1000],
    autoSellSeconds: 1_800,
  },
});
const DEFAULT_RESEARCH_CONFIG_JSON = toGameConfigJson({
  researchCostsGold: toNumberRecord(researchDefaultCostGoldById),
  researchCostsCrystal: researchDefaultCostCrystalById,
  researchCostsRuby: researchDefaultCostRubyById,
  researchDurationsSeconds: toNumberRecord(researchDefaultDurationSecondsById),
});
const DEFAULT_BREWING_CONFIG_JSON = toGameConfigJson({
  wastedBrewManaCost: 5,
  wastedBrewDurationMs: 4_000,
  bottlingDurationMs: 2_000,
  maxCauldronIngredients: 5,
  initialUnlockedCauldrons: 1,
  cauldronCostsGold: [0, 25, 75, 175, 400],
  wastedPotionKey: 'wastedPotion',
});
const DEFAULT_TRADE_ALLIANCE_CONFIG_JSON = toGameConfigJson({
  weeklyQuests: [
    {
      id: 'allianceIncomeEasy',
      label: 'hard route',
      type: TRADE_ALLIANCE_QUEST_TYPE_INCOME,
      target: 10_000,
      minContribution: 500,
      crystalReward: 2,
    },
    {
      id: 'allianceIncomeMedium',
      label: 'bulk route',
      type: TRADE_ALLIANCE_QUEST_TYPE_INCOME,
      target: 50_000,
      minContribution: 2_500,
      crystalReward: 5,
    },
    {
      id: 'allianceIncomeHard',
      label: 'grand route',
      type: TRADE_ALLIANCE_QUEST_TYPE_INCOME,
      target: 250_000,
      minContribution: 12_500,
      crystalReward: 12,
    },
    {
      id: `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}manaTonic`,
      label: 'fill 500 mana tonic',
      type: TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL,
      itemKey: 'manaTonic',
      target: 500,
      minContribution: 25,
      crystalReward: 5,
    },
    {
      id: `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}healingPotion`,
      label: 'fill 500 healing potion',
      type: TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL,
      itemKey: 'healingPotion',
      target: 500,
      minContribution: 25,
      crystalReward: 5,
    },
    {
      id: `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}sageSeed`,
      label: 'fill 5000 sage seed',
      type: TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL,
      itemKey: 'sageSeed',
      target: 5_000,
      minContribution: 250,
      crystalReward: 5,
    },
    {
      id: `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}nettleSeed`,
      label: 'fill 5000 nettle seed',
      type: TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL,
      itemKey: 'nettleSeed',
      target: 5_000,
      minContribution: 250,
      crystalReward: 5,
    },
    {
      id: `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}moonflowerSeed`,
      label: 'fill 5000 moonflower seed',
      type: TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL,
      itemKey: 'moonflowerSeed',
      target: 5_000,
      minContribution: 250,
      crystalReward: 5,
    },
  ],
});
const DEFAULT_VISUAL_SETTINGS_CONFIG_JSON = toGameConfigJson({
  costsCrystal: {
    theme: {
      white: 0,
      black: 0,
      midnight: 0,
      witchcraft: 0,
    },
    font: {
      lexend: 0,
      'comic-sans-mono': 0,
    },
    color: {
      monochrome: 0,
      resources: 0,
    },
    progressBar: {
      regular: 0,
      gradient: 0,
    },
    icons: {
      none: 0,
      icons: 0,
    },
  },
});
const DEFAULT_ITEMS_CONFIG_JSON = toGameConfigJson(getDefaultItemsConfig());
const DEFAULT_POTION_RECIPES_CONFIG_JSON = toGameConfigJson({
  recipes: potionRecipeCatalog,
});
const DEFAULT_MAINTENANCE_CONFIG_JSON = toGameConfigJson({
  mode: MAINTENANCE_MODE_OFF,
  message: 'maintenance in progress',
});

const gameConfigCatalog = [
  { configKey: 'tasks', configJson: DEFAULT_CURRENT_TASKS_CONFIG_JSON },
  { configKey: 'playerLevel', configJson: DEFAULT_PLAYER_LEVEL_CONFIG_JSON },
  { configKey: 'garden', configJson: DEFAULT_GARDEN_CONFIG_JSON },
  { configKey: 'shop', configJson: DEFAULT_SHOP_CONFIG_JSON },
  { configKey: 'research', configJson: DEFAULT_RESEARCH_CONFIG_JSON },
  { configKey: 'brewing', configJson: DEFAULT_BREWING_CONFIG_JSON },
  { configKey: 'tradeAlliance', configJson: DEFAULT_TRADE_ALLIANCE_CONFIG_JSON },
  { configKey: 'visualSettings', configJson: DEFAULT_VISUAL_SETTINGS_CONFIG_JSON },
  { configKey: 'items', configJson: DEFAULT_ITEMS_CONFIG_JSON },
  { configKey: 'potionRecipes', configJson: DEFAULT_POTION_RECIPES_CONFIG_JSON },
  { configKey: 'maintenance', configJson: DEFAULT_MAINTENANCE_CONFIG_JSON },
];

const spacetimedb = schema({
  player: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      username: t.string(),
      connected: t.bool(),
      createdAt: t.timestamp(),
      lastSeenAt: t.timestamp(),
      playerLevel: t.u32().default(DEFAULT_PLAYER_LEVEL),
      theme: t.string().default(DEFAULT_PLAYER_THEME),
      colorMode: t.string().default(DEFAULT_PLAYER_COLOR_MODE),
      usernamePromptSeen: t.bool().default(false),
      font: t.string().default(DEFAULT_PLAYER_FONT),
    },
  ),
  playerGameplaySave: table(
    {
      name: 'player_gameplay_save',
      public: false,
    },
    {
      identity: t.identity().primaryKey(),
      saveJson: t.string(),
      updatedAt: t.timestamp(),
    },
  ),
  playerSession: table(
    {
      name: 'player_session',
      public: false,
    },
    {
      identity: t.identity().primaryKey(),
      activeConnectionId: t.connectionId(),
      updatedAt: t.timestamp(),
    },
  ),
  leaderboard: table(
    {
      public: true,
      indexes: [
        { accessor: 'byDailyIncome', algorithm: 'btree', columns: ['dailyIncome'] },
        { accessor: 'byWeeklyIncome', algorithm: 'btree', columns: ['weeklyIncome'] },
        { accessor: 'byMonthlyIncome', algorithm: 'btree', columns: ['monthlyIncome'] },
        { accessor: 'byTotalIncome', algorithm: 'btree', columns: ['totalIncome'] },
      ],
    },
    {
      identity: t.identity().primaryKey(),
      username: t.string(),
      totalIncome: t.u64(),
      updatedAt: t.timestamp(),
      playerLevel: t.u32().default(DEFAULT_PLAYER_LEVEL),
      dailyIncome: t.u64().default(0n),
      weeklyIncome: t.u64().default(0n),
      monthlyIncome: t.u64().default(0n),
      dayKey: t.string().default(''),
      weekKey: t.string().default(''),
      monthKey: t.string().default(''),
    },
  ),
  worldChat: table(
    {
      name: 'world_chat',
      public: true,
      indexes: [{ accessor: 'bySentAt', algorithm: 'btree', columns: ['sentAt'] }],
    },
    {
      messageId: t.uuid().primaryKey(),
      senderIdentity: t.identity(),
      username: t.string(),
      body: t.string(),
      sentAt: t.timestamp(),
      playerLevel: t.u32().default(DEFAULT_PLAYER_LEVEL),
      allianceTag: t.string().default(''),
      allianceTagColor: t.string().default(DEFAULT_TRADE_ALLIANCE_TAG_COLOR),
    },
  ),
  tradeAlliance: table(
    {
      name: 'trade_alliance',
      public: true,
      indexes: [
        { accessor: 'byTag', algorithm: 'btree', columns: ['tag'] },
        { accessor: 'byTotalIncome', algorithm: 'btree', columns: ['totalIncome'] },
        { accessor: 'bySeasonIncome', algorithm: 'btree', columns: ['seasonIncome'] },
        { accessor: 'byMonthlyIncome', algorithm: 'btree', columns: ['monthlyIncome'] },
      ],
    },
    {
      allianceId: t.uuid().primaryKey(),
      name: t.string(),
      normalizedName: t.string(),
      tag: t.string(),
      description: t.string(),
      notice: t.string(),
      joinMode: t.string(),
      leaderIdentity: t.identity(),
      memberCount: t.u32(),
      totalIncome: t.u64(),
      seasonIncome: t.u64(),
      createdAt: t.timestamp(),
      updatedAt: t.timestamp(),
      seasonKey: t.string().default(''),
      dayKey: t.string().default(''),
      dailyIncome: t.u64().default(0n),
      monthlyIncome: t.u64().default(0n),
      monthKey: t.string().default(''),
      tagColor: t.string().default(DEFAULT_TRADE_ALLIANCE_TAG_COLOR),
    },
  ),
  tradeAllianceMember: table(
    {
      name: 'trade_alliance_member',
      public: true,
      indexes: [
        { accessor: 'byAllianceId', algorithm: 'btree', columns: ['allianceId'] },
        { accessor: 'byJoinedAt', algorithm: 'btree', columns: ['joinedAt'] },
      ],
    },
    {
      memberIdentity: t.identity().primaryKey(),
      allianceId: t.uuid(),
      username: t.string(),
      playerLevel: t.u32(),
      role: t.string(),
      joinedAt: t.timestamp(),
      updatedAt: t.timestamp(),
      totalContribution: t.u64().default(0n),
      dailyContribution: t.u64().default(0n),
      dayKey: t.string().default(''),
    },
  ),
  tradeAllianceApplication: table(
    {
      name: 'trade_alliance_application',
      public: true,
      indexes: [
        { accessor: 'byAllianceId', algorithm: 'btree', columns: ['allianceId'] },
        { accessor: 'byApplicantIdentity', algorithm: 'btree', columns: ['applicantIdentity'] },
        { accessor: 'byCreatedAt', algorithm: 'btree', columns: ['createdAt'] },
      ],
    },
    {
      applicationKey: t.string().primaryKey(),
      allianceId: t.uuid(),
      applicantIdentity: t.identity(),
      username: t.string(),
      playerLevel: t.u32(),
      createdAt: t.timestamp(),
    },
  ),
  tradeAllianceChat: table(
    {
      name: 'trade_alliance_chat',
      public: false,
      indexes: [
        { accessor: 'byAllianceId', algorithm: 'btree', columns: ['allianceId'] },
        { accessor: 'bySentAt', algorithm: 'btree', columns: ['sentAt'] },
      ],
    },
    {
      messageId: t.uuid().primaryKey(),
      allianceId: t.uuid(),
      allianceTag: t.string(),
      senderIdentity: t.identity(),
      username: t.string(),
      playerLevel: t.u32(),
      body: t.string(),
      sentAt: t.timestamp(),
      allianceTagColor: t.string().default(DEFAULT_TRADE_ALLIANCE_TAG_COLOR),
    },
  ),
  tradeAllianceQuestProgress: table(
    {
      name: 'trade_alliance_quest_progress',
      public: true,
      indexes: [
        { accessor: 'byAllianceId', algorithm: 'btree', columns: ['allianceId'] },
        { accessor: 'byDayKey', algorithm: 'btree', columns: ['dayKey'] },
      ],
    },
    {
      questKey: t.string().primaryKey(),
      allianceId: t.uuid(),
      dayKey: t.string(),
      questId: t.string(),
      label: t.string(),
      questType: t.string(),
      target: t.u64(),
      progress: t.u64(),
      minContribution: t.u64(),
      crystalReward: t.u32(),
      updatedAt: t.timestamp(),
    },
  ),
  tradeAllianceQuestContribution: table(
    {
      name: 'trade_alliance_quest_contribution',
      public: true,
      indexes: [
        { accessor: 'byAllianceId', algorithm: 'btree', columns: ['allianceId'] },
        { accessor: 'byContributorIdentity', algorithm: 'btree', columns: ['contributorIdentity'] },
      ],
    },
    {
      contributionKey: t.string().primaryKey(),
      allianceId: t.uuid(),
      dayKey: t.string(),
      questId: t.string(),
      contributorIdentity: t.identity(),
      username: t.string(),
      contribution: t.u64(),
      updatedAt: t.timestamp(),
    },
  ),
  tradeAllianceRewardInbox: table(
    {
      name: 'trade_alliance_reward_inbox',
      public: false,
      indexes: [
        { accessor: 'byRecipientIdentity', algorithm: 'btree', columns: ['recipientIdentity'] },
        { accessor: 'byClaimedAt', algorithm: 'btree', columns: ['claimedAt'] },
      ],
    },
    {
      rewardKey: t.string().primaryKey(),
      recipientIdentity: t.identity(),
      allianceId: t.uuid(),
      allianceName: t.string(),
      questId: t.string(),
      questLabel: t.string(),
      dayKey: t.string(),
      crystalReward: t.u32(),
      claimedAt: t.timestamp(),
      collected: t.bool().default(false),
    },
  ),
  playerFeedback: table(
    {
      name: 'player_feedback',
      public: false,
      indexes: [
        { accessor: 'bySenderIdentity', algorithm: 'btree', columns: ['senderIdentity'] },
        { accessor: 'bySubmittedAt', algorithm: 'btree', columns: ['submittedAt'] },
      ],
    },
    {
      feedbackId: t.uuid().primaryKey(),
      senderIdentity: t.identity(),
      username: t.string(),
      playerLevel: t.u32().default(DEFAULT_PLAYER_LEVEL),
      body: t.string(),
      submittedAt: t.timestamp(),
    },
  ),
  potionRecipeDiscovery: table(
    {
      name: 'potion_recipe_discovery',
      public: true,
      indexes: [{ accessor: 'byDiscoveredAt', algorithm: 'btree', columns: ['discoveredAt'] }],
    },
    {
      potionKey: t.string().primaryKey(),
      potionLabel: t.string(),
      discoveredByIdentity: t.identity(),
      username: t.string(),
      discoveredAt: t.timestamp(),
      royaltyGold: t.u64().default(0n),
      royaltyGoldScale: t.u32().default(1),
    },
  ),
  playerShopListing: table(
    {
      name: 'player_shop_listing',
      public: true,
      indexes: [
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
        { accessor: 'byQuantity', algorithm: 'btree', columns: ['quantity'] },
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
      ],
    },
    {
      listingKey: t.string().primaryKey(),
      sellerIdentity: t.identity(),
      username: t.string(),
      slotNumber: t.u8(),
      itemKey: t.string(),
      itemLabel: t.string(),
      itemKind: t.string(),
      quantity: t.u32(),
      priceGold: t.u64(),
      updatedAt: t.timestamp(),
      priceScale: t.u32().default(1),
    },
  ),
  playerShopRequest: table(
    {
      name: 'player_shop_request',
      public: true,
      indexes: [
        { accessor: 'byRequesterIdentity', algorithm: 'btree', columns: ['requesterIdentity'] },
        { accessor: 'byQuantity', algorithm: 'btree', columns: ['quantity'] },
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
      ],
    },
    {
      requestKey: t.string().primaryKey(),
      requesterIdentity: t.identity(),
      username: t.string(),
      slotNumber: t.u8(),
      itemKey: t.string(),
      itemLabel: t.string(),
      itemKind: t.string(),
      quantity: t.u32(),
      priceGold: t.u64(),
      updatedAt: t.timestamp(),
      priceScale: t.u32().default(1),
    },
  ),
  playerShopProceeds: table(
    {
      name: 'player_shop_proceeds',
      public: true,
    },
    {
      sellerIdentity: t.identity().primaryKey(),
      gold: t.u64(),
      updatedAt: t.timestamp(),
      goldScale: t.u32().default(1),
    },
  ),
  playerShopTrade: table(
    {
      name: 'player_shop_trade',
      public: true,
      indexes: [
        { accessor: 'byBuyerIdentity', algorithm: 'btree', columns: ['buyerIdentity'] },
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
        { accessor: 'byTradedAt', algorithm: 'btree', columns: ['tradedAt'] },
      ],
    },
    {
      tradeId: t.uuid().primaryKey(),
      buyerIdentity: t.identity(),
      buyerUsername: t.string(),
      sellerIdentity: t.identity(),
      sellerUsername: t.string(),
      itemKey: t.string(),
      itemLabel: t.string(),
      itemKind: t.string(),
      quantity: t.u32(),
      priceGold: t.u64(),
      totalPriceGold: t.u64(),
      tradedAt: t.timestamp(),
      priceScale: t.u32().default(1),
    },
  ),
  npcMarketPrice: table(
    {
      name: 'npc_market_price',
      public: true,
      indexes: [
        { accessor: 'byItemKind', algorithm: 'btree', columns: ['itemKind'] },
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
      ],
    },
    {
      itemKey: t.string().primaryKey(),
      itemLabel: t.string(),
      itemKind: t.string(),
      basePriceGold: t.u64(),
      marketPriceGold: t.u64(),
      npcBuyPriceGold: t.u64(),
      npcSellPriceGold: t.u64(),
      npcStock: t.u64(),
      targetStock: t.u64(),
      demandScore: t.u64(),
      supplyScore: t.u64(),
      updatedAt: t.timestamp(),
      lastTickAt: t.timestamp(),
      npcNeed: t.u64().default(0n),
      targetNeed: t.u64().default(0n),
      maxNeed: t.u64().default(0n),
      priceScale: t.u32().default(1),
    },
  ),
  npcMarketItemConfig: table(
    {
      name: 'npc_market_item_config',
      public: true,
      indexes: [{ accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] }],
    },
    {
      itemKey: t.string().primaryKey(),
      itemLabel: t.string(),
      itemKind: t.string(),
      defaultBasePriceGold: t.u64(),
      basePriceGold: t.u64(),
      updatedAt: t.timestamp(),
      targetStock: t.u64().default(0n),
      volatilityBps: t.u64().default(0n),
      enabled: t.bool().default(true),
      priceScale: t.u32().default(1),
    },
  ),
  npcMarketAdmin: table(
    { name: 'npc_market_admin', public: true },
    {
      identity: t.identity().primaryKey(),
      username: t.string(),
      addedAt: t.timestamp(),
    },
  ),
  maintenanceState: table(
    {
      name: 'maintenance_state',
      public: false,
    },
    {
      stateKey: t.string().primaryKey(),
      appliedAt: t.timestamp(),
    },
  ),
  researchConfig: table(
    {
      name: 'research_config',
      public: true,
      indexes: [
        { accessor: 'byGroupId', algorithm: 'btree', columns: ['groupId'] },
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
      ],
    },
    {
      researchId: t.string().primaryKey(),
      label: t.string(),
      groupId: t.string(),
      defaultCostGold: t.u64(),
      costGold: t.u64(),
      enabled: t.bool().default(true),
      updatedAt: t.timestamp(),
      durationSeconds: t.u64().default(0n),
    },
  ),
  gameConfig: table(
    {
      name: 'game_config',
      public: true,
      indexes: [{ accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] }],
    },
    {
      configKey: t.string().primaryKey(),
      configJson: t.string(),
      updatedAt: t.timestamp(),
    },
  ),
});

const playerGameplaySaveResult = t.option(
  t.row('PlayerGameplaySaveResult', {
    identity: t.identity().primaryKey(),
    saveJson: t.string(),
    updatedAt: t.timestamp(),
  }),
);
const playerSessionResult = t.option(
  t.row('PlayerSessionResult', {
    identity: t.identity().primaryKey(),
    activeConnectionId: t.connectionId(),
    updatedAt: t.timestamp(),
  }),
);
const playerProfileResult = t.option(
  t.row('PlayerProfileResult', {
    identity: t.identity().primaryKey(),
    username: t.string(),
    playerLevel: t.u32(),
    theme: t.string(),
    colorMode: t.string(),
    usernamePromptSeen: t.bool(),
    font: t.string(),
  }),
);
const adminPlayerGameplaySaveResult = t.array(
  t.row('AdminPlayerGameplaySaveResult', {
    identity: t.identity().primaryKey(),
    currentGold: t.f64(),
    currentCrystal: t.u32(),
    updatedAt: t.timestamp(),
  }),
);
const adminPlayerFeedbackResult = t.array(
  t.row('AdminPlayerFeedbackResult', {
    feedbackId: t.uuid().primaryKey(),
    senderIdentity: t.identity(),
    username: t.string(),
    playerLevel: t.u32(),
    body: t.string(),
    submittedAt: t.timestamp(),
  }),
);
const leaderboardSummaryResult = t.array(
  t.row('LeaderboardSummaryResult', {
    identity: t.identity().primaryKey(),
    username: t.string(),
    allianceTag: t.string(),
    allianceTagColor: t.string(),
    totalIncome: t.u64(),
    income: t.u64(),
    dailyIncome: t.u64(),
    weeklyIncome: t.u64(),
    monthlyIncome: t.u64(),
    updatedAt: t.timestamp(),
    playerLevel: t.u32(),
    dailyRank: t.u32(),
    weeklyRank: t.u32(),
    monthlyRank: t.u32(),
    allTimeRank: t.u32(),
  }),
);
const playerInfoSummaryResult = t.array(
  t.row('PlayerInfoSummaryResult', {
    identity: t.identity().primaryKey(),
    username: t.string(),
    allianceTag: t.string(),
    allianceTagColor: t.string(),
    totalProducedGold: t.u64(),
    playerLevel: t.u32(),
    prestigeCount: t.u32(),
    updatedAt: t.timestamp(),
  }),
);
const ownTradeAllianceOverviewResult = t.option(
  t.row('OwnTradeAllianceOverviewResult', {
    memberIdentity: t.identity().primaryKey(),
    allianceId: t.uuid(),
    username: t.string(),
    playerLevel: t.u32(),
    role: t.string(),
    joinedAt: t.timestamp(),
    memberUpdatedAt: t.timestamp(),
    totalContribution: t.u64(),
    dailyContribution: t.u64(),
    memberDayKey: t.string(),
    name: t.string(),
    normalizedName: t.string(),
    tag: t.string(),
    tagColor: t.string(),
    description: t.string(),
    notice: t.string(),
    joinMode: t.string(),
    leaderIdentity: t.identity(),
    memberCount: t.u32(),
    totalIncome: t.u64(),
    seasonIncome: t.u64(),
    createdAt: t.timestamp(),
    allianceUpdatedAt: t.timestamp(),
    seasonKey: t.string(),
    dayKey: t.string(),
    dailyIncome: t.u64(),
    monthlyIncome: t.u64(),
    monthKey: t.string(),
  }),
);
const ownTradeAllianceChatResult = t.array(
  t.row('OwnTradeAllianceChatResult', {
    messageId: t.uuid().primaryKey(),
    allianceId: t.uuid(),
    allianceTag: t.string(),
    allianceTagColor: t.string(),
    senderIdentity: t.identity(),
    username: t.string(),
    playerLevel: t.u32(),
    body: t.string(),
    sentAt: t.timestamp(),
  }),
);
const ownTradeAllianceRewardInboxResult = t.array(
  t.row('OwnTradeAllianceRewardInboxResult', {
    rewardKey: t.string().primaryKey(),
    recipientIdentity: t.identity(),
    allianceId: t.uuid(),
    allianceName: t.string(),
    questId: t.string(),
    questLabel: t.string(),
    dayKey: t.string(),
    crystalReward: t.u32(),
    claimedAt: t.timestamp(),
    collected: t.bool(),
  }),
);
const worldChatRecentResult = t.array(
  t.row('WorldChatRecentResult', {
    messageId: t.uuid().primaryKey(),
    senderIdentity: t.identity(),
    username: t.string(),
    playerLevel: t.u32(),
    body: t.string(),
    sentAt: t.timestamp(),
    allianceTag: t.string(),
    allianceTagColor: t.string(),
  }),
);
const potionRecipeDiscoverySnapshotResult = t.array(
  t.row('PotionRecipeDiscoverySnapshotResult', {
    potionKey: t.string().primaryKey(),
    potionLabel: t.string(),
    discoveredByIdentity: t.identity(),
    username: t.string(),
    discoveredAt: t.timestamp(),
    royaltyGold: t.u64(),
    royaltyGoldScale: t.u32(),
  }),
);
const gameConfigSnapshotResult = t.array(
  t.row('GameConfigSnapshotResult', {
    configKey: t.string().primaryKey(),
    configJson: t.string(),
    updatedAt: t.timestamp(),
  }),
);
const researchConfigSnapshotResult = t.array(
  t.row('ResearchConfigSnapshotResult', {
    researchId: t.string().primaryKey(),
    label: t.string(),
    groupId: t.string(),
    defaultCostGold: t.u64(),
    costGold: t.u64(),
    enabled: t.bool(),
    updatedAt: t.timestamp(),
    durationSeconds: t.u64(),
  }),
);
const npcMarketPriceSnapshotResult = t.array(
  t.row('NpcMarketPriceSnapshotResult', {
    itemKey: t.string().primaryKey(),
    itemLabel: t.string(),
    itemKind: t.string(),
    basePriceGold: t.u64(),
    marketPriceGold: t.u64(),
    npcBuyPriceGold: t.u64(),
    npcSellPriceGold: t.u64(),
    npcStock: t.u64(),
    targetStock: t.u64(),
    demandScore: t.u64(),
    supplyScore: t.u64(),
    updatedAt: t.timestamp(),
    lastTickAt: t.timestamp(),
    npcNeed: t.u64(),
    targetNeed: t.u64(),
    maxNeed: t.u64(),
    priceScale: t.u32(),
  }),
);
const tradeAllianceSnapshotResult = t.array(
  t.row('TradeAllianceSnapshotResult', {
    allianceId: t.uuid().primaryKey(),
    name: t.string(),
    normalizedName: t.string(),
    tag: t.string(),
    tagColor: t.string(),
    description: t.string(),
    notice: t.string(),
    joinMode: t.string(),
    leaderIdentity: t.identity(),
    memberCount: t.u32(),
    totalIncome: t.u64(),
    seasonIncome: t.u64(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    seasonKey: t.string(),
    dayKey: t.string(),
    dailyIncome: t.u64(),
    monthlyIncome: t.u64(),
    monthKey: t.string(),
  }),
);
const tradeAllianceMemberSnapshotResult = t.array(
  t.row('TradeAllianceMemberSnapshotResult', {
    memberIdentity: t.identity().primaryKey(),
    allianceId: t.uuid(),
    username: t.string(),
    playerLevel: t.u32(),
    role: t.string(),
    joinedAt: t.timestamp(),
    updatedAt: t.timestamp(),
    totalContribution: t.u64(),
    dailyContribution: t.u64(),
    dayKey: t.string(),
  }),
);
const tradeAllianceApplicationSnapshotResult = t.array(
  t.row('TradeAllianceApplicationSnapshotResult', {
    applicationKey: t.string().primaryKey(),
    allianceId: t.uuid(),
    applicantIdentity: t.identity(),
    username: t.string(),
    playerLevel: t.u32(),
    createdAt: t.timestamp(),
  }),
);
const tradeAllianceQuestProgressSnapshotResult = t.array(
  t.row('TradeAllianceQuestProgressSnapshotResult', {
    questKey: t.string().primaryKey(),
    allianceId: t.uuid(),
    dayKey: t.string(),
    questId: t.string(),
    label: t.string(),
    questType: t.string(),
    target: t.u64(),
    progress: t.u64(),
    minContribution: t.u64(),
    crystalReward: t.u32(),
    updatedAt: t.timestamp(),
  }),
);
const tradeAllianceQuestContributionSnapshotResult = t.array(
  t.row('TradeAllianceQuestContributionSnapshotResult', {
    contributionKey: t.string().primaryKey(),
    allianceId: t.uuid(),
    dayKey: t.string(),
    questId: t.string(),
    contributorIdentity: t.identity(),
    username: t.string(),
    contribution: t.u64(),
    updatedAt: t.timestamp(),
  }),
);
const publicPlayerShopListingResult = t.array(
  t.row('PublicPlayerShopListingResult', {
    listingKey: t.string().primaryKey(),
    sellerIdentity: t.identity(),
    username: t.string(),
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.u64(),
    updatedAt: t.timestamp(),
    priceScale: t.u32(),
  }),
);
const publicPlayerShopRequestResult = t.array(
  t.row('PublicPlayerShopRequestResult', {
    requestKey: t.string().primaryKey(),
    requesterIdentity: t.identity(),
    username: t.string(),
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.u64(),
    updatedAt: t.timestamp(),
    priceScale: t.u32(),
  }),
);
const ownPlayerShopProceedsResult = t.option(
  t.row('OwnPlayerShopProceedsResult', {
    sellerIdentity: t.identity().primaryKey(),
    gold: t.u64(),
    updatedAt: t.timestamp(),
    goldScale: t.u32(),
  }),
);
const playerShopTradeHistoryResult = t.array(
  t.row('PlayerShopTradeHistoryResult', {
    tradeId: t.uuid().primaryKey(),
    buyerIdentity: t.identity(),
    buyerUsername: t.string(),
    sellerIdentity: t.identity(),
    sellerUsername: t.string(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.u64(),
    totalPriceGold: t.u64(),
    tradedAt: t.timestamp(),
    priceScale: t.u32(),
  }),
);

export const own_player_gameplay_save = spacetimedb.view(
  { name: 'own_player_gameplay_save', public: true },
  playerGameplaySaveResult,
  (ctx) => ctx.db.playerGameplaySave.identity.find(ctx.sender) ?? undefined,
);

export const own_player_session = spacetimedb.view(
  { name: 'own_player_session', public: true },
  playerSessionResult,
  (ctx) => ctx.db.playerSession.identity.find(ctx.sender) ?? undefined,
);

export const own_player_profile = spacetimedb.view(
  { name: 'own_player_profile', public: true },
  playerProfileResult,
  (ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) {
      return undefined;
    }

    return {
      identity: player.identity,
      username: player.username,
      playerLevel: normalizePlayerLevel(player.playerLevel),
      theme: normalizePlayerTheme(player.theme),
      colorMode: normalizePlayerColorMode(player.colorMode),
      usernamePromptSeen: Boolean(player.usernamePromptSeen),
      font: normalizePlayerFont(player.font),
    };
  },
);

export const game_config_snapshot = spacetimedb.view(
  { name: 'game_config_snapshot', public: true },
  gameConfigSnapshotResult,
  (ctx) => Array.from(ctx.db.gameConfig.byUpdatedAt.filter(new Range())),
);

export const research_config_snapshot = spacetimedb.view(
  { name: 'research_config_snapshot', public: true },
  researchConfigSnapshotResult,
  (ctx) => Array.from(ctx.db.researchConfig.byGroupId.filter(new Range())),
);

export const npc_market_price_snapshot = spacetimedb.view(
  { name: 'npc_market_price_snapshot', public: true },
  npcMarketPriceSnapshotResult,
  (ctx) => Array.from(ctx.db.npcMarketPrice.byItemKind.filter(new Range())),
);

export const trade_alliance_snapshot = spacetimedb.view(
  { name: 'trade_alliance_snapshot', public: true },
  tradeAllianceSnapshotResult,
  (ctx) => Array.from(ctx.db.tradeAlliance.byTag.filter(new Range())),
);

export const trade_alliance_member_snapshot = spacetimedb.view(
  { name: 'trade_alliance_member_snapshot', public: true },
  tradeAllianceMemberSnapshotResult,
  (ctx) => Array.from(ctx.db.tradeAllianceMember.byJoinedAt.filter(new Range())),
);

export const trade_alliance_application_snapshot = spacetimedb.view(
  { name: 'trade_alliance_application_snapshot', public: true },
  tradeAllianceApplicationSnapshotResult,
  (ctx) => Array.from(ctx.db.tradeAllianceApplication.byCreatedAt.filter(new Range())),
);

export const trade_alliance_quest_progress_snapshot = spacetimedb.view(
  { name: 'trade_alliance_quest_progress_snapshot', public: true },
  tradeAllianceQuestProgressSnapshotResult,
  (ctx) => Array.from(ctx.db.tradeAllianceQuestProgress.byDayKey.filter(new Range())),
);

export const trade_alliance_quest_contribution_snapshot = spacetimedb.view(
  { name: 'trade_alliance_quest_contribution_snapshot', public: true },
  tradeAllianceQuestContributionSnapshotResult,
  (ctx) => Array.from(ctx.db.tradeAllianceQuestContribution.byAllianceId.filter(new Range())),
);

export const public_player_shop_listing = spacetimedb.view(
  { name: 'public_player_shop_listing', public: true },
  publicPlayerShopListingResult,
  (ctx) =>
    Array.from(
      ctx.db.playerShopListing.byQuantity.filter(
        new Range({ tag: 'excluded', value: 0 }),
      ),
    ),
);

export const own_player_shop_listing = spacetimedb.view(
  { name: 'own_player_shop_listing', public: true },
  publicPlayerShopListingResult,
  (ctx) => Array.from(ctx.db.playerShopListing.bySellerIdentity.filter(ctx.sender)),
);

export const public_player_shop_request = spacetimedb.view(
  { name: 'public_player_shop_request', public: true },
  publicPlayerShopRequestResult,
  (ctx) =>
    Array.from(
      ctx.db.playerShopRequest.byQuantity.filter(
        new Range({ tag: 'excluded', value: 0 }),
      ),
    ),
);

export const own_player_shop_request = spacetimedb.view(
  { name: 'own_player_shop_request', public: true },
  publicPlayerShopRequestResult,
  (ctx) => Array.from(ctx.db.playerShopRequest.byRequesterIdentity.filter(ctx.sender)),
);

export const own_player_shop_proceeds = spacetimedb.view(
  { name: 'own_player_shop_proceeds', public: true },
  ownPlayerShopProceedsResult,
  (ctx) => ctx.db.playerShopProceeds.sellerIdentity.find(ctx.sender) ?? undefined,
);

export const player_shop_trade_recent = spacetimedb.view(
  { name: 'player_shop_trade_recent', public: true },
  playerShopTradeHistoryResult,
  (ctx) => getRecentPlayerShopTrades(ctx),
);

export const own_player_shop_trade_history = spacetimedb.view(
  { name: 'own_player_shop_trade_history', public: true },
  playerShopTradeHistoryResult,
  (ctx) => getOwnPlayerShopTrades(ctx),
);

export const admin_player_gameplay_save = spacetimedb.view(
  { name: 'admin_player_gameplay_save', public: true },
  adminPlayerGameplaySaveResult,
  (ctx) => {
    if (!npcMarketAdminIdentityAllowlist.has(getIdentityHex(ctx.sender))) {
      return [];
    }

    return Array.from(ctx.db.playerGameplaySave.iter())
      .map((save) => toAdminPlayerGameplaySaveResult(save))
      .filter(
        (save): save is NonNullable<ReturnType<typeof toAdminPlayerGameplaySaveResult>> =>
          Boolean(save),
      )
      .sort((left, right) => {
        const leftUpdatedAt = left.updatedAt.microsSinceUnixEpoch;
        const rightUpdatedAt = right.updatedAt.microsSinceUnixEpoch;

        if (leftUpdatedAt < rightUpdatedAt) {
          return 1;
        }

        if (leftUpdatedAt > rightUpdatedAt) {
          return -1;
        }

        return getIdentityHex(left.identity).localeCompare(getIdentityHex(right.identity));
      });
  },
);

export const admin_player_feedback = spacetimedb.view(
  { name: 'admin_player_feedback', public: true },
  adminPlayerFeedbackResult,
  (ctx) => {
    if (!npcMarketAdminIdentityAllowlist.has(getIdentityHex(ctx.sender))) {
      return [];
    }

    return Array.from(ctx.db.playerFeedback.iter()).sort((left, right) => {
      const leftSubmittedAt = left.submittedAt.microsSinceUnixEpoch;
      const rightSubmittedAt = right.submittedAt.microsSinceUnixEpoch;

      if (leftSubmittedAt < rightSubmittedAt) {
        return 1;
      }

      if (leftSubmittedAt > rightSubmittedAt) {
        return -1;
      }

      return left.feedbackId.compareTo(right.feedbackId);
    });
  },
);

export const leaderboard_summary = spacetimedb.view(
  { name: 'leaderboard_summary', public: true },
  leaderboardSummaryResult,
  (ctx) => getLeaderboardSummaryRows(ctx),
);

export const player_info_summary = spacetimedb.view(
  { name: 'player_info_summary', public: true },
  playerInfoSummaryResult,
  (ctx) => getPlayerInfoSummaryRows(ctx),
);

export const own_trade_alliance_overview = spacetimedb.view(
  { name: 'own_trade_alliance_overview', public: true },
  ownTradeAllianceOverviewResult,
  (ctx) => {
    const member = ctx.db.tradeAllianceMember.memberIdentity.find(ctx.sender);
    if (!member) {
      return undefined;
    }

    const alliance = ctx.db.tradeAlliance.allianceId.find(member.allianceId);
    if (!alliance) {
      return undefined;
    }

    return {
      memberIdentity: member.memberIdentity,
      allianceId: alliance.allianceId,
      username: member.username,
      playerLevel: member.playerLevel,
      role: member.role,
      joinedAt: member.joinedAt,
      memberUpdatedAt: member.updatedAt,
      totalContribution: member.totalContribution,
      dailyContribution: member.dailyContribution,
      memberDayKey: member.dayKey,
      name: alliance.name,
      normalizedName: alliance.normalizedName,
      tag: alliance.tag,
      tagColor: alliance.tagColor,
      description: alliance.description,
      notice: alliance.notice,
      joinMode: alliance.joinMode,
      leaderIdentity: alliance.leaderIdentity,
      memberCount: alliance.memberCount,
      totalIncome: alliance.totalIncome,
      seasonIncome: alliance.seasonIncome,
      createdAt: alliance.createdAt,
      allianceUpdatedAt: alliance.updatedAt,
      seasonKey: alliance.seasonKey,
      dayKey: alliance.dayKey,
      dailyIncome: alliance.dailyIncome,
      monthlyIncome: alliance.monthlyIncome,
      monthKey: alliance.monthKey,
    };
  },
);

export const own_trade_alliance_chat = spacetimedb.view(
  { name: 'own_trade_alliance_chat', public: true },
  ownTradeAllianceChatResult,
  (ctx) => {
    const member = ctx.db.tradeAllianceMember.memberIdentity.find(ctx.sender);
    if (!member) {
      return [];
    }

    return Array.from(ctx.db.tradeAllianceChat.byAllianceId.filter(member.allianceId))
      .sort((left, right) => {
        const leftSentAt = left.sentAt.microsSinceUnixEpoch;
        const rightSentAt = right.sentAt.microsSinceUnixEpoch;

        if (leftSentAt < rightSentAt) {
          return -1;
        }

        if (leftSentAt > rightSentAt) {
          return 1;
        }

        return left.messageId.compareTo(right.messageId);
      })
      .slice(-40);
  },
);

export const world_chat_recent = spacetimedb.view(
  { name: 'world_chat_recent', public: true },
  worldChatRecentResult,
  (ctx) => Array.from(ctx.db.worldChat.bySentAt.filter(new Range())).slice(-40),
);

export const potion_recipe_discovery_snapshot = spacetimedb.view(
  { name: 'potion_recipe_discovery_snapshot', public: true },
  potionRecipeDiscoverySnapshotResult,
  (ctx) => Array.from(ctx.db.potionRecipeDiscovery.byDiscoveredAt.filter(new Range())),
);

export const own_trade_alliance_reward_inbox = spacetimedb.view(
  { name: 'own_trade_alliance_reward_inbox', public: true },
  ownTradeAllianceRewardInboxResult,
  (ctx) =>
    Array.from(ctx.db.tradeAllianceRewardInbox.byRecipientIdentity.filter(ctx.sender))
      .sort((left, right) => {
        const leftClaimedAt = left.claimedAt.microsSinceUnixEpoch;
        const rightClaimedAt = right.claimedAt.microsSinceUnixEpoch;

        if (leftClaimedAt < rightClaimedAt) {
          return -1;
        }

        if (leftClaimedAt > rightClaimedAt) {
          return 1;
        }

        return left.rewardKey.localeCompare(right.rewardKey);
      })
      .slice(-TRADE_ALLIANCE_REWARD_HISTORY_LIMIT),
);

type IdleWizardSchema = InferSchema<typeof spacetimedb>;
type IdleWizardReducerCtx = ReducerCtx<IdleWizardSchema>;
type PlayerGameplaySaveRowValue = {
  identity: Identity;
  saveJson: string;
  updatedAt: { microsSinceUnixEpoch: bigint };
};

function normalizeIdentityHex(identityHex: string): string {
  return String(identityHex ?? '')
    .trim()
    .toLowerCase()
    .replace(/^0x/, '');
}

function getIdentityHex(identity: { toHexString: () => string }): string {
  return normalizeIdentityHex(identity.toHexString());
}

function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

function stripUnsafeTextControls(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}]/gu, '');
}

function normalizeUsername(username: string): string {
  const value = stripUnsafeTextControls(String(username ?? ''))
    .trim()
    .replace(/\s+/g, ' ');
  const normalizedUsername = (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);

  if (isReservedUsername(normalizedUsername)) {
    return DEFAULT_USERNAME;
  }

  return normalizedUsername;
}

function normalizePlayerTheme(theme: string): string {
  const value = String(theme ?? '').trim();
  const normalizedValue = PLAYER_THEME_ALIASES.get(value) ?? value;
  return PLAYER_THEMES.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_THEME;
}

function normalizePlayerFont(font: string): string {
  const value = String(font ?? '').trim();
  const normalizedValue = PLAYER_FONT_ALIASES.get(value) ?? value;
  return PLAYER_FONTS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_FONT;
}

function normalizePlayerColorMode(colorMode: string): string {
  const value = String(colorMode ?? '').trim();
  return PLAYER_COLOR_MODES.has(value) ? value : DEFAULT_PLAYER_COLOR_MODE;
}

function assertUsernameAvailableForIdentity(
  ctx: IdleWizardReducerCtx,
  username: string,
  identity: Identity,
) {
  const requestedUsername = username.toLowerCase();

  if (requestedUsername === DEFAULT_USERNAME) {
    return;
  }

  for (const player of ctx.db.player.iter()) {
    if (
      player.username.toLowerCase() === requestedUsername &&
      !player.identity.isEqual(identity)
    ) {
      throw new Error('Username is already taken.');
    }
  }
}

function assertUsernameAvailable(ctx: IdleWizardReducerCtx, username: string) {
  assertUsernameAvailableForIdentity(ctx, username, ctx.sender);
}

function normalizePlayerLevel(playerLevel: unknown): number {
  if (!ENABLE_CLIENT_REPORTED_PLAYER_LEVEL) {
    return DEFAULT_PLAYER_LEVEL;
  }

  const value = Math.floor(Number(playerLevel));

  if (!Number.isFinite(value) || value < DEFAULT_PLAYER_LEVEL) {
    return DEFAULT_PLAYER_LEVEL;
  }

  return Math.min(value, MAX_REPORTED_PLAYER_LEVEL);
}

function validateAdminPlayerLevel(playerLevel: unknown): number {
  const value = Math.floor(Number(playerLevel));

  if (
    !Number.isInteger(value) ||
    value < DEFAULT_PLAYER_LEVEL ||
    value > MAX_REPORTED_PLAYER_LEVEL
  ) {
    throw new Error('Invalid player level.');
  }

  return value;
}

function findPlayerByIdentityHex(ctx: IdleWizardReducerCtx, identityHex: string) {
  const safeIdentityHex = normalizeIdentityHex(identityHex);

  if (!safeIdentityHex) {
    throw new Error('Player identity is required.');
  }

  for (const player of ctx.db.player.iter()) {
    if (getIdentityHex(player.identity) === safeIdentityHex) {
      return player;
    }
  }

  throw new Error('Player not found.');
}

function normalizeWorldChatMessage(body: string): string {
  return stripUnsafeTextControls(String(body ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_WORLD_CHAT_MESSAGE_LENGTH);
}

function formatPotionDiscoveryRecipeText(potionKey: string): string {
  const recipe = potionRecipeCatalogByPotionKey.get(potionKey);

  if (!recipe) {
    return '';
  }

  return recipe.ingredients
    .map((ingredient) => {
      const quantity = Math.floor(Number(ingredient.quantity));
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const catalogItem = npcMarketCatalogByItemKey.get(ingredient.itemKey);
      const label = catalogItem?.itemLabel ?? ingredient.itemKey;
      return `${safeQuantity} ${label}`;
    })
    .join(', ');
}

function formatPotionDiscoveryAnnouncementBody(
  username: string,
  potionKey: string,
  potionLabel: string,
): string {
  const recipeText = formatPotionDiscoveryRecipeText(potionKey);
  const body = recipeText
    ? `${username} unlocked the recipe of ${potionLabel}: ${recipeText}`
    : `${username} unlocked the recipe of ${potionLabel}`;

  return normalizeWorldChatMessage(body);
}

function normalizeFeedbackBody(body: string): string {
  return String(body ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim()
    .slice(0, MAX_FEEDBACK_BODY_LENGTH);
}

function normalizeTradeAllianceName(name: string): string {
  return stripUnsafeTextControls(String(name ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_TRADE_ALLIANCE_NAME_LENGTH);
}

function getTradeAllianceNormalizedName(name: string): string {
  return normalizeTradeAllianceName(name).toLowerCase();
}

function validateTradeAllianceName(name: string): string {
  const safeName = normalizeTradeAllianceName(name);

  if (safeName.length < MIN_TRADE_ALLIANCE_NAME_LENGTH) {
    throw new Error('Alliance name is too short.');
  }

  return safeName;
}

function validateTradeAllianceTag(tag: string): string {
  const safeTag = stripUnsafeTextControls(String(tag ?? '')).trim().toUpperCase();

  if (!/^[A-Z]{2,5}$/.test(safeTag)) {
    throw new Error('Alliance tag must be 2-5 uppercase English letters.');
  }

  return safeTag;
}

function normalizeTradeAllianceTagColor(tagColor: string | undefined): string {
  const safeTagColor = String(tagColor ?? '').trim().toLowerCase();

  return TRADE_ALLIANCE_TAG_COLORS.has(safeTagColor)
    ? safeTagColor
    : DEFAULT_TRADE_ALLIANCE_TAG_COLOR;
}

function normalizeTradeAllianceDescription(description: string): string {
  return stripUnsafeTextControls(String(description ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_TRADE_ALLIANCE_DESCRIPTION_LENGTH);
}

function normalizeTradeAllianceNotice(notice: string): string {
  return stripUnsafeTextControls(String(notice ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_TRADE_ALLIANCE_NOTICE_LENGTH);
}

function normalizeTradeAllianceJoinMode(joinMode: string): string {
  const safeJoinMode = String(joinMode ?? '').trim();

  return TRADE_ALLIANCE_JOIN_MODES.has(safeJoinMode) ? safeJoinMode : 'apply';
}

function validateTradeAllianceRole(role: string): string {
  const safeRole = String(role ?? '').trim();

  if (!TRADE_ALLIANCE_ROLE_SET.has(safeRole)) {
    throw new Error('Invalid alliance role.');
  }

  return safeRole;
}

function getTradeAllianceRolePower(role: string): number {
  return TRADE_ALLIANCE_ROLE_POWER.get(role) ?? 0;
}

function getTradeAllianceRoleCap(role: string): number {
  return TRADE_ALLIANCE_ROLE_CAPS.get(role) ?? MAX_TRADE_ALLIANCE_MEMBERS;
}

function getTradeAllianceIdKey(allianceId: unknown): string {
  if (!allianceId) {
    return '';
  }

  if (typeof allianceId === 'string') {
    return allianceId;
  }

  if (
    typeof allianceId === 'object' &&
    allianceId !== null &&
    'toHexString' in allianceId &&
    typeof allianceId.toHexString === 'function'
  ) {
    return allianceId.toHexString();
  }

  return String(allianceId);
}

function floorDivBigInt(value: bigint, divisor: bigint): bigint {
  if (value >= 0n) {
    return value / divisor;
  }

  return -((-value + divisor - 1n) / divisor);
}

function getContextTimestampMicros(ctx: { timestamp?: Timestamp }): bigint {
  return ctx.timestamp?.microsSinceUnixEpoch ?? Timestamp.now().microsSinceUnixEpoch;
}

function getAnchoredPeriodKey(ctx: IdleWizardReducerCtx, daySpan: bigint): string {
  return String(
    floorDivBigInt(
      getContextTimestampMicros(ctx) - PERIOD_LOOP_ANCHOR_MICROS,
      daySpan * PERIOD_DAY_MICROS,
    ),
  );
}

function getDailyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return String(getContextTimestampMicros(ctx) / PERIOD_DAY_MICROS);
}

function getWeeklyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return getAnchoredPeriodKey(ctx, PERIOD_WEEK_DAYS);
}

function getMonthlyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return getAnchoredPeriodKey(ctx, PERIOD_MONTH_DAYS);
}

function getTradeAllianceDayKey(ctx: IdleWizardReducerCtx): string {
  return getDailyPeriodKey(ctx);
}

function getTradeAllianceSeasonKey(ctx: IdleWizardReducerCtx): string {
  return getWeeklyPeriodKey(ctx);
}

function getTradeAllianceMonthKey(ctx: IdleWizardReducerCtx): string {
  return getMonthlyPeriodKey(ctx);
}

function getTradeAllianceQuestPeriodKey(ctx: IdleWizardReducerCtx): string {
  return getWeeklyPeriodKey(ctx);
}

function getTradeAllianceApplicationKey(allianceId: unknown, identity: Identity): string {
  return `${getTradeAllianceIdKey(allianceId)}:${getIdentityHex(identity)}`;
}

function getTradeAllianceQuestKey(allianceId: unknown, dayKey: string, questId: string): string {
  return `${dayKey}:${getTradeAllianceIdKey(allianceId)}:${questId}`;
}

function getTradeAllianceContributionKey(
  allianceId: unknown,
  dayKey: string,
  questId: string,
  identity: Identity,
): string {
  return `${getTradeAllianceQuestKey(allianceId, dayKey, questId)}:${getIdentityHex(identity)}`;
}

function getTradeAllianceRewardKey(dayKey: string, questId: string, identity: Identity): string {
  return `${dayKey}:${questId}:${getIdentityHex(identity)}`;
}

function hasTradeAllianceRewardClaimForPeriod(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  dayKey: string,
  questId: string,
): boolean {
  return Array.from(ctx.db.tradeAllianceRewardInbox.iter()).some(
    (reward) =>
      reward.recipientIdentity.isEqual(identity) &&
      reward.dayKey === dayKey &&
      reward.questId === questId,
  );
}

function normalizeResearchName(researchName: string): string {
  return stripUnsafeTextControls(String(researchName ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_RESEARCH_NAME_LENGTH);
}

function normalizeResearchId(researchId: string): string {
  return String(researchId ?? '')
    .trim()
    .slice(0, MAX_RESEARCH_ID_LENGTH);
}

function normalizeResearchLabel(label: string): string {
  return stripUnsafeTextControls(String(label ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_RESEARCH_LABEL_LENGTH);
}

function normalizeResearchGroupId(groupId: string): string {
  return String(groupId ?? '')
    .trim()
    .slice(0, MAX_RESEARCH_GROUP_ID_LENGTH);
}

function normalizePlayerShopText(value: string, maxLength: number): string {
  return stripUnsafeTextControls(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function getPlayerShopCatalogItem(itemKey: string) {
  const safeItemKey = normalizePlayerShopText(itemKey, MAX_ITEM_KEY_LENGTH);
  const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);

  if (!catalogItem) {
    throw new Error('Unknown player shop item.');
  }

  return catalogItem;
}

function validatePlayerShopQuantity(quantity: number): number {
  const safeQuantity = Math.floor(Number(quantity));

  if (
    !Number.isInteger(safeQuantity) ||
    safeQuantity < 1 ||
    safeQuantity > MAX_PLAYER_SHOP_LISTING_QUANTITY
  ) {
    throw new Error('Invalid player shop quantity.');
  }

  return safeQuantity;
}

function validatePlayerShopPriceGold(priceGold: bigint | number): number {
  const safePriceGold = normalizeGoldPrice(priceGold);

  if (
    safePriceGold === null ||
    safePriceGold < 0.01 ||
    safePriceGold > MAX_PLAYER_SHOP_PRICE_GOLD
  ) {
    throw new Error('Invalid player shop price.');
  }

  return safePriceGold;
}

function normalizePotionKey(potionKey: string): string {
  return String(potionKey ?? '')
    .trim()
    .slice(0, MAX_ITEM_KEY_LENGTH);
}

function getUnknownPotionCatalogItem(potionKey: string) {
  const safePotionKey = normalizePotionKey(potionKey);
  const catalogItem = unknownPotionCatalogByKey.get(safePotionKey);

  if (!catalogItem) {
    throw new Error('Unknown discoverable potion.');
  }

  return catalogItem;
}

function getPlayerShopListingKey(ctx: IdleWizardReducerCtx, slotNumber: number): string {
  return `${ctx.sender.toHexString()}:${slotNumber}`;
}

function getPlayerShopListingKeyForIdentity(identity: Identity, slotNumber: number): string {
  return `${identity.toHexString()}:${slotNumber}`;
}

function getPlayerShopRequestKey(ctx: IdleWizardReducerCtx, slotNumber: number): string {
  return getPlayerShopRequestKeyForIdentity(ctx.sender, slotNumber);
}

function getPlayerShopRequestKeyForIdentity(identity: Identity, slotNumber: number): string {
  return `${identity.toHexString()}:${slotNumber}`;
}

function addClaimablePlayerShopGold(
  ctx: IdleWizardReducerCtx,
  recipientIdentity: Identity,
  gold: number,
  { clampToCap = false }: { clampToCap?: boolean } = {},
): number {
  const safeGold = normalizeGoldPrice(gold);

  if (safeGold === null || safeGold <= 0) {
    return 0;
  }

  const existingProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(recipientIdentity);
  const currentProceedsGold = existingProceeds
    ? decodeStoredGoldPrice(existingProceeds.gold, existingProceeds.goldScale) ?? 0
    : 0;
  let nextProceedsGold = roundGoldPrice(currentProceedsGold + safeGold);

  if (nextProceedsGold > MAX_PLAYER_SHOP_PROCEEDS_GOLD) {
    if (!clampToCap) {
      throw new Error('Player shop proceeds are too high.');
    }

    nextProceedsGold = MAX_PLAYER_SHOP_PROCEEDS_GOLD;
  }

  if (nextProceedsGold <= currentProceedsGold) {
    return 0;
  }

  if (existingProceeds) {
    ctx.db.playerShopProceeds.sellerIdentity.update({
      ...existingProceeds,
      gold: toStoredGoldPrice(nextProceedsGold),
      goldScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });
  } else {
    ctx.db.playerShopProceeds.insert({
      sellerIdentity: recipientIdentity,
      gold: toStoredGoldPrice(nextProceedsGold),
      goldScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });
  }

  return roundGoldPrice(nextProceedsGold - currentProceedsGold);
}

function grantPotionDiscoveryPassiveGold(
  ctx: IdleWizardReducerCtx,
  potionKey: string,
  incomeGold: number,
  sellerIdentity: Identity,
): number {
  const discovery = ctx.db.potionRecipeDiscovery.potionKey.find(normalizePotionKey(potionKey));

  if (!discovery || discovery.discoveredByIdentity.isEqual(sellerIdentity)) {
    return 0;
  }

  const passiveGold = roundGoldPrice(
    (incomeGold * POTION_DISCOVERY_PASSIVE_GOLD_BPS) / 10_000,
  );

  const grantedGold = addClaimablePlayerShopGold(
    ctx,
    discovery.discoveredByIdentity,
    passiveGold,
    { clampToCap: true },
  );

  if (grantedGold <= 0) {
    return 0;
  }

  const currentRoyaltyGold =
    decodeStoredGoldPrice(discovery.royaltyGold, discovery.royaltyGoldScale) ?? 0;
  const nextRoyaltyGold = roundGoldPrice(currentRoyaltyGold + grantedGold);

  ctx.db.potionRecipeDiscovery.potionKey.update({
    ...discovery,
    royaltyGold: toStoredGoldPrice(nextRoyaltyGold),
    royaltyGoldScale: GOLD_PRICE_SCALE,
  });

  return grantedGold;
}

function findTradeAllianceById(ctx: IdleWizardReducerCtx, allianceId: string) {
  const safeAllianceId = String(allianceId ?? '').trim();

  if (!safeAllianceId) {
    throw new Error('Alliance is required.');
  }

  for (const alliance of ctx.db.tradeAlliance.iter()) {
    if (getTradeAllianceIdKey(alliance.allianceId) === safeAllianceId) {
      return alliance;
    }
  }

  throw new Error('Alliance not found.');
}

function findTradeAllianceByTag(ctx: IdleWizardReducerCtx, tag: string) {
  const safeTag = validateTradeAllianceTag(tag);

  for (const alliance of ctx.db.tradeAlliance.iter()) {
    if (alliance.tag === safeTag) {
      return alliance;
    }
  }

  return null;
}

function assertTradeAllianceNameAvailable(
  ctx: IdleWizardReducerCtx,
  normalizedName: string,
  currentAllianceId = '',
) {
  for (const alliance of ctx.db.tradeAlliance.iter()) {
    if (
      alliance.normalizedName === normalizedName &&
      getTradeAllianceIdKey(alliance.allianceId) !== currentAllianceId
    ) {
      throw new Error('Alliance name is already taken.');
    }
  }
}

function assertTradeAllianceTagAvailable(
  ctx: IdleWizardReducerCtx,
  tag: string,
  currentAllianceId = '',
) {
  for (const alliance of ctx.db.tradeAlliance.iter()) {
    if (
      alliance.tag === tag &&
      getTradeAllianceIdKey(alliance.allianceId) !== currentAllianceId
    ) {
      throw new Error('Alliance tag is already taken.');
    }
  }
}

function getTradeAllianceMember(ctx: IdleWizardReducerCtx, identity = ctx.sender) {
  return ctx.db.tradeAllianceMember.memberIdentity.find(identity) ?? null;
}

function getTradeAllianceMembers(ctx: IdleWizardReducerCtx, allianceId: unknown) {
  const allianceKey = getTradeAllianceIdKey(allianceId);
  const indexedMembers =
    allianceId && typeof allianceId === 'object' && 'compareTo' in allianceId
      ? ctx.db.tradeAllianceMember.byAllianceId.filter(allianceId as Uuid)
      : ctx.db.tradeAllianceMember.iter();

  return Array.from(indexedMembers).filter(
    (member) => getTradeAllianceIdKey(member.allianceId) === allianceKey,
  );
}

function getTradeAllianceMemberCount(ctx: IdleWizardReducerCtx, allianceId: unknown): number {
  return getTradeAllianceMembers(ctx, allianceId).length;
}

function getTradeAllianceRoleCount(
  ctx: IdleWizardReducerCtx,
  allianceId: unknown,
  role: string,
): number {
  return getTradeAllianceMembers(ctx, allianceId).filter((member) => member.role === role).length;
}

function assertTradeAllianceRoleCap(
  ctx: IdleWizardReducerCtx,
  allianceId: unknown,
  role: string,
  targetIdentity?: Identity,
) {
  const cap = getTradeAllianceRoleCap(role);
  const count = getTradeAllianceMembers(ctx, allianceId).filter(
    (member) => member.role === role && !member.memberIdentity.isEqual(targetIdentity ?? ctx.sender),
  ).length;

  if (count >= cap) {
    throw new Error('Alliance role is full.');
  }
}

function assertTradeAllianceCanManageApplications(ctx: IdleWizardReducerCtx, allianceId: unknown) {
  const member = getTradeAllianceMember(ctx);

  if (
    !member ||
    getTradeAllianceIdKey(member.allianceId) !== getTradeAllianceIdKey(allianceId) ||
    getTradeAllianceRolePower(member.role) < getTradeAllianceRolePower(TRADE_ALLIANCE_ROLE_FACTOR)
  ) {
    throw new Error('Alliance applications require factor role.');
  }

  return member;
}

function assertTradeAllianceCanManageMember(
  ctx: IdleWizardReducerCtx,
  allianceId: unknown,
  targetMember: { memberIdentity: Identity; role: string; allianceId: unknown },
) {
  const actor = getTradeAllianceMember(ctx);

  if (!actor || getTradeAllianceIdKey(actor.allianceId) !== getTradeAllianceIdKey(allianceId)) {
    throw new Error('Alliance role required.');
  }

  if (targetMember.memberIdentity.isEqual(ctx.sender)) {
    throw new Error('Cannot change your own alliance role this way.');
  }

  const actorPower = getTradeAllianceRolePower(actor.role);
  const targetPower = getTradeAllianceRolePower(targetMember.role);

  if (actor.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
    return actor;
  }

  if (actor.role === TRADE_ALLIANCE_ROLE_QUARTERMASTER && targetPower < actorPower) {
    return actor;
  }

  if (actor.role === TRADE_ALLIANCE_ROLE_FACTOR && targetPower < actorPower) {
    return actor;
  }

  throw new Error('Alliance role is not high enough.');
}

function assertTradeAllianceCanAssignRole(
  actor: { role: string },
  targetRole: string,
) {
  const actorPower = getTradeAllianceRolePower(actor.role);
  const targetPower = getTradeAllianceRolePower(targetRole);

  if (actor.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
    return;
  }

  if (
    actor.role === TRADE_ALLIANCE_ROLE_QUARTERMASTER &&
    targetPower < actorPower &&
    targetRole !== TRADE_ALLIANCE_ROLE_TRADE_MASTER
  ) {
    return;
  }

  if (
    actor.role === TRADE_ALLIANCE_ROLE_FACTOR &&
    (targetRole === TRADE_ALLIANCE_ROLE_BROKER ||
      targetRole === TRADE_ALLIANCE_ROLE_TRADER)
  ) {
    return;
  }

  throw new Error('Alliance role is not assignable.');
}

function updateTradeAllianceMemberProfile(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  username: string,
  playerLevel: number,
) {
  const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);

  if (member) {
    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...member,
      username,
      playerLevel,
      updatedAt: ctx.timestamp,
    });
  }

  for (const application of ctx.db.tradeAllianceApplication.byApplicantIdentity.filter(identity)) {
    ctx.db.tradeAllianceApplication.applicationKey.update({
      ...application,
      username,
      playerLevel,
    });
  }
}

function validatePlayerShopSlotNumber(slotNumber: number): number {
  const safeSlotNumber = Math.floor(Number(slotNumber));

  if (safeSlotNumber < 1 || safeSlotNumber > MAX_PLAYER_SHOP_SLOTS) {
    throw new Error('Invalid player shop slot.');
  }

  return safeSlotNumber;
}

function normalizeNpcMarketItemKey(itemKey: string): string {
  return String(itemKey ?? '')
    .trim()
    .slice(0, MAX_ITEM_KEY_LENGTH);
}

function validateNpcMarketQuantity(quantity: number): number {
  const safeQuantity = Math.floor(Number(quantity));

  if (
    !Number.isInteger(safeQuantity) ||
    safeQuantity < 1 ||
    safeQuantity > NPC_MARKET_MAX_TRADE_QUANTITY
  ) {
    throw new Error('Invalid NPC market quantity.');
  }

  return safeQuantity;
}

function getNpcMarketCatalogItem(itemKey: string) {
  const safeItemKey = normalizeNpcMarketItemKey(itemKey);
  const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);

  if (!catalogItem) {
    throw new Error('Unknown NPC market item.');
  }

  return catalogItem;
}

function clampBigInt(value: bigint, min: bigint, max: bigint): bigint {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function clampNumber(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function roundGoldPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeGoldPrice(value: bigint | number): number | null {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return roundGoldPrice(number);
}

function normalizeGoldScale(value: bigint | number | undefined): number {
  const scale = typeof value === 'bigint' ? Number(value) : Number(value);

  return scale === GOLD_PRICE_SCALE ? GOLD_PRICE_SCALE : 1;
}

function decodeStoredGoldPrice(
  value: bigint | number,
  scaleValue?: bigint | number,
): number | null {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return roundGoldPrice(number / normalizeGoldScale(scaleValue));
}

function toStoredGoldPrice(value: number): bigint {
  const safeValue = normalizeGoldPrice(value);

  if (safeValue === null) {
    return 0n;
  }

  return BigInt(Math.round(safeValue * GOLD_PRICE_SCALE));
}

function toBigInt(value: bigint | number): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  return BigInt(Math.max(0, Math.floor(Number(value) || 0)));
}

function normalizeNpcMarketBasePriceGold(
  value: bigint | number,
  fallback: number,
  scaleValue?: bigint | number,
): number {
  const safeValue = decodeStoredGoldPrice(value, scaleValue);

  if (safeValue === null || safeValue < 0.01 || safeValue > NPC_MARKET_MAX_BASE_PRICE_GOLD) {
    return fallback;
  }

  return safeValue;
}

function validateNpcMarketBasePriceGold(basePriceGold: bigint | number): number {
  const safeBasePriceGold = normalizeGoldPrice(basePriceGold);

  if (
    safeBasePriceGold === null ||
    safeBasePriceGold < 0.01 ||
    safeBasePriceGold > NPC_MARKET_MAX_BASE_PRICE_GOLD
  ) {
    throw new Error('Invalid NPC market base price.');
  }

  return safeBasePriceGold;
}

function normalizeNpcMarketTargetStock(value: bigint | number, fallback: bigint): bigint {
  const safeValue = toBigInt(value);

  if (safeValue < 1n || safeValue > NPC_MARKET_MAX_TARGET_STOCK) {
    return fallback;
  }

  return safeValue;
}

function validateNpcMarketTargetStock(targetStock: bigint | number): bigint {
  const safeTargetStock = toBigInt(targetStock);

  if (safeTargetStock < 1n || safeTargetStock > NPC_MARKET_MAX_TARGET_STOCK) {
    throw new Error('Invalid NPC market target stock.');
  }

  return safeTargetStock;
}

function normalizeNpcMarketVolatilityBps(value: bigint | number, fallback: bigint): bigint {
  const safeValue = toBigInt(value);

  if (safeValue > NPC_MARKET_MAX_VOLATILITY_BPS) {
    return fallback;
  }

  return safeValue;
}

function validateNpcMarketVolatilityBps(volatilityBps: bigint | number): bigint {
  const safeVolatilityBps = toBigInt(volatilityBps);

  if (safeVolatilityBps > NPC_MARKET_MAX_VOLATILITY_BPS) {
    throw new Error('Invalid NPC market volatility.');
  }

  return safeVolatilityBps;
}

function normalizeResearchCostGold(value: bigint | number, fallback: bigint): bigint {
  const safeValue = toBigInt(value);

  if (safeValue > MAX_RESEARCH_COST_GOLD) {
    return fallback;
  }

  return safeValue;
}

function normalizeStoredResearchCostGold(
  researchId: string,
  value: bigint | number,
  fallback: bigint,
): bigint {
  const costGold = normalizeResearchCostGold(value, fallback);
  const legacyCostGoldValues = researchLegacyCostGoldById[researchId] ?? [];

  if (legacyCostGoldValues.some((legacyCostGold) => costGold === legacyCostGold)) {
    return fallback;
  }

  return costGold;
}

function validateResearchCostGold(costGold: bigint | number): bigint {
  const safeCostGold = toBigInt(costGold);

  if (safeCostGold > MAX_RESEARCH_COST_GOLD) {
    throw new Error('Invalid research cost.');
  }

  return safeCostGold;
}

function normalizeResearchDurationSeconds(value: bigint | number, fallback: bigint): bigint {
  const safeValue = toBigInt(value);

  if (safeValue <= 0n || safeValue > MAX_RESEARCH_DURATION_SECONDS) {
    return fallback;
  }

  return safeValue;
}

function normalizeStoredResearchDurationSeconds(
  researchId: string,
  value: bigint | number,
  fallback: bigint,
): bigint {
  const durationSeconds = normalizeResearchDurationSeconds(value, fallback);
  const legacyDurationSeconds = researchLegacyDurationSecondsById[researchId];

  if (legacyDurationSeconds !== undefined && durationSeconds === legacyDurationSeconds) {
    return fallback;
  }

  return durationSeconds;
}

function validateResearchDurationSeconds(durationSeconds: bigint | number): bigint {
  const safeDurationSeconds = toBigInt(durationSeconds);

  if (safeDurationSeconds <= 0n || safeDurationSeconds > MAX_RESEARCH_DURATION_SECONDS) {
    throw new Error('Invalid research duration.');
  }

  return safeDurationSeconds;
}

function normalizeGameConfigKey(configKey: string): string {
  return String(configKey ?? '')
    .trim()
    .slice(0, MAX_GAME_CONFIG_KEY_LENGTH);
}

function normalizeMaintenanceMode(mode: unknown): string {
  const value = String(mode ?? MAINTENANCE_MODE_OFF).trim().toLowerCase();

  if (MAINTENANCE_MODES.has(value)) {
    return value;
  }

  throw new Error('Invalid maintenance mode.');
}

function normalizeMaintenanceMessage(message: unknown): string {
  const value = String(message ?? 'maintenance in progress')
    .trim()
    .slice(0, MAX_MAINTENANCE_MESSAGE_LENGTH);

  return value || 'maintenance in progress';
}

function normalizeMaintenanceKey(value: unknown): string {
  const key = String(value ?? '')
    .trim()
    .slice(0, MAX_MAINTENANCE_KEY_LENGTH);

  if (!key) {
    throw new Error('Maintenance key is required.');
  }

  return key;
}

function validateGameConfigJson(configKey: string, configJson: string): string {
  const value = String(configJson ?? '').trim();

  if (!value || value.length > MAX_GAME_CONFIG_JSON_LENGTH) {
    throw new Error('Invalid game config JSON length.');
  }

  let parsedConfig: unknown;

  try {
    parsedConfig = JSON.parse(value);
  } catch {
    throw new Error('Invalid game config JSON.');
  }

  validateGameConfigValue(configKey, parsedConfig);
  const normalizedValue = normalizeGameConfigJson(configKey, parsedConfig, value);

  if (normalizedValue.length > MAX_GAME_CONFIG_JSON_LENGTH) {
    throw new Error('Invalid game config JSON length.');
  }

  return normalizedValue;
}

function normalizeGameConfigJson(
  configKey: string,
  parsedConfig: unknown,
  originalJson: string,
): string {
  if (
    configKey === 'tradeAlliance' &&
    (isLegacyTradeAllianceGameConfig(parsedConfig) ||
      isIncomeOnlyTradeAllianceGameConfig(parsedConfig))
  ) {
    return DEFAULT_TRADE_ALLIANCE_CONFIG_JSON;
  }

  if (configKey === 'potionRecipes' && isRecord(parsedConfig)) {
    return normalizePotionRecipesGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey === 'items' && isRecord(parsedConfig)) {
    return normalizeItemsGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey === 'tasks' && isRecord(parsedConfig)) {
    return normalizeTasksGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey === 'research' && isRecord(parsedConfig)) {
    const normalizedResearchConfig = { ...parsedConfig };
    let changed = false;
    const defaultResearchCostsGold = toNumberRecord(researchDefaultCostGoldById);

    if (isRecord(parsedConfig.researchCostsGold)) {
      const existingCostsGold = parsedConfig.researchCostsGold;
      const missingGoldCost = Object.keys(defaultResearchCostsGold).some(
        (researchId) => existingCostsGold[researchId] === undefined,
      );
      const nextCostsGold = {
        ...defaultResearchCostsGold,
        ...existingCostsGold,
      };
      const replacedLegacyGoldCost = Object.entries(researchLegacyCostGoldById).some(
        ([researchId, legacyCostGoldValues]) => {
          const currentCostGold = Number(nextCostsGold[researchId]);
          if (
            !legacyCostGoldValues.some(
              (legacyCostGold) => currentCostGold === Number(legacyCostGold),
            )
          ) {
            return false;
          }

          nextCostsGold[researchId] = defaultResearchCostsGold[researchId];
          return true;
        },
      );

      if (missingGoldCost || replacedLegacyGoldCost) {
        normalizedResearchConfig.researchCostsGold = nextCostsGold;
        changed = true;
      }
    } else {
      normalizedResearchConfig.researchCostsGold = defaultResearchCostsGold;
      changed = true;
    }

    if (isRecord(parsedConfig.researchCostsRuby)) {
      const existingCostsRuby = parsedConfig.researchCostsRuby;
      const missingRubyCost = Object.keys(researchDefaultCostRubyById).some(
        (researchId) => existingCostsRuby[researchId] === undefined,
      );

      if (missingRubyCost) {
        normalizedResearchConfig.researchCostsRuby = {
          ...researchDefaultCostRubyById,
          ...existingCostsRuby,
        };
        changed = true;
      }
    } else {
      normalizedResearchConfig.researchCostsRuby = researchDefaultCostRubyById;
      changed = true;
    }

    const defaultResearchDurationsSeconds = toNumberRecord(
      researchDefaultDurationSecondsById,
    );

    if (isRecord(parsedConfig.researchDurationsSeconds)) {
      const existingDurations = parsedConfig.researchDurationsSeconds;
      const missingDuration = Object.keys(defaultResearchDurationsSeconds).some(
        (researchId) => existingDurations[researchId] === undefined,
      );

      if (missingDuration) {
        normalizedResearchConfig.researchDurationsSeconds = {
          ...defaultResearchDurationsSeconds,
          ...existingDurations,
        };
        changed = true;
      }
    } else {
      normalizedResearchConfig.researchDurationsSeconds =
        defaultResearchDurationsSeconds;
      changed = true;
    }

    return changed ? JSON.stringify(normalizedResearchConfig) : originalJson;
  }

  if (configKey !== 'playerLevel' || !isRecord(parsedConfig)) {
    return originalJson;
  }

  if (readPlayerLevelCrystalPerLevel(parsedConfig) !== undefined) {
    return originalJson;
  }

  const crystal = isRecord(parsedConfig.crystal) ? parsedConfig.crystal : {};

  return JSON.stringify({
    ...parsedConfig,
    crystal: {
      ...crystal,
      perLevel: DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL,
    },
  });
}

function isLegacyTradeAllianceGameConfig(parsedConfig: unknown): boolean {
  if (!isRecord(parsedConfig)) {
    return false;
  }

  const quests = parsedConfig.weeklyQuests ?? parsedConfig.dailyQuests;
  if (!Array.isArray(quests) || quests.length !== 3) {
    return false;
  }

  return (
    isLegacyTradeAllianceQuestConfig(
      quests[0],
      'allianceIncomeEasy',
      'small caravan',
      500,
      25,
      1,
    ) &&
    isLegacyTradeAllianceQuestConfig(
      quests[1],
      'allianceIncomeMedium',
      'busy road',
      2_000,
      100,
      2,
    ) &&
    isLegacyTradeAllianceQuestConfig(
      quests[2],
      'allianceIncomeHard',
      'long route',
      8_000,
      400,
      3,
    )
  );
}

function isIncomeOnlyTradeAllianceGameConfig(parsedConfig: unknown): boolean {
  if (!isRecord(parsedConfig)) {
    return false;
  }

  const quests = parsedConfig.weeklyQuests ?? parsedConfig.dailyQuests;
  if (!Array.isArray(quests) || quests.length !== 3) {
    return false;
  }

  return (
    isLegacyTradeAllianceQuestConfig(
      quests[0],
      'allianceIncomeEasy',
      'hard route',
      10_000,
      500,
      2,
    ) &&
    isLegacyTradeAllianceQuestConfig(
      quests[1],
      'allianceIncomeMedium',
      'bulk route',
      50_000,
      2_500,
      5,
    ) &&
    isLegacyTradeAllianceQuestConfig(
      quests[2],
      'allianceIncomeHard',
      'grand route',
      250_000,
      12_500,
      12,
    )
  );
}

function normalizeTasksGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  const levels = parsedConfig.levels;

  if (!Array.isArray(levels)) {
    return originalJson;
  }

  if (shouldResetTasksGameConfigToDefault(levels)) {
    return DEFAULT_TASKS_CONFIG_JSON;
  }

  const normalizedLevels = normalizeLegacyLevel5Tasks(levels);

  if (normalizedLevels === levels) {
    return originalJson;
  }

  return JSON.stringify({
    ...parsedConfig,
    levels: normalizedLevels,
  });
}

function shouldResetTasksGameConfigToDefault(levels: unknown[]): boolean {
  return hasNonDefaultLevelOneTasks(levels) ||
    hasLegacyLevelTwoSageTasks(levels) ||
    hasLegacyShortTaskCatalog(levels) ||
    hasSameFamilySeedItemRequirementsAfterTutorial(levels);
}

function hasNonDefaultLevelOneTasks(levels: unknown[]): boolean {
  const levelOneTasks = getTaskConfigsForLevel(levels, 1);
  const defaultLevelOneTasks = DEFAULT_TASKS_CONFIG.levels[0]?.tasks ?? [];

  return !taskConfigListsMatch(levelOneTasks, defaultLevelOneTasks);
}

function hasLegacyShortTaskCatalog(levels: unknown[]): boolean {
  const defaultLevelCount = DEFAULT_TASKS_CONFIG.levels.length;

  if (levels.length >= defaultLevelCount) {
    return false;
  }

  return hasTaskConfigId(levels, 'level6-mandrake-herb') ||
    hasTaskConfigId(levels, 'level8-glowcap-herb') ||
    hasTaskConfigId(levels, 'level20-sage-seeds');
}

function hasLegacyLevelTwoSageTasks(levels: unknown[]): boolean {
  const levelTwoTasks = getTaskConfigsForLevel(levels, 2);

  return taskConfigListsMatch(levelTwoTasks, [
    { id: 'level2-sage-seeds', itemKey: 'sageSeed', quantity: 20 },
    { id: 'level2-sage-herb', itemKey: 'sageHerb', quantity: 6 },
  ]) || taskConfigListsMatch(levelTwoTasks, [
    { id: 'level2-sage-seeds', itemKey: 'sageSeed', quantity: 10 },
    { id: 'level2-sage-herb', itemKey: 'sageHerb', quantity: 3 },
  ]);
}

function hasSameFamilySeedItemRequirementsAfterTutorial(levels: unknown[]): boolean {
  for (const levelConfig of levels) {
    if (!isRecord(levelConfig) || Number(levelConfig.level) < 4) {
      continue;
    }

    const tasks = Array.isArray(levelConfig.tasks) ? levelConfig.tasks : [];
    const seedFamilies = tasks
      .filter((task) => isRecord(task))
      .map((task) => String(task.itemKey ?? ''))
      .filter((itemKey) => itemKey.endsWith('Seed'))
      .map((itemKey) => itemKey.slice(0, -'Seed'.length).toLowerCase());
    const itemKeys = tasks
      .filter((task) => isRecord(task))
      .map((task) => String(task.itemKey ?? ''))
      .filter((itemKey) => !itemKey.endsWith('Seed'))
      .map((itemKey) => itemKey.toLowerCase());

    if (
      seedFamilies.some((seedFamily) =>
        itemKeys.some((itemKey) => itemKey.includes(seedFamily)),
      )
    ) {
      return true;
    }
  }

  return false;
}

function normalizeLegacyLevel5Tasks(levels: unknown[]): unknown[] {
  const level5Index = levels.findIndex(
    (levelConfig) => isRecord(levelConfig) && Number(levelConfig.level) === 5,
  );

  if (level5Index < 0) {
    return levels;
  }

  const level5 = levels[level5Index];
  const tasks = isRecord(level5) && Array.isArray(level5.tasks) ? level5.tasks : [];
  const hasLegacyLateItem = tasks.some((task) =>
    isRecord(task)
      ? [
          'level5-glowcap-herb',
          'level5-lantern-tonic',
          'level5-mandrake-seeds',
          'level5-healing-potion',
        ].includes(String(task.id ?? ''))
      : false,
  );

  if (!hasLegacyLateItem) {
    return levels;
  }

  const defaultLevel5Tasks =
    DEFAULT_TASKS_CONFIG.levels.find((levelConfig) => levelConfig.level === 5)?.tasks ?? [];

  return levels.map((levelConfig, index) =>
    index === level5Index && isRecord(levelConfig)
      ? { ...levelConfig, tasks: defaultLevel5Tasks }
      : levelConfig,
  );
}

function getTaskConfigsForLevel(levels: unknown[], levelNumber: number): unknown[] {
  const levelConfig = levels.find(
    (candidate) => isRecord(candidate) && Number(candidate.level) === levelNumber,
  );

  return isRecord(levelConfig) && Array.isArray(levelConfig.tasks) ? levelConfig.tasks : [];
}

function taskConfigListsMatch(
  tasks: unknown[],
  expectedTasks: Array<{ id: string; itemKey: string; quantity: number }>,
): boolean {
  if (tasks.length !== expectedTasks.length) {
    return false;
  }

  return expectedTasks.every((expectedTask, index) => {
    const task = tasks[index];

    return isRecord(task) &&
      String(task.id ?? '') === expectedTask.id &&
      String(task.itemKey ?? '') === expectedTask.itemKey &&
      Number(task.quantity) === expectedTask.quantity;
  });
}

function hasTaskConfigId(levels: unknown[], taskId: string): boolean {
  return levels.some((levelConfig) =>
    isRecord(levelConfig) && Array.isArray(levelConfig.tasks)
      ? levelConfig.tasks.some((task) => isRecord(task) && String(task.id ?? '') === taskId)
      : false,
  );
}

function isLegacyTradeAllianceQuestConfig(
  quest: unknown,
  id: string,
  label: string,
  target: number,
  minContribution: number,
  crystalReward: number,
): boolean {
  if (!isRecord(quest)) {
    return false;
  }

  return (
    quest.id === id &&
    quest.label === label &&
    quest.type === 'allianceIncome' &&
    Number(quest.target) === target &&
    Number(quest.minContribution) === minContribution &&
    Number(quest.crystalReward) === crystalReward
  );
}

function normalizePotionRecipesGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  const recipes = parsedConfig.recipes;

  if (!Array.isArray(recipes)) {
    return originalJson;
  }

  const seenPotionKeys = new Set(
    recipes.map((recipe) =>
      normalizeNpcMarketItemKey(String((recipe as Record<string, unknown>)?.potionKey ?? '')),
    ),
  );
  const missingCatalogRecipes = potionRecipeCatalog.filter(
    (recipe) => !seenPotionKeys.has(recipe.potionKey),
  );

  if (missingCatalogRecipes.length <= 0) {
    return originalJson;
  }

  return JSON.stringify({
    ...parsedConfig,
    recipes: [...recipes, ...missingCatalogRecipes],
  });
}

function normalizeItemsGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  const defaultConfig = JSON.parse(DEFAULT_ITEMS_CONFIG_JSON) as Record<string, unknown>;
  const normalizedConfig = { ...parsedConfig };
  let changed = false;

  for (const key of ['seeds', 'herbs', 'potions']) {
    const normalizedList = normalizeLegacyItemConfigRows(
      appendMissingItemConfigRows(
        parsedConfig[key],
        defaultConfig[key],
      ),
      defaultConfig[key],
    );

    if (normalizedList !== parsedConfig[key]) {
      normalizedConfig[key] = normalizedList;
      changed = true;
    }
  }

  return changed ? JSON.stringify(normalizedConfig) : originalJson;
}

function normalizeLegacyItemConfigRows(existingRows: unknown, defaultRows: unknown) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const defaultRowsByKey = new Map(
    defaultRows
      .filter((row): row is Record<string, unknown> => isRecord(row))
      .map((row) => [normalizeNpcMarketItemKey(String(row.key ?? '')), row]),
  );
  let changed = false;
  const normalizedRows = existingRows.map((row) => {
    if (!isRecord(row)) {
      return row;
    }

    const itemKey = normalizeNpcMarketItemKey(String(row.key ?? ''));
    const defaultRow = defaultRowsByKey.get(itemKey);

    if (
      itemKey === 'sageHerb' &&
      Number(row.growthDurationMs) === 20_000 &&
      Number(defaultRow?.growthDurationMs) === 12_000
    ) {
      changed = true;
      return { ...row, growthDurationMs: 12_000 };
    }

    return row;
  });

  return changed ? normalizedRows : existingRows;
}

function appendMissingItemConfigRows(existingRows: unknown, defaultRows: unknown) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const seenKeys = new Set(
    existingRows
      .filter((row): row is Record<string, unknown> => isRecord(row))
      .map((row) => normalizeNpcMarketItemKey(String(row.key ?? ''))),
  );
  const missingRows = defaultRows.filter((row) =>
    isRecord(row)
      ? !seenKeys.has(normalizeNpcMarketItemKey(String(row.key ?? '')))
      : false,
  );

  return missingRows.length > 0 ? [...existingRows, ...missingRows] : existingRows;
}

function validatePlayerGameplaySaveJson(
  ctx: IdleWizardReducerCtx,
  saveJson: string,
  previousSaveJson?: string,
  identity = ctx.sender,
): string {
  const value = String(saveJson ?? '').trim();

  if (!value || value.length > MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH) {
    throw new Error('Invalid player save JSON length.');
  }

  let parsedSave: unknown;

  try {
    parsedSave = JSON.parse(value);
  } catch {
    throw new Error('Invalid player save JSON.');
  }

  if (!parsedSave || typeof parsedSave !== 'object') {
    throw new Error('Invalid player save value.');
  }

  return JSON.stringify(
    normalizePlayerGameplaySave(ctx, parsedSave, previousSaveJson, identity),
  );
}

function normalizePlayerGameplaySave(
  ctx: IdleWizardReducerCtx,
  save: unknown,
  previousSaveJson?: string,
  identity = ctx.sender,
  { preserveSavedAt = false } = {},
) {
  if (!isRecord(save)) {
    throw new Error('Invalid player save value.');
  }

  const itemCatalog = getSaveItemCatalog(ctx);
  const taskCatalog = getSaveTaskCatalog(ctx);
  const previousLevel = readSavedCurrentLevel(previousSaveJson);
  const tasks = normalizeSaveTasks(save.tasks, taskCatalog, previousLevel);
  const levelLimits = getSaveLevelLimits(ctx, tasks.currentLevel);
  const research = normalizeSaveResearch(save.research);
  const minimumCurrentCrystal = getMinimumCurrentCrystalForSave(
    ctx,
    tasks.currentLevel,
    research,
  );

  return {
    version: 3,
    savedAt: preserveSavedAt
      ? normalizeSaveExistingTimestamp(save.savedAt, ctx)
      : normalizeSaveTimestamp(ctx),
    mana: normalizeSaveResource(save.mana),
    gold: normalizeSaveGold(save.gold),
    crystal: normalizeSaveCrystal(save.crystal, minimumCurrentCrystal),
    ruby: normalizeSaveRuby(save.ruby),
    logs: normalizeSaveLogs(save.logs),
    inventory: normalizeSaveInventory(save.inventory, itemCatalog),
    research,
    prestige: normalizeSavePrestige(save.prestige),
    visualSettings: normalizeSaveVisualSettings(ctx, save.visualSettings, identity),
    shop: normalizeSaveShop(save.shop, itemCatalog, levelLimits),
    brewing: normalizeSaveBrewing(save.brewing, itemCatalog, levelLimits.maxCauldrons),
    garden: normalizeSaveGarden(save.garden, itemCatalog, levelLimits),
    tasks,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePlayerGameplaySaveJson(saveJson?: string): Record<string, unknown> | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(String(saveJson));
    return isRecord(save) ? save : null;
  } catch {
    return null;
  }
}

function migratePlayerGameplaySaveJson(
  ctx: IdleWizardReducerCtx,
  save: PlayerGameplaySaveRowValue,
): string {
  const parsedSave = parsePlayerGameplaySaveJson(save.saveJson);

  if (!parsedSave) {
    throw new Error('Cannot migrate invalid player save JSON.');
  }

  return JSON.stringify(
    normalizePlayerGameplaySave(
      ctx,
      parsedSave,
      save.saveJson,
      save.identity,
      { preserveSavedAt: true },
    ),
  );
}

function toAdminPlayerGameplaySaveResult(save: PlayerGameplaySaveRowValue) {
  const parsedSave = parsePlayerGameplaySaveJson(save.saveJson);

  if (!parsedSave) {
    return null;
  }

  return {
    identity: save.identity,
    currentGold: getSaveCurrentGold(parsedSave),
    currentCrystal: getSaveCurrentCrystal(parsedSave),
    updatedAt: new Timestamp(save.updatedAt.microsSinceUnixEpoch),
  };
}

function getSaveCurrentGold(save: Record<string, unknown>): number {
  const gold = isRecord(save.gold) ? save.gold : {};
  return clampSaveGoldPrice(gold.current, BigInt(MAX_PLAYER_SAVE_CURRENT_GOLD));
}

function getSaveCurrentCrystal(save: Record<string, unknown>): number {
  const crystal = isRecord(save.crystal) ? save.crystal : {};
  return clampSaveInteger(crystal.current, 0, MAX_PLAYER_SAVE_CURRENT_CRYSTAL, 0);
}

function validateAdminCurrentGold(currentGold: unknown): number {
  const safeGold = normalizeGoldPrice(Number(currentGold));

  if (safeGold === null || safeGold > MAX_PLAYER_SAVE_CURRENT_GOLD) {
    throw new Error(`Invalid player gold. Max ${MAX_PLAYER_SAVE_CURRENT_GOLD}.`);
  }

  return safeGold;
}

function validateAdminCurrentCrystal(currentCrystal: unknown): number {
  const value = Math.floor(Number(currentCrystal));

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_PLAYER_SAVE_CURRENT_CRYSTAL
  ) {
    throw new Error(`Invalid player crystal. Max ${MAX_PLAYER_SAVE_CURRENT_CRYSTAL}.`);
  }

  return value;
}

function createAdminPlayerGameplaySaveJson(
  ctx: IdleWizardReducerCtx,
  existingSave: PlayerGameplaySaveRowValue | undefined,
  identity: Identity,
  currentGold: number,
  currentCrystal: number,
): string {
  const previousSave = parsePlayerGameplaySaveJson(existingSave?.saveJson) ?? {};
  const previousGold = isRecord(previousSave.gold) ? previousSave.gold : {};
  const previousCrystal = isRecord(previousSave.crystal) ? previousSave.crystal : {};
  const totalGenerated = Math.max(
    currentGold,
    clampSaveGoldPrice(
      previousGold.totalGenerated,
      BigInt(MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD),
    ),
  );

  return validatePlayerGameplaySaveJson(
    ctx,
    JSON.stringify({
      ...previousSave,
      gold: {
        ...previousGold,
        current: currentGold,
        totalGenerated,
      },
      crystal: {
        ...previousCrystal,
        current: currentCrystal,
      },
    }),
    existingSave?.saveJson,
    identity,
  );
}

function upsertAdminPlayerGameplaySave(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  saveJson: string,
  existingSave: PlayerGameplaySaveRowValue | undefined,
) {
  const nextSave = {
    identity,
    saveJson,
    updatedAt: ctx.timestamp,
  };

  if (existingSave) {
    ctx.db.playerGameplaySave.identity.update(nextSave);
    return;
  }

  ctx.db.playerGameplaySave.insert(nextSave);
}

function moveAdminPlayerGameplaySave(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
) {
  const sourceSave = ctx.db.playerGameplaySave.identity.find(sourceIdentity);
  if (!sourceSave) {
    return;
  }

  const parsedSave = parsePlayerGameplaySaveJson(sourceSave.saveJson);
  if (!parsedSave) {
    throw new Error('Cannot merge invalid source player save JSON.');
  }

  const targetSave = ctx.db.playerGameplaySave.identity.find(targetIdentity) ?? undefined;
  const safeSaveJson = JSON.stringify(
    normalizePlayerGameplaySave(
      ctx,
      parsedSave,
      sourceSave.saveJson,
      targetIdentity,
      { preserveSavedAt: true },
    ),
  );
  upsertAdminPlayerGameplaySave(ctx, targetIdentity, safeSaveJson, targetSave);
  ctx.db.playerGameplaySave.delete(sourceSave);
}

function moveAdminLeaderboardEntry(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  const sourceEntry = ctx.db.leaderboard.identity.find(sourceIdentity);
  const targetEntry = ctx.db.leaderboard.identity.find(targetIdentity);

  if (!sourceEntry) {
    if (targetEntry) {
      ctx.db.leaderboard.identity.update({
        ...targetEntry,
        username: targetUsername,
        playerLevel: targetPlayerLevel,
        updatedAt: ctx.timestamp,
      });
    }
    return;
  }

  const nextEntry = {
    ...sourceEntry,
    identity: targetIdentity,
    username: targetUsername,
    playerLevel: normalizePlayerLevel(sourceEntry.playerLevel),
    updatedAt: ctx.timestamp,
  };

  if (targetEntry) {
    ctx.db.leaderboard.identity.update(nextEntry);
  } else {
    ctx.db.leaderboard.insert(nextEntry);
  }

  ctx.db.leaderboard.delete(sourceEntry);
}

function syncPlayerLevelFromGameplaySave(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
  saveJson: string,
  { allowDecrease = false } = {},
) {
  const savedPlayerLevel = readSavedCurrentLevel(saveJson);

  if (
    savedPlayerLevel === null ||
    (allowDecrease
      ? savedPlayerLevel === player.playerLevel
      : savedPlayerLevel <= player.playerLevel)
  ) {
    return player;
  }

  const nextPlayer = ctx.db.player.identity.update({
    ...player,
    playerLevel: savedPlayerLevel,
    lastSeenAt: ctx.timestamp,
  });

  ensureLeaderboardEntry(ctx, nextPlayer.username, nextPlayer.playerLevel);
  updateTradeAllianceMemberProfile(
    ctx,
    nextPlayer.identity,
    nextPlayer.username,
    nextPlayer.playerLevel,
  );

  return nextPlayer;
}

function normalizeSaveTimestamp(ctx: IdleWizardReducerCtx): number {
  const nowMs = Number(ctx.timestamp.microsSinceUnixEpoch / 1000n);
  return nowMs;
}

function normalizeSaveExistingTimestamp(value: unknown, ctx: IdleWizardReducerCtx): number {
  const timestamp = Math.floor(Number(value));

  if (Number.isFinite(timestamp) && timestamp >= 0) {
    return timestamp;
  }

  return normalizeSaveTimestamp(ctx);
}

function normalizeSaveResource(value: unknown) {
  const resource = isRecord(value) ? value : {};
  const cap = clampSaveNumber(resource.cap, 0, MAX_PLAYER_SAVE_MANA_CURRENT, 0);

  return {
    current: clampSaveNumber(resource.current, 0, cap, 0),
    cap,
    perSecond: clampSaveNumber(resource.perSecond, 0, MAX_PLAYER_SAVE_MANA_PER_SECOND, 0),
  };
}

function normalizeSaveGold(value: unknown) {
  const gold = isRecord(value) ? value : {};
  const current = clampSaveGoldPrice(gold.current, BigInt(MAX_PLAYER_SAVE_CURRENT_GOLD));
  const totalGenerated = clampSaveGoldPrice(
    gold.totalGenerated,
    BigInt(MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD),
  );

  return {
    current,
    totalGenerated: Math.max(current, totalGenerated),
  };
}

function normalizeSaveCrystal(value: unknown, minimumCurrent = 0) {
  const crystal = isRecord(value) ? value : {};
  const current = clampSaveInteger(
    crystal.current,
    0,
    MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
    0,
  );

  return {
    current: clampNumber(
      Math.max(current, minimumCurrent),
      0,
      MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
    ),
  };
}

function normalizeSaveRuby(value: unknown) {
  const ruby = isRecord(value) ? value : {};

  return {
    current: clampSaveInteger(ruby.current, 0, MAX_PLAYER_SAVE_CURRENT_RUBY, 0),
  };
}

function normalizeSavePrestige(value: unknown) {
  const prestige = isRecord(value) ? value : {};
  const completedLevels = Array.isArray(prestige.completedLevels)
    ? prestige.completedLevels
        .map((level) => Math.floor(Number(level)))
        .filter(
          (level) =>
            Number.isFinite(level) &&
            level >= 10 &&
            level <= MAX_GAME_CONFIG_RESOURCE_LIMIT &&
            level % 10 === 0,
        )
    : [];

  return {
    completedLevels: [...new Set(completedLevels)].sort((left, right) => left - right),
  };
}

function normalizeSaveVisualSettings(
  ctx: IdleWizardReducerCtx,
  value: unknown,
  identity?: Identity,
) {
  const visualSettings = isRecord(value) ? value : {};
  const researched = isRecord(visualSettings.researched) ? visualSettings.researched : {};
  const player = identity ? ctx.db.player.identity.find(identity) : null;

  return {
    researched: {
      theme: normalizeSaveVisualSettingCategory(
        researched.theme,
        PLAYER_THEMES,
        DEFAULT_PLAYER_THEME,
        player ? normalizePlayerTheme(player.theme) : null,
      ),
      font: normalizeSaveVisualSettingCategory(
        researched.font,
        PLAYER_FONTS,
        DEFAULT_PLAYER_FONT,
        player ? normalizePlayerFont(player.font) : null,
      ),
      color: normalizeSaveVisualSettingCategory(
        researched.color,
        PLAYER_COLOR_MODES,
        DEFAULT_PLAYER_COLOR_MODE,
        player ? normalizePlayerColorMode(player.colorMode) : null,
      ),
      progressBar: normalizeSaveVisualSettingCategory(
        researched.progressBar,
        PLAYER_PROGRESS_BARS,
        DEFAULT_PLAYER_PROGRESS_BAR,
        null,
      ),
      icons: normalizeSaveVisualSettingCategory(
        researched.icons,
        PLAYER_ICON_MODES,
        DEFAULT_PLAYER_ICON_MODE,
        null,
      ),
    },
  };
}

function normalizeSaveVisualSettingCategory(
  value: unknown,
  allowedOptions: Set<string>,
  defaultOption: string,
  selectedOption?: string | null,
) {
  const source = isRecord(value) ? value : {};
  const options: Record<string, boolean> = {};

  for (const option of allowedOptions) {
    options[option] = Boolean(source[option]);
  }

  options[defaultOption] = true;

  if (selectedOption && allowedOptions.has(selectedOption)) {
    options[selectedOption] = true;
  }

  return options;
}

function getMinimumCurrentCrystalForSave(
  ctx: IdleWizardReducerCtx,
  currentLevel: number,
  research: {
    completedIds: string[];
    inProgress?: Array<{ researchId?: string }>;
  },
) {
  const earnedLevelCrystal =
    Math.max(0, currentLevel - DEFAULT_PLAYER_LEVEL) * getPlayerLevelCrystalPerLevel(ctx);
  const committedResearchIds = new Set([
    ...research.completedIds,
    ...(Array.isArray(research.inProgress)
      ? research.inProgress
          .map((progress) => normalizeResearchId(String(progress?.researchId ?? '')))
          .filter((researchId) => researchCatalogById.has(researchId))
      : []),
  ]);
  const spentCrystal = [...committedResearchIds].reduce(
    (total, researchId) => total + getResearchCrystalCost(ctx, researchId),
    0,
  );

  return clampNumber(
    Math.max(0, earnedLevelCrystal - spentCrystal),
    0,
    MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
  );
}

function getPlayerLevelCrystalPerLevel(ctx: IdleWizardReducerCtx) {
  const config = getParsedGameConfig(
    ctx,
    'playerLevel',
    DEFAULT_PLAYER_LEVEL_CONFIG_JSON,
  ) as { crystal?: unknown; crystalPerLevel?: unknown; crystalPerLevelUp?: unknown };
  const perLevel = readPlayerLevelCrystalPerLevel(config);
  const amount = Number(perLevel ?? DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL);

  if (!Number.isInteger(amount) || amount < 0) {
    return DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL;
  }

  return Math.min(amount, MAX_PLAYER_SAVE_CURRENT_CRYSTAL);
}

function getResearchCrystalCost(ctx: IdleWizardReducerCtx, researchId: string) {
  const config = getParsedGameConfig(
    ctx,
    'research',
    DEFAULT_RESEARCH_CONFIG_JSON,
  ) as { researchCostsCrystal?: unknown };
  const costs = isRecord(config.researchCostsCrystal) ? config.researchCostsCrystal : {};
  const cost = Number(costs[researchId] ?? 0);

  if (!Number.isFinite(cost) || cost < 0) {
    return 0;
  }

  return Math.floor(cost);
}

function backfillPlayerGameplaySaveLevelCrystals(ctx: IdleWizardReducerCtx) {
  for (const save of ctx.db.playerGameplaySave.iter()) {
    const saveJson = backfillGameplaySaveLevelCrystalsJson(ctx, save.saveJson);

    if (!saveJson || saveJson === save.saveJson) {
      continue;
    }

    ctx.db.playerGameplaySave.identity.update({
      ...save,
      saveJson,
      updatedAt: ctx.timestamp,
    });
  }
}

function backfillGameplaySaveLevelCrystalsJson(
  ctx: IdleWizardReducerCtx,
  saveJson: string,
): string | null {
  let save: unknown;

  try {
    save = JSON.parse(String(saveJson ?? ''));
  } catch {
    return null;
  }

  if (!isRecord(save)) {
    return null;
  }

  const tasks = isRecord(save.tasks) ? save.tasks : {};
  const currentLevel = clampSaveInteger(
    tasks.currentLevel,
    DEFAULT_PLAYER_LEVEL,
    MAX_REPORTED_PLAYER_LEVEL,
    DEFAULT_PLAYER_LEVEL,
  );
  const research = normalizeSaveResearch(save.research);
  const minimumCurrentCrystal = getMinimumCurrentCrystalForSave(
    ctx,
    currentLevel,
    research,
  );
  const crystal = isRecord(save.crystal) ? save.crystal : {};
  const currentCrystal = clampSaveInteger(
    crystal.current,
    0,
    MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
    0,
  );

  if (currentCrystal >= minimumCurrentCrystal) {
    return null;
  }

  const nextSaveJson = JSON.stringify({
    ...save,
    crystal: {
      ...crystal,
      current: minimumCurrentCrystal,
    },
  });

  return nextSaveJson.length <= MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH ? nextSaveJson : null;
}

function normalizeSaveLogs(value: unknown) {
  const logs = isRecord(value) ? value : {};
  const entries = Array.isArray(logs.entries)
    ? logs.entries
        .map((entry) => normalizeSaveLogEntry(entry))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .slice(-MAX_PLAYER_SAVE_LOG_ENTRIES)
    : [];
  const highestId = entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0);

  return {
    nextId: Math.max(
      highestId + 1,
      clampSaveInteger(logs.nextId, 1, Number.MAX_SAFE_INTEGER, highestId + 1),
    ),
    entries,
  };
}

function normalizeSaveLogEntry(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const message = stripUnsafeTextControls(String(value.message ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_PLAYER_SAVE_LOG_MESSAGE_LENGTH);

  if (!message) {
    return null;
  }

  return {
    id: clampSaveInteger(value.id, 1, Number.MAX_SAFE_INTEGER, 1),
    type: normalizeSaveText(value.type, 32) || 'gameplay',
    message,
    createdAt: clampSaveNumber(value.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function normalizeSaveInventory(value: unknown, itemCatalog: Map<string, string>) {
  if (!Array.isArray(value)) {
    return [];
  }

  const quantityByItemKey = new Map<string, number>();

  for (const item of value.slice(0, MAX_PLAYER_SAVE_ITEM_STACKS)) {
    if (!isRecord(item)) {
      continue;
    }

    const itemKey = normalizeSaveItemKey(item.itemKey);

    if (!itemCatalog.has(itemKey)) {
      continue;
    }

    const quantity = clampSaveInteger(item.quantity, 0, MAX_PLAYER_SAVE_ITEM_QUANTITY, 0);
    if (quantity <= 0) {
      continue;
    }

    quantityByItemKey.set(
      itemKey,
      clampNumber(
        (quantityByItemKey.get(itemKey) ?? 0) + quantity,
        0,
        MAX_PLAYER_SAVE_ITEM_QUANTITY,
      ),
    );
  }

  return [...quantityByItemKey.entries()].map(([itemKey, quantity]) => ({
    itemKey,
    quantity,
  }));
}

function normalizeSaveResearch(value: unknown) {
  const completedIds = isRecord(value) && Array.isArray(value.completedIds)
    ? value.completedIds
        .map((researchId) => normalizeResearchId(String(researchId ?? '')))
        .filter((researchId) => researchCatalogById.has(researchId))
    : [];
  const requested = new Set(completedIds);
  const accepted = new Set<string>();

  for (const research of researchCatalog) {
    if (!requested.has(research.researchId)) {
      continue;
    }

    const requiredIds = getSaveRequiredResearchIds(research.researchId);
    if (requiredIds.every((requiredId) => accepted.has(requiredId))) {
      accepted.add(research.researchId);
    }
  }

  return {
    completedIds: [...accepted],
    inProgress: normalizeSaveInProgressResearches(value, accepted),
  };
}

function normalizeSaveInProgressResearches(value: unknown, completedIds: Set<string>) {
  if (!isRecord(value) || !Array.isArray(value.inProgress)) {
    return [];
  }

  const inProgressResearches = [];
  const inProgressIds = new Set<string>();
  const maxResearchSeconds = Number(MAX_RESEARCH_DURATION_SECONDS);

  for (const progress of value.inProgress) {
    if (!isRecord(progress)) {
      continue;
    }

    const researchId = normalizeResearchId(String(progress.researchId ?? ''));
    if (
      !researchCatalogById.has(researchId) ||
      completedIds.has(researchId) ||
      inProgressIds.has(researchId)
    ) {
      continue;
    }

    const requiredIds = getSaveRequiredResearchIds(researchId);
    if (!requiredIds.every((requiredId) => completedIds.has(requiredId))) {
      continue;
    }

    const totalSeconds = clampSaveNumber(
      progress.totalSeconds,
      0,
      maxResearchSeconds,
      0,
    );
    const remainingSeconds = clampSaveNumber(
      progress.remainingSeconds,
      0,
      totalSeconds,
      0,
    );
    if (totalSeconds <= 0 || remainingSeconds <= 0) {
      continue;
    }

    inProgressIds.add(researchId);
    inProgressResearches.push({
      researchId,
      totalSeconds,
      remainingSeconds,
    });
  }

  return inProgressResearches;
}

function getSaveRequiredResearchIds(researchId: string): string[] {
  if (researchId.startsWith('unlockSeed:')) {
    const seedKeys = herbCatalog.map((herb) => `${herb.key}Seed`);
    const seedKey = researchId.slice('unlockSeed:'.length);
    const index = seedKeys.indexOf(seedKey);
    return index > 0 ? [`unlockSeed:${seedKeys[index - 1]}`] : [];
  }

  if (researchId.startsWith('unlockRecipe:')) {
    const potionKey = researchId.slice('unlockRecipe:'.length);
    const index = knownPotionResearchCatalog.findIndex((potion) => potion.key === potionKey);
    return index > 0 ? [`unlockRecipe:${knownPotionResearchCatalog[index - 1].key}`] : [];
  }

  const summonIndex = summonSeedResearchCatalog.findIndex(
    (research) => research.id === researchId,
  );
  if (summonIndex > 0) {
    return [summonSeedResearchCatalog[summonIndex - 1].id];
  }

  const automationMatch = /^automation:([^:]+):(\d+)$/.exec(researchId);
  if (automationMatch) {
    const targetNumber = Number(automationMatch[2]);
    return targetNumber > 1 ? [`automation:${automationMatch[1]}:${targetNumber - 1}`] : [];
  }

  const fastSellMatch = /^fastSellPayout:(\d+)$/.exec(researchId);
  if (fastSellMatch) {
    const level = Number(fastSellMatch[1]);
    return level > 1 ? [`fastSellPayout:${level - 1}`] : [];
  }

  const advancedMatch = /^advanced:([^:]+):(\d+):(\d+)$/.exec(researchId);
  if (advancedMatch) {
    const targetNumber = Number(advancedMatch[2]);
    const level = Number(advancedMatch[3]);
    return level > 1
      ? [`advanced:${advancedMatch[1]}:${targetNumber}:${level - 1}`]
      : [];
  }

  return [];
}

function normalizeSaveTasks(
  value: unknown,
  taskCatalog: ReturnType<typeof getSaveTaskCatalog>,
  previousLevel: number | null,
) {
  const taskState = isRecord(value) ? value : {};
  const savedTasks = Array.isArray(taskState.tasks) ? taskState.tasks : [];
  const savedTasksById = new Map(
    savedTasks
      .filter((task): task is Record<string, unknown> => isRecord(task))
      .map((task) => [String(task.taskId ?? ''), task]),
  );
  const normalizedTasks = taskCatalog.tasks.map((task) => {
    const savedTask = savedTasksById.get(task.id);
    const progressQuantity = clampSaveInteger(
      savedTask?.progressQuantity,
      0,
      task.quantity,
      0,
    );
    const completed = Boolean(savedTask?.completed) && progressQuantity >= task.quantity;

    return {
      taskId: task.id,
      progressQuantity: completed ? task.quantity : progressQuantity,
      completed,
      level: task.level,
      requiredQuantity: task.quantity,
    };
  });
  const derivedLevel = getFirstIncompleteSaveLevel(normalizedTasks, taskCatalog);
  const reportedLevel = taskState.currentLevel === undefined
    ? null
    : clampSaveInteger(
        taskState.currentLevel,
        taskCatalog.initialLevel,
        taskCatalog.maxLevel,
        taskCatalog.initialLevel,
      );
  const maxAllowedLevel = previousLevel === null
    ? taskCatalog.initialLevel
    : Math.min(taskCatalog.maxLevel, previousLevel + 1);
  const fallbackLevel = previousLevel ?? taskCatalog.initialLevel;
  const currentLevel = Math.min(
    reportedLevel ?? fallbackLevel,
    derivedLevel,
    maxAllowedLevel,
  );

  return {
    currentLevel,
    tasks: normalizedTasks.map((task) => {
      if (task.level < currentLevel) {
        return {
          taskId: task.taskId,
          progressQuantity: task.requiredQuantity,
          completed: true,
        };
      }

      if (task.level > currentLevel) {
        return {
          taskId: task.taskId,
          progressQuantity: 0,
          completed: false,
        };
      }

      return {
        taskId: task.taskId,
        progressQuantity: task.progressQuantity,
        completed: task.completed,
      };
    }),
  };
}

function getFirstIncompleteSaveLevel(
  tasks: Array<{
    taskId: string;
    progressQuantity: number;
    completed: boolean;
    level: number;
    requiredQuantity: number;
  }>,
  taskCatalog: ReturnType<typeof getSaveTaskCatalog>,
): number {
  for (const level of taskCatalog.levels) {
    const levelTasks = tasks.filter((task) => task.level === level);
    if (!levelTasks.every((task) => task.completed)) {
      return level;
    }
  }

  return taskCatalog.maxLevel;
}

function normalizeSaveShop(
  value: unknown,
  itemCatalog: Map<string, string>,
  levelLimits: ReturnType<typeof getSaveLevelLimits>,
) {
  const shop = isRecord(value) ? value : {};
  const shelf = normalizeSaveShopShelf(
    shop.shelf ?? shop,
    itemCatalog,
    levelLimits.maxNpcMarketStands,
  );
  const playerShelf = normalizeSavePlayerShopShelf(
    shop.playerShelf,
    itemCatalog,
    levelLimits.maxPlayerMarketStands,
  );
  const playerRequests = normalizeSavePlayerShopRequests(
    shop.playerRequests,
    itemCatalog,
    playerShelf.unlockedSlots,
  );

  return {
    shelf,
    playerShelf,
    playerRequests,
    goldOffer: normalizeSaveShopGoldOffer(shop.goldOffer),
  };
}

function normalizeSaveShopGoldOffer(value: unknown) {
  const offer = isRecord(value) ? value : {};

  return {
    cooldownRemainingSeconds: clampSaveNumber(
      offer.cooldownRemainingSeconds,
      0,
      MAX_PLAYER_SAVE_SHOP_GOLD_OFFER_COOLDOWN_SECONDS,
      0,
    ),
  };
}

function normalizeSaveShopShelf(
  value: unknown,
  itemCatalog: Map<string, string>,
  maxUnlockedSlots: number,
) {
  const shelf = isRecord(value) ? value : {};
  const unlockedSlots = clampSaveInteger(shelf.unlockedSlots, 0, maxUnlockedSlots, 0);
  const slots = normalizeSaveSlotRows(shelf.slots, unlockedSlots, (slot) => {
    const itemKey = normalizeSaveItemKey(slot.sellItemKey);
    const itemKind = itemCatalog.get(itemKey);

    return {
      slotNumber: clampSaveInteger(slot.slotNumber, 1, MAX_PLAYER_SHOP_SLOTS, 1),
      sellItemKey: itemKind ? itemKey : null,
      sellProgressSeconds: clampSaveNumber(
        slot.sellProgressSeconds,
        0,
        MAX_GAME_CONFIG_RESOURCE_LIMIT,
        0,
      ),
    };
  });
  const legacySellProgressSeconds = Math.max(
    0,
    ...slots.map((slot) => slot.sellProgressSeconds),
  );

  return {
    unlockedSlots,
    selectedSlotNumber: normalizeSaveSelectedNumber(shelf.selectedSlotNumber, unlockedSlots),
    sellProgressSeconds: clampSaveNumber(
      shelf.sellProgressSeconds,
      0,
      MAX_GAME_CONFIG_RESOURCE_LIMIT,
      legacySellProgressSeconds,
    ),
    slots,
  };
}

function normalizeSavePlayerShopShelf(
  value: unknown,
  itemCatalog: Map<string, string>,
  maxUnlockedSlots: number,
) {
  const shelf = isRecord(value) ? value : {};
  const unlockedSlots = clampSaveInteger(shelf.unlockedSlots, 0, maxUnlockedSlots, 0);

  return {
    unlockedSlots,
    selectedSlotNumber: normalizeSaveSelectedNumber(shelf.selectedSlotNumber, unlockedSlots),
    slots: normalizeSaveSlotRows(shelf.slots, unlockedSlots, (slot) => {
      const itemKey = normalizeSaveItemKey(slot.itemKey);
      const itemKind = itemCatalog.get(itemKey);
      const quantity = clampSaveInteger(slot.quantity, 0, MAX_PLAYER_SHOP_LISTING_QUANTITY, 0);
      const priceGold = clampSaveGoldPrice(
        slot.priceGold,
        BigInt(MAX_PLAYER_SHOP_PRICE_GOLD),
      );

      return {
        slotNumber: clampSaveInteger(slot.slotNumber, 1, MAX_PLAYER_SHOP_SLOTS, 1),
        itemKey: itemKind && quantity > 0 && priceGold > 0 ? itemKey : null,
        quantity,
        priceGold,
      };
    }),
  };
}

function normalizeSavePlayerShopRequests(
  value: unknown,
  itemCatalog: Map<string, string>,
  unlockedSlots: number,
) {
  const requests = isRecord(value) ? value : {};

  return {
    slots: normalizeSaveSlotRows(requests.slots, unlockedSlots, (slot) => {
      const itemKey = normalizeSaveItemKey(slot.itemKey);
      const itemKind = itemCatalog.get(itemKey);
      const quantity = clampSaveInteger(slot.quantity, 0, MAX_PLAYER_SHOP_LISTING_QUANTITY, 0);
      const priceGold = clampSaveGoldPrice(
        slot.priceGold,
        BigInt(MAX_PLAYER_SHOP_PRICE_GOLD),
      );

      return {
        slotNumber: clampSaveInteger(slot.slotNumber, 1, MAX_PLAYER_SHOP_SLOTS, 1),
        itemKey: itemKind && quantity > 0 && priceGold > 0 ? itemKey : null,
        quantity,
        priceGold,
      };
    }),
  };
}

function normalizeSaveSlotRows<T>(
  value: unknown,
  unlockedSlots: number,
  normalize: (slot: Record<string, unknown>) => T & { slotNumber: number },
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const rowsBySlotNumber = new Map<number, T & { slotNumber: number }>();

  for (const slot of value) {
    if (!isRecord(slot)) {
      continue;
    }

    const slotNumber = clampSaveInteger(slot.slotNumber, 1, MAX_PLAYER_SHOP_SLOTS, 1);
    if (slotNumber > unlockedSlots) {
      continue;
    }

    rowsBySlotNumber.set(slotNumber, normalize({ ...slot, slotNumber }));
  }

  return [...rowsBySlotNumber.values()].sort(
    (left, right) => left.slotNumber - right.slotNumber,
  );
}

function normalizeSaveSelectedNumber(value: unknown, max: number): number | null {
  const selected = clampSaveInteger(value, 1, max, 0);
  return selected > 0 ? selected : null;
}

function normalizeSaveBrewing(
  value: unknown,
  itemCatalog: Map<string, string>,
  maxUnlockedCauldrons: number,
) {
  const brewing = isRecord(value) ? value : {};
  const maxCauldrons = clampSaveInteger(
    maxUnlockedCauldrons,
    1,
    MAX_PLAYER_SAVE_CAULDRONS,
    1,
  );
  const sourceCauldrons = Array.isArray(brewing.cauldrons)
    ? brewing.cauldrons
    : [
        {
          cauldronNumber: 1,
          cauldronItemKeys: brewing.cauldronItemKeys,
          activeBrew: brewing.activeBrew,
          autoBrewEnabled: brewing.autoBrewEnabled,
          autoBrewRecipeKey: brewing.autoBrewRecipeKey,
        },
      ];
  const cauldronsByNumber = new Map<
    number,
    {
      cauldronNumber: number;
      cauldronItemKeys: string[];
      activeBrew: ReturnType<typeof normalizeSaveActiveBrew>;
      autoBrewEnabled: boolean;
      autoBrewRecipeKey: string | null;
    }
  >();

  for (const [index, sourceCauldron] of sourceCauldrons.entries()) {
    if (!isRecord(sourceCauldron)) {
      continue;
    }

    const fallbackCauldronNumber = index + 1;
    const savedCauldronNumber = Math.floor(Number(sourceCauldron.cauldronNumber));
    const cauldronNumber = Number.isInteger(savedCauldronNumber)
      ? savedCauldronNumber
      : fallbackCauldronNumber;

    if (cauldronNumber < 1 || cauldronNumber > maxCauldrons) {
      continue;
    }

    const autoBrewRecipeKey = normalizeSaveItemKey(
      sourceCauldron.autoBrewRecipeKey ??
        (cauldronNumber === 1 ? brewing.autoBrewRecipeKey : null),
    );
    const safeAutoBrewRecipeKey =
      itemCatalog.get(autoBrewRecipeKey) === 'potion' ? autoBrewRecipeKey : null;
    const autoBrewEnabled =
      sourceCauldron.autoBrewEnabled ??
      (cauldronNumber === 1 ? brewing.autoBrewEnabled : false);

    cauldronsByNumber.set(cauldronNumber, {
      cauldronNumber,
      cauldronItemKeys: normalizeSaveCauldronItemKeys(
        sourceCauldron.cauldronItemKeys,
        itemCatalog,
      ),
      activeBrew: normalizeSaveActiveBrew(sourceCauldron.activeBrew, itemCatalog),
      autoBrewEnabled: Boolean(safeAutoBrewRecipeKey && autoBrewEnabled),
      autoBrewRecipeKey: safeAutoBrewRecipeKey,
    });
  }

  const fallbackUnlockedCauldrons = getLegacyUnlockedCauldronCount(cauldronsByNumber);
  const unlockedCauldrons = clampSaveInteger(
    brewing.unlockedCauldrons,
    1,
    maxCauldrons,
    fallbackUnlockedCauldrons,
  );
  const cauldrons = [...cauldronsByNumber.values()]
    .filter((cauldron) => cauldron.cauldronNumber <= unlockedCauldrons)
    .sort((left, right) => left.cauldronNumber - right.cauldronNumber);
  const primaryCauldron =
    cauldrons.find((cauldron) => cauldron.cauldronNumber === 1) ?? {
      cauldronNumber: 1,
      cauldronItemKeys: [],
      activeBrew: null,
      autoBrewEnabled: false,
      autoBrewRecipeKey: null,
    };

  return {
    autoBrewEnabled: primaryCauldron.autoBrewEnabled,
    autoBrewRecipeKey: primaryCauldron.autoBrewRecipeKey,
    unlockedCauldrons,
    cauldrons,
    cauldronItemKeys: primaryCauldron.cauldronItemKeys,
    activeBrew: primaryCauldron.activeBrew,
  };
}

function getLegacyUnlockedCauldronCount(
  cauldronsByNumber: Map<
    number,
    {
      cauldronNumber: number;
      cauldronItemKeys: string[];
      activeBrew: ReturnType<typeof normalizeSaveActiveBrew>;
      autoBrewEnabled: boolean;
      autoBrewRecipeKey: string | null;
    }
  >,
) {
  let unlockedCauldrons = 1;

  for (const cauldron of cauldronsByNumber.values()) {
    if (cauldron.cauldronNumber <= unlockedCauldrons) {
      continue;
    }

    if (
      cauldron.cauldronItemKeys.length > 0 ||
      cauldron.activeBrew !== null ||
      cauldron.autoBrewEnabled ||
      cauldron.autoBrewRecipeKey !== null
    ) {
      unlockedCauldrons = cauldron.cauldronNumber;
    }
  }

  return unlockedCauldrons;
}

function normalizeSaveCauldronItemKeys(
  value: unknown,
  itemCatalog: Map<string, string>,
) {
  const maxIngredients = getDefaultBrewingMaxIngredients();

  return Array.isArray(value)
    ? value
        .map((itemKey) => normalizeSaveItemKey(itemKey))
        .filter((itemKey) => itemCatalog.get(itemKey) === 'herb')
        .slice(0, maxIngredients)
    : [];
}

function normalizeSaveActiveBrew(value: unknown, itemCatalog: Map<string, string>) {
  if (!isRecord(value)) {
    return null;
  }

  const resultItemKey = normalizeSaveItemKey(value.resultItemKey);
  if (itemCatalog.get(resultItemKey) !== 'potion') {
    return null;
  }

  const totalMs = clampSaveInteger(value.totalMs, 0, MAX_PLAYER_SAVE_TIMER_MS, 0);
  const remainingMs = clampSaveInteger(value.remainingMs, 0, totalMs, 0);
  const bottlingTotalMs = clampSaveInteger(
    value.bottlingTotalMs,
    0,
    MAX_PLAYER_SAVE_TIMER_MS,
    getDefaultBottlingDurationMs(),
  );
  const phase = ['brewing', 'brewed', 'bottling', 'ready'].includes(String(value.phase))
    ? String(value.phase)
    : 'brewing';

  return {
    resultItemKey,
    phase,
    remainingMs,
    totalMs,
    bottlingTotalMs,
  };
}

function normalizeSaveGarden(
  value: unknown,
  itemCatalog: Map<string, string>,
  levelLimits: ReturnType<typeof getSaveLevelLimits>,
) {
  const garden = isRecord(value) ? value : {};
  const unlockedTiles = clampSaveInteger(
    garden.unlockedTiles,
    0,
    levelLimits.maxGardenTiles,
    0,
  );
  const tiles = Array.isArray(garden.tiles)
    ? garden.tiles
        .map((tile) => normalizeSaveGardenTile(tile, itemCatalog, unlockedTiles))
        .filter((tile): tile is NonNullable<typeof tile> => Boolean(tile))
    : [];

  return {
    unlockedTiles,
    tiles,
  };
}

function normalizeSaveGardenTile(
  value: unknown,
  itemCatalog: Map<string, string>,
  unlockedTiles: number,
) {
  if (!isRecord(value)) {
    return null;
  }

  const tileNumber = clampSaveInteger(value.tileNumber, 1, MAX_GAME_CONFIG_RESOURCE_LIMIT, 0);
  if (tileNumber < 1 || tileNumber > unlockedTiles) {
    return null;
  }

  const phase = ['empty', 'growing', 'ready', 'harvesting'].includes(String(value.phase))
    ? String(value.phase)
    : 'empty';
  const selectedSeedItemKey = normalizeSaveItemKey(value.selectedSeedItemKey);
  const seedItemKey = normalizeSaveItemKey(value.seedItemKey);
  const herbItemKey = normalizeSaveItemKey(value.herbItemKey);
  const totalMs = clampSaveInteger(value.totalMs, 0, MAX_PLAYER_SAVE_TIMER_MS, 0);
  const remainingMs = phase === 'ready'
    ? 0
    : clampSaveInteger(value.remainingMs, 0, totalMs, 0);
  const hasSeed = itemCatalog.get(seedItemKey) === 'seed';
  const hasHerb = itemCatalog.get(herbItemKey) === 'herb';

  return {
    tileNumber,
    selectedSeedItemKey: itemCatalog.get(selectedSeedItemKey) === 'seed'
      ? selectedSeedItemKey
      : null,
    seedItemKey: hasSeed && phase !== 'empty' ? seedItemKey : null,
    herbItemKey: hasHerb && phase !== 'empty' ? herbItemKey : null,
    phase: hasSeed && hasHerb ? phase : 'empty',
    totalMs: phase === 'ready' ? 0 : totalMs,
    remainingMs,
  };
}

function getSaveItemCatalog(ctx: IdleWizardReducerCtx): Map<string, string> {
  const config = getParsedGameConfig(ctx, 'items', DEFAULT_ITEMS_CONFIG_JSON) as {
    seeds?: unknown;
    herbs?: unknown;
    potions?: unknown;
  };
  const itemCatalog = new Map<string, string>();

  addSaveItemCatalogRows(itemCatalog, config.seeds, 'seed');
  addSaveItemCatalogRows(itemCatalog, config.herbs, 'herb');
  addSaveItemCatalogRows(itemCatalog, config.potions, 'potion');
  return itemCatalog;
}

function addSaveItemCatalogRows(
  itemCatalog: Map<string, string>,
  value: unknown,
  kind: string,
) {
  if (!Array.isArray(value)) {
    return;
  }

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const itemKey = normalizeSaveItemKey(item.key);
    if (itemKey) {
      itemCatalog.set(itemKey, kind);
    }
  }
}

function getSaveTaskCatalog(ctx: IdleWizardReducerCtx) {
  const config = getParsedGameConfig(ctx, 'tasks', DEFAULT_CURRENT_TASKS_CONFIG_JSON) as {
    levels?: Array<{ level?: number; tasks?: Array<{ id?: string; quantity?: number }> }>;
  };
  const levels = Array.isArray(config.levels)
    ? config.levels.map((level) => Number(level.level)).filter(Number.isInteger)
    : [DEFAULT_PLAYER_LEVEL];
  const tasks = Array.isArray(config.levels)
    ? config.levels.flatMap((level) =>
        Array.isArray(level.tasks)
          ? level.tasks.map((task) => ({
              id: String(task.id ?? ''),
              level: Number(level.level),
              quantity: clampSaveInteger(
                task.quantity,
                1,
                MAX_GAME_CONFIG_TASK_QUANTITY,
                1,
              ),
            }))
          : [],
      )
    : [];

  return {
    levels,
    tasks,
    initialLevel: levels[0] ?? DEFAULT_PLAYER_LEVEL,
    maxLevel: levels.at(-1) ?? DEFAULT_PLAYER_LEVEL,
  };
}

function getSaveLevelLimits(ctx: IdleWizardReducerCtx, currentLevel: number) {
  const config = getParsedGameConfig(
    ctx,
    'playerLevel',
    DEFAULT_PLAYER_LEVEL_CONFIG_JSON,
  ) as { milestones?: unknown; levels?: unknown };
  const milestones = Array.isArray(config.milestones)
    ? config.milestones
    : Array.isArray(config.levels)
      ? config.levels
      : [];
  const limits = {
    maxGardenTiles: 0,
    maxCauldrons: 1,
    maxNpcMarketStands: 0,
    maxPlayerMarketStands: 0,
  };

  for (const milestone of milestones) {
    if (!isRecord(milestone)) {
      continue;
    }

    const level = Number(milestone.level);
    if (!Number.isInteger(level) || level > currentLevel) {
      continue;
    }

    limits.maxGardenTiles = clampSaveInteger(
      milestone.maxGardenTiles,
      limits.maxGardenTiles,
      MAX_GAME_CONFIG_RESOURCE_LIMIT,
      limits.maxGardenTiles,
    );
    limits.maxCauldrons = clampSaveInteger(
      milestone.maxCauldrons,
      limits.maxCauldrons,
      MAX_PLAYER_SAVE_CAULDRONS,
      limits.maxCauldrons,
    );
    limits.maxNpcMarketStands = clampSaveInteger(
      milestone.maxNpcMarketStands ?? milestone.maxShopSlots,
      limits.maxNpcMarketStands,
      MAX_PLAYER_SHOP_SLOTS,
      limits.maxNpcMarketStands,
    );
    limits.maxPlayerMarketStands = clampSaveInteger(
      milestone.maxPlayerMarketStands ?? milestone.maxShopSlots,
      limits.maxPlayerMarketStands,
      MAX_PLAYER_SHOP_SLOTS,
      limits.maxPlayerMarketStands,
    );
  }

  return limits;
}

function getParsedGameConfig(
  ctx: IdleWizardReducerCtx,
  configKey: string,
  fallbackJson: string,
): unknown {
  const row = ctx.db.gameConfig.configKey.find(configKey);
  const configJson = row?.configJson ?? fallbackJson;

  try {
    return JSON.parse(validateGameConfigJson(configKey, configJson));
  } catch {
    return JSON.parse(fallbackJson);
  }
}

function getMaintenanceConfig(ctx: IdleWizardReducerCtx) {
  const config = getParsedGameConfig(
    ctx,
    'maintenance',
    DEFAULT_MAINTENANCE_CONFIG_JSON,
  );
  const record = isRecord(config) ? config : {};

  return {
    mode: normalizeMaintenanceMode(record.mode),
    message: normalizeMaintenanceMessage(record.message),
  };
}

type TradeAllianceWeeklyQuestConfig = {
  id: string;
  label: string;
  type: string;
  itemKey: string;
  itemLabel: string;
  itemKind: string;
  target: bigint;
  minContribution: bigint;
  crystalReward: number;
};

function getTradeAllianceRuntimeConfig(ctx: IdleWizardReducerCtx) {
  const config = getParsedGameConfig(
    ctx,
    'tradeAlliance',
    DEFAULT_TRADE_ALLIANCE_CONFIG_JSON,
  ) as { weeklyQuests?: unknown; dailyQuests?: unknown };

  return {
    weeklyQuests: normalizeTradeAllianceWeeklyQuestConfigs(
      config.weeklyQuests ?? config.dailyQuests,
    ),
  };
}

function normalizeTradeAllianceWeeklyQuestConfigs(value: unknown): TradeAllianceWeeklyQuestConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenQuestIds = new Set<string>();
  const quests: TradeAllianceWeeklyQuestConfig[] = [];

  for (const questConfig of value.slice(0, MAX_TRADE_ALLIANCE_WEEKLY_QUESTS)) {
    if (!isRecord(questConfig)) {
      continue;
    }

    const id = normalizeResearchId(String(questConfig.id ?? ''));
    const label = normalizePlayerShopText(
      String(questConfig.label ?? id),
      MAX_RESEARCH_LABEL_LENGTH,
    );
    const type = String(questConfig.type ?? '').trim();
    const itemKey = normalizeNpcMarketItemKey(String(questConfig.itemKey ?? ''));
    const item = itemKey ? npcMarketCatalogByItemKey.get(itemKey) : null;
    const itemLabel = item?.itemLabel ?? '';
    const itemKind = item?.itemKind ?? '';
    const target = toBigInt(Number(questConfig.target ?? 0));
    const minContribution = toBigInt(Number(questConfig.minContribution ?? 0));
    const crystalReward = Math.floor(Number(questConfig.crystalReward ?? 0));
    const isIncomeQuest = type === TRADE_ALLIANCE_QUEST_TYPE_INCOME;
    const isItemFillQuest =
      type === TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL &&
      item &&
      (item.itemKind === 'seed' || item.itemKind === 'potion') &&
      id === `${TRADE_ALLIANCE_ITEM_FILL_PREFIX}${itemKey}`;

    if (
      !id ||
      seenQuestIds.has(id) ||
      !label ||
      (!isIncomeQuest && !isItemFillQuest) ||
      target < 1n ||
      target > MAX_TRADE_ALLIANCE_QUEST_TARGET ||
      minContribution < 0n ||
      minContribution > target ||
      crystalReward < 0 ||
      crystalReward > MAX_TRADE_ALLIANCE_QUEST_CRYSTAL_REWARD
    ) {
      continue;
    }

    seenQuestIds.add(id);
    quests.push({
      id,
      label,
      type,
      itemKey: isItemFillQuest ? itemKey : '',
      itemLabel: isItemFillQuest ? itemLabel : '',
      itemKind: isItemFillQuest ? itemKind : '',
      target,
      minContribution,
      crystalReward,
    });
  }

  return quests;
}

function refreshTradeAllianceDay(ctx: IdleWizardReducerCtx, alliance: any) {
  const dayKey = getTradeAllianceDayKey(ctx);
  const seasonKey = getTradeAllianceSeasonKey(ctx);
  const monthKey = getTradeAllianceMonthKey(ctx);
  const needsDayReset = alliance.dayKey !== dayKey;
  const needsSeasonReset = alliance.seasonKey !== seasonKey;
  const needsMonthReset = alliance.monthKey !== monthKey;

  if (!needsDayReset && !needsSeasonReset && !needsMonthReset) {
    ensureTradeAllianceWeeklyQuests(ctx, alliance);
    return alliance;
  }

  const nextAlliance = ctx.db.tradeAlliance.allianceId.update({
    ...alliance,
    dayKey,
    dailyIncome: needsDayReset ? 0n : alliance.dailyIncome,
    seasonKey,
    seasonIncome: needsSeasonReset ? 0n : alliance.seasonIncome,
    monthKey,
    monthlyIncome: needsMonthReset ? 0n : alliance.monthlyIncome,
    updatedAt: ctx.timestamp,
  });
  ensureTradeAllianceWeeklyQuests(ctx, nextAlliance);
  return nextAlliance;
}

function refreshTradeAllianceMemberQuestPeriod(ctx: IdleWizardReducerCtx, member: any) {
  const dayKey = getTradeAllianceQuestPeriodKey(ctx);

  if (member.dayKey === dayKey) {
    return member;
  }

  return ctx.db.tradeAllianceMember.memberIdentity.update({
    ...member,
    dayKey,
    dailyContribution: 0n,
    updatedAt: ctx.timestamp,
  });
}

function ensureTradeAllianceWeeklyQuests(ctx: IdleWizardReducerCtx, alliance: any) {
  const config = getTradeAllianceRuntimeConfig(ctx);
  const questPeriodKey = getTradeAllianceQuestPeriodKey(ctx);

  pruneTradeAllianceQuestRows(ctx, alliance.allianceId, questPeriodKey);

  for (const quest of config.weeklyQuests) {
    const questKey = getTradeAllianceQuestKey(alliance.allianceId, questPeriodKey, quest.id);
    const existingQuest = ctx.db.tradeAllianceQuestProgress.questKey.find(questKey);
    const baseProgress =
      quest.type === TRADE_ALLIANCE_QUEST_TYPE_INCOME ? toBigInt(alliance.seasonIncome) : 0n;
    const nextProgress = clampBigInt(
      existingQuest && existingQuest.progress > baseProgress
        ? existingQuest.progress
        : baseProgress,
      0n,
      quest.target,
    );

    const nextQuest = {
      questKey,
      allianceId: alliance.allianceId,
      dayKey: questPeriodKey,
      questId: quest.id,
      label: quest.label,
      questType: quest.type,
      target: quest.target,
      progress: nextProgress,
      minContribution: quest.minContribution,
      crystalReward: quest.crystalReward,
      updatedAt: ctx.timestamp,
    };

    if (existingQuest) {
      if (
        existingQuest.label === nextQuest.label &&
        existingQuest.questType === nextQuest.questType &&
        existingQuest.target === nextQuest.target &&
        existingQuest.progress === nextQuest.progress &&
        existingQuest.minContribution === nextQuest.minContribution &&
        existingQuest.crystalReward === nextQuest.crystalReward
      ) {
        continue;
      }

      ctx.db.tradeAllianceQuestProgress.questKey.update({
        ...existingQuest,
        ...nextQuest,
      });
      continue;
    }

    ctx.db.tradeAllianceQuestProgress.insert(nextQuest);
  }
}

function pruneTradeAllianceQuestRows(
  ctx: IdleWizardReducerCtx,
  allianceId: unknown,
  questPeriodKey: string,
) {
  const allianceKey = getTradeAllianceIdKey(allianceId);

  for (const quest of Array.from(ctx.db.tradeAllianceQuestProgress.iter())) {
    if (
      getTradeAllianceIdKey(quest.allianceId) === allianceKey &&
      quest.dayKey !== questPeriodKey
    ) {
      ctx.db.tradeAllianceQuestProgress.delete(quest);
    }
  }

  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    if (
      getTradeAllianceIdKey(contribution.allianceId) === allianceKey &&
      contribution.dayKey !== questPeriodKey
    ) {
      ctx.db.tradeAllianceQuestContribution.delete(contribution);
    }
  }
}

function getTradeAllianceQuestConfigById(
  ctx: IdleWizardReducerCtx,
  questId: string,
): TradeAllianceWeeklyQuestConfig | null {
  const safeQuestId = normalizeResearchId(questId);
  return (
    getTradeAllianceRuntimeConfig(ctx).weeklyQuests.find(
      (quest) => quest.id === safeQuestId,
    ) ?? null
  );
}

function applyTradeAllianceQuestContributionDelta({
  ctx,
  alliance,
  member,
  player,
  quest,
  delta,
}: {
  ctx: IdleWizardReducerCtx;
  alliance: any;
  member: any;
  player: { username: string };
  quest: TradeAllianceWeeklyQuestConfig;
  delta: bigint;
}) {
  const contributionKey = getTradeAllianceContributionKey(
    alliance.allianceId,
    alliance.seasonKey,
    quest.id,
    member.memberIdentity,
  );
  const contribution = ctx.db.tradeAllianceQuestContribution.contributionKey.find(
    contributionKey,
  );
  const nextContribution = {
    contributionKey,
    allianceId: alliance.allianceId,
    dayKey: alliance.seasonKey,
    questId: quest.id,
    contributorIdentity: member.memberIdentity,
    username: player.username,
    contribution: (contribution?.contribution ?? 0n) + delta,
    updatedAt: ctx.timestamp,
  };

  if (contribution) {
    ctx.db.tradeAllianceQuestContribution.contributionKey.update({
      ...contribution,
      ...nextContribution,
    });
    return;
  }

  ctx.db.tradeAllianceQuestContribution.insert(nextContribution);
}

function hasOtherTradeAllianceQuestParticipation(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  allianceId: unknown,
  dayKey: string,
): boolean {
  const allianceKey = getTradeAllianceIdKey(allianceId);

  for (const contribution of ctx.db.tradeAllianceQuestContribution.iter()) {
    if (
      contribution.contributorIdentity.isEqual(identity) &&
      contribution.dayKey === dayKey &&
      toBigInt(contribution.contribution) > 0n &&
      getTradeAllianceIdKey(contribution.allianceId) !== allianceKey
    ) {
      return true;
    }
  }

  for (const reward of ctx.db.tradeAllianceRewardInbox.iter()) {
    if (
      reward.recipientIdentity.isEqual(identity) &&
      reward.dayKey === dayKey &&
      getTradeAllianceIdKey(reward.allianceId) !== allianceKey
    ) {
      return true;
    }
  }

  return false;
}

function assertTradeAllianceQuestParticipationAvailable(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  allianceId: unknown,
  dayKey: string,
) {
  if (hasOtherTradeAllianceQuestParticipation(ctx, identity, allianceId, dayKey)) {
    throw new Error('Alliance quest progress belongs to another alliance this week.');
  }
}

function applyTradeAllianceItemFillDelta(
  ctx: IdleWizardReducerCtx,
  player: { username: string; playerLevel: number },
  questId: string,
  itemKey: string,
  quantity: number,
) {
  const existingMember = getTradeAllianceMember(ctx);

  if (!existingMember) {
    throw new Error('Alliance quest requires membership.');
  }

  const safeQuestId = normalizeResearchId(questId);
  const safeItemKey = normalizeNpcMarketItemKey(itemKey);
  const safeQuantity = Math.floor(Number(quantity));
  const quest = getTradeAllianceQuestConfigById(ctx, safeQuestId);

  if (
    !quest ||
    quest.type !== TRADE_ALLIANCE_QUEST_TYPE_ITEM_FILL ||
    quest.itemKey !== safeItemKey
  ) {
    throw new Error('Alliance item quest not found.');
  }

  if (
    !Number.isInteger(safeQuantity) ||
    safeQuantity < 1 ||
    safeQuantity > MAX_TRADE_ALLIANCE_ITEM_FILL_QUANTITY
  ) {
    throw new Error('Invalid alliance quest quantity.');
  }

  const delta = BigInt(safeQuantity);
  let member = refreshTradeAllianceMemberQuestPeriod(ctx, existingMember);
  const alliance = refreshTradeAllianceDay(
    ctx,
    findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId)),
  );
  assertTradeAllianceQuestParticipationAvailable(
    ctx,
    member.memberIdentity,
    alliance.allianceId,
    alliance.seasonKey,
  );
  const progress = ctx.db.tradeAllianceQuestProgress.questKey.find(
    getTradeAllianceQuestKey(alliance.allianceId, alliance.seasonKey, quest.id),
  );

  if (!progress) {
    throw new Error('Alliance quest not found.');
  }

  if (progress.progress + delta > progress.target) {
    throw new Error('Alliance quest fill exceeds target.');
  }

  ctx.db.tradeAllianceQuestProgress.questKey.update({
    ...progress,
    progress: progress.progress + delta,
    updatedAt: ctx.timestamp,
  });
  member = ctx.db.tradeAllianceMember.memberIdentity.update({
    ...member,
    username: player.username,
    playerLevel: player.playerLevel,
    updatedAt: ctx.timestamp,
  });
  applyTradeAllianceQuestContributionDelta({
    ctx,
    alliance,
    member,
    player,
    quest,
    delta,
  });
}

function applyTradeAllianceIncomeDelta(
  ctx: IdleWizardReducerCtx,
  player: { username: string; playerLevel: number },
  delta: bigint,
) {
  if (delta <= 0n) {
    return;
  }

  const existingMember = getTradeAllianceMember(ctx);

  if (!existingMember) {
    return;
  }

  let member = refreshTradeAllianceMemberQuestPeriod(ctx, existingMember);
  let alliance = refreshTradeAllianceDay(
    ctx,
    findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId)),
  );

  if (
    hasOtherTradeAllianceQuestParticipation(
      ctx,
      member.memberIdentity,
      alliance.allianceId,
      alliance.seasonKey,
    )
  ) {
    return;
  }

  alliance = ctx.db.tradeAlliance.allianceId.update({
    ...alliance,
    totalIncome: toBigInt(alliance.totalIncome) + delta,
    seasonIncome: toBigInt(alliance.seasonIncome) + delta,
    dailyIncome: toBigInt(alliance.dailyIncome) + delta,
    monthlyIncome: toBigInt(alliance.monthlyIncome) + delta,
    updatedAt: ctx.timestamp,
  });
  member = ctx.db.tradeAllianceMember.memberIdentity.update({
    ...member,
    username: player.username,
    playerLevel: player.playerLevel,
    totalContribution: toBigInt(member.totalContribution) + delta,
    dailyContribution: toBigInt(member.dailyContribution) + delta,
    updatedAt: ctx.timestamp,
  });
  ensureTradeAllianceWeeklyQuests(ctx, alliance);

  for (const quest of getTradeAllianceRuntimeConfig(ctx).weeklyQuests) {
    if (quest.type !== TRADE_ALLIANCE_QUEST_TYPE_INCOME) {
      continue;
    }

    const questKey = getTradeAllianceQuestKey(alliance.allianceId, alliance.seasonKey, quest.id);
    const progress = ctx.db.tradeAllianceQuestProgress.questKey.find(questKey);
    if (!progress) {
      continue;
    }

    applyTradeAllianceQuestContributionDelta({
      ctx,
      alliance,
      member,
      player,
      quest,
      delta,
    });
  }
}

function readSavedCurrentLevel(saveJson?: string): number | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(saveJson);
    const currentLevel = Number(save?.tasks?.currentLevel);
    return Number.isInteger(currentLevel) && currentLevel >= DEFAULT_PLAYER_LEVEL
      ? currentLevel
      : null;
  } catch {
    return null;
  }
}

function readSavedTotalGeneratedGold(saveJson?: string): bigint | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(saveJson);
    const gold = isRecord(save?.gold) ? save.gold : {};
    const totalGenerated = [
      gold.totalGenerated,
      gold.totalGeneratedGold,
      gold.totalIncome,
      gold.current,
    ]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value) && value > 0);

    if (totalGenerated === undefined || !Number.isFinite(totalGenerated)) {
      return null;
    }

    return toBigInt(Math.min(Math.floor(totalGenerated), MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD));
  } catch {
    return null;
  }
}

function readSavedResearchCount(saveJson?: string): number | null {
  return readSavedCompletedResearchIds(saveJson)?.length ?? null;
}

function readSavedCompletedResearchIds(saveJson?: string): string[] | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(saveJson);
    const research = isRecord(save?.research) ? save.research : {};
    return normalizeSaveCompletedResearchIds(research.completedIds);
  } catch {
    return null;
  }
}

function normalizeSaveCompletedResearchIds(completedIds: unknown): string[] | null {
  if (!Array.isArray(completedIds)) {
    return null;
  }

  const requested = new Set(
    completedIds
      .map((researchId: unknown) => normalizeResearchId(String(researchId ?? '')))
      .filter((researchId: string) => researchCatalogById.has(researchId)),
  );

  return researchCatalog
    .map((research) => research.researchId)
    .filter((researchId) => requested.has(researchId));
}

function readSavedNonDefaultResearchCount(saveJson?: string): number | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(saveJson);
    const research = isRecord(save?.research) ? save.research : {};
    if (!Array.isArray(research.completedIds)) {
      return null;
    }

    return new Set(
      research.completedIds
        .map((researchId: unknown) => normalizeResearchId(String(researchId ?? '')))
        .filter(
          (researchId: string) =>
            researchCatalogById.has(researchId) &&
            !DEFAULT_SAVE_COMPLETED_RESEARCH_IDS.has(researchId),
        ),
    ).size;
  } catch {
    return null;
  }
}

function readSavedPrestigeCompletedLevels(saveJson?: string): number[] | null {
  if (!saveJson) {
    return null;
  }

  try {
    const save = JSON.parse(saveJson);
    return normalizeSavePrestige(save?.prestige).completedLevels;
  } catch {
    return null;
  }
}

function readSavedPrestigeCapLevel(saveJson?: string): number {
  const completedLevels = readSavedPrestigeCompletedLevels(saveJson);

  if (!completedLevels || completedLevels.length === 0) {
    return DEFAULT_PLAYER_LEVEL;
  }

  return completedLevels.reduce(
    (highestLevel, level) => Math.max(highestLevel, normalizePlayerLevel(level)),
    DEFAULT_PLAYER_LEVEL,
  );
}

function getLeaderboardCapPlayerLevel(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  playerLevel: number,
): number {
  const save = ctx.db.playerGameplaySave.identity.find(identity);

  return Math.max(
    normalizePlayerLevel(playerLevel),
    readSavedPrestigeCapLevel(save?.saveJson),
  );
}

function hasSavedPrestigeProgression(
  previousSaveJson: string | undefined,
  nextSaveJson: string,
): boolean {
  const previousLevels = readSavedPrestigeCompletedLevels(previousSaveJson);
  const nextLevels = readSavedPrestigeCompletedLevels(nextSaveJson);

  if (!previousLevels || !nextLevels) {
    return false;
  }

  const nextLevelSet = new Set(nextLevels);
  const previousLevelSet = new Set(previousLevels);

  return (
    previousLevels.every((level) => nextLevelSet.has(level)) &&
    nextLevels.some((level) => !previousLevelSet.has(level))
  );
}

function syncLeaderboardIncomeFromGameplaySave(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
  previousSaveJson: string | undefined,
  nextSaveJson: string,
) {
  if (!ENABLE_CLIENT_REPORTED_TOTAL_INCOME || !previousSaveJson) {
    return;
  }

  const completedPrestigeLevels = readSavedPrestigeCompletedLevels(nextSaveJson);
  if (!completedPrestigeLevels || completedPrestigeLevels.length === 0) {
    return;
  }

  const previousRunIncome = readSavedTotalGeneratedGold(previousSaveJson) ?? 0n;
  const nextRunIncome = readSavedTotalGeneratedGold(nextSaveJson) ?? 0n;
  let incomeDelta = 0n;

  if (hasSavedPrestigeProgression(previousSaveJson, nextSaveJson)) {
    incomeDelta = nextRunIncome;
  } else if (nextRunIncome > previousRunIncome) {
    incomeDelta = nextRunIncome - previousRunIncome;
  }

  applyLeaderboardIncomeDelta(ctx, player, incomeDelta);
}

function saveJsonHasReplayProgress(saveJson: string): boolean {
  const currentLevel = readSavedCurrentLevel(saveJson);
  if (currentLevel !== null && currentLevel > DEFAULT_PLAYER_LEVEL) {
    return true;
  }

  const totalGeneratedGold = readSavedTotalGeneratedGold(saveJson);
  if (totalGeneratedGold !== null && totalGeneratedGold > 0n) {
    return true;
  }

  const researchCount = readSavedNonDefaultResearchCount(saveJson);
  if (researchCount !== null && researchCount > 0) {
    return true;
  }

  try {
    const save: unknown = JSON.parse(saveJson);
    if (!isRecord(save)) {
      return false;
    }

    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
    if (
      inventory.some((stack) => {
        if (!isRecord(stack)) {
          return false;
        }

        const quantity = Math.floor(Number(stack.quantity));
        return Number.isFinite(quantity) && quantity > 0;
      })
    ) {
      return true;
    }

    const prestige = isRecord(save.prestige) ? save.prestige : {};
    const completedPrestige = Array.isArray(prestige.completedLevels)
      ? prestige.completedLevels
      : [];
    if (completedPrestige.length > 0) {
      return true;
    }

    const crystal = isRecord(save.crystal) ? save.crystal : {};
    const currentCrystal = Math.floor(Number(crystal.current));
    if (Number.isFinite(currentCrystal) && currentCrystal > 0) {
      return true;
    }

    const ruby = isRecord(save.ruby) ? save.ruby : {};
    const currentRuby = Math.floor(Number(ruby.current));
    return Number.isFinite(currentRuby) && currentRuby > 0;
  } catch {
    return false;
  }
}

function isPostResetPlayerWithoutAcceptedSave(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
): boolean {
  const resetGuardMicros =
    player.lastSeenAt.microsSinceUnixEpoch > player.createdAt.microsSinceUnixEpoch
      ? player.lastSeenAt.microsSinceUnixEpoch
      : player.createdAt.microsSinceUnixEpoch;

  return (
    PLAYER_DATA_RESET_GUARD_MICROS > 0n &&
    resetGuardMicros >= PLAYER_DATA_RESET_GUARD_MICROS &&
    !ctx.db.playerGameplaySave.identity.find(player.identity)
  );
}

function shouldIgnorePostResetFirstSave(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
  existingSave: PlayerGameplaySaveRowValue | undefined,
  safeSaveJson: string,
): boolean {
  return (
    !existingSave &&
    isPostResetPlayerWithoutAcceptedSave(ctx, player) &&
    saveJsonHasReplayProgress(safeSaveJson)
  );
}

function shouldIgnorePostResetReportedLevel(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
  playerLevel: number,
): boolean {
  return (
    playerLevel > DEFAULT_PLAYER_LEVEL &&
    isPostResetPlayerWithoutAcceptedSave(ctx, player)
  );
}

function shouldIgnorePostResetReportedGold(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof ensurePlayer>,
  totalGeneratedGold: bigint | number,
): boolean {
  const capPlayerLevel = getLeaderboardCapPlayerLevel(
    ctx,
    player.identity,
    player.playerLevel,
  );
  const reportedTotalIncome = normalizeReportedLeaderboardTotalIncome(
    toBigInt(totalGeneratedGold),
    capPlayerLevel,
  );

  return (
    reportedTotalIncome !== null &&
    reportedTotalIncome > 0n &&
    isPostResetPlayerWithoutAcceptedSave(ctx, player)
  );
}

function upsertPlayerSession(ctx: IdleWizardReducerCtx) {
  const activeConnectionId = ctx.connectionId;
  if (!activeConnectionId) {
    return null;
  }

  const existingSession = ctx.db.playerSession.identity.find(ctx.sender);
  const nextSession = {
    identity: ctx.sender,
    activeConnectionId,
    updatedAt: ctx.timestamp,
  };

  return existingSession
    ? ctx.db.playerSession.identity.update(nextSession)
    : ctx.db.playerSession.insert(nextSession);
}

function isActivePlayerSession(ctx: IdleWizardReducerCtx): boolean {
  const connectionId = ctx.connectionId;
  if (!connectionId) {
    return true;
  }

  const session = ctx.db.playerSession.identity.find(ctx.sender);
  return !session || session.activeConnectionId.isEqual(connectionId);
}

function assertActivePlayerSession(
  ctx: IdleWizardReducerCtx,
  { allowMaintenanceDrainSave = false } = {},
) {
  if (!isActivePlayerSession(ctx)) {
    throw new Error('Account is open on another device.');
  }

  const maintenance = getMaintenanceConfig(ctx);
  if (
    maintenance.mode === MAINTENANCE_MODE_OFF ||
    (allowMaintenanceDrainSave && maintenance.mode === MAINTENANCE_MODE_DRAIN)
  ) {
    return;
  }

  throw new Error('Server maintenance is active.');
}

function assertClientSaveDoesNotDowngradeProgress(
  existingSave: PlayerGameplaySaveRowValue | undefined,
  safeSaveJson: string,
): boolean {
  if (!existingSave) {
    return false;
  }

  const previousPrestigeLevels = readSavedPrestigeCompletedLevels(existingSave.saveJson);
  const nextPrestigeLevels = readSavedPrestigeCompletedLevels(safeSaveJson);
  if (
    previousPrestigeLevels !== null &&
    nextPrestigeLevels !== null &&
    previousPrestigeLevels.some((level) => !nextPrestigeLevels.includes(level))
  ) {
    throw new Error('Refusing older player save: prestige would decrease.');
  }

  const allowsRunProgressReset = hasSavedPrestigeProgression(
    existingSave.saveJson,
    safeSaveJson,
  );
  if (allowsRunProgressReset) {
    return true;
  }

  const previousLevel = readSavedCurrentLevel(existingSave.saveJson);
  const nextLevel = readSavedCurrentLevel(safeSaveJson);

  if (previousLevel !== null && nextLevel !== null && nextLevel < previousLevel) {
    throw new Error('Refusing older player save: level would decrease.');
  }

  const previousTotalGeneratedGold = readSavedTotalGeneratedGold(existingSave.saveJson);
  const nextTotalGeneratedGold = readSavedTotalGeneratedGold(safeSaveJson);

  if (
    previousTotalGeneratedGold !== null &&
    (nextTotalGeneratedGold === null || nextTotalGeneratedGold < previousTotalGeneratedGold)
  ) {
    throw new Error('Refusing older player save: lifetime gold would decrease.');
  }

  const previousResearchCount = readSavedResearchCount(existingSave.saveJson);
  const nextResearchCount = readSavedResearchCount(safeSaveJson);

  if (
    previousResearchCount !== null &&
    nextResearchCount !== null &&
    nextResearchCount < previousResearchCount
  ) {
    throw new Error('Refusing older player save: research would decrease.');
  }

  return false;
}

function mergePreviousResearchProgressIntoSaveJson(
  ctx: IdleWizardReducerCtx,
  safeSaveJson: string,
  previousSaveJson?: string,
): string {
  if (!previousSaveJson || hasSavedPrestigeProgression(previousSaveJson, safeSaveJson)) {
    return safeSaveJson;
  }

  const safeSave = parsePlayerGameplaySaveJson(safeSaveJson);
  const previousSave = parsePlayerGameplaySaveJson(previousSaveJson);

  if (!safeSave || !previousSave) {
    return safeSaveJson;
  }

  const safeResearch = normalizeSaveResearch(safeSave.research);
  const previousResearch = normalizeSaveResearch(previousSave.research);
  const previousRawResearch = isRecord(previousSave.research)
    ? previousSave.research
    : {};
  const previousCompletedIds = normalizeSaveCompletedResearchIds(
    previousRawResearch.completedIds,
  ) ?? [];
  const mergedCompletedIdSet = new Set([
    ...safeResearch.completedIds,
    ...previousCompletedIds,
  ]);
  const mergedCompletedIds = researchCatalog
    .map((research) => research.researchId)
    .filter((researchId) => mergedCompletedIdSet.has(researchId));
  const mergedCompletedSet = new Set(mergedCompletedIds);
  const mergedInProgress = normalizeSaveInProgressResearches(
    {
      inProgress: [
        ...safeResearch.inProgress,
        ...previousResearch.inProgress,
      ],
    },
    mergedCompletedSet,
  );
  const mergedResearch = {
    completedIds: mergedCompletedIds,
    inProgress: mergedInProgress,
  };

  if (mergedResearch.completedIds.length <= safeResearch.completedIds.length) {
    return safeSaveJson;
  }

  const tasks = isRecord(safeSave.tasks) ? safeSave.tasks : {};
  const currentLevel = clampSaveInteger(
    tasks.currentLevel,
    DEFAULT_PLAYER_LEVEL,
    MAX_REPORTED_PLAYER_LEVEL,
    DEFAULT_PLAYER_LEVEL,
  );
  const minimumCurrentCrystal = getMinimumCurrentCrystalForSave(
    ctx,
    currentLevel,
    mergedResearch,
  );
  const mergedSaveJson = JSON.stringify({
    ...safeSave,
    research: mergedResearch,
    crystal: normalizeSaveCrystal(safeSave.crystal, minimumCurrentCrystal),
  });

  if (mergedSaveJson.length > MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH) {
    throw new Error('Invalid player save JSON length.');
  }

  return mergedSaveJson;
}

function getDefaultBrewingMaxIngredients(): number {
  try {
    const config = JSON.parse(DEFAULT_BREWING_CONFIG_JSON) as { maxCauldronIngredients?: unknown };
    return clampSaveInteger(config.maxCauldronIngredients, 1, 10, 5);
  } catch {
    return 5;
  }
}

function getDefaultBottlingDurationMs(): number {
  try {
    const config = JSON.parse(DEFAULT_BREWING_CONFIG_JSON) as { bottlingDurationMs?: unknown };
    return clampSaveInteger(config.bottlingDurationMs, 0, MAX_PLAYER_SAVE_TIMER_MS, 2_000);
  } catch {
    return 2_000;
  }
}

function normalizeSaveItemKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .slice(0, MAX_ITEM_KEY_LENGTH);
}

function normalizeSaveText(value: unknown, maxLength: number): string {
  return stripUnsafeTextControls(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function clampSaveInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const number = Math.floor(Number(value));

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.floor(clampNumber(number, min, max));
}

function clampSaveNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return clampNumber(number, min, max);
}

function clampSaveGoldPrice(value: unknown, max: bigint): number {
  const price = normalizeGoldPrice(typeof value === 'bigint' ? value : Number(value));

  if (price === null) {
    return 0;
  }

  return clampNumber(price, 0, Number(max));
}

function validateGameConfigValue(configKey: string, value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid game config value.');
  }

  if (configKey === 'tasks') {
    validateTasksGameConfig(value);
    return;
  }

  if (configKey === 'playerLevel') {
    validatePlayerLevelGameConfig(value);
    return;
  }

  if (configKey === 'garden') {
    validateGardenGameConfig(value);
    return;
  }

  if (configKey === 'shop') {
    validateShopGameConfig(value);
    return;
  }

  if (configKey === 'research') {
    validateResearchGameConfig(value);
    return;
  }

  if (configKey === 'brewing') {
    validateBrewingGameConfig(value);
    return;
  }

  if (configKey === 'tradeAlliance') {
    validateTradeAllianceGameConfig(value);
    return;
  }

  if (configKey === 'visualSettings') {
    validateVisualSettingsGameConfig(value);
    return;
  }

  if (configKey === 'items') {
    validateItemsGameConfig(value);
    return;
  }

  if (configKey === 'potionRecipes') {
    validatePotionRecipesGameConfig(value);
    return;
  }

  if (configKey === 'maintenance') {
    validateMaintenanceGameConfig(value);
    return;
  }

  throw new Error('Unknown game config key.');
}

function validateTasksGameConfig(value: unknown) {
  const levels = (value as { levels?: unknown }).levels;

  if (
    !Array.isArray(levels) ||
    levels.length < 1 ||
    levels.length > MAX_GAME_CONFIG_LEVELS
  ) {
    throw new Error('Invalid tasks config levels.');
  }

  const seenTaskIds = new Set<string>();

  levels.forEach((levelConfig, levelIndex) => {
    const level = levelConfig as {
      completionCostGold?: unknown;
      level?: unknown;
      tasks?: unknown;
    };

    if (level.level !== levelIndex + 1 || !Array.isArray(level.tasks)) {
      throw new Error('Invalid tasks config level.');
    }

    if (
      level.tasks.length < 1 ||
      level.tasks.length > MAX_GAME_CONFIG_TASKS_PER_LEVEL
    ) {
      throw new Error('Invalid tasks config task count.');
    }

    if (
      level.completionCostGold !== undefined &&
      (!Number.isInteger(Number(level.completionCostGold)) ||
        Number(level.completionCostGold) < 0)
    ) {
      throw new Error('Invalid tasks config completion cost.');
    }

    for (const taskConfig of level.tasks) {
      const task = taskConfig as {
        id?: unknown;
        itemKey?: unknown;
        quantity?: unknown;
      };
      const taskId = normalizeResearchId(String(task.id ?? ''));
      const itemKey = normalizeNpcMarketItemKey(String(task.itemKey ?? ''));
      const quantity = Number(task.quantity);

      if (!taskId || seenTaskIds.has(taskId)) {
        throw new Error('Invalid tasks config task id.');
      }

      if (!npcMarketCatalogByItemKey.has(itemKey)) {
        throw new Error('Invalid tasks config item.');
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_GAME_CONFIG_TASK_QUANTITY
      ) {
        throw new Error('Invalid tasks config quantity.');
      }

      seenTaskIds.add(taskId);
    }
  });
}

function validatePlayerLevelGameConfig(value: unknown) {
  const config = value as {
    maxLevel?: unknown;
    mana?: unknown;
    crystal?: unknown;
    crystalPerLevel?: unknown;
    crystalPerLevelUp?: unknown;
    milestones?: unknown;
    levels?: unknown;
  };
  const maxLevel = Number(config.maxLevel);
  const milestones = config.milestones ?? config.levels;

  if (
    !Number.isInteger(maxLevel) ||
    maxLevel < 1 ||
    maxLevel > MAX_GAME_CONFIG_LEVELS ||
    !Array.isArray(milestones) ||
    milestones.length < 1 ||
    milestones.length > MAX_GAME_CONFIG_LEVELS
  ) {
    throw new Error('Invalid player level config.');
  }

  validatePlayerLevelManaConfig(config.mana);
  validatePlayerLevelCrystalConfig(config);

  let previousLevel = 0;
  let previousGardenTiles = 0;
  let previousCauldrons = 0;
  let previousNpcMarketStands = 0;
  let previousPlayerMarketStands = 0;

  for (const milestoneConfig of milestones) {
    const milestone = milestoneConfig as Record<string, unknown>;
    const level = Number(milestone.level);
    const maxGardenTiles = Number(milestone.maxGardenTiles ?? previousGardenTiles);
    const maxCauldrons = Number(milestone.maxCauldrons ?? previousCauldrons);
    const maxNpcMarketStands = Number(
      milestone.maxNpcMarketStands ?? milestone.maxShopSlots ?? previousNpcMarketStands,
    );
    const maxPlayerMarketStands = Number(
      milestone.maxPlayerMarketStands ?? milestone.maxShopSlots ?? previousPlayerMarketStands,
    );

    if (
      !Number.isInteger(level) ||
      level <= previousLevel ||
      level > maxLevel ||
      !isNonDecreasingBoundedInteger(maxGardenTiles, previousGardenTiles) ||
      !isNonDecreasingBoundedInteger(maxCauldrons, previousCauldrons) ||
      !isNonDecreasingBoundedInteger(maxNpcMarketStands, previousNpcMarketStands) ||
      !isNonDecreasingBoundedInteger(maxPlayerMarketStands, previousPlayerMarketStands)
    ) {
      throw new Error('Invalid player level milestone.');
    }

    validateStringList(milestone.unlocks);
    validateStringList(
      milestone.researchUnlocks ??
        milestone.allowsResearch ??
        milestone.allowsResearching,
    );

    previousLevel = level;
    previousGardenTiles = maxGardenTiles;
    previousCauldrons = maxCauldrons;
    previousNpcMarketStands = maxNpcMarketStands;
    previousPlayerMarketStands = maxPlayerMarketStands;
  }
}

function validatePlayerLevelCrystalConfig(config: {
  crystal?: unknown;
  crystalPerLevel?: unknown;
  crystalPerLevelUp?: unknown;
}) {
  if (
    config.crystal !== undefined &&
    config.crystal !== null &&
    (typeof config.crystal !== 'object' || Array.isArray(config.crystal))
  ) {
    throw new Error('Invalid player level crystal config.');
  }

  const perLevel = readPlayerLevelCrystalPerLevel(config);

  if (perLevel === undefined) {
    return;
  }

  const amount = Number(perLevel);

  if (
    !Number.isInteger(amount) ||
    amount < 0 ||
    amount > MAX_GAME_CONFIG_RESOURCE_LIMIT
  ) {
    throw new Error('Invalid player level crystal config.');
  }
}

function readPlayerLevelCrystalPerLevel(config: {
  crystal?: unknown;
  crystalPerLevel?: unknown;
  crystalPerLevelUp?: unknown;
}) {
  const crystal = isRecord(config.crystal) ? config.crystal : null;
  const nestedPerLevel = crystal ? crystal.perLevel ?? crystal.perLevelUp : undefined;

  return nestedPerLevel ?? config.crystalPerLevel ?? config.crystalPerLevelUp;
}

function validatePlayerLevelManaConfig(value: unknown) {
  if (value === undefined || value === null) {
    return;
  }

  const mana = value as Record<string, unknown>;

  for (const key of [
    'baseMaxManaCap',
    'maxManaCapPerLevel',
    'baseManaPerSecond',
    'manaPerSecondPerLevel',
  ]) {
    const amount = Number(mana[key]);

    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MAX_GAME_CONFIG_RESOURCE_LIMIT
    ) {
      throw new Error('Invalid player level mana config.');
    }
  }
}

function validateGardenGameConfig(value: unknown) {
  const garden = (value as { garden?: unknown }).garden as Record<string, unknown>;

  if (!garden || typeof garden !== 'object' || Array.isArray(garden)) {
    throw new Error('Invalid garden config.');
  }

  const tileCostsGold = garden.tileCostsGold;
  const initialUnlockedTiles = Number(garden.initialUnlockedTiles ?? 0);
  const tilesPerRow = Number(garden.tilesPerRow);
  const harvestSeconds = Number(garden.harvestSeconds);

  validateCostList(tileCostsGold, 1, MAX_GAME_CONFIG_RESOURCE_LIMIT);

  if (
    !Number.isInteger(initialUnlockedTiles) ||
    initialUnlockedTiles < 0 ||
    initialUnlockedTiles > (tileCostsGold as unknown[]).length ||
    !Number.isInteger(tilesPerRow) ||
    tilesPerRow < 1 ||
    tilesPerRow > MAX_GAME_CONFIG_RESOURCE_LIMIT ||
    !Number.isFinite(harvestSeconds) ||
    harvestSeconds <= 0 ||
    harvestSeconds > MAX_GAME_CONFIG_RESOURCE_LIMIT
  ) {
    throw new Error('Invalid garden config.');
  }
}

function validateShopGameConfig(value: unknown) {
  const shopShelf = (value as { shopShelf?: unknown }).shopShelf as Record<string, unknown>;

  if (!shopShelf || typeof shopShelf !== 'object' || Array.isArray(shopShelf)) {
    throw new Error('Invalid shop config.');
  }

  const slotCostsGold = shopShelf.slotCostsGold;
  const initialUnlockedSlots = Number(shopShelf.initialUnlockedSlots ?? 0);
  const autoSellSeconds = Number(shopShelf.autoSellSeconds);

  validateCostList(slotCostsGold, 1, MAX_PLAYER_SHOP_SLOTS);

  if (
    !Number.isInteger(initialUnlockedSlots) ||
    initialUnlockedSlots < 0 ||
    initialUnlockedSlots > (slotCostsGold as unknown[]).length ||
    !Number.isFinite(autoSellSeconds) ||
    autoSellSeconds <= 0 ||
    autoSellSeconds > MAX_GAME_CONFIG_RESOURCE_LIMIT
  ) {
    throw new Error('Invalid shop config.');
  }
}

function validateResearchGameConfig(value: unknown) {
  const config = value as {
    researchCostsGold?: unknown;
    researchCostsCrystal?: unknown;
    researchCostsRuby?: unknown;
    researchDurationsSeconds?: unknown;
  };

  validateCostRecord(config.researchCostsGold, MAX_RESEARCH_COST_GOLD);
  validateCostRecord(config.researchCostsCrystal, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));
  validateCostRecord(config.researchCostsRuby, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));

  if (config.researchDurationsSeconds !== undefined) {
    validateCostRecord(config.researchDurationsSeconds, MAX_RESEARCH_DURATION_SECONDS);
  }
}

function validateVisualSettingsGameConfig(value: unknown) {
  const config = value as {
    costsCrystal?: unknown;
  };
  const costsCrystal = config.costsCrystal as Record<string, unknown>;

  if (!costsCrystal || typeof costsCrystal !== 'object' || Array.isArray(costsCrystal)) {
    throw new Error('Invalid visual settings config.');
  }

  for (const category of ['theme', 'font', 'color']) {
    try {
      validateCostRecord(costsCrystal[category], BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));
    } catch {
      throw new Error('Invalid visual settings config.');
    }
  }
}

function validateBrewingGameConfig(value: unknown) {
  const config = value as Record<string, unknown>;
  const wastedBrewManaCost = Number(config.wastedBrewManaCost);
  const wastedBrewDurationMs = Number(config.wastedBrewDurationMs);
  const bottlingDurationMs = Number(config.bottlingDurationMs);
  const maxCauldronIngredients = Number(config.maxCauldronIngredients);
  const initialUnlockedCauldrons = Number(config.initialUnlockedCauldrons ?? 1);
  const cauldronCostsGold = config.cauldronCostsGold;
  const wastedPotionKey = normalizeNpcMarketItemKey(String(config.wastedPotionKey ?? ''));

  if (
    !Number.isFinite(wastedBrewManaCost) ||
    wastedBrewManaCost < 0 ||
    wastedBrewManaCost > MAX_GAME_CONFIG_RESOURCE_LIMIT ||
    !Number.isFinite(wastedBrewDurationMs) ||
    wastedBrewDurationMs <= 0 ||
    wastedBrewDurationMs > MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000 ||
    !Number.isFinite(bottlingDurationMs) ||
    bottlingDurationMs <= 0 ||
    bottlingDurationMs > MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000 ||
    !Number.isInteger(maxCauldronIngredients) ||
    maxCauldronIngredients < 1 ||
    maxCauldronIngredients > 10 ||
    !Number.isInteger(initialUnlockedCauldrons) ||
    initialUnlockedCauldrons < 1 ||
    !npcMarketCatalogByItemKey.has(wastedPotionKey)
  ) {
    throw new Error('Invalid brewing config.');
  }

  if (cauldronCostsGold !== undefined) {
    validateCostList(cauldronCostsGold, 1, MAX_PLAYER_SAVE_CAULDRONS);

    if (initialUnlockedCauldrons > (cauldronCostsGold as unknown[]).length) {
      throw new Error('Invalid brewing config.');
    }
  }
}

function validateTradeAllianceGameConfig(value: unknown) {
  const config = value as { weeklyQuests?: unknown; dailyQuests?: unknown };
  const questConfigs = config.weeklyQuests ?? config.dailyQuests;

  if (
    !Array.isArray(questConfigs) ||
    questConfigs.length < 1 ||
    questConfigs.length > MAX_TRADE_ALLIANCE_WEEKLY_QUESTS
  ) {
    throw new Error('Invalid trade alliance quest config.');
  }

  const quests = normalizeTradeAllianceWeeklyQuestConfigs(questConfigs);

  if (quests.length !== questConfigs.length) {
    throw new Error('Invalid trade alliance quest config.');
  }
}

function validateItemsGameConfig(value: unknown) {
  const config = value as { seeds?: unknown; herbs?: unknown; potions?: unknown };
  const seenIds = new Set<number>();
  const seenKeys = new Set<string>();

  validateItemDefinitionList(config.seeds, {
    expectedKind: 'seed',
    minCount: 1,
    maxCount: 100,
    seenIds,
    seenKeys,
  });
  validateItemDefinitionList(config.herbs, {
    expectedKind: 'herb',
    minCount: 1,
    maxCount: 100,
    seenIds,
    seenKeys,
  });
  validateItemDefinitionList(config.potions, {
    expectedKind: 'potion',
    minCount: 1,
    maxCount: 150,
    seenIds,
    seenKeys,
  });
}

function validateItemDefinitionList(
  value: unknown,
  {
    expectedKind,
    minCount,
    maxCount,
    seenIds,
    seenKeys,
  }: {
    expectedKind: 'seed' | 'herb' | 'potion';
    minCount: number;
    maxCount: number;
    seenIds: Set<number>;
    seenKeys: Set<string>;
  },
) {
  if (!Array.isArray(value) || value.length < minCount || value.length > maxCount) {
    throw new Error('Invalid item config list.');
  }

  for (const itemConfig of value) {
    const item = itemConfig as Record<string, unknown>;
    const id = Number(item.id);
    const key = normalizeNpcMarketItemKey(String(item.key ?? ''));
    const label = normalizePlayerShopText(String(item.label ?? ''), MAX_ITEM_LABEL_LENGTH);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > MAX_GAME_CONFIG_RESOURCE_LIMIT ||
      seenIds.has(id) ||
      !key ||
      seenKeys.has(key) ||
      !label
    ) {
      throw new Error('Invalid item config identity.');
    }

    seenIds.add(id);
    seenKeys.add(key);

    if (expectedKind === 'seed') {
      validatePositiveInteger(item.producesHerbTypeId, 'Invalid seed item config.');
      validatePositiveNumber(item.dropWeight, 'Invalid seed item config.');
      validateNonNegativeNumber(item.summonManaCost, 'Invalid seed item config.');
      validateNonNegativeNumber(item.baseSellPrice, 'Invalid seed item config.');
      continue;
    }

    if (expectedKind === 'herb') {
      validatePositiveNumber(item.growthDurationMs, 'Invalid herb item config.');
      validateNonNegativeNumber(item.baseSellPrice, 'Invalid herb item config.');
      continue;
    }

    validateNonNegativeNumber(item.baseSellPrice, 'Invalid potion item config.');
  }
}

function validatePotionRecipesGameConfig(value: unknown) {
  const recipes = (value as { recipes?: unknown }).recipes;

  if (!Array.isArray(recipes) || recipes.length < 1 || recipes.length > 150) {
    throw new Error('Invalid potion recipe config.');
  }

  const seenPotionKeys = new Set<string>();

  for (const recipeConfig of recipes) {
    const recipe = recipeConfig as Record<string, unknown>;
    const potionKey = normalizeNpcMarketItemKey(String(recipe.potionKey ?? ''));
    const manaCost = Number(recipe.manaCost);
    const brewDurationMs = Number(recipe.brewDurationMs);
    const ingredients = recipe.ingredients;

    if (
      !potionKey ||
      seenPotionKeys.has(potionKey) ||
      !npcMarketCatalogByItemKey.has(potionKey) ||
      !Number.isFinite(manaCost) ||
      manaCost < 0 ||
      manaCost > MAX_GAME_CONFIG_RESOURCE_LIMIT ||
      !Number.isFinite(brewDurationMs) ||
      brewDurationMs <= 0 ||
      brewDurationMs > MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000 ||
      !Array.isArray(ingredients) ||
      ingredients.length < 1 ||
      ingredients.length > 10
    ) {
      throw new Error('Invalid potion recipe config.');
    }

    seenPotionKeys.add(potionKey);

    for (const ingredientConfig of ingredients) {
      const ingredient = ingredientConfig as Record<string, unknown>;
      const itemKey = normalizeNpcMarketItemKey(String(ingredient.itemKey ?? ''));
      const quantity = Number(ingredient.quantity);

      if (
        !itemKey ||
        !npcMarketCatalogByItemKey.has(itemKey) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_GAME_CONFIG_TASK_QUANTITY
      ) {
        throw new Error('Invalid potion recipe ingredient config.');
      }
    }
  }
}

function validateMaintenanceGameConfig(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('Invalid maintenance config.');
  }

  normalizeMaintenanceMode(value.mode);
  normalizeMaintenanceMessage(value.message);
}

function validateCostList(value: unknown, minLength: number, maxLength: number) {
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) {
    throw new Error('Invalid cost list.');
  }

  for (const cost of value) {
    validateNonNegativeNumber(cost, 'Invalid cost list value.');
  }
}

function validateCostRecord(value: unknown, maxValue: bigint) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid cost record.');
  }

  for (const [key, cost] of Object.entries(value as Record<string, unknown>)) {
    const safeKey = normalizeResearchId(key);
    const safeCost = Number(cost);

    if (
      !safeKey ||
      !Number.isInteger(safeCost) ||
      safeCost < 0 ||
      BigInt(safeCost) > maxValue
    ) {
      throw new Error('Invalid cost record value.');
    }
  }
}

function validatePositiveInteger(value: unknown, message: string) {
  const amount = Number(value);

  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > MAX_GAME_CONFIG_RESOURCE_LIMIT
  ) {
    throw new Error(message);
  }
}

function validatePositiveNumber(value: unknown, message: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000) {
    throw new Error(message);
  }
}

function validateNonNegativeNumber(value: unknown, message: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_GAME_CONFIG_RESOURCE_LIMIT) {
    throw new Error(message);
  }
}

function validateStringList(value: unknown) {
  if (value === undefined || value === null) {
    return;
  }

  if (!Array.isArray(value) || value.length > MAX_GAME_CONFIG_LEVELS) {
    throw new Error('Invalid string list.');
  }

  for (const item of value) {
    if (typeof item !== 'string' || stripUnsafeTextControls(item).length > 80) {
      throw new Error('Invalid string list item.');
    }
  }
}

function isNonDecreasingBoundedInteger(value: number, previousValue: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= previousValue &&
    value <= MAX_GAME_CONFIG_RESOURCE_LIMIT
  );
}

function getLeaderboardTotalIncomeCap(playerLevel: number): bigint {
  if (!ENABLE_CLIENT_REPORTED_TOTAL_INCOME) {
    return 0n;
  }

  return BigInt(normalizePlayerLevel(playerLevel)) * LEADERBOARD_TOTAL_INCOME_CAP_PER_LEVEL;
}

function clampLeaderboardTotalIncome(totalIncome: bigint, playerLevel: number): bigint {
  return clampBigInt(totalIncome, 0n, getLeaderboardTotalIncomeCap(playerLevel));
}

function normalizeReportedLeaderboardTotalIncome(
  totalGeneratedGold: bigint,
  playerLevel: number,
): bigint | null {
  const safeTotalGeneratedGold = toBigInt(totalGeneratedGold);
  const maxTotalIncome = getLeaderboardTotalIncomeCap(playerLevel);

  if (safeTotalGeneratedGold > maxTotalIncome) {
    return null;
  }

  return safeTotalGeneratedGold;
}

function getLeaderboardPeriodDefaults(ctx: IdleWizardReducerCtx, income = 0n) {
  const safeIncome = toBigInt(income);

  return {
    dayKey: getDailyPeriodKey(ctx),
    weekKey: getWeeklyPeriodKey(ctx),
    monthKey: getMonthlyPeriodKey(ctx),
    dailyIncome: safeIncome,
    weeklyIncome: safeIncome,
    monthlyIncome: safeIncome,
  };
}

function shouldSeedLeaderboardPeriodsFromTotalIncome(entry: any) {
  return (
    !String(entry.dayKey ?? '') &&
    !String(entry.weekKey ?? '') &&
    !String(entry.monthKey ?? '') &&
    toBigInt(entry.dailyIncome) === 0n &&
    toBigInt(entry.weeklyIncome) === 0n &&
    toBigInt(entry.monthlyIncome) === 0n
  );
}

function getLeaderboardPeriodValues(
  ctx: IdleWizardReducerCtx,
  entry: any,
  totalIncome = toBigInt(entry.totalIncome),
) {
  const dayKey = getDailyPeriodKey(ctx);
  const weekKey = getWeeklyPeriodKey(ctx);
  const monthKey = getMonthlyPeriodKey(ctx);
  const seedIncome = shouldSeedLeaderboardPeriodsFromTotalIncome(entry)
    ? toBigInt(totalIncome)
    : null;

  return {
    dayKey,
    weekKey,
    monthKey,
    dailyIncome: entry.dayKey === dayKey ? toBigInt(entry.dailyIncome) : seedIncome ?? 0n,
    weeklyIncome: entry.weekKey === weekKey ? toBigInt(entry.weeklyIncome) : seedIncome ?? 0n,
    monthlyIncome: entry.monthKey === monthKey
      ? toBigInt(entry.monthlyIncome)
      : seedIncome ?? 0n,
  };
}

function getLeaderboardSummaryRows(ctx: any) {
  const entries = getLeaderboardEntriesFromIndex(ctx, ctx.db.leaderboard.byTotalIncome);
  const allTimeRanked = getRankedLeaderboardEntries(entries, 'totalIncome');
  const dailyRanked = getRankedLeaderboardEntries(entries, 'dailyIncome');
  const weeklyRanked = getRankedLeaderboardEntries(entries, 'weeklyIncome');
  const monthlyRanked = getRankedLeaderboardEntries(entries, 'monthlyIncome');
  const ranksByIdentity = new Map<string, {
    dailyRank: number;
    weeklyRank: number;
    monthlyRank: number;
    allTimeRank: number;
  }>();
  const visibleByIdentity = new Map<string, (typeof entries)[number]>();
  const addVisible = (entry: (typeof entries)[number]) => {
    visibleByIdentity.set(getIdentityHex(entry.identity), entry);
  };
  const addRanks = (ranked: typeof allTimeRanked, rankKey: keyof {
    dailyRank: number;
    weeklyRank: number;
    monthlyRank: number;
    allTimeRank: number;
  }) => {
    ranked.forEach((entry, index) => {
      const identityKey = getIdentityHex(entry.identity);
      const ranks = ranksByIdentity.get(identityKey) ?? {
        dailyRank: 0,
        weeklyRank: 0,
        monthlyRank: 0,
        allTimeRank: 0,
      };
      ranks[rankKey] = index + 1;
      ranksByIdentity.set(identityKey, ranks);
    });
  };

  addRanks(dailyRanked, 'dailyRank');
  addRanks(weeklyRanked, 'weeklyRank');
  addRanks(monthlyRanked, 'monthlyRank');
  addRanks(allTimeRanked, 'allTimeRank');

  for (const ranked of [dailyRanked, weeklyRanked, monthlyRanked, allTimeRanked]) {
    ranked.slice(0, LEADERBOARD_SUMMARY_LIMIT).forEach(addVisible);
  }

  const ownEntry = ctx.db.leaderboard.identity.find(ctx.sender) as any;
  if (ownEntry) {
    addVisible(normalizeLeaderboardSummaryEntry(ctx, ownEntry));
  }

  return Array.from(visibleByIdentity.values()).map((entry) => {
    const ranks = ranksByIdentity.get(getIdentityHex(entry.identity)) ?? {
      dailyRank: 0,
      weeklyRank: 0,
      monthlyRank: 0,
      allTimeRank: 0,
    };

    return {
      identity: entry.identity,
      username: entry.username,
      allianceTag: getSenderTradeAllianceTag(ctx, entry.identity),
      allianceTagColor: getSenderTradeAllianceTagColor(ctx, entry.identity),
      totalIncome: toBigInt(entry.totalIncome),
      income: toBigInt(entry.totalIncome),
      dailyIncome: toBigInt(entry.dailyIncome),
      weeklyIncome: toBigInt(entry.weeklyIncome),
      monthlyIncome: toBigInt(entry.monthlyIncome),
      updatedAt: new Timestamp(entry.updatedAt.microsSinceUnixEpoch),
      playerLevel: normalizePlayerLevel(entry.playerLevel),
      ...ranks,
    };
  });
}

function getPlayerInfoSummaryRows(ctx: any) {
  const identities = new Map<string, Identity>();
  const addIdentity = (identity: Identity | null | undefined) => {
    if (!identity) {
      return;
    }

    identities.set(getIdentityHex(identity), identity);
  };

  addIdentity(ctx.sender);
  getLeaderboardSummaryRows(ctx).forEach((entry) => addIdentity(entry.identity));

  for (const message of Array.from<any>(ctx.db.worldChat.bySentAt.filter(new Range()))
    .sort((left, right) => {
      const leftSentAt = left.sentAt.microsSinceUnixEpoch;
      const rightSentAt = right.sentAt.microsSinceUnixEpoch;

      if (leftSentAt < rightSentAt) {
        return 1;
      }

      if (leftSentAt > rightSentAt) {
        return -1;
      }

      return right.messageId.compareTo(left.messageId);
    })
    .slice(0, 40)) {
    if (message.username !== 'system') {
      addIdentity(message.senderIdentity);
    }
  }

  const ownMember = ctx.db.tradeAllianceMember.memberIdentity.find(ctx.sender);
  if (ownMember) {
    const ownAllianceKey = getTradeAllianceIdKey(ownMember.allianceId);

    for (const member of ctx.db.tradeAllianceMember.byAllianceId.filter(ownMember.allianceId)) {
      addIdentity(member.memberIdentity);
    }

    for (const application of ctx.db.tradeAllianceApplication.byAllianceId.filter(
      ownMember.allianceId,
    )) {
      addIdentity(application.applicantIdentity);
    }

    for (const message of ctx.db.tradeAllianceChat.byAllianceId.filter(ownMember.allianceId)) {
      addIdentity(message.senderIdentity);
    }

    for (const contribution of ctx.db.tradeAllianceQuestContribution.byAllianceId.filter(
      ownMember.allianceId,
    )) {
      if (getTradeAllianceIdKey(contribution.allianceId) !== ownAllianceKey) {
        continue;
      }

      addIdentity(contribution.contributorIdentity);
    }
  }

  for (const listing of ctx.db.playerShopListing.byQuantity.filter(new Range())) {
    if (Number(listing.quantity) > 0) {
      addIdentity(listing.sellerIdentity);
    }
  }

  for (const request of ctx.db.playerShopRequest.byQuantity.filter(new Range())) {
    if (Number(request.quantity) > 0) {
      addIdentity(request.requesterIdentity);
    }
  }

  for (const trade of getRecentPlayerShopTrades(ctx)) {
    addIdentity(trade.buyerIdentity);
    addIdentity(trade.sellerIdentity);
  }

  for (const trade of getOwnPlayerShopTrades(ctx)) {
    addIdentity(trade.buyerIdentity);
    addIdentity(trade.sellerIdentity);
  }

  for (const discovery of ctx.db.potionRecipeDiscovery.byDiscoveredAt.filter(new Range())) {
    addIdentity(discovery.discoveredByIdentity);
  }

  return Array.from(identities.values()).map((identity) =>
    createPlayerInfoSummaryRow(ctx, identity),
  );
}

function createPlayerInfoSummaryRow(ctx: any, identity: Identity) {
  const player = ctx.db.player.identity.find(identity);
  const leaderboard = ctx.db.leaderboard.identity.find(identity);
  const save = ctx.db.playerGameplaySave.identity.find(identity);
  const savedLevel = readSavedCurrentLevel(save?.saveJson);
  const savedTotalProducedGold = readSavedTotalGeneratedGold(save?.saveJson);
  const prestigeCount = readSavedPrestigeCompletedLevels(save?.saveJson)?.length ?? 0;

  return {
    identity,
    username: String(player?.username ?? leaderboard?.username ?? DEFAULT_USERNAME),
    allianceTag: getSenderTradeAllianceTag(ctx, identity),
    allianceTagColor: getSenderTradeAllianceTagColor(ctx, identity),
    totalProducedGold: toBigInt(leaderboard?.totalIncome ?? savedTotalProducedGold ?? 0n),
    playerLevel: normalizePlayerLevel(
      player?.playerLevel ?? leaderboard?.playerLevel ?? savedLevel ?? DEFAULT_PLAYER_LEVEL,
    ),
    prestigeCount: Math.max(0, Math.floor(Number(prestigeCount) || 0)),
    updatedAt:
      leaderboard?.updatedAt ??
      player?.lastSeenAt ??
      save?.updatedAt ??
      new Timestamp(getContextTimestampMicros(ctx)),
  };
}

function getLeaderboardEntriesFromIndex(
  ctx: any,
  index: { filter: (range: Range<bigint>) => Iterable<any> },
) {
  return Array.from<any>(index.filter(new Range())).map((entry: any) =>
    normalizeLeaderboardSummaryEntry(ctx, entry),
  );
}

function normalizeLeaderboardSummaryEntry(ctx: any, entry: any) {
  const totalIncome = toBigInt(entry.totalIncome);
  const periods = getLeaderboardPeriodValues(ctx, entry, totalIncome);

  return {
    ...entry,
    totalIncome,
    dailyIncome: periods.dailyIncome,
    weeklyIncome: periods.weeklyIncome,
    monthlyIncome: periods.monthlyIncome,
  };
}

function getRankedLeaderboardEntries<T extends { identity: Identity }>(
  entries: T[],
  key: keyof T,
) {
  return [...entries].sort((left, right) => {
    const leftValue = toBigInt(left[key] as bigint | number);
    const rightValue = toBigInt(right[key] as bigint | number);

    if (leftValue < rightValue) {
      return 1;
    }

    if (leftValue > rightValue) {
      return -1;
    }

    return getIdentityHex(left.identity).localeCompare(getIdentityHex(right.identity));
  });
}

function refreshLeaderboardPeriods(
  ctx: IdleWizardReducerCtx,
  entry: any,
  totalIncome = toBigInt(entry.totalIncome),
) {
  const periods = getLeaderboardPeriodValues(ctx, entry, totalIncome);

  if (
    entry.dayKey === periods.dayKey &&
    entry.weekKey === periods.weekKey &&
    entry.monthKey === periods.monthKey &&
    entry.dailyIncome === periods.dailyIncome &&
    entry.weeklyIncome === periods.weeklyIncome &&
    entry.monthlyIncome === periods.monthlyIncome
  ) {
    return entry;
  }

  return ctx.db.leaderboard.identity.update({
    ...entry,
    ...periods,
    updatedAt: ctx.timestamp,
  });
}

function normalizeGameConfigJsonOrDefault(
  configKey: string,
  configJson: string,
  fallbackJson: string,
): string {
  try {
    return validateGameConfigJson(configKey, configJson);
  } catch {
    return fallbackJson;
  }
}

function getNpcBuyPriceGold(marketPriceGold: number): number {
  return roundGoldPrice((marketPriceGold * NPC_MARKET_BUY_BPS) / 10_000);
}

function getNpcSellPriceGold(marketPriceGold: number): number {
  return roundGoldPrice((marketPriceGold * NPC_MARKET_SELL_BPS) / 10_000);
}

function getNpcMarketMaxNeed(_targetNeed: bigint): bigint {
  return 0n;
}

function getNpcMarketNeedState(row: any, targetNeed: bigint) {
  const safeTargetNeed = targetNeed > 0n ? targetNeed : 1n;
  const previousTargetNeed = toBigInt(row.targetNeed ?? 0n);
  const maxNeed = getNpcMarketMaxNeed(safeTargetNeed);
  const rawNeed =
    previousTargetNeed > 0n
      ? toBigInt(row.npcNeed ?? safeTargetNeed)
      : safeTargetNeed;

  return {
    npcNeed: rawNeed > 0n ? rawNeed : 0n,
    targetNeed: safeTargetNeed,
    maxNeed,
  };
}

function getNpcMarketStock(row: any): bigint {
  return clampBigInt(toBigInt(row.npcStock ?? 0n), 0n, NPC_MARKET_MAX_TARGET_STOCK);
}

function getNpcMarketPriceFromNeed(
  marketConfig: Pick<(typeof npcMarketCatalog)[number], 'basePriceGold' | 'volatilityBps'>,
  npcNeed: bigint,
  targetNeed: bigint,
  _maxNeed: bigint,
): number {
  const safeNeed = Number(npcNeed > 0n ? npcNeed : 0n);
  const safeTargetNeed = Number(targetNeed > 0n ? targetNeed : 1n);
  const softness = Math.max(1, (safeTargetNeed * NPC_MARKET_SOFTNESS_BPS) / 10_000);
  const pressure = (safeNeed + softness) / (safeTargetNeed + softness);
  const elasticity = getNpcMarketPriceElasticity(marketConfig);

  return roundGoldPrice(marketConfig.basePriceGold * Math.pow(pressure, elasticity));
}

function getNpcMarketPriceElasticity(
  marketConfig: Pick<(typeof npcMarketCatalog)[number], 'volatilityBps'>,
): number {
  const volatilityBps = Number(
    clampBigInt(toBigInt(marketConfig.volatilityBps), 0n, NPC_MARKET_MAX_VOLATILITY_BPS),
  );

  return 1 + volatilityBps / 10_000;
}

function getNpcMarketRecoveredNeedState(
  ctx: IdleWizardReducerCtx,
  row: any,
  targetNeed: bigint,
) {
  const needState = getNpcMarketNeedState(row, targetNeed);
  const lastTickMicros =
    row.lastTickAt?.microsSinceUnixEpoch ??
    row.updatedAt?.microsSinceUnixEpoch ??
    getContextTimestampMicros(ctx);
  const elapsedMicros = getContextTimestampMicros(ctx) - lastTickMicros;

  if (elapsedMicros <= 0n) {
    return {
      ...needState,
      lastTickAt: row.lastTickAt ?? ctx.timestamp,
      recovered: false,
    };
  }

  const recoveryShare = 1 - Math.pow(
    0.5,
    Number(elapsedMicros) / Number(NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MICROS),
  );
  let nextNpcNeed = needState.npcNeed;

  if (needState.npcNeed < needState.targetNeed) {
    const gap = needState.targetNeed - needState.npcNeed;
    const recovered = BigInt(Math.floor(Number(gap) * recoveryShare));
    nextNpcNeed = needState.npcNeed + recovered;
  } else if (needState.npcNeed > needState.targetNeed) {
    const gap = needState.npcNeed - needState.targetNeed;
    const recovered = BigInt(Math.floor(Number(gap) * recoveryShare));
    nextNpcNeed = needState.npcNeed - recovered;
  }

  return {
    ...needState,
    npcNeed: nextNpcNeed,
    lastTickAt: nextNpcNeed === needState.npcNeed ? row.lastTickAt ?? ctx.timestamp : ctx.timestamp,
    recovered: nextNpcNeed !== needState.npcNeed,
  };
}

function getNpcMarketSellTotalGold(
  marketConfig: Pick<(typeof npcMarketCatalog)[number], 'basePriceGold' | 'volatilityBps'>,
  needState: ReturnType<typeof getNpcMarketNeedState>,
  quantity: number,
): number {
  let totalCents = 0;

  for (let offset = 0; offset < quantity; offset += 1) {
    const offsetNeed = BigInt(offset);
    const npcNeed = needState.npcNeed > offsetNeed ? needState.npcNeed - offsetNeed : 0n;
    const marketPriceGold = getNpcMarketPriceFromNeed(
      marketConfig,
      npcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );
    totalCents += Math.round(getNpcBuyPriceGold(marketPriceGold) * 100);
  }

  return roundGoldPrice(totalCents / 100);
}

function getNpcMarketAutoTuneThreshold(targetStock: bigint): bigint {
  const stockWindow = (targetStock * NPC_MARKET_AUTO_TUNE_WINDOW_BPS) / 10_000n;
  return stockWindow > NPC_MARKET_AUTO_TUNE_MIN_SIGNAL_QUANTITY
    ? stockWindow
    : NPC_MARKET_AUTO_TUNE_MIN_SIGNAL_QUANTITY;
}

function applyNpcMarketAutoTune(
  ctx: IdleWizardReducerCtx,
  marketConfig: ReturnType<typeof normalizeNpcMarketRuntimeConfig>,
  demandScore: bigint,
  supplyScore: bigint,
) {
  const totalSignal = demandScore + supplyScore;

  if (totalSignal < getNpcMarketAutoTuneThreshold(marketConfig.targetStock)) {
    return {
      marketConfig,
      demandScore,
      supplyScore,
    };
  }

  const imbalance = Number(demandScore - supplyScore) / Number(totalSignal);
  const stepBps = Math.round(imbalance * NPC_MARKET_AUTO_TUNE_MAX_STEP_BPS);
  const nextBasePriceGold = roundGoldPrice(
    (marketConfig.basePriceGold * (10_000 + stepBps)) / 10_000,
  );

  if (stepBps !== 0 && nextBasePriceGold !== marketConfig.basePriceGold) {
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(marketConfig.itemKey);

    if (existingConfig) {
      ctx.db.npcMarketItemConfig.itemKey.update({
        ...existingConfig,
        basePriceGold: toStoredGoldPrice(nextBasePriceGold),
        priceScale: GOLD_PRICE_SCALE,
        updatedAt: ctx.timestamp,
      });
    }

    return {
      marketConfig: {
        ...marketConfig,
        basePriceGold: nextBasePriceGold,
      },
      demandScore: 0n,
      supplyScore: 0n,
    };
  }

  return {
    marketConfig,
    demandScore: 0n,
    supplyScore: 0n,
  };
}

function getNpcMarketRowWithQuotes(row: any, marketPriceGold: number) {
  return {
    ...row,
    marketPriceGold: toStoredGoldPrice(marketPriceGold),
    npcBuyPriceGold: toStoredGoldPrice(getNpcBuyPriceGold(marketPriceGold)),
    npcSellPriceGold: toStoredGoldPrice(getNpcSellPriceGold(marketPriceGold)),
    priceScale: GOLD_PRICE_SCALE,
  };
}

function ensureNpcMarketItemConfig(
  ctx: IdleWizardReducerCtx,
  catalogItem: (typeof npcMarketCatalog)[number],
) {
  const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(catalogItem.itemKey);

  if (existingConfig) {
    const itemLabel =
      normalizePlayerShopText(existingConfig.itemLabel, MAX_ITEM_LABEL_LENGTH) ||
      catalogItem.itemLabel;
    const itemKind =
      normalizePlayerShopText(existingConfig.itemKind, MAX_ITEM_KIND_LENGTH) ||
      catalogItem.itemKind;
    const previousDefaultBasePriceGold = normalizeNpcMarketBasePriceGold(
      existingConfig.defaultBasePriceGold,
      catalogItem.basePriceGold,
      existingConfig.priceScale,
    );
    const storedBasePriceGold = normalizeNpcMarketBasePriceGold(
      existingConfig.basePriceGold,
      previousDefaultBasePriceGold,
      existingConfig.priceScale,
    );
    const basePriceGold =
      previousDefaultBasePriceGold !== catalogItem.basePriceGold &&
      storedBasePriceGold === previousDefaultBasePriceGold
        ? catalogItem.basePriceGold
        : storedBasePriceGold;
    const targetStock = normalizeNpcMarketTargetStock(
      existingConfig.targetStock,
      catalogItem.targetStock,
    );
    const volatilityBps = normalizeNpcMarketVolatilityBps(
      existingConfig.volatilityBps,
      catalogItem.volatilityBps,
    );
    const enabled = existingConfig.enabled !== false;

    if (
      existingConfig.itemLabel === itemLabel &&
      existingConfig.itemKind === itemKind &&
      decodeStoredGoldPrice(
        existingConfig.defaultBasePriceGold,
        existingConfig.priceScale,
      ) === catalogItem.basePriceGold &&
      decodeStoredGoldPrice(existingConfig.basePriceGold, existingConfig.priceScale) ===
        basePriceGold &&
      existingConfig.priceScale === GOLD_PRICE_SCALE &&
      existingConfig.targetStock === targetStock &&
      existingConfig.volatilityBps === volatilityBps &&
      existingConfig.enabled === enabled
    ) {
      return existingConfig;
    }

    return ctx.db.npcMarketItemConfig.itemKey.update({
      ...existingConfig,
      itemLabel,
      itemKind,
      defaultBasePriceGold: toStoredGoldPrice(catalogItem.basePriceGold),
      basePriceGold: toStoredGoldPrice(basePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      targetStock,
      volatilityBps,
      enabled,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.npcMarketItemConfig.insert({
    itemKey: catalogItem.itemKey,
    itemLabel: catalogItem.itemLabel,
    itemKind: catalogItem.itemKind,
    defaultBasePriceGold: toStoredGoldPrice(catalogItem.basePriceGold),
    basePriceGold: toStoredGoldPrice(catalogItem.basePriceGold),
    priceScale: GOLD_PRICE_SCALE,
    targetStock: catalogItem.targetStock,
    volatilityBps: catalogItem.volatilityBps,
    enabled: true,
    updatedAt: ctx.timestamp,
  });
}

function normalizeNpcMarketRuntimeConfig(row: any, catalogItem?: (typeof npcMarketCatalog)[number]) {
  const defaultBasePriceGold = normalizeNpcMarketBasePriceGold(
    row.defaultBasePriceGold,
    catalogItem?.basePriceGold ?? 1,
    row.priceScale,
  );

  return {
    itemKey: normalizeNpcMarketItemKey(row.itemKey),
    itemLabel:
      normalizePlayerShopText(row.itemLabel, MAX_ITEM_LABEL_LENGTH) ||
      catalogItem?.itemLabel ||
      normalizeNpcMarketItemKey(row.itemKey),
    itemKind:
      normalizePlayerShopText(row.itemKind, MAX_ITEM_KIND_LENGTH) ||
      catalogItem?.itemKind ||
      'custom',
    defaultBasePriceGold,
    basePriceGold: normalizeNpcMarketBasePriceGold(
      row.basePriceGold,
      defaultBasePriceGold,
      row.priceScale,
    ),
    targetStock: normalizeNpcMarketTargetStock(
      row.targetStock,
      catalogItem?.targetStock ?? NPC_MARKET_DEFAULT_CUSTOM_TARGET_STOCK,
    ),
    volatilityBps: normalizeNpcMarketVolatilityBps(
      row.volatilityBps,
      catalogItem?.volatilityBps ?? NPC_MARKET_DEFAULT_CUSTOM_VOLATILITY_BPS,
    ),
    enabled: row.enabled !== false,
  };
}

function getNpcMarketRuntimeConfig(ctx: IdleWizardReducerCtx, itemKey: string) {
  const safeItemKey = normalizeNpcMarketItemKey(itemKey);
  const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);
  const itemConfig = catalogItem
    ? ensureNpcMarketItemConfig(ctx, catalogItem)
    : ctx.db.npcMarketItemConfig.itemKey.find(safeItemKey);

  if (!itemConfig) {
    throw new Error('Unknown NPC market item.');
  }

  const runtimeConfig = normalizeNpcMarketRuntimeConfig(itemConfig, catalogItem);

  if (!runtimeConfig.enabled) {
    throw new Error('NPC market item is disabled.');
  }

  return runtimeConfig;
}

function deleteNpcMarketPriceIfPresent(ctx: IdleWizardReducerCtx, itemKey: string) {
  const existingRow = ctx.db.npcMarketPrice.itemKey.find(itemKey);

  if (existingRow) {
    ctx.db.npcMarketPrice.delete(existingRow);
  }
}

function ensureNpcMarketItem(ctx: IdleWizardReducerCtx, itemKey: string) {
  const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey);
  const existingRow = ctx.db.npcMarketPrice.itemKey.find(marketConfig.itemKey);

  if (existingRow) {
    const needState = getNpcMarketRecoveredNeedState(
      ctx,
      existingRow,
      marketConfig.targetStock,
    );
    const marketPriceGold = getNpcMarketPriceFromNeed(
      marketConfig,
      needState.npcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );
    const normalizedRow = getNpcMarketRowWithQuotes(
      existingRow,
      marketPriceGold,
    );

    if (
      normalizedRow.itemLabel === marketConfig.itemLabel &&
      normalizedRow.itemKind === marketConfig.itemKind &&
      decodeStoredGoldPrice(normalizedRow.basePriceGold, normalizedRow.priceScale) ===
        marketConfig.basePriceGold &&
      decodeStoredGoldPrice(normalizedRow.marketPriceGold, normalizedRow.priceScale) ===
        marketPriceGold &&
      normalizedRow.priceScale === GOLD_PRICE_SCALE &&
      normalizedRow.targetStock === marketConfig.targetStock &&
      normalizedRow.npcStock === getNpcMarketStock(existingRow) &&
      normalizedRow.npcNeed === needState.npcNeed &&
      normalizedRow.targetNeed === needState.targetNeed &&
      normalizedRow.maxNeed === needState.maxNeed &&
      normalizedRow.lastTickAt === needState.lastTickAt
    ) {
      return normalizedRow;
    }

    return ctx.db.npcMarketPrice.itemKey.update({
      ...normalizedRow,
      itemLabel: marketConfig.itemLabel,
      itemKind: marketConfig.itemKind,
      basePriceGold: toStoredGoldPrice(marketConfig.basePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      targetStock: marketConfig.targetStock,
      npcStock: getNpcMarketStock(existingRow),
      npcNeed: needState.npcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      updatedAt: ctx.timestamp,
      lastTickAt: needState.lastTickAt,
    });
  }

  const targetNeed = marketConfig.targetStock;
  const maxNeed = getNpcMarketMaxNeed(targetNeed);
  const marketPriceGold = getNpcMarketPriceFromNeed(
    marketConfig,
    targetNeed,
    targetNeed,
    maxNeed,
  );

  return ctx.db.npcMarketPrice.insert({
    itemKey: marketConfig.itemKey,
    itemLabel: marketConfig.itemLabel,
    itemKind: marketConfig.itemKind,
    basePriceGold: toStoredGoldPrice(marketConfig.basePriceGold),
    marketPriceGold: toStoredGoldPrice(marketPriceGold),
    npcBuyPriceGold: toStoredGoldPrice(getNpcBuyPriceGold(marketPriceGold)),
    npcSellPriceGold: toStoredGoldPrice(getNpcSellPriceGold(marketPriceGold)),
    priceScale: GOLD_PRICE_SCALE,
    npcStock: 0n,
    targetStock: marketConfig.targetStock,
    npcNeed: targetNeed,
    targetNeed,
    maxNeed,
    demandScore: 0n,
    supplyScore: 0n,
    updatedAt: ctx.timestamp,
    lastTickAt: ctx.timestamp,
  });
}

function ensureNpcMarketCatalog(ctx: IdleWizardReducerCtx) {
  for (const catalogItem of npcMarketCatalog) {
    const config = normalizeNpcMarketRuntimeConfig(
      ensureNpcMarketItemConfig(ctx, catalogItem),
      catalogItem,
    );

    if (config.enabled) {
      ensureNpcMarketItem(ctx, catalogItem.itemKey);
    } else {
      deleteNpcMarketPriceIfPresent(ctx, catalogItem.itemKey);
    }
  }
}

function ensureResearchConfig(
  ctx: IdleWizardReducerCtx,
  catalogResearch: (typeof researchCatalog)[number],
) {
  const existingConfig = ctx.db.researchConfig.researchId.find(catalogResearch.researchId);

  if (existingConfig) {
    const label =
      normalizeResearchLabel(existingConfig.label) || catalogResearch.label;
    const groupId =
      normalizeResearchGroupId(existingConfig.groupId) || catalogResearch.groupId;
    const costGold = normalizeStoredResearchCostGold(
      catalogResearch.researchId,
      existingConfig.costGold,
      catalogResearch.defaultCostGold,
    );
    const enabled = existingConfig.enabled !== false;
    const defaultDurationSeconds =
      researchDefaultDurationSecondsById[catalogResearch.researchId] ?? 0n;
    const durationSeconds = normalizeStoredResearchDurationSeconds(
      catalogResearch.researchId,
      existingConfig.durationSeconds,
      defaultDurationSeconds,
    );

    if (
      existingConfig.label === label &&
      existingConfig.groupId === groupId &&
      existingConfig.defaultCostGold === catalogResearch.defaultCostGold &&
      existingConfig.costGold === costGold &&
      existingConfig.enabled === enabled &&
      existingConfig.durationSeconds === durationSeconds
    ) {
      return existingConfig;
    }

    return ctx.db.researchConfig.researchId.update({
      ...existingConfig,
      label,
      groupId,
      defaultCostGold: catalogResearch.defaultCostGold,
      costGold,
      enabled,
      updatedAt: ctx.timestamp,
      durationSeconds,
    });
  }

  return ctx.db.researchConfig.insert({
    researchId: catalogResearch.researchId,
    label: catalogResearch.label,
    groupId: catalogResearch.groupId,
    defaultCostGold: catalogResearch.defaultCostGold,
    costGold: catalogResearch.defaultCostGold,
    enabled: true,
    updatedAt: ctx.timestamp,
    durationSeconds: researchDefaultDurationSecondsById[catalogResearch.researchId] ?? 0n,
  });
}

function ensureResearchConfigCatalog(ctx: IdleWizardReducerCtx) {
  for (const catalogResearch of researchCatalog) {
    ensureResearchConfig(ctx, catalogResearch);
  }
}

function ensureGameConfig(
  ctx: IdleWizardReducerCtx,
  catalogConfig: (typeof gameConfigCatalog)[number],
) {
  const existingConfig = ctx.db.gameConfig.configKey.find(catalogConfig.configKey);

  if (existingConfig) {
    const configJson = normalizeGameConfigJsonOrDefault(
      catalogConfig.configKey,
      existingConfig.configJson,
      catalogConfig.configJson,
    );

    if (existingConfig.configJson === configJson) {
      return existingConfig;
    }

    return ctx.db.gameConfig.configKey.update({
      ...existingConfig,
      configJson,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.gameConfig.insert({
    configKey: catalogConfig.configKey,
    configJson: catalogConfig.configJson,
    updatedAt: ctx.timestamp,
  });
}

function ensureGameConfigCatalog(ctx: IdleWizardReducerCtx) {
  for (const catalogConfig of gameConfigCatalog) {
    ensureGameConfig(ctx, catalogConfig);
  }
}

function resetNpcMarketRows(
  ctx: IdleWizardReducerCtx,
  { resetStock = false }: { resetStock?: boolean } = {},
) {
  for (const row of ctx.db.npcMarketPrice.iter()) {
    const targetStock = toBigInt(row.targetStock);
    const needState = getNpcMarketNeedState(row, targetStock);
    const basePriceGold = normalizeNpcMarketBasePriceGold(
      row.basePriceGold,
      1,
      row.priceScale,
    );
    const resetRow = getNpcMarketRowWithQuotes(row, basePriceGold);
    const resetNpcStock = resetStock ? 0n : getNpcMarketStock(row);

    if (
      row.marketPriceGold === resetRow.marketPriceGold &&
      row.npcBuyPriceGold === resetRow.npcBuyPriceGold &&
      row.npcSellPriceGold === resetRow.npcSellPriceGold &&
      row.npcStock === resetNpcStock &&
      row.npcNeed === needState.targetNeed &&
      row.targetNeed === needState.targetNeed &&
      row.maxNeed === needState.maxNeed &&
      row.demandScore === 0n &&
      row.supplyScore === 0n
    ) {
      continue;
    }

    ctx.db.npcMarketPrice.itemKey.update({
      ...resetRow,
      npcStock: resetNpcStock,
      npcNeed: needState.targetNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      demandScore: 0n,
      supplyScore: 0n,
      updatedAt: ctx.timestamp,
      lastTickAt: ctx.timestamp,
    });
  }
}

function sanitizeSharedPlayerRows(ctx: IdleWizardReducerCtx) {
  for (const player of ctx.db.player.iter()) {
    const username = normalizeUsername(player.username);
    const playerLevel = normalizePlayerLevel(player.playerLevel);
    const theme = normalizePlayerTheme(player.theme);
    const font = normalizePlayerFont(player.font);
    const colorMode = normalizePlayerColorMode(player.colorMode);
    const usernamePromptSeen = Boolean(player.usernamePromptSeen);

    if (
      player.username === username &&
      player.playerLevel === playerLevel &&
      player.theme === theme &&
      player.font === font &&
      player.colorMode === colorMode &&
      player.usernamePromptSeen === usernamePromptSeen
    ) {
      continue;
    }

    ctx.db.player.identity.update({
      ...player,
      username,
      playerLevel,
      theme,
      font,
      colorMode,
      usernamePromptSeen,
      lastSeenAt: ctx.timestamp,
    });
  }
}

function sanitizeLeaderboardRows(ctx: IdleWizardReducerCtx) {
  for (const rawEntry of ctx.db.leaderboard.iter()) {
    const username = normalizeUsername(rawEntry.username);
    const playerLevel = normalizePlayerLevel(rawEntry.playerLevel);
    const capPlayerLevel = getLeaderboardCapPlayerLevel(
      ctx,
      rawEntry.identity,
      playerLevel,
    );
    const totalIncome = clampLeaderboardTotalIncome(rawEntry.totalIncome, capPlayerLevel);
    const periods = getLeaderboardPeriodValues(ctx, rawEntry, totalIncome);

    if (
      rawEntry.username === username &&
      rawEntry.playerLevel === playerLevel &&
      rawEntry.totalIncome === totalIncome &&
      rawEntry.dayKey === periods.dayKey &&
      rawEntry.weekKey === periods.weekKey &&
      rawEntry.monthKey === periods.monthKey &&
      rawEntry.dailyIncome === periods.dailyIncome &&
      rawEntry.weeklyIncome === periods.weeklyIncome &&
      rawEntry.monthlyIncome === periods.monthlyIncome
    ) {
      continue;
    }

    ctx.db.leaderboard.identity.update({
      ...rawEntry,
      username,
      playerLevel,
      totalIncome,
      ...periods,
      updatedAt: ctx.timestamp,
    });
  }
}

function backfillLeaderboardTotalIncomeFromGameplaySaves(ctx: IdleWizardReducerCtx) {
  if (!ENABLE_CLIENT_REPORTED_TOTAL_INCOME) {
    return;
  }

  for (const save of ctx.db.playerGameplaySave.iter()) {
    const savedTotalIncome = readSavedTotalGeneratedGold(save.saveJson);

    if (savedTotalIncome === null || savedTotalIncome <= 0n) {
      continue;
    }

    const player = ctx.db.player.identity.find(save.identity);
    const existingEntry = ctx.db.leaderboard.identity.find(save.identity);
    const username = normalizeUsername(
      player?.username ?? existingEntry?.username ?? DEFAULT_USERNAME,
    );
    const playerLevel = normalizePlayerLevel(
      player?.playerLevel ?? existingEntry?.playerLevel ?? DEFAULT_PLAYER_LEVEL,
    );
    const capPlayerLevel = getLeaderboardCapPlayerLevel(
      ctx,
      save.identity,
      playerLevel,
    );
    const reportedTotalIncome = normalizeReportedLeaderboardTotalIncome(
      savedTotalIncome,
      capPlayerLevel,
    );

    if (reportedTotalIncome === null) {
      continue;
    }

    const currentTotalIncome = clampLeaderboardTotalIncome(
      existingEntry?.totalIncome ?? 0n,
      capPlayerLevel,
    );
    const totalIncome =
      reportedTotalIncome > currentTotalIncome ? reportedTotalIncome : currentTotalIncome;
    const periods = existingEntry
      ? getLeaderboardPeriodValues(ctx, existingEntry, totalIncome)
      : getLeaderboardPeriodDefaults(ctx, totalIncome);

    if (existingEntry) {
      if (
        existingEntry.username === username &&
        existingEntry.playerLevel === playerLevel &&
        existingEntry.totalIncome === totalIncome &&
        existingEntry.dayKey === periods.dayKey &&
        existingEntry.weekKey === periods.weekKey &&
        existingEntry.monthKey === periods.monthKey &&
        existingEntry.dailyIncome === periods.dailyIncome &&
        existingEntry.weeklyIncome === periods.weeklyIncome &&
        existingEntry.monthlyIncome === periods.monthlyIncome
      ) {
        continue;
      }

      ctx.db.leaderboard.identity.update({
        ...existingEntry,
        username,
        playerLevel,
        totalIncome,
        ...periods,
        updatedAt: ctx.timestamp,
      });
      continue;
    }

    ctx.db.leaderboard.insert({
      identity: save.identity,
      username,
      playerLevel,
      totalIncome,
      ...periods,
      updatedAt: ctx.timestamp,
    });
  }
}

function runStartupMaintenanceOnce(ctx: IdleWizardReducerCtx) {
  if (ctx.db.maintenanceState.stateKey.find(STARTUP_MAINTENANCE_STATE_KEY)) {
    return;
  }

  backfillShopConfigForDirectSell(ctx);
  backfillPlayerLevelMarketStandMilestones(ctx);
  sanitizeSharedPlayerRows(ctx);
  backfillLeaderboardTotalIncomeFromGameplaySaves(ctx);
  sanitizeLeaderboardRows(ctx);
  backfillPlayerGameplaySaveLevelCrystals(ctx);
  ensureNpcMarketCatalog(ctx);
  resetNpcMarketRows(ctx, { resetStock: true });
  ctx.db.maintenanceState.insert({
    stateKey: STARTUP_MAINTENANCE_STATE_KEY,
    appliedAt: ctx.timestamp,
  });
}

function backfillShopConfigForDirectSell(ctx: IdleWizardReducerCtx) {
  const row = ctx.db.gameConfig.configKey.find('shop');
  if (!row) {
    return;
  }

  let config: any;
  try {
    config = JSON.parse(row.configJson);
  } catch {
    return;
  }

  const shopShelf = config?.shopShelf;
  if (!shopShelf || typeof shopShelf !== 'object' || Array.isArray(shopShelf)) {
    return;
  }

  if (
    Number(shopShelf.autoSellSeconds) === 1_800 &&
    Number(shopShelf.initialUnlockedSlots ?? 0) === 0
  ) {
    return;
  }

  const configJson = validateGameConfigJson('shop', JSON.stringify({
    ...config,
    shopShelf: {
      ...shopShelf,
      initialUnlockedSlots: 0,
      autoSellSeconds: 1_800,
    },
  }));

  ctx.db.gameConfig.configKey.update({
    ...row,
    configJson,
    updatedAt: ctx.timestamp,
  });
}

function backfillPlayerLevelMarketStandMilestones(ctx: IdleWizardReducerCtx) {
  const row = ctx.db.gameConfig.configKey.find('playerLevel');
  if (!row) {
    return;
  }

  let config: any;
  try {
    config = JSON.parse(row.configJson);
  } catch {
    return;
  }

  const rawMilestones = config?.milestones ?? config?.levels;
  if (!Array.isArray(rawMilestones)) {
    return;
  }

  const milestones = insertLevelFourMarketStandMilestone(rawMilestones);
  const nextMilestones = milestones.map((milestone: any) => {
    const maxMarketStands = getDefaultMarketStandsForLevel(Number(milestone?.level));

    return {
      ...milestone,
      maxNpcMarketStands: maxMarketStands,
      maxPlayerMarketStands: maxMarketStands,
    };
  });

  if (JSON.stringify(rawMilestones) === JSON.stringify(nextMilestones)) {
    return;
  }

  const configJson = validateGameConfigJson('playerLevel', JSON.stringify({
    ...config,
    milestones: nextMilestones,
  }));

  ctx.db.gameConfig.configKey.update({
    ...row,
    configJson,
    updatedAt: ctx.timestamp,
  });
}

function insertLevelFourMarketStandMilestone(milestones: any[]) {
  if (milestones.some((milestone) => Number(milestone?.level) === 4)) {
    return milestones;
  }

  const result: any[] = [];
  let previous: any = null;
  let inserted = false;

  for (const milestone of milestones) {
    const level = Number(milestone?.level);

    if (!inserted && level > 4) {
      result.push({
        ...(previous ?? milestone),
        level: 4,
      });
      inserted = true;
    }

    result.push(milestone);
    previous = milestone;
  }

  if (!inserted) {
    result.push({
      ...(previous ?? {}),
      level: 4,
    });
  }

  return result;
}

function getDefaultMarketStandsForLevel(level: number) {
  if (level < 4) {
    return 0;
  }

  if (level < 5) {
    return 1;
  }

  if (level < 10) {
    return 2;
  }

  if (level < 13) {
    return 3;
  }

  if (level < 17) {
    return 4;
  }

  return 5;
}

function deleteAllPotionDiscoveries(ctx: IdleWizardReducerCtx) {
  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    ctx.db.potionRecipeDiscovery.delete(discovery);
  }
}

function ensurePlayer(
  ctx: IdleWizardReducerCtx,
  { touchLastSeen = true }: { touchLastSeen?: boolean } = {},
) {
  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  const username = normalizeUsername(existingPlayer?.username ?? DEFAULT_USERNAME);
  const theme = normalizePlayerTheme(existingPlayer?.theme ?? DEFAULT_PLAYER_THEME);
  const font = normalizePlayerFont(existingPlayer?.font ?? DEFAULT_PLAYER_FONT);
  const colorMode = normalizePlayerColorMode(
    existingPlayer?.colorMode ?? DEFAULT_PLAYER_COLOR_MODE,
  );
  const usernamePromptSeen = Boolean(existingPlayer?.usernamePromptSeen);

  if (existingPlayer) {
    const playerLevel = normalizePlayerLevel(existingPlayer.playerLevel);
    const lastSeenAt = touchLastSeen ? ctx.timestamp : existingPlayer.lastSeenAt;
    const shouldUpdate =
      existingPlayer.username !== username ||
      existingPlayer.playerLevel !== playerLevel ||
      existingPlayer.theme !== theme ||
      existingPlayer.font !== font ||
      existingPlayer.colorMode !== colorMode ||
      Boolean(existingPlayer.usernamePromptSeen) !== usernamePromptSeen ||
      existingPlayer.connected !== true ||
      lastSeenAt.microsSinceUnixEpoch !== existingPlayer.lastSeenAt.microsSinceUnixEpoch;

    if (!shouldUpdate) {
      return existingPlayer;
    }

    return ctx.db.player.identity.update({
      ...existingPlayer,
      username,
      playerLevel,
      theme,
      font,
      colorMode,
      usernamePromptSeen,
      connected: true,
      lastSeenAt,
    });
  }

  return ctx.db.player.insert({
    identity: ctx.sender,
    username,
    playerLevel: DEFAULT_PLAYER_LEVEL,
    theme: DEFAULT_PLAYER_THEME,
    font: DEFAULT_PLAYER_FONT,
    colorMode: DEFAULT_PLAYER_COLOR_MODE,
    usernamePromptSeen: false,
    connected: true,
    createdAt: ctx.timestamp,
    lastSeenAt: ctx.timestamp,
  });
}

function ensureLeaderboardEntry(
  ctx: IdleWizardReducerCtx,
  username: string,
  playerLevel = DEFAULT_PLAYER_LEVEL,
) {
  const safePlayerLevel = normalizePlayerLevel(playerLevel);
  const capPlayerLevel = getLeaderboardCapPlayerLevel(
    ctx,
    ctx.sender,
    safePlayerLevel,
  );
  const rawExistingEntry = ctx.db.leaderboard.identity.find(ctx.sender);
  const safeExistingTotalIncome = rawExistingEntry
    ? clampLeaderboardTotalIncome(rawExistingEntry.totalIncome, capPlayerLevel)
    : 0n;
  const existingEntry = rawExistingEntry
    ? refreshLeaderboardPeriods(ctx, rawExistingEntry, safeExistingTotalIncome)
    : undefined;

  if (existingEntry) {
    const shouldUpdate =
      existingEntry.username !== username ||
      existingEntry.playerLevel !== safePlayerLevel ||
      toBigInt(existingEntry.totalIncome) !== safeExistingTotalIncome ||
      rawExistingEntry?.dayKey !== existingEntry.dayKey ||
      rawExistingEntry?.weekKey !== existingEntry.weekKey ||
      rawExistingEntry?.monthKey !== existingEntry.monthKey ||
      toBigInt(rawExistingEntry?.dailyIncome ?? 0n) !== toBigInt(existingEntry.dailyIncome) ||
      toBigInt(rawExistingEntry?.weeklyIncome ?? 0n) !== toBigInt(existingEntry.weeklyIncome) ||
      toBigInt(rawExistingEntry?.monthlyIncome ?? 0n) !== toBigInt(existingEntry.monthlyIncome);

    if (!shouldUpdate) {
      return existingEntry;
    }

    return ctx.db.leaderboard.identity.update({
      ...existingEntry,
      username,
      playerLevel: safePlayerLevel,
      totalIncome: safeExistingTotalIncome,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.leaderboard.insert({
    identity: ctx.sender,
    username,
    playerLevel: safePlayerLevel,
    totalIncome: 0n,
    ...getLeaderboardPeriodDefaults(ctx),
    updatedAt: ctx.timestamp,
  });
}

function applyLeaderboardIncomeDelta(
  ctx: IdleWizardReducerCtx,
  player: { identity: Identity; username: string; playerLevel: number },
  delta: bigint,
) {
  const safeDelta = toBigInt(delta);

  if (safeDelta <= 0n) {
    return;
  }

  const entry = ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
  const capPlayerLevel = getLeaderboardCapPlayerLevel(
    ctx,
    player.identity,
    player.playerLevel,
  );
  const currentTotalIncome = clampLeaderboardTotalIncome(
    entry.totalIncome,
    capPlayerLevel,
  );
  const maxTotalIncome = getLeaderboardTotalIncomeCap(capPlayerLevel);
  const remainingAllowedIncome =
    maxTotalIncome > currentTotalIncome ? maxTotalIncome - currentTotalIncome : 0n;
  const incomeDelta =
    safeDelta > remainingAllowedIncome ? remainingAllowedIncome : safeDelta;

  if (incomeDelta <= 0n) {
    return;
  }

  ctx.db.leaderboard.identity.update({
    ...entry,
    totalIncome: currentTotalIncome + incomeDelta,
    dailyIncome: toBigInt(entry.dailyIncome) + incomeDelta,
    weeklyIncome: toBigInt(entry.weeklyIncome) + incomeDelta,
    monthlyIncome: toBigInt(entry.monthlyIncome) + incomeDelta,
    updatedAt: ctx.timestamp,
  });
  applyTradeAllianceIncomeDelta(ctx, player, incomeDelta);
}

function assertWorldChatRateLimit(ctx: IdleWizardReducerCtx) {
  const windowStartMicros =
    ctx.timestamp.microsSinceUnixEpoch - WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS;
  let sentInWindow = 0;
  let globalSentInWindow = 0;
  const windowStart = new Timestamp(windowStartMicros);

  for (const row of ctx.db.worldChat.bySentAt.filter(
    new Range({ tag: 'included', value: windowStart }),
  )) {
    globalSentInWindow += 1;

    if (row.senderIdentity.isEqual(ctx.sender)) {
      sentInWindow += 1;
    }
  }

  if (sentInWindow >= WORLD_CHAT_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('World chat is rate limited.');
  }

  if (globalSentInWindow >= WORLD_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('World chat is globally rate limited.');
  }
}

function assertFeedbackRateLimit(ctx: IdleWizardReducerCtx) {
  const windowStartMicros =
    ctx.timestamp.microsSinceUnixEpoch - FEEDBACK_RATE_LIMIT_WINDOW_MICROS;
  let sentInWindow = 0;

  for (const row of ctx.db.playerFeedback.iter()) {
    if (
      row.senderIdentity.isEqual(ctx.sender) &&
      row.submittedAt.microsSinceUnixEpoch >= windowStartMicros
    ) {
      sentInWindow += 1;
    }
  }

  if (sentInWindow >= FEEDBACK_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('Feedback is rate limited.');
  }
}

function deleteAllPlayerShopState(ctx: IdleWizardReducerCtx) {
  for (const listing of Array.from(ctx.db.playerShopListing.iter())) {
    ctx.db.playerShopListing.delete(listing);
  }

  for (const request of Array.from(ctx.db.playerShopRequest.iter())) {
    ctx.db.playerShopRequest.delete(request);
  }

  for (const proceeds of Array.from(ctx.db.playerShopProceeds.iter())) {
    ctx.db.playerShopProceeds.delete(proceeds);
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.iter())) {
    ctx.db.playerShopTrade.delete(trade);
  }
}

function deletePlayerShopProgressionForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  for (const listing of Array.from(ctx.db.playerShopListing.iter())) {
    if (listing.sellerIdentity.isEqual(identity)) {
      ctx.db.playerShopListing.delete(listing);
    }
  }

  for (const request of Array.from(ctx.db.playerShopRequest.iter())) {
    if (request.requesterIdentity.isEqual(identity)) {
      ctx.db.playerShopRequest.delete(request);
    }
  }

  const proceeds = ctx.db.playerShopProceeds.sellerIdentity.find(identity);
  if (proceeds) {
    ctx.db.playerShopProceeds.delete(proceeds);
  }
}

function deleteAllPlayerGameplaySaves(ctx: IdleWizardReducerCtx) {
  for (const save of Array.from(ctx.db.playerGameplaySave.iter())) {
    ctx.db.playerGameplaySave.delete(save);
  }
}

function deleteAllPlayerSessions(ctx: IdleWizardReducerCtx) {
  for (const session of Array.from(ctx.db.playerSession.iter())) {
    ctx.db.playerSession.delete(session);
  }
}

function deleteAllPlayerFeedback(ctx: IdleWizardReducerCtx) {
  for (const row of Array.from(ctx.db.playerFeedback.iter())) {
    ctx.db.playerFeedback.delete(row);
  }
}

function deleteAllPlayerRows(ctx: IdleWizardReducerCtx) {
  for (const player of Array.from(ctx.db.player.iter())) {
    ctx.db.player.delete(player);
  }
}

function deletePlayerGameplaySaveForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  const save = ctx.db.playerGameplaySave.identity.find(identity);
  if (save) {
    ctx.db.playerGameplaySave.delete(save);
  }
}

function deleteAllLeaderboardState(ctx: IdleWizardReducerCtx) {
  for (const entry of Array.from(ctx.db.leaderboard.iter())) {
    ctx.db.leaderboard.delete(entry);
  }
}

function resetLeaderboardProgressForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  username: string,
) {
  const existingEntry = ctx.db.leaderboard.identity.find(identity);
  const resetEntry = {
    identity,
    username,
    playerLevel: DEFAULT_PLAYER_LEVEL,
    totalIncome: 0n,
    ...getLeaderboardPeriodDefaults(ctx, 0n),
    updatedAt: ctx.timestamp,
  };

  if (existingEntry) {
    ctx.db.leaderboard.identity.update({
      ...existingEntry,
      ...resetEntry,
    });
    return;
  }

  ctx.db.leaderboard.insert(resetEntry);
}

function deleteAllWorldChatMessages(ctx: IdleWizardReducerCtx) {
  for (const row of Array.from(ctx.db.worldChat.iter())) {
    ctx.db.worldChat.delete(row);
  }
}

function deleteAllTradeAllianceState(ctx: IdleWizardReducerCtx) {
  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.iter())) {
    ctx.db.tradeAllianceRewardInbox.delete(reward);
  }

  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    ctx.db.tradeAllianceQuestContribution.delete(contribution);
  }

  for (const quest of Array.from(ctx.db.tradeAllianceQuestProgress.iter())) {
    ctx.db.tradeAllianceQuestProgress.delete(quest);
  }

  for (const chat of Array.from(ctx.db.tradeAllianceChat.iter())) {
    ctx.db.tradeAllianceChat.delete(chat);
  }

  for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
    ctx.db.tradeAllianceApplication.delete(application);
  }

  for (const member of Array.from(ctx.db.tradeAllianceMember.iter())) {
    ctx.db.tradeAllianceMember.delete(member);
  }

  for (const alliance of Array.from(ctx.db.tradeAlliance.iter())) {
    ctx.db.tradeAlliance.delete(alliance);
  }
}

function deleteTradeAllianceProgressionForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.iter())) {
    if (reward.recipientIdentity.isEqual(identity)) {
      ctx.db.tradeAllianceRewardInbox.delete(reward);
    }
  }

  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    if (contribution.contributorIdentity.isEqual(identity)) {
      ctx.db.tradeAllianceQuestContribution.delete(contribution);
    }
  }

  for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
    if (application.applicantIdentity.isEqual(identity)) {
      ctx.db.tradeAllianceApplication.delete(application);
    }
  }

  const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);
  if (!member) {
    return;
  }

  const allianceId = member.allianceId;
  ctx.db.tradeAllianceMember.delete(member);
  refreshAdminMergedAlliance(ctx, allianceId);
}

function resetAllPlayerSharedProgress(ctx: IdleWizardReducerCtx) {
  for (const player of Array.from(ctx.db.player.iter())) {
    ctx.db.player.identity.update({
      ...player,
      username: normalizeUsername(player.username),
      playerLevel: DEFAULT_PLAYER_LEVEL,
      theme: normalizePlayerTheme(player.theme),
      font: normalizePlayerFont(player.font),
      colorMode: normalizePlayerColorMode(player.colorMode),
      usernamePromptSeen: Boolean(player.usernamePromptSeen),
      lastSeenAt: ctx.timestamp,
    });
  }
}

function resetPlayerSharedProgress(
  ctx: IdleWizardReducerCtx,
  player: ReturnType<typeof findPlayerByIdentityHex>,
) {
  return ctx.db.player.identity.update({
    ...player,
    username: normalizeUsername(player.username),
    playerLevel: DEFAULT_PLAYER_LEVEL,
    theme: normalizePlayerTheme(player.theme),
    font: normalizePlayerFont(player.font),
    colorMode: normalizePlayerColorMode(player.colorMode),
    usernamePromptSeen: Boolean(player.usernamePromptSeen),
    connected: false,
    lastSeenAt: ctx.timestamp,
  });
}

function moveAdminTradeAllianceApplications(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
    if (!application.applicantIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const targetKey = getTradeAllianceApplicationKey(application.allianceId, targetIdentity);
    const existingTarget = ctx.db.tradeAllianceApplication.applicationKey.find(targetKey);
    if (existingTarget) {
      ctx.db.tradeAllianceApplication.delete(existingTarget);
    }

    ctx.db.tradeAllianceApplication.delete(application);
    ctx.db.tradeAllianceApplication.insert({
      ...application,
      applicationKey: targetKey,
      applicantIdentity: targetIdentity,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
    });
  }
}

function moveAdminTradeAllianceContributions(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
) {
  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    if (!contribution.contributorIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const targetKey = getTradeAllianceContributionKey(
      contribution.allianceId,
      contribution.dayKey,
      contribution.questId,
      targetIdentity,
    );
    const existingTarget = ctx.db.tradeAllianceQuestContribution.contributionKey.find(
      targetKey,
    );
    const targetContribution = existingTarget
      ? toBigInt(existingTarget.contribution) + toBigInt(contribution.contribution)
      : toBigInt(contribution.contribution);

    if (existingTarget) {
      ctx.db.tradeAllianceQuestContribution.delete(existingTarget);
    }

    ctx.db.tradeAllianceQuestContribution.delete(contribution);
    ctx.db.tradeAllianceQuestContribution.insert({
      ...contribution,
      contributionKey: targetKey,
      contributorIdentity: targetIdentity,
      username: targetUsername,
      contribution: targetContribution,
      updatedAt: ctx.timestamp,
    });
  }
}

function moveAdminTradeAllianceRewards(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
) {
  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.iter())) {
    if (!reward.recipientIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const targetKey = getTradeAllianceRewardKey(
      reward.dayKey,
      reward.questId,
      targetIdentity,
    );
    const existingTarget = ctx.db.tradeAllianceRewardInbox.rewardKey.find(targetKey);
    const collected = Boolean(reward.collected) || Boolean(existingTarget?.collected);

    if (existingTarget) {
      ctx.db.tradeAllianceRewardInbox.delete(existingTarget);
    }

    ctx.db.tradeAllianceRewardInbox.delete(reward);
    ctx.db.tradeAllianceRewardInbox.insert({
      ...reward,
      rewardKey: targetKey,
      recipientIdentity: targetIdentity,
      collected,
    });
  }
}

function refreshAdminMergedAlliance(ctx: IdleWizardReducerCtx, allianceId: any) {
  const alliance = ctx.db.tradeAlliance.allianceId.find(allianceId);
  if (!alliance) {
    return;
  }

  const members = getTradeAllianceMembers(ctx, alliance.allianceId);
  if (members.length <= 0) {
    deleteTradeAllianceState(ctx, alliance);
    return;
  }

  const currentLeader = members.find((member) =>
    member.memberIdentity.isEqual(alliance.leaderIdentity),
  );
  const nextLeader =
    currentLeader ??
    members.find((member) => member.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER) ??
    members[0];

  if (nextLeader.role !== TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...nextLeader,
      role: TRADE_ALLIANCE_ROLE_TRADE_MASTER,
      updatedAt: ctx.timestamp,
    });
  }

  for (const member of members) {
    if (
      !member.memberIdentity.isEqual(nextLeader.memberIdentity) &&
      member.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER
    ) {
      ctx.db.tradeAllianceMember.memberIdentity.update({
        ...member,
        role: TRADE_ALLIANCE_ROLE_TRADER,
        updatedAt: ctx.timestamp,
      });
    }
  }

  ctx.db.tradeAlliance.allianceId.update({
    ...alliance,
    leaderIdentity: nextLeader.memberIdentity,
    memberCount: members.length,
    updatedAt: ctx.timestamp,
  });
}

function addAdminAffectedAllianceId(allianceIds: any[], allianceId: any) {
  const allianceKey = getTradeAllianceIdKey(allianceId);
  if (allianceIds.some((existingAllianceId) => getTradeAllianceIdKey(existingAllianceId) === allianceKey)) {
    return;
  }

  allianceIds.push(allianceId);
}

function moveAdminTradeAllianceMember(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  const sourceMember = ctx.db.tradeAllianceMember.memberIdentity.find(sourceIdentity);
  const targetMember = ctx.db.tradeAllianceMember.memberIdentity.find(targetIdentity);
  const affectedAllianceIds: any[] = [];

  if (sourceMember) {
    addAdminAffectedAllianceId(affectedAllianceIds, sourceMember.allianceId);
  }
  if (targetMember) {
    addAdminAffectedAllianceId(affectedAllianceIds, targetMember.allianceId);
  }

  if (sourceMember) {
    const sameAlliance =
      targetMember &&
      getTradeAllianceIdKey(targetMember.allianceId) ===
        getTradeAllianceIdKey(sourceMember.allianceId);
    const totalContribution =
      toBigInt(sourceMember.totalContribution) +
      (sameAlliance ? toBigInt(targetMember.totalContribution) : 0n);
    const dailyContribution =
      toBigInt(sourceMember.dailyContribution) +
      (sameAlliance && targetMember.dayKey === sourceMember.dayKey
        ? toBigInt(targetMember.dailyContribution)
        : 0n);

    if (targetMember) {
      ctx.db.tradeAllianceMember.delete(targetMember);
    }

    ctx.db.tradeAllianceMember.delete(sourceMember);
    ctx.db.tradeAllianceMember.insert({
      ...sourceMember,
      memberIdentity: targetIdentity,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
      totalContribution,
      dailyContribution,
      updatedAt: ctx.timestamp,
    });
  } else if (targetMember) {
    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...targetMember,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
      updatedAt: ctx.timestamp,
    });
  }

  for (const allianceId of affectedAllianceIds) {
    refreshAdminMergedAlliance(ctx, allianceId);
  }
}

function moveAdminPlayerShopRows(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
) {
  for (const listing of Array.from(ctx.db.playerShopListing.iter())) {
    if (!listing.sellerIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const targetKey = getPlayerShopListingKeyForIdentity(targetIdentity, listing.slotNumber);
    const existingTarget = ctx.db.playerShopListing.listingKey.find(targetKey);
    if (existingTarget) {
      ctx.db.playerShopListing.delete(existingTarget);
    }

    ctx.db.playerShopListing.delete(listing);
    ctx.db.playerShopListing.insert({
      ...listing,
      listingKey: targetKey,
      sellerIdentity: targetIdentity,
      username: targetUsername,
      updatedAt: ctx.timestamp,
    });
  }

  for (const request of Array.from(ctx.db.playerShopRequest.iter())) {
    if (!request.requesterIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const targetKey = getPlayerShopRequestKeyForIdentity(targetIdentity, request.slotNumber);
    const existingTarget = ctx.db.playerShopRequest.requestKey.find(targetKey);
    if (existingTarget) {
      ctx.db.playerShopRequest.delete(existingTarget);
    }

    ctx.db.playerShopRequest.delete(request);
    ctx.db.playerShopRequest.insert({
      ...request,
      requestKey: targetKey,
      requesterIdentity: targetIdentity,
      username: targetUsername,
      updatedAt: ctx.timestamp,
    });
  }

  const sourceProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(sourceIdentity);
  if (sourceProceeds) {
    const targetProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(targetIdentity);
    if (targetProceeds) {
      ctx.db.playerShopProceeds.sellerIdentity.update({
        ...sourceProceeds,
        sellerIdentity: targetIdentity,
        gold: toBigInt(sourceProceeds.gold) + toBigInt(targetProceeds.gold),
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.playerShopProceeds.insert({
        ...sourceProceeds,
        sellerIdentity: targetIdentity,
        updatedAt: ctx.timestamp,
      });
    }
    ctx.db.playerShopProceeds.delete(sourceProceeds);
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.iter())) {
    if (
      !trade.buyerIdentity.isEqual(sourceIdentity) &&
      !trade.sellerIdentity.isEqual(sourceIdentity)
    ) {
      continue;
    }

    ctx.db.playerShopTrade.tradeId.update({
      ...trade,
      buyerIdentity: trade.buyerIdentity.isEqual(sourceIdentity)
        ? targetIdentity
        : trade.buyerIdentity,
      buyerUsername: trade.buyerIdentity.isEqual(sourceIdentity)
        ? targetUsername
        : trade.buyerUsername,
      sellerIdentity: trade.sellerIdentity.isEqual(sourceIdentity)
        ? targetIdentity
        : trade.sellerIdentity,
      sellerUsername: trade.sellerIdentity.isEqual(sourceIdentity)
        ? targetUsername
        : trade.sellerUsername,
    });
  }
}

function moveAdminMessageRows(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  sourceUsername: string,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  for (const row of Array.from(ctx.db.worldChat.iter())) {
    if (!row.senderIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    const isSystemMessage = row.username === 'system';
    const systemBody = row.body
      .replace(`${sourceUsername} reached level `, `${targetUsername} reached level `)
      .replace(`${sourceUsername} reached ⭐ `, `${targetUsername} reached ⭐ `);
    ctx.db.worldChat.messageId.update({
      ...row,
      senderIdentity: targetIdentity,
      username: isSystemMessage ? row.username : targetUsername,
      body: isSystemMessage ? systemBody : row.body,
      playerLevel: isSystemMessage ? row.playerLevel : targetPlayerLevel,
    });
  }

  for (const row of Array.from(ctx.db.tradeAllianceChat.iter())) {
    if (!row.senderIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    ctx.db.tradeAllianceChat.messageId.update({
      ...row,
      senderIdentity: targetIdentity,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
    });
  }

  for (const row of Array.from(ctx.db.playerFeedback.iter())) {
    if (!row.senderIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    ctx.db.playerFeedback.feedbackId.update({
      ...row,
      senderIdentity: targetIdentity,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
    });
  }
}

function moveAdminPotionDiscoveries(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
) {
  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    if (!discovery.discoveredByIdentity.isEqual(sourceIdentity)) {
      continue;
    }

    ctx.db.potionRecipeDiscovery.potionKey.update({
      ...discovery,
      discoveredByIdentity: targetIdentity,
      username: targetUsername,
    });
  }
}

function deleteAdminPlayerSession(ctx: IdleWizardReducerCtx, identity: Identity) {
  const session = ctx.db.playerSession.identity.find(identity);
  if (session) {
    ctx.db.playerSession.delete(session);
  }
}

function assertAdminMergeAccountsInactive(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
) {
  if (
    ctx.db.playerSession.identity.find(sourceIdentity) ||
    ctx.db.playerSession.identity.find(targetIdentity)
  ) {
    throw new Error('Cannot merge active player sessions.');
  }
}

function pruneWorldChat(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.worldChat.bySentAt.filter(new Range()));

  while (rows.length > WORLD_CHAT_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.worldChat.delete(row);
    }
  }
}

function pruneTradeAllianceChat(ctx: IdleWizardReducerCtx, allianceId: unknown) {
  const allianceKey = getTradeAllianceIdKey(allianceId);
  const rows = Array.from(ctx.db.tradeAllianceChat.iter())
    .filter((row) => getTradeAllianceIdKey(row.allianceId) === allianceKey)
    .sort((left, right) => {
      const leftSentAt = left.sentAt.microsSinceUnixEpoch;
      const rightSentAt = right.sentAt.microsSinceUnixEpoch;

      if (leftSentAt < rightSentAt) {
        return -1;
      }

      if (leftSentAt > rightSentAt) {
        return 1;
      }

      return left.messageId.compareTo(right.messageId);
    });

  while (rows.length > TRADE_ALLIANCE_CHAT_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.tradeAllianceChat.delete(row);
    }
  }
}

function deleteTradeAllianceApplications(ctx: IdleWizardReducerCtx, allianceId: unknown) {
  const allianceKey = getTradeAllianceIdKey(allianceId);

  for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
    if (getTradeAllianceIdKey(application.allianceId) === allianceKey) {
      ctx.db.tradeAllianceApplication.delete(application);
    }
  }
}

function deleteTradeAllianceState(ctx: IdleWizardReducerCtx, alliance: any) {
  const allianceKey = getTradeAllianceIdKey(alliance.allianceId);

  for (const member of Array.from(ctx.db.tradeAllianceMember.iter())) {
    if (getTradeAllianceIdKey(member.allianceId) === allianceKey) {
      ctx.db.tradeAllianceMember.delete(member);
    }
  }

  deleteTradeAllianceApplications(ctx, alliance.allianceId);

  for (const chat of Array.from(ctx.db.tradeAllianceChat.iter())) {
    if (getTradeAllianceIdKey(chat.allianceId) === allianceKey) {
      ctx.db.tradeAllianceChat.delete(chat);
    }
  }

  for (const quest of Array.from(ctx.db.tradeAllianceQuestProgress.iter())) {
    if (getTradeAllianceIdKey(quest.allianceId) === allianceKey) {
      ctx.db.tradeAllianceQuestProgress.delete(quest);
    }
  }

  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    if (getTradeAllianceIdKey(contribution.allianceId) === allianceKey) {
      ctx.db.tradeAllianceQuestContribution.delete(contribution);
    }
  }

  ctx.db.tradeAlliance.delete(alliance);
}

function hasWorldChatBodyForSender(ctx: IdleWizardReducerCtx, body: string): boolean {
  for (const row of ctx.db.worldChat.bySentAt.filter(new Range())) {
    if (row.username === 'system' && row.senderIdentity.isEqual(ctx.sender) && row.body === body) {
      return true;
    }
  }

  return false;
}

function hasLevelUpAnnouncementForSender(
  ctx: IdleWizardReducerCtx,
  playerLevel: number,
): boolean {
  const levelSuffix = ` reached level ${playerLevel}`;

  for (const row of ctx.db.worldChat.bySentAt.filter(new Range())) {
    if (
      row.username === 'system' &&
      row.senderIdentity.isEqual(ctx.sender) &&
      row.body.endsWith(levelSuffix)
    ) {
      return true;
    }
  }

  return false;
}

function hasPrestigeAnnouncementForSender(
  ctx: IdleWizardReducerCtx,
  prestigeCount: number,
  playerLevel: number,
): boolean {
  const prestigeSuffix = ` reached ⭐ ${prestigeCount}, completing prestige level ${playerLevel}`;

  for (const row of ctx.db.worldChat.iter()) {
    if (
      row.username === 'system' &&
      row.senderIdentity.isEqual(ctx.sender) &&
      row.body.endsWith(prestigeSuffix)
    ) {
      return true;
    }
  }

  return false;
}

function getSenderTradeAllianceTag(ctx: IdleWizardReducerCtx, identity = ctx.sender): string {
  const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);
  if (!member) {
    return '';
  }

  const alliance = ctx.db.tradeAlliance.allianceId.find(member.allianceId);
  return alliance?.tag ?? '';
}

function getSenderTradeAllianceTagColor(
  ctx: IdleWizardReducerCtx,
  identity = ctx.sender,
): string {
  const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);
  if (!member) {
    return DEFAULT_TRADE_ALLIANCE_TAG_COLOR;
  }

  const alliance = ctx.db.tradeAlliance.allianceId.find(member.allianceId);
  return normalizeTradeAllianceTagColor(alliance?.tagColor);
}

function prunePlayerShopTradeHistory(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.playerShopTrade.byTradedAt.filter(new Range()));

  while (rows.length > PLAYER_SHOP_TRADE_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.playerShopTrade.delete(row);
    }
  }
}

function getRecentPlayerShopTrades(ctx: { db: any }) {
  return Array.from<any>(ctx.db.playerShopTrade.byTradedAt.filter(new Range()))
    .slice(-PLAYER_SHOP_TRADE_HISTORY_LIMIT)
    .reverse();
}

function getOwnPlayerShopTrades(ctx: { sender: Identity; db: any }) {
  const byTradeId = new Map<string, any>();
  const addRows = (rows: Iterable<any>) => {
    for (const row of rows) {
      byTradeId.set(getTradeAllianceIdKey(row.tradeId), row);
    }
  };

  addRows(ctx.db.playerShopTrade.byBuyerIdentity.filter(ctx.sender));
  addRows(ctx.db.playerShopTrade.bySellerIdentity.filter(ctx.sender));

  return Array.from<any>(byTradeId.values())
    .sort(comparePlayerShopTradesNewestFirst)
    .slice(0, PLAYER_SHOP_TRADE_HISTORY_LIMIT);
}

function comparePlayerShopTradesOldestFirst(left: any, right: any) {
  const leftTradedAt = left.tradedAt.microsSinceUnixEpoch;
  const rightTradedAt = right.tradedAt.microsSinceUnixEpoch;

  if (leftTradedAt < rightTradedAt) {
    return -1;
  }

  if (leftTradedAt > rightTradedAt) {
    return 1;
  }

  return left.tradeId.compareTo(right.tradeId);
}

function comparePlayerShopTradesNewestFirst(left: any, right: any) {
  return comparePlayerShopTradesOldestFirst(right, left);
}

function isConfiguredNpcMarketAdmin(ctx: IdleWizardReducerCtx): boolean {
  return npcMarketAdminIdentityAllowlist.has(getIdentityHex(ctx.sender));
}

function assertGameConfigAdmin(ctx: IdleWizardReducerCtx) {
  if (isConfiguredNpcMarketAdmin(ctx)) {
    return;
  }

  throw new Error('Game config requires admin.');
}

function assertNpcMarketAdmin(ctx: IdleWizardReducerCtx) {
  assertGameConfigAdmin(ctx);
}

function assertMaintenanceLocked(ctx: IdleWizardReducerCtx) {
  if (getMaintenanceConfig(ctx).mode === MAINTENANCE_MODE_LOCKED) {
    return;
  }

  throw new Error('Maintenance must be locked.');
}

export const onConnect = spacetimedb.clientConnected((ctx) => {
  ensureResearchConfigCatalog(ctx);
  ensureGameConfigCatalog(ctx);
  runStartupMaintenanceOnce(ctx);
  ensureNpcMarketCatalog(ctx);

  if (getMaintenanceConfig(ctx).mode === MAINTENANCE_MODE_LOCKED) {
    return;
  }

  upsertPlayerSession(ctx);
  if (!ENABLE_CLIENT_POTION_DISCOVERY) {
    deleteAllPotionDiscoveries(ctx);
  }
  const player = ensurePlayer(ctx);
  if (!isPostResetPlayerWithoutAcceptedSave(ctx, player)) {
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
  }
  const tradeAllianceMember = getTradeAllianceMember(ctx);
  if (tradeAllianceMember) {
    try {
      refreshTradeAllianceMemberQuestPeriod(ctx, tradeAllianceMember);
      refreshTradeAllianceDay(
        ctx,
        findTradeAllianceById(ctx, getTradeAllianceIdKey(tradeAllianceMember.allianceId)),
      );
    } catch {
      ctx.db.tradeAllianceMember.delete(tradeAllianceMember);
    }
  }
  if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
    deleteAllPlayerShopState(ctx);
  }
});

export const init = spacetimedb.init((ctx) => {
  ensureResearchConfigCatalog(ctx);
  ensureGameConfigCatalog(ctx);
  runStartupMaintenanceOnce(ctx);
  ensureNpcMarketCatalog(ctx);
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  if (!isActivePlayerSession(ctx)) {
    return;
  }

  const existingSession = ctx.db.playerSession.identity.find(ctx.sender);
  if (existingSession) {
    ctx.db.playerSession.delete(existingSession);
  }

  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  if (!existingPlayer) {
    return;
  }

  ctx.db.player.identity.update({
    ...existingPlayer,
    connected: false,
    lastSeenAt: ctx.timestamp,
  });
});

export const set_username = spacetimedb.reducer({ username: t.string() }, (ctx, { username }) => {
  assertActivePlayerSession(ctx);

  const normalizedUsername = normalizeUsername(username);
  assertUsernameAvailable(ctx, normalizedUsername);

  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  let player;

  if (existingPlayer) {
    player = ctx.db.player.identity.update({
      ...existingPlayer,
      username: normalizedUsername,
      playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
      theme: normalizePlayerTheme(existingPlayer.theme),
      font: normalizePlayerFont(existingPlayer.font),
      colorMode: normalizePlayerColorMode(existingPlayer.colorMode),
      usernamePromptSeen:
        Boolean(existingPlayer.usernamePromptSeen) ||
        normalizedUsername !== DEFAULT_USERNAME,
      lastSeenAt: ctx.timestamp,
    });
  } else {
    player = ctx.db.player.insert({
      identity: ctx.sender,
      username: normalizedUsername,
      playerLevel: DEFAULT_PLAYER_LEVEL,
      theme: DEFAULT_PLAYER_THEME,
      font: DEFAULT_PLAYER_FONT,
      colorMode: DEFAULT_PLAYER_COLOR_MODE,
      usernamePromptSeen: normalizedUsername !== DEFAULT_USERNAME,
      connected: true,
      createdAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
    });
  }

  ensureLeaderboardEntry(ctx, normalizedUsername, player.playerLevel);
  updateTradeAllianceMemberProfile(ctx, player.identity, player.username, player.playerLevel);
});

export const set_player_profile = spacetimedb.reducer(
  {
    username: t.string(),
    theme: t.string(),
    colorMode: t.string(),
    usernamePromptSeen: t.bool(),
    font: t.string(),
  },
  (ctx, { username, theme, colorMode, usernamePromptSeen, font }) => {
    assertActivePlayerSession(ctx);

    const normalizedUsername = normalizeUsername(username);
    const safeTheme = normalizePlayerTheme(theme);
    const safeFont = normalizePlayerFont(font);
    const safeColorMode = normalizePlayerColorMode(colorMode);
    const incomingUsernamePromptSeen =
      Boolean(usernamePromptSeen) || normalizedUsername !== DEFAULT_USERNAME;
    const existingPlayer = ctx.db.player.identity.find(ctx.sender);
    const nextUsernamePromptSeen =
      Boolean(existingPlayer?.usernamePromptSeen) || incomingUsernamePromptSeen;

    if (
      existingPlayer &&
      existingPlayer.username === normalizedUsername &&
      normalizePlayerTheme(existingPlayer.theme) === safeTheme &&
      normalizePlayerFont(existingPlayer.font) === safeFont &&
      normalizePlayerColorMode(existingPlayer.colorMode) === safeColorMode &&
      Boolean(existingPlayer.usernamePromptSeen) === nextUsernamePromptSeen
    ) {
      return;
    }

    assertUsernameAvailable(ctx, normalizedUsername);

    let player;

    if (existingPlayer) {
      player = ctx.db.player.identity.update({
        ...existingPlayer,
        username: normalizedUsername,
        playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
        theme: safeTheme,
        font: safeFont,
        colorMode: safeColorMode,
        usernamePromptSeen: nextUsernamePromptSeen,
        lastSeenAt: ctx.timestamp,
      });
    } else {
      player = ctx.db.player.insert({
        identity: ctx.sender,
        username: normalizedUsername,
        playerLevel: DEFAULT_PLAYER_LEVEL,
        theme: safeTheme,
        font: safeFont,
        colorMode: safeColorMode,
        usernamePromptSeen: incomingUsernamePromptSeen,
        connected: true,
        createdAt: ctx.timestamp,
        lastSeenAt: ctx.timestamp,
      });
    }

    ensureLeaderboardEntry(ctx, normalizedUsername, player.playerLevel);
    updateTradeAllianceMemberProfile(ctx, player.identity, player.username, player.playerLevel);
  },
);

export const set_admin_player_data = spacetimedb.reducer(
  {
    identityHex: t.string(),
    username: t.string(),
    playerLevel: t.u32(),
    totalIncome: t.u64(),
    currentGold: t.f64(),
    currentCrystal: t.u32(),
    theme: t.string(),
    colorMode: t.string(),
    font: t.string(),
    usernamePromptSeen: t.bool(),
  },
  (
    ctx,
    {
      identityHex,
      username,
      playerLevel,
      totalIncome,
      currentGold,
      currentCrystal,
      theme,
      colorMode,
      font,
      usernamePromptSeen,
    },
  ) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const normalizedUsername = normalizeUsername(username);
    const safePlayerLevel = validateAdminPlayerLevel(playerLevel);
    const safeTotalIncome = toBigInt(totalIncome);
    const safeCurrentGold = validateAdminCurrentGold(currentGold);
    const safeCurrentCrystal = validateAdminCurrentCrystal(currentCrystal);
    const safeTheme = normalizePlayerTheme(theme);
    const safeColorMode = normalizePlayerColorMode(colorMode);
    const safeFont = normalizePlayerFont(font);
    const safeUsernamePromptSeen =
      Boolean(usernamePromptSeen) || normalizedUsername !== DEFAULT_USERNAME;
    const existingSave = ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined;
    const safeSaveJson = createAdminPlayerGameplaySaveJson(
      ctx,
      existingSave,
      player.identity,
      safeCurrentGold,
      safeCurrentCrystal,
    );

    assertUsernameAvailableForIdentity(ctx, normalizedUsername, player.identity);

    const nextPlayer = ctx.db.player.identity.update({
      ...player,
      username: normalizedUsername,
      playerLevel: safePlayerLevel,
      theme: safeTheme,
      colorMode: safeColorMode,
      font: safeFont,
      usernamePromptSeen: safeUsernamePromptSeen,
      lastSeenAt: ctx.timestamp,
    });
    updateTradeAllianceMemberProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );

    const rawExistingEntry = ctx.db.leaderboard.identity.find(player.identity);
    const existingEntry = rawExistingEntry
      ? refreshLeaderboardPeriods(ctx, rawExistingEntry, safeTotalIncome)
      : undefined;
    upsertAdminPlayerGameplaySave(ctx, nextPlayer.identity, safeSaveJson, existingSave);

    if (existingEntry) {
      ctx.db.leaderboard.identity.update({
        ...existingEntry,
        username: nextPlayer.username,
        playerLevel: nextPlayer.playerLevel,
        totalIncome: safeTotalIncome,
        updatedAt: ctx.timestamp,
      });
      return;
    }

    ctx.db.leaderboard.insert({
      identity: nextPlayer.identity,
      username: nextPlayer.username,
      playerLevel: nextPlayer.playerLevel,
      totalIncome: safeTotalIncome,
      ...getLeaderboardPeriodDefaults(ctx, safeTotalIncome),
      updatedAt: ctx.timestamp,
    });
  },
);

export const admin_merge_player_accounts = spacetimedb.reducer(
  {
    sourceIdentityHex: t.string(),
    targetIdentityHex: t.string(),
  },
  (ctx, { sourceIdentityHex, targetIdentityHex }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const sourcePlayer = findPlayerByIdentityHex(ctx, sourceIdentityHex);
    const targetPlayer = findPlayerByIdentityHex(ctx, targetIdentityHex);
    if (sourcePlayer.identity.isEqual(targetPlayer.identity)) {
      throw new Error('Source and target players must differ.');
    }

    assertAdminMergeAccountsInactive(ctx, sourcePlayer.identity, targetPlayer.identity);

    const targetUsername = normalizeUsername(targetPlayer.username);
    const sourceUsername = normalizeUsername(sourcePlayer.username);
    const targetPlayerLevel = normalizePlayerLevel(sourcePlayer.playerLevel);
    const nextTargetPlayer = ctx.db.player.identity.update({
      ...targetPlayer,
      playerLevel: targetPlayerLevel,
      theme: normalizePlayerTheme(sourcePlayer.theme),
      colorMode: normalizePlayerColorMode(sourcePlayer.colorMode),
      font: normalizePlayerFont(sourcePlayer.font),
      usernamePromptSeen:
        Boolean(targetPlayer.usernamePromptSeen) ||
        Boolean(sourcePlayer.usernamePromptSeen) ||
        targetUsername !== DEFAULT_USERNAME,
      connected: false,
      lastSeenAt: ctx.timestamp,
    });

    moveAdminPlayerGameplaySave(ctx, sourcePlayer.identity, nextTargetPlayer.identity);
    moveAdminLeaderboardEntry(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
      targetPlayerLevel,
    );
    moveAdminTradeAllianceApplications(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
      targetPlayerLevel,
    );
    moveAdminTradeAllianceContributions(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
    );
    moveAdminTradeAllianceRewards(ctx, sourcePlayer.identity, nextTargetPlayer.identity);
    moveAdminTradeAllianceMember(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
      targetPlayerLevel,
    );
    moveAdminPlayerShopRows(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
    );
    moveAdminMessageRows(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      sourceUsername,
      targetUsername,
      targetPlayerLevel,
    );
    moveAdminPotionDiscoveries(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      targetUsername,
    );

    deleteAdminPlayerSession(ctx, sourcePlayer.identity);
    ctx.db.player.delete(sourcePlayer);
  },
);

export const set_player_gameplay_save = spacetimedb.reducer(
  { saveJson: t.string() },
  (ctx, { saveJson }) => {
    assertActivePlayerSession(ctx, { allowMaintenanceDrainSave: true });

    const player = ensurePlayer(ctx);

    const existingSave = ctx.db.playerGameplaySave.identity.find(ctx.sender) ?? undefined;
    const safeSaveJson = mergePreviousResearchProgressIntoSaveJson(
      ctx,
      validatePlayerGameplaySaveJson(
        ctx,
        saveJson,
        existingSave?.saveJson,
      ),
      existingSave?.saveJson,
    );
    if (shouldIgnorePostResetFirstSave(ctx, player, existingSave, safeSaveJson)) {
      return;
    }

    const allowsRunProgressReset = assertClientSaveDoesNotDowngradeProgress(
      existingSave,
      safeSaveJson,
    );
    const nextSave = {
      identity: ctx.sender,
      saveJson: safeSaveJson,
      updatedAt: ctx.timestamp,
    };

    if (existingSave) {
      ctx.db.playerGameplaySave.identity.update(nextSave);
      const nextPlayer = syncPlayerLevelFromGameplaySave(ctx, player, safeSaveJson, {
        allowDecrease: allowsRunProgressReset,
      });
      syncLeaderboardIncomeFromGameplaySave(
        ctx,
        nextPlayer,
        existingSave.saveJson,
        safeSaveJson,
      );
      return;
    }

    ctx.db.playerGameplaySave.insert(nextSave);
    const nextPlayer = syncPlayerLevelFromGameplaySave(ctx, player, safeSaveJson);
    syncLeaderboardIncomeFromGameplaySave(ctx, nextPlayer, undefined, safeSaveJson);
  },
);

export const set_player_level = spacetimedb.reducer(
  { playerLevel: t.u32() },
  (ctx, { playerLevel }) => {
    assertActivePlayerSession(ctx);

    const player = ensurePlayer(ctx, { touchLastSeen: false });
    const safePlayerLevel = normalizePlayerLevel(playerLevel);

    if (shouldIgnorePostResetReportedLevel(ctx, player, safePlayerLevel)) {
      return;
    }

    if (safePlayerLevel <= player.playerLevel) {
      ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
      return;
    }

    const nextPlayer =
      ctx.db.player.identity.update({
        ...player,
        playerLevel: safePlayerLevel,
        lastSeenAt: ctx.timestamp,
      });

    ensureLeaderboardEntry(ctx, nextPlayer.username, nextPlayer.playerLevel);
    updateTradeAllianceMemberProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );
  },
);

export const announce_level_up = spacetimedb.reducer(
  { playerLevel: t.u32() },
  (ctx, { playerLevel }) => {
    assertActivePlayerSession(ctx);

    const safePlayerLevel = normalizePlayerLevel(playerLevel);

    if (safePlayerLevel <= DEFAULT_PLAYER_LEVEL) {
      return;
    }

    const player = ensurePlayer(ctx);

    if (shouldIgnorePostResetReportedLevel(ctx, player, safePlayerLevel)) {
      return;
    }

    const alreadyAtLevel = safePlayerLevel <= player.playerLevel;
    const nextPlayer =
      alreadyAtLevel
        ? player
        : ctx.db.player.identity.update({
            ...player,
            playerLevel: safePlayerLevel,
            lastSeenAt: ctx.timestamp,
          });
    ensureLeaderboardEntry(ctx, nextPlayer.username, nextPlayer.playerLevel);
    updateTradeAllianceMemberProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );

    const body = `${nextPlayer.username} reached level ${safePlayerLevel}`;
    if (
      (alreadyAtLevel && hasLevelUpAnnouncementForSender(ctx, safePlayerLevel)) ||
      hasWorldChatBodyForSender(ctx, body)
    ) {
      return;
    }

    assertWorldChatRateLimit(ctx);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body,
      sentAt: ctx.timestamp,
      allianceTag: '',
      allianceTagColor: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    });
    pruneWorldChat(ctx);
  },
);

export const announce_prestige = spacetimedb.reducer(
  { prestigeCount: t.u32(), playerLevel: t.u32() },
  (ctx, { prestigeCount, playerLevel }) => {
    assertActivePlayerSession(ctx);

    const safePrestigeCount = Math.max(0, Math.floor(Number(prestigeCount) || 0));
    const safePlayerLevel = normalizePlayerLevel(playerLevel);

    if (safePrestigeCount <= 0 || safePlayerLevel <= DEFAULT_PLAYER_LEVEL) {
      return;
    }

    const player = ensurePlayer(ctx);

    if (shouldIgnorePostResetReportedLevel(ctx, player, safePlayerLevel)) {
      return;
    }

    const nextPlayer =
      safePlayerLevel <= player.playerLevel
        ? player
        : ctx.db.player.identity.update({
            ...player,
            playerLevel: safePlayerLevel,
            lastSeenAt: ctx.timestamp,
          });
    ensureLeaderboardEntry(ctx, nextPlayer.username, nextPlayer.playerLevel);
    updateTradeAllianceMemberProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );

    const body =
      `${nextPlayer.username} reached ⭐ ${safePrestigeCount}, ` +
      `completing prestige level ${safePlayerLevel}`;
    if (
      hasPrestigeAnnouncementForSender(ctx, safePrestigeCount, safePlayerLevel) ||
      hasWorldChatBodyForSender(ctx, body)
    ) {
      return;
    }

    assertWorldChatRateLimit(ctx);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body,
      sentAt: ctx.timestamp,
      allianceTag: '',
      allianceTagColor: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    });
    pruneWorldChat(ctx);
  },
);

export const set_total_generated_gold = spacetimedb.reducer(
  { totalGeneratedGold: t.u64() },
  (ctx, { totalGeneratedGold }) => {
    assertActivePlayerSession(ctx);

    const player = ensurePlayer(ctx, { touchLastSeen: false });
    const capPlayerLevel = getLeaderboardCapPlayerLevel(
      ctx,
      player.identity,
      player.playerLevel,
    );
    const reportedTotalIncome = normalizeReportedLeaderboardTotalIncome(
      totalGeneratedGold,
      capPlayerLevel,
    );

    if (shouldIgnorePostResetReportedGold(ctx, player, totalGeneratedGold)) {
      return;
    }

    const rawExistingEntry = ctx.db.leaderboard.identity.find(player.identity);
    if (
      !rawExistingEntry &&
      (reportedTotalIncome === null || reportedTotalIncome <= 0n) &&
      isPostResetPlayerWithoutAcceptedSave(ctx, player)
    ) {
      return;
    }

    const entry = ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
    const currentTotalIncome = clampLeaderboardTotalIncome(
      entry.totalIncome,
      capPlayerLevel,
    );

    if (reportedTotalIncome === null) {
      if (currentTotalIncome !== entry.totalIncome) {
        ctx.db.leaderboard.identity.update({
          ...entry,
          totalIncome: currentTotalIncome,
          updatedAt: ctx.timestamp,
        });
      }

      return;
    }

    const nextTotalIncome =
      reportedTotalIncome > currentTotalIncome
        ? reportedTotalIncome
        : currentTotalIncome;

    if (nextTotalIncome === entry.totalIncome) {
      return;
    }

    const incomeDelta = nextTotalIncome - entry.totalIncome;
    ctx.db.leaderboard.identity.update({
      ...entry,
      totalIncome: nextTotalIncome,
      dailyIncome: toBigInt(entry.dailyIncome) + incomeDelta,
      weeklyIncome: toBigInt(entry.weeklyIncome) + incomeDelta,
      monthlyIncome: toBigInt(entry.monthlyIncome) + incomeDelta,
      updatedAt: ctx.timestamp,
    });
    applyTradeAllianceIncomeDelta(ctx, player, incomeDelta);
  },
);

export const send_world_chat_message = spacetimedb.reducer(
  { body: t.string() },
  (ctx, { body }) => {
    assertActivePlayerSession(ctx);

    const message = normalizeWorldChatMessage(body);

    if (!message) {
      return;
    }

    const player = ensurePlayer(ctx);
    if (normalizePlayerLevel(player.playerLevel) < WORLD_CHAT_UNLOCK_LEVEL) {
      throw new Error(`World chat unlocks at level ${WORLD_CHAT_UNLOCK_LEVEL}.`);
    }

    assertWorldChatRateLimit(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: player.username,
      playerLevel: player.playerLevel,
      body: message,
      sentAt: ctx.timestamp,
      allianceTag: getSenderTradeAllianceTag(ctx),
      allianceTagColor: getSenderTradeAllianceTagColor(ctx),
    });
    pruneWorldChat(ctx);
  },
);

export const create_trade_alliance = spacetimedb.reducer(
  {
    name: t.string(),
    tag: t.string(),
    tagColor: t.string(),
    description: t.string(),
    joinMode: t.string(),
  },
  (ctx, { name, tag, tagColor, description, joinMode }) => {
    assertActivePlayerSession(ctx);

    if (getTradeAllianceMember(ctx)) {
      throw new Error('Already in an alliance.');
    }

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
    const safeName = validateTradeAllianceName(name);
    const normalizedName = getTradeAllianceNormalizedName(safeName);
    const safeTag = validateTradeAllianceTag(tag);
    const safeTagColor = normalizeTradeAllianceTagColor(tagColor);
    const safeDescription = normalizeTradeAllianceDescription(description);
    const safeJoinMode = normalizeTradeAllianceJoinMode(joinMode);

    assertTradeAllianceNameAvailable(ctx, normalizedName);
    assertTradeAllianceTagAvailable(ctx, safeTag);

    const allianceId = ctx.newUuidV7();
    const alliance = ctx.db.tradeAlliance.insert({
      allianceId,
      name: safeName,
      normalizedName,
      tag: safeTag,
      tagColor: safeTagColor,
      description: safeDescription,
      notice: '',
      joinMode: safeJoinMode,
      leaderIdentity: ctx.sender,
      memberCount: 1,
      totalIncome: 0n,
      seasonIncome: 0n,
      monthlyIncome: 0n,
      seasonKey: getTradeAllianceSeasonKey(ctx),
      monthKey: getTradeAllianceMonthKey(ctx),
      dayKey: getTradeAllianceDayKey(ctx),
      dailyIncome: 0n,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });

    ctx.db.tradeAllianceMember.insert({
      memberIdentity: ctx.sender,
      allianceId,
      username: player.username,
      playerLevel: player.playerLevel,
      role: TRADE_ALLIANCE_ROLE_TRADE_MASTER,
      joinedAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      totalContribution: 0n,
      dailyContribution: 0n,
      dayKey: getTradeAllianceQuestPeriodKey(ctx),
    });
    ensureTradeAllianceWeeklyQuests(ctx, alliance);
  },
);

export const update_trade_alliance_profile = spacetimedb.reducer(
  {
    name: t.string(),
    tag: t.string(),
    tagColor: t.string(),
    description: t.string(),
    notice: t.string(),
    joinMode: t.string(),
  },
  (ctx, { name, tag, tagColor, description, notice, joinMode }) => {
    assertActivePlayerSession(ctx);

    const member = getTradeAllianceMember(ctx);

    if (!member || member.role !== TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      throw new Error('Alliance settings require trade master.');
    }

    const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId));
    const allianceKey = getTradeAllianceIdKey(alliance.allianceId);
    const safeName = validateTradeAllianceName(name);
    const normalizedName = getTradeAllianceNormalizedName(safeName);
    const safeTag = validateTradeAllianceTag(tag);
    const safeTagColor = normalizeTradeAllianceTagColor(tagColor);

    assertTradeAllianceNameAvailable(ctx, normalizedName, allianceKey);
    assertTradeAllianceTagAvailable(ctx, safeTag, allianceKey);

    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      name: safeName,
      normalizedName,
      tag: safeTag,
      tagColor: safeTagColor,
      description: normalizeTradeAllianceDescription(description),
      notice: normalizeTradeAllianceNotice(notice),
      joinMode: normalizeTradeAllianceJoinMode(joinMode),
      updatedAt: ctx.timestamp,
    });
  },
);

export const join_trade_alliance = spacetimedb.reducer(
  { allianceId: t.string() },
  (ctx, { allianceId }) => {
    assertActivePlayerSession(ctx);

    if (getTradeAllianceMember(ctx)) {
      throw new Error('Already in an alliance.');
    }

    const alliance = refreshTradeAllianceDay(ctx, findTradeAllianceById(ctx, allianceId));

    if (alliance.joinMode !== 'open') {
      throw new Error('Alliance requires application.');
    }

    const memberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);
    if (memberCount >= MAX_TRADE_ALLIANCE_MEMBERS) {
      throw new Error('Alliance is full.');
    }

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.tradeAllianceMember.insert({
      memberIdentity: ctx.sender,
      allianceId: alliance.allianceId,
      username: player.username,
      playerLevel: player.playerLevel,
      role: TRADE_ALLIANCE_ROLE_TRADER,
      joinedAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      totalContribution: 0n,
      dailyContribution: 0n,
      dayKey: getTradeAllianceQuestPeriodKey(ctx),
    });
    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      memberCount: memberCount + 1,
      updatedAt: ctx.timestamp,
    });

    for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
      if (application.applicantIdentity.isEqual(ctx.sender)) {
        ctx.db.tradeAllianceApplication.delete(application);
      }
    }
  },
);

export const apply_trade_alliance = spacetimedb.reducer(
  { allianceId: t.string() },
  (ctx, { allianceId }) => {
    assertActivePlayerSession(ctx);

    if (getTradeAllianceMember(ctx)) {
      throw new Error('Already in an alliance.');
    }

    const alliance = refreshTradeAllianceDay(ctx, findTradeAllianceById(ctx, allianceId));

    if (alliance.joinMode === 'closed') {
      throw new Error('Alliance is closed.');
    }

    if (alliance.joinMode === 'open') {
      throw new Error('Alliance is open. Join directly.');
    }

    const allianceApplications = Array.from(ctx.db.tradeAllianceApplication.iter()).filter(
      (application) =>
        getTradeAllianceIdKey(application.allianceId) ===
        getTradeAllianceIdKey(alliance.allianceId),
    );
    if (allianceApplications.length >= MAX_TRADE_ALLIANCE_PENDING_APPLICATIONS) {
      throw new Error('Alliance applications are full.');
    }

    const ownApplicationCount = Array.from(ctx.db.tradeAllianceApplication.iter()).filter(
      (application) => application.applicantIdentity.isEqual(ctx.sender),
    ).length;
    if (ownApplicationCount >= MAX_TRADE_ALLIANCE_PENDING_APPLICATIONS_PER_PLAYER) {
      throw new Error('Too many pending alliance applications.');
    }

    const applicationKey = getTradeAllianceApplicationKey(alliance.allianceId, ctx.sender);
    if (ctx.db.tradeAllianceApplication.applicationKey.find(applicationKey)) {
      return;
    }

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
    ctx.db.tradeAllianceApplication.insert({
      applicationKey,
      allianceId: alliance.allianceId,
      applicantIdentity: ctx.sender,
      username: player.username,
      playerLevel: player.playerLevel,
      createdAt: ctx.timestamp,
    });
  },
);

export const cancel_trade_alliance_application = spacetimedb.reducer(
  { applicationKey: t.string() },
  (ctx, { applicationKey }) => {
    assertActivePlayerSession(ctx);

    const safeApplicationKey = String(applicationKey ?? '').trim();
    const application = ctx.db.tradeAllianceApplication.applicationKey.find(safeApplicationKey);

    if (!application || !application.applicantIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.tradeAllianceApplication.delete(application);
  },
);

export const accept_trade_alliance_application = spacetimedb.reducer(
  { applicationKey: t.string() },
  (ctx, { applicationKey }) => {
    assertActivePlayerSession(ctx);

    const application = ctx.db.tradeAllianceApplication.applicationKey.find(
      String(applicationKey ?? '').trim(),
    );

    if (!application) {
      return;
    }

    const alliance = refreshTradeAllianceDay(
      ctx,
      findTradeAllianceById(ctx, getTradeAllianceIdKey(application.allianceId)),
    );
    assertTradeAllianceCanManageApplications(ctx, alliance.allianceId);

    if (getTradeAllianceMember(ctx, application.applicantIdentity)) {
      ctx.db.tradeAllianceApplication.delete(application);
      return;
    }

    const memberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);
    if (memberCount >= MAX_TRADE_ALLIANCE_MEMBERS) {
      throw new Error('Alliance is full.');
    }

    ctx.db.tradeAllianceMember.insert({
      memberIdentity: application.applicantIdentity,
      allianceId: alliance.allianceId,
      username: application.username,
      playerLevel: application.playerLevel,
      role: TRADE_ALLIANCE_ROLE_TRADER,
      joinedAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      totalContribution: 0n,
      dailyContribution: 0n,
      dayKey: getTradeAllianceQuestPeriodKey(ctx),
    });
    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      memberCount: memberCount + 1,
      updatedAt: ctx.timestamp,
    });

    for (const pending of Array.from(ctx.db.tradeAllianceApplication.iter())) {
      if (pending.applicantIdentity.isEqual(application.applicantIdentity)) {
        ctx.db.tradeAllianceApplication.delete(pending);
      }
    }
  },
);

export const reject_trade_alliance_application = spacetimedb.reducer(
  { applicationKey: t.string() },
  (ctx, { applicationKey }) => {
    assertActivePlayerSession(ctx);

    const application = ctx.db.tradeAllianceApplication.applicationKey.find(
      String(applicationKey ?? '').trim(),
    );

    if (!application) {
      return;
    }

    assertTradeAllianceCanManageApplications(ctx, application.allianceId);
    ctx.db.tradeAllianceApplication.delete(application);
  },
);

export const leave_trade_alliance = spacetimedb.reducer({}, (ctx) => {
  assertActivePlayerSession(ctx);

  const member = getTradeAllianceMember(ctx);

  if (!member) {
    return;
  }

  const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId));
  const memberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);

  if (member.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER && memberCount > 1) {
    throw new Error('Trade master must transfer leadership before leaving.');
  }

  if (memberCount <= 1) {
    deleteTradeAllianceState(ctx, alliance);
    return;
  }

  ctx.db.tradeAllianceMember.delete(member);
  ctx.db.tradeAlliance.allianceId.update({
    ...alliance,
    memberCount: memberCount - 1,
    updatedAt: ctx.timestamp,
  });
});

export const transfer_trade_alliance_leadership = spacetimedb.reducer(
  { memberIdentityHex: t.string() },
  (ctx, { memberIdentityHex }) => {
    assertActivePlayerSession(ctx);

    const leader = getTradeAllianceMember(ctx);

    if (!leader || leader.role !== TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      throw new Error('Leadership transfer requires trade master.');
    }

    const targetIdentityHex = normalizeIdentityHex(memberIdentityHex);
    const target = getTradeAllianceMembers(ctx, leader.allianceId).find(
      (member) => getIdentityHex(member.memberIdentity) === targetIdentityHex,
    );

    if (!target || target.memberIdentity.isEqual(ctx.sender)) {
      throw new Error('Leadership target not found.');
    }

    const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(leader.allianceId));
    const oldLeaderNextRole =
      getTradeAllianceRoleCount(
        ctx,
        leader.allianceId,
        TRADE_ALLIANCE_ROLE_QUARTERMASTER,
      ) < getTradeAllianceRoleCap(TRADE_ALLIANCE_ROLE_QUARTERMASTER)
        ? TRADE_ALLIANCE_ROLE_QUARTERMASTER
        : TRADE_ALLIANCE_ROLE_TRADER;

    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...target,
      role: TRADE_ALLIANCE_ROLE_TRADE_MASTER,
      updatedAt: ctx.timestamp,
    });
    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...leader,
      role: oldLeaderNextRole,
      updatedAt: ctx.timestamp,
    });
    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      leaderIdentity: target.memberIdentity,
      updatedAt: ctx.timestamp,
    });
  },
);

export const set_trade_alliance_member_role = spacetimedb.reducer(
  {
    memberIdentityHex: t.string(),
    role: t.string(),
  },
  (ctx, { memberIdentityHex, role }) => {
    assertActivePlayerSession(ctx);

    const targetRole = validateTradeAllianceRole(role);
    if (targetRole === TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      throw new Error('Use leadership transfer.');
    }

    const actor = getTradeAllianceMember(ctx);
    if (!actor) {
      throw new Error('Alliance role required.');
    }

    const targetIdentityHex = normalizeIdentityHex(memberIdentityHex);
    const target = getTradeAllianceMembers(ctx, actor.allianceId).find(
      (member) => getIdentityHex(member.memberIdentity) === targetIdentityHex,
    );

    if (!target) {
      throw new Error('Alliance member not found.');
    }

    const manager = assertTradeAllianceCanManageMember(ctx, actor.allianceId, target);
    assertTradeAllianceCanAssignRole(manager, targetRole);
    assertTradeAllianceRoleCap(ctx, actor.allianceId, targetRole, target.memberIdentity);

    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...target,
      role: targetRole,
      updatedAt: ctx.timestamp,
    });
  },
);

export const kick_trade_alliance_member = spacetimedb.reducer(
  { memberIdentityHex: t.string() },
  (ctx, { memberIdentityHex }) => {
    assertActivePlayerSession(ctx);

    const actor = getTradeAllianceMember(ctx);
    if (!actor) {
      throw new Error('Alliance role required.');
    }

    const targetIdentityHex = normalizeIdentityHex(memberIdentityHex);
    const target = getTradeAllianceMembers(ctx, actor.allianceId).find(
      (member) => getIdentityHex(member.memberIdentity) === targetIdentityHex,
    );

    if (!target) {
      return;
    }

    if (target.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      throw new Error('Cannot kick trade master.');
    }

    assertTradeAllianceCanManageMember(ctx, actor.allianceId, target);
    const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(actor.allianceId));
    const memberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);

    ctx.db.tradeAllianceMember.delete(target);
    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      memberCount: Math.max(0, memberCount - 1),
      updatedAt: ctx.timestamp,
    });
  },
);

export const send_trade_alliance_chat_message = spacetimedb.reducer(
  { body: t.string() },
  (ctx, { body }) => {
    assertActivePlayerSession(ctx);

    const message = normalizeWorldChatMessage(body);

    if (!message) {
      return;
    }

    assertWorldChatRateLimit(ctx);

    const member = getTradeAllianceMember(ctx);
    if (!member) {
      throw new Error('Alliance chat requires membership.');
    }

    const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId));
    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.tradeAllianceChat.insert({
      messageId: ctx.newUuidV7(),
      allianceId: alliance.allianceId,
      allianceTag: alliance.tag,
      allianceTagColor: normalizeTradeAllianceTagColor(alliance.tagColor),
      senderIdentity: ctx.sender,
      username: player.username,
      playerLevel: player.playerLevel,
      body: message,
      sentAt: ctx.timestamp,
    });
    pruneTradeAllianceChat(ctx, alliance.allianceId);
  },
);

export const fill_trade_alliance_item_quest = spacetimedb.reducer(
  { questId: t.string(), itemKey: t.string(), quantity: t.u32() },
  (ctx, { questId, itemKey, quantity }) => {
    assertActivePlayerSession(ctx);

    const player = ensurePlayer(ctx);

    applyTradeAllianceItemFillDelta(ctx, player, questId, itemKey, quantity);
  },
);

export const claim_trade_alliance_quest_reward = spacetimedb.reducer(
  { questId: t.string() },
  (ctx, { questId }) => {
    assertActivePlayerSession(ctx);

    const member = getTradeAllianceMember(ctx);
    if (!member) {
      throw new Error('Alliance quest requires membership.');
    }

    const alliance = refreshTradeAllianceDay(
      ctx,
      findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId)),
    );
    const dayKey = getTradeAllianceQuestPeriodKey(ctx);
    const safeQuestId = normalizeResearchId(questId);
    assertTradeAllianceQuestParticipationAvailable(
      ctx,
      member.memberIdentity,
      alliance.allianceId,
      dayKey,
    );
    const questKey = getTradeAllianceQuestKey(alliance.allianceId, dayKey, safeQuestId);
    const quest = ctx.db.tradeAllianceQuestProgress.questKey.find(questKey);

    if (!quest) {
      throw new Error('Alliance quest not found.');
    }

    if (quest.progress < quest.target) {
      throw new Error('Alliance quest is not complete.');
    }

    const contributionKey = getTradeAllianceContributionKey(
      alliance.allianceId,
      dayKey,
      safeQuestId,
      ctx.sender,
    );
    const contribution = ctx.db.tradeAllianceQuestContribution.contributionKey.find(
      contributionKey,
    );
    if ((contribution?.contribution ?? 0n) < quest.minContribution) {
      throw new Error('Alliance quest needs more contribution.');
    }

    const rewardKey = getTradeAllianceRewardKey(dayKey, safeQuestId, ctx.sender);
    if (
      ctx.db.tradeAllianceRewardInbox.rewardKey.find(rewardKey) ||
      hasTradeAllianceRewardClaimForPeriod(ctx, ctx.sender, dayKey, safeQuestId)
    ) {
      return;
    }

    ctx.db.tradeAllianceRewardInbox.insert({
      rewardKey,
      recipientIdentity: ctx.sender,
      allianceId: alliance.allianceId,
      allianceName: alliance.name,
      questId: quest.questId,
      questLabel: quest.label,
      dayKey,
      crystalReward: quest.crystalReward,
      claimedAt: ctx.timestamp,
      collected: false,
    });
  },
);

export const collect_trade_alliance_reward = spacetimedb.reducer(
  { rewardKey: t.string() },
  (ctx, { rewardKey }) => {
    assertActivePlayerSession(ctx);

    const reward = ctx.db.tradeAllianceRewardInbox.rewardKey.find(String(rewardKey ?? '').trim());

    if (!reward || !reward.recipientIdentity.isEqual(ctx.sender) || reward.collected) {
      return;
    }

    ctx.db.tradeAllianceRewardInbox.rewardKey.update({
      ...reward,
      collected: true,
    });
  },
);

export const admin_disband_trade_alliance = spacetimedb.reducer(
  { allianceId: t.string() },
  (ctx, { allianceId }) => {
    assertGameConfigAdmin(ctx);
    deleteTradeAllianceState(ctx, findTradeAllianceById(ctx, allianceId));
  },
);

export const admin_set_trade_alliance_member_role = spacetimedb.reducer(
  {
    memberIdentityHex: t.string(),
    role: t.string(),
  },
  (ctx, { memberIdentityHex, role }) => {
    assertGameConfigAdmin(ctx);
    const safeRole = validateTradeAllianceRole(role);
    const targetIdentityHex = normalizeIdentityHex(memberIdentityHex);
    const target = Array.from(ctx.db.tradeAllianceMember.iter()).find(
      (member) => getIdentityHex(member.memberIdentity) === targetIdentityHex,
    );

    if (!target) {
      throw new Error('Alliance member not found.');
    }

    if (safeRole === TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(target.allianceId));
      const oldLeader = ctx.db.tradeAllianceMember.memberIdentity.find(alliance.leaderIdentity);
      if (oldLeader && !oldLeader.memberIdentity.isEqual(target.memberIdentity)) {
        ctx.db.tradeAllianceMember.memberIdentity.update({
          ...oldLeader,
          role: TRADE_ALLIANCE_ROLE_TRADER,
          updatedAt: ctx.timestamp,
        });
      }
      ctx.db.tradeAlliance.allianceId.update({
        ...alliance,
        leaderIdentity: target.memberIdentity,
        updatedAt: ctx.timestamp,
      });
    } else {
      assertTradeAllianceRoleCap(ctx, target.allianceId, safeRole, target.memberIdentity);
    }

    ctx.db.tradeAllianceMember.memberIdentity.update({
      ...target,
      role: safeRole,
      updatedAt: ctx.timestamp,
    });
  },
);

export const admin_move_trade_alliance_member = spacetimedb.reducer(
  {
    memberIdentityHex: t.string(),
    allianceId: t.string(),
    role: t.string(),
  },
  (ctx, { memberIdentityHex, allianceId, role }) => {
    assertGameConfigAdmin(ctx);
    const player = findPlayerByIdentityHex(ctx, memberIdentityHex);
    const alliance = findTradeAllianceById(ctx, allianceId);
    const safeRole = validateTradeAllianceRole(role);
    const existingMember = ctx.db.tradeAllianceMember.memberIdentity.find(player.identity);
    const memberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);

    if (
      (!existingMember ||
        getTradeAllianceIdKey(existingMember.allianceId) !==
          getTradeAllianceIdKey(alliance.allianceId)) &&
      memberCount >= MAX_TRADE_ALLIANCE_MEMBERS
    ) {
      throw new Error('Alliance is full.');
    }

    if (safeRole !== TRADE_ALLIANCE_ROLE_TRADE_MASTER) {
      assertTradeAllianceRoleCap(ctx, alliance.allianceId, safeRole, player.identity);
    } else {
      const currentLeader = ctx.db.tradeAllianceMember.memberIdentity.find(alliance.leaderIdentity);
      if (currentLeader && !currentLeader.memberIdentity.isEqual(player.identity)) {
        ctx.db.tradeAllianceMember.memberIdentity.update({
          ...currentLeader,
          role: TRADE_ALLIANCE_ROLE_TRADER,
          updatedAt: ctx.timestamp,
        });
      }
    }

    if (existingMember) {
      const questPeriodKey = getTradeAllianceQuestPeriodKey(ctx);
      const oldAlliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(existingMember.allianceId));
      const oldMemberCount = getTradeAllianceMemberCount(ctx, oldAlliance.allianceId);
      const keepsWeeklyContribution =
        getTradeAllianceIdKey(existingMember.allianceId) ===
          getTradeAllianceIdKey(alliance.allianceId) &&
        existingMember.dayKey === questPeriodKey;

      ctx.db.tradeAllianceMember.memberIdentity.update({
        ...existingMember,
        allianceId: alliance.allianceId,
        username: player.username,
        playerLevel: player.playerLevel,
        role: safeRole,
        updatedAt: ctx.timestamp,
        dayKey: questPeriodKey,
        dailyContribution: keepsWeeklyContribution ? existingMember.dailyContribution : 0n,
      });
      if (
        getTradeAllianceIdKey(oldAlliance.allianceId) !==
        getTradeAllianceIdKey(alliance.allianceId)
      ) {
        if (existingMember.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER && oldMemberCount > 1) {
          const nextLeader = getTradeAllianceMembers(ctx, oldAlliance.allianceId).find(
            (member) => !member.memberIdentity.isEqual(player.identity),
          );

          if (nextLeader) {
            ctx.db.tradeAllianceMember.memberIdentity.update({
              ...nextLeader,
              role: TRADE_ALLIANCE_ROLE_TRADE_MASTER,
              updatedAt: ctx.timestamp,
            });
          }
        }

        ctx.db.tradeAlliance.allianceId.update({
          ...oldAlliance,
          memberCount: Math.max(0, oldMemberCount - 1),
          leaderIdentity:
            existingMember.role === TRADE_ALLIANCE_ROLE_TRADE_MASTER && oldMemberCount > 1
              ? getTradeAllianceMembers(ctx, oldAlliance.allianceId).find(
                  (member) => !member.memberIdentity.isEqual(player.identity),
                )?.memberIdentity ?? oldAlliance.leaderIdentity
              : oldAlliance.leaderIdentity,
          updatedAt: ctx.timestamp,
        });
      }
    } else {
      ctx.db.tradeAllianceMember.insert({
        memberIdentity: player.identity,
        allianceId: alliance.allianceId,
        username: player.username,
        playerLevel: player.playerLevel,
        role: safeRole,
        joinedAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
        totalContribution: 0n,
        dailyContribution: 0n,
        dayKey: getTradeAllianceQuestPeriodKey(ctx),
      });
    }

    const nextMemberCount = getTradeAllianceMemberCount(ctx, alliance.allianceId);
    ctx.db.tradeAlliance.allianceId.update({
      ...alliance,
      memberCount: nextMemberCount,
      leaderIdentity:
        safeRole === TRADE_ALLIANCE_ROLE_TRADE_MASTER ? player.identity : alliance.leaderIdentity,
      updatedAt: ctx.timestamp,
    });
  },
);

export const submit_feedback = spacetimedb.reducer({ body: t.string() }, (ctx, { body }) => {
  assertActivePlayerSession(ctx);

  const safeBody = normalizeFeedbackBody(body);

  if (!safeBody) {
    return;
  }

  assertFeedbackRateLimit(ctx);

  const player = ensurePlayer(ctx);

  ctx.db.playerFeedback.insert({
    feedbackId: ctx.newUuidV7(),
    senderIdentity: ctx.sender,
    username: player.username,
    playerLevel: player.playerLevel,
    body: safeBody,
    submittedAt: ctx.timestamp,
  });
});

export const announce_research = spacetimedb.reducer(
  { researchName: t.string() },
  (ctx, { researchName }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_CLIENT_RESEARCH_ANNOUNCEMENTS) {
      return;
    }

    const safeResearchName = normalizeResearchName(researchName);

    if (!safeResearchName) {
      return;
    }

    assertWorldChatRateLimit(ctx);

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body: `${player.username} researched ${safeResearchName}`,
      sentAt: ctx.timestamp,
      allianceTag: '',
      allianceTagColor: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    });
    pruneWorldChat(ctx);
  },
);

export const discover_potion_recipe = spacetimedb.reducer(
  { potionKey: t.string() },
  (ctx, { potionKey }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_CLIENT_POTION_DISCOVERY) {
      return;
    }

    const catalogItem = getUnknownPotionCatalogItem(potionKey);
    const existingDiscovery = ctx.db.potionRecipeDiscovery.potionKey.find(
      catalogItem.key,
    );

    if (existingDiscovery) {
      return;
    }

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.potionRecipeDiscovery.insert({
      potionKey: catalogItem.key,
      potionLabel: catalogItem.label,
      discoveredByIdentity: ctx.sender,
      username: player.username,
      discoveredAt: ctx.timestamp,
      royaltyGold: 0n,
      royaltyGoldScale: GOLD_PRICE_SCALE,
    });

    // Discovery is the authoritative global unlock; chat throttling must not block it.
    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body: formatPotionDiscoveryAnnouncementBody(
        player.username,
        catalogItem.key,
        catalogItem.label,
      ),
      sentAt: ctx.timestamp,
      allianceTag: '',
      allianceTagColor: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    });
    pruneWorldChat(ctx);
  },
);

export const set_player_shop_slot = spacetimedb.reducer(
  {
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.f64(),
  },
  (ctx, { slotNumber, itemKey, itemLabel, itemKind, quantity, priceGold }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const catalogItem = getPlayerShopCatalogItem(itemKey);
    const safeItemKey = catalogItem.itemKey;
    const safeItemLabel = catalogItem.itemLabel;
    const safeItemKind = catalogItem.itemKind;
    const safeQuantity = validatePlayerShopQuantity(quantity);
    const safePriceGold = validatePlayerShopPriceGold(priceGold);

    if (
      normalizePlayerShopText(itemLabel, MAX_ITEM_LABEL_LENGTH) !== safeItemLabel ||
      normalizePlayerShopText(itemKind, MAX_ITEM_KIND_LENGTH) !== safeItemKind
    ) {
      throw new Error('Player shop item is required.');
    }

    const player = ensurePlayer(ctx);
    const listingKey = getPlayerShopListingKey(ctx, safeSlotNumber);
    const existingListing = ctx.db.playerShopListing.listingKey.find(listingKey);
    const nextListing = {
      listingKey,
      sellerIdentity: ctx.sender,
      username: player.username,
      slotNumber: safeSlotNumber,
      itemKey: safeItemKey,
      itemLabel: safeItemLabel,
      itemKind: safeItemKind,
      quantity: safeQuantity,
      priceGold: toStoredGoldPrice(safePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    };

    if (existingListing) {
      ctx.db.playerShopListing.listingKey.update(nextListing);
      return;
    }

    ctx.db.playerShopListing.insert(nextListing);
  },
);

export const clear_player_shop_slot = spacetimedb.reducer(
  { slotNumber: t.u8() },
  (ctx, { slotNumber }) => {
    assertActivePlayerSession(ctx);

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const listingKey = getPlayerShopListingKey(ctx, safeSlotNumber);
    const existingListing = ctx.db.playerShopListing.listingKey.find(listingKey);

    if (!existingListing || !existingListing.sellerIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.playerShopListing.delete(existingListing);
  },
);

export const set_player_shop_request = spacetimedb.reducer(
  {
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.f64(),
  },
  (ctx, { slotNumber, itemKey, itemLabel, itemKind, quantity, priceGold }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const catalogItem = getPlayerShopCatalogItem(itemKey);
    const safeItemKey = catalogItem.itemKey;
    const safeItemLabel = catalogItem.itemLabel;
    const safeItemKind = catalogItem.itemKind;
    const safeQuantity = validatePlayerShopQuantity(quantity);
    const safePriceGold = validatePlayerShopPriceGold(priceGold);

    if (
      normalizePlayerShopText(itemLabel, MAX_ITEM_LABEL_LENGTH) !== safeItemLabel ||
      normalizePlayerShopText(itemKind, MAX_ITEM_KIND_LENGTH) !== safeItemKind
    ) {
      throw new Error('Player shop item is required.');
    }

    const player = ensurePlayer(ctx);
    const requestKey = getPlayerShopRequestKey(ctx, safeSlotNumber);
    const existingRequest = ctx.db.playerShopRequest.requestKey.find(requestKey);
    const nextRequest = {
      requestKey,
      requesterIdentity: ctx.sender,
      username: player.username,
      slotNumber: safeSlotNumber,
      itemKey: safeItemKey,
      itemLabel: safeItemLabel,
      itemKind: safeItemKind,
      quantity: safeQuantity,
      priceGold: toStoredGoldPrice(safePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    };

    if (existingRequest) {
      ctx.db.playerShopRequest.requestKey.update(nextRequest);
      return;
    }

    ctx.db.playerShopRequest.insert(nextRequest);
  },
);

export const clear_player_shop_request = spacetimedb.reducer(
  { slotNumber: t.u8() },
  (ctx, { slotNumber }) => {
    assertActivePlayerSession(ctx);

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const requestKey = getPlayerShopRequestKey(ctx, safeSlotNumber);
    const existingRequest = ctx.db.playerShopRequest.requestKey.find(requestKey);

    if (!existingRequest || !existingRequest.requesterIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.playerShopRequest.delete(existingRequest);
  },
);

export const buy_player_shop_listing = spacetimedb.reducer(
  { listingKey: t.string(), quantity: t.u32() },
  (ctx, { listingKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeListingKey = normalizePlayerShopText(listingKey, 120);
    const listing = ctx.db.playerShopListing.listingKey.find(safeListingKey);

    if (!listing) {
      throw new Error('Player shop listing no longer exists.');
    }

    if (listing.sellerIdentity.isEqual(ctx.sender)) {
      throw new Error('Cannot buy your own player shop listing.');
    }

    if (quantity < 1 || quantity > listing.quantity) {
      throw new Error('Player shop listing does not have enough quantity.');
    }

    const buyer = ensurePlayer(ctx);
    const remainingQuantity = listing.quantity - quantity;
    const listingPriceGold = decodeStoredGoldPrice(
      listing.priceGold,
      listing.priceScale,
    );

    if (listingPriceGold === null || listingPriceGold <= 0) {
      throw new Error('Player shop listing price is invalid.');
    }

    const proceedsGold = roundGoldPrice(listingPriceGold * quantity);

    if (proceedsGold > MAX_PLAYER_SHOP_TRADE_TOTAL_GOLD) {
      throw new Error('Player shop trade total is too high.');
    }

    ctx.db.playerShopListing.listingKey.update({
      ...listing,
      quantity: remainingQuantity,
      updatedAt: ctx.timestamp,
    });

    addClaimablePlayerShopGold(ctx, listing.sellerIdentity, proceedsGold);
    grantPotionDiscoveryPassiveGold(
      ctx,
      listing.itemKey,
      proceedsGold,
      listing.sellerIdentity,
    );

    ctx.db.playerShopTrade.insert({
      tradeId: ctx.newUuidV7(),
      buyerIdentity: ctx.sender,
      buyerUsername: buyer.username,
      sellerIdentity: listing.sellerIdentity,
      sellerUsername: listing.username,
      itemKey: listing.itemKey,
      itemLabel: listing.itemLabel,
      itemKind: listing.itemKind,
      quantity,
      priceGold: toStoredGoldPrice(listingPriceGold),
      totalPriceGold: toStoredGoldPrice(proceedsGold),
      priceScale: GOLD_PRICE_SCALE,
      tradedAt: ctx.timestamp,
    });
    prunePlayerShopTradeHistory(ctx);
  },
);

export const claim_player_shop_proceeds = spacetimedb.reducer({}, (ctx) => {
  assertActivePlayerSession(ctx);

  if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
    throw new Error('Player shop exchange requires server inventory.');
  }

  const proceeds = ctx.db.playerShopProceeds.sellerIdentity.find(ctx.sender);

  if (!proceeds) {
    return;
  }

  ctx.db.playerShopProceeds.delete(proceeds);
});

export const sell_to_npc = spacetimedb.reducer(
  { itemKey: t.string(), quantity: t.u32() },
  (ctx, { itemKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    const safeQuantity = validateNpcMarketQuantity(quantity);
    const row = ensureNpcMarketItem(ctx, itemKey);
    const tradeQuantity = BigInt(safeQuantity);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey);
    const needState = getNpcMarketNeedState(row, marketConfig.targetStock);
    const npcStock = getNpcMarketStock(row);
    const demandScore = toBigInt(row.demandScore);
    const supplyScore = toBigInt(row.supplyScore);

    if (needState.npcNeed < tradeQuantity) {
      throw new Error('NPC market demand too low.');
    }

    const nextNpcStock = npcStock + tradeQuantity;
    const nextNpcNeed = needState.npcNeed - tradeQuantity;
    const tunedMarket = applyNpcMarketAutoTune(
      ctx,
      marketConfig,
      demandScore,
      supplyScore + tradeQuantity,
    );
    const nextMarketPriceGold = getNpcMarketPriceFromNeed(
      tunedMarket.marketConfig,
      nextNpcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );
    const totalSellGold = getNpcMarketSellTotalGold(
      marketConfig,
      needState,
      safeQuantity,
    );

    ctx.db.npcMarketPrice.itemKey.update({
      ...getNpcMarketRowWithQuotes(row, nextMarketPriceGold),
      basePriceGold: toStoredGoldPrice(tunedMarket.marketConfig.basePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      npcStock: nextNpcStock,
      npcNeed: nextNpcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      demandScore: tunedMarket.demandScore,
      supplyScore: tunedMarket.supplyScore,
      updatedAt: ctx.timestamp,
      lastTickAt: ctx.timestamp,
    });
    grantPotionDiscoveryPassiveGold(
      ctx,
      itemKey,
      totalSellGold,
      ctx.sender,
    );
  },
);

export const buy_from_npc = spacetimedb.reducer(
  { itemKey: t.string(), quantity: t.u32() },
  (ctx, { itemKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    const safeQuantity = validateNpcMarketQuantity(quantity);
    const row = ensureNpcMarketItem(ctx, itemKey);

    const tradeQuantity = BigInt(safeQuantity);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey);
    const needState = getNpcMarketNeedState(row, marketConfig.targetStock);
    const npcStock = getNpcMarketStock(row);
    const demandScore = toBigInt(row.demandScore);

    if (npcStock < tradeQuantity) {
      throw new Error('NPC market item has no stock.');
    }

    const nextNpcStock = npcStock - tradeQuantity;
    const nextNpcNeed = needState.npcNeed + tradeQuantity;
    const tunedMarket = applyNpcMarketAutoTune(
      ctx,
      marketConfig,
      demandScore + tradeQuantity,
      toBigInt(row.supplyScore),
    );
    const nextMarketPriceGold = getNpcMarketPriceFromNeed(
      tunedMarket.marketConfig,
      nextNpcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );

    ctx.db.npcMarketPrice.itemKey.update({
      ...getNpcMarketRowWithQuotes(row, nextMarketPriceGold),
      basePriceGold: toStoredGoldPrice(tunedMarket.marketConfig.basePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      npcStock: nextNpcStock,
      npcNeed: nextNpcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      demandScore: tunedMarket.demandScore,
      supplyScore: tunedMarket.supplyScore,
      updatedAt: ctx.timestamp,
      lastTickAt: ctx.timestamp,
    });
  },
);

export const reset_npc_market = spacetimedb.reducer({}, (ctx) => {
  assertNpcMarketAdmin(ctx);
  ensureNpcMarketCatalog(ctx);
  resetNpcMarketRows(ctx, { resetStock: true });
});

export const claim_npc_market_admin = spacetimedb.reducer({}, (ctx) => {
  if (!isConfiguredNpcMarketAdmin(ctx)) {
    throw new Error('NPC market admin is not claimable.');
  }

  const existingAdmin = ctx.db.npcMarketAdmin.identity.find(ctx.sender);
  if (existingAdmin) {
    return;
  }

  const player = ctx.db.player.identity.find(ctx.sender);

  ctx.db.npcMarketAdmin.insert({
    identity: ctx.sender,
    username: player?.username ?? 'admin',
    addedAt: ctx.timestamp,
  });
});

export const upsert_npc_market_item_config = spacetimedb.reducer(
  {
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    basePriceGold: t.f64(),
    targetStock: t.u64(),
    volatilityBps: t.u64(),
    enabled: t.bool(),
  },
  (
    ctx,
    {
      itemKey,
      itemLabel,
      itemKind,
      basePriceGold,
      targetStock,
      volatilityBps,
      enabled,
    },
  ) => {
    assertGameConfigAdmin(ctx);

    const safeItemKey = normalizeNpcMarketItemKey(itemKey);
    const safeItemLabel = normalizePlayerShopText(itemLabel, MAX_ITEM_LABEL_LENGTH);
    const safeItemKind = normalizePlayerShopText(itemKind, MAX_ITEM_KIND_LENGTH);

    if (!safeItemKey || !safeItemLabel || !safeItemKind) {
      throw new Error('NPC market item config requires key, label, and kind.');
    }

    const safeBasePriceGold = validateNpcMarketBasePriceGold(basePriceGold);
    const safeTargetStock = validateNpcMarketTargetStock(targetStock);
    const safeVolatilityBps = validateNpcMarketVolatilityBps(volatilityBps);
    const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(safeItemKey);
    const defaultBasePriceGold = existingConfig
      ? normalizeNpcMarketBasePriceGold(
          existingConfig.defaultBasePriceGold,
          catalogItem?.basePriceGold ?? safeBasePriceGold,
          existingConfig.priceScale,
        )
      : (catalogItem?.basePriceGold ?? safeBasePriceGold);
    const nextConfig = {
      itemKey: safeItemKey,
      itemLabel: safeItemLabel,
      itemKind: safeItemKind,
      defaultBasePriceGold: toStoredGoldPrice(defaultBasePriceGold),
      basePriceGold: toStoredGoldPrice(safeBasePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      targetStock: safeTargetStock,
      volatilityBps: safeVolatilityBps,
      enabled,
      updatedAt: ctx.timestamp,
    };

    if (existingConfig) {
      ctx.db.npcMarketItemConfig.itemKey.update({
        ...existingConfig,
        ...nextConfig,
      });
    } else {
      ctx.db.npcMarketItemConfig.insert(nextConfig);
    }

    if (!enabled) {
      deleteNpcMarketPriceIfPresent(ctx, safeItemKey);
      return;
    }

    const existingRow = ctx.db.npcMarketPrice.itemKey.find(safeItemKey);

    if (existingRow) {
      const marketConfig = normalizeNpcMarketRuntimeConfig(nextConfig, catalogItem);
      const needState = getNpcMarketNeedState(existingRow, safeTargetStock);
      const marketPriceGold = getNpcMarketPriceFromNeed(
        marketConfig,
        needState.npcNeed,
        needState.targetNeed,
        needState.maxNeed,
      );

      ctx.db.npcMarketPrice.itemKey.update({
        ...getNpcMarketRowWithQuotes(existingRow, marketPriceGold),
        itemLabel: safeItemLabel,
        itemKind: safeItemKind,
        basePriceGold: toStoredGoldPrice(safeBasePriceGold),
        priceScale: GOLD_PRICE_SCALE,
        targetStock: safeTargetStock,
        npcStock: getNpcMarketStock(existingRow),
        npcNeed: needState.npcNeed,
        targetNeed: needState.targetNeed,
        maxNeed: needState.maxNeed,
        updatedAt: ctx.timestamp,
      });
      return;
    }

    ensureNpcMarketItem(ctx, safeItemKey);
  },
);

export const remove_npc_market_item_config = spacetimedb.reducer(
  { itemKey: t.string() },
  (ctx, { itemKey }) => {
    assertGameConfigAdmin(ctx);

    const safeItemKey = normalizeNpcMarketItemKey(itemKey);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(safeItemKey);

    if (existingConfig) {
      ctx.db.npcMarketItemConfig.itemKey.update({
        ...existingConfig,
        enabled: false,
        updatedAt: ctx.timestamp,
      });
    }

    deleteNpcMarketPriceIfPresent(ctx, safeItemKey);
  },
);

export const set_npc_market_item_base_price = spacetimedb.reducer(
  { itemKey: t.string(), basePriceGold: t.f64() },
  (ctx, { itemKey, basePriceGold }) => {
    assertGameConfigAdmin(ctx);

    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey);
    const safeBasePriceGold = validateNpcMarketBasePriceGold(basePriceGold);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(
      marketConfig.itemKey,
    );

    if (!existingConfig) {
      throw new Error('Missing NPC market item config.');
    }

    ctx.db.npcMarketItemConfig.itemKey.update({
      ...existingConfig,
      basePriceGold: toStoredGoldPrice(safeBasePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });

    const existingRow = ctx.db.npcMarketPrice.itemKey.find(marketConfig.itemKey);

    if (!existingRow) {
      ensureNpcMarketItem(ctx, marketConfig.itemKey);
      return;
    }

    const nextMarketConfig = {
      ...marketConfig,
      basePriceGold: safeBasePriceGold,
    };
    const needState = getNpcMarketNeedState(existingRow, marketConfig.targetStock);
    const marketPriceGold = getNpcMarketPriceFromNeed(
      nextMarketConfig,
      needState.npcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );

    ctx.db.npcMarketPrice.itemKey.update({
      ...getNpcMarketRowWithQuotes(existingRow, marketPriceGold),
      itemLabel: marketConfig.itemLabel,
      itemKind: marketConfig.itemKind,
      basePriceGold: toStoredGoldPrice(safeBasePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      targetStock: marketConfig.targetStock,
      npcStock: getNpcMarketStock(existingRow),
      npcNeed: needState.npcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      updatedAt: ctx.timestamp,
    });
  },
);

export const upsert_research_config = spacetimedb.reducer(
  {
    researchId: t.string(),
    label: t.string(),
    groupId: t.string(),
    costGold: t.u64(),
    durationSeconds: t.u64(),
    enabled: t.bool(),
  },
  (ctx, { researchId, label, groupId, costGold, durationSeconds, enabled }) => {
    assertGameConfigAdmin(ctx);

    const safeResearchId = normalizeResearchId(researchId);
    const safeLabel = normalizeResearchLabel(label);
    const safeGroupId = normalizeResearchGroupId(groupId);

    if (!safeResearchId || !safeLabel || !safeGroupId) {
      throw new Error('Research config requires id, label, and group.');
    }

    const safeCostGold = validateResearchCostGold(costGold);
    const safeDurationSeconds = validateResearchDurationSeconds(durationSeconds);
    const catalogResearch = researchCatalogById.get(safeResearchId);
    const existingConfig = ctx.db.researchConfig.researchId.find(safeResearchId);
    const nextConfig = {
      researchId: safeResearchId,
      label: safeLabel,
      groupId: safeGroupId,
      defaultCostGold:
        existingConfig?.defaultCostGold ??
        catalogResearch?.defaultCostGold ??
        safeCostGold,
      costGold: safeCostGold,
      enabled,
      updatedAt: ctx.timestamp,
      durationSeconds: safeDurationSeconds,
    };

    if (existingConfig) {
      ctx.db.researchConfig.researchId.update({
        ...existingConfig,
        ...nextConfig,
      });
      return;
    }

    ctx.db.researchConfig.insert(nextConfig);
  },
);

export const remove_research_config = spacetimedb.reducer(
  { researchId: t.string() },
  (ctx, { researchId }) => {
    assertGameConfigAdmin(ctx);

    const safeResearchId = normalizeResearchId(researchId);
    const existingConfig = ctx.db.researchConfig.researchId.find(safeResearchId);

    if (!existingConfig) {
      return;
    }

    ctx.db.researchConfig.researchId.update({
      ...existingConfig,
      enabled: false,
      updatedAt: ctx.timestamp,
    });
  },
);

export const upsert_game_config = spacetimedb.reducer(
  {
    configKey: t.string(),
    configJson: t.string(),
  },
  (ctx, { configKey, configJson }) => {
    assertGameConfigAdmin(ctx);

    const safeConfigKey = normalizeGameConfigKey(configKey);

    if (!safeConfigKey) {
      throw new Error('Game config requires key.');
    }

    const safeConfigJson = validateGameConfigJson(safeConfigKey, configJson);

    const existingConfig = ctx.db.gameConfig.configKey.find(safeConfigKey);
    const nextConfig = {
      configKey: safeConfigKey,
      configJson: safeConfigJson,
      updatedAt: ctx.timestamp,
    };

    if (existingConfig) {
      ctx.db.gameConfig.configKey.update({
        ...existingConfig,
        ...nextConfig,
      });
      return;
    }

    ctx.db.gameConfig.insert(nextConfig);
  },
);

export const set_maintenance_mode = spacetimedb.reducer(
  {
    mode: t.string(),
    message: t.string(),
  },
  (ctx, { mode, message }) => {
    assertGameConfigAdmin(ctx);

    const safeConfigJson = validateGameConfigJson(
      'maintenance',
      toGameConfigJson({
        mode: normalizeMaintenanceMode(mode),
        message: normalizeMaintenanceMessage(message),
      }),
    );
    const existingConfig = ctx.db.gameConfig.configKey.find('maintenance');
    const nextConfig = {
      configKey: 'maintenance',
      configJson: safeConfigJson,
      updatedAt: ctx.timestamp,
    };

    if (existingConfig) {
      ctx.db.gameConfig.configKey.update({
        ...existingConfig,
        ...nextConfig,
      });
      return;
    }

    ctx.db.gameConfig.insert(nextConfig);
  },
);

export const migrate_player_gameplay_saves = spacetimedb.reducer(
  { migrationKey: t.string() },
  (ctx, { migrationKey }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const stateKey = `player-save-migration:${normalizeMaintenanceKey(migrationKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    for (const save of Array.from(ctx.db.playerGameplaySave.iter())) {
      const nextSaveJson = migratePlayerGameplaySaveJson(ctx, save);

      if (nextSaveJson === save.saveJson) {
        continue;
      }

      ctx.db.playerGameplaySave.identity.update({
        ...save,
        saveJson: nextSaveJson,
        updatedAt: ctx.timestamp,
      });
    }

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const admin_reset_player_progression_data = spacetimedb.reducer(
  { resetKey: t.string() },
  (ctx, { resetKey }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const stateKey = `player-progression-reset:${normalizeMaintenanceKey(resetKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    deleteAllPlayerGameplaySaves(ctx);
    deleteAllLeaderboardState(ctx);
    deleteAllWorldChatMessages(ctx);
    deleteAllTradeAllianceState(ctx);
    deleteAllPlayerShopState(ctx);
    deleteAllPotionDiscoveries(ctx);
    resetNpcMarketRows(ctx, { resetStock: true });
    resetAllPlayerSharedProgress(ctx);

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const admin_wipe_all_player_data = spacetimedb.reducer(
  { resetKey: t.string() },
  (ctx, { resetKey }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const stateKey = `all-player-data-wipe:${normalizeMaintenanceKey(resetKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    deleteAllPlayerGameplaySaves(ctx);
    deleteAllLeaderboardState(ctx);
    deleteAllWorldChatMessages(ctx);
    deleteAllTradeAllianceState(ctx);
    deleteAllPlayerShopState(ctx);
    deleteAllPotionDiscoveries(ctx);
    deleteAllPlayerFeedback(ctx);
    deleteAllPlayerSessions(ctx);
    deleteAllPlayerRows(ctx);
    resetNpcMarketRows(ctx, { resetStock: true });

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const admin_reset_player_progression_by_identity = spacetimedb.reducer(
  {
    identityHex: t.string(),
    resetKey: t.string(),
  },
  (ctx, { identityHex, resetKey }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const identityKey = getIdentityHex(player.identity);
    const stateKey = `player-progression-reset:${identityKey}:${normalizeMaintenanceKey(resetKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    const nextPlayer = resetPlayerSharedProgress(ctx, player);
    deletePlayerGameplaySaveForIdentity(ctx, nextPlayer.identity);
    resetLeaderboardProgressForIdentity(ctx, nextPlayer.identity, nextPlayer.username);
    deleteTradeAllianceProgressionForIdentity(ctx, nextPlayer.identity);
    deletePlayerShopProgressionForIdentity(ctx, nextPlayer.identity);
    deleteAdminPlayerSession(ctx, nextPlayer.identity);

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export default spacetimedb;
