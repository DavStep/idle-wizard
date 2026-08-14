import { Application, Assets, Texture } from 'pixi.js';

import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
  PIXI_SOURCE_NINE_SLICE_METADATA,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import {
  RootRunHudAvatarButton,
  RootRunHudSquareIconButton,
} from '../../rendering/pixi/global/chrome/RootRunTopHudWidgets.js';
import { PixiInputRouter } from '../../rendering/pixi/input/PixiInputRouter.js';
import {
  validateNineSliceCompatibility,
} from '../../rendering/pixi/nineSlice/NineSliceCompatibility.js';
import {
  createPixiNineSliceSkin,
  getPixiNineSliceSkin,
} from '../../rendering/pixi/nineSlice/PixiNineSliceSkinRegistry.js';
import { PixiBaseButton } from '../../rendering/pixi/primitives/PixiBaseButton.js';
import { PixiTextButton } from '../../rendering/pixi/primitives/PixiTextButton.js';
import {
  getPixiButtonAssetId,
  getPixiButtonSkin,
  PIXI_BUTTON_COLORS,
  PIXI_BUTTON_SIZE_TIERS,
} from '../../rendering/pixi/primitives/PixiButtonStyle.js';
import { PixiCostButton } from '../../rendering/pixi/primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../rendering/pixi/primitives/PixiInfoButton.js';
import { PixiTabButton } from '../../rendering/pixi/primitives/PixiTabButton.js';
import { PixiApplicationManager } from '../../rendering/pixi/runtime/PixiApplicationManager.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../rendering/pixi/theme/PixiThemeTokens.js';
import {
  createUiEditorThumbnailRenderQueue,
} from './UiEditorThumbnailRenderQueue.js';
import {
  createUiEditorPixiSelectionOverlay,
  createUiEditorPixiSurfaceShell,
  createUiEditorPixiTextComponent,
  UI_EDITOR_PIXI_VIEWPORTS,
} from './createUiEditorPixiSurface.js';

const EDITOR_BACKGROUND_ASSET_IDS = Object.freeze([
  ...PIXI_BUTTON_COLORS.flatMap((color) =>
    PIXI_BUTTON_SIZE_TIERS.map((sizeTier) =>
      getPixiButtonAssetId(color, sizeTier),
    ),
  ),
  PIXI_ROOT_RUN_ASSETS.buttonGreen,
  PIXI_ROOT_RUN_ASSETS.buttonGray,
  PIXI_ROOT_RUN_ASSETS.buttonGreenStacked,
  PIXI_ROOT_RUN_ASSETS.buttonGrayStacked,
  PIXI_ROOT_RUN_ASSETS.buttonYellowShort,
  PIXI_ROOT_RUN_ASSETS.buttonBlueShort,
  PIXI_ROOT_RUN_ASSETS.buttonPurpleShort,
]);
const BUTTON_ASSET_IDS = new Set([
  ...EDITOR_BACKGROUND_ASSET_IDS,
  PIXI_ROOT_RUN_ASSETS.buttonBlueShort,
  PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
  PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
  PIXI_ROOT_RUN_ASSETS.buttonGray,
  PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonGrayStacked,
  PIXI_ROOT_RUN_ASSETS.buttonGreen,
  PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonGreenStacked,
  PIXI_ROOT_RUN_ASSETS.buttonPurpleShort,
  PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonYellow,
  PIXI_ROOT_RUN_ASSETS.buttonYellowShort,
  PIXI_ROOT_RUN_ASSETS.coin,
  PIXI_ROOT_RUN_ASSETS.info,
  PIXI_ROOT_RUN_ASSETS.notificationOrange,
  PIXI_ROOT_RUN_ASSETS.notificationRed,
  PIXI_ROOT_RUN_ASSETS.settingsGear,
  PIXI_ROOT_RUN_ASSETS.topHudAvatarFrame,
  PIXI_ROOT_RUN_ASSETS.topHudAvatarHead,
  PIXI_ROOT_RUN_ASSETS.topHudSettings,
  'source:assets/avatars/elara.png',
]);
const BUTTON_ASSET_MANIFEST = PIXI_PRODUCTION_ASSET_MANIFEST.filter(
  ({ id }) => BUTTON_ASSET_IDS.has(id),
);
const SOURCE_NINE_SLICE_METADATA_BY_ASSET_ID = new Map(
  PIXI_SOURCE_NINE_SLICE_METADATA.map(({ assetId, metadata }) => [
    assetId,
    metadata,
  ]),
);
const REGULAR_BUTTON_CONFIGURATION_BY_ASSET_ID = new Map(
  PIXI_BUTTON_COLORS.flatMap((color) =>
    PIXI_BUTTON_SIZE_TIERS.map((sizeTier) => [
      getPixiButtonAssetId(color, sizeTier),
      { color, sizeTier },
    ]),
  ),
);
const THUMBNAIL_RENDER_HEIGHT = 54;
const THUMBNAIL_RENDER_WIDTH = 212;
let sharedAssetManager = null;
let sharedThumbnailRendererPromise = null;
const thumbnailRenderQueue = createUiEditorThumbnailRenderQueue();

export { createUiEditorThumbnailRenderQueue };

