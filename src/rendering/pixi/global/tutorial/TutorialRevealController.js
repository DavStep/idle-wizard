/**
 * Renderer-owned projection of tutorial reveal tokens. Callers explicitly
 * register retained Pixi display objects; there are no selectors, attributes,
 * or DOM-style discovery rules.
 */
export class TutorialRevealController {
  constructor({
    ticker = null,
    durationMs = 220,
    sourceOffsetY = 4,
  } = {}) {
    this.ticker = ticker;
    this.durationMs = durationMs;
    this.sourceOffsetY = sourceOffsetY;
    this.groups = new Map();
    this.tokens = new Set();
    this.transitions = new Map();
    this.projecting = false;
    this.active = false;
    this.reducedMotion = false;
    this.tickerAttached = false;
    this.handleTick = (tickerValue) =>
      this.tick(tickerValue?.deltaMS ?? tickerValue);
  }

  register(token, { objects = [], interactiveObjects = objects } = {}) {
    const key = normalizeToken(token);
    if (this.groups.has(key)) {
      throw new Error(`Tutorial reveal group "${key}" is already registered.`);
    }
    const members = uniqueObjects(objects);
    const interactive = new Set(uniqueObjects(interactiveObjects));
    const snapshots = new Map(
      members.map((displayObject) => [
        displayObject,
        {
          alpha: displayObject.alpha ?? 1,
          y: displayObject.position?.y ?? displayObject.y ?? 0,
          eventMode: displayObject.eventMode ?? 'passive',
          visible: displayObject.visible !== false,
          renderable: displayObject.renderable !== false,
          interactive: interactive.has(displayObject),
        },
      ]),
    );
    this.groups.set(key, { key, members, snapshots });
    if (this.projecting) {
      this.applyObjectState(key, this.tokens.has(key), false);
    }
    return () => this.unregister(key);
  }

  unregister(token) {
    const key = normalizeToken(token);
    const group = this.groups.get(key);
    if (!group) {
      return false;
    }
    this.restoreGroup(group);
    this.groups.delete(key);
    this.transitions.delete(key);
    this.syncTicker();
    return true;
  }

  apply(tokens, { reducedMotion = this.reducedMotion } = {}) {
    this.reducedMotion = Boolean(reducedMotion);
    this.projecting = true;
    const nextTokens = new Set(
      Array.isArray(tokens)
        ? tokens.map(normalizeToken)
        : tokens instanceof Set
          ? [...tokens].map(normalizeToken)
          : [],
    );
    for (const key of this.groups.keys()) {
      const wasVisible = this.tokens.has(key);
      const visible = nextTokens.has(key);
      if (visible && !wasVisible && !this.reducedMotion) {
        this.applyObjectState(key, true, true);
        this.transitions.set(key, { elapsedMs: 0 });
      } else {
        this.transitions.delete(key);
        this.applyObjectState(key, visible, false);
      }
    }
    this.tokens = nextTokens;
    this.syncTicker();
  }

  clear() {
    this.restore();
  }

  restore() {
    this.tokens.clear();
    this.transitions.clear();
    this.projecting = false;
    for (const group of this.groups.values()) {
      this.restoreGroup(group);
    }
    this.syncTicker();
  }

  activate() {
    this.active = true;
    this.syncTicker();
  }

  deactivate() {
    this.active = false;
    this.stopTicker();
  }

  tick(deltaMs) {
    const delta = Math.max(0, Number(deltaMs) || 0);
    for (const [key, transition] of [...this.transitions]) {
      transition.elapsedMs += delta;
      const progress = Math.min(
        1,
        transition.elapsedMs / Math.max(1, this.durationMs),
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const group = this.groups.get(key);
      for (const displayObject of group?.members ?? []) {
        const snapshot = group.snapshots.get(displayObject);
        displayObject.alpha = snapshot.alpha * eased;
        setDisplayY(
          displayObject,
          snapshot.y + this.sourceOffsetY * (1 - eased),
        );
      }
      if (progress >= 1) {
        this.transitions.delete(key);
        this.applyObjectState(key, true, false);
      }
    }
    this.syncTicker();
  }

  applyObjectState(key, visible, transitionStart) {
    const group = this.groups.get(key);
    for (const displayObject of group?.members ?? []) {
      const snapshot = group.snapshots.get(displayObject);
      displayObject.visible = visible && snapshot.visible;
      displayObject.renderable = visible && snapshot.renderable;
      displayObject.alpha = transitionStart ? 0 : snapshot.alpha;
      setDisplayY(
        displayObject,
        snapshot.y + (transitionStart ? this.sourceOffsetY : 0),
      );
      if (snapshot.interactive) {
        displayObject.eventMode = visible
          ? snapshot.eventMode
          : 'none';
      }
    }
  }

  restoreGroup(group) {
    for (const displayObject of group.members) {
      const snapshot = group.snapshots.get(displayObject);
      displayObject.visible = snapshot.visible;
      displayObject.renderable = snapshot.renderable;
      displayObject.alpha = snapshot.alpha;
      displayObject.eventMode = snapshot.eventMode;
      setDisplayY(displayObject, snapshot.y);
    }
  }

  syncTicker() {
    const shouldAttach = this.active && this.transitions.size > 0;
    if (shouldAttach && !this.tickerAttached) {
      this.ticker?.add?.(this.handleTick);
      this.tickerAttached = Boolean(this.ticker?.add);
    } else if (!shouldAttach) {
      this.stopTicker();
    }
  }

  stopTicker() {
    if (!this.tickerAttached) {
      return;
    }
    this.ticker?.remove?.(this.handleTick);
    this.tickerAttached = false;
  }

  destroy() {
    this.restore();
    this.stopTicker();
    this.groups.clear();
  }
}

export function createTutorialRevealController(options = {}) {
  return new TutorialRevealController(options);
}

function normalizeToken(token) {
  const key = String(token ?? '').trim();
  if (!key) {
    throw new Error('Tutorial reveal groups require a token.');
  }
  return key;
}

function uniqueObjects(objects) {
  return [...new Set((objects ?? []).filter(Boolean))];
}

function setDisplayY(displayObject, y) {
  if (displayObject.position?.set) {
    displayObject.position.set(displayObject.position.x, y);
  } else {
    displayObject.y = y;
  }
}
