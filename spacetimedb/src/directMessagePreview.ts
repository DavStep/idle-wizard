type DirectMessagePreviewRow = {
  body: string;
  sentAt: { microsSinceUnixEpoch: bigint };
  messageId: { compareTo(other: any): number };
};

export function selectLatestDirectMessagePreview<T extends DirectMessagePreviewRow>(
  messages: Iterable<T>,
): string {
  let latest: T | null = null;
  for (const message of messages) {
    if (!latest || isAfter(message, latest)) {
      latest = message;
    }
  }
  return latest?.body ?? '';
}

function isAfter(
  candidate: DirectMessagePreviewRow,
  current: DirectMessagePreviewRow,
): boolean {
  const candidateMicros = candidate.sentAt.microsSinceUnixEpoch;
  const currentMicros = current.sentAt.microsSinceUnixEpoch;
  if (candidateMicros !== currentMicros) {
    return candidateMicros > currentMicros;
  }
  return candidate.messageId.compareTo(current.messageId) > 0;
}