export function createUiEditorPixiButtonThumbnail(definition) {
  const host = document.createElement('span');
  const canvas = document.createElement('canvas');
  const status = document.createElement('span');
  let observer = null;
  let renderGeneration = 0;

  host.className = 'ui-editor-game-widget-thumbnail';
  host.dataset.editorLibraryThumbnail = definition.id;
  canvas.className = 'ui-editor-game-widget-thumbnail__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  status.className = 'ui-editor-game-widget-thumbnail__status';
  status.setAttribute('aria-hidden', 'true');
  status.textContent = 'Loading…';
  host.append(canvas, status);

  const suspend = () => {
    renderGeneration += 1;
  };

  const render = async () => {
    if (
      host.dataset.ready === 'true' ||
      host.dataset.loading === 'true'
    ) {
      return;
    }

    const generation = ++renderGeneration;
    host.dataset.loading = 'true';
    delete host.dataset.error;
    status.textContent = 'Loading…';

    try {
      const rendered = await thumbnailRenderQueue.run(async () => {
        if (generation !== renderGeneration || !host.isConnected) {
          return false;
        }

        return renderButtonThumbnail({
          canvas,
          definition,
          host,
        });
      });

      if (
        !rendered ||
        generation !== renderGeneration ||
        !host.isConnected
      ) {
        return;
      }

      host.dataset.ready = 'true';
      status.textContent = '';
    } catch (error) {
      if (generation === renderGeneration) {
        host.dataset.error = 'true';
        status.textContent = 'Preview unavailable';
        globalThis.console?.error(error);
      }
    } finally {
      host.dataset.loading = 'false';
    }
  };

  host.uiEditorThumbnailConnect = () => {
    if (observer) {
      return;
    }

    if (typeof globalThis.IntersectionObserver !== 'function') {
      void render();
      return;
    }

    observer = new globalThis.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void render();
        } else {
          suspend();
        }
      },
      { rootMargin: '80px 0px' },
    );
    observer.observe(host);
  };

  host.uiEditorThumbnailDisconnect = () => {
    observer?.disconnect();
    observer = null;
    suspend();
  };

  return host;
}

export function createUiEditorPixiButtonPreview(definition) {
  const shell = createUiEditorPixiSurfaceShell({
    component: resolveEditorWidgetName(definition),
    previewLabel: 'Widget preview',
    viewport: UI_EDITOR_PIXI_VIEWPORTS.GAME_SCREEN,
  });
  const { canvas, host } = shell;
  const status = document.createElement('p');
  const feedback = document.createElement('p');
  let controller = null;
  let currentDefinition = definition;
  let editorState = createButtonEditorState(definition);
  let disposed = false;

  status.className = 'ui-editor-game-widget-preview__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading widget…';
  feedback.className = 'ui-editor-game-widget-preview__feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  feedback.textContent = 'Press the widget to test its feedback.';
  host.append(status, feedback);

  const feedbackTracker = createFeedbackTracker(feedback);
  const applyDefinition = (nextDefinition) => {
    currentDefinition = nextDefinition;
    editorState = createButtonEditorState(nextDefinition);
    controller?.setDefinition(
      applyButtonEditorState(nextDefinition, editorState),
    );
    feedbackTracker.reset();
    host.dataset.editorButtonWidget = nextDefinition.id;
    shell.setComponent(resolveEditorWidgetName(nextDefinition));
    host.setAttribute('aria-label', `${nextDefinition.label} preview`);
    canvas.dataset.uiEditorComponent = nextDefinition.label;
    canvas.setAttribute('aria-label', nextDefinition.label);
  };

  applyDefinition(definition);

  host.uiEditorButtonPreviewDefinition = definition;
  host.uiEditorGetAtomicComponents = () =>
    controller?.getAtomicComponents() ?? [];
  host.uiEditorGetInspectorComponent = () =>
    controller?.getInspectorComponent() ?? null;
  host.uiEditorSelectAtomicComponent = (component) => {
    if (component) {
      host.dataset.selectedAtomicComponent = String(component.id ?? '');
    } else {
      delete host.dataset.selectedAtomicComponent;
    }
    controller?.selectAtomicComponent(component);
  };
  host.uiEditorGetButtonEditorState = () => editorState;
  host.uiEditorAdoptPreview = (candidate) => {
    const nextDefinition = candidate?.uiEditorButtonPreviewDefinition;

    if (!nextDefinition || disposed) {
      return false;
    }

    try {
      applyDefinition(nextDefinition);
      host.uiEditorButtonPreviewDefinition = nextDefinition;
      candidate.uiEditorDispose?.();
      return true;
    } catch (error) {
      globalThis.console?.error(error);
      return false;
    }
  };

  host.uiEditorDispose = () => {
    disposed = true;
    controller?.destroy();
    controller = null;
    shell.dispose();
  };

  globalThis.queueMicrotask(async () => {
    if (disposed || !host.isConnected) {
      return;
    }

    try {
      const mountedDefinition = currentDefinition;
      controller = await mountButtonPreview({
        canvas,
        definition: applyButtonEditorState(mountedDefinition, editorState),
        feedbackTracker,
        getEditorState: () => editorState,
        host,
        resizeTarget: shell.resizeTarget,
        updateEditorState: (fieldId, value) => {
          editorState = updateButtonEditorState(editorState, fieldId, value);
        },
      });
      if (disposed) {
        controller.destroy();
        controller = null;
        return;
      }
      if (currentDefinition !== mountedDefinition) {
        controller.setDefinition(
          applyButtonEditorState(currentDefinition, editorState),
        );
      }
      status.remove();
      host.dispatchEvent(
        new globalThis.CustomEvent(
          'ui-editor-hierarchy-change',
          { bubbles: true },
        ),
      );
    } catch (error) {
      if (!disposed) {
        status.dataset.error = 'true';
        status.textContent = 'Widget preview failed to load.';
        globalThis.console?.error(error);
      }
    }
  });

  return host;
}

