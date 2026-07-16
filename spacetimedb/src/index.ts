import { Identity, ScheduleAt, Timestamp, Uuid } from 'spacetimedb';
import {
  schema,
  table,
  t,
  Range,
  type ReducerCtx,
  type InferSchema,
} from 'spacetimedb/server';
import { normalizeSaveTasks } from './saveTasksNormalizer';
import {
  clampSaveGoldPrice,
  MAX_PLAYER_SAVE_CURRENT_GOLD,
  MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD,
  normalizeSaveGold,
} from './saveGoldNormalizer';
import { normalizeSaveCauldronAutomationState } from './saveBrewingNormalizer';
import { assertMarketScope, getMarketScopedKey, normalizeMarketId } from './marketScope';
import {
  defaultMarketId,
  marketLicences,
  resolveMarketLicence,
} from '../../src/shared/marketLicence.js';

const DEFAULT_USERNAME = 'wizard';
const DEFAULT_PLAYER_LEVEL = 1;
const DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL = 1;
const DEFAULT_PLAYER_THEME = 'midnight';
const DEFAULT_PLAYER_FONT = 'lexend';
const DEFAULT_PLAYER_COLOR_MODE = 'resources';
const DEFAULT_PLAYER_CHARACTER = 'elara';
const DEFAULT_PLAYER_ICON_MODE = 'icons';
const DEFAULT_PLAYER_PROGRESS_BAR = 'regular';
const DEFAULT_PLAYER_PLOT_VIEW = 'boxes';
const MAX_REPORTED_PLAYER_LEVEL = 100;
const ENABLE_CLIENT_REPORTED_PLAYER_LEVEL = true;
const ENABLE_CLIENT_REPORTED_TOTAL_INCOME = true;
const ENABLE_CLIENT_REPORTED_WORLD_EVENT_POINTS = true;
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
const PLAYER_INBOX_HISTORY_LIMIT = 100;
const MAX_PLAYER_INBOX_MAIL_KEY_LENGTH = 240;
const MAX_PLAYER_INBOX_TITLE_LENGTH = 80;
const MAX_PLAYER_INBOX_BODY_LENGTH = 1_200;
const MAX_PLAYER_INBOX_SOURCE_TYPE_LENGTH = 32;
const MAX_PLAYER_INBOX_SOURCE_KEY_LENGTH = 96;
const MAX_PLAYER_INBOX_SENDER_LABEL_LENGTH = 40;
const MAX_PLAYER_INBOX_REWARD_TEXT_LENGTH = 160;
const MAX_PLAYER_INBOX_ITEM_REWARDS_JSON_LENGTH = 4_000;
const MAX_PLAYER_INBOX_ITEM_REWARDS = 16;
const MAX_PLAYER_INBOX_ITEM_REWARD_QUANTITY = 100_000;
const MAX_PLAYER_INBOX_COIN_REWARD = 250_000;
const DEFAULT_TRADE_ALLIANCE_TAG_COLOR = 'ink';
const WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS = 15n * 1_000_000n;
const WORLD_CHAT_RATE_LIMIT_MAX_MESSAGES = 3;
const WORLD_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES = 8;
const NPC_MARKET_FILLED_ANNOUNCEMENT_BODY =
  'traders filled the market. go see what they need.';
