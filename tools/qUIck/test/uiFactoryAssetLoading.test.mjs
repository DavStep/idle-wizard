import assert from "node:assert/strict";
import { Assets } from "pixi.js";
import { UIFactory } from "../packages/pixi-runtime/dist/uiFactory.js";

function makeExport(name, assets, children) {
  return {
    version: 1,
    name,
    kind: "dialog",
    designSize: { width: 100, height: 100 },
    scaleMode: "fit",
    safeArea: { x: 0, y: 0, width: 100, height: 100 },
    assets,
    children
  };
}

function raster(id, assetId) {
  return {
    id,
    name: id,
    type: "raster",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    assetId
  };
}

const ids = {
  shared: "asset-test-shared-bundle",
  localA: "asset-test-local-a",
  localB: "asset-test-local-b"
};
const originalLoad = Assets.load;
const loadCalls = [];

try {
  for (const id of Object.values(ids)) {
    if (Assets.cache.has(id)) {
      Assets.cache.remove(id);
    }
  }

  Assets.load = async (path) => {
    loadCalls.push(path);
    return { path };
  };

  const exportA = makeExport(
    "StartDialog",
    [
      { id: ids.shared, src: "assets/ui/shared/icon_coin.png" },
      { id: ids.localA, src: "assets/ui/StartDialog/start_logo.png" }
    ],
    [raster("coin", ids.shared), raster("logo", ids.localA)]
  );
  const exportB = makeExport(
    "ShopDialog",
    [
      { id: ids.shared, src: "assets/ui/shared/icon_coin.png" },
      { id: ids.localB, src: "assets/ui/ShopDialog/shop_banner.png" }
    ],
    [raster("coin", ids.shared), raster("banner", ids.localB)]
  );

  const factory = new UIFactory({ assetBasePath: "" });
  await factory.loadAssetsBundle([exportA, exportB]);

  assert.equal(loadCalls.length, 3);
  assert.equal(Assets.cache.has(ids.shared), true);
  assert.equal(Assets.cache.has(ids.localA), true);
  assert.equal(Assets.cache.has(ids.localB), true);

  loadCalls.length = 0;
  await factory.loadAssets(exportA);
  assert.equal(loadCalls.length, 0);

  console.log("ok - UIFactory bundle asset loading dedupes and reuses cache");
} finally {
  Assets.load = originalLoad;
  for (const id of Object.values(ids)) {
    if (Assets.cache.has(id)) {
      Assets.cache.remove(id);
    }
  }
}
