export const TUTORIAL_PIXI_GEOMETRY = Object.freeze({
  sourceWidth: 360,
  sourceHeight: 2170 / 3,
  backdropOpacity: 0.58,
  highlightPadding: 3,
  hintGap: 8,
  panelContentWidth: 190,
  panelOuterWidth: 214,
  panelDefaultContentHeight: 74,
  panelDefaultOuterHeight: 95,
  panelMinContentHeight: 34,
  panelMaxContentHeight: 126,
  introContentWidth: 260,
  introMinContentHeight: 96,
  introMaxContentHeight: 230,
  guideLeft: 4,
  guideWidth: 70,
  guideHeight: 91,
  objectiveLeft: 74,
  objectiveTop: 520,
  objectiveFallbackTops: Object.freeze([260, 166]),
  pointerWidth: 44,
  pointerHeight: 23,
  pointerShellWidth: 76,
  pointerShellHeight: 90,
  pointerVisualWidth: 44,
  pointerVisualHeight: 64,
  pointerPadding: 2,
  typewriterIntervalMs: 12,
  typewriterCharsPerTick: 2,
  lessonHideMs: 260,
  pointerHideMs: 180,
  targetEmphasisMs: 560,
  guideAutoMoveMs: 225,
});

const POINTER_HALF_EXTENT = Math.ceil(
  (TUTORIAL_PIXI_GEOMETRY.pointerWidth +
    TUTORIAL_PIXI_GEOMETRY.pointerHeight) *
    Math.SQRT1_2 *
    0.5,
);

export function resolveSemanticTutorialTarget(registry, targetId) {
  const id = String(targetId ?? '').trim();
  if (!id || !registry) {
    return null;
  }
  const definition =
    registry.get?.(id) ??
    registry.getTutorialTarget?.(id, { availableOnly: true }) ??
    null;
  if (!definition) {
    return null;
  }
  try {
    if (registry.resolve && definition.semanticId) {
      return registry.resolve(definition.semanticId);
    }
    return definition;
  } catch {
    return null;
  }
}

export function projectSemanticBoundsToSource(bounds, projection = {}) {
  if (!bounds) {
    return null;
  }
  const sourceScale = Math.max(
    0.0001,
    Number(projection.sourceScale) || 3,
  );
  const authoredOffsetX = Number(projection.authoredOffsetX) || 0;
  const x = (Number(bounds.x) - authoredOffsetX) / sourceScale;
  const y = Number(bounds.y) / sourceScale;
  const width = Number(bounds.width) / sourceScale;
  const height = Number(bounds.height) / sourceScale;
  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }
  return Object.freeze({
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  });
}

export function normalizeSourceRect(rect) {
  if (!rect) {
    return null;
  }
  const x = finite(rect.x, rect.left);
  const y = finite(rect.y, rect.top);
  const width = finite(
    rect.width,
    Number(rect.right) - Number(rect.left),
  );
  const height = finite(
    rect.height,
    Number(rect.bottom) - Number(rect.top),
  );
  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  };
}

export function padSourceRect(
  rect,
  padding = TUTORIAL_PIXI_GEOMETRY.highlightPadding,
  bounds = null,
) {
  const source = normalizeSourceRect(rect);
  if (!source) {
    return null;
  }
  const safePadding = Math.max(0, Number(padding) || 0);
  const left = Math.max(
    bounds?.left ?? 0,
    source.left - safePadding,
  );
  const top = Math.max(bounds?.top ?? 0, source.top - safePadding);
  const right = Math.min(
    bounds?.right ?? Number.POSITIVE_INFINITY,
    source.right + safePadding,
  );
  const bottom = Math.min(
    bounds?.bottom ?? Number.POSITIVE_INFINITY,
    source.bottom + safePadding,
  );
  return normalizeSourceRect({
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  });
}

