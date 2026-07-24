const TOP_EDGE_DRAG_RESISTANCE = 0.66;
const BOTTOM_EDGE_DRAG_RESISTANCE = 0.38;
const TOP_MAX_EDGE_OVERSCROLL = 220;
const BOTTOM_MAX_EDGE_OVERSCROLL = 118;
const MAX_RELEASE_VELOCITY = 2600;
const MIN_INERTIA_VELOCITY = 10;
const INERTIA_DAMPING = 4.8;
const TOP_EDGE_SPRING_STIFFNESS = 26;
const TOP_EDGE_SPRING_DAMPING = 9;
const BOTTOM_EDGE_SPRING_STIFFNESS = 96;
const BOTTOM_EDGE_SPRING_DAMPING = 15;
const MAX_DELTA_SECONDS = 0.05;
const SETTLE_DISTANCE = 0.35;
const SETTLE_VELOCITY = 6;
const VELOCITY_SAMPLE_BLEND = 0.68;

export const ROOT_RUN_SCROLL_SOURCE_WIDTH = 1080;
export const IDLE_WIZARD_SCROLL_SOURCE_WIDTH = 390;
export const ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE =
  IDLE_WIZARD_SCROLL_SOURCE_WIDTH / ROOT_RUN_SCROLL_SOURCE_WIDTH;
export const ROOT_RUN_STATION_TOP_MAX_OVERSCROLL = TOP_MAX_EDGE_OVERSCROLL;
export const ROOT_RUN_STATION_BOTTOM_MAX_OVERSCROLL = BOTTOM_MAX_EDGE_OVERSCROLL;

/**
 * Root Run's shared shop/station scrolling model, kept in its authored 1080px
 * coordinate system so its resistance, inertia, and edge limits remain exact.
 */
export class StationScrollPhysics {
  constructor(options = {}) {
    this.topEdgeSpringStiffness = requirePositivePhysicsValue(
      options.topEdgeSpringStiffness ?? TOP_EDGE_SPRING_STIFFNESS,
      'topEdgeSpringStiffness',
    );
    this.topEdgeSpringDamping = requirePositivePhysicsValue(
      options.topEdgeSpringDamping ?? TOP_EDGE_SPRING_DAMPING,
      'topEdgeSpringDamping',
    );
    this.bottomEdgeSpringStiffness = requirePositivePhysicsValue(
      options.bottomEdgeSpringStiffness ?? BOTTOM_EDGE_SPRING_STIFFNESS,
      'bottomEdgeSpringStiffness',
    );
    this.bottomEdgeSpringDamping = requirePositivePhysicsValue(
      options.bottomEdgeSpringDamping ?? BOTTOM_EDGE_SPRING_DAMPING,
      'bottomEdgeSpringDamping',
    );
    this.progressiveEdgeResistance = options.progressiveEdgeResistance ?? false;
    this.maxOffset = 0;
    this.velocity = 0;
    this.dragging = false;
    this.dragStartPointerY = 0;
    this.dragStartOffset = 0;
    this.lastSampleOffset = 0;
    this.lastSampleTimeMs = 0;
    this.maxDragDistance = 0;
    this.offset = 0;
  }

  get isDragging() {
    return this.dragging;
  }

  get dragDistance() {
    return this.maxDragDistance;
  }

  setMaxOffset(maxOffset) {
    this.maxOffset = Math.max(0, maxOffset);
    this.snapTo(this.offset);
  }

  snapTo(offset) {
    this.offset = clamp(offset, 0, this.maxOffset);
    this.velocity = 0;
  }

  scrollBy(delta) {
    this.dragging = false;
    this.snapTo(this.offset + delta);
  }

  scrollByElastic(delta) {
    this.dragging = false;
    this.velocity = 0;
    this.offset = this.applyEdgeResistance(this.offset + delta);
  }

  beginDrag(pointerY, nowMs) {
    this.dragging = true;
    this.velocity = 0;
    this.dragStartPointerY = pointerY;
    this.dragStartOffset = this.offset;
    this.lastSampleOffset = this.offset;
    this.lastSampleTimeMs = nowMs;
    this.maxDragDistance = 0;
  }

