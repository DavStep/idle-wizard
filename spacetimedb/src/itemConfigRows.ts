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

function isConfigRow(value: unknown): value is ConfigRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
