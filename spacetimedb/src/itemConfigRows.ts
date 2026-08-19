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

export function rebaseItemConfigSellPrices(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const defaultRowsByKey = new Map(
    defaultRows.filter(isConfigRow).map((row) => [getKey(row), row]),
  );
  let changed = false;
  const rebasedRows = existingRows.map((row) => {
    if (!isConfigRow(row)) {
      return row;
    }

    const defaultRow = defaultRowsByKey.get(getKey(row));
    const defaultPrice = Number(defaultRow?.baseSellPrice);

    if (
      !Number.isFinite(defaultPrice) ||
      defaultPrice < 0 ||
      Number(row.baseSellPrice) === defaultPrice
    ) {
      return row;
    }

    changed = true;
    return { ...row, baseSellPrice: defaultPrice };
  });

  return changed ? rebasedRows : existingRows;
}

export function rebaseVersionedItemConfigSellPrices(
  existingConfig: ConfigRow,
  defaultConfig: ConfigRow,
  targetVersion: number,
  getKey: (row: ConfigRow) => string,
) {
  const storedVersion = Number(existingConfig.sellPriceVersion);

  if (Number.isInteger(storedVersion) && storedVersion >= targetVersion) {
    return existingConfig;
  }

  const rebasedConfig = { ...existingConfig };

  for (const key of ['seeds', 'herbs', 'potions']) {
    rebasedConfig[key] = rebaseItemConfigSellPrices(
      existingConfig[key],
      defaultConfig[key],
      getKey,
    );
  }

  rebasedConfig.sellPriceVersion = targetVersion;
  return rebasedConfig;
}

export function rebaseVersionedHerbGrowthDurations(
  existingConfig: ConfigRow,
  defaultConfig: ConfigRow,
  targetVersion: number,
  getKey: (row: ConfigRow) => string,
) {
  const storedVersion = Number(existingConfig.growthTimerVersion);

  if (Number.isInteger(storedVersion) && storedVersion >= targetVersion) {
    return existingConfig;
  }

  return {
    ...existingConfig,
    herbs: rebaseItemConfigNumberField(
      existingConfig.herbs,
      defaultConfig.herbs,
      getKey,
      'growthDurationMs',
    ),
    growthTimerVersion: targetVersion,
  };
}

function rebaseItemConfigNumberField(
  existingRows: unknown,
  defaultRows: unknown,
  getKey: (row: ConfigRow) => string,
  field: string,
) {
  if (!Array.isArray(existingRows) || !Array.isArray(defaultRows)) {
    return existingRows;
  }

  const defaultRowsByKey = new Map(
    defaultRows.filter(isConfigRow).map((row) => [getKey(row), row]),
  );

  return existingRows.map((row) => {
    if (!isConfigRow(row)) {
      return row;
    }

    const defaultValue = Number(defaultRowsByKey.get(getKey(row))?.[field]);
    return Number.isFinite(defaultValue) && Number(row[field]) !== defaultValue
      ? { ...row, [field]: defaultValue }
      : row;
  });
}

function isConfigRow(value: unknown): value is ConfigRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
