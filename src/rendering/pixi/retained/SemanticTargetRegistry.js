import {
  assertRetainedUiCounters,
  incrementRetainedUiCounter,
  RETAINED_UI_COUNTERS,
} from './RetainedUiCounters.js';

/**
 * @typedef {object} SemanticTargetDefinition
 * @property {string} semanticId
 * @property {string | null} tutorialId
 * @property {object} displayObject
 * @property {object | (() => object) | null} bounds
 * @property {object | (() => object) | null} state
 * @property {((payload: unknown, snapshot: object) => unknown) | null} activate
 */

/**
 * DOM-free target lookup for tutorial guidance, dev recipes, and interaction
 * automation. Definitions retain the original callbacks and display object.
 */
export class SemanticTargetRegistry {
  constructor({ counters = null } = {}) {
    this.counters = assertRetainedUiCounters(counters);
    this.targets = new Map();
    this.tutorialTargets = new Map();
  }

  /**
   * @param {{
   *   semanticId?: string,
   *   tutorialId?: string | null,
   *   displayObject?: object,
   *   bounds?: object | (() => object) | null,
   *   state?: object | (() => object) | null,
   *   activate?: ((payload: unknown, snapshot: object) => unknown) | null,
   * }} descriptor
   * @returns {Readonly<SemanticTargetDefinition>}
   */
  register({
    semanticId,
    tutorialId = null,
    displayObject,
    bounds = null,
    state = null,
    activate = null,
  } = {}) {
    const safeSemanticId = validateId(semanticId, 'Semantic target');
    const safeTutorialId =
      tutorialId === null ? null : validateId(tutorialId, 'Tutorial target');

    if (
      (typeof displayObject !== 'object' && typeof displayObject !== 'function') ||
      displayObject === null
    ) {
      throw new TypeError(
        `Semantic target "${safeSemanticId}" requires a Pixi display object.`,
      );
    }

    if (bounds !== null && typeof bounds !== 'object' && typeof bounds !== 'function') {
      throw new TypeError(
        `Semantic target "${safeSemanticId}" bounds must be an object, function, or null.`,
      );
    }

    if (state !== null && typeof state !== 'object' && typeof state !== 'function') {
      throw new TypeError(
        `Semantic target "${safeSemanticId}" state must be an object, function, or null.`,
      );
    }

    if (activate !== null && typeof activate !== 'function') {
      throw new TypeError(
        `Semantic target "${safeSemanticId}" activate must be a function or null.`,
      );
    }

    if (this.targets.has(safeSemanticId)) {
      throw new Error(`Semantic target "${safeSemanticId}" is already registered.`);
    }

    const definition = Object.freeze({
      semanticId: safeSemanticId,
      tutorialId: safeTutorialId,
      displayObject,
      bounds,
      state,
      activate,
    });
    this.targets.set(safeSemanticId, definition);

    if (safeTutorialId !== null) {
      let semanticIds = this.tutorialTargets.get(safeTutorialId);

      if (!semanticIds) {
        semanticIds = new Set();
        this.tutorialTargets.set(safeTutorialId, semanticIds);
      }

      semanticIds.add(safeSemanticId);
    }

    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.TARGET_REGISTERED,
    );
    return definition;
  }

  unregister(semanticId, { displayObject = null } = {}) {
    const safeSemanticId = validateId(semanticId, 'Semantic target');
    const definition = this.targets.get(safeSemanticId);

    if (!definition || (displayObject !== null && definition.displayObject !== displayObject)) {
      return false;
    }

    this.targets.delete(safeSemanticId);

    if (definition.tutorialId !== null) {
      const semanticIds = this.tutorialTargets.get(definition.tutorialId);
      semanticIds?.delete(safeSemanticId);

      if (semanticIds?.size === 0) {
        this.tutorialTargets.delete(definition.tutorialId);
      }
    }

    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.TARGET_UNREGISTERED,
    );
    return true;
  }

  has(semanticId) {
    return this.targets.has(semanticId);
  }

  get(semanticId) {
    return this.targets.get(semanticId) ?? null;
  }

  require(semanticId) {
    const safeSemanticId = validateId(semanticId, 'Semantic target');
    const definition = this.targets.get(safeSemanticId);

    if (!definition) {
      throw new Error(`Unknown semantic target: ${safeSemanticId}`);
    }

    return definition;
  }

  getTutorialTargets(tutorialId, { availableOnly = false } = {}) {
    const safeTutorialId = validateId(tutorialId, 'Tutorial target');
    const semanticIds = this.tutorialTargets.get(safeTutorialId);

    if (!semanticIds) {
      return Object.freeze([]);
    }

    const definitions = [...semanticIds]
      .map((semanticId) => this.targets.get(semanticId))
      .filter(
        (definition) =>
          definition && (!availableOnly || this.isAvailable(definition.semanticId)),
      );
    return Object.freeze(definitions);
  }

  getTutorialTarget(tutorialId, { availableOnly = true } = {}) {
    return this.getTutorialTargets(tutorialId, { availableOnly })[0] ?? null;
  }

  resolve(semanticId) {
    const definition = this.require(semanticId);
    return Object.freeze({
      semanticId: definition.semanticId,
      tutorialId: definition.tutorialId,
      displayObject: definition.displayObject,
      bounds: resolveBounds(definition),
      state: resolveState(definition),
      activate: definition.activate,
    });
  }

  getBounds(semanticId) {
    return this.resolve(semanticId).bounds;
  }

  getState(semanticId) {
    return this.resolve(semanticId).state;
  }

  isAvailable(semanticId) {
    return isSnapshotAvailable(this.resolve(semanticId));
  }

  activate(semanticId, payload) {
    const definition = this.require(semanticId);

    if (definition.activate === null) {
      return false;
    }

    const snapshot = this.resolve(semanticId);

    if (
      !isSnapshotAvailable(snapshot) ||
      snapshot.state.enabled === false ||
      snapshot.state.interactive === false
    ) {
      return false;
    }

    const result = definition.activate(payload, snapshot);
    incrementRetainedUiCounter(
      this.counters,
      RETAINED_UI_COUNTERS.TARGET_ACTIVATED,
    );
    return result ?? true;
  }

  clear() {
    const removed = this.targets.size;
    this.targets.clear();
    this.tutorialTargets.clear();

    if (removed > 0) {
      incrementRetainedUiCounter(
        this.counters,
        RETAINED_UI_COUNTERS.TARGET_UNREGISTERED,
        removed,
      );
    }

    return removed;
  }

  getStats() {
    return Object.freeze({
      targets: this.targets.size,
      tutorialIds: this.tutorialTargets.size,
    });
  }
}

