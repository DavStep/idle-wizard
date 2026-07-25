export const INPUT_REGISTRATION_KINDS = Object.freeze([
  'press',
  'scroll',
  'drag',
  'drop',
  'pan',
  'pinch',
  'swipe',
]);

const REGISTRATION_KIND_SET = new Set(INPUT_REGISTRATION_KINDS);

/**
 * Mutable registration store for the central router. Updating callbacks or
 * state never touches the one root event-handler set.
 */
export class InputRegistrationStore {
  constructor() {
    this.registrations = new Map();
    this.byDisplayObject = new WeakMap();
    this.nextOrder = 1;
  }

  register(kind, descriptor = {}) {
    validateKind(kind);
    const id = validateId(descriptor.id);
    const displayObject = validateDisplayObject(descriptor.displayObject, id);

    if (this.registrations.has(id)) {
      throw new Error(`Pixi input registration "${id}" already exists.`);
    }

    const registration = {
      ...descriptor,
      id,
      kind,
      displayObject,
      priority: finiteOr(descriptor.priority, 0),
      order: this.nextOrder++,
    };
    this.registrations.set(id, registration);
    this.addToDisplayObject(registration);
    return registration;
  }

  update(id, patch = {}) {
    const registration = this.require(id);
    if ('id' in patch && patch.id !== id) {
      throw new Error('Pixi input registration ids cannot be changed.');
    }

    if ('kind' in patch && patch.kind !== registration.kind) {
      throw new Error('Pixi input registration kinds cannot be changed.');
    }

    if (
      'displayObject' in patch &&
      patch.displayObject !== registration.displayObject
    ) {
      validateDisplayObject(patch.displayObject, id);
      this.removeFromDisplayObject(registration);
      registration.displayObject = patch.displayObject;
      this.addToDisplayObject(registration);
    }

    Object.assign(registration, patch, {
      id: registration.id,
      kind: registration.kind,
      priority: finiteOr(patch.priority, registration.priority),
      order: registration.order,
    });
    return registration;
  }

  unregister(id) {
    const registration = this.registrations.get(id);
    if (!registration) {
      return false;
    }

    this.registrations.delete(id);
    this.removeFromDisplayObject(registration);
    return true;
  }

  get(id) {
    return this.registrations.get(id) ?? null;
  }

  require(id) {
    const registration = this.get(id);
    if (!registration) {
      throw new Error(`Unknown Pixi input registration "${id}".`);
    }

    return registration;
  }

  getCandidates(target, kind) {
    validateKind(kind);
    const candidates = [];
    let displayObject = target;
    let depth = 0;

    while (displayObject) {
      const registrations = this.byDisplayObject.get(displayObject);

      if (registrations) {
        for (const registration of registrations) {
          if (registration.kind === kind) {
            candidates.push({ registration, depth });
          }
        }
      }

      displayObject = displayObject.parent ?? null;
      depth += 1;
    }

    return candidates.sort(compareCandidates);
  }

  getRegistrations(kind = null) {
    if (kind !== null) {
      validateKind(kind);
    }

    return [...this.registrations.values()]
      .filter((registration) => kind === null || registration.kind === kind)
      .sort((left, right) => left.order - right.order);
  }

  getDisplayObjectRegistrations(displayObject) {
    return [...(this.byDisplayObject.get(displayObject) ?? [])];
  }

  clear() {
    const count = this.registrations.size;
    this.registrations.clear();
    this.byDisplayObject = new WeakMap();
    return count;
  }

  addToDisplayObject(registration) {
    let registrations = this.byDisplayObject.get(registration.displayObject);
    if (!registrations) {
      registrations = new Set();
      this.byDisplayObject.set(registration.displayObject, registrations);
    }

    registrations.add(registration);
  }

  removeFromDisplayObject(registration) {
    const registrations = this.byDisplayObject.get(registration.displayObject);
    registrations?.delete(registration);

    if (registrations?.size === 0) {
      this.byDisplayObject.delete(registration.displayObject);
    }
  }
}

export function isInputRegistrationAvailable(registration) {
  if (!registration) {
    return false;
  }

  const displayObject = registration.displayObject;
  if (
    displayObject?.destroyed ||
    resolveBoolean(registration.enabled, true) === false ||
    resolveBoolean(registration.visible, true) === false
  ) {
    return false;
  }

  let ancestor = displayObject;
  while (ancestor) {
    if (
      ancestor.visible === false ||
      ancestor.renderable === false ||
      ancestor.eventMode === 'none'
    ) {
      return false;
    }

    ancestor = ancestor.parent ?? null;
  }

  return true;
}

export function resolveRegistrationBoolean(value, fallback = false) {
  return resolveBoolean(value, fallback);
}

function compareCandidates(left, right) {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }

  if (left.registration.priority !== right.registration.priority) {
    return right.registration.priority - left.registration.priority;
  }

  return left.registration.order - right.registration.order;
}

function resolveBoolean(value, fallback) {
  if (typeof value === 'function') {
    return Boolean(value());
  }

  return value === undefined ? fallback : Boolean(value);
}

function validateKind(kind) {
  if (!REGISTRATION_KIND_SET.has(kind)) {
    throw new Error(`Unsupported Pixi input registration kind "${kind}".`);
  }
}

function validateId(id) {
  const normalizedId = String(id ?? '').trim();
  if (!normalizedId) {
    throw new Error('Pixi input registrations require a stable id.');
  }

  return normalizedId;
}

function validateDisplayObject(displayObject, id) {
  if (
    !displayObject ||
    (typeof displayObject !== 'object' && typeof displayObject !== 'function')
  ) {
    throw new TypeError(
      `Pixi input registration "${id}" requires a display object.`,
    );
  }

  return displayObject;
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
