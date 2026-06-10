import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
const WORLD_CHAT_HISTORY_LIMIT = 40;
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

const potionCatalog = [
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
  { key: 'wastedPotion', label: 'Wasted Potion', basePriceGold: 1n },
];

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
    basePriceGold: 2n,
    targetStock: 800n,
    volatilityBps: 1_000n,
  })),
  ...potionCatalog.map((potion) => ({
    itemKey: potion.key,
    itemLabel: potion.label,
    itemKind: 'potion',
    basePriceGold: potion.basePriceGold ?? 5n,
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
});

type IdleWizardSchema = InferSchema<typeof spacetimedb>;
type IdleWizardReducerCtx = ReducerCtx<IdleWizardSchema>;

function normalizeUsername(username: string): string {
  const value = String(username ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  return (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);
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

function clampNpcMarketPrice(catalogItem: (typeof npcMarketCatalog)[number], priceGold: bigint) {
  return clampBigInt(
    priceGold,
    getNpcMarketFloorGold(catalogItem.basePriceGold),
    getNpcMarketCeilingGold(catalogItem.basePriceGold),
  );
}

function applyNpcPriceMove(
  catalogItem: (typeof npcMarketCatalog)[number],
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

  return clampNpcMarketPrice(catalogItem, nextPriceGold);
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

function ensureNpcMarketItem(ctx: IdleWizardReducerCtx, itemKey: string) {
  const catalogItem = getNpcMarketCatalogItem(itemKey);
  const existingRow = ctx.db.npcMarketPrice.itemKey.find(catalogItem.itemKey);

  if (existingRow) {
    const normalizedRow = getNpcMarketRowWithQuotes(
      existingRow,
      toBigInt(existingRow.marketPriceGold),
    );

    if (
      normalizedRow.itemLabel === catalogItem.itemLabel &&
      normalizedRow.itemKind === catalogItem.itemKind &&
      normalizedRow.basePriceGold === catalogItem.basePriceGold &&
      normalizedRow.targetStock === catalogItem.targetStock
    ) {
      return normalizedRow;
    }

    return ctx.db.npcMarketPrice.itemKey.update({
      ...normalizedRow,
      itemLabel: catalogItem.itemLabel,
      itemKind: catalogItem.itemKind,
      basePriceGold: catalogItem.basePriceGold,
      targetStock: catalogItem.targetStock,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.npcMarketPrice.insert({
    itemKey: catalogItem.itemKey,
    itemLabel: catalogItem.itemLabel,
    itemKind: catalogItem.itemKind,
    basePriceGold: catalogItem.basePriceGold,
    marketPriceGold: catalogItem.basePriceGold,
    npcBuyPriceGold: getNpcBuyPriceGold(catalogItem.basePriceGold),
    npcSellPriceGold: getNpcSellPriceGold(catalogItem.basePriceGold),
    npcStock: catalogItem.targetStock,
    targetStock: catalogItem.targetStock,
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

  const catalogItem = getNpcMarketCatalogItem(row.itemKey);
  const demandScore = toBigInt(row.demandScore);
  const supplyScore = toBigInt(row.supplyScore);
  const marketPriceGold = toBigInt(row.marketPriceGold);
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
    (rawPressureBps * catalogItem.volatilityBps) / 10_000n,
    -NPC_MARKET_PRICE_MOVE_LIMIT_BPS,
    NPC_MARKET_PRICE_MOVE_LIMIT_BPS,
  );
  let nextMarketPriceGold = applyNpcPriceMove(catalogItem, marketPriceGold, moveBps);

  if (totalVolume === 0n && nextMarketPriceGold === marketPriceGold) {
    nextMarketPriceGold = moveBigIntToward(
      marketPriceGold,
      catalogItem.basePriceGold,
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
      connected: true,
      lastSeenAt: ctx.timestamp,
    });
  }

  return ctx.db.player.insert({
    identity: ctx.sender,
    username,
    connected: true,
    createdAt: ctx.timestamp,
    lastSeenAt: ctx.timestamp,
  });
}

function ensureLeaderboardEntry(ctx: IdleWizardReducerCtx, username: string) {
  const existingEntry = ctx.db.leaderboard.identity.find(ctx.sender);

  if (existingEntry) {
    return ctx.db.leaderboard.identity.update({
      ...existingEntry,
      username,
      updatedAt: ctx.timestamp,
    });
  }

  return ctx.db.leaderboard.insert({
    identity: ctx.sender,
    username,
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

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const player = ensurePlayer(ctx);
  ensureLeaderboardEntry(ctx, player.username);
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

  if (existingPlayer) {
    ctx.db.player.identity.update({
      ...existingPlayer,
      username: normalizedUsername,
      lastSeenAt: ctx.timestamp,
    });
  } else {
    ctx.db.player.insert({
      identity: ctx.sender,
      username: normalizedUsername,
      connected: true,
      createdAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
    });
  }

  ensureLeaderboardEntry(ctx, normalizedUsername);
});

export const set_total_generated_gold = spacetimedb.reducer(
  { totalGeneratedGold: t.u64() },
  (ctx, { totalGeneratedGold }) => {
    const player = ensurePlayer(ctx);
    const entry = ensureLeaderboardEntry(ctx, player.username);
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
    ensureLeaderboardEntry(ctx, player.username);

    ctx.db.worldChat.insert({
      messageId: ctx.newUuidV7(),
      senderIdentity: ctx.sender,
      username: player.username,
      body: message,
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
      return;
    }

    ctx.db.playerShopProceeds.insert({
      sellerIdentity: listing.sellerIdentity,
      gold: proceedsGold,
      updatedAt: ctx.timestamp,
    });
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

export default spacetimedb;
