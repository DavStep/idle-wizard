export function normalizeWorldEventLeaderboardPoints(points: bigint): bigint {
  return points < 0n ? 0n : points;
}
