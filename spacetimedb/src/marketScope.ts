import {
  defaultMarketId,
  isMarketId,
  resolveMarketLicence,
} from '../../src/shared/marketLicence.js';

export function normalizeMarketId(marketId: unknown): string {
  return isMarketId(marketId) ? String(marketId) : defaultMarketId;
}

// Small Town keeps its historical keys so existing live rows remain in place.
// Every higher market receives a distinct key, even for the same catalog item.
export function getMarketScopedKey(marketId: unknown, key: string): string {
  const safeMarketId = normalizeMarketId(marketId);
  return safeMarketId === defaultMarketId ? key : `${safeMarketId}:${key}`;
}

export function assertMarketScope(completedPrestigeStars: number, requestedMarketId: string) {
  const activeMarketId = resolveMarketLicence(completedPrestigeStars).id;

  if (requestedMarketId !== activeMarketId) {
    throw new Error('Market licence does not match the active market.');
  }

  return activeMarketId;
}