async function renderButtonThumbnail({ canvas, definition, host }) {
  const { application, canvas: renderCanvas } =
    await getSharedThumbnailRenderer();
  let preview = null;

  try {
    if (!host.isConnected) {
      return false;
    }

    preview = createPreviewControl({
      assetManager: sharedAssetManager,
      definition,
      inputRouter: null,
    });
    layoutThumbnailControl({
      height: THUMBNAIL_RENDER_HEIGHT,
      preview,
      width: THUMBNAIL_RENDER_WIDTH,
    });

    preview.root.eventMode = 'none';
    application.stage.addChild(preview.root);
    application.renderer.render(application.stage);

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('The UI editor thumbnail canvas is unavailable.');
    }

    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(renderCanvas, 0, 0);
    canvas.dataset.editorRenderer = 'static';
    return true;
  } finally {
    application.stage.removeChildren();
    preview?.destroy();
  }
}

function getSharedThumbnailRenderer() {
  sharedAssetManager ??= new UiEditorButtonAssetManager();

  if (!sharedThumbnailRendererPromise) {
    sharedThumbnailRendererPromise = createSharedThumbnailRenderer();
  }

  return sharedThumbnailRendererPromise;
}

async function createSharedThumbnailRenderer() {
  const canvas = document.createElement('canvas');
  const application = new Application();

  await Promise.all([
    application.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      canvas,
      height: THUMBNAIL_RENDER_HEIGHT,
      preserveDrawingBuffer: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      width: THUMBNAIL_RENDER_WIDTH,
    }),
    sharedAssetManager.load(),
  ]);

  return { application, canvas };
}

async function mountButtonPreview({
  canvas,
  definition,
  feedbackTracker,
  getEditorState,
  host,
  resizeTarget = host,
  updateEditorState,
}) {
  sharedAssetManager ??= new UiEditorButtonAssetManager();
  const applicationManager = new PixiApplicationManager({
    canvas,
    prepareSpineRuntime: async () => null,
  });
  const inputRouter = new PixiInputRouter({
    hapticsFacade: {
      playUiTap: () => feedbackTracker.recordHaptic(),
    },
    uiClickSoundFacade: {
      playClick: () => feedbackTracker.recordSound(),
    },
  });
  let resizeObserver = null;

  await Promise.all([
    applicationManager.initialize(),
    sharedAssetManager.load(),
  ]);

  if (!host.isConnected) {
    applicationManager.destroy();
    return createDisposedController();
  }

  const application = applicationManager.getApplication();
  const selectionOverlay = createUiEditorPixiSelectionOverlay({ application });

  inputRouter.mount({
    canvas,
    root: applicationManager.getApplication().stage,
  });

  let preview = createPreviewControl({
    assetManager: sharedAssetManager,
    definition,
    inputRouter,
    onActivate: () => feedbackTracker.recordActivation(),
    getEditorState,
    updateEditorState,
    notifyHierarchyChange: () => host.dispatchEvent(
      new globalThis.CustomEvent('ui-editor-hierarchy-change', {
        bubbles: true,
      }),
    ),
  });
  const sourceWidth = applicationManager.projection.sourceWidth;
  const sourceHeight = applicationManager.projection.sourceHeight;

  layoutPreviewControl({ preview, sourceHeight, sourceWidth });
  applicationManager.layers.pageUi.addChild(preview.root);

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => applicationManager.resizeNow());
    resizeObserver.observe(resizeTarget);
  }

  return {
    destroy() {
      resizeObserver?.disconnect();
      resizeObserver = null;
      selectionOverlay.destroy();
      inputRouter.destroy();
      preview.destroy();
      applicationManager.destroy();
    },
    getAtomicComponents() {
      return preview.atomicComponents ?? [];
    },
    getInspectorComponent() {
      return preview.inspectorComponent ?? null;
    },
    selectAtomicComponent(component) {
      selectionOverlay.select(component);
    },
    setDefinition(nextDefinition) {
      const nextPreview = createPreviewControl({
        assetManager: sharedAssetManager,
        definition: nextDefinition,
        inputRouter,
        onActivate: () => feedbackTracker.recordActivation(),
        getEditorState,
        updateEditorState,
        notifyHierarchyChange: () => host.dispatchEvent(
          new globalThis.CustomEvent('ui-editor-hierarchy-change', {
            bubbles: true,
          }),
        ),
      });

      layoutPreviewControl({
        preview: nextPreview,
        sourceHeight,
        sourceWidth,
      });
      applicationManager.layers.pageUi.addChild(nextPreview.root);
      preview.root.parent?.removeChild(preview.root);
      preview.destroy();
      preview = nextPreview;
      host.dispatchEvent(
        new globalThis.CustomEvent(
          'ui-editor-hierarchy-change',
          { bubbles: true },
        ),
      );
    },
  };
}

function createFeedbackTracker(element) {
  const counts = {
    activation: 0,
    haptic: 0,
    sound: 0,
  };

  const render = () => {
    const hapticStatus = counts.haptic > 0
      ? counts.haptic
      : 'touch only';
    element.textContent = counts.activation === 0
      ? 'Press the widget to test its feedback.'
      : `Activated ${counts.activation} · Sound ${counts.sound} · Haptic ${hapticStatus}`;
  };

  return {
    recordActivation() {
      counts.activation += 1;
      render();
      return true;
    },
    recordHaptic() {
      counts.haptic += 1;
      render();
    },
    recordSound() {
      counts.sound += 1;
      render();
    },
    reset() {
      counts.activation = 0;
      counts.haptic = 0;
      counts.sound = 0;
      render();
    },
  };
}

