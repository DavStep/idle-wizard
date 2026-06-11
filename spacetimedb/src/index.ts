import { type Identity } from 'spacetimedb';
import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const DEFAULT_PLAYER_LEVEL = 1;
const DEFAULT_PLAYER_THEME = 'white';
const DEFAULT_PLAYER_COLOR_MODE = 'monochrome';
const MAX_REPORTED_PLAYER_LEVEL = 20;
const ENABLE_CLIENT_REPORTED_PLAYER_LEVEL = true;
const ENABLE_CLIENT_REPORTED_TOTAL_INCOME = false;
const ENABLE_CLIENT_RESEARCH_ANNOUNCEMENTS = false;
const ENABLE_CLIENT_POTION_DISCOVERY = false;
const ENABLE_PLAYER_SHOP_EXCHANGE = false;
const ENABLE_NPC_MARKET_PRESSURE = true;
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
const MAX_FEEDBACK_BODY_LENGTH = 2000;
const WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS = 15n * 1_000_000n;
const WORLD_CHAT_RATE_LIMIT_MAX_MESSAGES = 3;
const WORLD_CHAT_GLOBAL_RATE_LIMIT_MAX_MESSAGES = 8;
const FEEDBACK_RATE_LIMIT_WINDOW_MICROS = 10n * 60n * 1_000_000n;
const FEEDBACK_RATE_LIMIT_MAX_MESSAGES = 5;
const MAX_RESEARCH_NAME_LENGTH = 80;
const MAX_RESEARCH_ID_LENGTH = 96;
const MAX_RESEARCH_LABEL_LENGTH = 80;
const MAX_RESEARCH_GROUP_ID_LENGTH = 32;
const WORLD_CHAT_HISTORY_LIMIT = 200;
const PLAYER_SHOP_TRADE_HISTORY_LIMIT = 80;
const MAX_PLAYER_SHOP_SLOTS = 5;
const MAX_PLAYER_SHOP_LISTING_QUANTITY = 1_000;
const MAX_PLAYER_SHOP_PRICE_GOLD = 1_000_000n;
const PLAYER_SHOP_MAX_PRICE_MULTIPLIER_BPS = 50_000n;
const MAX_PLAYER_SHOP_TRADE_TOTAL_GOLD = 10_000_000n;
const MAX_PLAYER_SHOP_PROCEEDS_GOLD = 50_000_000n;
const MAX_ITEM_KEY_LENGTH = 64;
const MAX_ITEM_LABEL_LENGTH = 80;
const MAX_ITEM_KIND_LENGTH = 24;
const NPC_MARKET_TICK_MICROS = 5n * 60n * 1_000_000n;
const NPC_MARKET_DECAY_NUMERATOR = 85n;
const NPC_MARKET_DECAY_DENOMINATOR = 100n;
const NPC_MARKET_BUY_BPS = 8_000n;
const NPC_MARKET_SELL_BPS = 12_000n;
const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;
const NPC_MARKET_MAX_BASE_PRICE_GOLD = 1_000_000_000n;
const NPC_MARKET_MAX_TARGET_STOCK = 10_000_000n;
const NPC_MARKET_MAX_VOLATILITY_BPS = 10_000n;
const NPC_MARKET_DEFAULT_CUSTOM_TARGET_STOCK = 100n;
const NPC_MARKET_DEFAULT_CUSTOM_VOLATILITY_BPS = 800n;
const MAX_RESEARCH_COST_GOLD = 1_000_000_000n;
const MAX_GAME_CONFIG_KEY_LENGTH = 48;
const MAX_GAME_CONFIG_JSON_LENGTH = 80_000;
const MAX_GAME_CONFIG_LEVELS = 20;
const MAX_GAME_CONFIG_TASKS_PER_LEVEL = 5;
const MAX_GAME_CONFIG_TASK_QUANTITY = 1_000_000;
const MAX_GAME_CONFIG_RESOURCE_LIMIT = 1_000_000;
const MAX_PLAYER_GAMEPLAY_SAVE_JSON_LENGTH = 250_000;
const LEADERBOARD_TOTAL_INCOME_CAP_PER_LEVEL = 10_000_000n;
const RESERVED_USERNAMES = new Set(['admin', 'system']);
const PLAYER_THEMES = new Set(['white', 'black']);
const PLAYER_COLOR_MODES = new Set(['monochrome', 'resources']);

// Fill this with owner SpacetimeDB identity hex strings before publishing a fresh DB.
// Legacy npc_market_admin rows are audit/display only; they are not authorization.
const NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST: string[] = [];
const npcMarketAdminIdentityAllowlist = new Set(
  NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST.map((identityHex) =>
    normalizeIdentityHex(identityHex),
  ).filter(Boolean),
);

