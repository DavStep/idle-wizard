import { Container, Graphics } from 'pixi.js';

import { gameAssetAtlasFrames } from '../../assets/generated/game-asset-atlas.generated.js';
import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import { PixiAssetManager } from '../../rendering/pixi/assets/PixiAssetManager.js';
import { PixiInputRouter } from '../../rendering/pixi/input/PixiInputRouter.js';
import { PixiApplicationManager } from '../../rendering/pixi/runtime/PixiApplicationManager.js';
import {
  createPanZoomViewport,
  createViewportZoomControls,
} from './UiEditorAssetWorkbench.js';

export const UI_EDITOR_PIXI_VIEWPORTS = Object.freeze({
  FLUID: 'fluid',
  GAME_SCREEN: 'game-screen',
});

const UI_EDITOR_FONT_OPTIONS = Object.freeze([
  {
    label: 'Project · Lilita One',
    value: '"Lilita One", "Arial Black", Arial, sans-serif',
  },
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Arial Black', value: '"Arial Black", Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
]);
const UI_EDITOR_ANCHOR_PRESETS = Object.freeze([
  { label: 'Top left', shortLabel: '↖', value: 'top-left', x: 0, y: 0 },
  { label: 'Top', shortLabel: '↑', value: 'top', x: 0.5, y: 0 },
  { label: 'Top right', shortLabel: '↗', value: 'top-right', x: 1, y: 0 },
  { label: 'Left', shortLabel: '←', value: 'left', x: 0, y: 0.5 },
  { label: 'Center', shortLabel: '•', value: 'center', x: 0.5, y: 0.5 },
  { label: 'Right', shortLabel: '→', value: 'right', x: 1, y: 0.5 },
  { label: 'Bottom left', shortLabel: '↙', value: 'bottom-left', x: 0, y: 1 },
  { label: 'Bottom', shortLabel: '↓', value: 'bottom', x: 0.5, y: 1 },
  { label: 'Bottom right', shortLabel: '↘', value: 'bottom-right', x: 1, y: 1 },
]);

/**
 * Mounts a production Pixi control inside an editor-owned canvas.
 */
export async function createUiEditorPixiSurface({
  assetFilter = () => false,
  component = 'PixiIntegration',
  createControl,
  layout = 'center',
  viewport = UI_EDITOR_PIXI_VIEWPORTS.FLUID,
} = {}) {
  if (typeof createControl !== 'function') {
    throw new Error('Pixi UI Lab surfaces require createControl.');
  }

  const shell = createUiEditorPixiSurfaceShell({ component, viewport });
  const { canvas, host } = shell;

  const manifest = PIXI_PRODUCTION_ASSET_MANIFEST.filter(
    (asset) => asset.id.startsWith('atlas:') || assetFilter(asset),
  );
  const assets = new PixiAssetManager({
    atlasFrames: gameAssetAtlasFrames,
    manifest,
  });
  const applicationManager = new PixiApplicationManager({
    canvas,
    prepareSpineRuntime: async () => null,
  });
  const input = new PixiInputRouter();
  let resizeObserver = null;
  let unsubscribeProjection = null;
  let control = null;
  let disposed = false;

  await Promise.all([
    applicationManager.initialize(),
    assets.loadAll(),
  ]);

  if (disposed) {
    applicationManager.destroy();
    return {
      control: null,
      dispose() {},
      getAtomicComponents: () => [],
      preview: host,
    };
  }

  const application = applicationManager.getApplication();
  input.mount({ canvas, root: application.stage });
  control = await createControl({
    application,
    applicationManager,
    assets,
    input,
    projection: applicationManager.projection,
  });
  const root = resolveDisplayObject(control);
  if (!(root instanceof Container)) {
    throw new Error(`${component} did not return a Pixi Container.`);
  }
  applicationManager.layers.pageUi.addChild(root);
  layoutControl(root, control, applicationManager.projection, layout);
  unsubscribeProjection = applicationManager.subscribeProjection(
    (nextProjection) => layoutControl(root, control, nextProjection, layout),
  );
  const atomicComponents = Array.isArray(control?.atomicComponents)
    && control.atomicComponents.length > 0
    ? control.atomicComponents
    : createUiEditorPixiAtomicComponents(root);
  const selectionOverlay = createUiEditorPixiSelectionOverlay({ application });
  host.uiEditorSelectAtomicComponent = (component) => {
    if (component) {
      host.dataset.selectedAtomicComponent = String(component.id ?? '');
    } else {
      delete host.dataset.selectedAtomicComponent;
    }
    selectionOverlay.select(component);
  };

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => applicationManager.resizeNow());
    resizeObserver.observe(shell.resizeTarget);
  }

  return {
    control,
    getAtomicComponents: () => atomicComponents,
    preview: host,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      unsubscribeProjection?.();
      unsubscribeProjection = null;
      try {
        selectionOverlay.destroy();
        disposeUiEditorPixiControl({ control, input, root });
      } finally {
        shell.dispose();
        applicationManager.destroy();
        control = null;
      }
    },
  };
}

