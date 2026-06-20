export function getChatFailureReason(error) {
  const message = getErrorText(error).toLowerCase();

  if (message.includes('globally rate limited') || message.includes('global rate limit')) {
    return 'global_rate_limited';
  }

  if (/\brate[- ]?limited\b/.test(message) || message.includes('too many requests')) {
    return 'rate_limited';
  }

  if (message.includes('world chat unlocks at level')) {
    return 'chat_locked';
  }

  if (message.includes('alliance chat requires membership')) {
    return 'no_alliance';
  }

  if (message.includes('account is open on another device')) {
    return 'account_in_use';
  }

  if (
    message.includes('server maintenance') ||
    message.includes('maintenance is active') ||
    message.includes('maintenance in progress')
  ) {
    return 'maintenance';
  }

  if (
    message.includes('offline') ||
    message.includes('disconnect') ||
    message.includes('not connected') ||
    message.includes('connection closed') ||
    message.includes('websocket') ||
    message.includes('network') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('database is paused') ||
    message.includes('database paused') ||
    message.includes('out of energy') ||
    message.includes('no energy')
  ) {
    return 'offline';
  }

  return 'send_failed';
}

function getErrorText(error, seen = new Set()) {
  if (error === null || error === undefined) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error !== 'object') {
    return String(error);
  }

  if (seen.has(error)) {
    return '';
  }

  seen.add(error);

  const parts = [];
  for (const key of [
    'message',
    'error',
    'reason',
    'details',
    'body',
    'text',
    'statusText',
  ]) {
    if (key in error) {
      parts.push(getErrorText(error[key], seen));
    }
  }

  if ('cause' in error) {
    parts.push(getErrorText(error.cause, seen));
  }

  try {
    parts.push(JSON.stringify(error));
  } catch {
    parts.push(String(error));
  }

  return parts.filter(Boolean).join(' ');
}