function resolveBounds(definition) {
  let bounds = definition.bounds;

  if (typeof bounds === 'function') {
    bounds = bounds();
  } else if (bounds === null && typeof definition.displayObject.getBounds === 'function') {
    bounds = definition.displayObject.getBounds();
  }

  if (!bounds) {
    throw new Error(
      `Semantic target "${definition.semanticId}" cannot resolve display bounds.`,
    );
  }

  if (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height)
  ) {
    return freezeRectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  if (
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY)
  ) {
    return freezeRectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
  }

  throw new TypeError(
    `Semantic target "${definition.semanticId}" returned invalid bounds.`,
  );
}

function freezeRectangle(x, y, width, height) {
  if (width < 0 || height < 0) {
    throw new RangeError('Semantic target bounds cannot have negative dimensions.');
  }

  return Object.freeze({ x, y, width, height });
}

function resolveState(definition) {
  const displayObject = definition.displayObject;
  const defaultState = {
    active: displayObject.destroyed !== true,
    visible:
      displayObject.visible !== false &&
      displayObject.renderable !== false &&
      displayObject.worldVisible !== false,
    enabled: true,
    interactive: displayObject.eventMode !== 'none',
  };
  const suppliedState =
    typeof definition.state === 'function' ? definition.state() : definition.state;

  if (suppliedState !== null && suppliedState !== undefined) {
    if (typeof suppliedState !== 'object') {
      throw new TypeError(
        `Semantic target "${definition.semanticId}" returned invalid state.`,
      );
    }

    Object.assign(defaultState, suppliedState);
  }

  return Object.freeze(defaultState);
}

function isSnapshotAvailable(snapshot) {
  return (
    snapshot.state.active !== false &&
    snapshot.state.visible !== false &&
    snapshot.bounds.width > 0 &&
    snapshot.bounds.height > 0
  );
}

function validateId(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} ids must be non-empty strings.`);
  }

  return value;
}