/**
 * Projects meaningful Pixi display objects into the editor's existing atomic
 * component contract. Compound controls stay whole and nine-slice quads stay
 * hidden, so the hierarchy describes authored UI instead of renderer details.
 */
export function createUiEditorPixiAtomicComponents(
  root,
  {
    componentOverrides = new Map(),
    includeHidden = true,
  } = {},
) {
  const components = [];

  const visit = (displayObject) => {
    if (!displayObject || displayObject.destroyed) {
      return;
    }
    if (
      !includeHidden
      && (displayObject.visible === false || displayObject.renderable === false)
    ) {
      return;
    }

    const componentOverride = componentOverrides.get(displayObject);
    if (componentOverride) {
      components.push(componentOverride);
      return;
    }

    const kind = resolveAtomicKind(displayObject);
    if (kind) {
      components.push(
        createDisplayObjectAtomicComponent(
          displayObject,
          kind,
          components.length,
        ),
      );
      return;
    }

    for (const child of displayObject.children ?? []) {
      visit(child);
    }
  };

  for (const child of root?.children ?? []) {
    visit(child);
  }
  return components;
}

/**
 * Describes one semantic production component, optionally with nested parts.
 * This keeps compound widgets intact in the hierarchy while still allowing
 * their authored children to be inspected and hidden independently.
 */
export function createUiEditorPixiHierarchyComponent({
  children = [],
  displayObjects = [],
  id,
  label,
  libraryEntryId = null,
  primary = null,
  textTarget = null,
  type = 'component',
}) {
  const objects = displayObjects.filter(Boolean);
  const positionTarget = primary ?? objects[0] ?? null;

  return Object.freeze({
    children,
    getFields: () => [
      createPositionField('x', 'X', positionTarget?.position?.x),
      createPositionField('y', 'Y', positionTarget?.position?.y),
      ...(textTarget
        ? [{
            id: 'text',
            label: 'Text',
            type: 'text',
            value: readDisplayObjectText(textTarget),
          }]
        : []),
    ],
    id,
    isVisible: () =>
      objects.some(
        (object) => object.visible !== false && object.renderable !== false,
      ),
    label,
    libraryEntryId,
    getSelectionDisplayObjects: () => objects,
    setVisible: (visible) => {
      const nextVisible = Boolean(visible);
      for (const object of objects) {
        object.visible = nextVisible;
        object.renderable = nextVisible;
      }
    },
    type,
    update: (fieldId, value) => {
      if ((fieldId === 'x' || fieldId === 'y') && positionTarget?.position) {
        const nextValue = Number(value);
        if (Number.isFinite(nextValue)) {
          positionTarget.position[fieldId] = nextValue;
        }
      } else if (fieldId === 'text' && textTarget) {
        writeDisplayObjectText(textTarget, value);
      }
    },
  });
}

