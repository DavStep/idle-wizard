import { normalizeCoinPrice, normalizePositiveCoinPrice } from '../../../shared/coinPrice.js';

export const NPC_MARKET_BUY_BPS = 8_000;
export const NPC_MARKET_SELL_BPS = 12_000;
export const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;
export const NPC_MARKET_SOFTNESS_BPS = 1_500;
export const NPC_MARKET_DEMAND_WAVE_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const NPC_MARKET_DEMAND_DAILY_BUDGET_BPS = 40_000;
export const NPC_MARKET_DEMAND_CAP_BPS = 15_000;
export const NPC_MARKET_DEMAND_BIG_WAVE_BPS = 4_000;
export const NPC_MARKET_DEMAND_SMALL_WAVE_BPS = 2_000;
export const NPC_MARKET_WEEKLY_RESET_ANCHOR_MS = 1_780_876_800_000; // 2026-06-08 00:00 UTC.

const PERIOD_DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_WEEK_DAYS = 7;

const DEFAULT_VOLATILITY_BPS_BY_KIND = new Map([
  ['seed', 1_200],
  ['herb', 1_000],
  ['potion', 800],
]);

const DEFAULT_TARGET_NEED_BY_KIND = new Map([
  ['seed', 1_000],
  ['herb', 800],
  ['potion', 300],
]);

const DEMAND_WAVE_BPS_BY_SLOT = [
  NPC_MARKET_DEMAND_BIG_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
  NPC_MARKET_DEMAND_SMALL_WAVE_BPS,
];

export function getNpcMarketPriceFromNeed({
  basePriceCoin,
  itemKind,
  npcNeed,
  targetNeed,
  volatilityBps,
} = {}) {
  const safeBasePriceCoin = normalizePositiveCoinPrice(basePriceCoin);
  const safeNeed = normalizeCount(npcNeed);
  const safeTargetNeed = normalizeCount(targetNeed);

  if (
    safeBasePriceCoin === null ||
    safeNeed === null ||
    safeTargetNeed === null ||
    safeTargetNeed <= 0
  ) {
    return null;
  }

  const softness = Math.max(1, (safeTargetNeed * NPC_MARKET_SOFTNESS_BPS) / 10_000);
  const pressure = (safeNeed + softness) / (safeTargetNeed + softness);
  const elasticity = getNpcMarketPriceElasticity({ itemKind, volatilityBps });

  return normalizeCoinPrice(safeBasePriceCoin * pressure ** elasticity);
}

export function getNpcBuyPriceCoin(marketPriceCoin) {
  const safeMarketPriceCoin = normalizeCoinPrice(marketPriceCoin);

  if (safeMarketPriceCoin === null) {
    return null;
  }

  return normalizeCoinPrice((safeMarketPriceCoin * NPC_MARKET_BUY_BPS) / 10_000);
}

export function getNpcSellPriceCoin(marketPriceCoin) {
  const safeMarketPriceCoin = normalizeCoinPrice(marketPriceCoin);

  if (safeMarketPriceCoin === null) {
    return null;
  }

  return normalizeCoinPrice((safeMarketPriceCoin * NPC_MARKET_SELL_BPS) / 10_000);
}

export function getRecoveredNpcNeed({
  npcNeed,
  targetNeed,
  lastTickAtMs,
  updatedAtMs,
  nowMs = Date.now(),
} = {}) {
  const safeNeed = normalizeCount(npcNeed);
  const safeTargetNeed = normalizeCount(targetNeed);

  if (safeNeed === null || safeTargetNeed === null || safeTargetNeed <= 0) {
    return null;
  }

  const demandCap = getNpcMarketDemandCap(safeTargetNeed);
  const cappedNeed = Math.min(safeNeed, demandCap);
  const tickMs = Number(lastTickAtMs || updatedAtMs || 0);

  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    return cappedNeed;
  }

  const elapsedMs = Math.max(0, Number(nowMs) - tickMs);

  if (elapsedMs <= 0) {
    return cappedNeed;
  }

  const recoveryWindow = getNpcMarketDemandRecoveryWindow({
    npcNeed: cappedNeed,
    fromMs: tickMs,
    toMs: nowMs,
  });
  const waveRecovery = getNpcMarketDemandWaveRecovery({
    targetNeed: safeTargetNeed,
    fromMs: recoveryWindow.fromMs,
    toMs: nowMs,
  });

  return Math.min(demandCap, recoveryWindow.npcNeed + waveRecovery);
}

