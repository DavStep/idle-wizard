const COMPACT_NUMBER_SUFFIXES = ['', 'k', 'm', 'b', 't'];

export function formatBigNumber(value) {
  const wholeNumber = toWholeNumberText(value);
  if (wholeNumber === null) {
    return '?';
  }

  if (wholeNumber.length <= 3) {
    return wholeNumber;
  }

  const unitIndex = Math.floor((wholeNumber.length - 1) / 3);
  const leadingDigitCount = wholeNumber.length - unitIndex * 3;
  const decimalCount = Math.max(0, 3 - leadingDigitCount);
  const leading = wholeNumber.slice(0, leadingDigitCount);
  const decimals = wholeNumber.slice(
    leadingDigitCount,
    leadingDigitCount + decimalCount,
  );
  const compact = decimals ? `${leading}.${decimals}` : leading;

  return `${trimDecimals(compact)}${getCompactSuffix(unitIndex)}`;
}

function trimDecimals(text) {
  return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function toWholeNumberText(value) {
  if (typeof value === 'bigint') {
    return value < 0n ? null : value.toString();
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return value.trim().replace(/^0+(?=\d)/, '');
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return BigInt(Math.floor(number)).toString();
}

function getCompactSuffix(unitIndex) {
  if (unitIndex < COMPACT_NUMBER_SUFFIXES.length) {
    return COMPACT_NUMBER_SUFFIXES[unitIndex];
  }

  return toAlphabeticSuffix(unitIndex + 22);
}

function toAlphabeticSuffix(index) {
  let remaining = index;
  let suffix = '';

  while (remaining > 0) {
    remaining -= 1;
    suffix = String.fromCharCode(97 + (remaining % 26)) + suffix;
    remaining = Math.floor(remaining / 26);
  }

  return suffix;
}