/**
 * Creates the editor contract for a production Pixi text object. The editor
 * keeps layout overrides local to the mounted preview and never mutates source.
 */
export function createUiEditorPixiTextComponent({
  displayObject,
  id,
  label = 'Label',
  layoutBounds = null,
}) {
  const textTarget = resolveTextTarget(displayObject);
  const anchorTarget = textTarget?.textObject ?? displayObject;
  const initialPosition = {
    x: Number(displayObject?.position?.x) || 0,
    y: Number(displayObject?.position?.y) || 0,
  };
  const anchor = resolveAnchorPreset(
    anchorTarget?.anchor?.x,
    anchorTarget?.anchor?.y,
  );
  const state = {
    anchor: anchor.value,
    offsetX: 0,
    offsetY: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    positionMode: layoutBounds ? 'relative' : 'absolute',
  };

  if (layoutBounds) {
    const point = resolveAnchoredPoint(layoutBounds, state, anchor);
    state.offsetX = initialPosition.x - point.x;
    state.offsetY = initialPosition.y - point.y;
  }

  const getFields = () => {
    const currentAnchor = getAnchorPreset(state.anchor);
    const currentFont = String(
      textTarget?.fontFamily
      ?? textTarget?.textObject?.style?.fontFamily
      ?? '',
    );
    const fontOptions = [...UI_EDITOR_FONT_OPTIONS];
    if (
      currentFont
      && !fontOptions.some(({ value }) => value === currentFont)
    ) {
      fontOptions.unshift({ label: `Current · ${currentFont}`, value: currentFont });
    }
    const position = displayObject?.position ?? initialPosition;

    return [
      editorField('text', 'Text', 'text', readDisplayObjectText(textTarget), {
        group: 'Text',
      }),
      editorField('fontFamily', 'Font', 'select', currentFont, {
        group: 'Text',
        options: fontOptions,
      }),
      editorField('fontSize', 'Size', 'number', readTextMetric(textTarget, 'fontSize', 13), {
        group: 'Text',
        min: 4,
        step: 1,
      }),
      editorField('fontWeight', 'Weight', 'segmented', normalizeFontWeight(textTarget?.fontWeight), {
        group: 'Text',
        options: [
          { label: 'Regular', value: 'normal' },
          { label: 'Bold', value: 'bold' },
        ],
      }),
      editorField('lineHeight', 'Line height', 'number', readPositiveTextMetric(
        textTarget,
        'lineHeight',
        readTextMetric(textTarget, 'fontSize', 13),
      ), {
        group: 'Text',
        min: 4,
        step: 1,
      }),
      editorField('letterSpacing', 'Letter spacing', 'number', readTextMetric(
        textTarget,
        'letterSpacing',
        0,
      ), {
        group: 'Text',
        step: 0.5,
      }),
      editorField('align', 'Text align', 'segmented', normalizeTextAlign(textTarget?.align), {
        group: 'Text',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      }),
      editorField('wrapWidth', 'Wrap width', 'number', readTextMetric(textTarget, 'wrapWidth', 0), {
        group: 'Text',
        hint: '0 keeps the label on one line.',
        min: 0,
        step: 1,
      }),
      editorField('positionMode', 'Position', 'segmented', state.positionMode, {
        group: 'Transform',
        options: [
          { label: 'Relative', value: 'relative', disabled: !layoutBounds },
          { label: 'Absolute', value: 'absolute' },
        ],
      }),
      editorField(
        'x',
        state.positionMode === 'relative' ? 'Offset X' : 'X',
        'number',
        state.positionMode === 'relative' ? state.offsetX : position.x,
        { group: 'Transform', row: 'position', step: 1 },
      ),
      editorField(
        'y',
        state.positionMode === 'relative' ? 'Offset Y' : 'Y',
        'number',
        state.positionMode === 'relative' ? state.offsetY : position.y,
        { group: 'Transform', row: 'position', step: 1 },
      ),
      editorField('anchor', 'Anchor', 'segmented', currentAnchor.value, {
        group: 'Transform',
        options: UI_EDITOR_ANCHOR_PRESETS.map((preset) => ({
          label: preset.label,
          shortLabel: preset.shortLabel,
          value: preset.value,
        })),
        presentation: 'anchor-grid',
      }),
      editorField('paddingTop', 'Top', 'number', state.paddingTop, {
        disabled: state.positionMode !== 'relative',
        group: 'Anchor padding',
        min: 0,
        row: 'padding-a',
        step: 1,
      }),
      editorField('paddingRight', 'Right', 'number', state.paddingRight, {
        disabled: state.positionMode !== 'relative',
        group: 'Anchor padding',
        min: 0,
        row: 'padding-a',
        step: 1,
      }),
      editorField('paddingBottom', 'Bottom', 'number', state.paddingBottom, {
        disabled: state.positionMode !== 'relative',
        group: 'Anchor padding',
        min: 0,
        row: 'padding-b',
        step: 1,
      }),
      editorField('paddingLeft', 'Left', 'number', state.paddingLeft, {
        disabled: state.positionMode !== 'relative',
        group: 'Anchor padding',
        min: 0,
        row: 'padding-b',
        step: 1,
      }),
    ];
  };

  const applyRelativePosition = () => {
    if (!layoutBounds || !displayObject?.position) {
      return;
    }
    const point = resolveAnchoredPoint(
      layoutBounds,
      state,
      getAnchorPreset(state.anchor),
    );
    displayObject.position.set(
      point.x + state.offsetX,
      point.y + state.offsetY,
    );
  };

  return Object.freeze({
    getFields,
    getSelectionAnchorPoint: () =>
      displayObject?.getGlobalPosition?.() ?? null,
    getSelectionDisplayObjects: () => [displayObject],
    id,
    isVisible: () =>
      displayObject?.visible !== false && displayObject?.renderable !== false,
    label,
    setVisible: (visible) => {
      displayObject.visible = Boolean(visible);
      displayObject.renderable = Boolean(visible);
    },
    type: 'text',
    update: (fieldId, value) => {
      if (fieldId === 'text') {
        writeDisplayObjectText(textTarget, value);
      } else if (fieldId === 'fontFamily') {
        textTarget?.setFontFamily?.(String(value || ''));
      } else if (fieldId === 'fontSize') {
        textTarget?.setFontSize?.(finiteNumber(value, 13));
      } else if (fieldId === 'fontWeight') {
        textTarget?.setFontWeight?.(normalizeFontWeight(value));
      } else if (fieldId === 'lineHeight') {
        textTarget?.setLineHeight?.(finiteNumber(value, 13));
      } else if (fieldId === 'letterSpacing') {
        const nextValue = finiteNumber(value, 0);
        textTarget.letterSpacing = nextValue;
        if (textTarget?.textObject?.style) {
          textTarget.textObject.style.letterSpacing = nextValue;
        }
      } else if (fieldId === 'align') {
        textTarget?.setAlign?.(normalizeTextAlign(value));
      } else if (fieldId === 'wrapWidth') {
        textTarget?.setWrapWidth?.(Math.max(0, finiteNumber(value, 0)));
      } else if (fieldId === 'positionMode') {
        const nextMode = value === 'relative' && layoutBounds
          ? 'relative'
          : 'absolute';
        if (nextMode === state.positionMode) {
          return false;
        }
        if (nextMode === 'relative') {
          const point = resolveAnchoredPoint(
            layoutBounds,
            state,
            getAnchorPreset(state.anchor),
          );
          state.offsetX = displayObject.position.x - point.x;
          state.offsetY = displayObject.position.y - point.y;
        }
        state.positionMode = nextMode;
        return true;
      } else if (fieldId === 'x' || fieldId === 'y') {
        const nextValue = finiteNumber(value, 0);
        if (state.positionMode === 'relative') {
          state[fieldId === 'x' ? 'offsetX' : 'offsetY'] = nextValue;
          applyRelativePosition();
        } else if (displayObject?.position) {
          displayObject.position[fieldId] = nextValue;
        }
      } else if (fieldId === 'anchor') {
        const nextAnchor = getAnchorPreset(value);
        state.anchor = nextAnchor.value;
        textTarget?.setAnchor?.(nextAnchor.x, nextAnchor.y);
        applyRelativePosition();
        return true;
      } else if (fieldId in state && fieldId.startsWith('padding')) {
        state[fieldId] = Math.max(0, finiteNumber(value, 0));
        applyRelativePosition();
      }
      return false;
    },
  });
}