function createButtonEditorState(definition) {
  const preview = definition?.preview ?? definition ?? {};
  const type = preview.type === 'button'
    ? preview.variant === 'tab' ? 'tab' : 'text'
    : preview.type ?? 'text';
  const state = {
    enabled: preview.enabled === false ? 'disabled' : 'enabled',
    text: String(preview.text ?? ''),
    type,
  };

  if (['base', 'text', 'tab'].includes(type)) {
    state.color = preview.color ?? (
      PIXI_BUTTON_COLORS.includes(preview.variant)
        ? preview.variant
        : 'yellow'
    );
    state.sizeTier = String(preview.sizeTier ?? 50);
    state.selected = preview.selected === true ? 'selected' : 'resting';
  } else if (type === 'cost') {
    state.actionLabel = String(preview.actionLabel ?? 'Unlock');
    state.amountLabel = String(preview.amountLabel ?? '25 Coin');
    state.color = preview.color ?? preview.tone ?? 'green';
    state.label = preview.showLabel || preview.stacked ? 'show' : 'hide';
    state.layout = preview.research
      ? 'research'
      : preview.compact
        ? 'compact'
        : 'standard';
    state.sizeTier = String(preview.sizeTier ?? 50);
    state.status = preview.state ?? (
      preview.enabled === false ? 'disabled' : 'available'
    );
  }

  return Object.freeze(state);
}

function updateButtonEditorState(state, fieldId, value) {
  return Object.freeze({
    ...state,
    [fieldId]: String(value),
  });
}

function applyButtonEditorState(definition, state) {
  const preview = definition?.preview ?? definition ?? {};
  const nextPreview = {
    ...preview,
    enabled: state.enabled !== 'disabled',
  };

  if (['base', 'text', 'tab'].includes(state.type)) {
    if (state.type !== 'base') {
      nextPreview.text = state.text;
    }
    if (state.type === 'tab') {
      nextPreview.selected = state.selected === 'selected';
    }
    if (isConfigurableBaseButton(preview)) {
      nextPreview.color = state.color;
      nextPreview.sizeTier = Number(state.sizeTier);
      nextPreview.variant = preview.variant === 'regular'
        ? 'regular'
        : state.color;
    }
  } else if (state.type === 'cost') {
    const layout = resolveCostEditorLayout(state);
    nextPreview.actionLabel = state.actionLabel;
    nextPreview.amountLabel = state.amountLabel;
    nextPreview.color = state.color;
    nextPreview.compact = layout.compact;
    nextPreview.enabled = state.status !== 'disabled';
    nextPreview.height = layout.height;
    nextPreview.research = layout.research;
    nextPreview.showLabel = state.label === 'show';
    nextPreview.sizeTier = Number(state.sizeTier);
    nextPreview.stacked = state.label === 'show';
    nextPreview.state = state.status === 'disabled'
      ? 'available'
      : state.status;
    nextPreview.width = layout.width;
  }

  return definition?.preview
    ? { ...definition, preview: nextPreview }
    : nextPreview;
}

export function createButtonInspectorFields(preview, state, scope = 'widget') {
  const fields = [];

  if (
    scope === 'base'
    && isConfigurableBaseButton(preview)
  ) {
    fields.push(
      editorOptionField(
        'color',
        'Color',
        state.color,
        PIXI_BUTTON_COLORS.map((color) => ({
          color,
          label: formatButtonColor(color),
          value: color,
        })),
        'segmented',
        'color-swatches',
      ),
      editorOptionField(
        'sizeTier',
        'Corner size',
        state.sizeTier,
        PIXI_BUTTON_SIZE_TIERS.map((size) => ({
          label: String(size),
          value: String(size),
        })),
      ),
    );
  }
  if (scope === 'widget' && state.type === 'tab') {
    fields.push(
      editorOptionField('selected', 'Tab state', state.selected, [
        { label: 'Resting', value: 'resting' },
        { label: 'Selected', value: 'selected' },
      ]),
    );
  }
  if (scope === 'base' && state.type === 'cost') {
    fields.push(
      editorOptionField(
        'color',
        'Color',
        state.color,
        PIXI_BUTTON_COLORS.map((color) => ({
          color,
          label: formatButtonColor(color),
          value: color,
        })),
        'segmented',
        'color-swatches',
      ),
      editorOptionField(
        'sizeTier',
        'Corner size',
        state.sizeTier,
        PIXI_BUTTON_SIZE_TIERS.map((size) => ({
          label: String(size),
          value: String(size),
        })),
      ),
    );
  } else if (scope === 'widget' && state.type === 'cost') {
    fields.push(
      editorOptionField('layout', 'Layout', state.layout, [
        { label: 'Standard', value: 'standard' },
        { label: 'Compact', value: 'compact' },
        { label: 'Research', value: 'research' },
      ]),
      editorOptionField('label', 'Top label', state.label, [
        { label: 'Hidden', value: 'hide' },
        { label: 'Shown', value: 'show' },
      ]),
      editorOptionField('status', 'Cost state', state.status, [
        { label: 'Available', value: 'available' },
        { label: 'Unaffordable', value: 'unaffordable' },
        { label: 'Disabled', value: 'disabled' },
        { label: 'Locked', value: 'locked' },
      ]),
    );
  } else if (
    (scope === 'base' && state.type !== 'cost')
    || (scope === 'widget' && ['base', 'info', 'hud-settings', 'hud-avatar'].includes(state.type))
  ) {
    fields.push(
      editorOptionField('enabled', 'Input state', state.enabled, [
        { label: 'Enabled', value: 'enabled' },
        { label: 'Disabled', value: 'disabled' },
      ]),
    );
  }

  return fields;
}

function editorOptionField(
  id,
  label,
  value,
  options,
  type = 'segmented',
  presentation = '',
) {
  return { id, label, options, presentation, type, value };
}

function isConfigurableBaseButton(preview) {
  return ['base', 'text'].includes(preview?.type)
    && PIXI_BUTTON_COLORS.includes(preview.color ?? preview.variant);
}

function resolveCostEditorLayout(state) {
  if (state.layout === 'compact') {
    return { compact: true, height: 28, research: false, width: 100 };
  }
  if (state.layout === 'research') {
    return { compact: false, height: 48, research: true, width: 80 };
  }
  if (state.label === 'show') {
    return { compact: false, height: 52, research: false, width: 92 };
  }
  return {
    compact: false,
    height: 169 / 3,
    research: false,
    width: 281 / 3,
  };
}

