import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const DEFAULT_PLAYER_LEVEL = 1;
const MAX_PLAYER_LEVEL = 100_000;
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
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
    const basePriceGold = normalizeNpcMarketBasePriceGold(
      existingConfig.basePriceGold,
      catalogItem.basePriceGold,
    );

    if (
      existingConfig.itemLabel === catalogItem.itemLabel &&
      existingConfig.itemKind === catalogItem.itemKind &&
      existingConfig.defaultBasePriceGold === catalogItem.basePriceGold &&
      existingConfig.basePriceGold === basePriceGold
    ) {
      return existingConfig;
    }

    return ctx.db.npcMarketItemConfig.itemKey.update({
      ...existingConfig,
      itemLabel: catalogItem.itemLabel,
      itemKind: catalogItem.itemKind,
      defaultBasePriceGold: catalogItem.basePriceGold,
      basePriceGold,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.npcMarketItemConfig.insert({
    itemKey: catalogItem.itemKey,
    itemLabel: catalogItem.itemLabel,
    itemKind: catalogItem.itemKind,
    defaultBasePriceGold: catalogItem.basePriceGold,
    basePriceGold: catalogItem.basePriceGold,
    updatedAt: ctx.timestamp,
  });
}

function getNpcMarketRuntimeConfig(ctx: IdleWizardReducerCtx, itemKey: string) {
  const catalogItem = getNpcMarketCatalogItem(itemKey);
  const itemConfig = ensureNpcMarketItemConfig(ctx, catalogItem);

  return {
    ...catalogItem,
    basePriceGold: toBigInt(itemConfig.basePriceGold),
  };
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
    ensureNpcMarketItem(ctx, catalogItem.itemKey);
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

function assertNpcMarketAdmin(ctx: IdleWizardReducerCtx) {
  if (!ctx.db.npcMarketAdmin.identity.find(ctx.sender)) {
    throw new Error('NPC market config requires admin.');
  }
}

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const player = ensurePlayer(ctx);
  ensureLeaderboardEntry(ctx, player.username, player.playerLevel);
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

export const set_npc_market_item_base_price = spacetimedb.reducer(
  { itemKey: t.string(), basePriceGold: t.u64() },
  (ctx, { itemKey, basePriceGold }) => {
    assertNpcMarketAdmin(ctx);

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

export default spacetimedb;