function resolveAtomicKind(displayObject) {
  if (
    displayObject.insetFrame
    && displayObject.textLabel
    && typeof displayObject.focus === 'function'
    && typeof displayObject.setValue === 'function'
  ) {
    return 'text-field';
  }
  if (
    displayObject.textLabel
    && typeof displayObject.setText === 'function'
    && typeof displayObject.setEnabled === 'function'
  ) {
    return 'button';
  }
  if (
    displayObject.textObject
    && typeof displayObject.setText === 'function'
  ) {
    return 'text';
  }
  if (
    Array.isArray(displayObject.sprites)
    && displayObject.sprites.length === 9
    && typeof displayObject.setSkin === 'function'
  ) {
    return 'image';
  }
  if (
    displayObject.texture
    && displayObject.anchor
    && typeof displayObject.anchor.set === 'function'
  ) {
    return 'image';
  }
  if (
    typeof displayObject.text === 'string'
    && displayObject.style
  ) {
    return 'text';
  }
  return null;
}

function createDisplayObjectAtomicComponent(displayObject, type, index) {
  const label = createAtomicLabel(displayObject, type);
  const id = `pixi:${index}:${slugifyAtomicId(displayObject.label ?? label)}`;

  if (type === 'text') {
    return createUiEditorPixiTextComponent({
      displayObject,
      id,
      label,
    });
  }

  return Object.freeze({
    getFields: () => [
      createPositionField('x', 'X', displayObject.position?.x),
      createPositionField('y', 'Y', displayObject.position?.y),
      ...(type === 'text' || type === 'button' || type === 'text-field'
        ? [{
            id: 'text',
            label: 'Text',
            type: 'text',
            value: readDisplayObjectText(displayObject),
          }]
        : []),
    ],
    id,
    isVisible: () =>
      displayObject.visible !== false && displayObject.renderable !== false,
    label,
    getSelectionDisplayObjects: () => [displayObject],
    setVisible: (visible) => {
      const nextVisible = Boolean(visible);
      displayObject.visible = nextVisible;
      displayObject.renderable = nextVisible;
    },
    type,
    update: (fieldId, value) => {
      if (fieldId === 'x' || fieldId === 'y') {
        const nextValue = Number(value);
        if (Number.isFinite(nextValue) && displayObject.position) {
          displayObject.position[fieldId] = nextValue;
        }
      } else if (fieldId === 'text') {
        writeDisplayObjectText(displayObject, value);
      }
    },
  });
}