const TRADE_ALLIANCE_CHAT_RATE_LIMIT_WINDOW_MICROS = WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS;
const TRADE_ALLIANCE_CHAT_RATE_LIMIT_MAX_MESSAGES = 3;
const TRADE_ALLIANCE_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES = 8;
const FEEDBACK_RATE_LIMIT_WINDOW_MICROS = 10n * 60n * 1_000_000n;
const FEEDBACK_RATE_LIMIT_MAX_MESSAGES = 5;
const MAX_RESEARCH_NAME_LENGTH = 80;
const MAX_RESEARCH_ID_LENGTH = 96;
const MAX_RESEARCH_LABEL_LENGTH = 80;
const MAX_RESEARCH_GROUP_ID_LENGTH = 32;
const MAX_WORLD_EVENT_ID_LENGTH = 96;
const MAX_WORLD_EVENT_PERIOD_KEY_LENGTH = 48;
const MAX_MAINTENANCE_KEY_LENGTH = 96;
const WORLD_CHAT_HISTORY_LIMIT = 200;
const PLAYER_SHOP_TRADE_HISTORY_LIMIT = 80;
const POTION_RECIPE_ROYALTY_HISTORY_LIMIT = 160;
const PLAYER_SHOP_PUBLIC_MARKET_ROW_LIMIT = 80;
const MARKET_DEMAND_DAILY_HISTORY_LIMIT = 180;
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
const NPC_MARKET_DEMAND_WAVE_INTERVAL_MICROS = 6n * 60n * 60n * 1_000_000n;
const NPC_MARKET_DEMAND_DAILY_BUDGET_BPS = 40_000n;
const NPC_MARKET_DEMAND_CAP_BPS = 15_000n;
const NPC_MARKET_DEMAND_BIG_WAVE_BPS = 4_000n;
const NPC_MARKET_DEMAND_SMALL_WAVE_BPS = 2_000n;
const NPC_MARKET_DEMAND_WAVE_BPS_BY_SLOT = [
  NPC_MARKET_DEMAND_BIG_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
];
const NPC_MARKET_AUTO_TUNE_WINDOW_BPS = 500n;
const NPC_MARKET_AUTO_TUNE_MIN_SIGNAL_QUANTITY = 10n;
const NPC_MARKET_AUTO_TUNE_MAX_STEP_BPS = 250;
const MAX_RESEARCH_COST_GOLD = 1_000_000_000n;
const MAX_RESEARCH_DURATION_SECONDS = 4n * 60n * 60n;
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
const MAX_PLAYER_SAVE_CAULDRONS = 20;
const MAX_PLAYER_SAVE_MANA_CURRENT = 5_000;
const MAX_PLAYER_SAVE_MANA_PER_SECOND = 100;
const MAX_PLAYER_SAVE_CURRENT_CRYSTAL = 100;
const MAX_PLAYER_SAVE_CURRENT_EMERALD = 10_000;
const MAX_PLAYER_SAVE_CURRENT_RUBY = 10_000;
const MAX_PLAYER_SAVE_BATCH_MULTIPLIER = 5;
const MAX_PLAYER_SAVE_AUTO_SEED_MANA_RESERVE = MAX_PLAYER_SAVE_MANA_CURRENT;
const MAX_PLAYER_SAVE_TIMER_MS = MAX_GAME_CONFIG_RESOURCE_LIMIT * 1_000;
const MAX_PLAYER_SAVE_SHOP_COIN_OFFER_COOLDOWN_SECONDS = 2 * 60 * 60;
const MAX_PLAYER_SAVE_INBOX_CLAIMED_MAIL_KEYS = 500;
const LEADERBOARD_SUMMARY_LIMIT = 100;
const LEADERBOARD_TOTAL_INCOME_CAP_PER_LEVEL = 10_000_000n;
const WORLD_EVENT_LEADERBOARD_SUMMARY_LIMIT = 100;
const WORLD_EVENT_LEADERBOARD_POINTS_CAP_PER_LEVEL = 1_000_000n;
const WORLD_EVENT_REWARD_QUALIFICATION_POINTS = 2_000n;
const WORLD_EVENT_REWARD_SETTLEMENT_INTERVAL_MICROS = 60n * 1_000_000n;
const WORLD_EVENT_REWARD_SETTLEMENT_STATE_PREFIX = 'world-event-reward-settlement';
const WORLD_EVENT_REWARD_TIERS = [
  { minRank: 1, maxRank: 1, emeraldReward: 5, crystalReward: 10 },
  { minRank: 2, maxRank: 2, emeraldReward: 3, crystalReward: 7 },
  { minRank: 3, maxRank: 3, emeraldReward: 2, crystalReward: 5 },
  { minRank: 4, maxRank: 10, emeraldReward: 1, crystalReward: 3 },
  { minRank: 11, maxRank: 25, emeraldReward: 0, crystalReward: 2 },
  { minRank: 26, maxRank: Number.MAX_SAFE_INTEGER, emeraldReward: 0, crystalReward: 1 },
];
const PERIOD_DAY_MICROS = 86_400_000_000n;
const PERIOD_WEEK_DAYS = 7n;
const PERIOD_MONTH_DAYS = 30n;
const PERIOD_LOOP_ANCHOR_MICROS = 1_780_876_800_000_000n; // 2026-06-08 00:00 UTC, Armenia 04:00.
const PLAYER_DATA_RESET_GUARD_MICROS = 1_781_298_268_808_000n;
const STARTUP_MAINTENANCE_STATE_KEY = 'startup-maintenance:direct-sell-stands-v2';
const PLAYER_LEVEL_MANA_REGEN_BACKFILL_STATE_KEY = 'game-config:player-level-mana-regen-v2';
const PLAYER_LEVEL_CAULDRON_CAP_BACKFILL_STATE_KEY = 'game-config:player-level-cauldron-cap-v1';
const PLAYER_LEVEL_MANA_PER_SECOND_PER_LEVEL_RANGES = [
  { fromLevel: 2, toLevel: 5, amount: 1 },
  { fromLevel: 6, toLevel: 10, amount: 0.5 },
  { fromLevel: 11, amount: 0.25 },
];
const RESERVED_USERNAMES = new Set(['admin', 'system']);
const MAINTENANCE_MODE_OFF = 'off';
const MAINTENANCE_MODE_DRAIN = 'drain';
const MAINTENANCE_MODE_LOCKED = 'locked';
const MAINTENANCE_MODES = new Set([
  MAINTENANCE_MODE_OFF,
  MAINTENANCE_MODE_DRAIN,
  MAINTENANCE_MODE_LOCKED,
]);
const PLAYER_THEMES = new Set(['black', 'midnight', 'witchcraft']);
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
  ['mild-white', 'midnight'],
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
const PLAYER_COLOR_MODES = new Set(['resources']);
const PLAYER_CHARACTERS = new Set([
  'elara',
  'mira',
  'bramble',
  'corvin',
  'juniper',
  'rowan',
  'adventurer_blackarmor_sword',
  'adventurer_blondshield_guard',
  'adventurer_blondsword',
  'adventurer_bluebandana',
  'adventurer_bluequiver_archer',
  'adventurer_bluescarf_spear',
  'adventurer_brownhood_archer',
  'adventurer_cleric',
  'adventurer_furguard',
  'adventurer_goldshield_guard',
  'adventurer_grayquiver_archer',
  'adventurer_greenbow_archer',
  'adventurer_greencloak_spear',
  'adventurer_greenhood_archer',
  'adventurer_greenscarf_dagger',
  'adventurer_greenscarf_shield',
  'adventurer_headband_furguard',
  'adventurer_helmhammer',
  'adventurer_hornhelm_axe',
  'adventurer_olivehood_archer',
  'adventurer_packscout',
  'adventurer_plumehelm_sword',
  'adventurer_purpleaxe',
  'adventurer_redaxe_guard',
  'adventurer_redbow_archer',
  'adventurer_redplume_sword',
  'adventurer_redscarf_sword',
  'adventurer_redspearman',
  'adventurer_silverhair_spear',
  'adventurer_treasurehunter',
]);
const PLAYER_ICON_MODES = new Set(['icons']);
const PLAYER_PROGRESS_BARS = new Set(['regular', 'gradient', 'notched']);
const PLAYER_PLOT_VIEWS = new Set(['rows', 'boxes']);
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
      "completionCostCoin": 10,
      "tasks": [
        {
          "id": "level1-summon-sage-seed",
          "type": "summon",
          "itemKey": "sageSeed",
          "quantity": 5
        },
        {
          "id": "level1-turn-in-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 5
        }
      ]
    },
    {
      "level": 2,
      "completionCostCoin": 4,
      "tasks": [
        {
          "id": "level2-summon-sage-seed",
          "type": "summon",
          "itemKey": "sageSeed",
          "quantity": 5
        },
        {
          "id": "level2-sell-sage-seed",
          "type": "sell",
          "itemKey": "sageSeed",
          "quantity": 1
        },
        {
          "id": "level2-turn-in-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 4
        }
      ]
    },
    {
      "level": 3,
      "completionCostCoin": 8,
      "tasks": [
        {
          "id": "level3-research-mint-seed",
          "type": "research",
          "researchId": "unlockSeed:mintSeed",
          "itemKey": "mintSeed",
          "quantity": 1
        },
        {
          "id": "level3-summon-mint-seed",
          "type": "summon",
          "itemKey": "mintSeed",
          "quantity": 3
        },
        {
          "id": "level3-turn-in-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 3
        }
      ]
    },
    {
      "level": 4,
      "completionCostCoin": 16,
      "tasks": [
        {
          "id": "level4-grow-sage-herb",
          "type": "grow",
          "itemKey": "sageHerb",
          "quantity": 4
        },
        {
          "id": "level4-grow-mint-herb",
          "type": "grow",
          "itemKey": "mintHerb",
          "quantity": 2
        },
        {
          "id": "level4-turn-in-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 4
        },
        {
          "id": "level4-turn-in-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 2
        }
      ]
    },
    {
      "level": 5,
      "completionCostCoin": 30,
      "tasks": [
        {
          "id": "level5-research-mana-tonic",
          "type": "research",
          "researchId": "unlockRecipe:manaTonic",
          "itemKey": "manaTonic",
          "quantity": 1
        },
        {
          "id": "level5-brew-mana-tonic",
          "type": "brew",
          "itemKey": "manaTonic",
          "quantity": 3
        },
        {
          "id": "level5-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 3
        }
      ]
    },
    {
      "level": 6,
      "completionCostCoin": 50,
      "tasks": [
        {
          "id": "level6-research-nettle-seed",
          "type": "research",
          "researchId": "unlockSeed:nettleSeed",
          "itemKey": "nettleSeed",
          "quantity": 1
        },
        {
          "id": "level6-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 3,
          "type": "brew"
        },
        {
          "id": "level6-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 2
        },
        {
          "id": "level6-sell-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 3,
          "type": "sell"
        },
        {
          "id": "level6-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 16,
          "type": "summon"
        }
      ]
    },
    {
      "level": 7,
      "completionCostCoin": 80,
      "tasks": [
        {
          "id": "level7-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 17,
          "type": "summon"
        },
        {
          "id": "level7-grow-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 6,
          "type": "grow"
        },
        {
          "id": "level7-turn-in-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 5
        },
        {
          "id": "level7-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 3,
          "type": "brew"
        },
        {
          "id": "level7-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 2
        }
      ]
    },
    {
      "level": 8,
      "completionCostCoin": 120,
      "tasks": [
        {
          "id": "level8-research-minor-healing-potion",
          "type": "research",
          "researchId": "unlockRecipe:minorHealingPotion",
          "itemKey": "minorHealingPotion",
          "quantity": 1
        },
        {
          "id": "level8-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level8-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 3
        },
        {
          "id": "level8-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 8,
          "type": "sell"
        },
        {
          "id": "level8-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 36,
          "type": "summon"
        }
      ]
    },
    {
      "level": 9,
      "completionCostCoin": 170,
      "tasks": [
        {
          "id": "level9-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level9-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 3
        },
        {
          "id": "level9-sell-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 10,
          "type": "sell"
        },
        {
          "id": "level9-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 45,
          "type": "summon"
        },
        {
          "id": "level9-grow-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 16,
          "type": "grow"
        }
      ]
    },
    {
      "level": 10,
      "completionCostCoin": 230,
      "tasks": [
        {
          "id": "level10-research-lavender-seed",
          "type": "research",
          "researchId": "unlockSeed:lavenderSeed",
          "itemKey": "lavenderSeed",
          "quantity": 1
        },
        {
          "id": "level10-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 4,
          "type": "brew"
        },
        {
          "id": "level10-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 2
        },
        {
          "id": "level10-sell-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 6,
          "type": "sell"
        },
        {
          "id": "level10-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 32,
          "type": "summon"
        }
      ]
    },
    {
      "level": 11,
      "completionCostCoin": 1210,
      "tasks": [
        {
          "id": "level11-summon-lavender-seed",
          "itemKey": "lavenderSeed",
          "quantity": 27,
          "type": "summon"
        },
        {
          "id": "level11-grow-lavender-herb",
          "itemKey": "lavenderHerb",
          "quantity": 10,
          "type": "grow"
        },
        {
          "id": "level11-turn-in-lavender-herb",
          "itemKey": "lavenderHerb",
          "quantity": 7
        },
        {
          "id": "level11-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 3,
          "type": "brew"
        },
        {
          "id": "level11-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 1
        }
      ]
    },
    {
      "level": 12,
      "completionCostCoin": 1440,
      "tasks": [
        {
          "id": "level12-research-briar-seed",
          "type": "research",
          "researchId": "unlockSeed:briarSeed",
          "itemKey": "briarSeed",
          "quantity": 1
        },
        {
          "id": "level12-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level12-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 4
        },
        {
          "id": "level12-sell-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 9,
          "type": "sell"
        },
        {
          "id": "level12-summon-lavender-seed",
          "itemKey": "lavenderSeed",
          "quantity": 40,
          "type": "summon"
        }
      ]
    },
    {
      "level": 13,
      "completionCostCoin": 1690,
      "tasks": [
        {
          "id": "level13-summon-briar-seed",
          "itemKey": "briarSeed",
          "quantity": 40,
          "type": "summon"
        },
        {
          "id": "level13-grow-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 13,
          "type": "grow"
        },
        {
          "id": "level13-turn-in-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 9
        },
        {
          "id": "level13-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level13-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 4
        }
      ]
    },
    {
      "level": 14,
      "completionCostCoin": 1960,
      "tasks": [
        {
          "id": "level14-research-nettle-vigor",
          "type": "research",
          "researchId": "unlockRecipe:nettleVigor",
          "itemKey": "nettleVigor",
          "quantity": 1
        },
        {
          "id": "level14-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 9,
          "type": "brew"
        },
        {
          "id": "level14-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 6
        },
        {
          "id": "level14-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 15,
          "type": "sell"
        },
        {
          "id": "level14-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 67,
          "type": "summon"
        }
      ]
    },
    {
      "level": 15,
      "completionCostCoin": 2250,
      "tasks": [
        {
          "id": "level15-brew-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 8,
          "type": "brew"
        },
        {
          "id": "level15-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 6
        },
        {
          "id": "level15-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 8,
          "type": "brew"
        },
        {
          "id": "level15-sell-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 14,
          "type": "sell"
        },
        {
          "id": "level15-summon-lavender-seed",
          "itemKey": "lavenderSeed",
          "quantity": 64,
          "type": "summon"
        }
      ]
    },
    {
      "level": 16,
      "completionCostCoin": 2560,
      "tasks": [
        {
          "id": "level16-research-calming-draught",
          "type": "research",
          "researchId": "unlockRecipe:calmingDraught",
          "itemKey": "calmingDraught",
          "quantity": 1
        },
        {
          "id": "level16-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 14,
          "type": "brew"
        },
        {
          "id": "level16-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 9
        },
        {
          "id": "level16-sell-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 23,
          "type": "sell"
        },
        {
          "id": "level16-summon-briar-seed",
          "itemKey": "briarSeed",
          "quantity": 110,
          "type": "summon"
        }
      ]
    },
    {
      "level": 17,
      "completionCostCoin": 2890,
      "tasks": [
        {
          "id": "level17-brew-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level17-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 8
        },
        {
          "id": "level17-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level17-sell-lavender-herb",
          "itemKey": "lavenderHerb",
          "quantity": 21,
          "type": "sell"
        },
        {
          "id": "level17-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 105,
          "type": "summon"
        }
      ]
    },
    {
      "level": 18,
      "completionCostCoin": 3240,
      "tasks": [
        {
          "id": "level18-research-glowcap-seed",
          "type": "research",
          "researchId": "unlockSeed:glowcapSeed",
          "itemKey": "glowcapSeed",
          "quantity": 1
        },
        {
          "id": "level18-brew-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 19,
          "type": "brew"
        },
        {
          "id": "level18-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 13
        },
        {
          "id": "level18-sell-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 38,
          "type": "sell"
        },
        {
          "id": "level18-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 172,
          "type": "summon"
        }
      ]
    },
    {
      "level": 19,
      "completionCostCoin": 3610,
      "tasks": [
        {
          "id": "level19-summon-glowcap-seed",
          "itemKey": "glowcapSeed",
          "quantity": 146,
          "type": "summon"
        },
        {
          "id": "level19-grow-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 52,
          "type": "grow"
        },
        {
          "id": "level19-turn-in-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 36
        },
        {
          "id": "level19-brew-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 16,
          "type": "brew"
        },
        {
          "id": "level19-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 10
        }
      ]
    },
    {
      "level": 20,
      "completionCostCoin": 4000,
      "tasks": [
        {
          "id": "level20-research-briar-ward",
          "type": "research",
          "researchId": "unlockRecipe:briarWard",
          "itemKey": "briarWard",
          "quantity": 1
        },
        {
          "id": "level20-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level20-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 4
        },
        {
          "id": "level20-sell-lavender-herb",
          "itemKey": "lavenderHerb",
          "quantity": 11,
          "type": "sell"
        },
        {
          "id": "level20-summon-glowcap-seed",
          "itemKey": "glowcapSeed",
          "quantity": 55,
          "type": "summon"
        }
      ]
    },
    {
      "level": 21,
      "completionCostCoin": 4410,
      "tasks": [
        {
          "id": "level21-brew-briar-ward",
          "itemKey": "briarWard",
          "quantity": 7,
          "type": "brew"
        },
        {
          "id": "level21-turn-in-briar-ward",
          "itemKey": "briarWard",
          "quantity": 5
        },
        {
          "id": "level21-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 7,
          "type": "brew"
        },
        {
          "id": "level21-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 5
        },
        {
          "id": "level21-sell-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 12,
          "type": "sell"
        }
      ]
    },
    {
      "level": 22,
      "completionCostCoin": 4840,
      "tasks": [
        {
          "id": "level22-research-mandrake-seed",
          "type": "research",
          "researchId": "unlockSeed:mandrakeSeed",
          "itemKey": "mandrakeSeed",
          "quantity": 1
        },
        {
          "id": "level22-brew-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 9,
          "type": "brew"
        },
        {
          "id": "level22-turn-in-briar-ward",
          "itemKey": "briarWard",
          "quantity": 7
        },
        {
          "id": "level22-sell-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 15,
          "type": "sell"
        },
        {
          "id": "level22-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 72,
          "type": "summon"
        }
      ]
    },
    {
      "level": 23,
      "completionCostCoin": 5290,
      "tasks": [
        {
          "id": "level23-summon-mandrake-seed",
          "itemKey": "mandrakeSeed",
          "quantity": 70,
          "type": "summon"
        },
        {
          "id": "level23-grow-mandrake-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 26,
          "type": "grow"
        },
        {
          "id": "level23-turn-in-mandrake-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 18
        },
        {
          "id": "level23-research-lantern-tonic",
          "type": "research",
          "researchId": "unlockRecipe:lanternTonic",
          "itemKey": "lanternTonic",
          "quantity": 1
        },
        {
          "id": "level23-brew-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 8,
          "type": "brew"
        }
      ]
    },
    {
      "level": 24,
      "completionCostCoin": 5760,
      "tasks": [
        {
          "id": "level24-brew-lantern-tonic",
          "itemKey": "lanternTonic",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level24-turn-in-lantern-tonic",
          "itemKey": "lanternTonic",
          "quantity": 10
        },
        {
          "id": "level24-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level24-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 10
        },
        {
          "id": "level24-sell-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 26,
          "type": "sell"
        }
      ]
    },
    {
      "level": 25,
      "completionCostCoin": 6250,
      "tasks": [
        {
          "id": "level25-research-sunroot-seed",
          "type": "research",
          "researchId": "unlockSeed:sunrootSeed",
          "itemKey": "sunrootSeed",
          "quantity": 1
        },
        {
          "id": "level25-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 16,
          "type": "brew"
        },
        {
          "id": "level25-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 12
        },
        {
          "id": "level25-sell-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 32,
          "type": "sell"
        },
        {
          "id": "level25-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 148,
          "type": "summon"
        }
      ]
    },
    {
      "level": 26,
      "completionCostCoin": 6760,
      "tasks": [
        {
          "id": "level26-summon-sunroot-seed",
          "itemKey": "sunrootSeed",
          "quantity": 128,
          "type": "summon"
        },
        {
          "id": "level26-grow-sunroot-herb",
          "itemKey": "sunrootHerb",
          "quantity": 47,
          "type": "grow"
        },
        {
          "id": "level26-turn-in-sunroot-herb",
          "itemKey": "sunrootHerb",
          "quantity": 34
        },
        {
          "id": "level26-brew-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level26-turn-in-briar-ward",
          "itemKey": "briarWard",
          "quantity": 10
        }
      ]
    },
    {
      "level": 27,
      "completionCostCoin": 7290,
      "tasks": [
        {
          "id": "level27-research-simple-antidote",
          "type": "research",
          "researchId": "unlockRecipe:simpleAntidote",
          "itemKey": "simpleAntidote",
          "quantity": 1
        },
        {
          "id": "level27-brew-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 24,
          "type": "brew"
        },
        {
          "id": "level27-turn-in-lantern-tonic",
          "itemKey": "lanternTonic",
          "quantity": 18
        },
        {
          "id": "level27-sell-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 49,
          "type": "sell"
        },
        {
          "id": "level27-summon-mandrake-seed",
          "itemKey": "mandrakeSeed",
          "quantity": 237,
          "type": "summon"
        }
      ]
    },
    {
      "level": 28,
      "completionCostCoin": 7840,
      "tasks": [
        {
          "id": "level28-brew-simple-antidote",
          "itemKey": "simpleAntidote",
          "quantity": 30,
          "type": "brew"
        },
        {
          "id": "level28-turn-in-simple-antidote",
          "itemKey": "simpleAntidote",
          "quantity": 24
        },
        {
          "id": "level28-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 30,
          "type": "brew"
        },
        {
          "id": "level28-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 24
        },
        {
          "id": "level28-sell-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 54,
          "type": "sell"
        }
      ]
    },
    {
      "level": 29,
      "completionCostCoin": 8410,
      "tasks": [
        {
          "id": "level29-research-moonflower-seed",
          "type": "research",
          "researchId": "unlockSeed:moonflowerSeed",
          "itemKey": "moonflowerSeed",
          "quantity": 1
        },
        {
          "id": "level29-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 37,
          "type": "brew"
        },
        {
          "id": "level29-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 30
        },
        {
          "id": "level29-sell-mandrake-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 67,
          "type": "sell"
        },
        {
          "id": "level29-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 314,
          "type": "summon"
        }
      ]
    },
    {
      "level": 30,
      "completionCostCoin": 9000,
      "tasks": [
        {
          "id": "level30-summon-moonflower-seed",
          "itemKey": "moonflowerSeed",
          "quantity": 48,
          "type": "summon"
        },
        {
          "id": "level30-grow-moonflower-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 18,
          "type": "grow"
        },
        {
          "id": "level30-turn-in-moonflower-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 13
        },
        {
          "id": "level30-brew-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 6,
          "type": "brew"
        },
        {
          "id": "level30-turn-in-briar-ward",
          "itemKey": "briarWard",
          "quantity": 4
        }
      ]
    },
    {
      "level": 31,
      "completionCostCoin": 9610,
      "tasks": [
        {
          "id": "level31-research-venom-draught",
          "type": "research",
          "researchId": "unlockRecipe:venomDraught",
          "itemKey": "venomDraught",
          "quantity": 1
        },
        {
          "id": "level31-brew-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 9,
          "type": "brew"
        },
        {
          "id": "level31-turn-in-lantern-tonic",
          "itemKey": "lanternTonic",
          "quantity": 7
        },
        {
          "id": "level31-sell-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 18,
          "type": "sell"
        },
        {
          "id": "level31-summon-sunroot-seed",
          "itemKey": "sunrootSeed",
          "quantity": 85,
          "type": "summon"
        }
      ]
    },
    {
      "level": 32,
      "completionCostCoin": 10240,
      "tasks": [
        {
          "id": "level32-brew-venom-draught",
          "itemKey": "venomDraught",
          "quantity": 11,
          "type": "brew"
        },
        {
          "id": "level32-turn-in-venom-draught",
          "itemKey": "venomDraught",
          "quantity": 9
        },
        {
          "id": "level32-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 11,
          "type": "brew"
        },
        {
          "id": "level32-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 9
        },
        {
          "id": "level32-sell-mandrake-herb",
          "itemKey": "mandrakeHerb",
          "quantity": 22,
          "type": "sell"
        }
      ]
    },
    {
      "level": 33,
      "completionCostCoin": 10890,
      "tasks": [
        {
          "id": "level33-research-healing-potion",
          "type": "research",
          "researchId": "unlockRecipe:healingPotion",
          "itemKey": "healingPotion",
          "quantity": 1
        },
        {
          "id": "level33-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 14,
          "type": "brew"
        },
        {
          "id": "level33-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 11
        },
        {
          "id": "level33-sell-sunroot-herb",
          "itemKey": "sunrootHerb",
          "quantity": 28,
          "type": "sell"
        },
        {
          "id": "level33-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 135,
          "type": "summon"
        }
      ]
    },
    {
      "level": 34,
      "completionCostCoin": 11560,
      "tasks": [
        {
          "id": "level34-brew-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 17,
          "type": "brew"
        },
        {
          "id": "level34-turn-in-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 14
        },
        {
          "id": "level34-brew-venom-draught",
          "itemKey": "venomDraught",
          "quantity": 17,
          "type": "brew"
        },
        {
          "id": "level34-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 14
        },
        {
          "id": "level34-sell-moonflower-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 38,
          "type": "sell"
        }
      ]
    },
    {
      "level": 35,
      "completionCostCoin": 12250,
      "tasks": [
        {
          "id": "level35-research-frostmoss-seed",
          "type": "research",
          "researchId": "unlockSeed:frostmossSeed",
          "itemKey": "frostmossSeed",
          "quantity": 1
        },
        {
          "id": "level35-brew-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 23,
          "type": "brew"
        },
        {
          "id": "level35-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 16
        },
        {
          "id": "level35-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 43,
          "type": "sell"
        },
        {
          "id": "level35-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 199,
          "type": "summon"
        }
      ]
    },
    {
      "level": 36,
      "completionCostCoin": 12960,
      "tasks": [
        {
          "id": "level36-summon-frostmoss-seed",
          "itemKey": "frostmossSeed",
          "quantity": 172,
          "type": "summon"
        },
        {
          "id": "level36-grow-frostmoss-herb",
          "itemKey": "frostmossHerb",
          "quantity": 63,
          "type": "grow"
        },
        {
          "id": "level36-turn-in-frostmoss-herb",
          "itemKey": "frostmossHerb",
          "quantity": 46
        },
        {
          "id": "level36-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 20,
          "type": "brew"
        },
        {
          "id": "level36-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 13
        }
      ]
    },
    {
      "level": 37,
      "completionCostCoin": 13690,
      "tasks": [
        {
          "id": "level37-research-sunroot-stamina",
          "type": "research",
          "researchId": "unlockRecipe:sunrootStamina",
          "itemKey": "sunrootStamina",
          "quantity": 1
        },
        {
          "id": "level37-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 36,
          "type": "brew"
        },
        {
          "id": "level37-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 24
        },
        {
          "id": "level37-sell-moonflower-herb",
          "itemKey": "moonflowerHerb",
          "quantity": 66,
          "type": "sell"
        },
        {
          "id": "level37-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 316,
          "type": "summon"
        }
      ]
    },
    {
      "level": 38,
      "completionCostCoin": 14440,
      "tasks": [
        {
          "id": "level38-brew-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 43,
          "type": "brew"
        },
        {
          "id": "level38-turn-in-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 28
        },
        {
          "id": "level38-brew-healing-potion",
          "itemKey": "healingPotion",
          "quantity": 43,
          "type": "brew"
        },
        {
          "id": "level38-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 28
        },
        {
          "id": "level38-sell-frostmoss-herb",
          "itemKey": "frostmossHerb",
          "quantity": 78,
          "type": "sell"
        }
      ]
    },
    {
      "level": 39,
      "completionCostCoin": 15210,
      "tasks": [
        {
          "id": "level39-research-dreambell-seed",
          "type": "research",
          "researchId": "unlockSeed:dreambellSeed",
          "itemKey": "dreambellSeed",
          "quantity": 1
        },
        {
          "id": "level39-brew-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 49,
          "type": "brew"
        },
        {
          "id": "level39-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 33
        },
        {
          "id": "level39-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 99,
          "type": "sell"
        },
        {
          "id": "level39-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 460,
          "type": "summon"
        }
      ]
    },
    {
      "level": 40,
      "completionCostCoin": 16000,
      "tasks": [
        {
          "id": "level40-summon-dreambell-seed",
          "itemKey": "dreambellSeed",
          "quantity": 64,
          "type": "summon"
        },
        {
          "id": "level40-grow-dreambell-herb",
          "itemKey": "dreambellHerb",
          "quantity": 24,
          "type": "grow"
        },
        {
          "id": "level40-turn-in-dreambell-herb",
          "itemKey": "dreambellHerb",
          "quantity": 17
        },
        {
          "id": "level40-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 7,
          "type": "brew"
        },
        {
          "id": "level40-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 5
        }
      ]
    },
    {
      "level": 41,
      "completionCostCoin": 16810,
      "tasks": [
        {
          "id": "level41-research-moonlit-focus",
          "type": "research",
          "researchId": "unlockRecipe:moonlitFocus",
          "itemKey": "moonlitFocus",
          "quantity": 1
        },
        {
          "id": "level41-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 12,
          "type": "brew"
        },
        {
          "id": "level41-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 9
        },
        {
          "id": "level41-sell-frostmoss-herb",
          "itemKey": "frostmossHerb",
          "quantity": 23,
          "type": "sell"
        },
        {
          "id": "level41-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 106,
          "type": "summon"
        }
      ]
    },
    {
      "level": 42,
      "completionCostCoin": 17640,
      "tasks": [
        {
          "id": "level42-brew-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 15,
          "type": "brew"
        },
        {
          "id": "level42-turn-in-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 10
        },
        {
          "id": "level42-brew-sunroot-stamina",
          "itemKey": "sunrootStamina",
          "quantity": 15,
          "type": "brew"
        },
        {
          "id": "level42-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 10
        },
        {
          "id": "level42-sell-dreambell-herb",
          "itemKey": "dreambellHerb",
          "quantity": 27,
          "type": "sell"
        }
      ]
    },
    {
      "level": 43,
      "completionCostCoin": 18490,
      "tasks": [
        {
          "id": "level43-research-star-anise-seed",
          "type": "research",
          "researchId": "unlockSeed:starAniseSeed",
          "itemKey": "starAniseSeed",
          "quantity": 1
        },
        {
          "id": "level43-brew-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 19,
          "type": "brew"
        },
        {
          "id": "level43-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 13
        },
        {
          "id": "level43-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 34,
          "type": "sell"
        },
        {
          "id": "level43-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 167,
          "type": "summon"
        }
      ]
    },
    {
      "level": 44,
      "completionCostCoin": 19360,
      "tasks": [
        {
          "id": "level44-summon-star-anise-seed",
          "itemKey": "starAniseSeed",
          "quantity": 143,
          "type": "summon"
        },
        {
          "id": "level44-grow-star-anise-herb",
          "itemKey": "starAniseHerb",
          "quantity": 52,
          "type": "grow"
        },
        {
          "id": "level44-turn-in-star-anise-herb",
          "itemKey": "starAniseHerb",
          "quantity": 38
        },
        {
          "id": "level44-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 16,
          "type": "brew"
        },
        {
          "id": "level44-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 11
        }
      ]
    },
    {
      "level": 45,
      "completionCostCoin": 20250,
      "tasks": [
        {
          "id": "level45-research-frostmoss-cleanse",
          "type": "research",
          "researchId": "unlockRecipe:frostmossCleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 1
        },
        {
          "id": "level45-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 28,
          "type": "brew"
        },
        {
          "id": "level45-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 20
        },
        {
          "id": "level45-sell-dreambell-herb",
          "itemKey": "dreambellHerb",
          "quantity": 56,
          "type": "sell"
        },
        {
          "id": "level45-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 261,
          "type": "summon"
        }
      ]
    },
    {
      "level": 46,
      "completionCostCoin": 21160,
      "tasks": [
        {
          "id": "level46-brew-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level46-turn-in-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 25
        },
        {
          "id": "level46-brew-moonlit-focus",
          "itemKey": "moonlitFocus",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level46-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 25
        },
        {
          "id": "level46-sell-star-anise-herb",
          "itemKey": "starAniseHerb",
          "quantity": 70,
          "type": "sell"
        }
      ]
    },
    {
      "level": 47,
      "completionCostCoin": 22090,
      "tasks": [
        {
          "id": "level47-research-bloodrose-seed",
          "type": "research",
          "researchId": "unlockSeed:bloodroseSeed",
          "itemKey": "bloodroseSeed",
          "quantity": 1
        },
        {
          "id": "level47-brew-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 43,
          "type": "brew"
        },
        {
          "id": "level47-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 31
        },
        {
          "id": "level47-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 86,
          "type": "sell"
        },
        {
          "id": "level47-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 413,
          "type": "summon"
        }
      ]
    },
    {
      "level": 48,
      "completionCostCoin": 23040,
      "tasks": [
        {
          "id": "level48-summon-bloodrose-seed",
          "itemKey": "bloodroseSeed",
          "quantity": 342,
          "type": "summon"
        },
        {
          "id": "level48-grow-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 124,
          "type": "grow"
        },
        {
          "id": "level48-turn-in-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 89
        },
        {
          "id": "level48-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level48-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 25
        }
      ]
    },
    {
      "level": 49,
      "completionCostCoin": 24010,
      "tasks": [
        {
          "id": "level49-research-sleep-draught",
          "type": "research",
          "researchId": "unlockRecipe:sleepDraught",
          "itemKey": "sleepDraught",
          "quantity": 1
        },
        {
          "id": "level49-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 60,
          "type": "brew"
        },
        {
          "id": "level49-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 43
        },
        {
          "id": "level49-sell-star-anise-herb",
          "itemKey": "starAniseHerb",
          "quantity": 128,
          "type": "sell"
        },
        {
          "id": "level49-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 598,
          "type": "summon"
        }
      ]
    },
    {
      "level": 50,
      "completionCostCoin": 25000,
      "tasks": [
        {
          "id": "level50-brew-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level50-turn-in-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 9
        },
        {
          "id": "level50-brew-frostmoss-cleanse",
          "itemKey": "frostmossCleanse",
          "quantity": 13,
          "type": "brew"
        },
        {
          "id": "level50-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 9
        },
        {
          "id": "level50-sell-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 27,
          "type": "sell"
        }
      ]
    },
    {
      "level": 51,
      "completionCostCoin": 26010,
      "tasks": [
        {
          "id": "level51-research-dragonpepper-seed",
          "type": "research",
          "researchId": "unlockSeed:dragonpepperSeed",
          "itemKey": "dragonpepperSeed",
          "quantity": 1
        },
        {
          "id": "level51-brew-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 15,
          "type": "brew"
        },
        {
          "id": "level51-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 11
        },
        {
          "id": "level51-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 30,
          "type": "sell"
        },
        {
          "id": "level51-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 141,
          "type": "summon"
        }
      ]
    },
    {
      "level": 52,
      "completionCostCoin": 27040,
      "tasks": [
        {
          "id": "level52-summon-dragonpepper-seed",
          "itemKey": "dragonpepperSeed",
          "quantity": 116,
          "type": "summon"
        },
        {
          "id": "level52-grow-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 43,
          "type": "grow"
        },
        {
          "id": "level52-turn-in-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 32
        },
        {
          "id": "level52-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 12,
          "type": "brew"
        },
        {
          "id": "level52-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 9
        }
      ]
    },
    {
      "level": 53,
      "completionCostCoin": 28090,
      "tasks": [
        {
          "id": "level53-research-elixir-of-life",
          "type": "research",
          "researchId": "unlockRecipe:elixirOfLife",
          "itemKey": "elixirOfLife",
          "quantity": 1
        },
        {
          "id": "level53-brew-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 23,
          "type": "brew"
        },
        {
          "id": "level53-turn-in-calming-draught",
          "itemKey": "calmingDraught",
          "quantity": 17
        },
        {
          "id": "level53-sell-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 46,
          "type": "sell"
        },
        {
          "id": "level53-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 220,
          "type": "summon"
        }
      ]
    },
    {
      "level": 54,
      "completionCostCoin": 29160,
      "tasks": [
        {
          "id": "level54-brew-elixir-of-life",
          "itemKey": "elixirOfLife",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level54-turn-in-elixir-of-life",
          "itemKey": "elixirOfLife",
          "quantity": 26
        },
        {
          "id": "level54-research-silverleaf-seed",
          "type": "research",
          "researchId": "unlockSeed:silverleafSeed",
          "itemKey": "silverleafSeed",
          "quantity": 1
        },
        {
          "id": "level54-brew-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level54-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 26
        }
      ]
    },
    {
      "level": 55,
      "completionCostCoin": 30250,
      "tasks": [
        {
          "id": "level55-summon-silverleaf-seed",
          "itemKey": "silverleafSeed",
          "quantity": 234,
          "type": "summon"
        },
        {
          "id": "level55-grow-silverleaf-herb",
          "itemKey": "silverleafHerb",
          "quantity": 86,
          "type": "grow"
        },
        {
          "id": "level55-turn-in-silverleaf-herb",
          "itemKey": "silverleafHerb",
          "quantity": 62
        },
        {
          "id": "level55-brew-elixir-of-life",
          "itemKey": "elixirOfLife",
          "quantity": 24,
          "type": "brew"
        },
        {
          "id": "level55-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 18
        }
      ]
    },
    {
      "level": 56,
      "completionCostCoin": 31360,
      "tasks": [
        {
          "id": "level56-research-star-luck-philtre",
          "type": "research",
          "researchId": "unlockRecipe:starLuckPhiltre",
          "itemKey": "starLuckPhiltre",
          "quantity": 1
        },
        {
          "id": "level56-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 43,
          "type": "brew"
        },
        {
          "id": "level56-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 32
        },
        {
          "id": "level56-sell-bloodrose-herb",
          "itemKey": "bloodroseHerb",
          "quantity": 91,
          "type": "sell"
        },
        {
          "id": "level56-summon-silverleaf-seed",
          "itemKey": "silverleafSeed",
          "quantity": 429,
          "type": "summon"
        }
      ]
    },
    {
      "level": 57,
      "completionCostCoin": 32490,
      "tasks": [
        {
          "id": "level57-brew-star-luck-philtre",
          "itemKey": "starLuckPhiltre",
          "quantity": 41,
          "type": "brew"
        },
        {
          "id": "level57-turn-in-star-luck-philtre",
          "itemKey": "starLuckPhiltre",
          "quantity": 31
        },
        {
          "id": "level57-brew-sleep-draught",
          "itemKey": "sleepDraught",
          "quantity": 41,
          "type": "brew"
        },
        {
          "id": "level57-sell-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 87,
          "type": "sell"
        },
        {
          "id": "level57-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 417,
          "type": "summon"
        }
      ]
    },
    {
      "level": 58,
      "completionCostCoin": 33640,
      "tasks": [
        {
          "id": "level58-research-yarrow-seed",
          "type": "research",
          "researchId": "unlockSeed:yarrowSeed",
          "itemKey": "yarrowSeed",
          "quantity": 1
        },
        {
          "id": "level58-brew-elixir-of-life",
          "itemKey": "elixirOfLife",
          "quantity": 68,
          "type": "brew"
        },
        {
          "id": "level58-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 53
        },
        {
          "id": "level58-sell-silverleaf-herb",
          "itemKey": "silverleafHerb",
          "quantity": 128,
          "type": "sell"
        },
        {
          "id": "level58-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 624,
          "type": "summon"
        }
      ]
    },
    {
      "level": 59,
      "completionCostCoin": 34810,
      "tasks": [
        {
          "id": "level59-summon-yarrow-seed",
          "itemKey": "yarrowSeed",
          "quantity": 506,
          "type": "summon"
        },
        {
          "id": "level59-grow-yarrow-herb",
          "itemKey": "yarrowHerb",
          "quantity": 187,
          "type": "grow"
        },
        {
          "id": "level59-turn-in-yarrow-herb",
          "itemKey": "yarrowHerb",
          "quantity": 138
        },
        {
          "id": "level59-brew-star-luck-philtre",
          "itemKey": "starLuckPhiltre",
          "quantity": 54,
          "type": "brew"
        },
        {
          "id": "level59-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 42
        }
      ]
    },
    {
      "level": 60,
      "completionCostCoin": 36000,
      "tasks": [
        {
          "id": "level60-research-deep-dream-vision",
          "type": "research",
          "researchId": "unlockRecipe:deepDreamVision",
          "itemKey": "deepDreamVision",
          "quantity": 1
        },
        {
          "id": "level60-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 16,
          "type": "brew"
        },
        {
          "id": "level60-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 13
        },
        {
          "id": "level60-sell-dragonpepper-herb",
          "itemKey": "dragonpepperHerb",
          "quantity": 32,
          "type": "sell"
        },
        {
          "id": "level60-summon-yarrow-seed",
          "itemKey": "yarrowSeed",
          "quantity": 153,
          "type": "summon"
        }
      ]
    },
    {
      "level": 61,
      "completionCostCoin": 37210,
      "tasks": [
        {
          "id": "level61-brew-deep-dream-vision",
          "itemKey": "deepDreamVision",
          "quantity": 14,
          "type": "brew"
        },
        {
          "id": "level61-turn-in-deep-dream-vision",
          "itemKey": "deepDreamVision",
          "quantity": 11
        },
        {
          "id": "level61-brew-elixir-of-life",
          "itemKey": "elixirOfLife",
          "quantity": 14,
          "type": "brew"
        },
        {
          "id": "level61-sell-silverleaf-herb",
          "itemKey": "silverleafHerb",
          "quantity": 30,
          "type": "sell"
        },
        {
          "id": "level61-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 141,
          "type": "summon"
        }
      ]
    },
    {
      "level": 62,
      "completionCostCoin": 38440,
      "tasks": [
        {
          "id": "level62-research-hyssop-seed",
          "type": "research",
          "researchId": "unlockSeed:hyssopSeed",
          "itemKey": "hyssopSeed",
          "quantity": 1
        },
        {
          "id": "level62-brew-star-luck-philtre",
          "itemKey": "starLuckPhiltre",
          "quantity": 23,
          "type": "brew"
        },
        {
          "id": "level62-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 18
        },
        {
          "id": "level62-sell-yarrow-herb",
          "itemKey": "yarrowHerb",
          "quantity": 48,
          "type": "sell"
        },
        {
          "id": "level62-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 223,
          "type": "summon"
        }
      ]
    },
    {
      "level": 63,
      "completionCostCoin": 39690,
      "tasks": [
        {
          "id": "level63-summon-hyssop-seed",
          "itemKey": "hyssopSeed",
          "quantity": 194,
          "type": "summon"
        },
        {
          "id": "level63-grow-hyssop-herb",
          "itemKey": "hyssopHerb",
          "quantity": 70,
          "type": "grow"
        },
        {
          "id": "level63-turn-in-hyssop-herb",
          "itemKey": "hyssopHerb",
          "quantity": 51
        },
        {
          "id": "level63-brew-deep-dream-vision",
          "itemKey": "deepDreamVision",
          "quantity": 19,
          "type": "brew"
        },
        {
          "id": "level63-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 15
        }
      ]
    },
    {
      "level": 64,
      "completionCostCoin": 40960,
      "tasks": [
        {
          "id": "level64-research-pact-ward",
          "type": "research",
          "researchId": "unlockRecipe:pactWard",
          "itemKey": "pactWard",
          "quantity": 1
        },
        {
          "id": "level64-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 37,
          "type": "brew"
        },
        {
          "id": "level64-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 30
        },
        {
          "id": "level64-sell-silverleaf-herb",
          "itemKey": "silverleafHerb",
          "quantity": 70,
          "type": "sell"
        },
        {
          "id": "level64-summon-hyssop-seed",
          "itemKey": "hyssopSeed",
          "quantity": 340,
          "type": "summon"
        }
      ]
    },
    {
      "level": 65,
      "completionCostCoin": 42250,
      "tasks": [
        {
          "id": "level65-brew-pact-ward",
          "itemKey": "pactWard",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level65-turn-in-pact-ward",
          "itemKey": "pactWard",
          "quantity": 28
        },
        {
          "id": "level65-brew-star-luck-philtre",
          "itemKey": "starLuckPhiltre",
          "quantity": 35,
          "type": "brew"
        },
        {
          "id": "level65-sell-yarrow-herb",
          "itemKey": "yarrowHerb",
          "quantity": 70,
          "type": "sell"
        },
        {
          "id": "level65-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 324,
          "type": "summon"
        }
      ]
    },
    {
      "level": 66,
      "completionCostCoin": 43560,
      "tasks": [
        {
          "id": "level66-research-valerian-seed",
          "type": "research",
          "researchId": "unlockSeed:valerianSeed",
          "itemKey": "valerianSeed",
          "quantity": 1
        },
        {
          "id": "level66-brew-deep-dream-vision",
          "itemKey": "deepDreamVision",
          "quantity": 56,
          "type": "brew"
        },
        {
          "id": "level66-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 45
        },
        {
          "id": "level66-sell-hyssop-herb",
          "itemKey": "hyssopHerb",
          "quantity": 113,
          "type": "sell"
        },
        {
          "id": "level66-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 531,
          "type": "summon"
        }
      ]
    },
    {
      "level": 67,
      "completionCostCoin": 44890,
      "tasks": [
        {
          "id": "level67-summon-valerian-seed",
          "itemKey": "valerianSeed",
          "quantity": 454,
          "type": "summon"
        },
        {
          "id": "level67-grow-valerian-herb",
          "itemKey": "valerianHerb",
          "quantity": 167,
          "type": "grow"
        },
        {
          "id": "level67-turn-in-valerian-herb",
          "itemKey": "valerianHerb",
          "quantity": 124
        },
        {
          "id": "level67-brew-pact-ward",
          "itemKey": "pactWard",
          "quantity": 48,
          "type": "brew"
        },
        {
          "id": "level67-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 38
        }
      ]
    },
    {
      "level": 68,
      "completionCostCoin": 46240,
      "tasks": [
        {
          "id": "level68-research-dragon-courage",
          "type": "research",
          "researchId": "unlockRecipe:dragonCourage",
          "itemKey": "dragonCourage",
          "quantity": 1
        },
        {
          "id": "level68-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 84,
          "type": "brew"
        },
        {
          "id": "level68-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 67
        },
        {
          "id": "level68-sell-yarrow-herb",
          "itemKey": "yarrowHerb",
          "quantity": 167,
          "type": "sell"
        },
        {
          "id": "level68-summon-valerian-seed",
          "itemKey": "valerianSeed",
          "quantity": 811,
          "type": "summon"
        }
      ]
    },
    {
      "level": 69,
      "completionCostCoin": 47610,
      "tasks": [
        {
          "id": "level69-brew-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 76,
          "type": "brew"
        },
        {
          "id": "level69-turn-in-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 61
        },
        {
          "id": "level69-brew-deep-dream-vision",
          "itemKey": "deepDreamVision",
          "quantity": 76,
          "type": "brew"
        },
        {
          "id": "level69-sell-hyssop-herb",
          "itemKey": "hyssopHerb",
          "quantity": 152,
          "type": "sell"
        },
        {
          "id": "level69-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 746,
          "type": "summon"
        }
      ]
    },
    {
      "level": 70,
      "completionCostCoin": 49000,
      "tasks": [
        {
          "id": "level70-research-comfrey-seed",
          "type": "research",
          "researchId": "unlockSeed:comfreySeed",
          "itemKey": "comfreySeed",
          "quantity": 1
        },
        {
          "id": "level70-brew-pact-ward",
          "itemKey": "pactWard",
          "quantity": 20,
          "type": "brew"
        },
        {
          "id": "level70-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 16
        },
        {
          "id": "level70-sell-valerian-herb",
          "itemKey": "valerianHerb",
          "quantity": 41,
          "type": "sell"
        },
        {
          "id": "level70-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 195,
          "type": "summon"
        }
      ]
    },
    {
      "level": 71,
      "completionCostCoin": 50410,
      "tasks": [
        {
          "id": "level71-summon-comfrey-seed",
          "itemKey": "comfreySeed",
          "quantity": 155,
          "type": "summon"
        },
        {
          "id": "level71-grow-comfrey-herb",
          "itemKey": "comfreyHerb",
          "quantity": 58,
          "type": "grow"
        },
        {
          "id": "level71-turn-in-comfrey-herb",
          "itemKey": "comfreyHerb",
          "quantity": 43
        },
        {
          "id": "level71-brew-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 17,
          "type": "brew"
        },
        {
          "id": "level71-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 12
        }
      ]
    },
    {
      "level": 72,
      "completionCostCoin": 51840,
      "tasks": [
        {
          "id": "level72-research-silverleaf-salve",
          "type": "research",
          "researchId": "unlockRecipe:silverleafSalve",
          "itemKey": "silverleafSalve",
          "quantity": 1
        },
        {
          "id": "level72-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 30,
          "type": "brew"
        },
        {
          "id": "level72-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 22
        },
        {
          "id": "level72-sell-hyssop-herb",
          "itemKey": "hyssopHerb",
          "quantity": 59,
          "type": "sell"
        },
        {
          "id": "level72-summon-comfrey-seed",
          "itemKey": "comfreySeed",
          "quantity": 277,
          "type": "summon"
        }
      ]
    },
    {
      "level": 73,
      "completionCostCoin": 53290,
      "tasks": [
        {
          "id": "level73-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 28,
          "type": "brew"
        },
        {
          "id": "level73-turn-in-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 21
        },
        {
          "id": "level73-brew-pact-ward",
          "itemKey": "pactWard",
          "quantity": 28,
          "type": "brew"
        },
        {
          "id": "level73-sell-valerian-herb",
          "itemKey": "valerianHerb",
          "quantity": 57,
          "type": "sell"
        },
        {
          "id": "level73-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 270,
          "type": "summon"
        }
      ]
    },
    {
      "level": 74,
      "completionCostCoin": 54760,
      "tasks": [
        {
          "id": "level74-research-nightshade-seed",
          "type": "research",
          "researchId": "unlockSeed:nightshadeSeed",
          "itemKey": "nightshadeSeed",
          "quantity": 1
        },
        {
          "id": "level74-brew-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 46,
          "type": "brew"
        },
        {
          "id": "level74-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 33
        },
        {
          "id": "level74-sell-comfrey-herb",
          "itemKey": "comfreyHerb",
          "quantity": 92,
          "type": "sell"
        },
        {
          "id": "level74-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 441,
          "type": "summon"
        }
      ]
    },
    {
      "level": 75,
      "completionCostCoin": 56250,
      "tasks": [
        {
          "id": "level75-summon-nightshade-seed",
          "itemKey": "nightshadeSeed",
          "quantity": 369,
          "type": "summon"
        },
        {
          "id": "level75-grow-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 138,
          "type": "grow"
        },
        {
          "id": "level75-turn-in-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 104
        },
        {
          "id": "level75-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 38,
          "type": "brew"
        },
        {
          "id": "level75-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 28
        }
      ]
    },
    {
      "level": 76,
      "completionCostCoin": 57760,
      "tasks": [
        {
          "id": "level76-research-yarrow-poultice",
          "type": "research",
          "researchId": "unlockRecipe:yarrowPoultice",
          "itemKey": "yarrowPoultice",
          "quantity": 1
        },
        {
          "id": "level76-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 70,
          "type": "brew"
        },
        {
          "id": "level76-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 51
        },
        {
          "id": "level76-sell-valerian-herb",
          "itemKey": "valerianHerb",
          "quantity": 146,
          "type": "sell"
        },
        {
          "id": "level76-summon-nightshade-seed",
          "itemKey": "nightshadeSeed",
          "quantity": 688,
          "type": "summon"
        }
      ]
    },
    {
      "level": 77,
      "completionCostCoin": 59290,
      "tasks": [
        {
          "id": "level77-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 67,
          "type": "brew"
        },
        {
          "id": "level77-turn-in-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 49
        },
        {
          "id": "level77-brew-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 67,
          "type": "brew"
        },
        {
          "id": "level77-sell-comfrey-herb",
          "itemKey": "comfreyHerb",
          "quantity": 140,
          "type": "sell"
        },
        {
          "id": "level77-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 664,
          "type": "summon"
        }
      ]
    },
    {
      "level": 78,
      "completionCostCoin": 60840,
      "tasks": [
        {
          "id": "level78-research-belladonna-seed",
          "type": "research",
          "researchId": "unlockSeed:belladonnaSeed",
          "itemKey": "belladonnaSeed",
          "quantity": 1
        },
        {
          "id": "level78-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 104,
          "type": "brew"
        },
        {
          "id": "level78-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 76
        },
        {
          "id": "level78-sell-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 217,
          "type": "sell"
        },
        {
          "id": "level78-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 1048,
          "type": "summon"
        }
      ]
    },
    {
      "level": 79,
      "completionCostCoin": 62410,
      "tasks": [
        {
          "id": "level79-summon-belladonna-seed",
          "itemKey": "belladonnaSeed",
          "quantity": 844,
          "type": "summon"
        },
        {
          "id": "level79-grow-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 309,
          "type": "grow"
        },
        {
          "id": "level79-turn-in-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 226
        },
        {
          "id": "level79-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 83,
          "type": "brew"
        },
        {
          "id": "level79-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 60
        }
      ]
    },
    {
      "level": 80,
      "completionCostCoin": 64000,
      "tasks": [
        {
          "id": "level80-research-hyssop-clarity",
          "type": "research",
          "researchId": "unlockRecipe:hyssopClarity",
          "itemKey": "hyssopClarity",
          "quantity": 1
        },
        {
          "id": "level80-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 24,
          "type": "brew"
        },
        {
          "id": "level80-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 18
        },
        {
          "id": "level80-sell-comfrey-herb",
          "itemKey": "comfreyHerb",
          "quantity": 53,
          "type": "sell"
        },
        {
          "id": "level80-summon-belladonna-seed",
          "itemKey": "belladonnaSeed",
          "quantity": 248,
          "type": "summon"
        }
      ]
    },
    {
      "level": 81,
      "completionCostCoin": 65610,
      "tasks": [
        {
          "id": "level81-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 23,
          "type": "brew"
        },
        {
          "id": "level81-turn-in-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 17
        },
        {
          "id": "level81-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 23,
          "type": "brew"
        },
        {
          "id": "level81-sell-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 46,
          "type": "sell"
        },
        {
          "id": "level81-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 221,
          "type": "summon"
        }
      ]
    },
    {
      "level": 82,
      "completionCostCoin": 67240,
      "tasks": [
        {
          "id": "level82-research-wormwood-seed",
          "type": "research",
          "researchId": "unlockSeed:wormwoodSeed",
          "itemKey": "wormwoodSeed",
          "quantity": 1
        },
        {
          "id": "level82-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 36,
          "type": "brew"
        },
        {
          "id": "level82-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 27
        },
        {
          "id": "level82-sell-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 74,
          "type": "sell"
        },
        {
          "id": "level82-summon-mint-seed",
          "itemKey": "mintSeed",
          "quantity": 348,
          "type": "summon"
        }
      ]
    },
    {
      "level": 83,
      "completionCostCoin": 68890,
      "tasks": [
        {
          "id": "level83-summon-wormwood-seed",
          "itemKey": "wormwoodSeed",
          "quantity": 298,
          "type": "summon"
        },
        {
          "id": "level83-grow-wormwood-herb",
          "itemKey": "wormwoodHerb",
          "quantity": 110,
          "type": "grow"
        },
        {
          "id": "level83-turn-in-wormwood-herb",
          "itemKey": "wormwoodHerb",
          "quantity": 83
        },
        {
          "id": "level83-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 30,
          "type": "brew"
        },
        {
          "id": "level83-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 23
        }
      ]
    },
    {
      "level": 84,
      "completionCostCoin": 70560,
      "tasks": [
        {
          "id": "level84-research-valerian-rest",
          "type": "research",
          "researchId": "unlockRecipe:valerianRest",
          "itemKey": "valerianRest",
          "quantity": 1
        },
        {
          "id": "level84-brew-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 55,
          "type": "brew"
        },
        {
          "id": "level84-turn-in-nettle-vigor",
          "itemKey": "nettleVigor",
          "quantity": 42
        },
        {
          "id": "level84-sell-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 115,
          "type": "sell"
        },
        {
          "id": "level84-summon-wormwood-seed",
          "itemKey": "wormwoodSeed",
          "quantity": 553,
          "type": "summon"
        }
      ]
    },
    {
      "level": 85,
      "completionCostCoin": 72250,
      "tasks": [
        {
          "id": "level85-brew-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 79,
          "type": "brew"
        },
        {
          "id": "level85-turn-in-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 60
        },
        {
          "id": "level85-research-snowdrop-seed",
          "type": "research",
          "researchId": "unlockSeed:snowdropSeed",
          "itemKey": "snowdropSeed",
          "quantity": 1
        },
        {
          "id": "level85-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 79,
          "type": "brew"
        },
        {
          "id": "level85-sell-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 165,
          "type": "sell"
        }
      ]
    },
    {
      "level": 86,
      "completionCostCoin": 73960,
      "tasks": [
        {
          "id": "level86-summon-snowdrop-seed",
          "itemKey": "snowdropSeed",
          "quantity": 583,
          "type": "summon"
        },
        {
          "id": "level86-grow-snowdrop-herb",
          "itemKey": "snowdropHerb",
          "quantity": 215,
          "type": "grow"
        },
        {
          "id": "level86-turn-in-snowdrop-herb",
          "itemKey": "snowdropHerb",
          "quantity": 158
        },
        {
          "id": "level86-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 57,
          "type": "brew"
        },
        {
          "id": "level86-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 43
        }
      ]
    },
    {
      "level": 87,
      "completionCostCoin": 75690,
      "tasks": [
        {
          "id": "level87-research-comfrey-balm",
          "type": "research",
          "researchId": "unlockRecipe:comfreyBalm",
          "itemKey": "comfreyBalm",
          "quantity": 1
        },
        {
          "id": "level87-brew-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 111,
          "type": "brew"
        },
        {
          "id": "level87-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 85
        },
        {
          "id": "level87-sell-nightshade-herb",
          "itemKey": "nightshadeHerb",
          "quantity": 221,
          "type": "sell"
        },
        {
          "id": "level87-summon-wormwood-seed",
          "itemKey": "wormwoodSeed",
          "quantity": 1047,
          "type": "summon"
        }
      ]
    },
    {
      "level": 88,
      "completionCostCoin": 77440,
      "tasks": [
        {
          "id": "level88-brew-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 134,
          "type": "brew"
        },
        {
          "id": "level88-turn-in-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 103
        },
        {
          "id": "level88-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 134,
          "type": "brew"
        },
        {
          "id": "level88-turn-in-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 103
        },
        {
          "id": "level88-sell-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 267,
          "type": "sell"
        }
      ]
    },
    {
      "level": 89,
      "completionCostCoin": 79210,
      "tasks": [
        {
          "id": "level89-research-pearlroot-seed",
          "type": "research",
          "researchId": "unlockSeed:pearlrootSeed",
          "itemKey": "pearlrootSeed",
          "quantity": 1
        },
        {
          "id": "level89-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 157,
          "type": "brew"
        },
        {
          "id": "level89-turn-in-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 120
        },
        {
          "id": "level89-sell-wormwood-herb",
          "itemKey": "wormwoodHerb",
          "quantity": 313,
          "type": "sell"
        },
        {
          "id": "level89-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 1517,
          "type": "summon"
        }
      ]
    },
    {
      "level": 90,
      "completionCostCoin": 81000,
      "tasks": [
        {
          "id": "level90-summon-pearlroot-seed",
          "itemKey": "pearlrootSeed",
          "quantity": 205,
          "type": "summon"
        },
        {
          "id": "level90-grow-pearlroot-herb",
          "itemKey": "pearlrootHerb",
          "quantity": 76,
          "type": "grow"
        },
        {
          "id": "level90-turn-in-pearlroot-herb",
          "itemKey": "pearlrootHerb",
          "quantity": 56
        },
        {
          "id": "level90-brew-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 21,
          "type": "brew"
        },
        {
          "id": "level90-turn-in-mana-tonic",
          "itemKey": "manaTonic",
          "quantity": 16
        }
      ]
    },
    {
      "level": 91,
      "completionCostCoin": 82810,
      "tasks": [
        {
          "id": "level91-research-nightshade-veil",
          "type": "research",
          "researchId": "unlockRecipe:nightshadeVeil",
          "itemKey": "nightshadeVeil",
          "quantity": 1
        },
        {
          "id": "level91-brew-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 36,
          "type": "brew"
        },
        {
          "id": "level91-turn-in-minor-healing-potion",
          "itemKey": "minorHealingPotion",
          "quantity": 28
        },
        {
          "id": "level91-sell-belladonna-herb",
          "itemKey": "belladonnaHerb",
          "quantity": 76,
          "type": "sell"
        },
        {
          "id": "level91-summon-snowdrop-seed",
          "itemKey": "snowdropSeed",
          "quantity": 364,
          "type": "summon"
        }
      ]
    },
    {
      "level": 92,
      "completionCostCoin": 84640,
      "tasks": [
        {
          "id": "level92-brew-nightshade-veil",
          "itemKey": "nightshadeVeil",
          "quantity": 45,
          "type": "brew"
        },
        {
          "id": "level92-turn-in-nightshade-veil",
          "itemKey": "nightshadeVeil",
          "quantity": 35
        },
        {
          "id": "level92-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 45,
          "type": "brew"
        },
        {
          "id": "level92-turn-in-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 35
        },
        {
          "id": "level92-sell-wormwood-herb",
          "itemKey": "wormwoodHerb",
          "quantity": 97,
          "type": "sell"
        }
      ]
    },
    {
      "level": 93,
      "completionCostCoin": 86490,
      "tasks": [
        {
          "id": "level93-research-belladonna-sight",
          "type": "research",
          "researchId": "unlockRecipe:belladonnaSight",
          "itemKey": "belladonnaSight",
          "quantity": 1
        },
        {
          "id": "level93-brew-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 55,
          "type": "brew"
        },
        {
          "id": "level93-turn-in-nightshade-veil",
          "itemKey": "nightshadeVeil",
          "quantity": 42
        },
        {
          "id": "level93-sell-snowdrop-herb",
          "itemKey": "snowdropHerb",
          "quantity": 118,
          "type": "sell"
        },
        {
          "id": "level93-summon-sage-seed",
          "itemKey": "sageSeed",
          "quantity": 560,
          "type": "summon"
        }
      ]
    },
    {
      "level": 94,
      "completionCostCoin": 88360,
      "tasks": [
        {
          "id": "level94-brew-belladonna-sight",
          "itemKey": "belladonnaSight",
          "quantity": 71,
          "type": "brew"
        },
        {
          "id": "level94-turn-in-belladonna-sight",
          "itemKey": "belladonnaSight",
          "quantity": 56
        },
        {
          "id": "level94-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 71,
          "type": "brew"
        },
        {
          "id": "level94-turn-in-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 56
        },
        {
          "id": "level94-sell-pearlroot-herb",
          "itemKey": "pearlrootHerb",
          "quantity": 143,
          "type": "sell"
        }
      ]
    },
    {
      "level": 95,
      "completionCostCoin": 90250,
      "tasks": [
        {
          "id": "level95-research-wormwood-purge",
          "type": "research",
          "researchId": "unlockRecipe:wormwoodPurge",
          "itemKey": "wormwoodPurge",
          "quantity": 1
        },
        {
          "id": "level95-brew-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 88,
          "type": "brew"
        },
        {
          "id": "level95-turn-in-comfrey-balm",
          "itemKey": "comfreyBalm",
          "quantity": 69
        },
        {
          "id": "level95-sell-sage-herb",
          "itemKey": "sageHerb",
          "quantity": 176,
          "type": "sell"
        },
        {
          "id": "level95-summon-nettle-seed",
          "itemKey": "nettleSeed",
          "quantity": 849,
          "type": "summon"
        }
      ]
    },
    {
      "level": 96,
      "completionCostCoin": 92160,
      "tasks": [
        {
          "id": "level96-brew-wormwood-purge",
          "itemKey": "wormwoodPurge",
          "quantity": 111,
          "type": "brew"
        },
        {
          "id": "level96-turn-in-wormwood-purge",
          "itemKey": "wormwoodPurge",
          "quantity": 87
        },
        {
          "id": "level96-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 111,
          "type": "brew"
        },
        {
          "id": "level96-turn-in-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 87
        },
        {
          "id": "level96-sell-mint-herb",
          "itemKey": "mintHerb",
          "quantity": 222,
          "type": "sell"
        }
      ]
    },
    {
      "level": 97,
      "completionCostCoin": 94090,
      "tasks": [
        {
          "id": "level97-research-snowdrop-breath",
          "type": "research",
          "researchId": "unlockRecipe:snowdropBreath",
          "itemKey": "snowdropBreath",
          "quantity": 1
        },
        {
          "id": "level97-brew-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 135,
          "type": "brew"
        },
        {
          "id": "level97-turn-in-valerian-rest",
          "itemKey": "valerianRest",
          "quantity": 106
        },
        {
          "id": "level97-sell-nettle-herb",
          "itemKey": "nettleHerb",
          "quantity": 280,
          "type": "sell"
        },
        {
          "id": "level97-summon-briar-seed",
          "itemKey": "briarSeed",
          "quantity": 1324,
          "type": "summon"
        }
      ]
    },
    {
      "level": 98,
      "completionCostCoin": 96040,
      "tasks": [
        {
          "id": "level98-brew-snowdrop-breath",
          "itemKey": "snowdropBreath",
          "quantity": 165,
          "type": "brew"
        },
        {
          "id": "level98-turn-in-snowdrop-breath",
          "itemKey": "snowdropBreath",
          "quantity": 130
        },
        {
          "id": "level98-brew-dragon-courage",
          "itemKey": "dragonCourage",
          "quantity": 165,
          "type": "brew"
        },
        {
          "id": "level98-turn-in-yarrow-poultice",
          "itemKey": "yarrowPoultice",
          "quantity": 130
        },
        {
          "id": "level98-sell-lavender-herb",
          "itemKey": "lavenderHerb",
          "quantity": 343,
          "type": "sell"
        }
      ]
    },
    {
      "level": 99,
      "completionCostCoin": 98010,
      "tasks": [
        {
          "id": "level99-research-pearlroot-draught",
          "type": "research",
          "researchId": "unlockRecipe:pearlrootDraught",
          "itemKey": "pearlrootDraught",
          "quantity": 1
        },
        {
          "id": "level99-brew-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 191,
          "type": "brew"
        },
        {
          "id": "level99-turn-in-hyssop-clarity",
          "itemKey": "hyssopClarity",
          "quantity": 150
        },
        {
          "id": "level99-sell-briar-herb",
          "itemKey": "briarHerb",
          "quantity": 397,
          "type": "sell"
        },
        {
          "id": "level99-summon-mandrake-seed",
          "itemKey": "mandrakeSeed",
          "quantity": 1915,
          "type": "summon"
        }
      ]
    },
    {
      "level": 100,
      "completionCostCoin": 100000,
      "tasks": [
        {
          "id": "level100-brew-pearlroot-draught",
          "itemKey": "pearlrootDraught",
          "quantity": 175,
          "type": "brew"
        },
        {
          "id": "level100-turn-in-pearlroot-draught",
          "itemKey": "pearlrootDraught",
          "quantity": 138
        },
        {
          "id": "level100-brew-pact-ward",
          "itemKey": "pactWard",
          "quantity": 175,
          "type": "brew"
        },
        {
          "id": "level100-turn-in-silverleaf-salve",
          "itemKey": "silverleafSalve",
          "quantity": 138
        },
        {
          "id": "level100-sell-glowcap-herb",
          "itemKey": "glowcapHerb",
          "quantity": 362,
          "type": "sell"
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
    "manaPerSecondPerLevelRanges": PLAYER_LEVEL_MANA_PER_SECOND_PER_LEVEL_RANGES
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
      "maxCauldrons": 2,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 8,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 2,
      "maxPlayerMarketStands": 2
    },
    {
      "level": 10,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 3,
      "maxPlayerMarketStands": 3
    },
    {
      "level": 13,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 4,
      "maxPlayerMarketStands": 4
    },
    {
      "level": 17,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    },
    {
      "level": 21,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    },
    {
      "level": 25,
      "maxGardenTiles": 5,
      "maxCauldrons": 2,
      "maxNpcMarketStands": 5,
      "maxPlayerMarketStands": 5
    }
  ]
});
const LEGACY_PLAYER_LEVEL_CAPS_BY_LEVEL = new Map<number, {
  maxGardenTiles: number;
  maxCauldrons: number;
}>([
  [1, { maxGardenTiles: 2, maxCauldrons: 1 }],
  [2, { maxGardenTiles: 3, maxCauldrons: 1 }],
  [3, { maxGardenTiles: 3, maxCauldrons: 1 }],
  [4, { maxGardenTiles: 3, maxCauldrons: 1 }],
  [5, { maxGardenTiles: 5, maxCauldrons: 3 }],
  [8, { maxGardenTiles: 7, maxCauldrons: 3 }],
  [10, { maxGardenTiles: 8, maxCauldrons: 3 }],
  [13, { maxGardenTiles: 9, maxCauldrons: 3 }],
  [17, { maxGardenTiles: 10, maxCauldrons: 3 }],
  [21, { maxGardenTiles: 10, maxCauldrons: 4 }],
  [25, { maxGardenTiles: 10, maxCauldrons: 5 }],
]);

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
  { key: 'silverleaf', label: 'silverleaf', growthDurationMs: 240_000 },
  { key: 'yarrow', label: 'yarrow', growthDurationMs: 270_000 },
  { key: 'hyssop', label: 'hyssop', growthDurationMs: 300_000 },
  { key: 'valerian', label: 'valerian', growthDurationMs: 330_000 },
  { key: 'comfrey', label: 'comfrey', growthDurationMs: 360_000 },
  { key: 'nightshade', label: 'nightshade', growthDurationMs: 390_000 },
  { key: 'belladonna', label: 'belladonna', growthDurationMs: 420_000 },
  { key: 'wormwood', label: 'wormwood', growthDurationMs: 450_000 },
  { key: 'snowdrop', label: 'snowdrop', growthDurationMs: 480_000 },
  { key: 'pearlroot', label: 'pearlroot', growthDurationMs: 520_000 },
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

