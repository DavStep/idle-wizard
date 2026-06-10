import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const DEFAULT_PLAYER_LEVEL = 1;
const MAX_PLAYER_LEVEL = 100_000;
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
const MAX_RESEARCH_NAME_LENGTH = 80;
const MAX_RESEARCH_ID_LENGTH = 96;
const MAX_RESEARCH_LABEL_LENGTH = 80;
const MAX_RESEARCH_GROUP_ID_LENGTH = 32;
const WORLD_CHAT_HISTORY_LIMIT = 40;
const PLAYER_SHOP_TRADE_HISTORY_LIMIT = 80;
const MAX_PLAYER_SHOP_SLOTS = 5;
const MAX_ITEM_KEY_LENGTH = 64;
const MAX_ITEM_LABEL_LENGTH = 80;
const MAX_ITEM_KIND_LENGTH = 24;
const NPC_MARKET_TICK_MICROS = 5n * 60n * 1_000_000n;
const NPC_MARKET_DECAY_NUMERATOR = 85n;
const NPC_MARKET_DECAY_DENOMINATOR = 100n;
const NPC_MARKET_PRICE_MOVE_LIMIT_BPS = 300n;
const NPC_MARKET_PRESSURE_LIMIT_BPS = 10_000n;
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

const DEFAULT_TASKS_CONFIG_JSON = "{\"levels\":[{\"level\":1,\"tasks\":[{\"id\":\"level1-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":20},{\"id\":\"level1-sage-herb\",\"itemKey\":\"sageHerb\",\"quantity\":10},{\"id\":\"level1-mana-tonic\",\"itemKey\":\"manaTonic\",\"quantity\":2},{\"id\":\"level1-mint-seeds\",\"itemKey\":\"mintSeed\",\"quantity\":15},{\"id\":\"level1-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":8}]},{\"level\":2,\"tasks\":[{\"id\":\"level2-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":35},{\"id\":\"level2-nettle-herb\",\"itemKey\":\"nettleHerb\",\"quantity\":18},{\"id\":\"level2-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":4},{\"id\":\"level2-lavender-seeds\",\"itemKey\":\"lavenderSeed\",\"quantity\":30},{\"id\":\"level2-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":3}]},{\"level\":3,\"tasks\":[{\"id\":\"level3-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":60},{\"id\":\"level3-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":30},{\"id\":\"level3-minor-healing-potion\",\"itemKey\":\"minorHealingPotion\",\"quantity\":6},{\"id\":\"level3-briar-seeds\",\"itemKey\":\"briarSeed\",\"quantity\":45},{\"id\":\"level3-simple-antidote\",\"itemKey\":\"simpleAntidote\",\"quantity\":5}]},{\"level\":4,\"tasks\":[{\"id\":\"level4-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":42},{\"id\":\"level4-briar-herb\",\"itemKey\":\"briarHerb\",\"quantity\":38},{\"id\":\"level4-venom-draught\",\"itemKey\":\"venomDraught\",\"quantity\":7},{\"id\":\"level4-glowcap-seeds\",\"itemKey\":\"glowcapSeed\",\"quantity\":65},{\"id\":\"level4-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":6}]},{\"level\":5,\"tasks\":[{\"id\":\"level5-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":100},{\"id\":\"level5-glowcap-herb\",\"itemKey\":\"glowcapHerb\",\"quantity\":55},{\"id\":\"level5-lantern-tonic\",\"itemKey\":\"lanternTonic\",\"quantity\":9},{\"id\":\"level5-mandrake-seeds\",\"itemKey\":\"mandrakeSeed\",\"quantity\":80},{\"id\":\"level5-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":8}]},{\"level\":6,\"tasks\":[{\"id\":\"level6-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":110},{\"id\":\"level6-mandrake-herb\",\"itemKey\":\"mandrakeHerb\",\"quantity\":65},{\"id\":\"level6-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":12},{\"id\":\"level6-sunroot-seeds\",\"itemKey\":\"sunrootSeed\",\"quantity\":90},{\"id\":\"level6-sunroot-stamina\",\"itemKey\":\"sunrootStamina\",\"quantity\":10}]},{\"level\":7,\"tasks\":[{\"id\":\"level7-moonflower-seeds\",\"itemKey\":\"moonflowerSeed\",\"quantity\":105},{\"id\":\"level7-moonflower-herb\",\"itemKey\":\"moonflowerHerb\",\"quantity\":75},{\"id\":\"level7-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":12},{\"id\":\"level7-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":80},{\"id\":\"level7-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":14}]},{\"level\":8,\"tasks\":[{\"id\":\"level8-frostmoss-seeds\",\"itemKey\":\"frostmossSeed\",\"quantity\":125},{\"id\":\"level8-frostmoss-herb\",\"itemKey\":\"frostmossHerb\",\"quantity\":90},{\"id\":\"level8-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":16},{\"id\":\"level8-briar-herb\",\"itemKey\":\"briarHerb\",\"quantity\":95},{\"id\":\"level8-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":15}]},{\"level\":9,\"tasks\":[{\"id\":\"level9-dreambell-seeds\",\"itemKey\":\"dreambellSeed\",\"quantity\":145},{\"id\":\"level9-dreambell-herb\",\"itemKey\":\"dreambellHerb\",\"quantity\":105},{\"id\":\"level9-sleep-draught\",\"itemKey\":\"sleepDraught\",\"quantity\":18},{\"id\":\"level9-mana-tonic\",\"itemKey\":\"manaTonic\",\"quantity\":25},{\"id\":\"level9-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":18}]},{\"level\":10,\"tasks\":[{\"id\":\"level10-star-anise-seeds\",\"itemKey\":\"starAniseSeed\",\"quantity\":165},{\"id\":\"level10-star-anise-herb\",\"itemKey\":\"starAniseHerb\",\"quantity\":120},{\"id\":\"level10-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":20},{\"id\":\"level10-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":200},{\"id\":\"level10-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":24}]},{\"level\":11,\"tasks\":[{\"id\":\"level11-bloodrose-seeds\",\"itemKey\":\"bloodroseSeed\",\"quantity\":185},{\"id\":\"level11-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":135},{\"id\":\"level11-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":22},{\"id\":\"level11-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":25},{\"id\":\"level11-simple-antidote\",\"itemKey\":\"simpleAntidote\",\"quantity\":28}]},{\"level\":12,\"tasks\":[{\"id\":\"level12-dragonpepper-seeds\",\"itemKey\":\"dragonpepperSeed\",\"quantity\":205},{\"id\":\"level12-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":150},{\"id\":\"level12-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":24},{\"id\":\"level12-sunroot-stamina\",\"itemKey\":\"sunrootStamina\",\"quantity\":28},{\"id\":\"level12-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":26}]},{\"level\":13,\"tasks\":[{\"id\":\"level13-glowcap-seeds\",\"itemKey\":\"glowcapSeed\",\"quantity\":230},{\"id\":\"level13-mandrake-herb\",\"itemKey\":\"mandrakeHerb\",\"quantity\":165},{\"id\":\"level13-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":26},{\"id\":\"level13-star-anise-herb\",\"itemKey\":\"starAniseHerb\",\"quantity\":160},{\"id\":\"level13-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":30}]},{\"level\":14,\"tasks\":[{\"id\":\"level14-briar-seeds\",\"itemKey\":\"briarSeed\",\"quantity\":250},{\"id\":\"level14-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":180},{\"id\":\"level14-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":28},{\"id\":\"level14-venom-draught\",\"itemKey\":\"venomDraught\",\"quantity\":34},{\"id\":\"level14-briar-ward\",\"itemKey\":\"briarWard\",\"quantity\":32}]},{\"level\":15,\"tasks\":[{\"id\":\"level15-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":300},{\"id\":\"level15-mint-herb\",\"itemKey\":\"mintHerb\",\"quantity\":220},{\"id\":\"level15-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":40},{\"id\":\"level15-healing-potion\",\"itemKey\":\"healingPotion\",\"quantity\":38},{\"id\":\"level15-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":34}]},{\"level\":16,\"tasks\":[{\"id\":\"level16-nettle-seeds\",\"itemKey\":\"nettleSeed\",\"quantity\":330},{\"id\":\"level16-lavender-herb\",\"itemKey\":\"lavenderHerb\",\"quantity\":240},{\"id\":\"level16-calming-draught\",\"itemKey\":\"calmingDraught\",\"quantity\":44},{\"id\":\"level16-sleep-draught\",\"itemKey\":\"sleepDraught\",\"quantity\":38},{\"id\":\"level16-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":36}]},{\"level\":17,\"tasks\":[{\"id\":\"level17-moonflower-seeds\",\"itemKey\":\"moonflowerSeed\",\"quantity\":360},{\"id\":\"level17-frostmoss-herb\",\"itemKey\":\"frostmossHerb\",\"quantity\":260},{\"id\":\"level17-moonlit-focus\",\"itemKey\":\"moonlitFocus\",\"quantity\":46},{\"id\":\"level17-frostmoss-cleanse\",\"itemKey\":\"frostmossCleanse\",\"quantity\":42},{\"id\":\"level17-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":38}]},{\"level\":18,\"tasks\":[{\"id\":\"level18-star-anise-seeds\",\"itemKey\":\"starAniseSeed\",\"quantity\":390},{\"id\":\"level18-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":280},{\"id\":\"level18-star-luck-philtre\",\"itemKey\":\"starLuckPhiltre\",\"quantity\":48},{\"id\":\"level18-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":44},{\"id\":\"level18-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":40}]},{\"level\":19,\"tasks\":[{\"id\":\"level19-bloodrose-seeds\",\"itemKey\":\"bloodroseSeed\",\"quantity\":430},{\"id\":\"level19-bloodrose-herb\",\"itemKey\":\"bloodroseHerb\",\"quantity\":310},{\"id\":\"level19-elixir-of-life\",\"itemKey\":\"elixirOfLife\",\"quantity\":52},{\"id\":\"level19-deep-dream-vision\",\"itemKey\":\"deepDreamVision\",\"quantity\":46},{\"id\":\"level19-pact-ward\",\"itemKey\":\"pactWard\",\"quantity\":44}]},{\"level\":20,\"tasks\":[{\"id\":\"level20-sage-seeds\",\"itemKey\":\"sageSeed\",\"quantity\":500},{\"id\":\"level20-nettle-vigor\",\"itemKey\":\"nettleVigor\",\"quantity\":140},{\"id\":\"level20-dragonpepper-seeds\",\"itemKey\":\"dragonpepperSeed\",\"quantity\":460},{\"id\":\"level20-dragonpepper-herb\",\"itemKey\":\"dragonpepperHerb\",\"quantity\":340},{\"id\":\"level20-dragon-courage\",\"itemKey\":\"dragonCourage\",\"quantity\":60}]}]}";
const DEFAULT_PLAYER_LEVEL_CONFIG_JSON = "{\"maxLevel\":20,\"mana\":{\"baseMaxManaCap\":50,\"maxManaCapPerLevel\":50,\"baseManaPerSecond\":1,\"manaPerSecondPerLevel\":1},\"milestones\":[{\"level\":1,\"maxGardenTiles\":2,\"maxCauldrons\":1,\"maxNpcMarketStands\":1,\"maxPlayerMarketStands\":1},{\"level\":2,\"maxGardenTiles\":3,\"maxCauldrons\":1,\"maxNpcMarketStands\":1,\"maxPlayerMarketStands\":1},{\"level\":3,\"maxGardenTiles\":3,\"maxCauldrons\":1,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":5,\"maxGardenTiles\":5,\"maxCauldrons\":3,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":8,\"maxGardenTiles\":7,\"maxCauldrons\":3,\"maxNpcMarketStands\":2,\"maxPlayerMarketStands\":2},{\"level\":10,\"maxGardenTiles\":8,\"maxCauldrons\":4,\"maxNpcMarketStands\":3,\"maxPlayerMarketStands\":3},{\"level\":13,\"maxGardenTiles\":9,\"maxCauldrons\":4,\"maxNpcMarketStands\":4,\"maxPlayerMarketStands\":4},{\"level\":17,\"maxGardenTiles\":10,\"maxCauldrons\":5,\"maxNpcMarketStands\":5,\"maxPlayerMarketStands\":5}]}";

const herbCatalog = [
  { key: 'sage', label: 'Sage' },
  { key: 'mint', label: 'Mint' },
  { key: 'nettle', label: 'Nettle' },
  { key: 'lavender', label: 'Lavender' },
  { key: 'briar', label: 'Briar' },
  { key: 'glowcap', label: 'Glowcap' },
  { key: 'mandrake', label: 'Mandrake' },
  { key: 'sunroot', label: 'Sunroot' },
  { key: 'moonflower', label: 'Moonflower' },
  { key: 'frostmoss', label: 'Frostmoss' },
  { key: 'dreambell', label: 'Dreambell' },
  { key: 'starAnise', label: 'Star Anise' },
  { key: 'bloodrose', label: 'Bloodrose' },
  { key: 'dragonpepper', label: 'Dragonpepper' },
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
  'automation:autoPlantTile:1': 50_000n,
  'automation:autoPlantTile:2': 75_000n,
  'automation:autoPlantTile:3': 100_000n,
  'automation:autoPlantTile:4': 125_000n,
  'automation:autoPlantTile:5': 150_000n,
  'automation:autoPlantTile:6': 175_000n,
  'automation:autoPlantTile:7': 200_000n,
  'automation:autoPlantTile:8': 225_000n,
  'automation:autoPlantTile:9': 250_000n,
  'automation:autoPlantTile:10': 275_000n,
  'automation:autoHarvestPlant:1': 75_000n,
  'automation:autoHarvestPlant:2': 100_000n,
  'automation:autoHarvestPlant:3': 125_000n,
  'automation:autoHarvestPlant:4': 150_000n,
  'automation:autoHarvestPlant:5': 175_000n,
  'automation:autoHarvestPlant:6': 200_000n,
  'automation:autoHarvestPlant:7': 225_000n,
  'automation:autoHarvestPlant:8': 250_000n,
  'automation:autoHarvestPlant:9': 275_000n,
  'automation:autoHarvestPlant:10': 300_000n,
  'automation:autoBrewCauldron:1': 100_000n,
  'automation:autoBrewCauldron:2': 150_000n,
  'automation:autoBrewCauldron:3': 200_000n,
  'automation:autoBrewCauldron:4': 250_000n,
  'automation:autoBrewCauldron:5': 300_000n,
  'automation:autoBottleCauldron:1': 125_000n,
  'automation:autoBottleCauldron:2': 175_000n,
  'automation:autoBottleCauldron:3': 225_000n,
  'automation:autoBottleCauldron:4': 275_000n,
  'automation:autoBottleCauldron:5': 325_000n,
  'automation:autoCollectCauldron:1': 150_000n,
  'automation:autoCollectCauldron:2': 200_000n,
  'automation:autoCollectCauldron:3': 250_000n,
  'automation:autoCollectCauldron:4': 300_000n,
  'automation:autoCollectCauldron:5': 350_000n,
};

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'Wasted Potion', basePriceGold: 1n },
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

