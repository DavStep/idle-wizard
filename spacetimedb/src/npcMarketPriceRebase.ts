type Row = Record<string, unknown>;

export function rebaseNpcMarketCatalogConfig<T extends Row>(
  existingConfig: T,
  {
    storedCatalogBasePriceGold,
    priceScale,
    updatedAt,
  }: {
    storedCatalogBasePriceGold: unknown;
    priceScale: number;
    updatedAt: unknown;
  },
): T & {
  defaultBasePriceGold: unknown;
  basePriceGold: unknown;
  priceScale: number;
  updatedAt: unknown;
} {
  return {
    ...existingConfig,
    defaultBasePriceGold: storedCatalogBasePriceGold,
    basePriceGold: storedCatalogBasePriceGold,
    priceScale,
    updatedAt,
  };
}

export function resetNpcMarketTuningScores<T extends Row>(
  marketRow: T,
  updatedAt: unknown,
): T & { demandScore: bigint; supplyScore: bigint; updatedAt: unknown } {
  return {
    ...marketRow,
    demandScore: 0n,
    supplyScore: 0n,
    updatedAt,
  };
}
