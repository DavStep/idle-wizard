export function resolveInputPoint(event) {
  const nativeEvent = event?.nativeEvent ?? event?.originalEvent ?? null;
  const globalX = finiteFirst(event?.global?.x, event?.x, nativeEvent?.offsetX, 0);
  const globalY = finiteFirst(event?.global?.y, event?.y, nativeEvent?.offsetY, 0);
  const screenX = finiteFirst(
    event?.clientX,
    nativeEvent?.clientX,
    event?.screen?.x,
    globalX,
  );
  const screenY = finiteFirst(
    event?.clientY,
    nativeEvent?.clientY,
    event?.screen?.y,
    globalY,
  );

  return Object.freeze({
    global: Object.freeze({ x: globalX, y: globalY }),
    screen: Object.freeze({ x: screenX, y: screenY }),
  });
}

export function inputDelta(start, current) {
  return Object.freeze({
    x: current.x - start.x,
    y: current.y - start.y,
  });
}

export function pointDistance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export function pointCenter(left, right) {
  return Object.freeze({
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  });
}

export function pointInDisplayObject(
  displayObject,
  point,
  slop = 0,
  explicitHitTest = null,
) {
  if (typeof explicitHitTest === 'function') {
    return Boolean(explicitHitTest(point));
  }

  const bounds = displayObject?.getBounds?.();
  if (!bounds) {
    return false;
  }

  const normalized = normalizeBounds(bounds);
  if (!normalized) {
    return false;
  }

  return (
    point.x >= normalized.x - slop &&
    point.x <= normalized.x + normalized.width + slop &&
    point.y >= normalized.y - slop &&
    point.y <= normalized.y + normalized.height + slop
  );
}

export function isDisplayObjectDescendant(displayObject, ancestor) {
  let current = displayObject;

  while (current) {
    if (current === ancestor) {
      return true;
    }

    current = current.parent ?? null;
  }

  return false;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function preventInputDefault(event, { stop = true, immediate = false } = {}) {
  if (event?.cancelable !== false) {
    event?.preventDefault?.();
  }

  if (stop) {
    event?.stopPropagation?.();
  }

  if (immediate) {
    event?.stopImmediatePropagation?.();
  }
}

function normalizeBounds(bounds) {
  const x = finiteFirstOrUndefined(bounds.x, bounds.minX);
  const y = finiteFirstOrUndefined(bounds.y, bounds.minY);
  const width = finiteFirstOrUndefined(
    bounds.width,
    Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minX)
      ? bounds.maxX - bounds.minX
      : undefined,
  );
  const height = finiteFirstOrUndefined(
    bounds.height,
    Number.isFinite(bounds.maxY) && Number.isFinite(bounds.minY)
      ? bounds.maxY - bounds.minY
      : undefined,
  );

  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }

  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

function finiteFirst(...values) {
  return finiteFirstOrUndefined(...values) ?? 0;
}

function finiteFirstOrUndefined(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return undefined;
}
