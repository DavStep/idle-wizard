import { formatBigNumber } from './bigNumber.js';

const COIN_PRICE_PATTERN = /^\d+$/;

export function normalizeCoinPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  if (number === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(number));
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
  return price === null ? '?' : String(price);
}

export function formatCoinAmount(value) {
  if (
    (typeof value === 'bigint' && value >= 0n) ||
    (typeof value === 'string' && /^\d+$/.test(value.trim()))
  ) {
    return formatBigNumber(value);
  }

  const price = normalizeCoinPrice(value);

  if (price === null) {
    return '?';
  }

  return formatBigNumber(price);
}

export function formatCoinPriceText(value) {
  return `${formatCoinAmount(value)} coin`;
}
