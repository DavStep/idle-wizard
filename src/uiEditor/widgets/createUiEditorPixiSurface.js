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
    (asset) => asset.id === 'atlas:game' || assetFilter(asset),
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

    outline
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .fill({ color: 0x4c91ff, alpha: 0.1 })
      .stroke({ color: 0x090b10, width: 4 })
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({ color: 0x4c91ff, width: 2 });
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
  viewport = UI_EDITOR_PIXI_VIEWPORTS.FLUID,
} = {}) {
  const host = document.createElement('section');
  const canvas = document.createElement('canvas');
  const cleanups = [];

  host.className = 'ui-editor-game-widget-preview';
  host.dataset.previewViewport = viewport;
  host.dataset.uiEditorComponent = component;
  canvas.className = 'ui-editor-game-widget-preview__canvas';
  canvas.setAttribute('aria-label', `${component} interactive preview`);

  if (viewport !== UI_EDITOR_PIXI_VIEWPORTS.GAME_SCREEN) {
    host.append(canvas);
    return {
      canvas,
      dispose() {},
      host,
      resizeTarget: host,
    };
  }

  const frame = document.createElement('div');
  const panZoom = createPanZoomViewport(
    `${component} authored screen`,
    { panEnabled: false },
  );
  const controls = createViewportZoomControls(
    'Dialog preview',
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
  pan.setAttribute('aria-label', 'Toggle dialog preview panning');
  pan.setAttribute('aria-pressed', 'false');
  divider.className = 'ui-editor-game-screen-preview__divider';
  divider.setAttribute('aria-hidden', 'true');
  zoomGroup.className = 'ui-editor-game-screen-preview__zoom';
  zoomGroup.setAttribute('role', 'group');
  zoomGroup.setAttribute('aria-label', 'Dialog preview zoom');
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
