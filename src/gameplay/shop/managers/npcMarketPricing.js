import { normalizeGoldPrice, normalizePositiveGoldPrice } from '../../../shared/goldPrice.js';

export const NPC_MARKET_BUY_BPS = 8_000;
export const NPC_MARKET_SELL_BPS = 12_000;
export const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;
export const NPC_MARKET_SOFTNESS_BPS = 1_500;
export const NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MS = 2 * 60 * 60 * 1000;

const DEFAULT_VOLATILITY_BPS_BY_KIND = new Map([
  ['seed', 1_200],
  ['herb', 1_000],
  ['potion', 800],
]);

export function getNpcMarketPriceFromNeed({
  basePriceGold,
  itemKind,
  npcNeed,
  targetNeed,
  volatilityBps,
} = {}) {
  const safeBasePriceGold = normalizePositiveGoldPrice(basePriceGold);
  const safeNeed = normalizeCount(npcNeed);
  const safeTargetNeed = normalizeCount(targetNeed);

  if (
    safeBasePriceGold === null ||
    safeNeed === null ||
    safeTargetNeed === null ||
    safeTargetNeed <= 0
  ) {
    return null;
  }

  const softness = Math.max(1, (safeTargetNeed * NPC_MARKET_SOFTNESS_BPS) / 10_000);
  const pressure = (safeNeed + softness) / (safeTargetNeed + softness);
  const elasticity = getNpcMarketPriceElasticity({ itemKind, volatilityBps });

  return normalizeGoldPrice(safeBasePriceGold * pressure ** elasticity);
}

export function getNpcBuyPriceGold(marketPriceGold) {
  const safeMarketPriceGold = normalizeGoldPrice(marketPriceGold);

  if (safeMarketPriceGold === null) {
    return null;
  }

  return normalizeGoldPrice((safeMarketPriceGold * NPC_MARKET_BUY_BPS) / 10_000);
}

export function getNpcSellPriceGold(marketPriceGold) {
  const safeMarketPriceGold = normalizeGoldPrice(marketPriceGold);

  if (safeMarketPriceGold === null) {
    return null;
  }

  return normalizeGoldPrice((safeMarketPriceGold * NPC_MARKET_SELL_BPS) / 10_000);
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

  const tickMs = Number(lastTickAtMs || updatedAtMs || 0);

  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    return safeNeed;
  }

  const elapsedMs = Math.max(0, Number(nowMs) - tickMs);

  if (elapsedMs <= 0) {
    return safeNeed;
  }

  const recoveryShare = 1 - 0.5 ** (elapsedMs / NPC_MARKET_DEMAND_RECOVERY_HALF_LIFE_MS);

  if (safeNeed < safeTargetNeed) {
    return safeNeed + Math.floor((safeTargetNeed - safeNeed) * recoveryShare);
  }

  if (safeNeed > safeTargetNeed) {
    return safeNeed - Math.floor((safeNeed - safeTargetNeed) * recoveryShare);
  }

  return safeNeed;
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
  const marketPriceGold = getNpcMarketPriceFromNeed({
    basePriceGold: priceState.basePriceGold,
    itemKind: priceState.itemKind,
    npcNeed,
    targetNeed,
    volatilityBps: priceState.volatilityBps,
  });
  const npcBuyPriceGold = getNpcBuyPriceGold(marketPriceGold);
  const npcSellPriceGold = getNpcSellPriceGold(marketPriceGold);

  return {
    ...priceState,
    npcNeed,
    targetNeed,
    marketPriceGold: marketPriceGold ?? priceState.marketPriceGold,
    npcBuyPriceGold: npcBuyPriceGold ?? priceState.npcBuyPriceGold,
    npcSellPriceGold: npcSellPriceGold ?? priceState.npcSellPriceGold,
  };
}

export function normalizeCount(value) {
  const count = Math.floor(Number(value));

  if (!Number.isInteger(count) || count < 0) {
    return null;
  }

  return count;
}

function getNpcMarketPriceElasticity({ itemKind, volatilityBps } = {}) {
  const safeVolatilityBps =
    normalizeCount(volatilityBps) ?? DEFAULT_VOLATILITY_BPS_BY_KIND.get(itemKind) ?? 800;

  return 1 + Math.min(10_000, safeVolatilityBps) / 10_000;
}
