export function normalizeGardenSelectedSeedItemKey(
  selectedSeedItemKey: string,
  itemCatalog: Map<string, string>,
): string | null {
  return itemCatalog.get(selectedSeedItemKey) === 'seed'
    ? selectedSeedItemKey
    : null;
}
