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