export function createUiEditorPixiSelectionOverlay({ application }) {
  const outline = new Graphics();
  let selectedComponent = null;

  outline.label = 'uiEditor:selectionOutline';
  outline.eventMode = 'none';
  application.stage.addChild(outline);

  const render = () => {
    outline.clear();
    const bounds = collectSelectionBounds(
      selectedComponent?.getSelectionDisplayObjects?.(),
    );
    if (!bounds) {
      return;
    }

    const pixelScale = resolveUiEditorSelectionPixelScale(application);

    outline
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .fill({ color: 0x4c91ff, alpha: 0.1 })
      .stroke({ color: 0x090b10, width: 4 * pixelScale })
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({ color: 0x4c91ff, width: 2 * pixelScale });

    drawSelectionHandles(outline, bounds, pixelScale);
    const anchorPoint = selectedComponent?.getSelectionAnchorPoint?.();
    if (Number.isFinite(anchorPoint?.x) && Number.isFinite(anchorPoint?.y)) {
      outline
        .circle(anchorPoint.x, anchorPoint.y, 4 * pixelScale)
        .fill({ color: 0x171717 })
        .stroke({ color: 0x8eb8ff, width: 2 * pixelScale })
        .moveTo(anchorPoint.x - 7 * pixelScale, anchorPoint.y)
        .lineTo(anchorPoint.x + 7 * pixelScale, anchorPoint.y)
        .moveTo(anchorPoint.x, anchorPoint.y - 7 * pixelScale)
        .lineTo(anchorPoint.x, anchorPoint.y + 7 * pixelScale)
        .stroke({ color: 0x8eb8ff, width: pixelScale });
    }
  };

  application.ticker.add(render);

  return {
    destroy() {
      application.ticker.remove(render);
      outline.parent?.removeChild(outline);
      outline.destroy();
      selectedComponent = null;
    },
    select(component) {
      selectedComponent = component ?? null;
      render();
    },
  };
}

