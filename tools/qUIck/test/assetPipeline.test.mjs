import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = path.resolve("tmp", "asset-pipeline-test");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await writeFile(path.join(outdir, "package.json"), '{"type":"module"}\n');

await build({
  entryPoints: ["src/exporter/assetNaming.ts", "src/exporter/assetFinalizer.ts"],
  outdir,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  logLevel: "silent"
});

const naming = await import(pathToFileURL(path.join(outdir, "assetNaming.js")).href);
const finalizer = await import(pathToFileURL(path.join(outdir, "assetFinalizer.js")).href);

function run(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

function doc(name, assets, children) {
  return {
    version: "1.0.0",
    name,
    kind: "dialog",
    designSize: { width: 100, height: 100 },
    scaleMode: "fit",
    safeArea: { x: 0, y: 0, width: 100, height: 100 },
    children,
    assets,
    meta: {
      source: "figma",
      exportedRootId: name,
      validation: { warnings: [], errors: [] }
    }
  };
}

function asset(id, name, root = "StartDialog") {
  return {
    id,
    name,
    nameSource: "layer",
    src: `assets/ui/${root}/${name}.png`,
    width: 10,
    height: 10,
    scale: 1,
    mimeType: "image/png"
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
    assetId,
    asset: `old/${assetId}.png`
  };
}

run("asset naming strips qUIck tags and supports @asset override", () => {
  const resolved = naming.buildAssetBaseName({
    rawName: "@raster @asset(icon_coin) Rectangle 42",
    cleanName: "Rectangle 42",
    assetName: "icon_coin",
    fallbackHash: "a83f21cc"
  });

  assert.equal(resolved.name, "icon_coin");
  assert.equal(resolved.source, "explicit");
  assert.equal(naming.sanitizeAssetBaseName("Icon   Coin!*"), "icon_coin");
});

run("asset naming uses parent context for generic Figma names", () => {
  const resolved = naming.buildAssetBaseName({
    rawName: "@nine Rectangle 42",
    cleanName: "Rectangle 42",
    parentName: "Reward Panel",
    fallbackHash: "d91c44aa"
  });

  assert.equal(resolved.name, "reward_panel_rectangle_42");
});

run("asset finalization dedupes bytes, suffixes conflicts, and shares reused assets", () => {
  const bytesCoin = Uint8Array.from([1, 2, 3]);
  const bytesBadgeA = Uint8Array.from([4, 5, 6]);
  const bytesBadgeB = Uint8Array.from([7, 8, 9]);
  const bytesShared = Uint8Array.from([10, 11, 12]);
  const bytesLocal = Uint8Array.from([13, 14, 15]);

  const startDoc = doc(
    "StartDialog",
    [
      asset("coin-a", "icon_coin"),
      asset("coin-b", "icon_coin"),
      asset("badge-a", "badge"),
      asset("badge-b", "badge"),
      asset("shared-a", "panel_bg"),
      asset("local-a", "start_logo")
    ],
    [
      raster("coin_1", "coin-a"),
      raster("coin_2", "coin-b"),
      raster("badge_1", "badge-a"),
      raster("badge_2", "badge-b"),
      raster("panel", "shared-a"),
      raster("logo", "local-a")
    ]
  );
  const shopDoc = doc(
    "ShopDialog",
    [asset("shared-b", "panel", "ShopDialog")],
    [raster("panel", "shared-b")]
  );

  const result = finalizer.finalizeExportedAssetsForDocuments({
    documents: [
      {
        document: startDoc,
        assets: [
          { assetId: "coin-a", fileName: "icon_coin.png", name: "icon_coin", bytes: bytesCoin },
          { assetId: "coin-b", fileName: "icon_coin.png", name: "icon_coin", bytes: bytesCoin },
          { assetId: "badge-a", fileName: "badge.png", name: "badge", bytes: bytesBadgeA },
          { assetId: "badge-b", fileName: "badge.png", name: "badge", bytes: bytesBadgeB },
          { assetId: "shared-a", fileName: "panel_bg.png", name: "panel_bg", bytes: bytesShared },
          { assetId: "local-a", fileName: "start_logo.png", name: "start_logo", bytes: bytesLocal }
        ]
      },
      {
        document: shopDoc,
        assets: [{ assetId: "shared-b", fileName: "panel.png", name: "panel", bytes: bytesShared }]
      }
    ],
    assetBasePath: "assets/ui"
  });

  assert.equal(result.assets.length, 5);
  assert.equal(startDoc.assets.length, 5);
  assert.equal(startDoc.children[0].assetId, startDoc.children[1].assetId);

  const badgeFiles = result.assets
    .filter((entry) => entry.name === "badge")
    .map((entry) => entry.fileName)
    .sort();
  assert.equal(badgeFiles.length, 2);
  assert.ok(badgeFiles.includes("badge.png"));
  assert.ok(badgeFiles.some((name) => /^badge__[a-f0-9]{6}\.png$/.test(name)));
  assert.ok(startDoc.meta.validation.warnings.some((warning) => warning.includes('Duplicate asset name "badge"')));

  const shared = result.manifest.assets.find((entry) => entry.shared);
  assert.ok(shared);
  assert.equal(shared.src.startsWith("assets/ui/shared/"), true);
  assert.deepEqual(shared.usedBy, ["ShopDialog", "StartDialog"]);

  const local = result.manifest.assets.find((entry) => entry.name === "start_logo");
  assert.equal(local.src, "assets/ui/StartDialog/start_logo.png");
  assert.equal(startDoc.meta.assetStats.sharedAssets, 1);
  assert.equal(shopDoc.meta.assetStats.sharedAssets, 1);
});
