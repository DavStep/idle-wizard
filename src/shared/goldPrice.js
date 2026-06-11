const GOLD_PRICE_FACTOR = 100;
const GOLD_PRICE_PATTERN = /^\d+(?:\.\d{0,2})?$/;

export function normalizeGoldPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round((number + Number.EPSILON) * GOLD_PRICE_FACTOR) / GOLD_PRICE_FACTOR;
}

export function normalizePositiveGoldPrice(value) {
  const price = normalizeGoldPrice(value);
  return price !== null && price > 0 ? price : null;
}

export function parsePositiveGoldPrice(value) {
  const text = String(value ?? '').trim();

  if (!GOLD_PRICE_PATTERN.test(text)) {
    return null;
  }

  return normalizePositiveGoldPrice(text);
}

export function multiplyGoldPrice(price, quantity) {
  const safePrice = normalizePositiveGoldPrice(price);
  const safeQuantity = Math.floor(Number(quantity));

  if (safePrice === null || !Number.isInteger(safeQuantity) || safeQuantity <= 0) {
    return null;
  }

  return normalizeGoldPrice(safePrice * safeQuantity);
}

export function formatGoldPrice(value) {
  const price = normalizeGoldPrice(value);
  return price === null ? '?' : price.toFixed(2);
}

export function formatGoldPriceText(value) {
  return `${formatGoldPrice(value)} gold`;
}