/**
 * Converts one visible editor pixel into Pixi stage units. The preview zoom is
 * a DOM transform outside Pixi, so drawing fixed stage-space handles would
 * make the editor chrome grow and shrink with the authored game world.
 */
export function resolveUiEditorSelectionPixelScale(application) {
  const canvas = application?.canvas ?? application?.renderer?.canvas;
  const rect = canvas?.getBoundingClientRect?.();
  const screen = application?.screen ?? application?.renderer?.screen;
  const widthScale = positiveRatio(screen?.width, rect?.width);
  const heightScale = positiveRatio(screen?.height, rect?.height);

  if (widthScale && heightScale) {
    return Math.max(widthScale, heightScale);
  }
  return widthScale || heightScale || 1;
}

function drawSelectionHandles(outline, bounds, pixelScale) {
  const size = 5 * pixelScale;
  const halfSize = size / 2;
  const points = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width / 2, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height / 2],
    [bounds.x + bounds.width, bounds.y + bounds.height / 2],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width / 2, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
  for (const [x, y] of points) {
    outline
      .rect(x - halfSize, y - halfSize, size, size)
      .fill({ color: 0xf2f6ff })
      .stroke({ color: 0x4c91ff, width: pixelScale });
  }
}

function positiveRatio(numerator, denominator) {
  const ratio = Number(numerator) / Number(denominator);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
}

function collectSelectionBounds(displayObjects) {
  const objects = (Array.isArray(displayObjects) ? displayObjects : [])
    .filter((displayObject) => displayObject && !displayObject.destroyed);
  if (objects.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const displayObject of objects) {
    const bounds = displayObject.getBounds?.();
    if (
      !bounds
      || !Number.isFinite(bounds.x)
      || !Number.isFinite(bounds.y)
      || !Number.isFinite(bounds.width)
      || !Number.isFinite(bounds.height)
    ) {
      continue;
    }
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return null;
  }

  return {
    height: Math.max(1, maxY - minY),
    width: Math.max(1, maxX - minX),
    x: minX,
    y: minY,
  };
}

function createAtomicLabel(displayObject, type) {
  const rawLabel = String(displayObject.label ?? '').split(':').at(-1);
  const fallback = type === 'button' ? 'Button' : type === 'text' ? 'Text' : 'Image';
  const normalized = humanizeAtomicLabel(rawLabel) || fallback;
  return type === 'button' && !/button$/i.test(normalized)
    ? `${normalized} button`
    : normalized;
}

function humanizeAtomicLabel(value) {
  const words = String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : '';
}

function slugifyAtomicId(value) {
  return String(value ?? 'component')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'component';
}

function editorField(id, label, type, value, options = {}) {
  return {
    id,
    label,
    type,
    value: type === 'number' ? roundEditorNumber(value) : value,
    ...options,
  };
}