const DEFAULT_TASKS_CONFIG_JSON = "{\"levels\":[{\"level\":1,\"tasks\":[{\"id\":\"level1-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":20},{\"id\":\"level1-sage-herb\",\"itemKey\":\"sageHerb\",\"quantity\":10},{\"id\":\"level1-mana-tonic\",\"itemKey\":\"manaTonic\",\"quantity\":2},{\"id\":\"level1-mint-seeds\",\"itemKey\":\"mintSeed\",\"quantity\":15},{\"id\":\"level1-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":8}]},{\"level\":2,\"tasks\":[{\"id\":\"level2-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":35},{\"id\":\"level2-nettle-herb\",\"itemKey\":\"nettleHerb\",\"quantity\":18},{\"id\":\"level2-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":4},{\"id\":\"level2-lavender-seeds\",\"itemKey\":\"lavenderSeed\",\"quantity\":30},{\"id\":\"level2-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":3}]},{\"level\":3,\"tasks\":[{\"id\":\"level3-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":60},{\"id\":\"level3-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":30},{\"id\":\"level3-minor-healing-potion\",\"itemKey\":\"minorHealingPotion\",\"quantity\":6},{\"id\":\"level3-briar-seeds\",\"itemKey\":\"briarSeed\",\"quantity\":45},{\"id\":\"level3-simple-antidote\",\"itemKey\":\"simpleAntidote\",\"quantity\":5}]},{\"level\":4,\"tasks\":[{\"id\":\"level4-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":42},{\"id\":\"level4-briar-herb\",\"itemKey\":\"briarHerb\",\"quantity\":38},{\"id\":\"level4-venom-draught\",\"itemKey\":\"venomDraught\",\"quantity\":7},{\"id\":\"level4-glowcap-seeds\",\"itemKey\":\"glowcapSeed\",\"quantity\":65},{\"id\":\"level4-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":6}]},{\"level\":5,\"tasks\":[{\"id\":\"level5-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":100},{\"id\":\"level5-glowcap-herb\",\"itemKey\":\"glowcapHerb\",\"quantity\":55},{\"id\":\"level5-lantern-tonic\",\"itemKey\":\"lanternTonic\",\"quantity\":9},{\"id\":\"level5-mandrake-seeds\",\"itemKey\":\"mandrakeSeed\",\"quantity\":80},{\"id\":\"level5-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":8}]},{\"level\":6,\"tasks\":[{\"id\":\"level6-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":110},{\"id\":\"level6-mandrake-herb\",\"itemKey\":\"mandrakeHerb\",\"quantity\":65},{\"id\":\"level6-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":12},{\"id\":\"level6-sunroot-seeds\",\"itemKey\":\"sunrootSeed\",\"quantity\":90},{\"id\":\"level6-sunroot-stamina\",\"itemKey\":\"sunrootStamina\",\"quantity\":10}]},{\"level\":7,\"tasks\":[{\"id\":\"level7-moonflower-seeds\",\"itemKey\":\"moonflowerSeed\",\"quantity\":105},{\"id\":\"level7-moonflower-herb\",\"itemKey\":\"moonflowerHerb\",\"quantity\":75},{\"id\":\"level7-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":12},{\"id\":\"level7-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":80},{\"id\":\"level7-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":14}]},{\"level\":8,\"tasks\":[{\"id\":\"level8-frostmoss-seeds\",\"itemKey\":\"frostmossSeed\",\"quantity\":125},{\"id\":\"level8-frostmoss-herb\",\"itemKey\":\"frostmossHerb\",\"quantity\":90},{\"id\":\"level8-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":16},{\"id\":\"level8-briar-herb\",\"itemKey\":\"briarHerb\",\"quantity\":95},{\"id\":\"level8-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":15}]},{\"level\":9,\"tasks\":[{\"id\":\"level9-dreambell-seeds\",\"itemKey\":\"dreambellSeed\",\"quantity\":145},{\"id\":\"level9-dreambell-herb\",\"itemKey\":\"dreambellHerb\",\"quantity\":105},{\"id\":\"level9-sleep-draught\",\"itemKey\":\"sleepDraught\",\"quantity\":18},{\"id\":\"level9-mana-tonic\",\"itemKey\":\"manaTonic\",\"quantity\":25},{\"id\":\"level9-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":18}]},{\"level\":10,\"tasks\":[{\"id\":\"level10-star-anise-seeds\",\"itemKey\":\"starAniseSeed\",\"quantity\":165},{\"id\":\"level10-star-anise-herb\",\"itemKey\":\"starAniseHerb\",\"quantity\":120},{\"id\":\"level10-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":20},{\"id\":\"level10-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":200},{\"id\":\"level10-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":24}]},{\"level\":11,\"tasks\":[{\"id\":\"level11-bloodrose-seeds\",\"itemKey\":\"bloodroseSeed\",\"quantity\":185},{\"id\":\"level11-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":135},{\"id\":\"level11-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":22},{\"id\":\"level11-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":25},{\"id\":\"level11-simple-antidote\",\"itemKey\":\"simpleAntidote\",\"quantity\":28}]},{\"level\":12,\"tasks\":[{\"id\":\"level12-dragonpepper-seeds\",\"itemKey\":\"dragonpepperSeed\",\"quantity\":205},{\"id\":\"level12-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":150},{\"id\":\"level12-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":24},{\"id\":\"level12-sunroot-stamina\",\"itemKey\":\"sunrootStamina\",\"quantity\":28},{\"id\":\"level12-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":26}]},{\"level\":13,\"tasks\":[{\"id\":\"level13-glowcap-seeds\",\"itemKey\":\"glowcapSeed\",\"quantity\":230},{\"id\":\"level13-mandrake-herb\",\"itemKey\":\"mandrakeHerb\",\"quantity\":165},{\"id\":\"level13-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":26},{\"id\":\"level13-star-anise-herb\",\"itemKey\":\"starAniseHerb\",\"quantity\":160},{\"id\":\"level13-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":30}]},{\"level\":14,\"tasks\":[{\"id\":\"level14-briar-seeds\",\"itemKey\":\"briarSeed\",\"quantity\":250},{\"id\":\"level14-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":180},{\"id\":\"level14-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":28},{\"id\":\"level14-venom-draught\",\"itemKey\":\"venomDraught\",\"quantity\":34},{\"id\":\"level14-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":32}]},{\"level\":15,\"tasks\":[{\"id\":\"level15-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":300},{\"id\":\"level15-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":220},{\"id\":\"level15-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":40},{\"id\":\"level15-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":38},{\"id\":\"level15-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":34}]},{\"level\":16,\"tasks\":[{\"id\":\"level16-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":330},{\"id\":\"level16-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":240},{\"id\":\"level16-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":44},{\"id\":\"level16-sleep-draught\",\"itemKey\":\"sleepDraught\",\"quantity\":38},{\"id\":\"level16-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":36}]},{\"level\":17,\"tasks\":[{\"id\":\"level17-moonflower-seeds\",\"itemKey\":\"moonflowerSeed\",\"quantity\":360},{\"id\":\"level17-frostmoss-herb\",\"itemKey\":\"frostmossHerb\",\"quantity\":260},{\"id\":\"level17-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":46},{\"id\":\"level17-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":42},{\"id\":\"level17-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":38}]},{\"level\":18,\"tasks\":[{\"id\":\"level18-star-anise-seeds\",\"itemKey\":\"starAniseSeed\",\"quantity\":390},{\"id\":\"level18-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":280},{\"id\":\"level18-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":48},{\"id\":\"level18-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":44},{\"id\":\"level18-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":40}]},{\"level\":19,\"tasks\":[{\"id\":\"level19-bloodrose-seeds\",\"itemKey\":\"bloodroseSeed\",\"quantity\":430},{\"id\":\"level19-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":310},{\"id\":\"level19-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":52},{\"id\":\"level19-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":46},{\"id\":\"level19-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":44}]},{\"level\":20,\"tasks\":[{\"id\":\"level20-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":500},{\"id\":\"level20-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":140},{\"id\":\"level20-dragonpepper-seeds\",\"itemKey\":\"dragonpepperSeed\",\"quantity\":460},{\"id\":\"level20-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":340},{\"id\":\"level20-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":60}]}]}";
const DEFAULT_PLAYER_LEVEL_CONFIG_JSON = "{\"maxLevel\":20,\"mana\":{\"baseMaxManaCap\":50,\"maxManaCapPerLevel\":50,\"baseManaPerSecond\":1,\"manaPerSecondPerLevel\":1},\"crystal\":{\"perLevel\":1},\"milestones\":[{\"level\":1,\"maxGardenTiles\":2,\"maxCauldrons\":1,\"maxNpcMarketStands\":1,\"maxPlayerMarketStands\":1},{\"level\":2,\"maxGardenTiles\":3,\"maxCauldrons\":1,\"maxNpcMarketStands\":1,\"maxPlayerMarketStands\":1},{\"level\":3,\"maxGardenTiles\":3,\"maxCauldrons\":1,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":5,\"maxGardenTiles\":5,\"maxCauldrons\":3,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":8,\"maxGardenTiles\":7,\"maxCauldrons\":3,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":10,\"maxGardenTiles\":8,\"maxCauldrons\":4,\"maxNpcMarketStands\":3,\"maxPlayerMarketStands\":3},{\"level\":13,\"maxGardenTiles\":9,\"maxCauldrons\":4,\"maxNpcMarketStands\":4,\"maxPlayerMarketStands\":4},{\"level\":17,\"maxGardenTiles\":10,\"maxCauldrons\":5,\"maxNpcMarketStands\":5,\"maxPlayerMarketStands\":5}]}";

