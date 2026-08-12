type ConfigRow = Record<string, unknown>;

export function appendMissingItemConfigRows(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (!Array.isArray(defaultRows)) {
    return existingRows;
  }

  if (!Array.isArray(existingRows)) {
    return [...defaultRows];
  }

  const seenKeys = new Set(existingRows.filter(isConfigRow).map(getKey));
  const missingRows = defaultRows.filter((row) =>
    isConfigRow(row) ? !seenKeys.has(getKey(row)) : false,
  );

  return missingRows.length > 0 ? [...existingRows, ...missingRows] : existingRows;
}

export function normalizeLegacySeedSummonCosts(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const defaultRowsByKey = new Map(defaultRows.filter(isConfigRow).map((row) => [
    getKey(row),
    row,
  ]));
  let changed = false;
  const normalizedRows = existingRows.map((row) => {
    if (!isConfigRow(row) || ![15, 50].includes(Number(row.summonManaCost))) {
      return row;
    }

    const defaultRow = defaultRowsByKey.get(getKey(row));

    if (!defaultRow) {
      return row;
    }

    changed = true;
    return {
      ...row,
      summonManaCost: defaultRow.summonManaCost,
    };
  });

  return changed ? normalizedRows : existingRows;
}

function isConfigRow(value: unknown): value is ConfigRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