function formatButtonColor(color) {
  return String(color)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function layoutPreviewControl({ preview, sourceHeight, sourceWidth }) {
  preview.root.position.set(
    (sourceWidth - preview.width) / 2,
    (sourceHeight - preview.height) / 2,
  );
}

function layoutThumbnailControl({ height, preview, width }) {
  const inset = 8;
  const availableWidth = Math.max(1, width - inset * 2);
  const availableHeight = Math.max(1, height - inset * 2);
  const fitScale = Math.min(
    1.15,
    availableWidth / preview.width,
    availableHeight / preview.height,
  );
  const baseScaleX = preview.baseScaleX ?? preview.root.scale.x;
  const baseScaleY = preview.baseScaleY ?? preview.root.scale.y;

  preview.baseScaleX = baseScaleX;
  preview.baseScaleY = baseScaleY;
  preview.root.scale.set(
    baseScaleX * fitScale,
    baseScaleY * fitScale,
  );
  preview.root.position.set(
    (width - preview.width * fitScale) / 2,
    (height - preview.height * fitScale) / 2,
  );
}

function createPreviewControl({
  assetManager,
  definition,
  getEditorState = () => createButtonEditorState(definition),
  inputRouter,
  notifyHierarchyChange = () => {},
  onActivate = () => true,
  updateEditorState = () => {},
}) {
  const previewDefinition = definition.preview ?? definition;
  let preview;

  if (previewDefinition.type === 'cost') {
    preview = createCostButtonPreview({
      assetManager,
      definition: previewDefinition,
      inputRouter,
      onActivate,
    });
  } else if (previewDefinition.type === 'info') {
    const root = new PixiInfoButton({
      action: onActivate,
      assetManager,
      inputRouter,
      size: previewDefinition.size,
    });
    preview = {
      destroy: () => root.destroy({ children: true }),
      height: previewDefinition.size,
      root,
      width: previewDefinition.size,
    };
  } else if (previewDefinition.type === 'hud-settings') {
    const root = new RootRunHudSquareIconButton({
      action: onActivate,
      assets: assetManager,
      inputRouter,
    });
    root.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
    preview = {
      destroy: () => root.destroy({ children: true }),
      height: 122 / PIXI_UI_GEOMETRY.sourceScale,
      root,
      width: 122 / PIXI_UI_GEOMETRY.sourceScale,
    };
  } else if (previewDefinition.type === 'hud-avatar') {
    const root = new RootRunHudAvatarButton({
      action: onActivate,
      assets: assetManager,
      inputRouter,
      texture: assetManager.getTexture('source:assets/avatars/elara.png'),
    });
    root.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
    preview = {
      destroy: () => root.destroy({ children: true }),
      height: 186 / PIXI_UI_GEOMETRY.sourceScale,
      root,
      width: 186 / PIXI_UI_GEOMETRY.sourceScale,
    };
  } else {
    const width = previewDefinition.width ?? 100;
    const height =
      previewDefinition.height ?? PIXI_UI_GEOMETRY.roomControlHeight;
    const ButtonClass = previewDefinition.type === 'base'
      ? PixiBaseButton
      : previewDefinition.type === 'tab'
        ? PixiTabButton
        : PixiTextButton;
    const root = new ButtonClass({
      action: onActivate,
      assetManager,
      color: previewDefinition.color,
      height,
      inputRouter,
      sizeTier: previewDefinition.sizeTier,
      ...(previewDefinition.type === 'base'
        ? {}
        : { text: previewDefinition.text }),
      ...(previewDefinition.type === 'tab'
        ? {}
        : { variant: previewDefinition.variant }),
      width,
    });
    root.setEnabled(previewDefinition.enabled !== false);
    root.setSelected(previewDefinition.selected === true);
    preview = {
      destroy: () => root.destroy({ children: true }),
      height,
      root,
      width,
    };
  }

  preview.atomicComponents = createAtomicComponents({
    assetManager,
    definition,
    getEditorState,
    notifyHierarchyChange,
    preview,
    updateEditorState,
  });
  preview.inspectorComponent = createButtonRootInspectorComponent({
    definition,
    getEditorState,
    notifyHierarchyChange,
    preview,
    updateEditorState,
  });
  return preview;
}

function createCostButtonPreview({
  assetManager,
  definition,
  inputRouter,
  onActivate,
}) {
  const root = new PixiCostButton({
    assetManager,
    compact: definition.compact,
    height: definition.height,
    inputRouter,
    research: definition.research,
    showLabel: definition.showLabel,
    sizeTier: definition.sizeTier,
    stacked: definition.stacked,
    tone: definition.color,
    width: definition.width,
  });
  root.setModel({
    action: onActivate,
    actionLabel: definition.actionLabel,
    amountLabel: definition.amountLabel,
    enabled: definition.enabled !== false,
    showLabel: definition.showLabel,
    state: definition.state,
    tone: definition.color,
  });
  return {
    destroy: () => root.destroy({ children: true }),
    height: root.buttonHeight,
    root,
    width: root.buttonWidth,
  };
}

function createAtomicComponents({
  assetManager,
  definition,
  getEditorState,
  preview,
  updateEditorState,
}) {
  const previewDefinition = definition.preview ?? definition;
  const root = preview.root;
  const componentId = definition.id ?? previewDefinition.type ?? 'widget';
  const assets = Array.isArray(definition.assets) ? definition.assets : [];
  const backgroundAsset = resolveButtonBackgroundAtomAsset(assets, root);
  const targetLabel = definition.label ?? componentId;
  const targetSize = {
    width: definition.minimumWidth ?? preview.width,
    height: definition.minimumHeight ?? preview.height,
  };

  if (previewDefinition.type === 'base') {
    return [];
  }

  if (previewDefinition.type === 'cost') {
    const components = [
      createBaseButtonComponent({
        assetManager,
        asset: backgroundAsset,
        componentId,
        getEditorState,
        previewDefinition,
        root,
        targetLabel,
        targetSize,
        updateEditorState,
      }),
      createDisplayAtom({
        componentId,
        displayObject: root.resourceIcon,
        id: 'resource-icon',
        label: 'Resource icon',
        type: 'image',
      }),
    ];

    components.push(
      createTextAtom({
        componentId,
        displayObject: root.actionTextLabel,
        id: 'action-label',
        label: 'Action label',
        onTextUpdate: (value) => updateEditorState('actionLabel', value),
      }),
    );

    components.push(
      createTextAtom({
        componentId,
        displayObject: root.amountLabel,
        id: 'cost-label',
        label: 'Cost label',
        onTextUpdate: (value) => updateEditorState('amountLabel', value),
      }),
    );
    return components;
  }

  if (previewDefinition.type === 'info') {
    return [
      createDisplayAtom({
        componentId,
        displayObject: root.icon,
        id: 'icon',
        label: 'Icon',
        type: 'image',
      }),
    ];
  }

  if (previewDefinition.type === 'hud-settings') {
    return [
      createDisplayAtom({
        componentId,
        displayObject: root.background,
        id: 'background',
        label: 'Background',
        type: 'image',
      }),
      createDisplayAtom({
        componentId,
        displayObject: root.icon,
        id: 'icon',
        label: 'Icon',
        type: 'image',
      }),
    ];
  }

  if (previewDefinition.type === 'hud-avatar') {
    return [
      createDisplayAtom({
        componentId,
        displayObject: root.avatarFrame,
        id: 'frame',
        label: 'Frame',
        type: 'image',
      }),
      createDisplayAtom({
        componentId,
        displayObject: root.headBackground,
        id: 'background',
        label: 'Background',
        type: 'image',
      }),
      createDisplayAtom({
        componentId,
        displayObject: root.portrait,
        id: 'portrait',
        label: 'Portrait',
        type: 'image',
      }),
    ];
  }

  return [
    createBaseButtonComponent({
      assetManager,
      asset: backgroundAsset,
      componentId,
      root,
      targetLabel,
      targetSize,
      getEditorState,
      previewDefinition,
      updateEditorState,
    }),
    ...(root.textLabel ? [createTextAtom({
      componentId,
      displayObject: root.textLabel,
      id: 'label',
      layoutBounds: {
        height: preview.height,
        width: preview.width,
        x: 0,
        y: 0,
      },
      label: 'Label',
      onTextUpdate: (value) => updateEditorState('text', value),
    })] : []),
  ];
}

function createButtonRootInspectorComponent({
  definition,
  getEditorState,
  notifyHierarchyChange,
  preview,
  updateEditorState,
}) {
  const previewDefinition = definition.preview ?? definition;
  const root = preview.root;

  return Object.freeze({
    getFields: () => createButtonInspectorFields(
      previewDefinition,
      getEditorState(),
      previewDefinition.type === 'base' ? 'base' : 'widget',
    ),
    id: `${definition.id}:widget`,
    isVisible: () => root.visible && root.renderable !== false,
    label: resolveEditorWidgetName(definition),
    setVisible: (visible) => {
      root.visible = Boolean(visible);
      root.renderable = Boolean(visible);
    },
    type: 'widget',
    update: (fieldId, value) => {
      updateEditorState(fieldId, value);
      if (root instanceof PixiCostButton) {
        applyCostButtonEditorState(root, getEditorState());
        notifyHierarchyChange();
      } else if (fieldId === 'enabled') {
        root.setEnabled(value !== 'disabled');
      } else if (fieldId === 'selected') {
        root.setSelected(value === 'selected');
      } else if (fieldId === 'color') {
        root.setColor(value);
      } else if (fieldId === 'sizeTier') {
        root.setSizeTier(value);
      }
      return false;
    },
  });
}

function createBaseButtonComponent({
  assetManager,
  asset,
  componentId,
  root,
  targetLabel,
  targetSize,
  getEditorState,
  previewDefinition,
  updateEditorState,
}) {
  const targets = [root.frame, root.rootRunFrame, root.inlineBacking].filter(Boolean);
  const resolveSkin = (assetId) =>
    resolveButtonEditorSkin(assetId, asset, root);
  let activeTarget =
    targets.find((target) => target.visible && target.renderable !== false)
    ?? root.rootRunFrame;
  let assetId = asset?.id ?? '';
  let visible = activeTarget.visible && activeTarget.renderable !== false;
  let x = Number(activeTarget.position.x) || 0;
  let y = Number(activeTarget.position.y) || 0;

  const applyPosition = () => {
    for (const target of targets) {
      target.position.set(x, y);
    }
  };
  const applyVisibility = () => {
    for (const target of targets) {
      const active = target === activeTarget && visible && Boolean(assetId);
      target.visible = active;
      target.renderable = active;
    }
  };
  const applyAsset = (nextAssetId) => {
    const candidateAssetId = String(nextAssetId ?? '');
    const skin = resolveSkin(candidateAssetId);
    const compatibility = skin
      ? validateNineSliceCompatibility({
          assetId: candidateAssetId,
          minimumCenter: skin.minimumCenter,
          outputInsets: skin.outputInsets,
          targetLabel,
          targetSize,
        })
      : null;

    if (compatibility && !compatibility.compatible) {
      return false;
    }

    assetId = candidateAssetId;

    if (assetId) {
      activeTarget = root.rootRunFrame;
      activeTarget.setSkin({
        assetId,
        borderInsets:
          skin?.outputInsets ?? PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
        height: root.buttonHeight,
        minimumCenter: skin?.minimumCenter,
        sourceInsets:
          skin?.sourceInsets ?? PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
        texture: assetManager.getTexture(assetId),
        width: root.buttonWidth,
      });
    }

    applyPosition();
    applyVisibility();
    return true;
  };

  return createAtomicComponent({
    componentId,
    displayObjects: targets,
    getFields: () => [
      ...createButtonInspectorFields(
        previewDefinition,
        getEditorState(),
        'base',
      ),
      positionField('x', 'X', x),
      positionField('y', 'Y', y),
      {
        id: 'asset',
        label: 'Asset',
        options: createAssetOptions(assetId, {
          asset,
          resolveSkin,
          targetLabel,
          targetSize,
        }),
        type: 'select',
        value: assetId,
      },
    ],
    id: 'base-button',
    isVisible: () => visible,
    label: 'BaseButton (inherited)',
    libraryEntryId: 'base-button',
    setVisible: (nextVisible) => {
      visible = Boolean(nextVisible);
      applyVisibility();
    },
    type: 'widget',
    update: (fieldId, value) => {
      if (fieldId === 'color') {
        updateEditorState(fieldId, value);
        if (root instanceof PixiCostButton) {
          applyCostButtonEditorState(root, getEditorState());
        } else {
          root.setColor(value);
        }
        assetId = getPixiButtonAssetId(
          getEditorState().color,
          getEditorState().sizeTier,
        );
        activeTarget = root.rootRunFrame;
        applyVisibility();
        return true;
      } else if (fieldId === 'sizeTier') {
        updateEditorState(fieldId, value);
        if (root instanceof PixiCostButton) {
          applyCostButtonEditorState(root, getEditorState());
        } else {
          root.setSizeTier(value);
        }
        assetId = getPixiButtonAssetId(
          getEditorState().color,
          getEditorState().sizeTier,
        );
        activeTarget = root.rootRunFrame;
        applyVisibility();
        return true;
      } else if (fieldId === 'enabled') {
        updateEditorState(fieldId, value);
        root.setEnabled(value !== 'disabled');
        return false;
      } else if (fieldId === 'x') {
        x = Number(value);
        applyPosition();
      } else if (fieldId === 'y') {
        y = Number(value);
        applyPosition();
      } else if (fieldId === 'asset') {
        applyAsset(value);
      }
    },
  });
}

function applyCostButtonEditorState(root, state) {
  const layout = resolveCostEditorLayout(state);
  const center = {
    x: root.position.x + root.buttonWidth / 2,
    y: root.position.y + root.buttonHeight / 2,
  };

  root.compact = layout.compact;
  root.research = layout.research;
  root.stacked = state.label === 'show';
  root.showLabel = state.label === 'show';
  root.setSize(layout.width, layout.height);
  root.position.set(
    center.x - layout.width / 2,
    center.y - layout.height / 2,
  );
  root.applyFixedTextStyle();
  root.setModel({
    action: root.action,
    actionLabel: state.actionLabel,
    amountLabel: state.amountLabel,
    enabled: state.status !== 'disabled',
    showLabel: state.label === 'show',
    sizeTier: state.sizeTier,
    state: state.status === 'disabled' ? 'available' : state.status,
    tone: state.color,
  });
}

function createTextAtom({
  componentId,
  displayObject,
  id,
  label,
  layoutBounds = null,
  onTextUpdate = () => {},
}) {
  const component = createUiEditorPixiTextComponent({
    displayObject,
    id: `${componentId}:${id}`,
    label,
    layoutBounds,
  });
  return Object.freeze({
    ...component,
    update: (fieldId, value) => {
      const shouldRefresh = component.update(fieldId, value);
      if (fieldId === 'text') {
        onTextUpdate(value);
      }
      return shouldRefresh;
    },
  });
}

function createDisplayAtom({
  assetField = null,
  componentId,
  displayObject,
  id,
  label,
  textField = null,
  type,
}) {
  return createAtomicComponent({
    componentId,
    displayObjects: [displayObject],
    getFields: () => [
      positionField('x', 'X', displayObject.position.x),
      positionField('y', 'Y', displayObject.position.y),
      ...(textField
        ? [{
            id: 'text',
            label: 'Text',
            type: 'text',
            value: textField.getValue(),
          }]
        : []),
      ...(assetField
        ? [{
            id: 'asset',
            label: 'Asset',
            options: assetField.getOptions(),
            type: 'select',
            value: assetField.getValue(),
          }]
        : []),
    ],
    id,
    isVisible: () =>
      displayObject.visible && displayObject.renderable !== false,
    label,
    setVisible: (visible) => {
      displayObject.visible = Boolean(visible);
      displayObject.renderable = Boolean(visible);
    },
    type,
    update: (fieldId, value) => {
      if (fieldId === 'x') {
        displayObject.position.x = Number(value);
      } else if (fieldId === 'y') {
        displayObject.position.y = Number(value);
      } else if (fieldId === 'text') {
        textField?.setValue(value);
      } else if (fieldId === 'asset') {
        assetField?.setValue(value);
      }
    },
  });
}

function createAtomicComponent({
  componentId,
  displayObjects = [],
  getFields,
  id,
  isVisible,
  label,
  libraryEntryId = null,
  setVisible,
  type,
  update,
}) {
  return Object.freeze({
    getFields,
    getSelectionAnchorPoint: () =>
      displayObjects[0]?.getGlobalPosition?.() ?? null,
    getSelectionDisplayObjects: () => displayObjects,
    id: `${componentId}:${id}`,
    isVisible,
    label,
    libraryEntryId,
    setVisible,
    type,
    update,
  });
}

function resolveEditorWidgetName(definition) {
  const preview = definition?.preview ?? definition ?? {};
  const type = preview.type === 'button'
    ? preview.variant === 'tab' ? 'tab' : 'text'
    : preview.type;
  switch (type) {
    case 'base':
      return 'BaseButton';
    case 'tab':
      return 'TabButton';
    case 'cost':
      return 'CostButton';
    case 'info':
      return 'InfoButton';
    case 'hud-settings':
      return 'HudSettingsButton';
    case 'hud-avatar':
      return 'HudAvatarButton';
    default:
      return 'TextButton';
  }
}

function positionField(id, label, value) {
  return {
    id,
    label,
    step: 1,
    type: 'number',
    value: roundEditorValue(value),
  };
}

export function createAssetOptions(
  currentAssetId,
  {
    asset = null,
    resolveSkin = (assetId) => resolveEditorNineSliceSkin(assetId, asset),
    targetLabel = 'widget',
    targetSize = { width: 0, height: 0 },
  } = {},
) {
  const assetIds = new Set(EDITOR_BACKGROUND_ASSET_IDS);
  if (currentAssetId) {
    assetIds.add(currentAssetId);
  }

  return [
    { label: 'None', value: '' },
    ...[...assetIds].map((assetId) => {
      const skin = resolveSkin(assetId);
      const compatibility = skin
        ? validateNineSliceCompatibility({
            assetId,
            minimumCenter: skin.minimumCenter,
            outputInsets: skin.outputInsets,
            targetLabel,
            targetSize,
          })
        : null;
      const disabled = compatibility?.compatible === false;
      const minimum = compatibility?.minimumSize;
      const reason = disabled
        ? `Requires at least ${formatSize(minimum)}; `
          + `${targetLabel} minimum is ${formatSize(targetSize)}.`
        : '';

      return {
        disabled,
        label: disabled
          ? `${formatAssetLabel(assetId)} (needs ${formatSize(minimum)})`
          : formatAssetLabel(assetId),
        reason,
        value: assetId,
      };
    }),
  ];
}

export function resolveButtonBackgroundAtomAsset(assets, root) {
  const activeSkin = root?.activeSkin;
  if (activeSkin?.assetId) {
    return Object.freeze({
      borderInsets: activeSkin.borderInsets,
      height: root.buttonHeight,
      id: activeSkin.assetId,
      minimumCenter: activeSkin.minimumCenter,
      nineSlice: true,
      role: 'Background',
      sourceInsets: activeSkin.sourceInsets,
      width: root.buttonWidth,
    });
  }

  return assets.find(({ role }) => role === 'Background') ?? null;
}

function resolveButtonEditorSkin(assetId, registeredAsset, root) {
  if (root instanceof PixiTabButton) {
    const configuration = REGULAR_BUTTON_CONFIGURATION_BY_ASSET_ID.get(
      String(assetId ?? ''),
    );
    if (configuration) {
      const skin = getPixiButtonSkin({
        color: configuration.color,
        height: root.buttonHeight,
        sizeTier: configuration.sizeTier,
        width: root.buttonWidth,
      });
      return createPixiNineSliceSkin({
        assetId: skin.assetId,
        minimumCenter: skin.minimumCenter,
        outputInsets: skin.borderInsets,
        sourceInsets: skin.sourceInsets,
      });
    }
  }

  return resolveEditorNineSliceSkin(assetId, registeredAsset);
}

function formatAssetLabel(assetId) {
  const filename = String(assetId).split('/').pop() ?? String(assetId);
  return filename
    .replace(/\.(png|jpg|jpeg)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveEditorNineSliceSkin(assetId, registeredAsset) {
  const normalizedAssetId = String(assetId ?? '');

  if (!normalizedAssetId) {
    return null;
  }

  if (
    registeredAsset?.id === normalizedAssetId
    && registeredAsset?.nineSlice === true
    && registeredAsset?.sourceInsets
    && registeredAsset?.borderInsets
  ) {
    return createPixiNineSliceSkin({
      assetId: normalizedAssetId,
      minimumCenter: registeredAsset.minimumCenter,
      outputInsets: registeredAsset.borderInsets,
      sourceInsets: registeredAsset.sourceInsets,
    });
  }

  const registeredSkin = getPixiNineSliceSkin(normalizedAssetId);
  if (registeredSkin) {
    return registeredSkin;
  }

  const metadata = SOURCE_NINE_SLICE_METADATA_BY_ASSET_ID.get(
    normalizedAssetId,
  );
  if (!metadata?.slice) {
    return null;
  }

  return createPixiNineSliceSkin({
    assetId: normalizedAssetId,
    minimumCenter: metadata.rendering?.minimumCenter,
    outputInsets:
      metadata.rendering?.outputInsets
      ?? PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
    sourceInsets: metadata.slice,
  });
}

function formatSize(size) {
  const width = Math.round((Number(size?.width) || 0) * 100) / 100;
  const height = Math.round((Number(size?.height) || 0) * 100) / 100;

  return `${width}×${height}`;
}

function roundEditorValue(value) {
  const number = Number(value) || 0;
  return Math.round(number * 1000) / 1000;
}

class UiEditorButtonAssetManager {
  constructor() {
    this.loaded = false;
    this.loadPromise = null;
    this.textures = new Map();
  }

  load() {
    if (!this.loadPromise) {
      this.loadPromise = Promise.all(
        BUTTON_ASSET_MANIFEST.map(async ({ id, src }) => {
          const texture = await Assets.load(src);
          this.textures.set(id, texture);
        }),
      );
    }
    return this.loadPromise;
  }

  has(assetId) {
    return this.textures.has(assetId);
  }

  getTexture(assetId) {
    return this.textures.get(assetId) ?? Texture.EMPTY;
  }

  getAtlasTexture() {
    return Texture.EMPTY;
  }
}

function createDisposedController() {
  return { destroy() {} };
}