const extraKnownPotionCatalog = [
  { key: 'silverleafSalve', label: 'silverleaf salve' },
  { key: 'yarrowPoultice', label: 'yarrow poultice' },
  { key: 'hyssopClarity', label: 'hyssop clarity' },
  { key: 'valerianRest', label: 'valerian rest' },
  { key: 'comfreyBalm', label: 'comfrey balm' },
  { key: 'nightshadeVeil', label: 'nightshade veil' },
  { key: 'belladonnaSight', label: 'belladonna sight' },
  { key: 'wormwoodPurge', label: 'wormwood purge' },
  { key: 'snowdropBreath', label: 'snowdrop breath' },
  { key: 'pearlrootDraught', label: 'pearlroot draught' },
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
  'silverleafSalve',
  'yarrowPoultice',
  'hyssopClarity',
  'valerianRest',
  'comfreyBalm',
  'nightshadeVeil',
  'belladonnaSight',
  'wormwoodPurge',
  'snowdropBreath',
  'pearlrootDraught',
];

const knownPotionCatalogByKey = new Map(
  [...knownPotionCatalog, ...extraKnownPotionCatalog].map((potion) => [
    potion.key,
    potion,
  ]),
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
  silverleaf: 80,
  yarrow: 95,
  hyssop: 115,
  valerian: 140,
  comfrey: 165,
  nightshade: 200,
  belladonna: 240,
  wormwood: 285,
  snowdrop: 345,
  pearlroot: 410,
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
  silverleafSalve: 425,
  yarrowPoultice: 460,
  hyssopClarity: 500,
  valerianRest: 545,
  comfreyBalm: 595,
  nightshadeVeil: 650,
  belladonnaSight: 710,
  wormwoodPurge: 775,
  snowdropBreath: 845,
  pearlrootDraught: 925,
};

const MAX_AUTOMATION_GARDEN_TILES = 12;
const MAX_AUTOMATION_CAULDRONS = 5;

function getAutomationDefaultCostGoldById(): Record<string, bigint> {
  const costs: Record<string, bigint> = {};

  for (let tileNumber = 1; tileNumber <= MAX_AUTOMATION_GARDEN_TILES; tileNumber += 1) {
    costs[`automation:autoPlantTile:${tileNumber}`] = BigInt(tileNumber);
    costs[`automation:autoHarvestPlant:${tileNumber}`] = BigInt(tileNumber);
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= MAX_AUTOMATION_CAULDRONS;
    cauldronNumber += 1
  ) {
    const cost = BigInt(cauldronNumber);
    costs[`automation:autoBrewCauldron:${cauldronNumber}`] = cost;
    costs[`automation:autoBottleCauldron:${cauldronNumber}`] = cost;
    costs[`automation:autoCollectCauldron:${cauldronNumber}`] = cost;
  }

  return costs;
}

function getAutomationDefaultCostCrystalById(): Record<string, number> {
  const costs: Record<string, number> = {
    'automation:autoSeedSpawn': 10,
  };

  for (let tileNumber = 1; tileNumber <= MAX_AUTOMATION_GARDEN_TILES; tileNumber += 1) {
    costs[`automation:autoPlantTile:${tileNumber}`] = tileNumber;
    costs[`automation:autoHarvestPlant:${tileNumber}`] = tileNumber;
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= MAX_AUTOMATION_CAULDRONS;
    cauldronNumber += 1
  ) {
    costs[`automation:autoBrewCauldron:${cauldronNumber}`] = cauldronNumber;
    costs[`automation:autoBottleCauldron:${cauldronNumber}`] = cauldronNumber;
    costs[`automation:autoCollectCauldron:${cauldronNumber}`] = cauldronNumber;
  }

  return costs;
}

const researchDefaultCostGoldById: Record<string, bigint> = {
  'unlockSeed:sageSeed': 0n,
  'unlockSeed:mintSeed': 0n,
  'unlockSeed:nettleSeed': 40n,
  'unlockSeed:lavenderSeed': 80n,
  'unlockSeed:briarSeed': 130n,
  'unlockSeed:glowcapSeed': 200n,
  'unlockSeed:mandrakeSeed': 2_100n,
  'unlockSeed:sunrootSeed': 3_400n,
  'unlockSeed:moonflowerSeed': 5_200n,
  'unlockSeed:frostmossSeed': 7_600n,
  'unlockSeed:dreambellSeed': 11_000n,
  'unlockSeed:starAniseSeed': 15_500n,
  'unlockSeed:bloodroseSeed': 22_000n,
  'unlockSeed:dragonpepperSeed': 32_000n,
  'unlockSeed:silverleafSeed': 45_000n,
  'unlockSeed:yarrowSeed': 63_000n,
  'unlockSeed:hyssopSeed': 88_000n,
  'unlockSeed:valerianSeed': 123_000n,
  'unlockSeed:comfreySeed': 172_000n,
  'unlockSeed:nightshadeSeed': 240_000n,
  'unlockSeed:belladonnaSeed': 335_000n,
  'unlockSeed:wormwoodSeed': 470_000n,
  'unlockSeed:snowdropSeed': 660_000n,
  'unlockSeed:pearlrootSeed': 925_000n,
  'summonSeedsX2': 600n,
  'summonSeedsX3': 1_800n,
  'summonSeedsX4': 4_500n,
  'summonSeedsX5': 10_000n,
  'unlockRecipe:manaTonic': 0n,
  'unlockRecipe:minorHealingPotion': 60n,
  'unlockRecipe:nettleVigor': 100n,
  'unlockRecipe:calmingDraught': 160n,
  'unlockRecipe:briarWard': 220n,
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
  'unlockRecipe:silverleafSalve': 150_000n,
  'unlockRecipe:yarrowPoultice': 195_000n,
  'unlockRecipe:hyssopClarity': 255_000n,
  'unlockRecipe:valerianRest': 335_000n,
  'unlockRecipe:comfreyBalm': 440_000n,
  'unlockRecipe:nightshadeVeil': 580_000n,
  'unlockRecipe:belladonnaSight': 765_000n,
  'unlockRecipe:wormwoodPurge': 1_000_000n,
  'unlockRecipe:snowdropBreath': 1_300_000n,
  'unlockRecipe:pearlrootDraught': 1_700_000n,
  ...getAutomationDefaultCostGoldById(),
};

const ADVANCED_RESEARCH_MAX_LEVEL = 12;
const FAST_SELL_RESEARCH_MAX_LEVEL = 3;
const RESEARCH_TIME_REDUCTION_MAX_LEVEL = 8;
const RESEARCH_COST_REDUCTION_MAX_LEVEL = 8;
const AUTOMATION_RESERVE_RESEARCH_MAX_LEVEL = 3;
const AUTOMATION_RESERVE_REQUIRED_PRESTIGE_COUNT = 4;
const STRONGER_ROOM_STUDY_REQUIRED_PRESTIGE_COUNT = 5;
const fastSellResearchCostsRuby = [2, 5, 10];
const advancedResearchCauldronNumbers = Array.from(
  { length: MAX_AUTOMATION_CAULDRONS },
  (_value, index) => index + 1,
);
const advancedResearchPlotNumbers = Array.from(
  { length: MAX_AUTOMATION_GARDEN_TILES },
  (_value, index) => index + 1,
);
const plotCapacityResearchNumbers = [6, 7, 8, 9, 10, 11, 12];
const cauldronCapacityResearchNumbers = [3, 4, 5];
const emeraldResearchMultipliers = [2, 3, 4, 5];