const herbCatalog = [
  { key: 'sage', label: 'Sage', growthDurationMs: 20_000 },
  { key: 'mint', label: 'Mint', growthDurationMs: 25_000 },
  { key: 'nettle', label: 'Nettle', growthDurationMs: 30_000 },
  { key: 'lavender', label: 'Lavender', growthDurationMs: 40_000 },
  { key: 'briar', label: 'Briar', growthDurationMs: 50_000 },
  { key: 'glowcap', label: 'Glowcap', growthDurationMs: 60_000 },
  { key: 'mandrake', label: 'Mandrake', growthDurationMs: 75_000 },
  { key: 'sunroot', label: 'Sunroot', growthDurationMs: 90_000 },
  { key: 'moonflower', label: 'Moonflower', growthDurationMs: 105_000 },
  { key: 'frostmoss', label: 'Frostmoss', growthDurationMs: 120_000 },
  { key: 'dreambell', label: 'Dreambell', growthDurationMs: 135_000 },
  { key: 'starAnise', label: 'Star Anise', growthDurationMs: 150_000 },
  { key: 'bloodrose', label: 'Bloodrose', growthDurationMs: 180_000 },
  { key: 'dragonpepper', label: 'Dragonpepper', growthDurationMs: 210_000 },
];

const knownPotionCatalog = [
  { key: 'manaTonic', label: 'Mana Tonic' },
  { key: 'minorHealingPotion', label: 'Minor Healing Potion' },
  { key: 'nettleVigor', label: 'Nettle Vigor' },
  { key: 'calmingDraught', label: 'Calming Draught' },
  { key: 'simpleAntidote', label: 'Simple Antidote' },
  { key: 'venomDraught', label: 'Venom Draught' },
  { key: 'briarWard', label: 'Briar Ward' },
  { key: 'lanternTonic', label: 'Lantern Tonic' },
  { key: 'healingPotion', label: 'Healing Potion' },
  { key: 'moonlitFocus', label: 'Moonlit Focus' },
  { key: 'sunrootStamina', label: 'Sunroot Stamina' },
  { key: 'frostmossCleanse', label: 'Frostmoss Cleanse' },
  { key: 'sleepDraught', label: 'Sleep Draught' },
  { key: 'elixirOfLife', label: 'Elixir of Life' },
  { key: 'starLuckPhiltre', label: 'Star-Luck Philtre' },
  { key: 'dragonCourage', label: 'Dragon Courage' },
  { key: 'deepDreamVision', label: 'Deep Dream Vision' },
  { key: 'pactWard', label: 'Pact Ward' },
];

const unknownPotionCatalog = [
  { key: 'ashenMemory', label: 'Ashen Memory' },
  { key: 'silverleafQuiet', label: 'Silverleaf Quiet' },
  { key: 'emberSight', label: 'Ember Sight' },
  { key: 'thornSleep', label: 'Thorn Sleep' },
  { key: 'glassMoonElixir', label: 'Glass Moon Elixir' },
  { key: 'rootboundResolve', label: 'Rootbound Resolve' },
  { key: 'nightOrchardTonic', label: 'Night Orchard Tonic' },
  { key: 'starlessCourage', label: 'Starless Courage' },
  { key: 'frostveinDraught', label: 'Frostvein Draught' },
  { key: 'bloodlightWard', label: 'Bloodlight Ward' },
];

const herbMarketBasePriceGoldByKey: Record<string, bigint> = {
  sage: 8n,
  mint: 9n,
  nettle: 10n,
  lavender: 13n,
  briar: 15n,
  glowcap: 18n,
  mandrake: 22n,
  sunroot: 25n,
  moonflower: 30n,
  frostmoss: 35n,
  dreambell: 40n,
  starAnise: 45n,
  bloodrose: 55n,
  dragonpepper: 65n,
};

const potionMarketBasePriceGoldByKey: Record<string, bigint> = {
  manaTonic: 69n,
  minorHealingPotion: 75n,
  nettleVigor: 82n,
  calmingDraught: 94n,
  simpleAntidote: 125n,
  venomDraught: 157n,
  briarWard: 132n,
  lanternTonic: 125n,
  healingPotion: 113n,
  moonlitFocus: 157n,
  sunrootStamina: 194n,
  frostmossCleanse: 200n,
  sleepDraught: 250n,
  elixirOfLife: 313n,
  starLuckPhiltre: 319n,
  dragonCourage: 357n,
  deepDreamVision: 457n,
  pactWard: 338n,
  ashenMemory: 163n,
  silverleafQuiet: 163n,
  emberSight: 319n,
  thornSleep: 194n,
  glassMoonElixir: 357n,
  rootboundResolve: 219n,
  nightOrchardTonic: 307n,
  starlessCourage: 407n,
  frostveinDraught: 282n,
  bloodlightWard: 313n,
};

