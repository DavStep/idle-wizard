const DEFAULT_CURRENCY_GRANT_SOURCE_TYPE = 'direct_grant';

export class CurrencyGrantEventManager {
  constructor() {
    this.listeners = new Set();
    this.nextEventId = 1;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event) {
    const currency = String(event?.currency ?? '').trim();
    const amount = Number(event?.amount);

    if (!currency || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const grantEvent = {
      id: this.nextEventId,
      currency,
      amount,
      sourceType: normalizeCurrencyGrantSourceType(event?.sourceType),
    };
    this.nextEventId += 1;

    for (const listener of this.listeners) {
      listener(grantEvent);
    }

    return grantEvent;
  }

  clear() {
    this.listeners.clear();
  }
}

export function publishCurrencyGrant({
  onGrant,
  currency,
  sourceType,
  previousCurrent,
  current,
}) {
  const amount = Number(current) - Number(previousCurrent);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const event = {
    currency,
    amount,
    sourceType: normalizeCurrencyGrantSourceType(sourceType),
  };
  onGrant?.(event);
  return event;
}

function normalizeCurrencyGrantSourceType(value) {
  return String(value ?? '').trim() || DEFAULT_CURRENCY_GRANT_SOURCE_TYPE;
}