export function getNpcMarketPriceState(priceState, nowMs = Date.now()) {
  if (!priceState) {
    return null;
  }

  const targetNeed =
    normalizeCount(priceState.targetNeed) ?? normalizeCount(priceState.targetStock);
  const npcNeed = getRecoveredNpcNeed({
    npcNeed: priceState.npcNeed,
    targetNeed,
    lastTickAtMs: priceState.lastTickAtMs,
    updatedAtMs: priceState.updatedAtMs,
    nowMs,
  });
  const marketPriceCoin = getNpcMarketPriceFromNeed({
    basePriceCoin: priceState.basePriceCoin,
    itemKind: priceState.itemKind,
    npcNeed,
    targetNeed,
    volatilityBps: priceState.volatilityBps,
  });
  const npcBuyPriceCoin = getNpcBuyPriceCoin(marketPriceCoin);
  const npcSellPriceCoin = getNpcSellPriceCoin(marketPriceCoin);

  return {
    ...priceState,
    npcNeed,
    targetNeed,
    maxNeed: getPositiveCount(priceState.maxNeed) ?? getNpcMarketDemandCap(targetNeed),
    marketPriceCoin: marketPriceCoin ?? priceState.marketPriceCoin,
    npcBuyPriceCoin: npcBuyPriceCoin ?? priceState.npcBuyPriceCoin,
    npcSellPriceCoin: npcSellPriceCoin ?? priceState.npcSellPriceCoin,
  };
}

export function normalizeCount(value) {
  const count = Math.floor(Number(value));

  if (!Number.isInteger(count) || count < 0) {
    return null;
  }

  return count;
}

function getPositiveCount(value) {
  const count = normalizeCount(value);
  return count === null || count <= 0 ? null : count;
}

export function getNpcMarketDemandCap(targetNeed) {
  const safeTargetNeed = normalizeCount(targetNeed);

  if (safeTargetNeed === null || safeTargetNeed <= 0) {
    return null;
  }

  return Math.max(1, Math.floor((safeTargetNeed * NPC_MARKET_DEMAND_CAP_BPS) / 10_000));
}

export function getDefaultNpcMarketTargetNeed(itemKind) {
  return DEFAULT_TARGET_NEED_BY_KIND.get(itemKind) ?? null;
}

export function getNextNpcDemandWaveInfo({
  targetNeed,
  maxNeed = null,
  nowMs = Date.now(),
} = {}) {
  const safeTargetNeed = normalizeCount(targetNeed);

  if (safeTargetNeed === null || safeTargetNeed <= 0) {
    return null;
  }

  const safeNowMs = Number.isFinite(Number(nowMs)) ? Math.max(0, Number(nowMs)) : Date.now();
  const nextWaveAtMs =
    (Math.floor(safeNowMs / NPC_MARKET_DEMAND_WAVE_INTERVAL_MS) + 1) *
    NPC_MARKET_DEMAND_WAVE_INTERVAL_MS;
  const waveSlot = getNpcMarketDemandWaveSlot(nextWaveAtMs);
  const nextWaveAmount = getNpcMarketDemandWaveAmount(safeTargetNeed, waveSlot);
  const demandCap = getPositiveCount(maxNeed) ?? getNpcMarketDemandCap(safeTargetNeed);

  return {
    nextWaveAtMs,
    nextWaveAmount,
    maxNeed: demandCap,
    isBigWave: waveSlot === 0,
  };
}