function resolveTextTarget(displayObject) {
  if (
    displayObject?.textObject
    && typeof displayObject.setText === 'function'
  ) {
    return displayObject;
  }
  if (
    displayObject?.textLabel?.textObject
    && typeof displayObject.textLabel.setText === 'function'
  ) {
    return displayObject.textLabel;
  }
  return displayObject;
}

function readTextMetric(textTarget, key, fallback) {
  const rawValue = textTarget?.[key] ?? textTarget?.textObject?.style?.[key];
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return fallback;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function readPositiveTextMetric(textTarget, key, fallback) {
  const value = readTextMetric(textTarget, key, fallback);
  return value > 0 ? value : fallback;
}

function resolveAnchorPreset(x, y) {
  const anchorX = finiteNumber(x, 0.5);
  const anchorY = finiteNumber(y, 0.5);
  return UI_EDITOR_ANCHOR_PRESETS.reduce((closest, candidate) => {
    const distance = Math.abs(anchorX - candidate.x)
      + Math.abs(anchorY - candidate.y);
    return distance < closest.distance
      ? { ...candidate, distance }
      : closest;
  }, { ...UI_EDITOR_ANCHOR_PRESETS[4], distance: Infinity });
}

function getAnchorPreset(value) {
  return UI_EDITOR_ANCHOR_PRESETS.find(
    (preset) => preset.value === value,
  ) ?? UI_EDITOR_ANCHOR_PRESETS[4];
}

function resolveAnchoredPoint(bounds, padding, anchor) {
  const left = finiteNumber(bounds?.x, 0)
    + Math.max(0, finiteNumber(padding.paddingLeft, 0));
  const top = finiteNumber(bounds?.y, 0)
    + Math.max(0, finiteNumber(padding.paddingTop, 0));
  const right = finiteNumber(bounds?.x, 0)
    + Math.max(0, finiteNumber(bounds?.width, 0))
    - Math.max(0, finiteNumber(padding.paddingRight, 0));
  const bottom = finiteNumber(bounds?.y, 0)
    + Math.max(0, finiteNumber(bounds?.height, 0))
    - Math.max(0, finiteNumber(padding.paddingBottom, 0));
  const safeRight = Math.max(left, right);
  const safeBottom = Math.max(top, bottom);
  return {
    x: left + (safeRight - left) * anchor.x,
    y: top + (safeBottom - top) * anchor.y,
  };
}

function normalizeFontWeight(value) {
  return value === 'bold' || Number(value) >= 600 ? 'bold' : 'normal';
}

function normalizeTextAlign(value) {
  return ['left', 'center', 'right'].includes(value) ? value : 'left';
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundEditorNumber(value) {
  return Math.round(finiteNumber(value) * 1000) / 1000;
}

function createPositionField(id, label, value) {
  return {
    id,
    label,
    step: 1,
    type: 'number',
    value: Math.round((Number(value) || 0) * 1000) / 1000,
  };
}

function readDisplayObjectText(displayObject) {
  if (typeof displayObject.textLabel?.text === 'string') {
    return displayObject.textLabel.text;
  }
  return String(displayObject.text ?? '');
}

function writeDisplayObjectText(displayObject, value) {
  if (typeof displayObject.setText === 'function') {
    displayObject.setText(String(value ?? ''));
  } else if (typeof displayObject.setValue === 'function') {
    displayObject.setValue(String(value ?? ''));
  } else if ('text' in displayObject) {
    displayObject.text = String(value ?? '');
  }
}

export function createUiEditorPixiSurfaceShell({
  component = 'PixiIntegration',
  previewLabel = 'Dialog preview',
  viewport = UI_EDITOR_PIXI_VIEWPORTS.FLUID,
} = {}) {
  const host = document.createElement('section');
  const canvas = document.createElement('canvas');
  const cleanups = [];
  let authoredViewport = null;

  const setComponent = (nextComponent) => {
    const componentName = String(nextComponent || 'PixiIntegration');
    host.dataset.uiEditorComponent = componentName;
    canvas.setAttribute(
      'aria-label',
      `${componentName} interactive preview`,
    );
    authoredViewport?.setAttribute(
      'aria-label',
      `${componentName} authored screen. Drag or use arrow keys to move.`,
    );
  };

  host.className = 'ui-editor-game-widget-preview';
  host.dataset.previewViewport = viewport;
  canvas.className = 'ui-editor-game-widget-preview__canvas';
  setComponent(component);

  if (viewport !== UI_EDITOR_PIXI_VIEWPORTS.GAME_SCREEN) {
    host.append(canvas);
    return {
      canvas,
      dispose() {},
      host,
      resizeTarget: host,
      setComponent,
    };
  }

  const frame = document.createElement('div');
  const panZoom = createPanZoomViewport(
    `${component} authored screen`,
    { panEnabled: false },
  );
  authoredViewport = panZoom.root;
  const controls = createViewportZoomControls(
    previewLabel,
    [panZoom],
    {
      centerLabel: 'Center',
      fitLabel: null,
      showHint: false,
    },
  );
  const pan = document.createElement('button');
  const divider = document.createElement('span');
  const zoomGroup = document.createElement('span');
  const zoomParts = controls.root.querySelectorAll(
    '.ui-editor-pan-zoom-controls__button, '
      + '.ui-editor-pan-zoom-controls__status',
  );

  frame.className = 'ui-editor-game-screen-preview__frame';
  frame.dataset.uiEditorComponent = 'AuthoredGameScreen';
  panZoom.root.classList.add('ui-editor-game-screen-preview__viewport');
  controls.root.classList.add('ui-editor-game-screen-preview__toolbar');
  pan.className = 'ui-editor-game-screen-preview__pan';
  pan.type = 'button';
  pan.textContent = '↔ Pan';
  pan.setAttribute(
    'aria-label',
    `Toggle ${previewLabel.toLowerCase()} panning`,
  );
  pan.setAttribute('aria-pressed', 'false');
  divider.className = 'ui-editor-game-screen-preview__divider';
  divider.setAttribute('aria-hidden', 'true');
  zoomGroup.className = 'ui-editor-game-screen-preview__zoom';
  zoomGroup.setAttribute('role', 'group');
  zoomGroup.setAttribute('aria-label', `${previewLabel} zoom`);
  zoomGroup.append(...[...zoomParts].slice(0, 3));
  controls.root.prepend(pan, divider, zoomGroup);
  frame.append(canvas);
  panZoom.content.append(frame);
  host.append(panZoom.root, controls.root);

  const togglePan = () => {
    const enabled = pan.getAttribute('aria-pressed') !== 'true';
    pan.setAttribute('aria-pressed', String(enabled));
    panZoom.setPanEnabled(enabled);
  };
  pan.addEventListener('click', togglePan);
  cleanups.push(() => pan.removeEventListener('click', togglePan));
  cleanups.push(() => controls.dispose());
  cleanups.push(() => panZoom.dispose());

  return {
    canvas,
    dispose() {
      for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
      }
    },
    host,
    resizeTarget: frame,
    setComponent,
  };
}

export function disposeUiEditorPixiControl({ control, input, root }) {
  try {
    control?.destroy?.();
    if (!control?.destroy && !root.destroyed) {
      root.destroy({ children: true });
    }
  } finally {
    input.destroy();
  }
}

function resolveDisplayObject(control) {
  return control?.root ?? control?.displayObject ?? control;
}

function layoutControl(root, control, projection, layout) {
  if (layout === 'fill') {
    control?.layout?.(projection);
    return;
  }
  const bounds = root.getLocalBounds();
  const width = Number(control?.width) || bounds.width;
  const height = Number(control?.height) || bounds.height;
  const originX = Number.isFinite(bounds.x) ? bounds.x : 0;
  const originY = Number.isFinite(bounds.y) ? bounds.y : 0;
  root.position.set(
    (projection.sourceWidth - width) / 2 - originX,
    (projection.sourceHeight - height) / 2 - originY,
  );
}
