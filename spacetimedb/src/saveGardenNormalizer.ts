export function normalizeGardenSelectedSeedItemKey(
  selectedSeedItemKey: string,
  itemCatalog: Map<string, string>,
): string | null {
  return itemCatalog.get(selectedSeedItemKey) === 'seed'
    ? selectedSeedItemKey
    : null;
}

export function normalizeGardenPlotAutomationSettings(
  value: { autoEnabled?: unknown; plantQuantity?: unknown } = {},
  maxQuantity = 5,
): { autoEnabled: boolean; plantQuantity: number | null } {
  const quantity = Math.floor(Number(value.plantQuantity));
  const safeMax = Math.max(1, Math.floor(Number(maxQuantity) || 1));

  return {
    autoEnabled: value.autoEnabled !== false,
    plantQuantity:
      Number.isInteger(quantity) && quantity >= 1 && quantity <= safeMax
        ? quantity
        : null,
  };
}

export function readSaveUnlockedGardenTileCount(value: unknown): number {
  const garden = isRecord(value) ? value : {};
  const directCount = Math.floor(Number(garden.unlockedTiles));

  if (Number.isInteger(directCount) && directCount >= 0) {
    return directCount;
  }

  if (!Array.isArray(garden.tiles)) {
    return 0;
  }

  return Math.max(
    0,
    ...garden.tiles
      .filter((tile): tile is Record<string, unknown> => isRecord(tile))
      .map((tile) => Math.floor(Number(tile.tileNumber)))
      .filter((tileNumber) => Number.isInteger(tileNumber) && tileNumber > 0),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
