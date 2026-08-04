import { Container } from 'pixi.js';

import { gameAssetAtlasFrames } from '../../assets/generated/game-asset-atlas.generated.js';
import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import { PixiAssetManager } from '../../rendering/pixi/assets/PixiAssetManager.js';
import { PixiInputRouter } from '../../rendering/pixi/input/PixiInputRouter.js';
import { PixiApplicationManager } from '../../rendering/pixi/runtime/PixiApplicationManager.js';

/**
 * Mounts a production Pixi control inside an editor-owned canvas.
 */
export async function createUiEditorPixiSurface({
  assetFilter = () => false,
  component = 'PixiIntegration',
  createControl,
  layout = 'center',
} = {}) {
  if (typeof createControl !== 'function') {
    throw new Error('Pixi UI Lab surfaces require createControl.');
  }

  const host = document.createElement('section');
  const canvas = document.createElement('canvas');
  host.className = 'ui-editor-game-widget-preview';
  host.dataset.uiEditorComponent = component;
  canvas.className = 'ui-editor-game-widget-preview__canvas';
  canvas.setAttribute('aria-label', `${component} interactive preview`);
  host.append(canvas);

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

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => applicationManager.resizeNow());
    resizeObserver.observe(host);
  }

  return {
    control,
    getAtomicComponents: () => control?.atomicComponents ?? [],
    preview: host,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      input.destroy();
      control?.destroy?.();
      if (!control?.destroy && !root.destroyed) {
        root.destroy({ children: true });
      }
      applicationManager.destroy();
      control = null;
    },
  };
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
