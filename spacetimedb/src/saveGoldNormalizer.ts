export const MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD = 1_000_000_000;
export const MAX_PLAYER_SAVE_CURRENT_GOLD = MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD;

export function normalizeSaveGold(value: unknown) {
  const gold = isRecord(value) ? value : {};
  const current = clampSaveGoldPrice(gold.current, BigInt(MAX_PLAYER_SAVE_CURRENT_GOLD));
  const totalGenerated = clampSaveGoldPrice(
    gold.totalGenerated,
    BigInt(MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD),
  );

  return {
    current,
    totalGenerated: Math.max(current, totalGenerated),
  };
}

export function clampSaveGoldPrice(value: unknown, max: bigint): number {
  const price = normalizeGoldPrice(typeof value === 'bigint' ? value : Number(value));

  if (price === null) {
    return 0;
  }

  return clampNumber(price, 0, Number(max));
}

function normalizeGoldPrice(value: bigint | number): number | null {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