export function resolveTutorialPointerPlacement({
  targetRect,
  bounds,
  protectedRects = [],
} = {}) {
  const rect = normalizeSourceRect(targetRect);
  const area = normalizeSourceRect(bounds);
  if (!rect || !area) {
    return null;
  }
  const candidates = [
    ...createPointerCandidates(rect, 0).map((candidate) => ({
      ...candidate,
      gapPenalty: 0,
    })),
    ...createPointerCandidates(rect, 12).map((candidate) => ({
      ...candidate,
      gapPenalty: 25,
    })),
  ].map((candidate, index) => {
    const pointerRect = {
      left: candidate.x - POINTER_HALF_EXTENT,
      top: candidate.y - POINTER_HALF_EXTENT,
      right: candidate.x + POINTER_HALF_EXTENT,
      bottom: candidate.y + POINTER_HALF_EXTENT,
    };
    const overflow = getOverflowAmount(pointerRect, area);
    const protectedOverlap = protectedRects
      .map(normalizeSourceRect)
      .filter(Boolean)
      .reduce(
        (total, protectedRect) =>
          total + getOverlapArea(pointerRect, protectedRect),
        0,
      );
    return {
      ...candidate,
      index,
      score:
        overflow * 10000 +
        protectedOverlap * 100 +
        candidate.gapPenalty -
        getPointerSideSpace(candidate.id, rect, area),
    };
  });
  const best = candidates.sort(
    (left, right) => left.score - right.score || left.index - right.index,
  )[0];
  return Object.freeze({
    id: best.id,
    x: clamp(
      Math.round(best.x),
      area.left + 8 + POINTER_HALF_EXTENT,
      area.right - 8 - POINTER_HALF_EXTENT,
    ),
    y: clamp(
      Math.round(best.y),
      area.top + 8 + POINTER_HALF_EXTENT,
      area.bottom - 8 - POINTER_HALF_EXTENT,
    ),
  });
}

export function resolveTutorialObjectivePlacement({
  bounds,
  outerWidth = TUTORIAL_PIXI_GEOMETRY.panelOuterWidth,
  outerHeight = TUTORIAL_PIXI_GEOMETRY.panelDefaultOuterHeight,
  panelOpen = true,
  manualPlacement = null,
  avoidRects = [],
  variant = null,
} = {}) {
  const area = normalizeSourceRect(bounds) ?? normalizeSourceRect({
    x: 0,
    y: 0,
    width: TUTORIAL_PIXI_GEOMETRY.sourceWidth,
    height: TUTORIAL_PIXI_GEOMETRY.sourceHeight,
  });
  if (variant === 'intro-dialog') {
    const left = Math.round((area.width - outerWidth) / 2);
    return Object.freeze({
      objectiveLeft: clamp(
        left,
        8,
        area.width - outerWidth - 8,
      ),
      objectiveTop: clamp(
        Math.round(area.height * 0.28),
        8,
        area.height - outerHeight - 8,
      ),
      buttonLeft: TUTORIAL_PIXI_GEOMETRY.guideLeft,
      buttonTop: TUTORIAL_PIXI_GEOMETRY.objectiveTop,
    });
  }
  if (manualPlacement) {
    return clampManualPlacement({
      manualPlacement,
      area,
      outerWidth,
      outerHeight,
      panelOpen,
    });
  }
  const tops = [
    TUTORIAL_PIXI_GEOMETRY.objectiveTop,
    ...TUTORIAL_PIXI_GEOMETRY.objectiveFallbackTops,
    ...avoidRects.flatMap((rect) => {
      const normalized = normalizeSourceRect(rect);
      return normalized
        ? [
            normalized.top - outerHeight - 16,
            normalized.bottom + 16,
          ]
        : [];
    }),
  ];
  const candidates = tops.map((top, index) => {
    const objectiveLeft = clamp(
      TUTORIAL_PIXI_GEOMETRY.objectiveLeft,
      8,
      area.width - outerWidth - 8,
    );
    const objectiveTop = clamp(
      Math.round(top),
      8,
      area.height - outerHeight - 8,
    );
    const buttonLeft = TUTORIAL_PIXI_GEOMETRY.guideLeft;
    const buttonTop = clamp(
      objectiveTop +
        outerHeight -
        TUTORIAL_PIXI_GEOMETRY.guideHeight +
        9,
      8,
      area.height - TUTORIAL_PIXI_GEOMETRY.guideHeight - 8,
    );
    const objectiveRect = normalizeSourceRect({
      x: objectiveLeft,
      y: objectiveTop,
      width: outerWidth,
      height: outerHeight,
    });
    const buttonRect = normalizeSourceRect({
      x: buttonLeft,
      y: buttonTop,
      width: TUTORIAL_PIXI_GEOMETRY.guideWidth,
      height: TUTORIAL_PIXI_GEOMETRY.guideHeight,
    });
    const overlap = avoidRects
      .map(normalizeSourceRect)
      .filter(Boolean)
      .reduce(
        (total, rect) =>
          total +
          getOverlapArea(objectiveRect, rect) +
          getOverlapArea(buttonRect, rect),
        0,
      );
    return {
      objectiveLeft,
      objectiveTop,
      buttonLeft,
      buttonTop,
      score: overlap * 10000 + index * 100,
      index,
    };
  });
  const best = candidates.sort(
    (left, right) => left.score - right.score || left.index - right.index,
  )[0];
  return Object.freeze({
    objectiveLeft: best.objectiveLeft,
    objectiveTop: best.objectiveTop,
    buttonLeft: best.buttonLeft,
    buttonTop: best.buttonTop,
  });
}