  dragTo(pointerY, nowMs) {
    if (!this.dragging) {
      return;
    }

    const dragDelta = pointerY - this.dragStartPointerY;
    this.maxDragDistance = Math.max(this.maxDragDistance, Math.abs(dragDelta));
    const nextOffset = this.applyEdgeResistance(this.dragStartOffset - dragDelta);
    const elapsedMs = nowMs - this.lastSampleTimeMs;

    if (elapsedMs > 0) {
      const sampleVelocity = (nextOffset - this.lastSampleOffset) / (elapsedMs / 1000);
      this.velocity = clamp(
        this.velocity * (1 - VELOCITY_SAMPLE_BLEND) +
          sampleVelocity * VELOCITY_SAMPLE_BLEND,
        -MAX_RELEASE_VELOCITY,
        MAX_RELEASE_VELOCITY,
      );
      this.lastSampleOffset = nextOffset;
      this.lastSampleTimeMs = nowMs;
    }

    this.offset = nextOffset;
  }

  endDrag() {
    this.dragging = false;
    this.velocity = clamp(this.velocity, -MAX_RELEASE_VELOCITY, MAX_RELEASE_VELOCITY);
    if (Math.abs(this.velocity) < MIN_INERTIA_VELOCITY) {
      this.velocity = 0;
    }
  }

  update(deltaSeconds) {
    if (this.dragging) {
      return false;
    }

    const dt = Math.min(Math.max(0, deltaSeconds), MAX_DELTA_SECONDS);
    if (dt <= 0) {
      return false;
    }

    const previousOffset = this.offset;
    const edgeTarget = this.edgeTarget();

    if (edgeTarget !== null) {
      const wasAboveTop = this.offset < 0;
      const wasBelowBottom = this.offset > this.maxOffset;
      const springStiffness = wasAboveTop
        ? this.topEdgeSpringStiffness
        : this.bottomEdgeSpringStiffness;
      const springDamping = wasAboveTop
        ? this.topEdgeSpringDamping
        : this.bottomEdgeSpringDamping;
      this.velocity += (edgeTarget - this.offset) * springStiffness * dt;
      this.velocity *= Math.exp(-springDamping * dt);
      this.offset += this.velocity * dt;

      if (
        (wasAboveTop && this.offset > 0) ||
        (wasBelowBottom && this.offset < this.maxOffset) ||
        (Math.abs(this.offset - edgeTarget) <= SETTLE_DISTANCE &&
          Math.abs(this.velocity) <= SETTLE_VELOCITY)
      ) {
        this.offset = edgeTarget;
        this.velocity = 0;
      }
    } else if (Math.abs(this.velocity) > MIN_INERTIA_VELOCITY) {
      this.offset += this.velocity * dt;
      this.velocity *= Math.exp(-INERTIA_DAMPING * dt);
      this.constrainOverscroll();
    } else {
      this.velocity = 0;
    }

    return Math.abs(this.offset - previousOffset) > 0.001;
  }

  applyEdgeResistance(rawOffset) {
    if (rawOffset < 0) {
      return rubberBand(
        rawOffset,
        TOP_EDGE_DRAG_RESISTANCE,
        TOP_MAX_EDGE_OVERSCROLL,
        this.progressiveEdgeResistance,
      );
    }
    if (rawOffset > this.maxOffset) {
      return (
        this.maxOffset +
        rubberBand(
          rawOffset - this.maxOffset,
          BOTTOM_EDGE_DRAG_RESISTANCE,
          BOTTOM_MAX_EDGE_OVERSCROLL,
          this.progressiveEdgeResistance,
        )
      );
    }
    return rawOffset;
  }

  edgeTarget() {
    if (this.offset < 0) {
      return 0;
    }
    if (this.offset > this.maxOffset) {
      return this.maxOffset;
    }
    return null;
  }

  constrainOverscroll() {
    const minOffset = -TOP_MAX_EDGE_OVERSCROLL;
    const maxOffset = this.maxOffset + BOTTOM_MAX_EDGE_OVERSCROLL;

    if (this.offset < minOffset) {
      this.offset = minOffset;
      this.velocity = Math.max(0, this.velocity);
    } else if (this.offset > maxOffset) {
      this.offset = maxOffset;
      this.velocity = Math.min(0, this.velocity);
    }
  }
}

function rubberBand(distance, resistance, maxOverscroll, progressiveResistance) {
  if (!progressiveResistance) {
    return clamp(distance * resistance, -maxOverscroll, maxOverscroll);
  }

  const direction = Math.sign(distance);
  const resistedDistance = Math.abs(distance) * resistance;
  return (
    (direction * maxOverscroll * resistedDistance) /
    (maxOverscroll + resistedDistance)
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function requirePositivePhysicsValue(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Scroll physics ${name} must be positive, got ${value}.`);
  }
  return value;
}
