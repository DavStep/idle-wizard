const GOLD_PRICE_FACTOR = 100;
const GOLD_PRICE_PATTERN = /^\d+(?:\.\d{0,2})?$/;
const COMPACT_GOLD_UNITS = [
  { value: 1_000_000_000_000, suffix: 't' },
  { value: 1_000_000_000, suffix: 'b' },
  { value: 1_000_000, suffix: 'm' },
  { value: 1_000, suffix: 'k' },
];

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

export function formatGoldAmount(value) {
  const price = normalizeGoldPrice(value);

  if (price === null) {
    return '?';
  }

  if (price < 1_000) {
    return trimGoldDecimals(price.toFixed(2));
  }

  const unit = COMPACT_GOLD_UNITS.find((candidate) => price >= candidate.value);
  const scaled = price / unit.value;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const factor = 10 ** decimals;
  const compact = Math.floor(scaled * factor) / factor;

  return `${trimGoldDecimals(compact.toFixed(decimals))}${unit.suffix}`;
}

export function formatGoldPriceText(value) {
  return `${formatGoldAmount(value)} gold`;
}

function trimGoldDecimals(text) {
  return text.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