function clampManualPlacement({
  manualPlacement,
  area,
  outerWidth,
  outerHeight,
  panelOpen,
}) {
  const buttonLeft = clamp(
    panelOpen
      ? TUTORIAL_PIXI_GEOMETRY.guideLeft
      : finite(
          manualPlacement.buttonLeft,
          TUTORIAL_PIXI_GEOMETRY.guideLeft,
        ),
    -32,
    area.width - TUTORIAL_PIXI_GEOMETRY.guideWidth - 8,
  );
  const buttonTop = clamp(
    finite(
      manualPlacement.buttonTop,
      TUTORIAL_PIXI_GEOMETRY.objectiveTop,
    ),
    8,
    area.height - TUTORIAL_PIXI_GEOMETRY.guideHeight - 8,
  );
  const pairedTop =
    buttonTop +
    TUTORIAL_PIXI_GEOMETRY.guideHeight -
    9 -
    outerHeight;
  return Object.freeze({
    objectiveLeft: clamp(
      panelOpen
        ? TUTORIAL_PIXI_GEOMETRY.objectiveLeft
        : buttonLeft + TUTORIAL_PIXI_GEOMETRY.guideWidth,
      8,
      area.width - outerWidth - 8,
    ),
    objectiveTop: clamp(
      pairedTop,
      8,
      area.height - outerHeight - 8,
    ),
    buttonLeft,
    buttonTop,
  });
}

function createPointerCandidates(rect, targetGap) {
  const diagonalOffset =
    (TUTORIAL_PIXI_GEOMETRY.pointerWidth / 2 + targetGap) *
    Math.SQRT1_2;
  return [
    {
      id: 'top-left',
      x: rect.left - diagonalOffset,
      y: rect.top - diagonalOffset,
    },
    {
      id: 'top-right',
      x: rect.right + diagonalOffset,
      y: rect.top - diagonalOffset,
    },
    {
      id: 'bottom-left',
      x: rect.left - diagonalOffset,
      y: rect.bottom + diagonalOffset,
    },
    {
      id: 'bottom-right',
      x: rect.right + diagonalOffset,
      y: rect.bottom + diagonalOffset,
    },
  ];
}

function getPointerSideSpace(id, rect, bounds) {
  const horizontal = id.endsWith('left')
    ? rect.left - bounds.left
    : bounds.right - rect.right;
  const vertical = id.startsWith('top')
    ? rect.top - bounds.top
    : bounds.bottom - rect.bottom;
  return Math.max(0, horizontal) + Math.max(0, vertical);
}

function getOverflowAmount(rect, bounds) {
  return (
    Math.max(0, bounds.left - rect.left) +
    Math.max(0, bounds.top - rect.top) +
    Math.max(0, rect.right - bounds.right) +
    Math.max(0, rect.bottom - bounds.bottom)
  );
}

export function getOverlapArea(leftRect, rightRect) {
  const left = normalizeSourceRect(leftRect);
  const right = normalizeSourceRect(rightRect);
  if (!left || !right) {
    return 0;
  }
  const width = Math.max(
    0,
    Math.min(left.right, right.right) -
      Math.max(left.left, right.left),
  );
  const height = Math.max(
    0,
    Math.min(left.bottom, right.bottom) -
      Math.max(left.top, right.top),
  );
  return width * height;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number(fallback);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
