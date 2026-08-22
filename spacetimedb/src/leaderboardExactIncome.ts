export const MAX_LEGACY_LEADERBOARD_INCOME = (1n << 64n) - 1n;

const EXACT_FIELD_BY_METRIC = {
  totalIncome: 'totalIncomeExact',
  dailyIncome: 'dailyIncomeExact',
  weeklyIncome: 'weeklyIncomeExact',
  monthlyIncome: 'monthlyIncomeExact',
} as const;

export type LeaderboardIncomeMetric = keyof typeof EXACT_FIELD_BY_METRIC;

export function parseLeaderboardIncome(value: unknown): bigint | null {
  if (typeof value === 'bigint') {
    return value >= 0n ? value : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0
      ? BigInt(Math.floor(value))
      : null;
  }

  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  return BigInt(text);
}

export function readLeaderboardIncome(
  entry: Record<string, unknown> | null | undefined,
  metric: LeaderboardIncomeMetric,
): bigint {
  const exactField = EXACT_FIELD_BY_METRIC[metric];
  const exact = parseLeaderboardIncome(entry?.[exactField]);
  return exact ?? parseLeaderboardIncome(entry?.[metric]) ?? 0n;
}

export function createLeaderboardIncomeFields(
  metric: 'totalIncome',
  value: unknown,
): { totalIncome: bigint; totalIncomeExact: string };
export function createLeaderboardIncomeFields(
  metric: 'dailyIncome',
  value: unknown,
): { dailyIncome: bigint; dailyIncomeExact: string };
export function createLeaderboardIncomeFields(
  metric: 'weeklyIncome',
  value: unknown,
): { weeklyIncome: bigint; weeklyIncomeExact: string };
export function createLeaderboardIncomeFields(
  metric: 'monthlyIncome',
  value: unknown,
): { monthlyIncome: bigint; monthlyIncomeExact: string };
export function createLeaderboardIncomeFields(
  metric: LeaderboardIncomeMetric,
  value: unknown,
): Record<string, bigint | string> {
  const income = parseLeaderboardIncome(value) ?? 0n;

  return {
    [metric]: clampLeaderboardIncomeForLegacyTransport(income),
    [EXACT_FIELD_BY_METRIC[metric]]: income.toString(),
  };
}

export function clampLeaderboardIncomeForLegacyTransport(value: bigint): bigint {
  if (value <= 0n) {
    return 0n;
  }

  return value > MAX_LEGACY_LEADERBOARD_INCOME
    ? MAX_LEGACY_LEADERBOARD_INCOME
    : value;
}
