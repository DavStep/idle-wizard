import { schema, table, t, type ReducerCtx, type InferSchema } from 'spacetimedb/server';

const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;

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
});

type IdleWizardSchema = InferSchema<typeof spacetimedb>;
type IdleWizardReducerCtx = ReducerCtx<IdleWizardSchema>;

function normalizeUsername(username: string): string {
  const value = String(username ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  return (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);
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

export default spacetimedb;
