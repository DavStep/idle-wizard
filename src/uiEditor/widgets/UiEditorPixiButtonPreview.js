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
import { PixiButton } from '../../rendering/pixi/primitives/PixiButton.js';
import { PixiCostButton } from '../../rendering/pixi/primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../rendering/pixi/primitives/PixiInfoButton.js';
import { PixiApplicationManager } from '../../rendering/pixi/runtime/PixiApplicationManager.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../rendering/pixi/theme/PixiThemeTokens.js';

const EDITOR_BACKGROUND_ASSET_IDS = Object.freeze([
  DEFAULT_PIXI_THEME_SNAPSHOT.frames.control,
  PIXI_ROOT_RUN_ASSETS.buttonYellow,
  PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
  PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
  PIXI_ROOT_RUN_ASSETS.buttonTabActive,
  PIXI_ROOT_RUN_ASSETS.buttonTabInactive,
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
  PIXI_ROOT_RUN_ASSETS.buttonTabActive,
  PIXI_ROOT_RUN_ASSETS.buttonTabDisabled,
  PIXI_ROOT_RUN_ASSETS.buttonTabInactive,
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
const THUMBNAIL_RENDER_HEIGHT = 54;
const THUMBNAIL_RENDER_WIDTH = 212;
let sharedAssetManager = null;
let sharedThumbnailRendererPromise = null;
const thumbnailRenderQueue = createUiEditorThumbnailRenderQueue();

export function createUiEditorThumbnailRenderQueue() {
  let tail = Promise.resolve();

  return {
    run(task) {
      const result = tail.then(task, task);
      tail = result.catch(() => {});
      return result;
    },
  };
}

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
  const host = document.createElement('section');
  const canvas = document.createElement('canvas');
  const status = document.createElement('p');
  let controller = null;
  let currentDefinition = definition;
  let disposed = false;

  host.className = 'ui-editor-game-widget-preview';
  host.dataset.uiEditorComponent = 'IdleWizardButtonWidget';

  canvas.className = 'ui-editor-game-widget-preview__canvas';

  status.className = 'ui-editor-game-widget-preview__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading widget…';
  host.append(canvas, status);

  const applyDefinition = (nextDefinition) => {
    controller?.setDefinition(nextDefinition);
    currentDefinition = nextDefinition;
    host.dataset.editorButtonWidget = nextDefinition.id;
    host.setAttribute('aria-label', `${nextDefinition.label} preview`);
    canvas.dataset.uiEditorComponent = nextDefinition.label;
    canvas.setAttribute('aria-label', nextDefinition.label);
  };

  applyDefinition(definition);

  host.uiEditorButtonPreviewDefinition = definition;
  host.uiEditorGetAtomicComponents = () =>
    controller?.getAtomicComponents() ?? [];
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
  };

  globalThis.queueMicrotask(async () => {
    if (disposed || !host.isConnected) {
      return;
    }

    try {
      const mountedDefinition = currentDefinition;
      controller = await mountButtonPreview({
        canvas,
        definition: mountedDefinition,
        host,
      });
      if (disposed) {
        controller.destroy();
        controller = null;
        return;
      }
      if (currentDefinition !== mountedDefinition) {
        controller.setDefinition(currentDefinition);
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

async function mountButtonPreview({ canvas, definition, host }) {
  sharedAssetManager ??= new UiEditorButtonAssetManager();
  const applicationManager = new PixiApplicationManager({
    canvas,
    prepareSpineRuntime: async () => null,
  });
  const inputRouter = new PixiInputRouter();
  let resizeObserver = null;

  await Promise.all([
    applicationManager.initialize(),
    sharedAssetManager.load(),
  ]);

  if (!host.isConnected) {
    applicationManager.destroy();
    return createDisposedController();
  }

  inputRouter.mount({
    canvas,
    root: applicationManager.getApplication().stage,
  });

  let preview = createPreviewControl({
    assetManager: sharedAssetManager,
    definition,
    inputRouter,
  });
  const sourceWidth = applicationManager.projection.sourceWidth;
  const sourceHeight = applicationManager.projection.sourceHeight;

  layoutPreviewControl({ preview, sourceHeight, sourceWidth });
  applicationManager.layers.pageUi.addChild(preview.root);

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => applicationManager.resizeNow());
    resizeObserver.observe(host);
  }

  return {
    destroy() {
      resizeObserver?.disconnect();
      resizeObserver = null;
      inputRouter.destroy();
      preview.destroy();
      applicationManager.destroy();
    },
    getAtomicComponents() {
      return preview.atomicComponents ?? [];
    },
    setDefinition(nextDefinition) {
      const nextPreview = createPreviewControl({
        assetManager: sharedAssetManager,
        definition: nextDefinition,
        inputRouter,
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

function createPreviewControl({ assetManager, definition, inputRouter }) {
  const previewDefinition = definition.preview ?? definition;
  let preview;

  if (previewDefinition.type === 'cost') {
    preview = createCostButtonPreview({
      assetManager,
      definition: previewDefinition,
      inputRouter,
    });
  } else if (previewDefinition.type === 'info') {
    const root = new PixiInfoButton({
      action: () => true,
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
    const root = new RootRunHudSquareIconButton({ assets: assetManager });
    root.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
    preview = {
      destroy: () => root.destroy({ children: true }),
      height: 122 / PIXI_UI_GEOMETRY.sourceScale,
      root,
      width: 122 / PIXI_UI_GEOMETRY.sourceScale,
    };
  } else if (previewDefinition.type === 'hud-avatar') {
    const root = new RootRunHudAvatarButton({
      assets: assetManager,
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
    const root = new PixiButton({
      action: () => true,
      assetManager,
      height,
      inputRouter,
      text: previewDefinition.text,
      variant: previewDefinition.variant,
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
    preview,
  });
  return preview;
}

function createCostButtonPreview({ assetManager, definition, inputRouter }) {
  const root = new PixiCostButton({
    assetManager,
    compact: definition.compact,
    height: definition.height,
    inputRouter,
    research: definition.research,
    stacked: definition.stacked,
    width: definition.width,
  });
  root.setModel({
    action: () => true,
    actionLabel: definition.actionLabel,
    amountLabel: definition.amountLabel,
  });
  return {
    destroy: () => root.destroy({ children: true }),
    height: root.buttonHeight,
    root,
    width: root.buttonWidth,
  };
}

function createAtomicComponents({ assetManager, definition, preview }) {
  const previewDefinition = definition.preview ?? definition;
  const root = preview.root;
  const componentId = definition.id ?? previewDefinition.type ?? 'widget';
  const assets = Array.isArray(definition.assets) ? definition.assets : [];
  const backgroundAsset =
    assets.find(({ role }) => role === 'Background') ?? null;
  const targetLabel = definition.label ?? componentId;
  const targetSize = {
    width: definition.minimumWidth ?? preview.width,
    height: definition.minimumHeight ?? preview.height,
  };

  if (previewDefinition.type === 'cost') {
    const components = [
      createBackgroundAtom({
        assetManager,
        asset: backgroundAsset,
        componentId,
        displayObject: root.background,
        targetLabel,
        targetSize,
      }),
      createDisplayAtom({
        componentId,
        displayObject: root.resourceIcon,
        id: 'resource-icon',
        label: 'Resource icon',
        type: 'image',
      }),
    ];

    if (root.actionTextLabel.visible) {
      components.push(
        createTextAtom({
          componentId,
          displayObject: root.actionTextLabel,
          id: 'action-label',
          label: 'Action label',
        }),
      );
    }

    components.push(
      createTextAtom({
        componentId,
        displayObject: root.amountLabel,
        id: 'cost-label',
        label: 'Cost label',
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
    createButtonBackgroundAtom({
      assetManager,
      asset: backgroundAsset,
      componentId,
      root,
      targetLabel,
      targetSize,
    }),
    createTextAtom({
      componentId,
      displayObject: root.textLabel,
      id: 'label',
      label: 'Label',
    }),
  ];
}

function createButtonBackgroundAtom({
  assetManager,
  asset,
  componentId,
  root,
  targetLabel,
  targetSize,
}) {
  const targets = [root.frame, root.rootRunFrame, root.inlineBacking];
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
    const skin = resolveEditorNineSliceSkin(candidateAssetId, asset);
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
    getFields: () => [
      positionField('x', 'X', x),
      positionField('y', 'Y', y),
      {
        id: 'asset',
        label: 'Asset',
        options: createAssetOptions(assetId, {
          asset,
          targetLabel,
          targetSize,
        }),
        type: 'select',
        value: assetId,
      },
    ],
    id: 'background',
    isVisible: () => visible,
    label: 'Background',
    setVisible: (nextVisible) => {
      visible = Boolean(nextVisible);
      applyVisibility();
    },
    type: 'image',
    update: (fieldId, value) => {
      if (fieldId === 'x') {
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

function createBackgroundAtom({
  assetManager,
  asset,
  componentId,
  displayObject,
  extraTargets = [],
  targetLabel,
  targetSize,
}) {
  const targets = [...new Set([displayObject, ...extraTargets].filter(Boolean))];
  let assetId = asset?.id ?? '';

  return createDisplayAtom({
    assetField: {
      getOptions: () => createAssetOptions(assetId, {
        asset,
        targetLabel,
        targetSize,
      }),
      getValue: () => assetId,
      setValue: (nextAssetId) => {
        const candidateAssetId = String(nextAssetId ?? '');
        const skin = resolveEditorNineSliceSkin(candidateAssetId, asset);
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
        if (!candidateAssetId) {
          for (const target of targets) {
            target.visible = false;
            target.renderable = false;
          }
          return true;
        }
        for (const target of targets) {
          applyTexture({
            asset,
            assetId,
            assetManager,
            displayObject: target,
            skin,
          });
        }
        displayObject.visible = true;
        displayObject.renderable = true;
        return true;
      },
    },
    componentId,
    displayObject,
    id: 'background',
    label: 'Background',
    type: 'image',
  });
}

function createTextAtom({
  componentId,
  displayObject,
  id,
  label,
}) {
  return createDisplayAtom({
    componentId,
    displayObject,
    id,
    label,
    textField: {
      getValue: () => displayObject.text,
      setValue: (value) => displayObject.setText(value),
    },
    type: 'text',
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
  getFields,
  id,
  isVisible,
  label,
  setVisible,
  type,
  update,
}) {
  return Object.freeze({
    getFields,
    id: `${componentId}:${id}`,
    isVisible,
    label,
    setVisible,
    type,
    update,
  });
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
      const skin = resolveEditorNineSliceSkin(assetId, asset);
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

function formatAssetLabel(assetId) {
  const filename = String(assetId).split('/').pop() ?? String(assetId);
  return filename
    .replace(/\.(png|webp|jpg|jpeg)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function applyTexture({
  asset,
  assetId,
  assetManager,
  displayObject,
  skin = resolveEditorNineSliceSkin(assetId, asset),
}) {
  const texture = assetManager.getTexture(assetId);
  const width = displayObject.frameWidth ?? displayObject.width;
  const height = displayObject.frameHeight ?? displayObject.height;
  const usesSkinContract = typeof displayObject.setSkin === 'function';

  if (usesSkinContract) {
    displayObject.setSkin({
      assetId,
      borderInsets:
        skin?.outputInsets ?? PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
      height,
      minimumCenter: skin?.minimumCenter,
      sourceInsets:
        skin?.sourceInsets ?? PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
      texture,
      width,
    });
  } else if (typeof displayObject.setTexture === 'function') {
    displayObject.setTexture(
      texture,
      skin?.sourceInsets ?? PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
    );
  } else if ('texture' in displayObject) {
    displayObject.texture = texture;
  }

  if (
    !usesSkinContract
    && Number.isFinite(width)
    && Number.isFinite(height)
  ) {
    displayObject.width = width;
    displayObject.height = height;
  }
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
