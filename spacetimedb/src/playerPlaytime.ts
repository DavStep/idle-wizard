const MAX_U64 = (1n << 64n) - 1n;
const MICROS_PER_SECOND = 1_000_000n;

type TimestampLike = {
  microsSinceUnixEpoch?: bigint;
};

function normalizeMicros(value: bigint | number | undefined): bigint {
  if (typeof value === 'bigint') {
    return value > 0n ? value : 0n;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return BigInt(Math.floor(value));
  }

  return 0n;
}

function timestampMicros(value: TimestampLike | undefined): bigint {
  return normalizeMicros(value?.microsSinceUnixEpoch);
}

function clampU64(value: bigint): bigint {
  return value > MAX_U64 ? MAX_U64 : value;
}

export function addPlayerSessionPlaytimeMicros(
  totalMicros: bigint | number | undefined,
  startedAt: TimestampLike | undefined,
  endedAt: TimestampLike | undefined,
): bigint {
  const total = normalizeMicros(totalMicros);
  const startedAtMicros = timestampMicros(startedAt);
  const endedAtMicros = timestampMicros(endedAt);
  const elapsedMicros =
    startedAtMicros > 0n && endedAtMicros > startedAtMicros
      ? endedAtMicros - startedAtMicros
      : 0n;

  return clampU64(total + elapsedMicros);
}

export function combinePlayerPlaytimeMicros(
  leftMicros: bigint | number | undefined,
  rightMicros: bigint | number | undefined,
): bigint {
  return clampU64(normalizeMicros(leftMicros) + normalizeMicros(rightMicros));
}

export function playtimeMicrosToWholeSeconds(
  totalMicros: bigint | number | undefined,
): bigint {
  return normalizeMicros(totalMicros) / MICROS_PER_SECOND;
}
