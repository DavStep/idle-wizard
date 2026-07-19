export function normalizeSaveClientTimestamp(value: unknown): number {
  const timestamp = Math.floor(Number(value));

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 0;
  }

  return Math.min(timestamp, Number.MAX_SAFE_INTEGER);
}

export function normalizeSaveClientSessionId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const sessionId = value.trim();
  return sessionId.length > 0 && sessionId.length <= 64 ? sessionId : null;
}

export function normalizeSaveClientSequence(value: unknown): number {
  const sequence = Math.floor(Number(value));

  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    return 0;
  }

  return sequence;
}