function getAdvancedResearchCostById(): Record<string, number> {
  const costs: Record<string, number> = {};

  for (let level = 1; level <= FAST_SELL_RESEARCH_MAX_LEVEL; level += 1) {
    costs[`fastSellPayout:${level}`] = fastSellResearchCostsRuby[level - 1] ?? 0;
  }

  for (let level = 1; level <= RESEARCH_TIME_REDUCTION_MAX_LEVEL; level += 1) {
    costs[`advanced:researchTime:${level}`] = level;
  }

  for (let level = 1; level <= RESEARCH_COST_REDUCTION_MAX_LEVEL; level += 1) {
    costs[`emerald:researchCost:${level}`] = level;
  }

  for (let level = 1; level <= AUTOMATION_RESERVE_RESEARCH_MAX_LEVEL; level += 1) {
    costs[`advanced:automationReserve:${level}`] = level;
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

  for (const plotNumber of plotCapacityResearchNumbers) {
    costs[`advanced:plotCapacity:${plotNumber}`] = 1;
  }

  for (const cauldronNumber of cauldronCapacityResearchNumbers) {
    costs[`advanced:cauldronCapacity:${cauldronNumber}`] = 1;
  }

  return costs;
}

function getEmeraldResearchCost(multiplier: number): number {
  const firstMultiplier = emeraldResearchMultipliers[0] ?? 2;
  const safeMultiplier = Math.max(
    firstMultiplier,
    Math.floor(Number(multiplier) || firstMultiplier),
  );

  return 2 ** (safeMultiplier - firstMultiplier + 1);
}

function getEmeraldResearchCostById(): Record<string, number> {
  const costs: Record<string, number> = {};

  for (const plotNumber of advancedResearchPlotNumbers) {
    for (const multiplier of emeraldResearchMultipliers) {
      costs[`emerald:plotPlanting:${plotNumber}:${multiplier}`] =
        getEmeraldResearchCost(multiplier);
    }
  }

  for (const cauldronNumber of advancedResearchCauldronNumbers) {
    for (const multiplier of emeraldResearchMultipliers) {
      costs[`emerald:cauldronBrewing:${cauldronNumber}:${multiplier}`] =
        getEmeraldResearchCost(multiplier);
    }
  }

  return costs;
}

const researchDefaultCostCrystalById: Record<string, number> =
  getEmeraldResearchCostById();
const researchDefaultCostRubyById: Record<string, number> =
  getAutomationDefaultCostCrystalById();
const researchDefaultCostEmeraldById: Record<string, number> =
  getAdvancedResearchCostById();

function getLegacyEmeraldResearchCostById(): Record<string, readonly bigint[]> {
  const costs: Record<string, readonly bigint[]> = {};

  for (const plotNumber of advancedResearchPlotNumbers) {
    for (const multiplier of emeraldResearchMultipliers) {
      costs[`emerald:plotPlanting:${plotNumber}:${multiplier}`] = [
        BigInt(plotNumber * Math.max(1, multiplier - 1)),
        BigInt(multiplier - (emeraldResearchMultipliers[0] ?? 2) + 1),
      ];
    }
  }

  for (const cauldronNumber of advancedResearchCauldronNumbers) {
    for (const multiplier of emeraldResearchMultipliers) {
      costs[`emerald:cauldronBrewing:${cauldronNumber}:${multiplier}`] = [
        BigInt(cauldronNumber * Math.max(1, multiplier - 1)),
        BigInt(multiplier - (emeraldResearchMultipliers[0] ?? 2) + 1),
      ];
    }
  }

  return costs;
}

const researchLegacyCostEmeraldById: Record<string, readonly bigint[]> =
  getLegacyEmeraldResearchCostById();

const researchCurrencyCostIds = new Set([
  ...Object.keys(researchDefaultCostCrystalById),
  ...Object.keys(researchDefaultCostRubyById),
  ...Object.keys(researchDefaultCostEmeraldById),
]);

const QUICK_RESEARCH_DURATION_SECONDS = 3n;
const DEFAULT_RESEARCH_DURATION_SECONDS = 10n * 60n;

const seedResearchDurationSecondsById: Record<string, bigint> = {
  'unlockSeed:sageSeed': QUICK_RESEARCH_DURATION_SECONDS,
  'unlockSeed:mintSeed': 60n,
  'unlockSeed:nettleSeed': 2n * 60n,
  'unlockSeed:lavenderSeed': 3n * 60n,
  'unlockSeed:briarSeed': 4n * 60n,
  'unlockSeed:glowcapSeed': 5n * 60n,
  'unlockSeed:mandrakeSeed': 15n * 60n,
  'unlockSeed:sunrootSeed': 18n * 60n,
  'unlockSeed:moonflowerSeed': 22n * 60n,
  'unlockSeed:frostmossSeed': 26n * 60n,
  'unlockSeed:dreambellSeed': 30n * 60n,
  'unlockSeed:starAniseSeed': 35n * 60n,
  'unlockSeed:bloodroseSeed': 40n * 60n,
  'unlockSeed:dragonpepperSeed': 45n * 60n,
  'unlockSeed:silverleafSeed': 50n * 60n,
  'unlockSeed:yarrowSeed': 60n * 60n,
  'unlockSeed:hyssopSeed': 70n * 60n,
  'unlockSeed:valerianSeed': 80n * 60n,
  'unlockSeed:comfreySeed': 90n * 60n,
  'unlockSeed:nightshadeSeed': 100n * 60n,
  'unlockSeed:belladonnaSeed': 110n * 60n,
  'unlockSeed:wormwoodSeed': 120n * 60n,
  'unlockSeed:snowdropSeed': 135n * 60n,
  'unlockSeed:pearlrootSeed': 150n * 60n,
};

const recipeResearchDurationSecondsById: Record<string, bigint> = {
  'unlockRecipe:manaTonic': 10n,
  'unlockRecipe:minorHealingPotion': 2n * 60n,
  'unlockRecipe:nettleVigor': 3n * 60n,
  'unlockRecipe:calmingDraught': 4n * 60n,
  'unlockRecipe:briarWard': 5n * 60n,
  'unlockRecipe:lanternTonic': 15n * 60n,
  'unlockRecipe:simpleAntidote': 18n * 60n,
  'unlockRecipe:venomDraught': 22n * 60n,
  'unlockRecipe:healingPotion': 26n * 60n,
  'unlockRecipe:sunrootStamina': 30n * 60n,
  'unlockRecipe:moonlitFocus': 35n * 60n,
  'unlockRecipe:frostmossCleanse': 40n * 60n,
  'unlockRecipe:sleepDraught': 45n * 60n,
  'unlockRecipe:elixirOfLife': 50n * 60n,
  'unlockRecipe:starLuckPhiltre': 60n * 60n,
  'unlockRecipe:deepDreamVision': 70n * 60n,
  'unlockRecipe:pactWard': 80n * 60n,
  'unlockRecipe:dragonCourage': 90n * 60n,
  'unlockRecipe:silverleafSalve': 100n * 60n,
  'unlockRecipe:yarrowPoultice': 110n * 60n,
  'unlockRecipe:hyssopClarity': 120n * 60n,
  'unlockRecipe:valerianRest': 135n * 60n,
  'unlockRecipe:comfreyBalm': 150n * 60n,
  'unlockRecipe:nightshadeVeil': 165n * 60n,
  'unlockRecipe:belladonnaSight': 180n * 60n,
  'unlockRecipe:wormwoodPurge': 195n * 60n,
  'unlockRecipe:snowdropBreath': 210n * 60n,
  'unlockRecipe:pearlrootDraught': 240n * 60n,
};

const researchLegacyDurationOverrideSecondsById: Record<string, bigint> = {
  'unlockSeed:mintSeed': 15n,
  'unlockRecipe:manaTonic': 60n,
};

const researchLegacyCostGoldById: Record<string, readonly bigint[]> = {
  'unlockRecipe:manaTonic': [150n, 80n],
};

const researchLegacyDurationSecondsById: Record<string, bigint> = {
  'unlockRecipe:manaTonic': 600n,
};

const researchAdditionalLegacyDurationSecondsById: Record<string, readonly bigint[]> = {
  'unlockRecipe:manaTonic': [300n],
};

const orderedResearchDurationIds = [
  ...Object.keys(researchDefaultCostGoldById),
  ...Object.keys(researchDefaultCostCrystalById).filter(
    (researchId) => researchDefaultCostGoldById[researchId] === undefined,
  ),
  ...Object.keys(researchDefaultCostRubyById).filter(
    (researchId) =>
      researchDefaultCostGoldById[researchId] === undefined &&
      researchDefaultCostCrystalById[researchId] === undefined,
  ),
  ...Object.keys(researchDefaultCostEmeraldById).filter(
    (researchId) =>
      researchDefaultCostGoldById[researchId] === undefined &&
      researchDefaultCostCrystalById[researchId] === undefined &&
      researchDefaultCostRubyById[researchId] === undefined,
  ),
];

const researchLegacyDefaultDurationSecondsById: Record<string, bigint> = {
  ...(Object.fromEntries(
    orderedResearchDurationIds.map((researchId, index) => [
      researchId,
      getLegacyDefaultResearchDurationSeconds(index),
    ]),
  ) as Record<string, bigint>),
  ...researchLegacyDurationOverrideSecondsById,
};

const researchDefaultDurationSecondsById: Record<string, bigint> = Object.fromEntries(
  orderedResearchDurationIds.map((researchId) => [
    researchId,
    getDefaultResearchDurationSeconds(researchId),
  ]),
) as Record<string, bigint>;

function getLegacyDefaultResearchDurationSeconds(index: number): bigint {
  if (index === 0) {
    return QUICK_RESEARCH_DURATION_SECONDS;
  }

  if (index === 1) {
    return 60n;
  }

  return BigInt(Math.min(10 * 60, 300 + Math.max(0, index - 2) * 300));
}

function getDefaultResearchDurationSeconds(researchId: string): bigint {
  if (
    researchDefaultCostCrystalById[researchId] !== undefined ||
    researchDefaultCostRubyById[researchId] !== undefined ||
    researchDefaultCostEmeraldById[researchId] !== undefined
  ) {
    return QUICK_RESEARCH_DURATION_SECONDS;
  }

  if (seedResearchDurationSecondsById[researchId] !== undefined) {
    return seedResearchDurationSecondsById[researchId];
  }

  if (recipeResearchDurationSecondsById[researchId] !== undefined) {
    return recipeResearchDurationSecondsById[researchId];
  }

  return DEFAULT_RESEARCH_DURATION_SECONDS;
}

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'wasted potion', basePriceGold: 1 },
  ...extraKnownPotionCatalog,
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
    potionKey: 'silverleafSalve',
    manaCost: 70,
    brewDurationMs: 150_000,
    ingredients: [
      { itemKey: 'silverleafHerb', quantity: 2 },
      { itemKey: 'sageHerb', quantity: 1 },
      { itemKey: 'comfreyHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'yarrowPoultice',
    manaCost: 72,
    brewDurationMs: 155_000,
    ingredients: [
      { itemKey: 'yarrowHerb', quantity: 2 },
      { itemKey: 'mintHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'hyssopClarity',
    manaCost: 76,
    brewDurationMs: 165_000,
    ingredients: [
      { itemKey: 'hyssopHerb', quantity: 2 },
      { itemKey: 'moonflowerHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'valerianRest',
    manaCost: 80,
    brewDurationMs: 175_000,
    ingredients: [
      { itemKey: 'valerianHerb', quantity: 2 },
      { itemKey: 'dreambellHerb', quantity: 1 },
      { itemKey: 'lavenderHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'comfreyBalm',
    manaCost: 84,
    brewDurationMs: 185_000,
    ingredients: [
      { itemKey: 'comfreyHerb', quantity: 2 },
      { itemKey: 'sunrootHerb', quantity: 1 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'nightshadeVeil',
    manaCost: 90,
    brewDurationMs: 200_000,
    ingredients: [
      { itemKey: 'nightshadeHerb', quantity: 1 },
      { itemKey: 'frostmossHerb', quantity: 1 },
      { itemKey: 'bloodroseHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'belladonnaSight',
    manaCost: 96,
    brewDurationMs: 215_000,
    ingredients: [
      { itemKey: 'belladonnaHerb', quantity: 1 },
      { itemKey: 'starAniseHerb', quantity: 1 },
      { itemKey: 'glowcapHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'wormwoodPurge',
    manaCost: 102,
    brewDurationMs: 230_000,
    ingredients: [
      { itemKey: 'wormwoodHerb', quantity: 1 },
      { itemKey: 'nettleHerb', quantity: 2 },
      { itemKey: 'frostmossHerb', quantity: 1 },
    ],
  },
  {
    potionKey: 'snowdropBreath',
    manaCost: 110,
    brewDurationMs: 245_000,
    ingredients: [
      { itemKey: 'snowdropHerb', quantity: 1 },
      { itemKey: 'silverleafHerb', quantity: 1 },
      { itemKey: 'moonflowerHerb', quantity: 2 },
    ],
  },
  {
    potionKey: 'pearlrootDraught',
    manaCost: 120,
    brewDurationMs: 270_000,
    ingredients: [
      { itemKey: 'pearlrootHerb', quantity: 1 },
      { itemKey: 'dragonpepperHerb', quantity: 1 },
      { itemKey: 'belladonnaHerb', quantity: 1 },
      { itemKey: 'sunrootHerb', quantity: 1 },
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

const automationGardenTileNumbers = Array.from(
  { length: MAX_AUTOMATION_GARDEN_TILES },
  (_value, index) => index + 1,
);
const automationCauldronNumbers = Array.from(
  { length: MAX_AUTOMATION_CAULDRONS },
  (_value, index) => index + 1,
);
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
  ...Array.from({ length: RESEARCH_COST_REDUCTION_MAX_LEVEL }, (_value, index) => {
    const level = index + 1;
    return {
      id: `emerald:researchCost:${level}`,
      label: `research cost lvl ${level}`,
      groupId: 'researchCost',
    };
  }),
  ...Array.from({ length: RESEARCH_TIME_REDUCTION_MAX_LEVEL }, (_value, index) => {
    const level = index + 1;
    return {
      id: `advanced:researchTime:${level}`,
      label: `research time lvl ${level}`,
      groupId: 'researchTime',
    };
  }),
  ...Array.from({ length: AUTOMATION_RESERVE_RESEARCH_MAX_LEVEL }, (_value, index) => {
    const level = index + 1;
    return {
      id: `advanced:automationReserve:${level}`,
      label: `automation reserve lvl ${level}`,
      groupId: 'automationReserve',
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
  ...plotCapacityResearchNumbers.map((plotNumber) => ({
    id: `advanced:plotCapacity:${plotNumber}`,
    label: `plot ${plotNumber} capacity`,
    groupId: 'plotCapacity',
  })),
  ...cauldronCapacityResearchNumbers.map((cauldronNumber) => ({
    id: `advanced:cauldronCapacity:${cauldronNumber}`,
    label: `cauldron ${cauldronNumber} capacity`,
    groupId: 'cauldronCapacity',
  })),
];

const emeraldResearchCatalog = [
  ...advancedResearchPlotNumbers.flatMap((plotNumber) =>
    emeraldResearchMultipliers.map((multiplier) => ({
      id: `emerald:plotPlanting:${plotNumber}:${multiplier}`,
      label: `plot ${plotNumber} lvl ${multiplier}`,
      groupId: 'plotPlanting',
    })),
  ),
  ...advancedResearchCauldronNumbers.flatMap((cauldronNumber) =>
    emeraldResearchMultipliers.map((multiplier) => ({
      id: `emerald:cauldronBrewing:${cauldronNumber}:${multiplier}`,
      label: `cauldron ${cauldronNumber} lvl ${multiplier}`,
      groupId: 'cauldronBrewing',
    })),
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
  ...emeraldResearchCatalog.map((research) => ({
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

function normalizeResearchCurrencyCostRecord(
  defaults: Record<string, number>,
  currentCosts: Record<string, unknown>,
  legacyCosts: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [researchId, cost] of Object.entries(currentCosts)) {
    if (!researchCurrencyCostIds.has(researchId)) {
      normalized[researchId] = cost;
    }
  }

  for (const [researchId, defaultCost] of Object.entries(defaults)) {
    normalized[researchId] =
      currentCosts[researchId] ?? legacyCosts[researchId] ?? defaultCost;
  }

  return normalized;
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
    tileCostsGold: [
      0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800, 7000, 10000,
    ],
    tilesPerRow: 4,
    harvestSeconds: 3,
  },
});
const LEGACY_GARDEN_TILE_COSTS_GOLD_20 = [
  0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800, 7000, 10000, 14000, 19000,
  25000, 32000, 40000, 50000, 62000, 76000,
];
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
  researchCostsEmerald: researchDefaultCostEmeraldById,
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
const LEGACY_BREWING_CAULDRON_COSTS_GOLD_10 = [
  0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800,
];
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
      black: 0,
      midnight: 0,
      witchcraft: 0,
    },
    font: {
      lexend: 0,
      'comic-sans-mono': 0,
    },
    character: {
      elara: 0,
      mira: 0,
      bramble: 0,
      corvin: 0,
      juniper: 0,
      rowan: 0,
      adventurer_blackarmor_sword: 0,
      adventurer_blondshield_guard: 0,
      adventurer_blondsword: 0,
      adventurer_bluebandana: 0,
      adventurer_bluequiver_archer: 0,
      adventurer_bluescarf_spear: 0,
      adventurer_brownhood_archer: 0,
      adventurer_cleric: 0,
      adventurer_furguard: 0,
      adventurer_goldshield_guard: 0,
      adventurer_grayquiver_archer: 0,
      adventurer_greenbow_archer: 0,
      adventurer_greencloak_spear: 0,
      adventurer_greenhood_archer: 0,
      adventurer_greenscarf_dagger: 0,
      adventurer_greenscarf_shield: 0,
      adventurer_headband_furguard: 0,
      adventurer_helmhammer: 0,
      adventurer_hornhelm_axe: 0,
      adventurer_olivehood_archer: 0,
      adventurer_packscout: 0,
      adventurer_plumehelm_sword: 0,
      adventurer_purpleaxe: 0,
      adventurer_redaxe_guard: 0,
      adventurer_redbow_archer: 0,
      adventurer_redplume_sword: 0,
      adventurer_redscarf_sword: 0,
      adventurer_redspearman: 0,
      adventurer_silverhair_spear: 0,
      adventurer_treasurehunter: 0,
    },
    progressBar: {
      regular: 0,
      gradient: 0,
      notched: 0,
    },
    plotView: {
      rows: 0,
      boxes: 0,
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

const worldEventRewardSettlementTick = table(
  {
    name: 'world_event_reward_settlement_tick',
    public: false,
    scheduled: (): any => run_world_event_reward_settlement_tick,
  },
  {
    tickId: t.u64().primaryKey(),
    scheduledAt: t.scheduleAt(),
  },
);

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
      character: t.string().default(DEFAULT_PLAYER_CHARACTER),
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
  worldEventRewardSettlementTick,
  playerInboxMail: table(
    {
      name: 'player_inbox_mail',
      public: false,
      indexes: [
        { accessor: 'byRecipientIdentity', algorithm: 'btree', columns: ['recipientIdentity'] },
        { accessor: 'byCreatedAt', algorithm: 'btree', columns: ['createdAt'] },
        { accessor: 'bySourceKey', algorithm: 'btree', columns: ['sourceKey'] },
      ],
    },
    {
      mailKey: t.string().primaryKey(),
      recipientIdentity: t.identity(),
      sourceType: t.string(),
      sourceKey: t.string(),
      senderLabel: t.string(),
      title: t.string(),
      body: t.string(),
      rewardText: t.string().default(''),
      coinReward: t.u64().default(0n),
      crystalReward: t.u32().default(0),
      rubyReward: t.u32().default(0),
      emeraldReward: t.u32().default(0),
      itemRewardsJson: t.string().default('[]'),
      createdAt: t.timestamp(),
      read: t.bool().default(false),
      rewardCollected: t.bool().default(true),
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
  worldEventLeaderboard: table(
    {
      name: 'world_event_leaderboard',
      public: true,
      indexes: [
        { accessor: 'byIdentity', algorithm: 'btree', columns: ['identity'] },
        { accessor: 'byPeriodKey', algorithm: 'btree', columns: ['periodKey'] },
        { accessor: 'byPoints', algorithm: 'btree', columns: ['points'] },
      ],
    },
    {
      contributionKey: t.string().primaryKey(),
      identity: t.identity(),
      periodKey: t.string(),
      eventId: t.string(),
      username: t.string(),
      points: t.u64(),
      updatedAt: t.timestamp(),
      playerLevel: t.u32().default(DEFAULT_PLAYER_LEVEL),
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
      public: false,
      indexes: [
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
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
      marketId: t.string().default(defaultMarketId),
    },
  ),
  playerShopRequest: table(
    {
      name: 'player_shop_request',
      public: false,
      indexes: [
        { accessor: 'byRequesterIdentity', algorithm: 'btree', columns: ['requesterIdentity'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
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
      marketId: t.string().default(defaultMarketId),
    },
  ),
  playerShopProceeds: table(
    {
      name: 'player_shop_proceeds',
      public: false,
    },
    {
      sellerIdentity: t.identity().primaryKey(),
      gold: t.u64(),
      updatedAt: t.timestamp(),
      goldScale: t.u32().default(1),
    },
  ),
  playerShopMarketProceeds: table(
    {
      name: 'player_shop_market_proceeds',
      public: false,
      indexes: [
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
      ],
    },
    {
      proceedsKey: t.string().primaryKey(),
      sellerIdentity: t.identity(),
      marketId: t.string(),
      gold: t.u64(),
      updatedAt: t.timestamp(),
      goldScale: t.u32().default(1),
    },
  ),
  playerShopTrade: table(
    {
      name: 'player_shop_trade',
      public: false,
      indexes: [
        { accessor: 'byBuyerIdentity', algorithm: 'btree', columns: ['buyerIdentity'] },
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
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
      marketId: t.string().default(defaultMarketId),
    },
  ),
  potionRecipeRoyalty: table(
    {
      name: 'potion_recipe_royalty',
      public: false,
      indexes: [
        { accessor: 'byRecipientIdentity', algorithm: 'btree', columns: ['recipientIdentity'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
        { accessor: 'byAwardedAt', algorithm: 'btree', columns: ['awardedAt'] },
      ],
    },
    {
      royaltyId: t.uuid().primaryKey(),
      recipientIdentity: t.identity(),
      sourceSellerIdentity: t.identity(),
      sourceSellerUsername: t.string(),
      potionKey: t.string(),
      potionLabel: t.string(),
      royaltyGold: t.u64(),
      sourceIncomeGold: t.u64(),
      awardedAt: t.timestamp(),
      goldScale: t.u32().default(1),
      marketId: t.string().default(defaultMarketId),
    },
  ),
  npcMarketPrice: table(
    {
      name: 'npc_market_price',
      public: false,
      indexes: [
        { accessor: 'byItemKind', algorithm: 'btree', columns: ['itemKind'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
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
      marketId: t.string().default(defaultMarketId),
      catalogItemKey: t.string().default(''),
    },
  ),
  marketDemandDaily: table(
    {
      name: 'market_demand_daily',
      public: false,
      indexes: [
        { accessor: 'byDayKey', algorithm: 'btree', columns: ['dayKey'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
      ],
    },
    {
      analyticsKey: t.string().primaryKey(),
      dayKey: t.string(),
      itemKey: t.string(),
      itemLabel: t.string(),
      itemKind: t.string(),
      npcBoughtQuantity: t.u64().default(0n),
      npcSoldQuantity: t.u64().default(0n),
      marketPriceGold: t.u64(),
      npcStock: t.u64(),
      targetStock: t.u64(),
      demandScore: t.u64(),
      supplyScore: t.u64(),
      updatedAt: t.timestamp(),
      priceScale: t.u32().default(1),
      marketId: t.string().default(defaultMarketId),
    },
  ),
  npcMarketItemConfig: table(
    {
      name: 'npc_market_item_config',
      public: false,
      indexes: [
        { accessor: 'byUpdatedAt', algorithm: 'btree', columns: ['updatedAt'] },
        { accessor: 'byMarketId', algorithm: 'btree', columns: ['marketId'] },
      ],
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
      marketId: t.string().default(defaultMarketId),
      catalogItemKey: t.string().default(''),
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
const ownPlayerInboxMailResult = t.array(
  t.row('OwnPlayerInboxMailResult', {
    mailKey: t.string().primaryKey(),
    recipientIdentity: t.identity(),
    sourceType: t.string(),
    sourceKey: t.string(),
    senderLabel: t.string(),
    title: t.string(),
    body: t.string(),
    rewardText: t.string(),
    coinReward: t.u64(),
    crystalReward: t.u32(),
    rubyReward: t.u32(),
    emeraldReward: t.u32(),
    itemRewardsJson: t.string(),
    createdAt: t.timestamp(),
    read: t.bool(),
    rewardCollected: t.bool(),
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
    character: t.string(),
  }),
);
const adminPlayerGameplaySaveResult = t.array(
  t.row('AdminPlayerGameplaySaveResult', {
    identity: t.identity().primaryKey(),
    currentGold: t.f64(),
    currentCrystal: t.u32(),
    currentEmerald: t.u32(),
    currentRuby: t.u32(),
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
    character: t.string(),
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
const worldEventLeaderboardSummaryResult = t.array(
  t.row('WorldEventLeaderboardSummaryResult', {
    contributionKey: t.string().primaryKey(),
    identity: t.identity(),
    periodKey: t.string(),
    eventId: t.string(),
    username: t.string(),
    allianceTag: t.string(),
    allianceTagColor: t.string(),
    character: t.string(),
    points: t.u64(),
    updatedAt: t.timestamp(),
    playerLevel: t.u32(),
    rank: t.u32(),
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
    character: t.string(),
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
    character: t.string(),
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
    character: t.string(),
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
    marketId: t.string(),
  }),
);
const marketDemandDailySnapshotResult = t.array(
  t.row('MarketDemandDailySnapshotResult', {
    analyticsKey: t.string().primaryKey(),
    dayKey: t.string(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    npcBoughtQuantity: t.u64(),
    npcSoldQuantity: t.u64(),
    marketPriceGold: t.u64(),
    npcStock: t.u64(),
    targetStock: t.u64(),
    demandScore: t.u64(),
    supplyScore: t.u64(),
    updatedAt: t.timestamp(),
    priceScale: t.u32(),
    marketId: t.string(),
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
    marketId: t.string(),
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
    marketId: t.string(),
  }),
);
const ownPlayerShopProceedsResult = t.option(
  t.row('OwnPlayerShopProceedsResult', {
    sellerIdentity: t.identity().primaryKey(),
    gold: t.u64(),
    updatedAt: t.timestamp(),
    goldScale: t.u32(),
    marketId: t.string(),
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
    marketId: t.string(),
  }),
);
const ownPotionRecipeRoyaltyHistoryResult = t.array(
  t.row('OwnPotionRecipeRoyaltyHistoryResult', {
    royaltyId: t.uuid().primaryKey(),
    recipientIdentity: t.identity(),
    sourceSellerIdentity: t.identity(),
    sourceSellerUsername: t.string(),
    potionKey: t.string(),
    potionLabel: t.string(),
    royaltyGold: t.u64(),
    sourceIncomeGold: t.u64(),
    awardedAt: t.timestamp(),
    goldScale: t.u32(),
    marketId: t.string(),
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
      character: normalizePlayerCharacter(player.character),
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
  (ctx) => {
    const marketId = getActiveMarketId(ctx);

    return Array.from(ctx.db.npcMarketPrice.byItemKind.filter(new Range()))
      .filter((row) => getRowMarketId(row) === marketId)
      .map((row) => ({
        ...row,
        itemKey: getNpcMarketCatalogItemKey(row),
        marketId,
      }));
  },
);

export const market_demand_daily_snapshot = spacetimedb.view(
  { name: 'market_demand_daily_snapshot', public: true },
  marketDemandDailySnapshotResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);

    return Array.from(ctx.db.marketDemandDaily.byUpdatedAt.filter(new Range()))
      .filter((row) => getRowMarketId(row) === marketId)
      .map((row) => ({
        ...row,
        itemKey: getNpcMarketCatalogItemKey(row),
        marketId,
      }))
      .slice(-MARKET_DEMAND_DAILY_HISTORY_LIMIT)
      .reverse();
  },
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
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return getRecentPublicPlayerShopListings(ctx).map((row) => ({ ...row, marketId }));
  },
);

export const own_player_shop_listing = spacetimedb.view(
  { name: 'own_player_shop_listing', public: true },
  publicPlayerShopListingResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return Array.from(ctx.db.playerShopListing.bySellerIdentity.filter(ctx.sender))
      .filter((row) => getRowMarketId(row) === marketId)
      .map((row) => ({ ...row, marketId }));
  },
);

export const public_player_shop_request = spacetimedb.view(
  { name: 'public_player_shop_request', public: true },
  publicPlayerShopRequestResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return getRecentPublicPlayerShopRequests(ctx).map((row) => ({ ...row, marketId }));
  },
);

export const own_player_shop_request = spacetimedb.view(
  { name: 'own_player_shop_request', public: true },
  publicPlayerShopRequestResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return Array.from(ctx.db.playerShopRequest.byRequesterIdentity.filter(ctx.sender))
      .filter((row) => getRowMarketId(row) === marketId)
      .map((row) => ({ ...row, marketId }));
  },
);

export const own_player_shop_proceeds = spacetimedb.view(
  { name: 'own_player_shop_proceeds', public: true },
  ownPlayerShopProceedsResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);

    if (marketId === defaultMarketId) {
      const legacyProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(ctx.sender);
      return legacyProceeds ? { ...legacyProceeds, marketId } : undefined;
    }

    const proceeds = ctx.db.playerShopMarketProceeds.proceedsKey.find(
      getPlayerShopMarketProceedsKey(ctx.sender, marketId),
    );
    return proceeds
      ? {
          sellerIdentity: proceeds.sellerIdentity,
          gold: proceeds.gold,
          updatedAt: proceeds.updatedAt,
          goldScale: proceeds.goldScale,
          marketId,
        }
      : undefined;
  },
);

export const player_shop_trade_recent = spacetimedb.view(
  { name: 'player_shop_trade_recent', public: true },
  playerShopTradeHistoryResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return getRecentPlayerShopTrades(ctx).map((row) => ({ ...row, marketId }));
  },
);

export const own_player_shop_trade_history = spacetimedb.view(
  { name: 'own_player_shop_trade_history', public: true },
  playerShopTradeHistoryResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return getOwnPlayerShopTrades(ctx).map((row) => ({ ...row, marketId }));
  },
);

export const own_potion_recipe_royalty_history = spacetimedb.view(
  { name: 'own_potion_recipe_royalty_history', public: true },
  ownPotionRecipeRoyaltyHistoryResult,
  (ctx) => {
    const marketId = getActiveMarketId(ctx);
    return getOwnPotionRecipeRoyalties(ctx).map((row) => ({ ...row, marketId }));
  },
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

export const world_event_leaderboard_summary = spacetimedb.view(
  { name: 'world_event_leaderboard_summary', public: true },
  worldEventLeaderboardSummaryResult,
  (ctx) => getWorldEventLeaderboardSummaryRows(ctx),
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
      .slice(-40)
      .map((message) => ({
        messageId: message.messageId,
        allianceId: message.allianceId,
        allianceTag: message.allianceTag,
        allianceTagColor: normalizeTradeAllianceTagColor(message.allianceTagColor),
        senderIdentity: message.senderIdentity,
        username: message.username,
        character: getPlayerCharacterForIdentity(ctx, message.senderIdentity),
        playerLevel: message.playerLevel,
        body: message.body,
        sentAt: message.sentAt,
      }));
  },
);

export const world_chat_recent = spacetimedb.view(
  { name: 'world_chat_recent', public: true },
  worldChatRecentResult,
  (ctx) =>
    getWorldChatRowsOldestFirst(ctx)
      .slice(-40)
      .map((message) => ({
        messageId: message.messageId,
        senderIdentity: message.senderIdentity,
        username: message.username,
        character: getPlayerCharacterForIdentity(ctx, message.senderIdentity),
        playerLevel: message.playerLevel,
        body: message.body,
        sentAt: message.sentAt,
        allianceTag: message.allianceTag,
        allianceTagColor: normalizeTradeAllianceTagColor(message.allianceTagColor),
      })),
);

export const potion_recipe_discovery_snapshot = spacetimedb.view(
  { name: 'potion_recipe_discovery_snapshot', public: true },
  potionRecipeDiscoverySnapshotResult,
  (ctx) => Array.from(ctx.db.potionRecipeDiscovery.byDiscoveredAt.filter(new Range())),
);

export const own_player_inbox_mail = spacetimedb.view(
  { name: 'own_player_inbox_mail', public: true },
  ownPlayerInboxMailResult,
  (ctx) => getOwnPlayerInboxMailRows(ctx),
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

function parseIdentityHex(identityHex: string): Identity | null {
  const safeIdentityHex = normalizeIdentityHex(identityHex);

  if (!safeIdentityHex) {
    return null;
  }

  try {
    return Identity.fromString(safeIdentityHex);
  } catch {
    return null;
  }
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

function normalizePlayerCharacter(character: unknown): string {
  const value = String(character ?? '').trim().toLowerCase();
  return PLAYER_CHARACTERS.has(value) ? value : DEFAULT_PLAYER_CHARACTER;
}

function getPlayerCharacterForIdentity(ctx: { db: any }, identity: Identity): string {
  return normalizePlayerCharacter(
    ctx.db.player.identity.find(identity)?.character ?? DEFAULT_PLAYER_CHARACTER,
  );
}

function hasAcceptedPlayerGameplaySave(ctx: { db: any }, identity: Identity): boolean {
  return Boolean(ctx.db.playerGameplaySave.identity.find(identity));
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

  const identity = parseIdentityHex(safeIdentityHex);
  const player = identity ? ctx.db.player.identity.find(identity) : null;

  if (player) {
    return player;
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

function parseTradeAllianceUuid(allianceId: unknown): Uuid | null {
  if (
    typeof allianceId === 'object' &&
    allianceId !== null &&
    'compareTo' in allianceId &&
    typeof allianceId.compareTo === 'function'
  ) {
    return allianceId as Uuid;
  }

  const allianceKey = getTradeAllianceIdKey(allianceId).trim();

  if (!allianceKey) {
    return null;
  }

  try {
    return Uuid.parse(allianceKey);
  } catch {
    return null;
  }
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

function getAnchoredPeriodStartMicros(timestampMicros: bigint, daySpan: bigint): bigint {
  const periodMicros = daySpan * PERIOD_DAY_MICROS;
  return (
    PERIOD_LOOP_ANCHOR_MICROS +
    floorDivBigInt(timestampMicros - PERIOD_LOOP_ANCHOR_MICROS, periodMicros) *
      periodMicros
  );
}

function getDailyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return String(getContextTimestampMicros(ctx) / PERIOD_DAY_MICROS);
}

function getWeeklyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return getAnchoredPeriodKey(ctx, PERIOD_WEEK_DAYS);
}

function getWeeklyPeriodStartMicros(timestampMicros: bigint): bigint {
  return getAnchoredPeriodStartMicros(timestampMicros, PERIOD_WEEK_DAYS);
}

function getMonthlyPeriodKey(ctx: IdleWizardReducerCtx): string {
  return getAnchoredPeriodKey(ctx, PERIOD_MONTH_DAYS);
}

function getWorldEventPeriodKey(ctx: IdleWizardReducerCtx): string {
  return `weekly-${getWeeklyPeriodKey(ctx)}`;
}

function getWorldEventPeriodIndex(periodKey: string): number | null {
  const safePeriodKey = normalizeWorldEventPeriodKey(periodKey);
  const match = /^weekly-(\d+)$/.exec(safePeriodKey);

  if (!match) {
    return null;
  }

  const periodIndex = Number(match[1]);
  return Number.isSafeInteger(periodIndex) && periodIndex >= 0 ? periodIndex : null;
}

function isEndedWorldEventPeriod(ctx: IdleWizardReducerCtx, periodKey: string): boolean {
  const periodIndex = getWorldEventPeriodIndex(periodKey);
  const currentPeriodIndex = getWorldEventPeriodIndex(getWorldEventPeriodKey(ctx));

  return (
    periodIndex !== null &&
    currentPeriodIndex !== null &&
    periodIndex < currentPeriodIndex
  );
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

function normalizeWorldEventPeriodKey(periodKey: string): string {
  const value = stripUnsafeTextControls(String(periodKey ?? ''))
    .trim()
    .slice(0, MAX_WORLD_EVENT_PERIOD_KEY_LENGTH);

  return /^weekly-\d+$/.test(value) ? value : '';
}

function normalizeWorldEventId(eventId: string): string {
  const value = stripUnsafeTextControls(String(eventId ?? ''))
    .trim()
    .slice(0, MAX_WORLD_EVENT_ID_LENGTH);

  return /^[a-z0-9][a-z0-9-]*$/.test(value) ? value : '';
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

function getRowMarketId(row: any): string {
  return normalizeMarketId(String(row?.marketId ?? defaultMarketId));
}

function getActiveMarketId(
  ctx: { sender: Identity; db: any },
  identity: Identity = ctx.sender,
): string {
  const save = ctx.db.playerGameplaySave.identity.find(identity);
  const completedStars = readSavedPrestigeCompletedLevels(save?.saveJson)?.length ?? 0;
  return resolveMarketLicence(completedStars).id;
}

function assertActiveMarket(ctx: IdleWizardReducerCtx, marketId: string): string {
  const completedStars = readSavedPrestigeCompletedLevels(
    ctx.db.playerGameplaySave.identity.find(ctx.sender)?.saveJson,
  )?.length ?? 0;
  return assertMarketScope(completedStars, String(marketId ?? ''));
}

function getMarketScopedItemKey(marketId: string, itemKey: string): string {
  const safeItemKey = normalizeNpcMarketItemKey(itemKey);
  return getMarketScopedKey(marketId, safeItemKey);
}

function getNpcMarketCatalogItemKey(row: any): string {
  const catalogItemKey = normalizeNpcMarketItemKey(String(row?.catalogItemKey ?? ''));
  return catalogItemKey || normalizeNpcMarketItemKey(String(row?.itemKey ?? ''));
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

function getPlayerShopListingKey(
  ctx: IdleWizardReducerCtx,
  slotNumber: number,
  marketId = defaultMarketId,
): string {
  return getPlayerShopListingKeyForIdentity(ctx.sender, slotNumber, marketId);
}

function getPlayerShopListingKeyForIdentity(
  identity: Identity,
  slotNumber: number,
  marketId = defaultMarketId,
): string {
  const baseKey = `${identity.toHexString()}:${slotNumber}`;
  return getMarketScopedKey(marketId, baseKey);
}

function getPlayerShopRequestKey(
  ctx: IdleWizardReducerCtx,
  slotNumber: number,
  marketId = defaultMarketId,
): string {
  return getPlayerShopRequestKeyForIdentity(ctx.sender, slotNumber, marketId);
}

function getPlayerShopRequestKeyForIdentity(
  identity: Identity,
  slotNumber: number,
  marketId = defaultMarketId,
): string {
  const baseKey = `${identity.toHexString()}:${slotNumber}`;
  return getMarketScopedKey(marketId, baseKey);
}

function getPlayerShopMarketProceedsKey(identity: Identity, marketId: string): string {
  return `${normalizeMarketId(marketId)}:${identity.toHexString()}`;
}

function addClaimablePlayerShopGold(
  ctx: IdleWizardReducerCtx,
  recipientIdentity: Identity,
  gold: number,
  marketId = defaultMarketId,
  { clampToCap = false }: { clampToCap?: boolean } = {},
): number {
  const safeGold = normalizeGoldPrice(gold);

  if (safeGold === null || safeGold <= 0) {
    return 0;
  }

  const safeMarketId = normalizeMarketId(marketId);
  const legacyProceeds =
    safeMarketId === defaultMarketId
      ? ctx.db.playerShopProceeds.sellerIdentity.find(recipientIdentity)
      : undefined;
  const marketProceeds =
    safeMarketId === defaultMarketId
      ? undefined
      : ctx.db.playerShopMarketProceeds.proceedsKey.find(
          getPlayerShopMarketProceedsKey(recipientIdentity, safeMarketId),
        );
  const existingProceeds = legacyProceeds ?? marketProceeds;
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

  if (legacyProceeds) {
    ctx.db.playerShopProceeds.sellerIdentity.update({
      ...legacyProceeds,
      gold: toStoredGoldPrice(nextProceedsGold),
      goldScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });
  } else if (marketProceeds) {
    ctx.db.playerShopMarketProceeds.proceedsKey.update({
      ...marketProceeds,
      gold: toStoredGoldPrice(nextProceedsGold),
      goldScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });
  } else if (safeMarketId === defaultMarketId) {
    ctx.db.playerShopProceeds.insert({
      sellerIdentity: recipientIdentity,
      gold: toStoredGoldPrice(nextProceedsGold),
      goldScale: GOLD_PRICE_SCALE,
      updatedAt: ctx.timestamp,
    });
  } else {
    ctx.db.playerShopMarketProceeds.insert({
      proceedsKey: getPlayerShopMarketProceedsKey(recipientIdentity, safeMarketId),
      sellerIdentity: recipientIdentity,
      marketId: safeMarketId,
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
  marketId = defaultMarketId,
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
    marketId,
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
  recordPotionRecipeRoyalty(ctx, {
    discovery,
    recipientIdentity: discovery.discoveredByIdentity,
    sourceSellerIdentity: sellerIdentity,
    sourceIncomeGold: incomeGold,
    royaltyGold: grantedGold,
    marketId,
  });

  return grantedGold;
}

function recordPotionRecipeRoyalty(
  ctx: IdleWizardReducerCtx,
  {
    discovery,
    recipientIdentity,
    sourceSellerIdentity,
    sourceIncomeGold,
    royaltyGold,
    marketId = defaultMarketId,
  }: {
    discovery: any;
    recipientIdentity: Identity;
    sourceSellerIdentity: Identity;
    sourceIncomeGold: number;
    royaltyGold: number;
    marketId?: string;
  },
) {
  const safeRoyaltyGold = normalizeGoldPrice(royaltyGold);

  if (safeRoyaltyGold === null || safeRoyaltyGold <= 0) {
    return;
  }

  const safeSourceIncomeGold = normalizeGoldPrice(sourceIncomeGold) ?? 0;
  const sourcePlayer = ctx.db.player.identity.find(sourceSellerIdentity);

  ctx.db.potionRecipeRoyalty.insert({
    royaltyId: ctx.newUuidV7(),
    recipientIdentity,
    sourceSellerIdentity,
    sourceSellerUsername: sourcePlayer?.username ?? DEFAULT_USERNAME,
    potionKey: String(discovery.potionKey ?? ''),
    potionLabel: String(discovery.potionLabel ?? ''),
    royaltyGold: toStoredGoldPrice(safeRoyaltyGold),
    sourceIncomeGold: toStoredGoldPrice(safeSourceIncomeGold),
    awardedAt: ctx.timestamp,
    goldScale: GOLD_PRICE_SCALE,
    marketId: normalizeMarketId(marketId),
  });
  prunePotionRecipeRoyaltyHistory(ctx);
}

function findTradeAllianceById(ctx: IdleWizardReducerCtx, allianceId: string) {
  const safeAllianceId = String(allianceId ?? '').trim();

  if (!safeAllianceId) {
    throw new Error('Alliance is required.');
  }

  const allianceUuid = parseTradeAllianceUuid(safeAllianceId);
  const alliance = allianceUuid ? ctx.db.tradeAlliance.allianceId.find(allianceUuid) : null;

  if (alliance) {
    return alliance;
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

function findTradeAllianceMemberByIdentityHex(
  ctx: IdleWizardReducerCtx,
  identityHex: string,
) {
  const identity = parseIdentityHex(identityHex);

  if (!identity) {
    return null;
  }

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
  actor = getTradeAllianceMember(ctx),
) {
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
  const legacyDefaultDurationSeconds = researchLegacyDefaultDurationSecondsById[researchId];

  if (
    legacyDefaultDurationSeconds !== undefined &&
    durationSeconds === legacyDefaultDurationSeconds
  ) {
    return fallback;
  }

  const legacyDurationSeconds = researchLegacyDurationSecondsById[researchId];

  if (legacyDurationSeconds !== undefined && durationSeconds === legacyDurationSeconds) {
    return fallback;
  }

  const additionalLegacyDurationSeconds =
    researchAdditionalLegacyDurationSecondsById[researchId] ?? [];

  if (additionalLegacyDurationSeconds.includes(durationSeconds)) {
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

    const existingCostsCrystal = isRecord(parsedConfig.researchCostsCrystal)
      ? parsedConfig.researchCostsCrystal
      : {};
    const existingCostsRuby = isRecord(parsedConfig.researchCostsRuby)
      ? parsedConfig.researchCostsRuby
      : {};
    const existingCostsEmerald = isRecord(parsedConfig.researchCostsEmerald)
      ? parsedConfig.researchCostsEmerald
      : {};
    const nextCostsCrystal = normalizeResearchCurrencyCostRecord(
      researchDefaultCostCrystalById,
      existingCostsCrystal,
      existingCostsEmerald,
    );
    const nextCostsRuby = normalizeResearchCurrencyCostRecord(
      researchDefaultCostRubyById,
      existingCostsRuby,
      existingCostsCrystal,
    );
    const nextCostsEmerald = normalizeResearchCurrencyCostRecord(
      researchDefaultCostEmeraldById,
      existingCostsEmerald,
      existingCostsRuby,
    );
    let replacedLegacyCrystalCost = false;

    for (const [researchId, legacyCostEmeraldValues] of Object.entries(
      researchLegacyCostEmeraldById,
    )) {
      const currentCostCrystal = Number(nextCostsCrystal[researchId]);
      const defaultCostCrystal = Number(researchDefaultCostCrystalById[researchId]);
      if (
        currentCostCrystal === defaultCostCrystal ||
        !legacyCostEmeraldValues.some(
          (legacyCostEmerald) => currentCostCrystal === Number(legacyCostEmerald),
        )
      ) {
        continue;
      }

      nextCostsCrystal[researchId] = researchDefaultCostCrystalById[researchId];
      replacedLegacyCrystalCost = true;
    }

    if (
      JSON.stringify(existingCostsCrystal) !== JSON.stringify(nextCostsCrystal) ||
      replacedLegacyCrystalCost
    ) {
      normalizedResearchConfig.researchCostsCrystal = nextCostsCrystal;
      changed = true;
    }

    if (JSON.stringify(existingCostsRuby) !== JSON.stringify(nextCostsRuby)) {
      normalizedResearchConfig.researchCostsRuby = nextCostsRuby;
      changed = true;
    }

    if (JSON.stringify(existingCostsEmerald) !== JSON.stringify(nextCostsEmerald)) {
      normalizedResearchConfig.researchCostsEmerald = nextCostsEmerald;
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
      const nextDurations = {
        ...defaultResearchDurationsSeconds,
        ...existingDurations,
      };
      let replacedLegacyDuration = false;

      for (const [researchId, legacyDurationSeconds] of Object.entries(
        researchLegacyDefaultDurationSecondsById,
      )) {
        const defaultDurationSeconds = defaultResearchDurationsSeconds[researchId];

        if (defaultDurationSeconds === undefined) {
          continue;
        }

        const currentDurationSeconds = Number(nextDurations[researchId]);

        if (currentDurationSeconds !== Number(legacyDurationSeconds)) {
          continue;
        }

        nextDurations[researchId] = defaultDurationSeconds;
        replacedLegacyDuration = true;
      }

      for (const [researchId, legacyDurationSeconds] of Object.entries(
        researchLegacyDurationSecondsById,
      )) {
        const defaultDurationSeconds = defaultResearchDurationsSeconds[researchId];

        if (defaultDurationSeconds === undefined) {
          continue;
        }

        const currentDurationSeconds = Number(nextDurations[researchId]);

        if (currentDurationSeconds !== Number(legacyDurationSeconds)) {
          continue;
        }

        nextDurations[researchId] = defaultDurationSeconds;
        replacedLegacyDuration = true;
      }

      for (const [researchId, legacyDurationSecondsValues] of Object.entries(
        researchAdditionalLegacyDurationSecondsById,
      )) {
        const defaultDurationSeconds = defaultResearchDurationsSeconds[researchId];

        if (defaultDurationSeconds === undefined) {
          continue;
        }

        const currentDurationSeconds = Number(nextDurations[researchId]);

        if (
          !legacyDurationSecondsValues.some(
            (legacyDurationSeconds) =>
              currentDurationSeconds === Number(legacyDurationSeconds),
          )
        ) {
          continue;
        }

        nextDurations[researchId] = defaultDurationSeconds;
        replacedLegacyDuration = true;
      }

      if (missingDuration || replacedLegacyDuration) {
        normalizedResearchConfig.researchDurationsSeconds = nextDurations;
        changed = true;
      }
    } else {
      normalizedResearchConfig.researchDurationsSeconds =
        defaultResearchDurationsSeconds;
      changed = true;
    }

    return changed ? JSON.stringify(normalizedResearchConfig) : originalJson;
  }

  if (configKey === 'garden' && isRecord(parsedConfig)) {
    return normalizeGardenGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey === 'brewing' && isRecord(parsedConfig)) {
    return normalizeBrewingGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey === 'playerLevel' && isRecord(parsedConfig)) {
    return normalizePlayerLevelGameConfigJson(parsedConfig, originalJson);
  }

  if (configKey !== 'playerLevel' || !isRecord(parsedConfig)) {
    return originalJson;
  }

  return originalJson;
}

function normalizePlayerLevelGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  let changed = false;
  let normalizedConfig = parsedConfig;

  if (readPlayerLevelCrystalPerLevel(parsedConfig) !== undefined) {
    normalizedConfig = parsedConfig;
  } else {
    const crystal = isRecord(parsedConfig.crystal) ? parsedConfig.crystal : {};

    normalizedConfig = {
      ...parsedConfig,
      crystal: {
        ...crystal,
        perLevel: DEFAULT_PLAYER_LEVEL_CRYSTAL_PER_LEVEL,
      },
    };
    changed = true;
  }

  const defaultConfig = JSON.parse(DEFAULT_PLAYER_LEVEL_CONFIG_JSON) as {
    milestones?: unknown;
  };
  const defaultMilestones = Array.isArray(defaultConfig.milestones)
    ? defaultConfig.milestones
    : [];
  const milestoneKey = Array.isArray(normalizedConfig.milestones)
    ? 'milestones'
    : Array.isArray(normalizedConfig.levels)
      ? 'levels'
      : null;

  if (milestoneKey) {
    const normalizedMilestones = normalizeLegacyPlayerLevelMilestones(
      normalizedConfig[milestoneKey],
      defaultMilestones,
    );

    if (normalizedMilestones !== normalizedConfig[milestoneKey]) {
      normalizedConfig = {
        ...normalizedConfig,
        [milestoneKey]: normalizedMilestones,
      };
      changed = true;
    }
  }

  return changed ? JSON.stringify(normalizedConfig) : originalJson;
}

function normalizeLegacyPlayerLevelMilestones(
  milestones: unknown,
  defaultMilestones: unknown[],
) {
  if (!Array.isArray(milestones)) {
    return milestones;
  }

  const defaultByLevel = new Map(
    defaultMilestones
      .filter((milestone): milestone is Record<string, unknown> => isRecord(milestone))
      .map((milestone) => [Number(milestone.level), milestone]),
  );
  let changed = false;
  const normalizedMilestones = milestones.map((milestone) => {
    if (!isRecord(milestone)) {
      return milestone;
    }

    const level = Number(milestone.level);
    const legacyCaps = LEGACY_PLAYER_LEVEL_CAPS_BY_LEVEL.get(level);
    const defaultMilestone = defaultByLevel.get(level);

    if (
      !legacyCaps ||
      !defaultMilestone ||
      Number(milestone.maxGardenTiles) !== legacyCaps.maxGardenTiles ||
      Number(milestone.maxCauldrons) !== legacyCaps.maxCauldrons
    ) {
      return milestone;
    }

    changed = true;
    return {
      ...milestone,
      maxGardenTiles: defaultMilestone.maxGardenTiles,
      maxCauldrons: defaultMilestone.maxCauldrons,
    };
  });

  return changed ? normalizedMilestones : milestones;
}

function normalizeGardenGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  const garden = isRecord(parsedConfig.garden) ? parsedConfig.garden : null;
  const defaultConfig = JSON.parse(DEFAULT_GARDEN_CONFIG_JSON) as {
    garden?: { tileCostsGold?: number[] };
  };
  const defaultTileCosts = defaultConfig.garden?.tileCostsGold;

  if (
    !garden ||
    !Array.isArray(garden.tileCostsGold) ||
    !Array.isArray(defaultTileCosts) ||
    (!matchesNumberList(garden.tileCostsGold, LEGACY_GARDEN_TILE_COSTS_GOLD_20) &&
      !shouldExtendDefaultNumberList(garden.tileCostsGold, defaultTileCosts))
  ) {
    return originalJson;
  }

  return JSON.stringify({
    ...parsedConfig,
    garden: {
      ...garden,
      tileCostsGold: defaultTileCosts,
    },
  });
}

function normalizeBrewingGameConfigJson(
  parsedConfig: Record<string, unknown>,
  originalJson: string,
): string {
  const defaultConfig = JSON.parse(DEFAULT_BREWING_CONFIG_JSON) as {
    cauldronCostsGold?: number[];
  };
  const defaultCauldronCosts = defaultConfig.cauldronCostsGold;

  if (
    !Array.isArray(parsedConfig.cauldronCostsGold) ||
    !Array.isArray(defaultCauldronCosts) ||
    (!matchesNumberList(
      parsedConfig.cauldronCostsGold,
      LEGACY_BREWING_CAULDRON_COSTS_GOLD_10,
    ) &&
      !shouldExtendDefaultNumberList(parsedConfig.cauldronCostsGold, defaultCauldronCosts))
  ) {
    return originalJson;
  }

  return JSON.stringify({
    ...parsedConfig,
    cauldronCostsGold: defaultCauldronCosts,
  });
}

function shouldExtendDefaultNumberList(existing: unknown[], defaults: number[]): boolean {
  return (
    existing.length > 0 &&
    existing.length < defaults.length &&
    existing.every((value, index) => Number(value) === defaults[index])
  );
}

function matchesNumberList(existing: unknown[], expected: number[]): boolean {
  return (
    existing.length === expected.length &&
    existing.every((value, index) => Number(value) === expected[index])
  );
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
    hasSameFamilySeedItemRequirementsAfterTutorial(levels) ||
    hasLegacyEarlyRepeatedTaskItems(levels) ||
    hasLegacyRepetitiveTaskMaterialBands(levels);
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

function hasLegacyRepetitiveTaskMaterialBands(levels: unknown[]): boolean {
  return hasTaskConfigValue(
    levels,
    14,
    'level14-simple-antidote',
    'glowcapSeed',
    180,
  ) || hasTaskConfigValue(
    levels,
    45,
    'level45-star-anise--seeds-1',
    'starAniseSeed',
    690,
  );
}

function hasLegacyEarlyRepeatedTaskItems(levels: unknown[]): boolean {
  return hasTaskConfigValue(
    levels,
    5,
    'level5-nettle-seeds',
    'mintSeed',
    45,
  ) && hasTaskConfigValue(
    levels,
    6,
    'level6-lavender-seeds',
    'lavenderHerb',
    42,
  ) && hasTaskConfigValue(
    levels,
    7,
    'level7-nettle-vigor',
    'nettleVigor',
    6,
  ) && hasTaskConfigValue(
    levels,
    8,
    'level8-briar-seeds',
    'briarHerb',
    56,
  );
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
  expectedTasks: Array<{
    id: string;
    itemKey?: string;
    researchId?: string;
    type?: string;
    quantity: number;
  }>,
): boolean {
  if (tasks.length !== expectedTasks.length) {
    return false;
  }

  return expectedTasks.every((expectedTask, index) => {
    const task = tasks[index];
    const expectedType = normalizeTasksConfigTaskType(expectedTask.type) ?? 'turnIn';

    return isRecord(task) &&
      String(task.id ?? '') === expectedTask.id &&
      String(task.itemKey ?? '') === String(expectedTask.itemKey ?? '') &&
      String(task.researchId ?? '') === String(expectedTask.researchId ?? '') &&
      (normalizeTasksConfigTaskType(task.type) ?? 'turnIn') === expectedType &&
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

function hasTaskConfigValue(
  levels: unknown[],
  levelNumber: number,
  taskId: string,
  itemKey: string,
  quantity: number,
): boolean {
  return getTaskConfigsForLevel(levels, levelNumber).some(
    (taskConfig) =>
      isRecord(taskConfig) &&
      String(taskConfig.id ?? '') === taskId &&
      String(taskConfig.itemKey ?? '') === itemKey &&
      Number(taskConfig.quantity) === quantity,
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
  const previousSave = parsePlayerGameplaySaveJson(previousSaveJson) ?? {};
  const tasks = normalizeSaveTasks(save.tasks, taskCatalog, previousLevel);
  const prestige = normalizeSavePrestige(save.prestige);
  const inferredCapacityResearchIds = getSaveInferredCapacityResearchIds(save);
  const normalizedResearch = normalizeSaveResearch(
    save.research,
    prestige.completedLevels.length,
    inferredCapacityResearchIds,
  );
  const research = {
    ...normalizedResearch,
    crystalCostById: normalizeSaveResearchCrystalCosts(
      ctx,
      save.research,
      normalizedResearch,
    ),
  };
  const normalizedCoin = normalizeSaveGold(readSaveCoinBranch(save));
  const levelLimits = applySaveCapacityResearchLimits(
    getSaveLevelLimits(ctx, tasks.currentLevel),
    research,
  );
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
    coin: normalizedCoin,
    gold: normalizedCoin,
    crystal: normalizeSaveCrystal(save.crystal, minimumCurrentCrystal),
    emerald: normalizeSaveEmerald(save.emerald),
    ruby: normalizeSaveRuby(save.ruby),
    logs: normalizeSaveLogs(save.logs),
    inventory: normalizeSaveInventory(save.inventory, itemCatalog),
    research,
    automation: normalizeSaveAutomation(
      Object.hasOwn(save, 'automation') ? save.automation : previousSave.automation,
    ),
    seedSummoning: normalizeSaveSeedSummoning(
      Object.hasOwn(save, 'seedSummoning')
        ? save.seedSummoning
        : previousSave.seedSummoning,
      itemCatalog,
    ),
    prestige,
    visualSettings: normalizeSaveVisualSettings(ctx, save.visualSettings, identity),
    shop: normalizeSaveShop(save.shop, itemCatalog, levelLimits),
    brewing: normalizeSaveBrewing(save.brewing, itemCatalog, levelLimits.maxCauldrons),
    garden: normalizeSaveGarden(save.garden, itemCatalog, levelLimits),
    tasks,
    personalTasks: normalizeSaveClientStateBranch(
      Object.hasOwn(save, 'personalTasks') ? save.personalTasks : previousSave.personalTasks,
      { version: 1, periods: {} },
    ),
    worldNotice: normalizeSaveClientStateBranch(
      Object.hasOwn(save, 'worldNotice') ? save.worldNotice : previousSave.worldNotice,
      { version: 1, current: null, archive: [] },
    ),
    guild: normalizeSaveClientStateBranch(
      Object.hasOwn(save, 'guild') ? save.guild : previousSave.guild,
      { version: 1, profile: null },
    ),
    inboxRewards: normalizeSaveInboxRewards(
      Object.hasOwn(save, 'inboxRewards') ? save.inboxRewards : previousSave.inboxRewards,
    ),
    stats: normalizeSaveClientStateBranch(
      Object.hasOwn(save, 'stats') ? save.stats : previousSave.stats,
      {
        version: 1,
        seeds: { total: 0, byKey: {} },
        herbs: { total: 0, byKey: {} },
        potions: { total: 0, byKey: {} },
        coin: {
          npcTrade: 0,
          playerTrade: 0,
          royalties: { total: 0, byPotionKey: {} },
        },
        recordedPlayerTradeIds: [],
        recordedRoyaltyIds: [],
      },
    ),
  };
}

function normalizeSaveClientStateBranch(value: unknown, fallback: Record<string, unknown>) {
  return isRecord(value) ? value : fallback;
}

function normalizeSaveInboxRewards(value: unknown) {
  const branch = isRecord(value) ? value : {};
  const claimedMailKeys = Array.isArray(branch.claimedMailKeys)
    ? branch.claimedMailKeys
        .map((mailKey) =>
          stripUnsafeTextControls(String(mailKey ?? ''))
            .trim()
            .slice(0, MAX_PLAYER_INBOX_MAIL_KEY_LENGTH),
        )
        .filter((mailKey) => Boolean(mailKey))
    : [];

  return {
    version: 1,
    claimedMailKeys: [...new Set(claimedMailKeys)].slice(
      -MAX_PLAYER_SAVE_INBOX_CLAIMED_MAIL_KEYS,
    ),
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

function readSaveCoinBranch(save: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(save.coin)) {
    return save.coin;
  }

  return isRecord(save.gold) ? save.gold : {};
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
    currentEmerald: getSaveCurrentEmerald(parsedSave),
    currentRuby: getSaveCurrentRuby(parsedSave),
    updatedAt: new Timestamp(save.updatedAt.microsSinceUnixEpoch),
  };
}

function getSaveCurrentGold(save: Record<string, unknown>): number {
  const gold = readSaveCoinBranch(save);
  return clampSaveGoldPrice(gold.current, BigInt(MAX_PLAYER_SAVE_CURRENT_GOLD));
}

function getSaveCurrentCrystal(save: Record<string, unknown>): number {
  const crystal = isRecord(save.crystal) ? save.crystal : {};
  return clampSaveInteger(crystal.current, 0, MAX_PLAYER_SAVE_CURRENT_CRYSTAL, 0);
}

function getSaveCurrentEmerald(save: Record<string, unknown>): number {
  const emerald = isRecord(save.emerald) ? save.emerald : {};
  return clampSaveInteger(emerald.current, 0, MAX_PLAYER_SAVE_CURRENT_EMERALD, 0);
}

function getSaveCurrentRuby(save: Record<string, unknown>): number {
  const ruby = isRecord(save.ruby) ? save.ruby : {};
  return clampSaveInteger(ruby.current, 0, MAX_PLAYER_SAVE_CURRENT_RUBY, 0);
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
  const previousGold = readSaveCoinBranch(previousSave);
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
      coin: {
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

function createAdminPlayerLevelTasks(
  taskCatalog: ReturnType<typeof getSaveTaskCatalog>,
  playerLevel: number,
) {
  if (playerLevel < taskCatalog.initialLevel || playerLevel > taskCatalog.maxLevel) {
    throw new Error('Invalid player level.');
  }

  return {
    currentLevel: playerLevel,
    tasks: [],
  };
}

function createAdminPlayerLevelSaveJson(
  ctx: IdleWizardReducerCtx,
  existingSave: PlayerGameplaySaveRowValue | undefined,
  identity: Identity,
  playerLevel: number,
): string {
  if (!existingSave) {
    throw new Error('Cannot set level for missing player save.');
  }

  const previousSave = parsePlayerGameplaySaveJson(existingSave.saveJson);
  if (!previousSave) {
    throw new Error('Cannot set level for invalid player save.');
  }

  const normalizedSave = normalizePlayerGameplaySave(
    ctx,
    previousSave,
    existingSave.saveJson,
    identity,
  );
  const taskCatalog = getSaveTaskCatalog(ctx);
  const research: Record<string, unknown> = isRecord(normalizedSave.research)
    ? normalizedSave.research
    : {};
  const researchForCrystal = {
    completedIds: Array.isArray(research.completedIds)
      ? research.completedIds.map((researchId: unknown) => String(researchId))
      : [],
    inProgress: Array.isArray(research.inProgress)
      ? research.inProgress.filter((progress: unknown): progress is Record<string, unknown> =>
          isRecord(progress),
        )
      : [],
  };
  const minimumCurrentCrystal = getMinimumCurrentCrystalForSave(ctx, playerLevel, {
    ...researchForCrystal,
    crystalCostById: normalizeSaveResearchCrystalCosts(
      ctx,
      research,
      researchForCrystal,
    ),
  });
  const nextSaveJson = JSON.stringify({
    ...normalizedSave,
    savedAt: normalizeSaveTimestamp(ctx),
    crystal: normalizeSaveCrystal(normalizedSave.crystal, minimumCurrentCrystal),
    tasks: createAdminPlayerLevelTasks(taskCatalog, playerLevel),
  });

  if (nextSaveJson.length > MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH) {
    throw new Error('Invalid player save JSON length.');
  }

  return nextSaveJson;
}

function createAdminPlayerCurrencyBonusSaveJson(
  ctx: IdleWizardReducerCtx,
  existingSave: PlayerGameplaySaveRowValue | undefined,
  identity: Identity,
  {
    emeraldDelta,
    rubyDelta,
    crystalDelta,
  }: {
    emeraldDelta: number;
    rubyDelta: number;
    crystalDelta: number;
  },
): string {
  const previousSave = parsePlayerGameplaySaveJson(existingSave?.saveJson) ?? {};
  const previousCrystal = isRecord(previousSave.crystal) ? previousSave.crystal : {};
  const previousEmerald = isRecord(previousSave.emerald) ? previousSave.emerald : {};
  const previousRuby = isRecord(previousSave.ruby) ? previousSave.ruby : {};
  const currentCrystal = clampSaveInteger(
    previousCrystal.current,
    0,
    MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
    0,
  );
  const currentEmerald = clampSaveInteger(
    previousEmerald.current,
    0,
    MAX_PLAYER_SAVE_CURRENT_EMERALD,
    0,
  );
  const currentRuby = clampSaveInteger(
    previousRuby.current,
    0,
    MAX_PLAYER_SAVE_CURRENT_RUBY,
    0,
  );

  return JSON.stringify(
    normalizePlayerGameplaySave(
      ctx,
      {
        ...previousSave,
        crystal: {
          ...previousCrystal,
          current: clampNumber(
            currentCrystal + crystalDelta,
          0,
          MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
        ),
      },
      emerald: {
        ...previousEmerald,
        current: clampNumber(
          currentEmerald + emeraldDelta,
          0,
          MAX_PLAYER_SAVE_CURRENT_EMERALD,
        ),
      },
      ruby: {
        ...previousRuby,
        current: clampNumber(currentRuby + rubyDelta, 0, MAX_PLAYER_SAVE_CURRENT_RUBY),
      },
      },
      existingSave?.saveJson,
      identity,
      { preserveSavedAt: Boolean(existingSave) },
    ),
  );
}

function validateAdminPlotCapacityTarget(plotNumber: unknown): number {
  const value = Math.floor(Number(plotNumber));

  if (!Number.isInteger(value) || !plotCapacityResearchNumbers.includes(value)) {
    throw new Error('Invalid plot capacity target.');
  }

  return value;
}

function isPlotCapacityResearchId(researchId: unknown): boolean {
  return /^advanced:plotCapacity:\d+$/.test(String(researchId ?? ''));
}

function getSequentialPlotCapacityResearchIds(plotNumber: number): string[] {
  return plotCapacityResearchNumbers
    .filter((candidate) => candidate <= plotNumber)
    .map((candidate) => `advanced:plotCapacity:${candidate}`);
}

function createAdminPlotCapacityCorrectionSaveJson(
  ctx: IdleWizardReducerCtx,
  existingSave: PlayerGameplaySaveRowValue | undefined,
  identity: Identity,
  plotNumber: number,
): string {
  if (!existingSave) {
    throw new Error('Cannot correct missing player save.');
  }

  const previousSave = parsePlayerGameplaySaveJson(existingSave.saveJson);
  if (!previousSave) {
    throw new Error('Cannot correct invalid player save JSON.');
  }

  const safePlotNumber = validateAdminPlotCapacityTarget(plotNumber);
  const normalizedSave = normalizePlayerGameplaySave(
    ctx,
    previousSave,
    existingSave.saveJson,
    identity,
    { preserveSavedAt: true },
  );
  const prestigeCount = normalizedSave.prestige.completedLevels.length;
  const requiredPrestigeCount = getSaveRequiredPrestigeCount(
    `advanced:plotCapacity:${safePlotNumber}`,
  );

  if (prestigeCount < requiredPrestigeCount) {
    throw new Error('Player has not completed enough prestige levels.');
  }

  const research = normalizedSave.research;
  const completedIds = normalizeSaveCompletedResearchIds(research.completedIds) ?? [];
  const nextCompletedIdSet = new Set([
    ...completedIds.filter((researchId) => !isPlotCapacityResearchId(researchId)),
    ...getSequentialPlotCapacityResearchIds(safePlotNumber),
  ]);
  const nextCompletedIds = researchCatalog
    .map((catalogResearch) => catalogResearch.researchId)
    .filter((researchId) => nextCompletedIdSet.has(researchId));
  const nextCompletedSet = new Set(nextCompletedIds);
  const nextInProgress = normalizeSaveInProgressResearches(
    {
      inProgress: research.inProgress.filter(
        (progress) => !isPlotCapacityResearchId(progress.researchId),
      ),
    },
    nextCompletedSet,
    prestigeCount,
  );
  const nextSaveJson = JSON.stringify(
    normalizePlayerGameplaySave(
      ctx,
      {
        ...normalizedSave,
        research: {
          completedIds: nextCompletedIds,
          inProgress: nextInProgress,
        },
      },
      existingSave.saveJson,
      identity,
      { preserveSavedAt: true },
    ),
  );

  if (nextSaveJson.length > MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH) {
    throw new Error('Invalid player save JSON length.');
  }

  return nextSaveJson;
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

function copyAdminPlayerGameplaySave(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
) {
  const sourceSave = ctx.db.playerGameplaySave.identity.find(sourceIdentity);
  if (!sourceSave) {
    throw new Error('Cannot copy missing source player save.');
  }

  const parsedSave = parsePlayerGameplaySaveJson(sourceSave.saveJson);
  if (!parsedSave) {
    throw new Error('Cannot copy invalid source player save JSON.');
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

function copyAdminLeaderboardEntry(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  const sourceEntry = ctx.db.leaderboard.identity.find(sourceIdentity);
  if (!sourceEntry) {
    throw new Error('Cannot copy missing source leaderboard entry.');
  }

  const targetEntry = ctx.db.leaderboard.identity.find(targetIdentity);
  const capPlayerLevel = getLeaderboardCapPlayerLevel(ctx, targetIdentity, targetPlayerLevel);
  const totalIncome = clampLeaderboardTotalIncome(sourceEntry.totalIncome, capPlayerLevel);
  const nextEntry = {
    ...sourceEntry,
    identity: targetIdentity,
    username: targetUsername,
    playerLevel: targetPlayerLevel,
    totalIncome,
    ...getLeaderboardPeriodValues(ctx, sourceEntry, totalIncome),
    updatedAt: ctx.timestamp,
  };

  if (targetEntry) {
    ctx.db.leaderboard.identity.update(nextEntry);
    return;
  }

  ctx.db.leaderboard.insert(nextEntry);
}

function copyAdminWorldEventLeaderboardEntries(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
  targetUsername: string,
  targetPlayerLevel: number,
) {
  deleteWorldEventLeaderboardForIdentity(ctx, targetIdentity);

  for (const entry of Array.from(ctx.db.worldEventLeaderboard.byIdentity.filter(sourceIdentity))) {
    ctx.db.worldEventLeaderboard.insert({
      ...entry,
      contributionKey: getWorldEventLeaderboardKey(
        targetIdentity,
        entry.periodKey,
        entry.eventId,
      ),
      identity: targetIdentity,
      username: targetUsername,
      points: clampWorldEventLeaderboardPoints(entry.points, targetPlayerLevel),
      playerLevel: targetPlayerLevel,
      updatedAt: ctx.timestamp,
    });
  }
}

function upsertAdminLeaderboardEntry(
  ctx: IdleWizardReducerCtx,
  player: { identity: Identity; username: string; playerLevel: number },
) {
  const username = normalizeUsername(player.username);
  const playerLevel = normalizePlayerLevel(player.playerLevel);
  const capPlayerLevel = getLeaderboardCapPlayerLevel(ctx, player.identity, playerLevel);
  const rawExistingEntry = ctx.db.leaderboard.identity.find(player.identity);
  const totalIncome = clampLeaderboardTotalIncome(
    rawExistingEntry?.totalIncome ?? 0n,
    capPlayerLevel,
  );
  const periods = rawExistingEntry
    ? getLeaderboardPeriodValues(ctx, rawExistingEntry, totalIncome)
    : getLeaderboardPeriodDefaults(ctx, totalIncome);

  if (rawExistingEntry) {
    ctx.db.leaderboard.identity.update({
      ...rawExistingEntry,
      username,
      playerLevel,
      totalIncome,
      ...periods,
      updatedAt: ctx.timestamp,
    });
    return;
  }

  ctx.db.leaderboard.insert({
    identity: player.identity,
    username,
    playerLevel,
    totalIncome,
    ...periods,
    updatedAt: ctx.timestamp,
  });
}

function updateAdminWorldEventLeaderboardProfile(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  username: string,
  playerLevel: number,
) {
  const safeUsername = normalizeUsername(username);
  const safePlayerLevel = normalizePlayerLevel(playerLevel);

  for (const entry of Array.from(ctx.db.worldEventLeaderboard.byIdentity.filter(identity))) {
    ctx.db.worldEventLeaderboard.contributionKey.update({
      ...entry,
      username: safeUsername,
      playerLevel: safePlayerLevel,
      points: clampWorldEventLeaderboardPoints(entry.points, safePlayerLevel),
      updatedAt: ctx.timestamp,
    });
  }
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

function normalizeSaveEmerald(value: unknown) {
  const emerald = isRecord(value) ? value : {};

  return {
    current: clampSaveInteger(emerald.current, 0, MAX_PLAYER_SAVE_CURRENT_EMERALD, 0),
  };
}

function normalizeSaveRuby(value: unknown) {
  const ruby = isRecord(value) ? value : {};

  return {
    current: clampSaveInteger(ruby.current, 0, MAX_PLAYER_SAVE_CURRENT_RUBY, 0),
  };
}

function normalizeSaveAutomation(value: unknown) {
  const automation = isRecord(value) ? value : {};

  return {
    seedSummoning: normalizeSaveSeedSummoningAutomation(automation.seedSummoning),
  };
}

function normalizeSaveSeedSummoningAutomation(value: unknown) {
  const seedSummoning = isRecord(value) ? value : {};

  return {
    enabled: seedSummoning.enabled !== false,
    manaReserve: clampSaveInteger(
      seedSummoning.manaReserve,
      0,
      MAX_PLAYER_SAVE_AUTO_SEED_MANA_RESERVE,
      0,
    ),
  };
}

function normalizeSaveSeedSummoning(
  value: unknown,
  itemCatalog: Map<string, string>,
) {
  const seedSummoning = isRecord(value) ? value : {};

  return {
    dropPreferences: normalizeSaveSeedDropPreferences(
      seedSummoning.dropPreferences,
      itemCatalog,
    ),
  };
}

function normalizeSaveSeedDropPreferences(
  value: unknown,
  itemCatalog: Map<string, string>,
) {
  const dropPreferences = isRecord(value) ? value : {};
  const normalized: Record<string, string> = {};

  for (const [seedKey, preference] of Object.entries(dropPreferences)) {
    const itemKey = normalizeSaveItemKey(seedKey);

    if (itemCatalog.get(itemKey) !== 'seed') {
      continue;
    }

    normalized[itemKey] = normalizeSaveSeedDropPreference(preference);
  }

  return normalized;
}

function normalizeSaveSeedDropPreference(value: unknown) {
  return value === 'none' || value === 'low' || value === 'high' ? value : 'medium';
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
  const highestLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;
  const normalizedCompletedLevels: number[] = [];

  for (let level = 10; level <= highestLevel; level += 10) {
    normalizedCompletedLevels.push(level);
  }

  return {
    completedLevels: normalizedCompletedLevels,
    runFocus: normalizeSavePrestigeRunFocus(prestige.runFocus),
  };
}

function normalizeSavePrestigeRunFocus(value: unknown) {
  const focus = String(value ?? '').trim();

  return focus === 'capacity' ||
    focus === 'automation' ||
    focus === 'research' ||
    focus === 'market'
    ? focus
    : 'none';
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
      character: normalizeSaveVisualSettingCategory(
        researched.character,
        PLAYER_CHARACTERS,
        DEFAULT_PLAYER_CHARACTER,
        player ? normalizePlayerCharacter(player.character) : null,
      ),
      progressBar: normalizeSaveVisualSettingCategory(
        researched.progressBar,
        PLAYER_PROGRESS_BARS,
        DEFAULT_PLAYER_PROGRESS_BAR,
        null,
      ),
      plotView: normalizeSaveVisualSettingCategory(
        researched.plotView,
        PLAYER_PLOT_VIEWS,
        DEFAULT_PLAYER_PLOT_VIEW,
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
    crystalCostById?: Record<string, number>;
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
    (total, researchId) =>
      total + getResearchCrystalCost(ctx, researchId, research.crystalCostById),
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

function getResearchCrystalCost(
  ctx: IdleWizardReducerCtx,
  researchId: string,
  crystalCostById?: Record<string, number>,
) {
  if (researchDefaultCostCrystalById[researchId] === undefined) {
    return 0;
  }

  const persistedCost = Number(crystalCostById?.[researchId]);

  if (Number.isInteger(persistedCost) && persistedCost >= 0) {
    return persistedCost;
  }

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
  const normalizedResearch = normalizeSaveResearch(save.research);
  const research = {
    ...normalizedResearch,
    crystalCostById: normalizeSaveResearchCrystalCosts(
      ctx,
      save.research,
      normalizedResearch,
    ),
  };
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

    const quantity = normalizeSaveItemQuantity(item.quantity);
    if (quantity <= 0) {
      continue;
    }

    quantityByItemKey.set(
      itemKey,
      normalizeSaveItemQuantity((quantityByItemKey.get(itemKey) ?? 0) + quantity),
    );
  }

  return [...quantityByItemKey.entries()].map(([itemKey, quantity]) => ({
    itemKey,
    quantity,
  }));
}

function getSaveInferredCapacityResearchIds(save: Record<string, unknown>) {
  return [
    ...getSaveInferredPlotCapacityResearchIds(save),
    ...getSaveInferredCauldronCapacityResearchIds(save),
  ];
}

function getSaveInferredPlotCapacityResearchIds(save: Record<string, unknown>) {
  const legacyCaps = getLegacySaveLevelLimits(save);
  const unlockedTiles = Math.min(
    getSaveInferredUnlockedTileCount(save.garden),
    legacyCaps.maxGardenTiles,
  );
  const maxPlotNumber = Math.min(
    plotCapacityResearchNumbers.at(-1) ?? 0,
    unlockedTiles,
  );
  const researchIds: string[] = [];

  for (const plotNumber of plotCapacityResearchNumbers) {
    if (plotNumber > maxPlotNumber) {
      break;
    }

    researchIds.push(`advanced:plotCapacity:${plotNumber}`);
  }

  return researchIds;
}

function getSaveInferredCauldronCapacityResearchIds(save: Record<string, unknown>) {
  const legacyCaps = getLegacySaveLevelLimits(save);
  const unlockedCauldrons = Math.min(
    getSaveInferredUnlockedCauldronCount(save.brewing),
    legacyCaps.maxCauldrons,
  );
  const maxCauldronNumber = Math.min(
    cauldronCapacityResearchNumbers.at(-1) ?? 0,
    unlockedCauldrons,
  );
  const researchIds: string[] = [];

  for (const cauldronNumber of cauldronCapacityResearchNumbers) {
    if (cauldronNumber > maxCauldronNumber) {
      break;
    }

    researchIds.push(`advanced:cauldronCapacity:${cauldronNumber}`);
  }

  return researchIds;
}

function getLegacySaveLevelLimits(save: Record<string, unknown>) {
  const tasks = isRecord(save.tasks) ? save.tasks : {};
  const currentLevel = Math.max(1, Math.floor(Number(tasks.currentLevel) || 1));
  const limits = {
    maxGardenTiles: 2,
    maxCauldrons: 1,
  };

  for (const [level, caps] of LEGACY_PLAYER_LEVEL_CAPS_BY_LEVEL.entries()) {
    if (level > currentLevel) {
      break;
    }

    limits.maxGardenTiles = caps.maxGardenTiles;
    limits.maxCauldrons = caps.maxCauldrons;
  }

  return limits;
}

function getSaveInferredUnlockedTileCount(value: unknown) {
  const garden = isRecord(value) ? value : {};
  const directCount = Math.floor(Number(garden.unlockedTiles));
  const tileCount = Array.isArray(garden.tiles)
    ? Math.max(
        0,
        ...garden.tiles
          .filter((tile): tile is Record<string, unknown> => isRecord(tile))
          .map((tile) => Math.floor(Number(tile.tileNumber)))
          .filter((tileNumber) => Number.isInteger(tileNumber) && tileNumber > 0),
      )
    : 0;

  return Math.max(Number.isInteger(directCount) ? directCount : 0, tileCount);
}

function getSaveInferredUnlockedCauldronCount(value: unknown) {
  const brewing = isRecord(value) ? value : {};
  const directCount = Math.floor(Number(brewing.unlockedCauldrons));

  if (Number.isInteger(directCount) && directCount > 0) {
    return directCount;
  }

  if (!Array.isArray(brewing.cauldrons)) {
    return 0;
  }

  return Math.max(
    0,
    ...brewing.cauldrons
      .filter((cauldron): cauldron is Record<string, unknown> =>
        isRecord(cauldron) && hasSavePersistedCauldronWork(cauldron),
      )
      .map((cauldron) => Math.floor(Number(cauldron.cauldronNumber)))
      .filter((cauldronNumber) => Number.isInteger(cauldronNumber) && cauldronNumber > 0),
  );
}

function hasSavePersistedCauldronWork(cauldron: Record<string, unknown>) {
  return (
    (Array.isArray(cauldron.cauldronItemKeys) && cauldron.cauldronItemKeys.length > 0) ||
    isRecord(cauldron.activeBrew) ||
    cauldron.autoBrewEnabled === true ||
    typeof cauldron.autoBrewRecipeKey === 'string'
  );
}

function normalizeSaveResearch(
  value: unknown,
  prestigeCount = 0,
  inferredCompletedIds: string[] = [],
) {
  const completedIds = isRecord(value) && Array.isArray(value.completedIds)
    ? value.completedIds
        .map((researchId) => normalizeResearchId(String(researchId ?? '')))
        .filter((researchId) => researchCatalogById.has(researchId))
    : [];
  const inferredIds = new Set(
    inferredCompletedIds
      .map((researchId) => normalizeResearchId(String(researchId ?? '')))
      .filter((researchId) => researchCatalogById.has(researchId)),
  );
  const requested = new Set([...completedIds, ...inferredIds]);
  const accepted = new Set<string>();

  for (const research of researchCatalog) {
    if (!requested.has(research.researchId)) {
      continue;
    }

    if (
      !inferredIds.has(research.researchId) &&
      getSaveRequiredPrestigeCount(research.researchId) > prestigeCount
    ) {
      continue;
    }

    const requiredIds = getSaveRequiredResearchIds(research.researchId);
    if (requiredIds.every((requiredId) => accepted.has(requiredId))) {
      accepted.add(research.researchId);
    }
  }

  return {
    completedIds: [...accepted],
    inProgress: normalizeSaveInProgressResearches(value, accepted, prestigeCount),
  };
}

function normalizeSaveResearchCrystalCosts(
  ctx: IdleWizardReducerCtx,
  value: unknown,
  research: {
    completedIds: string[];
    inProgress?: Array<{ researchId?: string }>;
  },
) {
  const storedCosts =
    isRecord(value) && isRecord(value.crystalCostById) ? value.crystalCostById : {};
  const committedResearchIds = new Set([
    ...research.completedIds,
    ...(Array.isArray(research.inProgress)
      ? research.inProgress
          .map((progress) => normalizeResearchId(String(progress?.researchId ?? '')))
          .filter((researchId) => researchDefaultCostCrystalById[researchId] !== undefined)
      : []),
  ]);
  const normalizedCosts: Record<string, number> = {};

  for (const researchId of committedResearchIds) {
    if (researchDefaultCostCrystalById[researchId] === undefined) {
      continue;
    }

    const defaultCost = getResearchCrystalCost(ctx, researchId);
    const legacyCost = getLegacyMultiplierResearchCrystalCost(researchId);
    const storedCost = Number(storedCosts[researchId]);

    normalizedCosts[researchId] =
      Number.isInteger(storedCost) &&
      storedCost >= 0 &&
      storedCost <= MAX_PLAYER_SAVE_CURRENT_CRYSTAL
        ? storedCost
        : (legacyCost ?? defaultCost);
  }

  return normalizedCosts;
}

function getLegacyMultiplierResearchCrystalCost(researchId: string): number | null {
  const match = /^emerald:(?:plotPlanting|cauldronBrewing):(\d+):(\d+)$/.exec(researchId);
  const multiplier = Number(match?.[2]);
  const firstMultiplier = emeraldResearchMultipliers[0] ?? 2;
  const lastMultiplier = emeraldResearchMultipliers.at(-1) ?? firstMultiplier;

  if (
    !Number.isInteger(multiplier) ||
    multiplier < firstMultiplier ||
    multiplier > lastMultiplier
  ) {
    return null;
  }

  return multiplier - firstMultiplier + 1;
}

function normalizeSaveInProgressResearches(
  value: unknown,
  completedIds: Set<string>,
  prestigeCount = 0,
) {
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
      inProgressIds.has(researchId) ||
      getSaveRequiredPrestigeCount(researchId) > prestigeCount
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

  const researchTimeMatch = /^advanced:researchTime:(\d+)$/.exec(researchId);
  if (researchTimeMatch) {
    const level = Number(researchTimeMatch[1]);
    return level > 1 ? [`advanced:researchTime:${level - 1}`] : [];
  }

  const researchCostMatch = /^emerald:researchCost:(\d+)$/.exec(researchId);
  if (researchCostMatch) {
    const level = Number(researchCostMatch[1]);
    return level > 1 ? [`emerald:researchCost:${level - 1}`] : [];
  }

  const automationReserveMatch = /^advanced:automationReserve:(\d+)$/.exec(
    researchId,
  );
  if (automationReserveMatch) {
    const level = Number(automationReserveMatch[1]);
    return level > 1 ? [`advanced:automationReserve:${level - 1}`] : [];
  }

  const advancedMatch = /^advanced:([^:]+):(\d+):(\d+)$/.exec(researchId);
  if (advancedMatch) {
    const targetNumber = Number(advancedMatch[2]);
    const level = Number(advancedMatch[3]);
    return level > 1
      ? [`advanced:${advancedMatch[1]}:${targetNumber}:${level - 1}`]
      : [];
  }

  const emeraldMatch = /^emerald:([^:]+):(\d+):(\d+)$/.exec(researchId);
  if (emeraldMatch) {
    const targetNumber = Number(emeraldMatch[2]);
    const multiplier = Number(emeraldMatch[3]);
    return multiplier > emeraldResearchMultipliers[0]
      ? [`emerald:${emeraldMatch[1]}:${targetNumber}:${multiplier - 1}`]
      : [];
  }

  const plotCapacityMatch = /^advanced:plotCapacity:(\d+)$/.exec(researchId);
  if (plotCapacityMatch) {
    const plotNumber = Number(plotCapacityMatch[1]);
    return plotNumber > plotCapacityResearchNumbers[0]
      ? [`advanced:plotCapacity:${plotNumber - 1}`]
      : [];
  }

  const cauldronCapacityMatch = /^advanced:cauldronCapacity:(\d+)$/.exec(researchId);
  if (cauldronCapacityMatch) {
    const cauldronNumber = Number(cauldronCapacityMatch[1]);
    return cauldronNumber > cauldronCapacityResearchNumbers[0]
      ? [`advanced:cauldronCapacity:${cauldronNumber - 1}`]
      : [];
  }

  return [];
}

function getSaveRequiredPrestigeCount(researchId: string): number {
  if (/^advanced:automationReserve:(\d+)$/.test(researchId)) {
    return AUTOMATION_RESERVE_REQUIRED_PRESTIGE_COUNT;
  }

  const advancedRoomStudyMatch = /^advanced:(cauldronBrewing|plotGrowth):(\d+):(\d+)$/.exec(
    researchId,
  );
  if (advancedRoomStudyMatch) {
    const level = Number(advancedRoomStudyMatch[3]);
    return level >= 6 ? STRONGER_ROOM_STUDY_REQUIRED_PRESTIGE_COUNT : 0;
  }

  const plotCapacityMatch = /^advanced:plotCapacity:(\d+)$/.exec(researchId);
  if (plotCapacityMatch) {
    const plotNumber = Number(plotCapacityMatch[1]);
    return plotCapacityResearchNumbers.includes(plotNumber) ? plotNumber - 5 : 0;
  }

  const cauldronCapacityMatch = /^advanced:cauldronCapacity:(\d+)$/.exec(researchId);
  if (cauldronCapacityMatch) {
    const cauldronNumber = Number(cauldronCapacityMatch[1]);
    return cauldronCapacityResearchNumbers.includes(cauldronNumber)
      ? cauldronNumber - 2
      : 0;
  }

  return 0;
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

  const coinOffer = normalizeSaveShopCoinOffer(shop.coinOffer ?? shop.goldOffer);

  return {
    shelf,
    playerShelf,
    playerRequests,
    coinOffer,
    goldOffer: coinOffer,
  };
}

function normalizeSaveShopCoinOffer(value: unknown) {
  const offer = isRecord(value) ? value : {};

  return {
    cooldownRemainingSeconds: clampSaveNumber(
      offer.cooldownRemainingSeconds,
      0,
      MAX_PLAYER_SAVE_SHOP_COIN_OFFER_COOLDOWN_SECONDS,
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
          autoBrewArmed: brewing.autoBrewArmed,
          autoBrewRecipeKey: brewing.autoBrewRecipeKey,
          brewQuantity: brewing.brewQuantity,
        },
      ];
  const cauldronsByNumber = new Map<
    number,
    {
      cauldronNumber: number;
      cauldronItemKeys: string[];
      activeBrew: ReturnType<typeof normalizeSaveActiveBrew>;
      autoBrewEnabled: boolean;
      autoBrewArmed: boolean;
      autoBrewRecipeKey: string | null;
      brewQuantity: number | null;
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
    const autoBrewArmed =
      sourceCauldron.autoBrewArmed ??
      (cauldronNumber === 1 ? brewing.autoBrewArmed : undefined);
    const automationState = normalizeSaveCauldronAutomationState({
      autoBrewEnabled,
      autoBrewArmed,
      autoBrewRecipeKey: safeAutoBrewRecipeKey,
    });
    const brewQuantity = normalizeSaveSelectedNumber(
      sourceCauldron.brewQuantity ?? (cauldronNumber === 1 ? brewing.brewQuantity : null),
      MAX_PLAYER_SAVE_BATCH_MULTIPLIER,
    );

    cauldronsByNumber.set(cauldronNumber, {
      cauldronNumber,
      cauldronItemKeys: normalizeSaveCauldronItemKeys(
        sourceCauldron.cauldronItemKeys,
        itemCatalog,
      ),
      activeBrew: normalizeSaveActiveBrew(sourceCauldron.activeBrew, itemCatalog),
      ...automationState,
      brewQuantity,
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
      autoBrewArmed: false,
      autoBrewRecipeKey: null,
      brewQuantity: null,
    };

  return {
    autoBrewEnabled: primaryCauldron.autoBrewEnabled,
    autoBrewArmed: primaryCauldron.autoBrewArmed,
    autoBrewRecipeKey: primaryCauldron.autoBrewRecipeKey,
    brewQuantity: primaryCauldron.brewQuantity,
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
      autoBrewArmed: boolean;
      autoBrewRecipeKey: string | null;
      brewQuantity: number | null;
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
    resultQuantity: clampSaveInteger(
      value.resultQuantity,
      1,
      MAX_PLAYER_SAVE_BATCH_MULTIPLIER,
      1,
    ),
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
  const harvestQuantity = clampSaveInteger(
    value.harvestQuantity,
    1,
    MAX_PLAYER_SAVE_BATCH_MULTIPLIER,
    1,
  );
  const hasSeed = itemCatalog.get(seedItemKey) === 'seed';
  const hasHerb = itemCatalog.get(herbItemKey) === 'herb';

  return {
    tileNumber,
    selectedSeedItemKey: itemCatalog.get(selectedSeedItemKey) === 'seed'
      ? selectedSeedItemKey
      : null,
    seedItemKey: hasSeed && phase !== 'empty' ? seedItemKey : null,
    herbItemKey: hasHerb && phase !== 'empty' ? herbItemKey : null,
    harvestQuantity,
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

function applySaveCapacityResearchLimits(
  limits: ReturnType<typeof getSaveLevelLimits>,
  research: ReturnType<typeof normalizeSaveResearch>,
) {
  const nextLimits = { ...limits };
  const completedPlotCapacityBonus = countSequentialCompletedResearch(
    research.completedIds,
    plotCapacityResearchNumbers,
    (plotNumber) => `advanced:plotCapacity:${plotNumber}`,
  );

  if (completedPlotCapacityBonus > 0) {
    nextLimits.maxGardenTiles = Math.min(
      MAX_GAME_CONFIG_RESOURCE_LIMIT,
      Math.max(
        nextLimits.maxGardenTiles,
        plotCapacityResearchNumbers[0] - 1 + completedPlotCapacityBonus,
      ),
    );
  }
  const completedCauldronCapacityBonus = countSequentialCompletedResearch(
    research.completedIds,
    cauldronCapacityResearchNumbers,
    (cauldronNumber) => `advanced:cauldronCapacity:${cauldronNumber}`,
  );

  if (completedCauldronCapacityBonus > 0) {
    nextLimits.maxCauldrons = Math.min(
      MAX_PLAYER_SAVE_CAULDRONS,
      Math.max(
        nextLimits.maxCauldrons,
        cauldronCapacityResearchNumbers[0] - 1 + completedCauldronCapacityBonus,
      ),
    );
  }

  return nextLimits;
}

function countSequentialCompletedResearch(
  completedIds: string[],
  targetNumbers: number[],
  getResearchId: (targetNumber: number) => string,
) {
  const completed = new Set(completedIds);
  let count = 0;

  for (const targetNumber of targetNumbers) {
    if (!completed.has(getResearchId(targetNumber))) {
      break;
    }

    count += 1;
  }

  return count;
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

  const contributionKey = getTradeAllianceContributionKey(
    alliance.allianceId,
    alliance.seasonKey,
    quest.id,
    member.memberIdentity,
  );
  const contribution = ctx.db.tradeAllianceQuestContribution.contributionKey.find(
    contributionKey,
  );
  const currentContribution = toBigInt(contribution?.contribution ?? 0n);
  const remainingProgress =
    progress.progress < progress.target ? progress.target - progress.progress : 0n;
  const missingContribution =
    currentContribution < progress.minContribution
      ? progress.minContribution - currentContribution
      : 0n;
  const maxFill = remainingProgress > missingContribution ? remainingProgress : missingContribution;

  if (delta > maxFill) {
    throw new Error('Alliance quest fill exceeds needed amount.');
  }

  const nextProgress =
    progress.progress + delta > progress.target ? progress.target : progress.progress + delta;
  if (nextProgress !== progress.progress) {
    ctx.db.tradeAllianceQuestProgress.questKey.update({
      ...progress,
      progress: nextProgress,
      updatedAt: ctx.timestamp,
    });
  }
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
    const gold = isRecord(save) ? readSaveCoinBranch(save) : {};
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

    const emerald = isRecord(save.emerald) ? save.emerald : {};
    const currentEmerald = Math.floor(Number(emerald.current));
    if (Number.isFinite(currentEmerald) && currentEmerald > 0) {
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
    crystalCostById: normalizeSaveResearchCrystalCosts(
      ctx,
      {
        crystalCostById: {
          ...(isRecord(previousSave.research) && isRecord(previousSave.research.crystalCostById)
            ? previousSave.research.crystalCostById
            : {}),
          ...(isRecord(safeSave.research) && isRecord(safeSave.research.crystalCostById)
            ? safeSave.research.crystalCostById
            : {}),
        },
      },
      {
        completedIds: mergedCompletedIds,
        inProgress: mergedInProgress,
      },
    ),
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

function getPendingAdminCurrencyGrants(ctx: IdleWizardReducerCtx, identity: Identity) {
  const identityKey = getIdentityHex(identity);
  const pendingPrefix = `player-currency-grant-pending:${identityKey}:`;
  const appliedPrefix = `player-currency-grant-applied:${identityKey}:`;
  const grants: {
    grantKey: string;
    emeraldAmount: number;
    rubyAmount: number;
    crystalAmount: number;
  }[] = [];

  for (const state of Array.from(ctx.db.maintenanceState.iter())) {
    const stateKey = String(state.stateKey ?? '');
    if (!stateKey.startsWith(pendingPrefix)) {
      continue;
    }

    const parts = stateKey.slice(pendingPrefix.length).split(':');
    if (parts.length < 4) {
      continue;
    }

    const emeraldAmount = assertAdminCurrencyGrantAmount(
      Number(parts[0]),
      MAX_PLAYER_SAVE_CURRENT_EMERALD,
      'emerald',
    );
    const rubyAmount = assertAdminCurrencyGrantAmount(
      Number(parts[1]),
      MAX_PLAYER_SAVE_CURRENT_RUBY,
      'ruby',
    );
    const crystalAmount = assertAdminCurrencyGrantAmount(
      Number(parts[2]),
      MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
      'crystal',
    );
    const grantKey = parts.slice(3).join(':');

    if (!grantKey || ctx.db.maintenanceState.stateKey.find(`${appliedPrefix}${grantKey}`)) {
      continue;
    }

    grants.push({
      grantKey,
      emeraldAmount,
      rubyAmount,
      crystalAmount,
    });
  }

  return grants;
}

function getSaveBranchCurrent(
  save: Record<string, unknown>,
  branchKey: string,
  maxAmount: number,
): number {
  const branch = isRecord(save[branchKey]) ? save[branchKey] : {};
  return clampSaveInteger(branch.current, 0, maxAmount, 0);
}

function setSaveBranchCurrent(
  save: Record<string, unknown>,
  branchKey: string,
  current: number,
) {
  const branch = isRecord(save[branchKey]) ? save[branchKey] : {};
  save[branchKey] = {
    ...branch,
    current,
  };
}

function mergeAdminGrantedSaveBranchCurrent(
  safeSave: Record<string, unknown>,
  previousSave: Record<string, unknown>,
  branchKey: string,
  maxAmount: number,
): boolean {
  const safeCurrent = getSaveBranchCurrent(safeSave, branchKey, maxAmount);
  const previousCurrent = getSaveBranchCurrent(previousSave, branchKey, maxAmount);

  if (safeCurrent >= previousCurrent) {
    return false;
  }

  setSaveBranchCurrent(safeSave, branchKey, previousCurrent);
  return true;
}

function hasAcknowledgedAdminCurrencyGrant(
  safeSave: Record<string, unknown>,
  previousSave: Record<string, unknown>,
  grant: ReturnType<typeof getPendingAdminCurrencyGrants>[number],
): boolean {
  return (
    (grant.emeraldAmount <= 0 ||
      getSaveBranchCurrent(safeSave, 'emerald', MAX_PLAYER_SAVE_CURRENT_EMERALD) >=
        getSaveBranchCurrent(previousSave, 'emerald', MAX_PLAYER_SAVE_CURRENT_EMERALD)) &&
    (grant.rubyAmount <= 0 ||
      getSaveBranchCurrent(safeSave, 'ruby', MAX_PLAYER_SAVE_CURRENT_RUBY) >=
        getSaveBranchCurrent(previousSave, 'ruby', MAX_PLAYER_SAVE_CURRENT_RUBY)) &&
    (grant.crystalAmount <= 0 ||
      getSaveBranchCurrent(safeSave, 'crystal', MAX_PLAYER_SAVE_CURRENT_CRYSTAL) >=
        getSaveBranchCurrent(previousSave, 'crystal', MAX_PLAYER_SAVE_CURRENT_CRYSTAL))
  );
}

function markAdminCurrencyGrantApplied(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  grantKey: string,
) {
  const stateKey = `player-currency-grant-applied:${getIdentityHex(identity)}:${grantKey}`;
  if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
    return;
  }

  ctx.db.maintenanceState.insert({
    stateKey,
    appliedAt: ctx.timestamp,
  });
}

function mergePendingAdminCurrencyGrantsIntoSaveJson(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  safeSaveJson: string,
  previousSaveJson?: string,
): string {
  const grants = getPendingAdminCurrencyGrants(ctx, identity);
  if (grants.length === 0 || !previousSaveJson) {
    return safeSaveJson;
  }

  const safeSave = parsePlayerGameplaySaveJson(safeSaveJson);
  const previousSave = parsePlayerGameplaySaveJson(previousSaveJson);
  if (!safeSave || !previousSave) {
    return safeSaveJson;
  }

  let changed = false;

  for (const grant of grants) {
    if (hasAcknowledgedAdminCurrencyGrant(safeSave, previousSave, grant)) {
      markAdminCurrencyGrantApplied(ctx, identity, grant.grantKey);
      continue;
    }

    if (grant.emeraldAmount > 0) {
      changed =
        mergeAdminGrantedSaveBranchCurrent(
          safeSave,
          previousSave,
          'emerald',
          MAX_PLAYER_SAVE_CURRENT_EMERALD,
        ) || changed;
    }

    if (grant.rubyAmount > 0) {
      changed =
        mergeAdminGrantedSaveBranchCurrent(
          safeSave,
          previousSave,
          'ruby',
          MAX_PLAYER_SAVE_CURRENT_RUBY,
        ) || changed;
    }

    if (grant.crystalAmount > 0) {
      changed =
        mergeAdminGrantedSaveBranchCurrent(
          safeSave,
          previousSave,
          'crystal',
          MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
        ) || changed;
    }
  }

  if (!changed) {
    return safeSaveJson;
  }

  const mergedSaveJson = JSON.stringify(safeSave);
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

function normalizeSaveItemQuantity(value: unknown): number {
  const number = Math.floor(Number(value));

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return number;
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

    if (
      (level as { completionCostCoin?: unknown }).completionCostCoin !== undefined &&
      (!Number.isInteger(Number((level as { completionCostCoin?: unknown }).completionCostCoin)) ||
        Number((level as { completionCostCoin?: unknown }).completionCostCoin) < 0)
    ) {
      throw new Error('Invalid tasks config completion cost.');
    }

    for (const taskConfig of level.tasks) {
      const task = taskConfig as {
        id?: unknown;
        itemKey?: unknown;
        researchId?: unknown;
        type?: unknown;
        quantity?: unknown;
      };
      const taskId = normalizeResearchId(String(task.id ?? ''));
      const itemKey = normalizeNpcMarketItemKey(String(task.itemKey ?? ''));
      const taskType = normalizeTasksConfigTaskType(task.type);
      const quantity = Number(task.quantity);

      if (!taskId || seenTaskIds.has(taskId)) {
        throw new Error('Invalid tasks config task id.');
      }

      if (!taskType) {
        throw new Error('Invalid tasks config task type.');
      }

      if (taskType === 'research') {
        const researchId = normalizeResearchId(String(task.researchId ?? ''));

        if (!isValidTasksConfigResearchId(researchId)) {
          throw new Error('Invalid tasks config research.');
        }

        if (itemKey && !npcMarketCatalogByItemKey.has(itemKey)) {
          throw new Error('Invalid tasks config item.');
        }
      } else if (!npcMarketCatalogByItemKey.has(itemKey)) {
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

function normalizeTasksConfigTaskType(type: unknown): string | null {
  if (type === undefined || type === null || type === '' || type === 'drop') {
    return 'turnIn';
  }

  const value = String(type).trim();

  return ['turnIn', 'research', 'summon', 'grow', 'brew', 'sell'].includes(value)
    ? value
    : null;
}

function isValidTasksConfigResearchId(researchId: string): boolean {
  if (!researchId) {
    return false;
  }

  if (researchId.startsWith('unlockSeed:')) {
    return npcMarketCatalogByItemKey.has(
      normalizeNpcMarketItemKey(researchId.slice('unlockSeed:'.length)),
    );
  }

  if (researchId.startsWith('unlockRecipe:')) {
    return npcMarketCatalogByItemKey.has(
      normalizeNpcMarketItemKey(researchId.slice('unlockRecipe:'.length)),
    );
  }

  return false;
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

  validatePlayerLevelManaConfig(config.mana, maxLevel);
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

function validatePlayerLevelManaConfig(value: unknown, maxLevel: number) {
  if (value === undefined || value === null) {
    return;
  }

  const mana = value as Record<string, unknown>;

  for (const key of [
    'baseMaxManaCap',
    'maxManaCapPerLevel',
    'baseManaPerSecond',
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

  const ranges = mana.manaPerSecondPerLevelRanges ?? mana.perSecondPerLevelRanges;

  if (ranges !== undefined) {
    validatePlayerLevelManaRangeConfig(ranges, maxLevel);
    return;
  }

  const perLevel = Number(mana.manaPerSecondPerLevel ?? mana.perSecondPerLevel);

  if (
    !Number.isFinite(perLevel) ||
    perLevel < 0 ||
    perLevel > MAX_GAME_CONFIG_RESOURCE_LIMIT
  ) {
    throw new Error('Invalid player level mana config.');
  }
}

function validatePlayerLevelManaRangeConfig(value: unknown, maxLevel: number) {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_GAME_CONFIG_LEVELS
  ) {
    throw new Error('Invalid player level mana config.');
  }

  let expectedFromLevel = 2;

  for (const rangeValue of value) {
    if (!isRecord(rangeValue)) {
      throw new Error('Invalid player level mana config.');
    }

    const fromLevel = Number(rangeValue.fromLevel ?? rangeValue.minLevel ?? rangeValue.level);
    const toLevel = Number(rangeValue.toLevel ?? rangeValue.maxLevel ?? maxLevel);
    const amount = Number(rangeValue.amount ?? rangeValue.perLevel ?? rangeValue.perSecond);

    if (
      !Number.isInteger(fromLevel) ||
      !Number.isInteger(toLevel) ||
      fromLevel !== expectedFromLevel ||
      toLevel < fromLevel ||
      toLevel > maxLevel ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MAX_GAME_CONFIG_RESOURCE_LIMIT
    ) {
      throw new Error('Invalid player level mana config.');
    }

    expectedFromLevel = toLevel + 1;
  }

  if (maxLevel > 1 && expectedFromLevel !== maxLevel + 1) {
    throw new Error('Invalid player level mana config.');
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
    researchCostsEmerald?: unknown;
    researchDurationsSeconds?: unknown;
  };

  validateCostRecord(config.researchCostsGold, MAX_RESEARCH_COST_GOLD);
  validateCostRecord(config.researchCostsCrystal, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));
  validateCostRecord(config.researchCostsRuby, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));
  validateCostRecord(config.researchCostsEmerald, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));

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

  for (const category of [
    'theme',
    'font',
    'color',
    'character',
    'progressBar',
    'plotView',
    'icons',
  ]) {
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

function getWorldEventLeaderboardPointsCap(playerLevel: number): bigint {
  if (!ENABLE_CLIENT_REPORTED_WORLD_EVENT_POINTS) {
    return 0n;
  }

  return BigInt(normalizePlayerLevel(playerLevel)) * WORLD_EVENT_LEADERBOARD_POINTS_CAP_PER_LEVEL;
}

function clampWorldEventLeaderboardPoints(points: bigint, playerLevel: number): bigint {
  return clampBigInt(points, 0n, getWorldEventLeaderboardPointsCap(playerLevel));
}

function normalizeReportedWorldEventLeaderboardPoints(
  points: bigint,
  playerLevel: number,
): bigint | null {
  const safePoints = toBigInt(points);
  const maxPoints = getWorldEventLeaderboardPointsCap(playerLevel);

  if (safePoints > maxPoints) {
    return null;
  }

  return safePoints;
}

function getWorldEventLeaderboardKey(
  identity: Identity,
  periodKey: string,
  eventId: string,
): string {
  return `${periodKey}:${eventId}:${getIdentityHex(identity)}`;
}

type PlayerInboxItemReward = {
  itemKey: string;
  quantity: number;
};

type PlayerInboxRewardPayload = {
  coinReward: bigint;
  crystalReward: number;
  rubyReward: number;
  emeraldReward: number;
  itemRewards: PlayerInboxItemReward[];
  itemRewardsJson: string;
  rewardText: string;
  hasReward: boolean;
};

function normalizePlayerInboxText(
  value: unknown,
  maxLength: number,
  fallback = '',
): string {
  const text = stripUnsafeTextControls(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);

  return text || fallback;
}

function normalizePlayerInboxSourceType(value: unknown): string {
  const sourceType = normalizePlayerInboxText(
    value,
    MAX_PLAYER_INBOX_SOURCE_TYPE_LENGTH,
    'system',
  )
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, MAX_PLAYER_INBOX_SOURCE_TYPE_LENGTH);

  return sourceType || 'system';
}

function normalizePlayerInboxSourceKey(value: unknown): string {
  const sourceKey = stripUnsafeTextControls(String(value ?? ''))
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, MAX_PLAYER_INBOX_SOURCE_KEY_LENGTH);

  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/.test(sourceKey)) {
    throw new Error('Inbox mail source key is required.');
  }

  return sourceKey;
}

function normalizePlayerInboxMailKeyPart(value: unknown, maxLength: number): string {
  const part = stripUnsafeTextControls(String(value ?? ''))
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9:_-]/g, '')
    .slice(0, maxLength);

  if (!part) {
    throw new Error('Inbox mail key part is required.');
  }

  return part;
}

function getPlayerInboxMailKey(
  sourceType: string,
  sourceKey: string,
  recipientIdentity: Identity,
): string {
  return [
    normalizePlayerInboxMailKeyPart(sourceType, MAX_PLAYER_INBOX_SOURCE_TYPE_LENGTH),
    normalizePlayerInboxMailKeyPart(sourceKey, MAX_PLAYER_INBOX_SOURCE_KEY_LENGTH),
    getIdentityHex(recipientIdentity),
  ]
    .join(':')
    .slice(0, MAX_PLAYER_INBOX_MAIL_KEY_LENGTH);
}

function normalizePlayerInboxCoinReward(value: unknown): bigint {
  const reward = typeof value === 'bigint' ? value : toBigInt(Number(value));

  if (reward < 0n || reward > BigInt(MAX_PLAYER_INBOX_COIN_REWARD)) {
    throw new Error('Invalid inbox coin reward.');
  }

  return reward;
}

function normalizePlayerInboxCurrencyReward(
  value: unknown,
  maxAmount: number,
  label: string,
): number {
  const reward = Math.floor(Number(value));

  if (!Number.isFinite(reward) || reward < 0 || reward > maxAmount) {
    throw new Error(`Invalid inbox ${label} reward.`);
  }

  return reward;
}

function normalizePlayerInboxItemRewards(
  ctx: IdleWizardReducerCtx,
  itemRewardsJson: unknown,
): PlayerInboxItemReward[] {
  const rawJson = String(itemRewardsJson ?? '[]').trim() || '[]';

  if (rawJson.length > MAX_PLAYER_INBOX_ITEM_REWARDS_JSON_LENGTH) {
    throw new Error('Invalid inbox item rewards length.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid inbox item rewards JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid inbox item rewards.');
  }

  if (parsed.length > MAX_PLAYER_INBOX_ITEM_REWARDS) {
    throw new Error('Too many inbox item rewards.');
  }

  const itemCatalog = getSaveItemCatalog(ctx);
  const quantityByItemKey = new Map<string, number>();

  for (const item of parsed) {
    if (!isRecord(item)) {
      continue;
    }

    const itemKey = normalizeSaveItemKey(item.itemKey);
    if (!itemCatalog.has(itemKey)) {
      throw new Error('Invalid inbox item reward key.');
    }

    const quantity = Math.floor(Number(item.quantity));
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > MAX_PLAYER_INBOX_ITEM_REWARD_QUANTITY
    ) {
      throw new Error('Invalid inbox item reward quantity.');
    }

    quantityByItemKey.set(
      itemKey,
      clampNumber(
        (quantityByItemKey.get(itemKey) ?? 0) + quantity,
        1,
        MAX_PLAYER_INBOX_ITEM_REWARD_QUANTITY,
      ),
    );
  }

  return [...quantityByItemKey.entries()].map(([itemKey, quantity]) => ({
    itemKey,
    quantity: Math.floor(quantity),
  }));
}

function createPlayerInboxRewardText({
  coinReward,
  crystalReward,
  rubyReward,
  emeraldReward,
  itemRewards,
}: Omit<PlayerInboxRewardPayload, 'itemRewardsJson' | 'rewardText' | 'hasReward'>): string {
  const parts: string[] = [];

  if (coinReward > 0n) {
    parts.push(`${coinReward.toString()} coin`);
  }

  if (crystalReward > 0) {
    parts.push(`${crystalReward} crystal`);
  }

  if (rubyReward > 0) {
    parts.push(`${rubyReward} ruby`);
  }

  if (emeraldReward > 0) {
    parts.push(`${emeraldReward} emerald`);
  }

  for (const itemReward of itemRewards) {
    parts.push(`${itemReward.quantity} ${itemReward.itemKey}`);
  }

  return parts.join(', ').slice(0, MAX_PLAYER_INBOX_REWARD_TEXT_LENGTH);
}

function normalizePlayerInboxRewards(
  ctx: IdleWizardReducerCtx,
  {
    coinReward,
    crystalReward,
    rubyReward,
    emeraldReward,
    itemRewardsJson,
  }: {
    coinReward: unknown;
    crystalReward: unknown;
    rubyReward: unknown;
    emeraldReward: unknown;
    itemRewardsJson: unknown;
  },
): PlayerInboxRewardPayload {
  const normalized = {
    coinReward: normalizePlayerInboxCoinReward(coinReward),
    crystalReward: normalizePlayerInboxCurrencyReward(
      crystalReward,
      MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
      'crystal',
    ),
    rubyReward: normalizePlayerInboxCurrencyReward(
      rubyReward,
      MAX_PLAYER_SAVE_CURRENT_RUBY,
      'ruby',
    ),
    emeraldReward: normalizePlayerInboxCurrencyReward(
      emeraldReward,
      MAX_PLAYER_SAVE_CURRENT_EMERALD,
      'emerald',
    ),
    itemRewards: normalizePlayerInboxItemRewards(ctx, itemRewardsJson),
  };
  const rewardText = createPlayerInboxRewardText(normalized);
  const hasReward =
    normalized.coinReward > 0n ||
    normalized.crystalReward > 0 ||
    normalized.rubyReward > 0 ||
    normalized.emeraldReward > 0 ||
    normalized.itemRewards.length > 0;

  return {
    ...normalized,
    itemRewardsJson: JSON.stringify(normalized.itemRewards),
    rewardText,
    hasReward,
  };
}

function insertPlayerInboxMail(
  ctx: IdleWizardReducerCtx,
  {
    recipientIdentity,
    sourceType,
    sourceKey,
    senderLabel,
    title,
    body,
    rewards,
  }: {
    recipientIdentity: Identity;
    sourceType: string;
    sourceKey: string;
    senderLabel: string;
    title: string;
    body: string;
    rewards: PlayerInboxRewardPayload;
  },
): boolean {
  const safeSourceType = normalizePlayerInboxSourceType(sourceType);
  const safeSourceKey = normalizePlayerInboxSourceKey(sourceKey);
  const mailKey = getPlayerInboxMailKey(safeSourceType, safeSourceKey, recipientIdentity);

  if (ctx.db.playerInboxMail.mailKey.find(mailKey)) {
    return false;
  }

  ctx.db.playerInboxMail.insert({
    mailKey,
    recipientIdentity,
    sourceType: safeSourceType,
    sourceKey: safeSourceKey,
    senderLabel: normalizePlayerInboxText(
      senderLabel,
      MAX_PLAYER_INBOX_SENDER_LABEL_LENGTH,
      'system',
    ),
    title: normalizePlayerInboxText(title, MAX_PLAYER_INBOX_TITLE_LENGTH, 'message'),
    body: normalizePlayerInboxText(body, MAX_PLAYER_INBOX_BODY_LENGTH),
    rewardText: rewards.rewardText,
    coinReward: rewards.coinReward,
    crystalReward: rewards.crystalReward,
    rubyReward: rewards.rubyReward,
    emeraldReward: rewards.emeraldReward,
    itemRewardsJson: rewards.itemRewardsJson,
    createdAt: ctx.timestamp,
    read: false,
    rewardCollected: !rewards.hasReward,
  });
  prunePlayerInboxMail(ctx, recipientIdentity);
  return true;
}

function prunePlayerInboxMail(ctx: IdleWizardReducerCtx, identity: Identity) {
  const rows = Array.from(ctx.db.playerInboxMail.byRecipientIdentity.filter(identity)).sort(
    (left, right) => {
      const leftCreatedAt = left.createdAt.microsSinceUnixEpoch;
      const rightCreatedAt = right.createdAt.microsSinceUnixEpoch;

      if (leftCreatedAt < rightCreatedAt) {
        return -1;
      }

      if (leftCreatedAt > rightCreatedAt) {
        return 1;
      }

      return left.mailKey.localeCompare(right.mailKey);
    },
  );
  let excess = rows.length - PLAYER_INBOX_HISTORY_LIMIT;

  if (excess <= 0) {
    return;
  }

  for (const row of rows) {
    if (excess <= 0) {
      return;
    }

    if (!row.read || !row.rewardCollected) {
      continue;
    }

    ctx.db.playerInboxMail.delete(row);
    excess -= 1;
  }
}

function getOwnPlayerInboxMailRows(ctx: { sender: Identity; db: any }): any[] {
  return Array.from<any>(ctx.db.playerInboxMail.byRecipientIdentity.filter(ctx.sender))
    .sort((left, right) => {
      const leftCreatedAt = left.createdAt.microsSinceUnixEpoch;
      const rightCreatedAt = right.createdAt.microsSinceUnixEpoch;

      if (leftCreatedAt < rightCreatedAt) {
        return 1;
      }

      if (leftCreatedAt > rightCreatedAt) {
        return -1;
      }

      return left.mailKey.localeCompare(right.mailKey);
    })
    .slice(0, PLAYER_INBOX_HISTORY_LIMIT);
}

function findOwnPlayerInboxMail(ctx: IdleWizardReducerCtx, mailKey: unknown) {
  const safeMailKey = String(mailKey ?? '').trim().slice(0, MAX_PLAYER_INBOX_MAIL_KEY_LENGTH);
  const mail = ctx.db.playerInboxMail.mailKey.find(safeMailKey);

  if (!mail || !mail.recipientIdentity.isEqual(ctx.sender)) {
    return null;
  }

  return mail;
}

function getWorldEventRewardTier(rank: number) {
  return (
    WORLD_EVENT_REWARD_TIERS.find(
      (tier) => rank >= tier.minRank && rank <= tier.maxRank,
    ) ?? null
  );
}

function getWorldEventSettlementStateKey(periodKey: string, eventId: string): string {
  return `${WORLD_EVENT_REWARD_SETTLEMENT_STATE_PREFIX}:${periodKey}:${eventId}`;
}

function formatWorldEventHeadline(eventId: string): string {
  return normalizePlayerInboxText(
    normalizeWorldEventId(eventId).replace(/-/g, ' '),
    MAX_PLAYER_INBOX_TITLE_LENGTH,
    eventId,
  );
}

function ensureWorldEventRewardSettlementTick(ctx: IdleWizardReducerCtx) {
  if (ctx.db.worldEventRewardSettlementTick.tickId.find(1n)) {
    return;
  }

  ctx.db.worldEventRewardSettlementTick.insert({
    tickId: 1n,
    scheduledAt: ScheduleAt.interval(WORLD_EVENT_REWARD_SETTLEMENT_INTERVAL_MICROS),
  });
}

function settleWorldEventInboxRewards(
  ctx: IdleWizardReducerCtx,
  {
    periodKey,
    eventId,
    headline,
    markSettled = false,
  }: {
    periodKey: string;
    eventId: string;
    headline: string;
    markSettled?: boolean;
  },
) {
  const safePeriodKey = normalizeWorldEventPeriodKey(periodKey);
  const safeEventId = normalizeWorldEventId(eventId);
  if (!safePeriodKey || !safeEventId) {
    throw new Error('Invalid world event reward settlement key.');
  }

  const stateKey = getWorldEventSettlementStateKey(safePeriodKey, safeEventId);
  if (markSettled && ctx.db.maintenanceState.stateKey.find(stateKey)) {
    return 0;
  }

  const eventEntries = Array.from(ctx.db.worldEventLeaderboard.byPeriodKey.filter(safePeriodKey))
    .filter((entry) => normalizeWorldEventId(entry.eventId) === safeEventId);
  const rankedEntries = getRankedWorldEventLeaderboardEntries(eventEntries);
  const eventHeadline =
    normalizePlayerInboxText(headline, MAX_PLAYER_INBOX_TITLE_LENGTH) || safeEventId;
  const sourceKey = `${safePeriodKey}:${safeEventId}`;
  let insertedMailCount = 0;

  rankedEntries.forEach((entry, index) => {
    const points = toBigInt(entry.points);
    if (points < WORLD_EVENT_REWARD_QUALIFICATION_POINTS) {
      return;
    }

    const player = ctx.db.player.identity.find(entry.identity);
    if (!player) {
      return;
    }

    const rank = index + 1;
    const tier = getWorldEventRewardTier(rank);
    if (!tier) {
      return;
    }

    const rewards = normalizePlayerInboxRewards(ctx, {
      coinReward: 0n,
      crystalReward: tier.crystalReward,
      rubyReward: 0,
      emeraldReward: tier.emeraldReward,
      itemRewardsJson: '[]',
    });

    if (
      insertPlayerInboxMail(ctx, {
        recipientIdentity: player.identity,
        sourceType: 'worldEvent',
        sourceKey,
        senderLabel: 'world event',
        title: 'event finished',
        body: `you placed #${rank} in ${eventHeadline} with ${points.toString()} points. here are your rewards.`,
        rewards,
      })
    ) {
      insertedMailCount += 1;
    }
  });

  if (markSettled && !ctx.db.maintenanceState.stateKey.find(stateKey)) {
    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  }

  return insertedMailCount;
}

function settleEndedWorldEventInboxRewards(ctx: IdleWizardReducerCtx) {
  const eventKeys = new Set<string>();

  for (const entry of Array.from(ctx.db.worldEventLeaderboard.iter())) {
    const periodKey = normalizeWorldEventPeriodKey(entry.periodKey);
    const eventId = normalizeWorldEventId(entry.eventId);

    if (!periodKey || !eventId || !isEndedWorldEventPeriod(ctx, periodKey)) {
      continue;
    }

    eventKeys.add(`${periodKey}:${eventId}`);
  }

  for (const eventKey of eventKeys) {
    const [periodKey, eventId] = eventKey.split(':');
    settleWorldEventInboxRewards(ctx, {
      periodKey,
      eventId,
      headline: formatWorldEventHeadline(eventId),
      markSettled: true,
    });
  }
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
      character: normalizePlayerCharacter(
        ctx.db.player.identity.find(entry.identity)?.character ?? DEFAULT_PLAYER_CHARACTER,
      ),
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

function getWorldEventLeaderboardSummaryRows(ctx: any) {
  const periodKey = getWorldEventPeriodKey(ctx);
  const entries = Array.from<any>(
    ctx.db.worldEventLeaderboard.byPeriodKey.filter(periodKey),
  ).filter((entry) => hasAcceptedPlayerGameplaySave(ctx, entry.identity));
  const rankedByEventId = new Map<string, any[]>();
  const ranksByContributionKey = new Map<string, number>();
  const visibleByContributionKey = new Map<string, any>();
  const addVisible = (entry: any) => {
    visibleByContributionKey.set(String(entry.contributionKey), entry);
  };

  for (const entry of entries) {
    const eventId = normalizeWorldEventId(entry.eventId);
    if (!eventId) {
      continue;
    }

    const eventEntries = rankedByEventId.get(eventId) ?? [];
    eventEntries.push(entry);
    rankedByEventId.set(eventId, eventEntries);
  }

  for (const eventEntries of rankedByEventId.values()) {
    const ranked = getRankedWorldEventLeaderboardEntries(eventEntries);
    ranked.forEach((entry, index) => {
      ranksByContributionKey.set(String(entry.contributionKey), index + 1);
    });
    ranked.slice(0, WORLD_EVENT_LEADERBOARD_SUMMARY_LIMIT).forEach(addVisible);
  }

  for (const entry of entries) {
    if (entry.identity.isEqual(ctx.sender)) {
      addVisible(entry);
    }
  }

  return Array.from(visibleByContributionKey.values())
    .map((entry) => ({
      contributionKey: entry.contributionKey,
      identity: entry.identity,
      periodKey: entry.periodKey,
      eventId: entry.eventId,
      username: entry.username,
      allianceTag: getSenderTradeAllianceTag(ctx, entry.identity),
      allianceTagColor: getSenderTradeAllianceTagColor(ctx, entry.identity),
      character: normalizePlayerCharacter(
        ctx.db.player.identity.find(entry.identity)?.character ?? DEFAULT_PLAYER_CHARACTER,
      ),
      points: toBigInt(entry.points),
      updatedAt: new Timestamp(entry.updatedAt.microsSinceUnixEpoch),
      playerLevel: normalizePlayerLevel(entry.playerLevel),
      rank: ranksByContributionKey.get(String(entry.contributionKey)) ?? 0,
    }))
    .sort((left, right) => {
      if (left.eventId !== right.eventId) {
        return left.eventId.localeCompare(right.eventId);
      }

      const leftRank = Number(left.rank) || Number.MAX_SAFE_INTEGER;
      const rightRank = Number(right.rank) || Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return getIdentityHex(left.identity).localeCompare(getIdentityHex(right.identity));
    });
}

function getPlayerInfoSummaryRows(ctx: any) {
  const activeMarketId = getActiveMarketId(ctx);
  const identities = new Map<string, Identity>();
  const addIdentity = (identity: Identity | null | undefined) => {
    if (!identity) {
      return;
    }

    identities.set(getIdentityHex(identity), identity);
  };

  addIdentity(ctx.sender);
  getLeaderboardSummaryRows(ctx).forEach((entry) => addIdentity(entry.identity));
  getWorldEventLeaderboardSummaryRows(ctx).forEach((entry) => addIdentity(entry.identity));

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
    if (getRowMarketId(listing) === activeMarketId && Number(listing.quantity) > 0) {
      addIdentity(listing.sellerIdentity);
    }
  }

  for (const request of ctx.db.playerShopRequest.byQuantity.filter(new Range())) {
    if (getRowMarketId(request) === activeMarketId && Number(request.quantity) > 0) {
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
    character: normalizePlayerCharacter(player?.character ?? DEFAULT_PLAYER_CHARACTER),
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

function getRankedWorldEventLeaderboardEntries<T extends { identity: Identity; points: bigint }>(
  entries: T[],
) {
  return [...entries].sort((left, right) => {
    const leftPoints = toBigInt(left.points);
    const rightPoints = toBigInt(right.points);

    if (leftPoints < rightPoints) {
      return 1;
    }

    if (leftPoints > rightPoints) {
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

function getNpcMarketMaxNeed(targetNeed: bigint): bigint {
  if (targetNeed <= 0n) {
    return 1n;
  }

  const maxNeed = (targetNeed * NPC_MARKET_DEMAND_CAP_BPS) / 10_000n;
  return maxNeed > 0n ? maxNeed : 1n;
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
    npcNeed: clampBigInt(rawNeed > 0n ? rawNeed : 0n, 0n, maxNeed),
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
  const nowMicros = getContextTimestampMicros(ctx);
  const lastTickMicros =
    row.lastTickAt?.microsSinceUnixEpoch ??
    row.updatedAt?.microsSinceUnixEpoch ??
    nowMicros;
  const elapsedMicros = nowMicros - lastTickMicros;

  if (elapsedMicros <= 0n) {
    return {
      ...needState,
      lastTickAt: row.lastTickAt ?? ctx.timestamp,
      recovered: false,
    };
  }

  const recoveryWindow = getNpcMarketDemandRecoveryWindow(
    needState.npcNeed,
    lastTickMicros,
    nowMicros,
  );
  const waveRecovery = getNpcMarketDemandWaveRecovery(
    needState.targetNeed,
    recoveryWindow.fromMicros,
    nowMicros,
  );
  const nextNpcNeed = clampBigInt(
    recoveryWindow.npcNeed + waveRecovery,
    0n,
    needState.maxNeed,
  );
  const processedChange = recoveryWindow.didReset || waveRecovery > 0n;

  return {
    ...needState,
    npcNeed: nextNpcNeed,
    lastTickAt:
      processedChange || nextNpcNeed !== needState.npcNeed
        ? ctx.timestamp
        : row.lastTickAt ?? ctx.timestamp,
    recovered: processedChange || nextNpcNeed !== needState.npcNeed,
  };
}

function getNpcMarketDemandRecoveryWindow(
  npcNeed: bigint,
  fromMicros: bigint,
  toMicros: bigint,
) {
  const weekStartMicros = getWeeklyPeriodStartMicros(toMicros);

  if (fromMicros >= weekStartMicros) {
    return {
      npcNeed,
      fromMicros,
      didReset: false,
    };
  }

  return {
    npcNeed: 0n,
    fromMicros: weekStartMicros - 1n,
    didReset: true,
  };
}

function getNpcMarketDemandWaveRecovery(
  targetNeed: bigint,
  fromMicros: bigint,
  toMicros: bigint,
): bigint {
  if (targetNeed <= 0n || toMicros <= fromMicros) {
    return 0n;
  }

  const firstWaveIndex = fromMicros / NPC_MARKET_DEMAND_WAVE_INTERVAL_MICROS + 1n;
  const lastWaveIndex = toMicros / NPC_MARKET_DEMAND_WAVE_INTERVAL_MICROS;

  if (lastWaveIndex < firstWaveIndex) {
    return 0n;
  }

  const waveCycleLength = BigInt(NPC_MARKET_DEMAND_WAVE_BPS_BY_SLOT.length);
  const waveCount = lastWaveIndex - firstWaveIndex + 1n;
  const fullDays = waveCount / waveCycleLength;
  const remainingWaves = Number(waveCount % waveCycleLength);
  let recovery =
    (targetNeed * NPC_MARKET_DEMAND_DAILY_BUDGET_BPS * fullDays) / 10_000n;

  for (let offset = 0; offset < remainingWaves; offset += 1) {
    const waveIndex = firstWaveIndex + fullDays * waveCycleLength + BigInt(offset);
    recovery += getNpcMarketDemandWaveAmount(targetNeed, waveIndex);
  }

  return recovery;
}

function getNpcMarketDemandWaveAmount(targetNeed: bigint, waveIndex: bigint): bigint {
  const waveSlot = Number(waveIndex % BigInt(NPC_MARKET_DEMAND_WAVE_BPS_BY_SLOT.length));
  const waveBps =
    NPC_MARKET_DEMAND_WAVE_BPS_BY_SLOT[waveSlot] ?? NPC_MARKET_DEMAND_SMALL_WAVE_BPS;

  return (
    (targetNeed * NPC_MARKET_DEMAND_DAILY_BUDGET_BPS * waveBps) /
    10_000n /
    10_000n
  );
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
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(marketConfig.storageKey);

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
  marketId = defaultMarketId,
) {
  const safeMarketId = normalizeMarketId(marketId);
  const storageKey = getMarketScopedItemKey(safeMarketId, catalogItem.itemKey);
  const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(storageKey);

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
      existingConfig.enabled === enabled &&
      getRowMarketId(existingConfig) === safeMarketId &&
      getNpcMarketCatalogItemKey(existingConfig) === catalogItem.itemKey
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
      marketId: safeMarketId,
      catalogItemKey: catalogItem.itemKey,
    });
  }

  return ctx.db.npcMarketItemConfig.insert({
    itemKey: storageKey,
    itemLabel: catalogItem.itemLabel,
    itemKind: catalogItem.itemKind,
    defaultBasePriceGold: toStoredGoldPrice(catalogItem.basePriceGold),
    basePriceGold: toStoredGoldPrice(catalogItem.basePriceGold),
    priceScale: GOLD_PRICE_SCALE,
    targetStock: catalogItem.targetStock,
    volatilityBps: catalogItem.volatilityBps,
    enabled: true,
    updatedAt: ctx.timestamp,
    marketId: safeMarketId,
    catalogItemKey: catalogItem.itemKey,
  });
}

function normalizeNpcMarketRuntimeConfig(row: any, catalogItem?: (typeof npcMarketCatalog)[number]) {
  const defaultBasePriceGold = normalizeNpcMarketBasePriceGold(
    row.defaultBasePriceGold,
    catalogItem?.basePriceGold ?? 1,
    row.priceScale,
  );

  return {
    storageKey: normalizeNpcMarketItemKey(row.itemKey),
    marketId: getRowMarketId(row),
    itemKey: getNpcMarketCatalogItemKey(row),
    itemLabel:
      normalizePlayerShopText(row.itemLabel, MAX_ITEM_LABEL_LENGTH) ||
      catalogItem?.itemLabel ||
      getNpcMarketCatalogItemKey(row),
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

function getNpcMarketRuntimeConfig(
  ctx: IdleWizardReducerCtx,
  itemKey: string,
  marketId = defaultMarketId,
) {
  const safeItemKey = normalizeNpcMarketItemKey(itemKey);
  const safeMarketId = normalizeMarketId(marketId);
  const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);
  const itemConfig = catalogItem
    ? ensureNpcMarketItemConfig(ctx, catalogItem, safeMarketId)
    : ctx.db.npcMarketItemConfig.itemKey.find(getMarketScopedItemKey(safeMarketId, safeItemKey));

  if (!itemConfig) {
    throw new Error('Unknown NPC market item.');
  }

  const runtimeConfig = normalizeNpcMarketRuntimeConfig(itemConfig, catalogItem);

  if (!runtimeConfig.enabled) {
    throw new Error('NPC market item is disabled.');
  }

  return runtimeConfig;
}

function deleteNpcMarketPriceIfPresent(
  ctx: IdleWizardReducerCtx,
  itemKey: string,
  marketId = defaultMarketId,
) {
  const existingRow = ctx.db.npcMarketPrice.itemKey.find(
    getMarketScopedItemKey(marketId, itemKey),
  );

  if (existingRow) {
    ctx.db.npcMarketPrice.delete(existingRow);
  }
}

function ensureNpcMarketItem(
  ctx: IdleWizardReducerCtx,
  itemKey: string,
  marketId = defaultMarketId,
) {
  const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey, marketId);
  const existingRow = ctx.db.npcMarketPrice.itemKey.find(marketConfig.storageKey);

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
      marketId: marketConfig.marketId,
      catalogItemKey: marketConfig.itemKey,
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
    itemKey: marketConfig.storageKey,
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
    marketId: marketConfig.marketId,
    catalogItemKey: marketConfig.itemKey,
  });
}

function ensureNpcMarketCatalog(ctx: IdleWizardReducerCtx) {
  for (const market of marketLicences) {
    for (const catalogItem of npcMarketCatalog) {
      const config = normalizeNpcMarketRuntimeConfig(
        ensureNpcMarketItemConfig(ctx, catalogItem, market.id),
        catalogItem,
      );

      if (config.enabled) {
        ensureNpcMarketItem(ctx, catalogItem.itemKey, market.id);
      } else {
        deleteNpcMarketPriceIfPresent(ctx, catalogItem.itemKey, market.id);
      }
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
    const character = normalizePlayerCharacter(player.character);
    const usernamePromptSeen = Boolean(player.usernamePromptSeen);

    if (
      player.username === username &&
      player.playerLevel === playerLevel &&
      player.theme === theme &&
      player.font === font &&
      player.colorMode === colorMode &&
      player.character === character &&
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
      character,
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

function runPlayerLevelManaRegenBackfillOnce(ctx: IdleWizardReducerCtx) {
  if (ctx.db.maintenanceState.stateKey.find(PLAYER_LEVEL_MANA_REGEN_BACKFILL_STATE_KEY)) {
    return;
  }

  backfillPlayerLevelManaRegen(ctx);
  ctx.db.maintenanceState.insert({
    stateKey: PLAYER_LEVEL_MANA_REGEN_BACKFILL_STATE_KEY,
    appliedAt: ctx.timestamp,
  });
}

function runPlayerLevelCauldronCapBackfillOnce(ctx: IdleWizardReducerCtx) {
  if (ctx.db.maintenanceState.stateKey.find(PLAYER_LEVEL_CAULDRON_CAP_BACKFILL_STATE_KEY)) {
    return;
  }

  backfillPlayerLevelCauldronCaps(ctx);
  ctx.db.maintenanceState.insert({
    stateKey: PLAYER_LEVEL_CAULDRON_CAP_BACKFILL_STATE_KEY,
    appliedAt: ctx.timestamp,
  });
}

function backfillPlayerLevelManaRegen(ctx: IdleWizardReducerCtx) {
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

  const mana = config?.mana;
  if (!mana || typeof mana !== 'object' || Array.isArray(mana)) {
    return;
  }

  if (Array.isArray(mana.manaPerSecondPerLevelRanges ?? mana.perSecondPerLevelRanges)) {
    return;
  }

  const scalarPerLevel = Number(mana.manaPerSecondPerLevel ?? mana.perSecondPerLevel);
  if (scalarPerLevel !== 0.25 && scalarPerLevel !== 1) {
    return;
  }

  const restMana = { ...mana };
  delete restMana.manaPerSecondPerLevel;
  delete restMana.perSecondPerLevel;
  const configJson = validateGameConfigJson('playerLevel', JSON.stringify({
    ...config,
    mana: {
      ...restMana,
      manaPerSecondPerLevelRanges: PLAYER_LEVEL_MANA_PER_SECOND_PER_LEVEL_RANGES,
    },
  }));

  ctx.db.gameConfig.configKey.update({
    ...row,
    configJson,
    updatedAt: ctx.timestamp,
  });
}

function backfillPlayerLevelCauldronCaps(ctx: IdleWizardReducerCtx) {
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

  const nextMilestones = applyDefaultCauldronCaps(rawMilestones);

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

function applyDefaultCauldronCaps(milestones: any[]) {
  const withRequiredMilestones = insertCauldronCapMilestones(milestones);

  return withRequiredMilestones.map((milestone: any) => ({
    ...milestone,
    maxCauldrons: getDefaultCauldronsForLevel(Number(milestone?.level)),
  }));
}

function insertCauldronCapMilestones(milestones: any[]) {
  return [5].reduce(
    (nextMilestones, level) => insertPlayerLevelMilestone(nextMilestones, level),
    milestones,
  );
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

function getDefaultCauldronsForLevel(level: number) {
  if (level < 5) {
    return 1;
  }

  return 2;
}

function insertPlayerLevelMilestone(milestones: any[], targetLevel: number) {
  if (milestones.some((milestone) => Number(milestone?.level) === targetLevel)) {
    return milestones;
  }

  const result: any[] = [];
  let previous: any = null;
  let inserted = false;

  for (const milestone of milestones) {
    const level = Number(milestone?.level);

    if (!inserted && level > targetLevel) {
      result.push({
        ...(previous ?? milestone),
        level: targetLevel,
      });
      inserted = true;
    }

    result.push(milestone);
    previous = milestone;
  }

  if (!inserted) {
    result.push({
      ...(previous ?? {}),
      level: targetLevel,
    });
  }

  return result;
}

function deleteAllPotionDiscoveries(ctx: IdleWizardReducerCtx) {
  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    ctx.db.potionRecipeDiscovery.delete(discovery);
  }

  for (const royalty of Array.from(ctx.db.potionRecipeRoyalty.iter())) {
    ctx.db.potionRecipeRoyalty.delete(royalty);
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
  const character = normalizePlayerCharacter(
    existingPlayer?.character ?? DEFAULT_PLAYER_CHARACTER,
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
      existingPlayer.character !== character ||
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
      character,
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
    character: DEFAULT_PLAYER_CHARACTER,
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
    if (row.username === 'system') {
      continue;
    }

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

function assertTradeAllianceChatRateLimit(
  ctx: IdleWizardReducerCtx,
  allianceId: Uuid,
) {
  const allianceKey = getTradeAllianceIdKey(allianceId);
  const windowStartMicros =
    ctx.timestamp.microsSinceUnixEpoch - TRADE_ALLIANCE_CHAT_RATE_LIMIT_WINDOW_MICROS;
  let sentInWindow = 0;
  let allianceSentInWindow = 0;

  for (const row of ctx.db.tradeAllianceChat.byAllianceId.filter(allianceId)) {
    if (
      getTradeAllianceIdKey(row.allianceId) !== allianceKey ||
      row.sentAt.microsSinceUnixEpoch < windowStartMicros
    ) {
      continue;
    }

    allianceSentInWindow += 1;

    if (row.senderIdentity.isEqual(ctx.sender)) {
      sentInWindow += 1;
    }
  }

  if (sentInWindow >= TRADE_ALLIANCE_CHAT_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('Alliance chat is rate limited.');
  }

  if (allianceSentInWindow >= TRADE_ALLIANCE_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('Alliance chat is globally rate limited.');
  }
}

function assertFeedbackRateLimit(ctx: IdleWizardReducerCtx) {
  const windowStartMicros =
    ctx.timestamp.microsSinceUnixEpoch - FEEDBACK_RATE_LIMIT_WINDOW_MICROS;
  let sentInWindow = 0;

  for (const row of ctx.db.playerFeedback.bySenderIdentity.filter(ctx.sender)) {
    if (row.submittedAt.microsSinceUnixEpoch >= windowStartMicros) {
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

  for (const proceeds of Array.from(ctx.db.playerShopMarketProceeds.iter())) {
    ctx.db.playerShopMarketProceeds.delete(proceeds);
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.iter())) {
    ctx.db.playerShopTrade.delete(trade);
  }

  for (const royalty of Array.from(ctx.db.potionRecipeRoyalty.iter())) {
    ctx.db.potionRecipeRoyalty.delete(royalty);
  }
}

function deletePlayerShopProgressionForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  for (const listing of Array.from(ctx.db.playerShopListing.bySellerIdentity.filter(identity))) {
    ctx.db.playerShopListing.delete(listing);
  }

  for (const request of Array.from(ctx.db.playerShopRequest.byRequesterIdentity.filter(identity))) {
    ctx.db.playerShopRequest.delete(request);
  }

  const proceeds = ctx.db.playerShopProceeds.sellerIdentity.find(identity);
  if (proceeds) {
    ctx.db.playerShopProceeds.delete(proceeds);
  }

  for (const proceeds of Array.from(
    ctx.db.playerShopMarketProceeds.bySellerIdentity.filter(identity),
  )) {
    ctx.db.playerShopMarketProceeds.delete(proceeds);
  }

  deletePotionRecipeRoyaltiesForIdentity(ctx, identity);
}

function deleteAllPlayerGameplaySaves(ctx: IdleWizardReducerCtx) {
  for (const save of Array.from(ctx.db.playerGameplaySave.iter())) {
    ctx.db.playerGameplaySave.delete(save);
  }
}

function deleteAllPlayerInboxMail(ctx: IdleWizardReducerCtx) {
  for (const mail of Array.from(ctx.db.playerInboxMail.iter())) {
    ctx.db.playerInboxMail.delete(mail);
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

function deletePlayerInboxForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  for (const mail of Array.from(ctx.db.playerInboxMail.byRecipientIdentity.filter(identity))) {
    ctx.db.playerInboxMail.delete(mail);
  }
}

function deleteLeaderboardForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  const entry = ctx.db.leaderboard.identity.find(identity);
  if (entry) {
    ctx.db.leaderboard.delete(entry);
  }
}

function deleteWorldEventLeaderboardForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  for (const entry of Array.from(ctx.db.worldEventLeaderboard.byIdentity.filter(identity))) {
    ctx.db.worldEventLeaderboard.delete(entry);
  }
}

function deleteMessageRowsForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  for (const row of Array.from(ctx.db.worldChat.iter())) {
    if (row.senderIdentity.isEqual(identity)) {
      ctx.db.worldChat.delete(row);
    }
  }

  for (const row of Array.from(ctx.db.tradeAllianceChat.iter())) {
    if (row.senderIdentity.isEqual(identity)) {
      ctx.db.tradeAllianceChat.delete(row);
    }
  }
}

function deletePlayerFeedbackForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  for (const row of Array.from(ctx.db.playerFeedback.bySenderIdentity.filter(identity))) {
    ctx.db.playerFeedback.delete(row);
  }
}

function deletePotionDiscoveriesForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    if (discovery.discoveredByIdentity.isEqual(identity)) {
      ctx.db.potionRecipeDiscovery.delete(discovery);
    }
  }

  deletePotionRecipeRoyaltiesForIdentity(ctx, identity);
}

function deletePotionRecipeRoyaltiesForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  for (const royalty of Array.from(ctx.db.potionRecipeRoyalty.iter())) {
    if (
      royalty.recipientIdentity.isEqual(identity) ||
      royalty.sourceSellerIdentity.isEqual(identity)
    ) {
      ctx.db.potionRecipeRoyalty.delete(royalty);
    }
  }
}

function deletePlayerShopDataForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  deletePlayerShopProgressionForIdentity(ctx, identity);

  const deletedTradeIds = new Set<string>();
  const deleteTrade = (trade: any) => {
    const tradeId = getTradeAllianceIdKey(trade.tradeId);
    if (deletedTradeIds.has(tradeId)) {
      return;
    }

    deletedTradeIds.add(tradeId);
    ctx.db.playerShopTrade.delete(trade);
  };

  for (const trade of Array.from(ctx.db.playerShopTrade.byBuyerIdentity.filter(identity))) {
    deleteTrade(trade);
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.bySellerIdentity.filter(identity))) {
    deleteTrade(trade);
  }
}

function deleteTradeAllianceDataForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  const affectedAllianceIds: any[] = [];

  for (const alliance of Array.from(ctx.db.tradeAlliance.iter())) {
    if (alliance.leaderIdentity.isEqual(identity)) {
      addAdminAffectedAllianceId(affectedAllianceIds, alliance.allianceId);
    }
  }

  deleteTradeAllianceApplicationsForIdentity(ctx, identity);

  for (const contribution of Array.from(
    ctx.db.tradeAllianceQuestContribution.byContributorIdentity.filter(identity),
  )) {
    ctx.db.tradeAllianceQuestContribution.delete(contribution);
  }

  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.byRecipientIdentity.filter(identity))) {
    ctx.db.tradeAllianceRewardInbox.delete(reward);
  }

  const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);
  if (member) {
    addAdminAffectedAllianceId(affectedAllianceIds, member.allianceId);
    ctx.db.tradeAllianceMember.delete(member);
  }

  for (const allianceId of affectedAllianceIds) {
    refreshAdminMergedAlliance(ctx, allianceId);
  }
}

function deletePlayerDataForIdentity(ctx: IdleWizardReducerCtx, identity: Identity) {
  deletePlayerGameplaySaveForIdentity(ctx, identity);
  deletePlayerInboxForIdentity(ctx, identity);
  deleteLeaderboardForIdentity(ctx, identity);
  deleteWorldEventLeaderboardForIdentity(ctx, identity);
  deleteMessageRowsForIdentity(ctx, identity);
  deleteTradeAllianceDataForIdentity(ctx, identity);
  deletePlayerShopDataForIdentity(ctx, identity);
  deletePotionDiscoveriesForIdentity(ctx, identity);
  deletePlayerFeedbackForIdentity(ctx, identity);
  deleteAdminPlayerSession(ctx, identity);

  const player = ctx.db.player.identity.find(identity);
  if (player) {
    ctx.db.player.delete(player);
  }
}

function deletePlayerDataForIdentities(ctx: IdleWizardReducerCtx, identities: Identity[]) {
  const identityByHex = new Map<string, Identity>();

  for (const identity of identities) {
    identityByHex.set(getIdentityHex(identity), identity);
  }

  if (identityByHex.size <= 0) {
    return;
  }

  const isTargetIdentity = (identity: Identity) => identityByHex.has(getIdentityHex(identity));

  for (const identity of identityByHex.values()) {
    deletePlayerGameplaySaveForIdentity(ctx, identity);
    deletePlayerInboxForIdentity(ctx, identity);
    deleteLeaderboardForIdentity(ctx, identity);
    deleteWorldEventLeaderboardForIdentity(ctx, identity);
    deleteAdminPlayerSession(ctx, identity);
  }

  for (const row of Array.from(ctx.db.worldChat.iter())) {
    if (isTargetIdentity(row.senderIdentity)) {
      ctx.db.worldChat.delete(row);
    }
  }

  for (const row of Array.from(ctx.db.tradeAllianceChat.iter())) {
    if (isTargetIdentity(row.senderIdentity)) {
      ctx.db.tradeAllianceChat.delete(row);
    }
  }

  const affectedAllianceIds: any[] = [];

  for (const alliance of Array.from(ctx.db.tradeAlliance.iter())) {
    if (isTargetIdentity(alliance.leaderIdentity)) {
      addAdminAffectedAllianceId(affectedAllianceIds, alliance.allianceId);
    }
  }

  for (const application of Array.from(ctx.db.tradeAllianceApplication.iter())) {
    if (isTargetIdentity(application.applicantIdentity)) {
      ctx.db.tradeAllianceApplication.delete(application);
    }
  }

  for (const contribution of Array.from(ctx.db.tradeAllianceQuestContribution.iter())) {
    if (isTargetIdentity(contribution.contributorIdentity)) {
      ctx.db.tradeAllianceQuestContribution.delete(contribution);
    }
  }

  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.iter())) {
    if (isTargetIdentity(reward.recipientIdentity)) {
      ctx.db.tradeAllianceRewardInbox.delete(reward);
    }
  }

  for (const identity of identityByHex.values()) {
    const member = ctx.db.tradeAllianceMember.memberIdentity.find(identity);
    if (member) {
      addAdminAffectedAllianceId(affectedAllianceIds, member.allianceId);
      ctx.db.tradeAllianceMember.delete(member);
    }
  }

  for (const listing of Array.from(ctx.db.playerShopListing.iter())) {
    if (isTargetIdentity(listing.sellerIdentity)) {
      ctx.db.playerShopListing.delete(listing);
    }
  }

  for (const request of Array.from(ctx.db.playerShopRequest.iter())) {
    if (isTargetIdentity(request.requesterIdentity)) {
      ctx.db.playerShopRequest.delete(request);
    }
  }

  for (const proceeds of Array.from(ctx.db.playerShopProceeds.iter())) {
    if (isTargetIdentity(proceeds.sellerIdentity)) {
      ctx.db.playerShopProceeds.delete(proceeds);
    }
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.iter())) {
    if (isTargetIdentity(trade.buyerIdentity) || isTargetIdentity(trade.sellerIdentity)) {
      ctx.db.playerShopTrade.delete(trade);
    }
  }

  for (const royalty of Array.from(ctx.db.potionRecipeRoyalty.iter())) {
    if (
      isTargetIdentity(royalty.recipientIdentity) ||
      isTargetIdentity(royalty.sourceSellerIdentity)
    ) {
      ctx.db.potionRecipeRoyalty.delete(royalty);
    }
  }

  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    if (isTargetIdentity(discovery.discoveredByIdentity)) {
      ctx.db.potionRecipeDiscovery.delete(discovery);
    }
  }

  for (const row of Array.from(ctx.db.playerFeedback.iter())) {
    if (isTargetIdentity(row.senderIdentity)) {
      ctx.db.playerFeedback.delete(row);
    }
  }

  for (const allianceId of affectedAllianceIds) {
    refreshAdminMergedAlliance(ctx, allianceId);
  }

  for (const identity of identityByHex.values()) {
    const player = ctx.db.player.identity.find(identity);
    if (player) {
      ctx.db.player.delete(player);
    }
  }
}

function getZeroIncomePlayerIdentities(ctx: IdleWizardReducerCtx): Identity[] {
  const identities = new Map<string, Identity>();

  for (const entry of Array.from(ctx.db.leaderboard.iter())) {
    if (toBigInt(entry.totalIncome) !== 0n) {
      continue;
    }

    identities.set(getIdentityHex(entry.identity), entry.identity);
  }

  return Array.from(identities.values());
}

function getZeroTotalCoinPlayerIdentities(ctx: IdleWizardReducerCtx): Identity[] {
  const identities = new Map<string, Identity>();
  const positiveTotalCoinIdentityKeys = new Set<string>();

  for (const player of Array.from(ctx.db.player.iter())) {
    identities.set(getIdentityHex(player.identity), player.identity);
  }

  for (const save of Array.from(ctx.db.playerGameplaySave.iter())) {
    const identityKey = getIdentityHex(save.identity);
    identities.set(identityKey, save.identity);

    const totalGeneratedGold = readSavedTotalGeneratedGold(save.saveJson);
    if (totalGeneratedGold !== null && totalGeneratedGold > 0n) {
      positiveTotalCoinIdentityKeys.add(identityKey);
    }
  }

  for (const entry of Array.from(ctx.db.leaderboard.iter())) {
    const identityKey = getIdentityHex(entry.identity);
    identities.set(identityKey, entry.identity);

    if (toBigInt(entry.totalIncome) > 0n) {
      positiveTotalCoinIdentityKeys.add(identityKey);
    }
  }

  return Array.from(identities.entries())
    .filter(([identityKey]) => !positiveTotalCoinIdentityKeys.has(identityKey))
    .map(([, identity]) => identity);
}

function assertAdminCurrencyGrantAmount(
  amount: number,
  maxAmount: number,
  label: string,
): number {
  const safeAmount = Math.floor(Number(amount));

  if (!Number.isFinite(safeAmount) || safeAmount < 0 || safeAmount > maxAmount) {
    throw new Error(`Invalid ${label} grant amount.`);
  }

  return safeAmount;
}

function grantAdminCurrencyBonusToRemainingPlayers(
  ctx: IdleWizardReducerCtx,
  {
    emeraldAmount,
    rubyAmount,
    crystalAmount,
  }: {
    emeraldAmount: number;
    rubyAmount: number;
    crystalAmount: number;
  },
) {
  const safeEmeraldAmount = assertAdminCurrencyGrantAmount(
    emeraldAmount,
    MAX_PLAYER_SAVE_CURRENT_EMERALD,
    'emerald',
  );
  const safeRubyAmount = assertAdminCurrencyGrantAmount(
    rubyAmount,
    MAX_PLAYER_SAVE_CURRENT_RUBY,
    'ruby',
  );
  const safeCrystalAmount = assertAdminCurrencyGrantAmount(
    crystalAmount,
    MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
    'crystal',
  );

  for (const player of Array.from(ctx.db.player.iter())) {
    const existingSave = ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined;
    const safeSaveJson = createAdminPlayerCurrencyBonusSaveJson(
      ctx,
      existingSave,
      player.identity,
      {
        emeraldDelta: safeEmeraldAmount,
        rubyDelta: safeRubyAmount,
        crystalDelta: safeCrystalAmount,
      },
    );

    upsertAdminPlayerGameplaySave(ctx, player.identity, safeSaveJson, existingSave);
  }
}

function deleteAllLeaderboardState(ctx: IdleWizardReducerCtx) {
  for (const entry of Array.from(ctx.db.leaderboard.iter())) {
    ctx.db.leaderboard.delete(entry);
  }

  for (const entry of Array.from(ctx.db.worldEventLeaderboard.iter())) {
    ctx.db.worldEventLeaderboard.delete(entry);
  }
}

function resetLeaderboardProgressForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
  username: string,
) {
  deleteWorldEventLeaderboardForIdentity(ctx, identity);

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
  for (const reward of Array.from(ctx.db.tradeAllianceRewardInbox.byRecipientIdentity.filter(identity))) {
    ctx.db.tradeAllianceRewardInbox.delete(reward);
  }

  for (const contribution of Array.from(
    ctx.db.tradeAllianceQuestContribution.byContributorIdentity.filter(identity),
  )) {
    ctx.db.tradeAllianceQuestContribution.delete(contribution);
  }

  deleteTradeAllianceApplicationsForIdentity(ctx, identity);

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
      character: normalizePlayerCharacter(player.character),
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
    character: normalizePlayerCharacter(player.character),
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

function moveAdminPlayerInboxMail(
  ctx: IdleWizardReducerCtx,
  sourceIdentity: Identity,
  targetIdentity: Identity,
) {
  for (const mail of Array.from(ctx.db.playerInboxMail.byRecipientIdentity.filter(sourceIdentity))) {
    const targetKey = getPlayerInboxMailKey(
      mail.sourceType,
      mail.sourceKey,
      targetIdentity,
    );
    const existingTarget = ctx.db.playerInboxMail.mailKey.find(targetKey);
    const read = Boolean(mail.read) || Boolean(existingTarget?.read);
    const rewardCollected =
      Boolean(mail.rewardCollected) || Boolean(existingTarget?.rewardCollected);

    if (existingTarget) {
      ctx.db.playerInboxMail.delete(existingTarget);
    }

    ctx.db.playerInboxMail.delete(mail);
    ctx.db.playerInboxMail.insert({
      ...mail,
      mailKey: targetKey,
      recipientIdentity: targetIdentity,
      read,
      rewardCollected,
    });
  }

  prunePlayerInboxMail(ctx, targetIdentity);
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

    const targetKey = getPlayerShopListingKeyForIdentity(
      targetIdentity,
      listing.slotNumber,
      getRowMarketId(listing),
    );
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

    const targetKey = getPlayerShopRequestKeyForIdentity(
      targetIdentity,
      request.slotNumber,
      getRowMarketId(request),
    );
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

  for (const sourceProceeds of Array.from(
    ctx.db.playerShopMarketProceeds.bySellerIdentity.filter(sourceIdentity),
  )) {
    const marketId = getRowMarketId(sourceProceeds);
    const targetKey = getPlayerShopMarketProceedsKey(targetIdentity, marketId);
    const targetProceeds = ctx.db.playerShopMarketProceeds.proceedsKey.find(targetKey);
    const mergedGold = toBigInt(sourceProceeds.gold) + toBigInt(targetProceeds?.gold ?? 0n);

    if (targetProceeds) {
      ctx.db.playerShopMarketProceeds.proceedsKey.update({
        ...targetProceeds,
        gold: mergedGold,
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.playerShopMarketProceeds.insert({
        ...sourceProceeds,
        proceedsKey: targetKey,
        sellerIdentity: targetIdentity,
        marketId,
        updatedAt: ctx.timestamp,
      });
    }

    ctx.db.playerShopMarketProceeds.delete(sourceProceeds);
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

  for (const royalty of Array.from(ctx.db.potionRecipeRoyalty.iter())) {
    if (
      !royalty.recipientIdentity.isEqual(sourceIdentity) &&
      !royalty.sourceSellerIdentity.isEqual(sourceIdentity)
    ) {
      continue;
    }

    ctx.db.potionRecipeRoyalty.royaltyId.update({
      ...royalty,
      recipientIdentity: royalty.recipientIdentity.isEqual(sourceIdentity)
        ? targetIdentity
        : royalty.recipientIdentity,
      sourceSellerIdentity: royalty.sourceSellerIdentity.isEqual(sourceIdentity)
        ? targetIdentity
        : royalty.sourceSellerIdentity,
      sourceSellerUsername: royalty.sourceSellerIdentity.isEqual(sourceIdentity)
        ? targetUsername
        : royalty.sourceSellerUsername,
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

function kickAdminPlayerSession(ctx: IdleWizardReducerCtx, identity: Identity) {
  const activeConnectionId = ctx.connectionId;
  if (!activeConnectionId) {
    deleteAdminPlayerSession(ctx, identity);
    return;
  }

  const nextSession = {
    identity,
    activeConnectionId,
    updatedAt: ctx.timestamp,
  };
  const session = ctx.db.playerSession.identity.find(identity);

  if (session) {
    ctx.db.playerSession.identity.update(nextSession);
    return;
  }

  ctx.db.playerSession.insert(nextSession);
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
  const rows = getWorldChatRowsOldestFirst(ctx);

  while (rows.length > WORLD_CHAT_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.worldChat.delete(row);
    }
  }
}

function insertSystemWorldChatMessage(ctx: IdleWizardReducerCtx, body: string) {
  const message = normalizeWorldChatMessage(body);

  if (!message) {
    return;
  }

  ctx.db.worldChat.insert({
    messageId: ctx.newUuidV7(),
    senderIdentity: ctx.sender,
    username: 'system',
    playerLevel: 0,
    body: message,
    sentAt: ctx.timestamp,
    allianceTag: '',
    allianceTagColor: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  });
  pruneWorldChat(ctx);
}

function getWorldChatRowsOldestFirst(ctx: { db: any }) {
  return Array.from<any>(ctx.db.worldChat.bySentAt.filter(new Range())).sort(
    compareWorldChatRowsOldestFirst,
  );
}

function compareWorldChatRowsOldestFirst(left: any, right: any): number {
  const leftSentAt = left.sentAt.microsSinceUnixEpoch;
  const rightSentAt = right.sentAt.microsSinceUnixEpoch;

  if (leftSentAt < rightSentAt) {
    return -1;
  }

  if (leftSentAt > rightSentAt) {
    return 1;
  }

  return left.messageId.compareTo(right.messageId);
}

function pruneTradeAllianceChat(ctx: IdleWizardReducerCtx, allianceId: unknown) {
  const allianceKey = getTradeAllianceIdKey(allianceId);
  const allianceUuid = parseTradeAllianceUuid(allianceId);
  const rows = Array.from(
    allianceUuid
      ? ctx.db.tradeAllianceChat.byAllianceId.filter(allianceUuid)
      : ctx.db.tradeAllianceChat.iter(),
  )
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
  const allianceUuid = parseTradeAllianceUuid(allianceId);

  if (!allianceUuid) {
    return;
  }

  for (const application of Array.from(
    ctx.db.tradeAllianceApplication.byAllianceId.filter(allianceUuid),
  )) {
    ctx.db.tradeAllianceApplication.delete(application);
  }
}

function deleteTradeAllianceApplicationsForIdentity(
  ctx: IdleWizardReducerCtx,
  identity: Identity,
) {
  for (const application of Array.from(
    ctx.db.tradeAllianceApplication.byApplicantIdentity.filter(identity),
  )) {
    ctx.db.tradeAllianceApplication.delete(application);
  }
}

function deleteTradeAllianceState(ctx: IdleWizardReducerCtx, alliance: any) {
  for (const member of getTradeAllianceMembers(ctx, alliance.allianceId)) {
    ctx.db.tradeAllianceMember.delete(member);
  }

  deleteTradeAllianceApplications(ctx, alliance.allianceId);

  for (const chat of Array.from(ctx.db.tradeAllianceChat.byAllianceId.filter(alliance.allianceId))) {
    ctx.db.tradeAllianceChat.delete(chat);
  }

  for (const quest of Array.from(
    ctx.db.tradeAllianceQuestProgress.byAllianceId.filter(alliance.allianceId),
  )) {
    ctx.db.tradeAllianceQuestProgress.delete(quest);
  }

  for (const contribution of Array.from(
    ctx.db.tradeAllianceQuestContribution.byAllianceId.filter(alliance.allianceId),
  )) {
    ctx.db.tradeAllianceQuestContribution.delete(contribution);
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

function prunePotionRecipeRoyaltyHistory(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.potionRecipeRoyalty.byAwardedAt.filter(new Range()));

  while (rows.length > POTION_RECIPE_ROYALTY_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.potionRecipeRoyalty.delete(row);
    }
  }
}

function getMarketDemandDailyKey(dayKey: string, marketId: string, itemKey: string): string {
  return getMarketScopedKey(marketId, `${dayKey}:${itemKey}`);
}

function recordMarketDemandDaily(
  ctx: IdleWizardReducerCtx,
  row: any,
  {
    npcBoughtQuantity = 0n,
    npcSoldQuantity = 0n,
    marketPriceGold,
    npcStock,
    targetStock,
    demandScore,
    supplyScore,
  }: {
    npcBoughtQuantity?: bigint;
    npcSoldQuantity?: bigint;
    marketPriceGold: number;
    npcStock: bigint;
    targetStock: bigint;
    demandScore: bigint;
    supplyScore: bigint;
  },
) {
  const dayKey = getDailyPeriodKey(ctx);
  const marketId = getRowMarketId(row);
  const itemKey = getNpcMarketCatalogItemKey(row);
  const analyticsKey = getMarketDemandDailyKey(dayKey, marketId, itemKey);
  const existing = ctx.db.marketDemandDaily.analyticsKey.find(analyticsKey);
  const nextRow = {
    analyticsKey,
    dayKey,
    itemKey,
    itemLabel: String(row.itemLabel ?? itemKey),
    itemKind: String(row.itemKind ?? ''),
    npcBoughtQuantity: toBigInt(existing?.npcBoughtQuantity ?? 0n) + npcBoughtQuantity,
    npcSoldQuantity: toBigInt(existing?.npcSoldQuantity ?? 0n) + npcSoldQuantity,
    marketPriceGold: toStoredGoldPrice(marketPriceGold),
    npcStock,
    targetStock,
    demandScore,
    supplyScore,
    updatedAt: ctx.timestamp,
    priceScale: GOLD_PRICE_SCALE,
    marketId,
  };

  if (existing) {
    ctx.db.marketDemandDaily.analyticsKey.update(nextRow);
    return;
  }

  ctx.db.marketDemandDaily.insert(nextRow);
  pruneMarketDemandDailyHistory(ctx);
}

function pruneMarketDemandDailyHistory(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.marketDemandDaily.byUpdatedAt.filter(new Range()));

  while (rows.length > MARKET_DEMAND_DAILY_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.marketDemandDaily.delete(row);
    }
  }
}

function getRecentPlayerShopTrades(ctx: { db: any }) {
  const marketId = getActiveMarketId(ctx as IdleWizardReducerCtx);
  return Array.from<any>(ctx.db.playerShopTrade.byTradedAt.filter(new Range()))
    .filter((trade) => getRowMarketId(trade) === marketId)
    .slice(-PLAYER_SHOP_TRADE_HISTORY_LIMIT)
    .reverse();
}

function getRecentPublicPlayerShopListings(ctx: { sender: Identity; db: any }) {
  const marketId = getActiveMarketId(ctx as IdleWizardReducerCtx);
  return getRecentPublicPlayerShopRows(
    ctx.db.playerShopListing.byUpdatedAt.filter(new Range()),
    ctx.sender,
    'sellerIdentity',
    marketId,
  );
}

function getRecentPublicPlayerShopRequests(ctx: { sender: Identity; db: any }) {
  const marketId = getActiveMarketId(ctx as IdleWizardReducerCtx);
  return getRecentPublicPlayerShopRows(
    ctx.db.playerShopRequest.byUpdatedAt.filter(new Range()),
    ctx.sender,
    'requesterIdentity',
    marketId,
  );
}

function getRecentPublicPlayerShopRows(
  rows: Iterable<any>,
  sender: Identity,
  identityField: string,
  marketId: string,
) {
  const recentRows: any[] = [];

  for (const row of rows) {
    if (
      toBigInt(row.quantity) <= 0n ||
      toBigInt(row.priceGold) <= 0n ||
      getRowMarketId(row) !== marketId ||
      row[identityField]?.isEqual?.(sender)
    ) {
      continue;
    }

    recentRows.push(row);

    if (recentRows.length > PLAYER_SHOP_PUBLIC_MARKET_ROW_LIMIT) {
      recentRows.shift();
    }
  }

  return recentRows.reverse();
}

function getOwnPlayerShopTrades(ctx: { sender: Identity; db: any }) {
  const marketId = getActiveMarketId(ctx as IdleWizardReducerCtx);
  const byTradeId = new Map<string, any>();
  const addRows = (rows: Iterable<any>) => {
    for (const row of rows) {
      byTradeId.set(getTradeAllianceIdKey(row.tradeId), row);
    }
  };

  addRows(ctx.db.playerShopTrade.byBuyerIdentity.filter(ctx.sender));
  addRows(ctx.db.playerShopTrade.bySellerIdentity.filter(ctx.sender));

  return Array.from<any>(byTradeId.values())
    .filter((trade) => getRowMarketId(trade) === marketId)
    .sort(comparePlayerShopTradesNewestFirst)
    .slice(0, PLAYER_SHOP_TRADE_HISTORY_LIMIT);
}

function getOwnPotionRecipeRoyalties(ctx: { sender: Identity; db: any }) {
  const marketId = getActiveMarketId(ctx as IdleWizardReducerCtx);
  return Array.from<any>(ctx.db.potionRecipeRoyalty.byRecipientIdentity.filter(ctx.sender))
    .filter((royalty) => getRowMarketId(royalty) === marketId)
    .sort(comparePotionRecipeRoyaltiesNewestFirst)
    .slice(0, POTION_RECIPE_ROYALTY_HISTORY_LIMIT);
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

function comparePotionRecipeRoyaltiesOldestFirst(left: any, right: any) {
  const leftAwardedAt = left.awardedAt.microsSinceUnixEpoch;
  const rightAwardedAt = right.awardedAt.microsSinceUnixEpoch;

  if (leftAwardedAt < rightAwardedAt) {
    return -1;
  }

  if (leftAwardedAt > rightAwardedAt) {
    return 1;
  }

  return left.royaltyId.compareTo(right.royaltyId);
}

function comparePotionRecipeRoyaltiesNewestFirst(left: any, right: any) {
  return comparePotionRecipeRoyaltiesOldestFirst(right, left);
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
  runPlayerLevelManaRegenBackfillOnce(ctx);
  runPlayerLevelCauldronCapBackfillOnce(ctx);
  ensureNpcMarketCatalog(ctx);
  ensureWorldEventRewardSettlementTick(ctx);
  settleEndedWorldEventInboxRewards(ctx);

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
  runPlayerLevelManaRegenBackfillOnce(ctx);
  runPlayerLevelCauldronCapBackfillOnce(ctx);
  ensureNpcMarketCatalog(ctx);
  ensureWorldEventRewardSettlementTick(ctx);
  settleEndedWorldEventInboxRewards(ctx);
});

export const run_world_event_reward_settlement_tick = spacetimedb.reducer(
  { arg: worldEventRewardSettlementTick.rowType },
  (ctx) => {
    ensureWorldEventRewardSettlementTick(ctx);
    settleEndedWorldEventInboxRewards(ctx);
  },
);

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
      character: normalizePlayerCharacter(existingPlayer.character),
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
      character: DEFAULT_PLAYER_CHARACTER,
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
    character: t.string(),
  },
  (ctx, { username, theme, colorMode, usernamePromptSeen, font, character }) => {
    assertActivePlayerSession(ctx);

    const normalizedUsername = normalizeUsername(username);
    const safeTheme = normalizePlayerTheme(theme);
    const safeFont = normalizePlayerFont(font);
    const safeColorMode = normalizePlayerColorMode(colorMode);
    const existingPlayer = ctx.db.player.identity.find(ctx.sender);
    const safeCharacter = normalizePlayerCharacter(character);
    const incomingUsernamePromptSeen =
      Boolean(usernamePromptSeen) || normalizedUsername !== DEFAULT_USERNAME;
    const nextUsernamePromptSeen =
      Boolean(existingPlayer?.usernamePromptSeen) || incomingUsernamePromptSeen;

    if (
      existingPlayer &&
      existingPlayer.username === normalizedUsername &&
      normalizePlayerTheme(existingPlayer.theme) === safeTheme &&
      normalizePlayerFont(existingPlayer.font) === safeFont &&
      normalizePlayerColorMode(existingPlayer.colorMode) === safeColorMode &&
      normalizePlayerCharacter(existingPlayer.character) === safeCharacter &&
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
        character: safeCharacter,
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
        character: safeCharacter,
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
      character: normalizePlayerCharacter(player.character),
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

export const admin_set_player_level_by_identity = spacetimedb.reducer(
  {
    identityHex: t.string(),
    playerLevel: t.u32(),
  },
  (ctx, { identityHex, playerLevel }) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const safePlayerLevel = validateAdminPlayerLevel(playerLevel);
    const existingSave = ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined;
    const safeSaveJson = createAdminPlayerLevelSaveJson(
      ctx,
      existingSave,
      player.identity,
      safePlayerLevel,
    );
    const nextPlayer = ctx.db.player.identity.update({
      ...player,
      username: normalizeUsername(player.username),
      playerLevel: safePlayerLevel,
      theme: normalizePlayerTheme(player.theme),
      font: normalizePlayerFont(player.font),
      colorMode: normalizePlayerColorMode(player.colorMode),
      character: normalizePlayerCharacter(player.character),
      usernamePromptSeen:
        Boolean(player.usernamePromptSeen) ||
        normalizeUsername(player.username) !== DEFAULT_USERNAME,
      connected: false,
      lastSeenAt: ctx.timestamp,
    });

    upsertAdminPlayerGameplaySave(ctx, nextPlayer.identity, safeSaveJson, existingSave);
    upsertAdminLeaderboardEntry(ctx, nextPlayer);
    updateAdminWorldEventLeaderboardProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );
    updateTradeAllianceMemberProfile(
      ctx,
      nextPlayer.identity,
      nextPlayer.username,
      nextPlayer.playerLevel,
    );
    kickAdminPlayerSession(ctx, nextPlayer.identity);
  },
);

export const admin_kick_player_session = spacetimedb.reducer(
  {
    identityHex: t.string(),
  },
  (ctx, { identityHex }) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    kickAdminPlayerSession(ctx, player.identity);
    ctx.db.player.identity.update({
      ...player,
      connected: false,
      lastSeenAt: ctx.timestamp,
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
      character: normalizePlayerCharacter(sourcePlayer.character),
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
    moveAdminPlayerInboxMail(ctx, sourcePlayer.identity, nextTargetPlayer.identity);
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

export const admin_copy_player_progression = spacetimedb.reducer(
  {
    sourceIdentityHex: t.string(),
    targetIdentityHex: t.string(),
  },
  (ctx, { sourceIdentityHex, targetIdentityHex }) => {
    assertGameConfigAdmin(ctx);

    const sourcePlayer = findPlayerByIdentityHex(ctx, sourceIdentityHex);
    const targetPlayer = findPlayerByIdentityHex(ctx, targetIdentityHex);
    if (sourcePlayer.identity.isEqual(targetPlayer.identity)) {
      throw new Error('Source and target players must differ.');
    }

    const sourceSave = ctx.db.playerGameplaySave.identity.find(sourcePlayer.identity);
    if (!sourceSave) {
      throw new Error('Cannot copy missing source player save.');
    }

    const targetUsername = normalizeUsername(targetPlayer.username);
    const sourceSaveLevel = readSavedCurrentLevel(sourceSave.saveJson) ?? DEFAULT_PLAYER_LEVEL;
    const targetPlayerLevel = normalizePlayerLevel(
      Math.max(normalizePlayerLevel(sourcePlayer.playerLevel), sourceSaveLevel),
    );

    copyAdminPlayerGameplaySave(ctx, sourcePlayer.identity, targetPlayer.identity);

    const nextTargetPlayer = ctx.db.player.identity.update({
      ...targetPlayer,
      username: targetUsername,
      playerLevel: targetPlayerLevel,
      theme: normalizePlayerTheme(targetPlayer.theme),
      colorMode: normalizePlayerColorMode(targetPlayer.colorMode),
      font: normalizePlayerFont(targetPlayer.font),
      character: normalizePlayerCharacter(targetPlayer.character),
      usernamePromptSeen:
        Boolean(targetPlayer.usernamePromptSeen) || targetUsername !== DEFAULT_USERNAME,
      connected: false,
      lastSeenAt: ctx.timestamp,
    });

    copyAdminLeaderboardEntry(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      nextTargetPlayer.username,
      nextTargetPlayer.playerLevel,
    );
    copyAdminWorldEventLeaderboardEntries(
      ctx,
      sourcePlayer.identity,
      nextTargetPlayer.identity,
      nextTargetPlayer.username,
      nextTargetPlayer.playerLevel,
    );
    updateTradeAllianceMemberProfile(
      ctx,
      nextTargetPlayer.identity,
      nextTargetPlayer.username,
      nextTargetPlayer.playerLevel,
    );
    kickAdminPlayerSession(ctx, nextTargetPlayer.identity);
  },
);

export const admin_set_player_plot_capacity_research_by_identity = spacetimedb.reducer(
  {
    identityHex: t.string(),
    plotNumber: t.u32(),
    correctionKey: t.string(),
  },
  (ctx, { identityHex, plotNumber, correctionKey }) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const identityKey = getIdentityHex(player.identity);
    const stateKey =
      `player-plot-capacity-correction:${identityKey}:` +
      normalizeMaintenanceKey(correctionKey);
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    const existingSave = ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined;
    const safeSaveJson = createAdminPlotCapacityCorrectionSaveJson(
      ctx,
      existingSave,
      player.identity,
      plotNumber,
    );

    upsertAdminPlayerGameplaySave(ctx, player.identity, safeSaveJson, existingSave);
    kickAdminPlayerSession(ctx, player.identity);
    ctx.db.player.identity.update({
      ...player,
      connected: false,
      lastSeenAt: ctx.timestamp,
    });
    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const set_player_gameplay_save = spacetimedb.reducer(
  { saveJson: t.string() },
  (ctx, { saveJson }) => {
    assertActivePlayerSession(ctx, { allowMaintenanceDrainSave: true });

    const player = ensurePlayer(ctx);

    const existingSave = ctx.db.playerGameplaySave.identity.find(ctx.sender) ?? undefined;
    let safeSaveJson = mergePreviousResearchProgressIntoSaveJson(
      ctx,
      validatePlayerGameplaySaveJson(
        ctx,
        saveJson,
        existingSave?.saveJson,
      ),
      existingSave?.saveJson,
    );
    safeSaveJson = mergePendingAdminCurrencyGrantsIntoSaveJson(
      ctx,
      ctx.sender,
      safeSaveJson,
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

    if (
      !hasAcceptedPlayerGameplaySave(ctx, player.identity) &&
      reportedTotalIncome !== null &&
      reportedTotalIncome > 0n
    ) {
      return;
    }

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

export const set_world_event_contribution_points = spacetimedb.reducer(
  {
    periodKey: t.string(),
    eventId: t.string(),
    points: t.u64(),
  },
  (ctx, { periodKey, eventId, points }) => {
    assertActivePlayerSession(ctx);

    const safePeriodKey = normalizeWorldEventPeriodKey(periodKey);
    const safeEventId = normalizeWorldEventId(eventId);
    if (!safePeriodKey || !safeEventId || safePeriodKey !== getWorldEventPeriodKey(ctx)) {
      return;
    }

    const player = ensurePlayer(ctx, { touchLastSeen: false });
    const safePlayerLevel = normalizePlayerLevel(player.playerLevel);
    const reportedPoints = normalizeReportedWorldEventLeaderboardPoints(
      points,
      safePlayerLevel,
    );
    const contributionKey = getWorldEventLeaderboardKey(
      player.identity,
      safePeriodKey,
      safeEventId,
    );
    const existingEntry = ctx.db.worldEventLeaderboard.contributionKey.find(contributionKey);
    const currentPoints = existingEntry
      ? clampWorldEventLeaderboardPoints(existingEntry.points, safePlayerLevel)
      : 0n;

    if (!hasAcceptedPlayerGameplaySave(ctx, player.identity)) {
      if (existingEntry) {
        ctx.db.worldEventLeaderboard.delete(existingEntry);
      }

      return;
    }

    if (reportedPoints === null) {
      if (!existingEntry) {
        return;
      }

      if (
        currentPoints !== existingEntry.points ||
        existingEntry.username !== player.username ||
        existingEntry.playerLevel !== safePlayerLevel
      ) {
        ctx.db.worldEventLeaderboard.contributionKey.update({
          ...existingEntry,
          username: player.username,
          playerLevel: safePlayerLevel,
          points: currentPoints,
          updatedAt: ctx.timestamp,
        });
      }

      return;
    }

    const nextPoints = reportedPoints > currentPoints ? reportedPoints : currentPoints;

    if (!existingEntry) {
      if (nextPoints <= 0n) {
        return;
      }

      ctx.db.worldEventLeaderboard.insert({
        contributionKey,
        identity: player.identity,
        periodKey: safePeriodKey,
        eventId: safeEventId,
        username: player.username,
        playerLevel: safePlayerLevel,
        points: nextPoints,
        updatedAt: ctx.timestamp,
      });
      return;
    }

    if (
      nextPoints === existingEntry.points &&
      existingEntry.username === player.username &&
      existingEntry.playerLevel === safePlayerLevel
    ) {
      return;
    }

    ctx.db.worldEventLeaderboard.contributionKey.update({
      ...existingEntry,
      username: player.username,
      playerLevel: safePlayerLevel,
      points: nextPoints,
      updatedAt: ctx.timestamp,
    });
  },
);

export const admin_send_player_inbox_mail = spacetimedb.reducer(
  {
    identityHex: t.string(),
    sourceKey: t.string(),
    title: t.string(),
    body: t.string(),
    coinReward: t.u64(),
    crystalReward: t.u32(),
    rubyReward: t.u32(),
    emeraldReward: t.u32(),
    itemRewardsJson: t.string(),
  },
  (
    ctx,
    {
      identityHex,
      sourceKey,
      title,
      body,
      coinReward,
      crystalReward,
      rubyReward,
      emeraldReward,
      itemRewardsJson,
    },
  ) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const rewards = normalizePlayerInboxRewards(ctx, {
      coinReward,
      crystalReward,
      rubyReward,
      emeraldReward,
      itemRewardsJson,
    });

    insertPlayerInboxMail(ctx, {
      recipientIdentity: player.identity,
      sourceType: 'admin',
      sourceKey,
      senderLabel: 'admin',
      title,
      body,
      rewards,
    });
  },
);

export const admin_send_player_inbox_broadcast = spacetimedb.reducer(
  {
    sourceKey: t.string(),
    title: t.string(),
    body: t.string(),
    coinReward: t.u64(),
    crystalReward: t.u32(),
    rubyReward: t.u32(),
    emeraldReward: t.u32(),
    itemRewardsJson: t.string(),
  },
  (
    ctx,
    {
      sourceKey,
      title,
      body,
      coinReward,
      crystalReward,
      rubyReward,
      emeraldReward,
      itemRewardsJson,
    },
  ) => {
    assertGameConfigAdmin(ctx);

    const rewards = normalizePlayerInboxRewards(ctx, {
      coinReward,
      crystalReward,
      rubyReward,
      emeraldReward,
      itemRewardsJson,
    });

    for (const player of Array.from(ctx.db.player.iter())) {
      insertPlayerInboxMail(ctx, {
        recipientIdentity: player.identity,
        sourceType: 'news',
        sourceKey,
        senderLabel: 'news',
        title,
        body,
        rewards,
      });
    }
  },
);

export const admin_settle_world_event_inbox_rewards = spacetimedb.reducer(
  {
    periodKey: t.string(),
    eventId: t.string(),
    headline: t.string(),
  },
  (ctx, { periodKey, eventId, headline }) => {
    assertGameConfigAdmin(ctx);

    const safePeriodKey = normalizeWorldEventPeriodKey(periodKey);
    const safeEventId = normalizeWorldEventId(eventId);
    if (!safePeriodKey || !safeEventId) {
      throw new Error('Invalid world event reward settlement key.');
    }

    settleWorldEventInboxRewards(ctx, {
      periodKey: safePeriodKey,
      eventId: safeEventId,
      headline,
      markSettled: isEndedWorldEventPeriod(ctx, safePeriodKey),
    });
  },
);

export const mark_player_inbox_mail_read = spacetimedb.reducer(
  { mailKey: t.string() },
  (ctx, { mailKey }) => {
    assertActivePlayerSession(ctx);

    const mail = findOwnPlayerInboxMail(ctx, mailKey);
    if (!mail || mail.read) {
      return;
    }

    ctx.db.playerInboxMail.mailKey.update({
      ...mail,
      read: true,
    });
  },
);

export const collect_player_inbox_mail_reward = spacetimedb.reducer(
  { mailKey: t.string() },
  (ctx, { mailKey }) => {
    assertActivePlayerSession(ctx);

    const mail = findOwnPlayerInboxMail(ctx, mailKey);
    if (!mail || mail.rewardCollected) {
      return;
    }

    ctx.db.playerInboxMail.mailKey.update({
      ...mail,
      read: true,
      rewardCollected: true,
    });
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

    let player = ensurePlayer(ctx);
    const gameplaySave = ctx.db.playerGameplaySave.identity.find(ctx.sender);
    if (gameplaySave) {
      player = syncPlayerLevelFromGameplaySave(ctx, player, gameplaySave.saveJson);
    }

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

    deleteTradeAllianceApplicationsForIdentity(ctx, ctx.sender);
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

    const allianceApplications = Array.from(
      ctx.db.tradeAllianceApplication.byAllianceId.filter(alliance.allianceId),
    );
    if (allianceApplications.length >= MAX_TRADE_ALLIANCE_PENDING_APPLICATIONS) {
      throw new Error('Alliance applications are full.');
    }

    const ownApplicationCount = Array.from(
      ctx.db.tradeAllianceApplication.byApplicantIdentity.filter(ctx.sender),
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

    deleteTradeAllianceApplicationsForIdentity(ctx, application.applicantIdentity);
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

    const target = findTradeAllianceMemberByIdentityHex(ctx, memberIdentityHex);

    if (
      !target ||
      getTradeAllianceIdKey(target.allianceId) !== getTradeAllianceIdKey(leader.allianceId) ||
      target.memberIdentity.isEqual(ctx.sender)
    ) {
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

    const target = findTradeAllianceMemberByIdentityHex(ctx, memberIdentityHex);

    if (
      !target ||
      getTradeAllianceIdKey(target.allianceId) !== getTradeAllianceIdKey(actor.allianceId)
    ) {
      throw new Error('Alliance member not found.');
    }

    const manager = assertTradeAllianceCanManageMember(ctx, actor.allianceId, target, actor);
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

    const target = findTradeAllianceMemberByIdentityHex(ctx, memberIdentityHex);

    if (
      !target ||
      getTradeAllianceIdKey(target.allianceId) !== getTradeAllianceIdKey(actor.allianceId)
    ) {
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

    const member = getTradeAllianceMember(ctx);
    if (!member) {
      throw new Error('Alliance chat requires membership.');
    }

    const alliance = findTradeAllianceById(ctx, getTradeAllianceIdKey(member.allianceId));
    assertTradeAllianceChatRateLimit(ctx, alliance.allianceId);

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
    const target = findTradeAllianceMemberByIdentityHex(ctx, memberIdentityHex);

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
    marketId: t.string(),
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.f64(),
  },
  (ctx, { marketId, slotNumber, itemKey, itemLabel, itemKind, quantity, priceGold }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const activeMarketId = assertActiveMarket(ctx, marketId);
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
    const listingKey = getPlayerShopListingKey(ctx, safeSlotNumber, activeMarketId);
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
      marketId: activeMarketId,
    };

    if (existingListing) {
      ctx.db.playerShopListing.listingKey.update(nextListing);
      return;
    }

    ctx.db.playerShopListing.insert(nextListing);
  },
);

export const clear_player_shop_slot = spacetimedb.reducer(
  { marketId: t.string(), slotNumber: t.u8() },
  (ctx, { marketId, slotNumber }) => {
    assertActivePlayerSession(ctx);

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const activeMarketId = assertActiveMarket(ctx, marketId);
    const listingKey = getPlayerShopListingKey(ctx, safeSlotNumber, activeMarketId);
    const existingListing = ctx.db.playerShopListing.listingKey.find(listingKey);

    if (!existingListing || !existingListing.sellerIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.playerShopListing.delete(existingListing);
  },
);

export const set_player_shop_request = spacetimedb.reducer(
  {
    marketId: t.string(),
    slotNumber: t.u8(),
    itemKey: t.string(),
    itemLabel: t.string(),
    itemKind: t.string(),
    quantity: t.u32(),
    priceGold: t.f64(),
  },
  (ctx, { marketId, slotNumber, itemKey, itemLabel, itemKind, quantity, priceGold }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const activeMarketId = assertActiveMarket(ctx, marketId);
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
    const requestKey = getPlayerShopRequestKey(ctx, safeSlotNumber, activeMarketId);
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
      marketId: activeMarketId,
    };

    if (existingRequest) {
      ctx.db.playerShopRequest.requestKey.update(nextRequest);
      return;
    }

    ctx.db.playerShopRequest.insert(nextRequest);
  },
);

export const clear_player_shop_request = spacetimedb.reducer(
  { marketId: t.string(), slotNumber: t.u8() },
  (ctx, { marketId, slotNumber }) => {
    assertActivePlayerSession(ctx);

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const activeMarketId = assertActiveMarket(ctx, marketId);
    const requestKey = getPlayerShopRequestKey(ctx, safeSlotNumber, activeMarketId);
    const existingRequest = ctx.db.playerShopRequest.requestKey.find(requestKey);

    if (!existingRequest || !existingRequest.requesterIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.playerShopRequest.delete(existingRequest);
  },
);

export const buy_player_shop_listing = spacetimedb.reducer(
  { marketId: t.string(), listingKey: t.string(), quantity: t.u32() },
  (ctx, { marketId, listingKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeListingKey = normalizePlayerShopText(listingKey, 120);
    const activeMarketId = assertActiveMarket(ctx, marketId);
    const listing = ctx.db.playerShopListing.listingKey.find(safeListingKey);

    if (!listing) {
      throw new Error('Player shop listing no longer exists.');
    }

    if (getRowMarketId(listing) !== activeMarketId) {
      throw new Error('Player shop listing belongs to another market.');
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

    addClaimablePlayerShopGold(ctx, listing.sellerIdentity, proceedsGold, activeMarketId);
    grantPotionDiscoveryPassiveGold(
      ctx,
      listing.itemKey,
      proceedsGold,
      listing.sellerIdentity,
      activeMarketId,
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
      marketId: activeMarketId,
    });
    prunePlayerShopTradeHistory(ctx);
  },
);

export const claim_player_shop_proceeds = spacetimedb.reducer(
  { marketId: t.string() },
  (ctx, { marketId }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const activeMarketId = assertActiveMarket(ctx, marketId);
    if (activeMarketId === defaultMarketId) {
      const proceeds = ctx.db.playerShopProceeds.sellerIdentity.find(ctx.sender);
      if (proceeds) {
        ctx.db.playerShopProceeds.delete(proceeds);
      }
      return;
    }

    const proceeds = ctx.db.playerShopMarketProceeds.proceedsKey.find(
      getPlayerShopMarketProceedsKey(ctx.sender, activeMarketId),
    );
    if (proceeds) {
      ctx.db.playerShopMarketProceeds.delete(proceeds);
    }
  },
);

export const sell_to_npc = spacetimedb.reducer(
  { marketId: t.string(), itemKey: t.string(), quantity: t.u32() },
  (ctx, { marketId, itemKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    const safeQuantity = validateNpcMarketQuantity(quantity);
    const activeMarketId = assertActiveMarket(ctx, marketId);
    const row = ensureNpcMarketItem(ctx, itemKey, activeMarketId);
    const tradeQuantity = BigInt(safeQuantity);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey, activeMarketId);
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
    recordMarketDemandDaily(ctx, row, {
      npcSoldQuantity: tradeQuantity,
      marketPriceGold: nextMarketPriceGold,
      npcStock: nextNpcStock,
      targetStock: marketConfig.targetStock,
      demandScore: tunedMarket.demandScore,
      supplyScore: tunedMarket.supplyScore,
    });
    grantPotionDiscoveryPassiveGold(
      ctx,
      itemKey,
      totalSellGold,
      ctx.sender,
      activeMarketId,
    );
  },
);

export const buy_from_npc = spacetimedb.reducer(
  { marketId: t.string(), itemKey: t.string(), quantity: t.u32() },
  (ctx, { marketId, itemKey, quantity }) => {
    assertActivePlayerSession(ctx);

    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    const safeQuantity = validateNpcMarketQuantity(quantity);
    const activeMarketId = assertActiveMarket(ctx, marketId);
    const row = ensureNpcMarketItem(ctx, itemKey, activeMarketId);

    const tradeQuantity = BigInt(safeQuantity);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey, activeMarketId);
    const needState = getNpcMarketNeedState(row, marketConfig.targetStock);
    const npcStock = getNpcMarketStock(row);
    const demandScore = toBigInt(row.demandScore);

    if (npcStock < tradeQuantity) {
      throw new Error('NPC market item has no stock.');
    }

    const nextNpcStock = npcStock - tradeQuantity;
    const nextNpcNeed = clampBigInt(
      needState.npcNeed + tradeQuantity,
      0n,
      needState.maxNeed,
    );
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
    recordMarketDemandDaily(ctx, row, {
      npcBoughtQuantity: tradeQuantity,
      marketPriceGold: nextMarketPriceGold,
      npcStock: nextNpcStock,
      targetStock: marketConfig.targetStock,
      demandScore: tunedMarket.demandScore,
      supplyScore: tunedMarket.supplyScore,
    });
  },
);

export const reset_npc_market = spacetimedb.reducer({}, (ctx) => {
  assertNpcMarketAdmin(ctx);
  ensureNpcMarketCatalog(ctx);
  resetNpcMarketRows(ctx, { resetStock: true });
  insertSystemWorldChatMessage(ctx, NPC_MARKET_FILLED_ANNOUNCEMENT_BODY);
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
    marketId: t.string(),
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
      marketId,
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
    const safeMarketId = normalizeMarketId(marketId);
    const safeItemLabel = normalizePlayerShopText(itemLabel, MAX_ITEM_LABEL_LENGTH);
    const safeItemKind = normalizePlayerShopText(itemKind, MAX_ITEM_KIND_LENGTH);

    if (!safeItemKey || !safeItemLabel || !safeItemKind) {
      throw new Error('NPC market item config requires key, label, and kind.');
    }

    const safeBasePriceGold = validateNpcMarketBasePriceGold(basePriceGold);
    const safeTargetStock = validateNpcMarketTargetStock(targetStock);
    const safeVolatilityBps = validateNpcMarketVolatilityBps(volatilityBps);
    const catalogItem = npcMarketCatalogByItemKey.get(safeItemKey);
    const storageKey = getMarketScopedItemKey(safeMarketId, safeItemKey);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(storageKey);
    const defaultBasePriceGold = existingConfig
      ? normalizeNpcMarketBasePriceGold(
          existingConfig.defaultBasePriceGold,
          catalogItem?.basePriceGold ?? safeBasePriceGold,
          existingConfig.priceScale,
        )
      : (catalogItem?.basePriceGold ?? safeBasePriceGold);
    const nextConfig = {
      itemKey: storageKey,
      itemLabel: safeItemLabel,
      itemKind: safeItemKind,
      defaultBasePriceGold: toStoredGoldPrice(defaultBasePriceGold),
      basePriceGold: toStoredGoldPrice(safeBasePriceGold),
      priceScale: GOLD_PRICE_SCALE,
      targetStock: safeTargetStock,
      volatilityBps: safeVolatilityBps,
      enabled,
      updatedAt: ctx.timestamp,
      marketId: safeMarketId,
      catalogItemKey: safeItemKey,
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
      deleteNpcMarketPriceIfPresent(ctx, safeItemKey, safeMarketId);
      return;
    }

    const existingRow = ctx.db.npcMarketPrice.itemKey.find(storageKey);

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

    ensureNpcMarketItem(ctx, safeItemKey, safeMarketId);
  },
);

export const remove_npc_market_item_config = spacetimedb.reducer(
  { marketId: t.string(), itemKey: t.string() },
  (ctx, { marketId, itemKey }) => {
    assertGameConfigAdmin(ctx);

    const safeItemKey = normalizeNpcMarketItemKey(itemKey);
    const safeMarketId = normalizeMarketId(marketId);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(
      getMarketScopedItemKey(safeMarketId, safeItemKey),
    );

    if (existingConfig) {
      ctx.db.npcMarketItemConfig.itemKey.update({
        ...existingConfig,
        enabled: false,
        updatedAt: ctx.timestamp,
      });
    }

    deleteNpcMarketPriceIfPresent(ctx, safeItemKey, safeMarketId);
  },
);

export const set_npc_market_item_base_price = spacetimedb.reducer(
  { marketId: t.string(), itemKey: t.string(), basePriceGold: t.f64() },
  (ctx, { marketId, itemKey, basePriceGold }) => {
    assertGameConfigAdmin(ctx);

    const safeMarketId = normalizeMarketId(marketId);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey, safeMarketId);
    const safeBasePriceGold = validateNpcMarketBasePriceGold(basePriceGold);
    const existingConfig = ctx.db.npcMarketItemConfig.itemKey.find(
      marketConfig.storageKey,
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

    const existingRow = ctx.db.npcMarketPrice.itemKey.find(marketConfig.storageKey);

    if (!existingRow) {
      ensureNpcMarketItem(ctx, marketConfig.itemKey, safeMarketId);
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
    deleteAllPlayerInboxMail(ctx);
    deleteAllLeaderboardState(ctx);
    deleteAllWorldChatMessages(ctx);
    deleteAllTradeAllianceState(ctx);
    deleteAllPlayerShopState(ctx);
    deleteAllPotionDiscoveries(ctx);
    deleteAllPlayerFeedback(ctx);
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
    deleteAllPlayerInboxMail(ctx);
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

export const admin_wipe_zero_income_player_data = spacetimedb.reducer(
  { resetKey: t.string() },
  (ctx, { resetKey }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const stateKey = `zero-income-player-data-wipe:${normalizeMaintenanceKey(resetKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    deletePlayerDataForIdentities(ctx, getZeroIncomePlayerIdentities(ctx));

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const admin_cleanup_zero_total_coin_players_and_grant_currency = spacetimedb.reducer(
  {
    resetKey: t.string(),
    emeraldAmount: t.u32(),
    rubyAmount: t.u32(),
    crystalAmount: t.u32(),
  },
  (ctx, { resetKey, emeraldAmount, rubyAmount, crystalAmount }) => {
    assertGameConfigAdmin(ctx);
    assertMaintenanceLocked(ctx);

    const stateKey = `zero-total-coin-cleanup-currency-grant:${normalizeMaintenanceKey(resetKey)}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }

    deletePlayerDataForIdentities(ctx, getZeroTotalCoinPlayerIdentities(ctx));
    grantAdminCurrencyBonusToRemainingPlayers(ctx, {
      emeraldAmount,
      rubyAmount,
      crystalAmount,
    });

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export const admin_grant_player_currency_by_identity = spacetimedb.reducer(
  {
    identityHex: t.string(),
    resetKey: t.string(),
    emeraldAmount: t.u32(),
    rubyAmount: t.u32(),
    crystalAmount: t.u32(),
  },
  (ctx, { identityHex, resetKey, emeraldAmount, rubyAmount, crystalAmount }) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const identityKey = getIdentityHex(player.identity);
    const grantKey = normalizeMaintenanceKey(resetKey);
    const stateKey = `player-currency-grant:${identityKey}:${grantKey}`;
    if (ctx.db.maintenanceState.stateKey.find(stateKey)) {
      return;
    }
    const safeEmeraldAmount = assertAdminCurrencyGrantAmount(
      emeraldAmount,
      MAX_PLAYER_SAVE_CURRENT_EMERALD,
      'emerald',
    );
    const safeRubyAmount = assertAdminCurrencyGrantAmount(
      rubyAmount,
      MAX_PLAYER_SAVE_CURRENT_RUBY,
      'ruby',
    );
    const safeCrystalAmount = assertAdminCurrencyGrantAmount(
      crystalAmount,
      MAX_PLAYER_SAVE_CURRENT_CRYSTAL,
      'crystal',
    );
    const pendingStateKey = [
      `player-currency-grant-pending:${identityKey}`,
      safeEmeraldAmount,
      safeRubyAmount,
      safeCrystalAmount,
      grantKey,
    ].join(':');

    const safeSaveJson = createAdminPlayerCurrencyBonusSaveJson(
      ctx,
      ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined,
      player.identity,
      {
        emeraldDelta: safeEmeraldAmount,
        rubyDelta: safeRubyAmount,
        crystalDelta: safeCrystalAmount,
      },
    );
    const existingSave = ctx.db.playerGameplaySave.identity.find(player.identity) ?? undefined;

    upsertAdminPlayerGameplaySave(ctx, player.identity, safeSaveJson, existingSave);
    kickAdminPlayerSession(ctx, player.identity);
    ctx.db.player.identity.update({
      ...player,
      connected: false,
      lastSeenAt: ctx.timestamp,
    });
    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
    ctx.db.maintenanceState.insert({
      stateKey: pendingStateKey,
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
    deletePlayerInboxForIdentity(ctx, nextPlayer.identity);
    resetLeaderboardProgressForIdentity(ctx, nextPlayer.identity, nextPlayer.username);
    deleteTradeAllianceProgressionForIdentity(ctx, nextPlayer.identity);
    deletePlayerShopProgressionForIdentity(ctx, nextPlayer.identity);
    deletePlayerFeedbackForIdentity(ctx, nextPlayer.identity);
    deleteAdminPlayerSession(ctx, nextPlayer.identity);

    ctx.db.maintenanceState.insert({
      stateKey,
      appliedAt: ctx.timestamp,
    });
  },
);

export default spacetimedb;
