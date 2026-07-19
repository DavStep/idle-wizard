export function normalizeSaveSelectedNumber(
  value: unknown,
  max: number,
): number | null {
  const safeMax = Math.floor(Number(max));

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isInteger(safeMax) ||
    safeMax < 1
  ) {
    return null;
  }

  const selected = Math.floor(Number(value));
  if (!Number.isFinite(selected)) {
    return null;
  }

  return Math.max(1, Math.min(safeMax, selected));
}