const gameConfigCatalog = [
  { configKey: 'tasks', configJson: DEFAULT_TASKS_CONFIG_JSON },
  { configKey: 'playerLevel', configJson: DEFAULT_PLAYER_LEVEL_CONFIG_JSON },
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

function normalizeUsername(username: string): string {
  const value = String(username ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  return (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);
}

function normalizePlayerLevel(playerLevel: unknown): number {
  const value = Math.floor(Number(playerLevel));

  if (!Number.isFinite(value) || value < DEFAULT_PLAYER_LEVEL) {
    return DEFAULT_PLAYER_LEVEL;
  }

  return Math.min(value, MAX_PLAYER_LEVEL);
}

function normalizeWorldChatMessage(body: string): string {
  return String(body ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_WORLD_CHAT_MESSAGE_LENGTH);
}

function normalizeResearchName(researchName: string): string {
  return String(researchName ?? '')
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
  return String(label ?? '')
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
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
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

function validateGameConfigJson(configJson: string): string {
  const value = String(configJson ?? '').trim();

  if (!value || value.length > MAX_GAME_CONFIG_JSON_LENGTH) {
    throw new Error('Invalid game config JSON length.');
  }

  try {
    JSON.parse(value);
  } catch {
    throw new Error('Invalid game config JSON.');
  }

  return value;
}

function normalizeGameConfigJsonOrDefault(configJson: string, fallbackJson: string): string {
  try {
    return validateGameConfigJson(configJson);
  } catch {
    return fallbackJson;
  }
}

function clampSignedBps(value: bigint): bigint {
  return clampBigInt(
    value,
    -NPC_MARKET_PRESSURE_LIMIT_BPS,
    NPC_MARKET_PRESSURE_LIMIT_BPS,
  );
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

function applyNpcPriceMove(
  marketConfig: Pick<(typeof npcMarketCatalog)[number], 'basePriceGold' | 'volatilityBps'>,
  marketPriceGold: bigint,
  moveBps: bigint,
): bigint {
  let nextPriceGold = (marketPriceGold * (10_000n + moveBps)) / 10_000n;

  if (moveBps > 0n && nextPriceGold <= marketPriceGold) {
    nextPriceGold = marketPriceGold + 1n;
  }

  if (moveBps < 0n && nextPriceGold >= marketPriceGold && marketPriceGold > 1n) {
    nextPriceGold = marketPriceGold - 1n;
  }

  return clampNpcMarketPrice(marketConfig.basePriceGold, nextPriceGold);
}

function moveBigIntToward(value: bigint, target: bigint, step: bigint): bigint {
  if (value < target) {
    const nextValue = value + step;
    return nextValue > target ? target : nextValue;
  }

  if (value > target) {
    const nextValue = value - step;
    return nextValue < target ? target : nextValue;
  }

  return value;
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
    const existingBasePriceGold = toBigInt(existingRow.basePriceGold);
    const marketPriceGold =
      existingBasePriceGold === marketConfig.basePriceGold
        ? clampNpcMarketPrice(
            marketConfig.basePriceGold,
            toBigInt(existingRow.marketPriceGold),
          )
        : marketConfig.basePriceGold;
    const normalizedRow = getNpcMarketRowWithQuotes(
      existingRow,
      marketPriceGold,
    );

    if (
      normalizedRow.itemLabel === marketConfig.itemLabel &&
      normalizedRow.itemKind === marketConfig.itemKind &&
      normalizedRow.basePriceGold === marketConfig.basePriceGold &&
      normalizedRow.marketPriceGold === toBigInt(existingRow.marketPriceGold) &&
      normalizedRow.targetStock === marketConfig.targetStock
    ) {
      return normalizedRow;
    }

    return ctx.db.npcMarketPrice.itemKey.update({
      ...normalizedRow,
      itemLabel: marketConfig.itemLabel,
      itemKind: marketConfig.itemKind,
      basePriceGold: marketConfig.basePriceGold,
      targetStock: marketConfig.targetStock,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.npcMarketPrice.insert({
    itemKey: marketConfig.itemKey,
    itemLabel: marketConfig.itemLabel,
    itemKind: marketConfig.itemKind,
    basePriceGold: marketConfig.basePriceGold,
    marketPriceGold: marketConfig.basePriceGold,
    npcBuyPriceGold: getNpcBuyPriceGold(marketConfig.basePriceGold),
    npcSellPriceGold: getNpcSellPriceGold(marketConfig.basePriceGold),
    npcStock: marketConfig.targetStock,
    targetStock: marketConfig.targetStock,
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
  const marketPriceGold =
    toBigInt(row.basePriceGold) === marketConfig.basePriceGold
      ? toBigInt(row.marketPriceGold)
      : marketConfig.basePriceGold;
  const npcStock = toBigInt(row.npcStock);
  const targetStock = toBigInt(row.targetStock);
  const totalVolume = demandScore + supplyScore;
  const minVolume = targetStock / 20n > 10n ? targetStock / 20n : 10n;
  const flowDivisor = totalVolume > minVolume ? totalVolume : minVolume;
  const stockPressureBps = clampSignedBps(
    ((targetStock - npcStock) * 10_000n) / targetStock,
  );
  const flowPressureBps = clampSignedBps(
    ((demandScore - supplyScore) * 10_000n) / flowDivisor,
  );
  const rawPressureBps = (stockPressureBps * 70n + flowPressureBps * 30n) / 100n;
  const moveBps = clampBigInt(
    (rawPressureBps * marketConfig.volatilityBps) / 10_000n,
    -NPC_MARKET_PRICE_MOVE_LIMIT_BPS,
    NPC_MARKET_PRICE_MOVE_LIMIT_BPS,
  );
  let nextMarketPriceGold = applyNpcPriceMove(
    marketConfig,
    marketPriceGold,
    moveBps,
  );

  if (totalVolume === 0n && nextMarketPriceGold === marketPriceGold) {
    nextMarketPriceGold = moveBigIntToward(
      marketPriceGold,
      marketConfig.basePriceGold,
      1n,
    );
  }

  const stockRebalanceStep = targetStock / 100n > 1n ? targetStock / 100n : 1n;
  const nextNpcStock = moveBigIntToward(npcStock, targetStock, stockRebalanceStep);
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
    npcStock: nextNpcStock,
    demandScore: nextDemandScore,
    supplyScore: nextSupplyScore,
    updatedAt: ctx.timestamp,
    lastTickAt: ctx.timestamp,
  });
}

function applyDueNpcMarketTicks(ctx: IdleWizardReducerCtx) {
  ensureNpcMarketCatalog(ctx);

  for (const row of ctx.db.npcMarketPrice.iter()) {
    applyNpcMarketTick(ctx, row);
  }
}

function ensurePlayer(ctx: IdleWizardReducerCtx) {
  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  const username = existingPlayer?.username ?? DEFAULT_USERNAME;

  if (existingPlayer) {
    return ctx.db.player.identity.update({
      ...existingPlayer,
      playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
      connected: true,
      lastSeenAt: ctx.timestamp,
    });
  }

  return ctx.db.player.insert({
    identity: ctx.sender,
    username,
    playerLevel: DEFAULT_PLAYER_LEVEL,
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

  if (existingEntry) {
    return ctx.db.leaderboard.identity.update({
      ...existingEntry,
      username,
      playerLevel: safePlayerLevel,
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

function hasNpcMarketAdmin(ctx: IdleWizardReducerCtx): boolean {
  return Array.from(ctx.db.npcMarketAdmin.iter()).length > 0;
}

function assertGameConfigAdmin(ctx: IdleWizardReducerCtx) {
  if (!ctx.db.npcMarketAdmin.identity.find(ctx.sender)) {
    throw new Error('Game config requires admin.');
  }
}

function assertNpcMarketAdmin(ctx: IdleWizardReducerCtx) {
  assertGameConfigAdmin(ctx);
}

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const player = ensurePlayer(ctx);
  ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
  ensureResearchConfigCatalog(ctx);
  ensureGameConfigCatalog(ctx);
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
  const existingPlayer = ctx.db.player.identity.find(ctx.sender);
  let player;

  if (existingPlayer) {
    player = ctx.db.player.identity.update({
      ...existingPlayer,
      username: normalizedUsername,
      playerLevel: normalizePlayerLevel(existingPlayer.playerLevel),
      lastSeenAt: ctx.timestamp,
    });
  } else {
    player = ctx.db.player.insert({
      identity: ctx.sender,
      username: normalizedUsername,
      playerLevel: DEFAULT_PLAYER_LEVEL,
      connected: true,
      createdAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
    });
  }

  ensureLeaderboardEntry(ctx, normalizedUsername, player.playerLevel);
});

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

export const set_total_generated_gold = spacetimedb.reducer(
  { totalGeneratedGold: t.u64() },
  (ctx, { totalGeneratedGold }) => {
    const player = ensurePlayer(ctx);
    const entry = ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
    const nextTotalIncome =
      totalGeneratedGold > entry.totalIncome ? totalGeneratedGold : entry.totalIncome;

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

export const announce_research = spacetimedb.reducer(
  { researchName: t.string() },
  (ctx, { researchName }) => {
    const safeResearchName = normalizeResearchName(researchName);

    if (!safeResearchName) {
      return;
    }

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
    const safeSlotNumber = validatePlayerShopSlotNumber(slotNumber);
    const safeItemKey = normalizePlayerShopText(itemKey, MAX_ITEM_KEY_LENGTH);
    const safeItemLabel = normalizePlayerShopText(itemLabel, MAX_ITEM_LABEL_LENGTH);
    const safeItemKind = normalizePlayerShopText(itemKind, MAX_ITEM_KIND_LENGTH);

    if (!safeItemKey || !safeItemLabel || !safeItemKind) {
      throw new Error('Player shop item is required.');
    }

    if (quantity < 1) {
      throw new Error('Player shop quantity must be positive.');
    }

    if (priceGold < 1n) {
      throw new Error('Player shop price must be positive.');
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
      quantity,
      priceGold,
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

    ctx.db.playerShopListing.listingKey.update({
      ...listing,
      quantity: remainingQuantity,
      updatedAt: ctx.timestamp,
    });

    const proceedsGold = listing.priceGold * BigInt(quantity);
    const existingProceeds = ctx.db.playerShopProceeds.sellerIdentity.find(
      listing.sellerIdentity,
    );

    if (existingProceeds) {
      ctx.db.playerShopProceeds.sellerIdentity.update({
        ...existingProceeds,
        gold: existingProceeds.gold + proceedsGold,
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
  const proceeds = ctx.db.playerShopProceeds.sellerIdentity.find(ctx.sender);

  if (!proceeds) {
    return;
  }

  ctx.db.playerShopProceeds.delete(proceeds);
});

export const sell_to_npc = spacetimedb.reducer(
  { itemKey: t.string(), quantity: t.u32() },
  (ctx, { itemKey, quantity }) => {
    const safeQuantity = validateNpcMarketQuantity(quantity);
    let row = ensureNpcMarketItem(ctx, itemKey);
    row = applyNpcMarketTick(ctx, row);

    const tradeQuantity = BigInt(safeQuantity);
    const targetStock = toBigInt(row.targetStock);
    const npcStock = toBigInt(row.npcStock);
    const supplyScore = toBigInt(row.supplyScore);
    const maxStock = targetStock * 10n;
    const nextStock = clampBigInt(npcStock + tradeQuantity, 0n, maxStock);

    ctx.db.npcMarketPrice.itemKey.update({
      ...row,
      npcStock: nextStock,
      supplyScore: supplyScore + tradeQuantity,
      updatedAt: ctx.timestamp,
    });
  },
);

export const buy_from_npc = spacetimedb.reducer(
  { itemKey: t.string(), quantity: t.u32() },
  (ctx, { itemKey, quantity }) => {
    const safeQuantity = validateNpcMarketQuantity(quantity);
    let row = ensureNpcMarketItem(ctx, itemKey);
    row = applyNpcMarketTick(ctx, row);

    const tradeQuantity = BigInt(safeQuantity);
    const npcStock = toBigInt(row.npcStock);
    const demandScore = toBigInt(row.demandScore);

    if (npcStock < tradeQuantity) {
      throw new Error('NPC market item is out of stock.');
    }

    ctx.db.npcMarketPrice.itemKey.update({
      ...row,
      npcStock: npcStock - tradeQuantity,
      demandScore: demandScore + tradeQuantity,
      updatedAt: ctx.timestamp,
    });
  },
);

export const tick_npc_market = spacetimedb.reducer({}, (ctx) => {
  applyDueNpcMarketTicks(ctx);
});

export const claim_npc_market_admin = spacetimedb.reducer({}, (ctx) => {
  if (hasNpcMarketAdmin(ctx)) {
    throw new Error('NPC market admin already claimed.');
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
      ctx.db.npcMarketPrice.itemKey.update({
        ...getNpcMarketRowWithQuotes(existingRow, safeBasePriceGold),
        itemLabel: safeItemLabel,
        itemKind: safeItemKind,
        basePriceGold: safeBasePriceGold,
        targetStock: safeTargetStock,
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

    ctx.db.npcMarketPrice.itemKey.update({
      ...getNpcMarketRowWithQuotes(existingRow, safeBasePriceGold),
      itemLabel: marketConfig.itemLabel,
      itemKind: marketConfig.itemKind,
      basePriceGold: safeBasePriceGold,
      targetStock: marketConfig.targetStock,
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
    const safeConfigJson = validateGameConfigJson(configJson);

    if (!safeConfigKey) {
      throw new Error('Game config requires key.');
    }

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
