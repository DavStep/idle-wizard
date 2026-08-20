const REGRESSED_SHOP_AUTO_SELL_SECONDS = 30 * 60;
export const DEFAULT_SHOP_AUTO_SELL_SECONDS = 5;

type JsonRecord = Record<string, unknown>;

export function restoreFiveSecondShopTimer(
  config: unknown,
): JsonRecord | null {
  if (!isRecord(config) || !isRecord(config.shopShelf)) {
    return null;
  }

  if (
    Number(config.shopShelf.autoSellSeconds) !==
    REGRESSED_SHOP_AUTO_SELL_SECONDS
  ) {
    return config;
  }

  return {
    ...config,
    shopShelf: {
      ...config.shopShelf,
      autoSellSeconds: DEFAULT_SHOP_AUTO_SELL_SECONDS,
    },
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
