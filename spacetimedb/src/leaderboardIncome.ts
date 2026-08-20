export function normalizeLeaderboardIncome(totalIncome: bigint): bigint {
  return totalIncome < 0n ? 0n : totalIncome;
}
