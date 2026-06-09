import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;
const MAX_WORLD_CHAT_MESSAGE_LENGTH = 160;
const WORLD_CHAT_HISTORY_LIMIT = 40;
const MAX_PLAYER_SHOP_SLOTS = 5;
const MAX_ITEM_KEY_LENGTH = 64;
const MAX_ITEM_LABEL_LENGTH = 80;
const MAX_ITEM_KIND_LENGTH = 24;

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

export default spacetimedb;
