import { Assets, Texture } from 'pixi.js';

import { PIXI_PRODUCTION_ASSET_MANIFEST } from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import {
  RootRunHudAvatarButton,
  RootRunHudSquareIconButton,
} from '../../rendering/pixi/global/chrome/RootRunTopHudWidgets.js';
import { PixiInputRouter } from '../../rendering/pixi/input/PixiInputRouter.js';
import { PixiButton } from '../../rendering/pixi/primitives/PixiButton.js';
import { PixiCostButton } from '../../rendering/pixi/primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../rendering/pixi/primitives/PixiInfoButton.js';
import { PixiApplicationManager } from '../../rendering/pixi/runtime/PixiApplicationManager.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../rendering/pixi/theme/PixiThemeTokens.js';

const BUTTON_ASSET_IDS = new Set([
  PIXI_ROOT_RUN_ASSETS.accountSave,
  PIXI_ROOT_RUN_ASSETS.accountTabActive,
  PIXI_ROOT_RUN_ASSETS.accountTabInactive,
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
let sharedAssetManager = null;

export function createUiEditorPixiButtonPreview(definition) {
  const host = document.createElement('section');
  const canvas = document.createElement('canvas');
  const status = document.createElement('p');
  let controller = null;
  let disposed = false;

  host.className = 'ui-editor-game-widget-preview';
  host.dataset.uiEditorComponent = 'IdleWizardButtonWidget';
  host.dataset.editorButtonWidget = definition.id;
  host.setAttribute('aria-label', `${definition.label} preview`);

  canvas.className = 'ui-editor-game-widget-preview__canvas';
  canvas.dataset.uiEditorComponent = definition.label;
  canvas.setAttribute('aria-label', definition.label);

  status.className = 'ui-editor-game-widget-preview__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading widget…';
  host.append(canvas, status);

  host.uiEditorDispose = () => {
    disposed = true;
    controller?.destroy();
    controller = null;
  };

  globalThis.queueMicrotask(async () => {
    try {
      controller = await mountButtonPreview({
        canvas,
        definition,
        host,
      });
      if (disposed) {
        controller.destroy();
        controller = null;
        return;
      }
      status.remove();
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

  const preview = createPreviewControl({
    assetManager: sharedAssetManager,
    definition: definition.preview,
    inputRouter,
  });
  const sourceWidth = applicationManager.projection.sourceWidth;
  const sourceHeight = applicationManager.projection.sourceHeight;

  preview.root.position.set(
    (sourceWidth - preview.width) / 2,
    (sourceHeight - preview.height) / 2,
  );
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
  };
}

function createPreviewControl({ assetManager, definition, inputRouter }) {
  if (definition.type === 'cost') {
    return createCostButtonPreview({
      assetManager,
      definition,
      inputRouter,
    });
  }

  if (definition.type === 'info') {
    const root = new PixiInfoButton({
      action: () => true,
      assetManager,
      inputRouter,
      size: definition.size,
    });
    return {
      destroy: () => root.destroy({ children: true }),
      height: definition.size,
      root,
      width: definition.size,
    };
  }

  if (definition.type === 'hud-settings') {
    const root = new RootRunHudSquareIconButton({ assets: assetManager });
    root.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
    return {
      destroy: () => root.destroy({ children: true }),
      height: 122 / PIXI_UI_GEOMETRY.sourceScale,
      root,
      width: 122 / PIXI_UI_GEOMETRY.sourceScale,
    };
  }

  if (definition.type === 'hud-avatar') {
    const root = new RootRunHudAvatarButton({
      assets: assetManager,
      texture: assetManager.getTexture('source:assets/avatars/elara.png'),
    });
    root.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
    return {
      destroy: () => root.destroy({ children: true }),
      height: 186 / PIXI_UI_GEOMETRY.sourceScale,
      root,
      width: 186 / PIXI_UI_GEOMETRY.sourceScale,
    };
  }

  const width = definition.width ?? 100;
  const height = definition.height ?? PIXI_UI_GEOMETRY.roomControlHeight;
  const root = new PixiButton({
    action: () => true,
    assetManager,
    height,
    inputRouter,
    text: definition.text,
    variant: definition.variant,
    width,
  });
  root.setEnabled(definition.enabled !== false);
  root.setSelected(definition.selected === true);
  return {
    destroy: () => root.destroy({ children: true }),
    height,
    root,
    width,
  };
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
