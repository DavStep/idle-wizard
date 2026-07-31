const DEFAULT_MINIMUM_CENTER_SIZE = Object.freeze({
  width: 1,
  height: 1,
});
const SIZE_EPSILON = 0.000001;

export function resolveNineSliceMinimumSize({
  outputInsets,
  minimumCenter = DEFAULT_MINIMUM_CENTER_SIZE,
} = {}) {
  const insets = normalizeInsets(outputInsets);
  const center = normalizeSize(minimumCenter, DEFAULT_MINIMUM_CENTER_SIZE);

  return Object.freeze({
    width: insets.left + insets.right + center.width,
    height: insets.top + insets.bottom + center.height,
  });
}

export function validateNineSliceCompatibility({
  assetId = 'nine-slice',
  outputInsets,
  minimumCenter = DEFAULT_MINIMUM_CENTER_SIZE,
  targetSize,
  targetLabel = 'widget',
} = {}) {
  const minimumSize = resolveNineSliceMinimumSize({
    outputInsets,
    minimumCenter,
  });
  const normalizedTargetSize = normalizeSize(targetSize);
  const widthShortfall = normalizeShortfall(
    minimumSize.width - normalizedTargetSize.width,
  );
  const heightShortfall = normalizeShortfall(
    minimumSize.height - normalizedTargetSize.height,
  );
  const compatible = widthShortfall === 0 && heightShortfall === 0;

  return Object.freeze({
    assetId: String(assetId),
    compatible,
    heightShortfall,
    message: compatible
      ? ''
      : createCompatibilityMessage({
          assetId,
          minimumSize,
          targetLabel,
          targetSize: normalizedTargetSize,
        }),
    minimumSize,
    targetLabel: String(targetLabel),
    targetSize: normalizedTargetSize,
    widthShortfall,
  });
}

export function assertNineSliceCompatibility(options) {
  const result = validateNineSliceCompatibility(options);

  if (!result.compatible) {
    throw new RangeError(result.message);
  }

  return result;
}

function createCompatibilityMessage({
  assetId,
  minimumSize,
  targetLabel,
  targetSize,
}) {
  return (
    `Nine-slice "${String(assetId)}" requires at least `
    + `${formatSize(minimumSize)}, but ${String(targetLabel)} can be `
    + `as small as ${formatSize(targetSize)}.`
  );
}

function normalizeInsets(value) {
  return {
    top: normalizeDimension(value?.top),
    right: normalizeDimension(value?.right),
    bottom: normalizeDimension(value?.bottom),
    left: normalizeDimension(value?.left),
  };
}

function normalizeSize(value, fallback = { width: 0, height: 0 }) {
  return Object.freeze({
    width: normalizeDimension(value?.width, fallback.width),
    height: normalizeDimension(value?.height, fallback.height),
  });
}

function normalizeDimension(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return Math.max(0, Number(fallback) || 0);
  }

  return Math.max(0, number);
}

function normalizeShortfall(value) {
  return value > SIZE_EPSILON ? value : 0;
}

function formatSize({ width, height }) {
  return `${formatDimension(width)}×${formatDimension(height)}`;
}

function formatDimension(value) {
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100);
}