const researchDefaultCostGoldById: Record<string, bigint> = {
  'unlockSeed:sageSeed': 0n,
  'unlockSeed:mintSeed': 25n,
  'unlockSeed:nettleSeed': 50n,
  'unlockSeed:lavenderSeed': 90n,
  'unlockSeed:briarSeed': 150n,
  'unlockSeed:glowcapSeed': 240n,
  'unlockSeed:mandrakeSeed': 360n,
  'unlockSeed:sunrootSeed': 520n,
  'unlockSeed:moonflowerSeed': 720n,
  'unlockSeed:frostmossSeed': 980n,
  'unlockSeed:dreambellSeed': 1_300n,
  'unlockSeed:starAniseSeed': 1_700n,
  'unlockSeed:bloodroseSeed': 2_200n,
  'unlockSeed:dragonpepperSeed': 2_800n,
  'summonSeedsX2': 300n,
  'summonSeedsX3': 900n,
  'summonSeedsX4': 2_200n,
  'summonSeedsX5': 5_000n,
  'unlockRecipe:manaTonic': 80n,
  'unlockRecipe:minorHealingPotion': 120n,
  'unlockRecipe:nettleVigor': 170n,
  'unlockRecipe:calmingDraught': 240n,
  'unlockRecipe:simpleAntidote': 330n,
  'unlockRecipe:venomDraught': 450n,
  'unlockRecipe:briarWard': 600n,
  'unlockRecipe:lanternTonic': 780n,
  'unlockRecipe:healingPotion': 1_000n,
  'unlockRecipe:moonlitFocus': 1_260n,
  'unlockRecipe:sunrootStamina': 1_580n,
  'unlockRecipe:frostmossCleanse': 1_950n,
  'unlockRecipe:sleepDraught': 2_380n,
  'unlockRecipe:elixirOfLife': 2_880n,
  'unlockRecipe:starLuckPhiltre': 3_450n,
  'unlockRecipe:dragonCourage': 4_100n,
  'unlockRecipe:deepDreamVision': 4_850n,
  'unlockRecipe:pactWard': 5_700n,
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

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'Wasted Potion', basePriceGold: 1n },
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
    potionKey: 'healingPotion',
    manaCost: 26,
    brewDurationMs: 65_000,
    ingredients: [
      { itemKey: 'sageHerb', quantity: 2 },
      { itemKey: 'mandrakeHerb', quantity: 1 },
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
    potionKey: 'sunrootStamina',
    manaCost: 34,
    brewDurationMs: 75_000,
    ingredients: [
      { itemKey: 'sunrootHerb', quantity: 2 },
      { itemKey: 'nettleHerb', quantity: 2 },
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

const npcMarketCatalog = [
  ...herbCatalog.map((herb) => ({
    itemKey: `${herb.key}Seed`,
    itemLabel: `${herb.label} Seed`,
    itemKind: 'seed',
    basePriceGold: 1n,
    targetStock: 1_000n,
    volatilityBps: 1_200n,
  })),
  ...herbCatalog.map((herb) => ({
    itemKey: `${herb.key}Herb`,
    itemLabel: herb.label,
    itemKind: 'herb',
    basePriceGold: herbMarketBasePriceGoldByKey[herb.key] ?? 2n,
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
        : potionMarketBasePriceGoldByKey[potion.key] ?? 5n,
    targetStock: 300n,
    volatilityBps: 800n,
  })),
];

const npcMarketCatalogByItemKey = new Map(
  npcMarketCatalog.map((item) => [item.itemKey, item]),
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

const researchCatalog = [
  ...herbCatalog.map((herb) => {
    const id = `unlockSeed:${herb.key}Seed`;
    return {
      researchId: id,
      label: `${herb.label} Seed`,
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
  ...knownPotionCatalog.map((potion) => {
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
      label: `${herb.label} Seed`,
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
      baseSellPrice: Number((herbMarketBasePriceGoldByKey[herb.key] * NPC_MARKET_BUY_BPS) / 10_000n),
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
          ? Number((potion.basePriceGold * NPC_MARKET_BUY_BPS) / 10_000n)
          : Number((potionMarketBasePriceGoldByKey[potion.key] * NPC_MARKET_BUY_BPS) / 10_000n),
    })),
  };
}

const DEFAULT_GARDEN_CONFIG_JSON = toGameConfigJson({
  garden: {
    initialUnlockedTiles: 1,
    tileCostsGold: [0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800],
    tilesPerRow: 4,
    harvestSeconds: 10,
  },
});
const DEFAULT_SHOP_CONFIG_JSON = toGameConfigJson({
  shopShelf: {
    initialUnlockedSlots: 1,
    slotCostsGold: [0, 50, 150, 400, 1000],
    autoSellSeconds: 5,
  },
});
const DEFAULT_RESEARCH_CONFIG_JSON = toGameConfigJson({
  researchCostsGold: toNumberRecord(researchDefaultCostGoldById),
  researchCostsCrystal: researchDefaultCostCrystalById,
});
const DEFAULT_BREWING_CONFIG_JSON = toGameConfigJson({
  wastedBrewManaCost: 5,
  wastedBrewDurationMs: 4_000,
  bottlingDurationMs: 2_000,
  maxCauldronIngredients: 5,
  wastedPotionKey: 'wastedPotion',
});
const DEFAULT_ITEMS_CONFIG_JSON = toGameConfigJson(getDefaultItemsConfig());
const DEFAULT_POTION_RECIPES_CONFIG_JSON = toGameConfigJson({
  recipes: potionRecipeCatalog,
});

const gameConfigCatalog = [
  { configKey: 'tasks', configJson: DEFAULT_TASKS_CONFIG_JSON },
  { configKey: 'playerLevel', configJson: DEFAULT_PLAYER_LEVEL_CONFIG_JSON },
  { configKey: 'garden', configJson: DEFAULT_GARDEN_CONFIG_JSON },
  { configKey: 'shop', configJson: DEFAULT_SHOP_CONFIG_JSON },
  { configKey: 'research', configJson: DEFAULT_RESEARCH_CONFIG_JSON },
  { configKey: 'brewing', configJson: DEFAULT_BREWING_CONFIG_JSON },
  { configKey: 'items', configJson: DEFAULT_ITEMS_CONFIG_JSON },
  { configKey: 'potionRecipes', configJson: DEFAULT_POTION_RECIPES_CONFIG_JSON },
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
    },
  ),
  playerGameplaySave: table(
    {
      name: 'player_gameplay_save',
      public: true,
    },
    {
      identity: t.identity().primaryKey(),
      saveJson: t.string(),
      updatedAt: t.timestamp(),
    },
  ),
  leaderboard: table(
    {
      public: true,
      indexes: [{ accessor: 'byTotalIncome', algorithm: 'btree', columns: ['totalIncome'] }],
    },
    {
      identity: t.identity().primaryKey(),
      username: t.string(),
      totalIncome: t.u64(),
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
    },
  ),
  playerShopListing: table(
    {
      name: 'player_shop_listing',
      public: true,
      indexes: [
        { accessor: 'bySellerIdentity', algorithm: 'btree', columns: ['sellerIdentity'] },
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

type IdleWizardSchema = InferSchema<typeof spacetimedb>;
type IdleWizardReducerCtx = ReducerCtx<IdleWizardSchema>;

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
  return value.replace(
    /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
    '',
  );
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
  return PLAYER_THEMES.has(value) ? value : DEFAULT_PLAYER_THEME;
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

function normalizeFeedbackBody(body: string): string {
  return String(body ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim()
    .slice(0, MAX_FEEDBACK_BODY_LENGTH);
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

function getMaxPlayerShopPriceGold(item: (typeof npcMarketCatalog)[number]): bigint {
  return clampBigInt(
    ceilDiv(item.basePriceGold * PLAYER_SHOP_MAX_PRICE_MULTIPLIER_BPS, 10_000n),
    1n,
    MAX_PLAYER_SHOP_PRICE_GOLD,
  );
}

function validatePlayerShopPriceGold(
  priceGold: bigint | number,
  item: (typeof npcMarketCatalog)[number],
): bigint {
  const safePriceGold = toBigInt(priceGold);
  const maxPriceGold = getMaxPlayerShopPriceGold(item);

  if (safePriceGold < 1n || safePriceGold > maxPriceGold) {
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

function ceilDiv(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
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

function toBigInt(value: bigint | number): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  return BigInt(Math.max(0, Math.floor(Number(value) || 0)));
}

function normalizeNpcMarketBasePriceGold(
  value: bigint | number,
  fallback: bigint,
): bigint {
  const safeValue = toBigInt(value);

  if (safeValue < 1n || safeValue > NPC_MARKET_MAX_BASE_PRICE_GOLD) {
    return fallback;
  }

  return safeValue;
}

function validateNpcMarketBasePriceGold(basePriceGold: bigint | number): bigint {
  const safeBasePriceGold = toBigInt(basePriceGold);

  if (safeBasePriceGold < 1n || safeBasePriceGold > NPC_MARKET_MAX_BASE_PRICE_GOLD) {
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

function validateResearchCostGold(costGold: bigint | number): bigint {
  const safeCostGold = toBigInt(costGold);

  if (safeCostGold > MAX_RESEARCH_COST_GOLD) {
    throw new Error('Invalid research cost.');
  }

  return safeCostGold;
}

function normalizeGameConfigKey(configKey: string): string {
  return String(configKey ?? '')
    .trim()
    .slice(0, MAX_GAME_CONFIG_KEY_LENGTH);
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

  return value;
}

function validatePlayerGameplaySaveJson(saveJson: string): string {
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

  return value;
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

  if (configKey === 'items') {
    validateItemsGameConfig(value);
    return;
  }

  if (configKey === 'potionRecipes') {
    validatePotionRecipesGameConfig(value);
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
    const level = levelConfig as { level?: unknown; tasks?: unknown };

    if (level.level !== levelIndex + 1 || !Array.isArray(level.tasks)) {
      throw new Error('Invalid tasks config level.');
    }

    if (level.tasks.length !== MAX_GAME_CONFIG_TASKS_PER_LEVEL) {
      throw new Error('Invalid tasks config task count.');
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
  const crystal = config.crystal as Record<string, unknown> | null | undefined;

  if (
    config.crystal !== undefined &&
    config.crystal !== null &&
    (typeof config.crystal !== 'object' || Array.isArray(config.crystal))
  ) {
    throw new Error('Invalid player level crystal config.');
  }

  const nestedPerLevel =
    crystal
      ? crystal.perLevel ?? crystal.perLevelUp
      : undefined;
  const perLevel =
    nestedPerLevel ?? config.crystalPerLevel ?? config.crystalPerLevelUp;

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
  };

  validateCostRecord(config.researchCostsGold, MAX_RESEARCH_COST_GOLD);
  validateCostRecord(config.researchCostsCrystal, BigInt(MAX_GAME_CONFIG_RESOURCE_LIMIT));
}

function validateBrewingGameConfig(value: unknown) {
  const config = value as Record<string, unknown>;
  const wastedBrewManaCost = Number(config.wastedBrewManaCost);
  const wastedBrewDurationMs = Number(config.wastedBrewDurationMs);
  const bottlingDurationMs = Number(config.bottlingDurationMs);
  const maxCauldronIngredients = Number(config.maxCauldronIngredients);
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
    !npcMarketCatalogByItemKey.has(wastedPotionKey)
  ) {
    throw new Error('Invalid brewing config.');
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

function getNpcBuyPriceGold(marketPriceGold: bigint): bigint {
  return clampBigInt(
    (marketPriceGold * NPC_MARKET_BUY_BPS) / 10_000n,
    1n,
    marketPriceGold,
  );
}

function getNpcSellPriceGold(marketPriceGold: bigint): bigint {
  const buyPriceGold = getNpcBuyPriceGold(marketPriceGold);
  const spreadPriceGold = ceilDiv(marketPriceGold * NPC_MARKET_SELL_BPS, 10_000n);

  return spreadPriceGold > buyPriceGold ? spreadPriceGold : buyPriceGold + 1n;
}

function getNpcMarketFloorGold(basePriceGold: bigint): bigint {
  return basePriceGold > 4n ? basePriceGold / 4n : 1n;
}

function getNpcMarketCeilingGold(basePriceGold: bigint): bigint {
  return basePriceGold * 4n;
}

function clampNpcMarketPrice(basePriceGold: bigint, priceGold: bigint) {
  return clampBigInt(
    priceGold,
    getNpcMarketFloorGold(basePriceGold),
    getNpcMarketCeilingGold(basePriceGold),
  );
}

function getNpcMarketMaxNeed(targetNeed: bigint): bigint {
  return targetNeed * 2n > targetNeed ? targetNeed * 2n : targetNeed + 1n;
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
    npcNeed: clampBigInt(rawNeed, 0n, maxNeed),
    targetNeed: safeTargetNeed,
    maxNeed,
  };
}

function getNpcMarketPriceFromNeed(
  marketConfig: Pick<(typeof npcMarketCatalog)[number], 'basePriceGold'>,
  npcNeed: bigint,
  targetNeed: bigint,
  maxNeed: bigint,
): bigint {
  const basePriceGold = marketConfig.basePriceGold;
  const floorGold = getNpcMarketFloorGold(basePriceGold);
  const ceilingGold = getNpcMarketCeilingGold(basePriceGold);
  const safeTargetNeed = targetNeed > 0n ? targetNeed : 1n;
  const safeMaxNeed = maxNeed > safeTargetNeed ? maxNeed : safeTargetNeed + 1n;
  const safeNeed = clampBigInt(npcNeed, 0n, safeMaxNeed);

  if (safeNeed <= safeTargetNeed) {
    const lowerRange = basePriceGold - floorGold;
    return clampNpcMarketPrice(
      basePriceGold,
      floorGold + (lowerRange * safeNeed) / safeTargetNeed,
    );
  }

  const upperRange = ceilingGold - basePriceGold;
  const upperNeed = safeMaxNeed - safeTargetNeed;
  const extraNeed = safeNeed - safeTargetNeed;

  return clampNpcMarketPrice(
    basePriceGold,
    basePriceGold + (upperRange * extraNeed) / upperNeed,
  );
}

function getNpcMarketRowWithQuotes(row: any, marketPriceGold: bigint) {
  return {
    ...row,
    marketPriceGold,
    npcBuyPriceGold: getNpcBuyPriceGold(marketPriceGold),
    npcSellPriceGold: getNpcSellPriceGold(marketPriceGold),
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
    const basePriceGold = normalizeNpcMarketBasePriceGold(
      existingConfig.basePriceGold,
      catalogItem.basePriceGold,
    );
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
      existingConfig.defaultBasePriceGold === catalogItem.basePriceGold &&
      existingConfig.basePriceGold === basePriceGold &&
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
      defaultBasePriceGold: catalogItem.basePriceGold,
      basePriceGold,
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
    defaultBasePriceGold: catalogItem.basePriceGold,
    basePriceGold: catalogItem.basePriceGold,
    targetStock: catalogItem.targetStock,
    volatilityBps: catalogItem.volatilityBps,
    enabled: true,
    updatedAt: ctx.timestamp,
  });
}

function normalizeNpcMarketRuntimeConfig(row: any, catalogItem?: (typeof npcMarketCatalog)[number]) {
  const defaultBasePriceGold = normalizeNpcMarketBasePriceGold(
    row.defaultBasePriceGold,
    catalogItem?.basePriceGold ?? 1n,
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
    const needState = getNpcMarketNeedState(existingRow, marketConfig.targetStock);
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
      normalizedRow.basePriceGold === marketConfig.basePriceGold &&
      normalizedRow.marketPriceGold === toBigInt(existingRow.marketPriceGold) &&
      normalizedRow.targetStock === marketConfig.targetStock &&
      normalizedRow.npcStock === needState.npcNeed &&
      normalizedRow.npcNeed === needState.npcNeed &&
      normalizedRow.targetNeed === needState.targetNeed &&
      normalizedRow.maxNeed === needState.maxNeed
    ) {
      return normalizedRow;
    }

    return ctx.db.npcMarketPrice.itemKey.update({
      ...normalizedRow,
      itemLabel: marketConfig.itemLabel,
      itemKind: marketConfig.itemKind,
      basePriceGold: marketConfig.basePriceGold,
      targetStock: marketConfig.targetStock,
      npcStock: needState.npcNeed,
      npcNeed: needState.npcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      updatedAt: ctx.timestamp,
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
    basePriceGold: marketConfig.basePriceGold,
    marketPriceGold,
    npcBuyPriceGold: getNpcBuyPriceGold(marketPriceGold),
    npcSellPriceGold: getNpcSellPriceGold(marketPriceGold),
    npcStock: targetNeed,
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
    const costGold = normalizeResearchCostGold(
      existingConfig.costGold,
      catalogResearch.defaultCostGold,
    );
    const enabled = existingConfig.enabled !== false;

    if (
      existingConfig.label === label &&
      existingConfig.groupId === groupId &&
      existingConfig.defaultCostGold === catalogResearch.defaultCostGold &&
      existingConfig.costGold === costGold &&
      existingConfig.enabled === enabled
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

function isNpcMarketTickDue(row: any, timestamp = row.lastTickAt): boolean {
  const elapsedMicros =
    timestamp.microsSinceUnixEpoch - row.lastTickAt.microsSinceUnixEpoch;

  return elapsedMicros >= NPC_MARKET_TICK_MICROS;
}

function applyNpcMarketTick(ctx: IdleWizardReducerCtx, row: any) {
  if (!isNpcMarketTickDue(row, ctx.timestamp)) {
    return row;
  }

  const marketConfig = getNpcMarketRuntimeConfig(ctx, row.itemKey);
  const demandScore = toBigInt(row.demandScore);
  const supplyScore = toBigInt(row.supplyScore);
  const needState = getNpcMarketNeedState(row, marketConfig.targetStock);
  const needReplenishStep =
    needState.targetNeed / 20n > 1n ? needState.targetNeed / 20n : 1n;
  const nextNpcNeed = clampBigInt(
    needState.npcNeed + needReplenishStep,
    0n,
    needState.maxNeed,
  );
  const nextMarketPriceGold = getNpcMarketPriceFromNeed(
    marketConfig,
    nextNpcNeed,
    needState.targetNeed,
    needState.maxNeed,
  );
  const nextDemandScore =
    (demandScore * NPC_MARKET_DECAY_NUMERATOR) / NPC_MARKET_DECAY_DENOMINATOR;
  const nextSupplyScore =
    (supplyScore * NPC_MARKET_DECAY_NUMERATOR) / NPC_MARKET_DECAY_DENOMINATOR;

  return ctx.db.npcMarketPrice.itemKey.update({
    ...getNpcMarketRowWithQuotes(row, nextMarketPriceGold),
    itemLabel: marketConfig.itemLabel,
    itemKind: marketConfig.itemKind,
    basePriceGold: marketConfig.basePriceGold,
    targetStock: marketConfig.targetStock,
    npcStock: nextNpcNeed,
    npcNeed: nextNpcNeed,
    targetNeed: needState.targetNeed,
    maxNeed: needState.maxNeed,
    demandScore: nextDemandScore,
    supplyScore: nextSupplyScore,
    updatedAt: ctx.timestamp,
    lastTickAt: ctx.timestamp,
  });
}

function applyDueNpcMarketTicks(ctx: IdleWizardReducerCtx) {
  ensureNpcMarketCatalog(ctx);

  if (!ENABLE_NPC_MARKET_PRESSURE) {
    resetNpcMarketRows(ctx);
    return;
  }

  for (const row of ctx.db.npcMarketPrice.iter()) {
    applyNpcMarketTick(ctx, row);
  }
}

function resetNpcMarketRows(ctx: IdleWizardReducerCtx) {
  for (const row of ctx.db.npcMarketPrice.iter()) {
    const targetStock = toBigInt(row.targetStock);
    const needState = getNpcMarketNeedState(row, targetStock);
    const basePriceGold = toBigInt(row.basePriceGold);
    const resetRow = getNpcMarketRowWithQuotes(row, basePriceGold);

    if (
      row.marketPriceGold === resetRow.marketPriceGold &&
      row.npcBuyPriceGold === resetRow.npcBuyPriceGold &&
      row.npcSellPriceGold === resetRow.npcSellPriceGold &&
      row.npcStock === needState.targetNeed &&
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
      npcStock: needState.targetNeed,
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
    const colorMode = normalizePlayerColorMode(player.colorMode);
    const usernamePromptSeen = Boolean(player.usernamePromptSeen);

    if (
      player.username === username &&
      player.playerLevel === playerLevel &&
      player.theme === theme &&
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
      colorMode,
      usernamePromptSeen,
      lastSeenAt: ctx.timestamp,
    });
  }
}

function sanitizeLeaderboardRows(ctx: IdleWizardReducerCtx) {
  for (const entry of ctx.db.leaderboard.iter()) {
    const username = normalizeUsername(entry.username);
    const playerLevel = normalizePlayerLevel(entry.playerLevel);
    const totalIncome = clampLeaderboardTotalIncome(entry.totalIncome, playerLevel);

    if (
      entry.username === username &&
      entry.playerLevel === playerLevel &&
      entry.totalIncome === totalIncome
    ) {
      continue;
    }

    ctx.db.leaderboard.identity.update({
      ...entry,
      username,
      playerLevel,
      totalIncome,
      updatedAt: ctx.timestamp,
    });
  }
}

function deleteAllPotionDiscoveries(ctx: IdleWizardReducerCtx) {
  for (const discovery of Array.from(ctx.db.potionRecipeDiscovery.iter())) {
    ctx.db.potionRecipeDiscovery.delete(discovery);
  }
}

function ensurePlayer(ctx: IdleWizardReducerCtx) {
  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  const username = normalizeUsername(existingPlayer?.username ?? DEFAULT_USERNAME);
  const theme = normalizePlayerTheme(existingPlayer?.theme ?? DEFAULT_PLAYER_THEME);
  const colorMode = normalizePlayerColorMode(
    existingPlayer?.colorMode ?? DEFAULT_PLAYER_COLOR_MODE,
  );
  const usernamePromptSeen = Boolean(existingPlayer?.usernamePromptSeen);

  if (existingPlayer) {
    return ctx.db.player.identity.update({
      ...existingPlayer,
      username,
      playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
      theme,
      colorMode,
      usernamePromptSeen,
      connected: true,
      lastSeenAt: ctx.timestamp,
    });
  }

  return ctx.db.player.insert({
    identity: ctx.sender,
    username,
    playerLevel: DEFAULT_PLAYER_LEVEL,
    theme: DEFAULT_PLAYER_THEME,
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
  const existingEntry = ctx.db.leaderboard.identity.find(ctx.sender);
  const safePlayerLevel = normalizePlayerLevel(playerLevel);
  const safeTotalIncome = existingEntry
    ? clampLeaderboardTotalIncome(existingEntry.totalIncome, safePlayerLevel)
    : 0n;

  if (existingEntry) {
    return ctx.db.leaderboard.identity.update({
      ...existingEntry,
      username,
      playerLevel: safePlayerLevel,
      totalIncome: safeTotalIncome,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.leaderboard.insert({
    identity: ctx.sender,
    username,
    playerLevel: safePlayerLevel,
    totalIncome: 0n,
    updatedAt: ctx.timestamp,
  });
}

function assertWorldChatRateLimit(ctx: IdleWizardReducerCtx) {
  const windowStartMicros =
    ctx.timestamp.microsSinceUnixEpoch - WORLD_CHAT_RATE_LIMIT_WINDOW_MICROS;
  let sentInWindow = 0;
  let globalSentInWindow = 0;

  for (const row of ctx.db.worldChat.iter()) {
    if (row.sentAt.microsSinceUnixEpoch < windowStartMicros) {
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

  for (const proceeds of Array.from(ctx.db.playerShopProceeds.iter())) {
    ctx.db.playerShopProceeds.delete(proceeds);
  }

  for (const trade of Array.from(ctx.db.playerShopTrade.iter())) {
    ctx.db.playerShopTrade.delete(trade);
  }
}

function pruneWorldChat(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.worldChat.iter()).sort((left, right) => {
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

  while (rows.length > WORLD_CHAT_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.worldChat.delete(row);
    }
  }
}

function hasWorldChatBodyForSender(ctx: IdleWizardReducerCtx, body: string): boolean {
  for (const row of ctx.db.worldChat.iter()) {
    if (row.username === 'system' && row.senderIdentity.isEqual(ctx.sender) && row.body === body) {
      return true;
    }
  }

  return false;
}

function prunePlayerShopTradeHistory(ctx: IdleWizardReducerCtx) {
  const rows = Array.from(ctx.db.playerShopTrade.iter()).sort((left, right) => {
    const leftTradedAt = left.tradedAt.microsSinceUnixEpoch;
    const rightTradedAt = right.tradedAt.microsSinceUnixEpoch;

    if (leftTradedAt < rightTradedAt) {
      return -1;
    }

    if (leftTradedAt > rightTradedAt) {
      return 1;
    }

    return left.tradeId.compareTo(right.tradeId);
  });

  while (rows.length > PLAYER_SHOP_TRADE_HISTORY_LIMIT) {
    const row = rows.shift();

    if (row) {
      ctx.db.playerShopTrade.delete(row);
    }
  }
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

export const onConnect = spacetimedb.clientConnected((ctx) => {
  sanitizeSharedPlayerRows(ctx);
  sanitizeLeaderboardRows(ctx);
  if (!ENABLE_CLIENT_POTION_DISCOVERY) {
    deleteAllPotionDiscoveries(ctx);
  }
  const player = ensurePlayer(ctx);
  ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
  ensureResearchConfigCatalog(ctx);
  ensureGameConfigCatalog(ctx);
  if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
    deleteAllPlayerShopState(ctx);
  }
  applyDueNpcMarketTicks(ctx);
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
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
      colorMode: DEFAULT_PLAYER_COLOR_MODE,
      usernamePromptSeen: normalizedUsername !== DEFAULT_USERNAME,
      connected: true,
      createdAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
    });
  }

  ensureLeaderboardEntry(ctx, normalizedUsername, player.playerLevel);
});

export const set_player_profile = spacetimedb.reducer(
  {
    username: t.string(),
    theme: t.string(),
    colorMode: t.string(),
    usernamePromptSeen: t.bool(),
  },
  (ctx, { username, theme, colorMode, usernamePromptSeen }) => {
    const normalizedUsername = normalizeUsername(username);
    assertUsernameAvailable(ctx, normalizedUsername);

    const safeTheme = normalizePlayerTheme(theme);
    const safeColorMode = normalizePlayerColorMode(colorMode);
    const safeUsernamePromptSeen =
      Boolean(usernamePromptSeen) || normalizedUsername !== DEFAULT_USERNAME;
    const existingPlayer = ctx.db.player.identity.find(ctx.sender);
    let player;

    if (existingPlayer) {
      player = ctx.db.player.identity.update({
        ...existingPlayer,
        username: normalizedUsername,
        playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
        theme: safeTheme,
        colorMode: safeColorMode,
        usernamePromptSeen: safeUsernamePromptSeen,
        lastSeenAt: ctx.timestamp,
      });
    } else {
      player = ctx.db.player.insert({
        identity: ctx.sender,
        username: normalizedUsername,
        playerLevel: DEFAULT_PLAYER_LEVEL,
        theme: safeTheme,
        colorMode: safeColorMode,
        usernamePromptSeen: safeUsernamePromptSeen,
        connected: true,
        createdAt: ctx.timestamp,
        lastSeenAt: ctx.timestamp,
      });
    }

    ensureLeaderboardEntry(ctx, normalizedUsername, player.playerLevel);
  },
);

export const set_admin_player_data = spacetimedb.reducer(
  {
    identityHex: t.string(),
    username: t.string(),
    playerLevel: t.u32(),
    totalIncome: t.u64(),
    theme: t.string(),
    colorMode: t.string(),
    usernamePromptSeen: t.bool(),
  },
  (
    ctx,
    {
      identityHex,
      username,
      playerLevel,
      totalIncome,
      theme,
      colorMode,
      usernamePromptSeen,
    },
  ) => {
    assertGameConfigAdmin(ctx);

    const player = findPlayerByIdentityHex(ctx, identityHex);
    const normalizedUsername = normalizeUsername(username);
    const safePlayerLevel = validateAdminPlayerLevel(playerLevel);
    const safeTotalIncome = toBigInt(totalIncome);
    const safeTheme = normalizePlayerTheme(theme);
    const safeColorMode = normalizePlayerColorMode(colorMode);
    const safeUsernamePromptSeen =
      Boolean(usernamePromptSeen) || normalizedUsername !== DEFAULT_USERNAME;

    assertUsernameAvailableForIdentity(ctx, normalizedUsername, player.identity);

    const nextPlayer = ctx.db.player.identity.update({
      ...player,
      username: normalizedUsername,
      playerLevel: safePlayerLevel,
      theme: safeTheme,
      colorMode: safeColorMode,
      usernamePromptSeen: safeUsernamePromptSeen,
      lastSeenAt: ctx.timestamp,
    });

    const existingEntry = ctx.db.leaderboard.identity.find(player.identity);

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
      updatedAt: ctx.timestamp,
    });
  },
);

export const set_player_gameplay_save = spacetimedb.reducer(
  { saveJson: t.string() },
  (ctx, { saveJson }) => {
    const safeSaveJson = validatePlayerGameplaySaveJson(saveJson);
    ensurePlayer(ctx);

    const existingSave = ctx.db.playerGameplaySave.identity.find(ctx.sender);
    const nextSave = {
      identity: ctx.sender,
      saveJson: safeSaveJson,
      updatedAt: ctx.timestamp,
    };

    if (existingSave) {
      ctx.db.playerGameplaySave.identity.update(nextSave);
      return;
    }

    ctx.db.playerGameplaySave.insert(nextSave);
  },
);

export const set_player_level = spacetimedb.reducer(
  { playerLevel: t.u32() },
  (ctx, { playerLevel }) => {
    const player = ensurePlayer(ctx);
    const safePlayerLevel = normalizePlayerLevel(playerLevel);
    const nextPlayer =
      safePlayerLevel === player.playerLevel
        ? player
        : ctx.db.player.identity.update({
            ...player,
            playerLevel: safePlayerLevel,
            lastSeenAt: ctx.timestamp,
          });

    ensureLeaderboardEntry(ctx, nextPlayer.username, nextPlayer.playerLevel);
  },
);

export const announce_level_up = spacetimedb.reducer(
  { playerLevel: t.u32() },
  (ctx, { playerLevel }) => {
    const safePlayerLevel = normalizePlayerLevel(playerLevel);

    if (safePlayerLevel <= DEFAULT_PLAYER_LEVEL) {
      return;
    }

    const player = ensurePlayer(ctx);
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

    const body = `${nextPlayer.username} reached level ${safePlayerLevel}`;
    if (alreadyAtLevel && hasWorldChatBodyForSender(ctx, body)) {
      return;
    }

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body,
      sentAt: ctx.timestamp,
    });
    pruneWorldChat(ctx);
  },
);

export const set_total_generated_gold = spacetimedb.reducer(
  { totalGeneratedGold: t.u64() },
  (ctx, { totalGeneratedGold }) => {
    const player = ensurePlayer(ctx);
    const entry = ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
    const currentTotalIncome = clampLeaderboardTotalIncome(
      entry.totalIncome,
      player.playerLevel,
    );
    const reportedTotalIncome = normalizeReportedLeaderboardTotalIncome(
      totalGeneratedGold,
      player.playerLevel,
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

    ctx.db.leaderboard.identity.update({
      ...entry,
      totalIncome: nextTotalIncome,
      updatedAt: ctx.timestamp,
    });
  },
);

export const send_world_chat_message = spacetimedb.reducer(
  { body: t.string() },
  (ctx, { body }) => {
    const message = normalizeWorldChatMessage(body);

    if (!message) {
      return;
    }

    assertWorldChatRateLimit(ctx);

    const player = ensurePlayer(ctx);
    ensureLeaderboardEntry(ctx, player.username, player.playerLevel);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: player.username,
      playerLevel: player.playerLevel,
      body: message,
      sentAt: ctx.timestamp,
    });
    pruneWorldChat(ctx);
  },
);

export const submit_feedback = spacetimedb.reducer({ body: t.string() }, (ctx, { body }) => {
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
    });
    pruneWorldChat(ctx);
  },
);

export const discover_potion_recipe = spacetimedb.reducer(
  { potionKey: t.string() },
  (ctx, { potionKey }) => {
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
    assertWorldChatRateLimit(ctx);

    ctx.db.potionRecipeDiscovery.insert({
      potionKey: catalogItem.key,
      potionLabel: catalogItem.label,
      discoveredByIdentity: ctx.sender,
      username: player.username,
      discoveredAt: ctx.timestamp,
    });

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: 'system',
      playerLevel: 0,
      body: `${player.username} discovered a new potion recipe!`,
      sentAt: ctx.timestamp,
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
    priceGold: t.u64(),
  },
  (ctx, { slotNumber, itemKey, itemLabel, itemKind, quantity, priceGold }) => {
    if (!ENABLE_PLAYER_SHOP_EXCHANGE) {
      throw new Error('Player shop exchange requires server inventory.');
    }

    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const catalogItem = getPlayerShopCatalogItem(itemKey);
    const safeItemKey = catalogItem.itemKey;
    const safeItemLabel = catalogItem.itemLabel;
    const safeItemKind = catalogItem.itemKind;
    const safeQuantity = validatePlayerShopQuantity(quantity);
    const safePriceGold = validatePlayerShopPriceGold(priceGold, catalogItem);

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
      priceGold: safePriceGold,
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
    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const listingKey = getPlayerShopListingKey(ctx, safeSlotNumber);
    const existingListing = ctx.db.playerShopListing.listingKey.find(listingKey);

    if (!existingListing || !existingListing.sellerIdentity.isEqual(ctx.sender)) {
      return;
    }

    ctx.db.playerShopListing.delete(existingListing);
  },
);

export const buy_player_shop_listing = spacetimedb.reducer(
  { listingKey: t.string(), quantity: t.u32() },
  (ctx, { listingKey, quantity }) => {
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
    const proceedsGold = listing.priceGold * BigInt(quantity);

    if (proceedsGold > MAX_PLAYER_SHOP_TRADE_TOTAL_GOLD) {
      throw new Error('Player shop trade total is too high.');
    }

    ctx.db.playerShopListing.listingKey.update({
      ...listing,
      quantity: remainingQuantity,
      updatedAt: ctx.timestamp,
    });

    const existingProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(
      listing.sellerIdentity,
    );

    if (existingProceeds) {
      const nextProceedsGold = existingProceeds.gold + proceedsGold;

      if (nextProceedsGold > MAX_PLAYER_SHOP_PROCEEDS_GOLD) {
        throw new Error('Player shop proceeds are too high.');
      }

      ctx.db.playerShopProceeds.sellerIdentity.update({
        ...existingProceeds,
        gold: nextProceedsGold,
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.playerShopProceeds.insert({
        sellerIdentity: listing.sellerIdentity,
        gold: proceedsGold,
        updatedAt: ctx.timestamp,
      });
    }

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
      priceGold: listing.priceGold,
      totalPriceGold: proceedsGold,
      tradedAt: ctx.timestamp,
    });
    prunePlayerShopTradeHistory(ctx);
  },
);

export const claim_player_shop_proceeds = spacetimedb.reducer({}, (ctx) => {
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
    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    const safeQuantity = validateNpcMarketQuantity(quantity);
    let row = ensureNpcMarketItem(ctx, itemKey);
    row = applyNpcMarketTick(ctx, row);

    const tradeQuantity = BigInt(safeQuantity);
    const marketConfig = getNpcMarketRuntimeConfig(ctx, itemKey);
    const needState = getNpcMarketNeedState(row, marketConfig.targetStock);
    const supplyScore = toBigInt(row.supplyScore);
    const fulfilledQuantity = clampBigInt(tradeQuantity, 0n, needState.npcNeed);

    if (fulfilledQuantity < 1n) {
      throw new Error('NPC market item has no demand.');
    }

    const nextNpcNeed = needState.npcNeed - fulfilledQuantity;
    const nextMarketPriceGold = getNpcMarketPriceFromNeed(
      marketConfig,
      nextNpcNeed,
      needState.targetNeed,
      needState.maxNeed,
    );

    ctx.db.npcMarketPrice.itemKey.update({
      ...getNpcMarketRowWithQuotes(row, nextMarketPriceGold),
      npcStock: nextNpcNeed,
      npcNeed: nextNpcNeed,
      targetNeed: needState.targetNeed,
      maxNeed: needState.maxNeed,
      supplyScore: supplyScore + fulfilledQuantity,
      updatedAt: ctx.timestamp,
    });
  },
);

export const buy_from_npc = spacetimedb.reducer(
  { itemKey: t.string(), quantity: t.u32() },
  (ctx, { itemKey, quantity }) => {
    if (!ENABLE_NPC_MARKET_PRESSURE) {
      return;
    }

    validateNpcMarketQuantity(quantity);
    getNpcMarketRuntimeConfig(ctx, itemKey);
    throw new Error('NPC market does not sell items.');
  },
);

export const tick_npc_market = spacetimedb.reducer({}, (ctx) => {
  applyDueNpcMarketTicks(ctx);
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
    basePriceGold: t.u64(),
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
    const nextConfig = {
      itemKey: safeItemKey,
      itemLabel: safeItemLabel,
      itemKind: safeItemKind,
      defaultBasePriceGold:
        existingConfig?.defaultBasePriceGold ??
        catalogItem?.basePriceGold ??
        safeBasePriceGold,
      basePriceGold: safeBasePriceGold,
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
        basePriceGold: safeBasePriceGold,
        targetStock: safeTargetStock,
        npcStock: needState.npcNeed,
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
  { itemKey: t.string(), basePriceGold: t.u64() },
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
      basePriceGold: safeBasePriceGold,
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
      basePriceGold: safeBasePriceGold,
      targetStock: marketConfig.targetStock,
      npcStock: needState.npcNeed,
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
    enabled: t.bool(),
  },
  (ctx, { researchId, label, groupId, costGold, enabled }) => {
    assertGameConfigAdmin(ctx);

    const safeResearchId = normalizeResearchId(researchId);
    const safeLabel = normalizeResearchLabel(label);
    const safeGroupId = normalizeResearchGroupId(groupId);

    if (!safeResearchId || !safeLabel || !safeGroupId) {
      throw new Error('Research config requires id, label, and group.');
    }

    const safeCostGold = validateResearchCostGold(costGold);
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

export default spacetimedb;
