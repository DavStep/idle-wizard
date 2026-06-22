const COIN_PRICE_FACTOR = 100;
const COIN_PRICE_PATTERN = /^\d+(?:\.\d{0,2})?$/;
const COMPACT_COIN_UNITS = [
  { value: 1_000_000_000_000, suffix: 't' },
  { value: 1_000_000_000, suffix: 'b' },
  { value: 1_000_000, suffix: 'm' },
  { value: 1_000, suffix: 'k' },
];

export function normalizeCoinPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round((number + Number.EPSILON) * COIN_PRICE_FACTOR) / COIN_PRICE_FACTOR;
}

export function normalizePositiveCoinPrice(value) {
  const price = normalizeCoinPrice(value);
  return price !== null && price > 0 ? price : null;
}

export function parsePositiveCoinPrice(value) {
  const text = String(value ?? '').trim();

  if (!COIN_PRICE_PATTERN.test(text)) {
    return null;
  }

  return normalizePositiveCoinPrice(text);
}

export function multiplyCoinPrice(price, quantity) {
  const safePrice = normalizePositiveCoinPrice(price);
  const safeQuantity = Math.floor(Number(quantity));

  if (safePrice === null || !Number.isInteger(safeQuantity) || safeQuantity <= 0) {
    return null;
  }

  return normalizeCoinPrice(safePrice * safeQuantity);
}

export function formatCoinPrice(value) {
  const price = normalizeCoinPrice(value);
  return price === null ? '?' : price.toFixed(2);
}

export function formatCoinAmount(value) {
  const price = normalizeCoinPrice(value);

  if (price === null) {
    return '?';
  }

  if (price < 1_000) {
    return trimCoinDecimals(price.toFixed(2));
  }

  const unit = COMPACT_COIN_UNITS.find((candidate) => price >= candidate.value);
  const scaled = price / unit.value;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const factor = 10 ** decimals;
  const compact = Math.floor(scaled * factor) / factor;

  return `${trimCoinDecimals(compact.toFixed(decimals))}${unit.suffix}`;
}

export function formatCoinPriceText(value) {
  return `${formatCoinAmount(value)} coin`;
}

function trimCoinDecimals(text) {
  return text.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
