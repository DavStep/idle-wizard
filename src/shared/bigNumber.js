const COMPACT_NUMBER_UNITS = [
  { value: 1_000_000_000_000, suffix: 't' },
  { value: 1_000_000_000, suffix: 'b' },
  { value: 1_000_000, suffix: 'm' },
  { value: 1_000, suffix: 'k' },
];

export function formatBigNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return '?';
  }

  const wholeNumber = Math.floor(number);

  if (wholeNumber < 1_000) {
    return String(wholeNumber);
  }

  const unit = COMPACT_NUMBER_UNITS.find(
    (candidate) => wholeNumber >= candidate.value,
  );
  const scaled = wholeNumber / unit.value;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const factor = 10 ** decimals;
  const compact = Math.floor(scaled * factor) / factor;

  return `${trimDecimals(compact.toFixed(decimals))}${unit.suffix}`;
}

function trimDecimals(text) {
  return text.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1').replace(/\.0$/, '');
}