export function getNpcMarketDemandWaveRecovery({ targetNeed, fromMs, toMs } = {}) {
  const safeTargetNeed = normalizeCount(targetNeed);
  const safeFromMs = Math.floor(Number(fromMs));
  const safeToMs = Math.floor(Number(toMs));

  if (
    safeTargetNeed === null ||
    safeTargetNeed <= 0 ||
    !Number.isFinite(safeFromMs) ||
    !Number.isFinite(safeToMs) ||
    safeToMs <= safeFromMs
  ) {
    return 0;
  }

  const firstWaveIndex = Math.floor(safeFromMs / NPC_MARKET_DEMAND_WAVE_INTERVAL_MS) + 1;
  const lastWaveIndex = Math.floor(safeToMs / NPC_MARKET_DEMAND_WAVE_INTERVAL_MS);

  if (lastWaveIndex < firstWaveIndex) {
    return 0;
  }

  const waveCount = lastWaveIndex - firstWaveIndex + 1;
  const fullDays = Math.floor(waveCount / DEMAND_WAVE_BPS_BY_SLOT.length);
  let recovery =
    Math.floor(
      (safeTargetNeed * NPC_MARKET_DEMAND_DAILY_BUDGET_BPS * fullDays) / 10_000,
    );
  const remainingWaves = waveCount % DEMAND_WAVE_BPS_BY_SLOT.length;

  for (let offset = 0; offset < remainingWaves; offset += 1) {
    recovery += getNpcMarketDemandWaveAmount(
      safeTargetNeed,
      (firstWaveIndex + fullDays * DEMAND_WAVE_BPS_BY_SLOT.length + offset) %
        DEMAND_WAVE_BPS_BY_SLOT.length,
    );
  }

  return recovery;
}

export function getNpcMarketDemandRecoveryWindow({ npcNeed, fromMs, toMs } = {}) {
  const safeFromMs = Math.floor(Number(fromMs));
  const safeToMs = Math.floor(Number(toMs));

  if (!Number.isFinite(safeFromMs) || !Number.isFinite(safeToMs)) {
    return {
      npcNeed,
      fromMs,
    };
  }

  const weekStartMs = getNpcMarketWeekStartMs(safeToMs);

  if (safeFromMs >= weekStartMs) {
    return {
      npcNeed,
      fromMs: safeFromMs,
    };
  }

  return {
    npcNeed: 0,
    fromMs: weekStartMs - 1,
  };
}

function getNpcMarketWeekStartMs(timeMs) {
  const weekMs = PERIOD_WEEK_DAYS * PERIOD_DAY_MS;
  return (
    NPC_MARKET_WEEKLY_RESET_ANCHOR_MS +
    Math.floor((timeMs - NPC_MARKET_WEEKLY_RESET_ANCHOR_MS) / weekMs) * weekMs
  );
}

function getNpcMarketDemandWaveAmount(targetNeed, waveSlot) {
  const waveBps = DEMAND_WAVE_BPS_BY_SLOT[waveSlot] ?? NPC_MARKET_DEMAND_SMALL_WAVE_BPS;
  return Math.floor(
    (targetNeed * NPC_MARKET_DEMAND_DAILY_BUDGET_BPS * waveBps) /
      10_000 /
      10_000,
  );
}

function getNpcMarketDemandWaveSlot(timeMs) {
  return positiveModulo(
    Math.floor(Number(timeMs) / NPC_MARKET_DEMAND_WAVE_INTERVAL_MS),
    DEMAND_WAVE_BPS_BY_SLOT.length,
  );
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function getNpcMarketPriceElasticity({ itemKind, volatilityBps } = {}) {
  const safeVolatilityBps =
    normalizeCount(volatilityBps) ?? DEFAULT_VOLATILITY_BPS_BY_KIND.get(itemKind) ?? 800;

  return 1 + Math.min(10_000, safeVolatilityBps) / 10_000;
}
