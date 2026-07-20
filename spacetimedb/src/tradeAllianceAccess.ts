export const TRADE_ALLIANCE_UNLOCK_LEVEL = 4;

export function isTradeAllianceUnlocked(playerLevel: number): boolean {
  return playerLevel >= TRADE_ALLIANCE_UNLOCK_LEVEL;
}
