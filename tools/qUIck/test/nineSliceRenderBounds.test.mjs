import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = path.resolve("tmp", "nine-slice-render-bounds-test");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await writeFile(path.join(outdir, "package.json"), '{"type":"module"}\n');

await build({
  entryPoints: ["src/exporter/figmaExporter.ts"],
  outfile: path.join(outdir, "figmaExporter.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  logLevel: "silent"
});

globalThis.figma = { mixed: Symbol("mixed") };
const { exportFigmaSelectionToPixiUI } = await import(
  pathToFileURL(path.join(outdir, "figmaExporter.js")).href
);

function transform(x, y, scale = 1) {
  return [
    [scale, 0, x],
    [0, scale, y]
  ];
}

test("@nine export uses rendered-pixel bounds instead of the configured group box", () => {
  const root = {
    id: "root",
    name: "@screen Test",
    type: "FRAME",
    parent: null,
    width: 400,
    height: 300,
    absoluteBoundingBox: { x: 100, y: 100, width: 400, height: 300 },
    absoluteRenderBounds: { x: 100, y: 100, width: 400, height: 300 },
    absoluteTransform: transform(100, 100),
    relativeTransform: transform(100, 100),
    visible: true,
    opacity: 1,
    rotation: 0,
    itemReverseZIndex: false,
    children: []
  };
  const nine = {
    id: "nine",
    name: "@nine Panel",
    type: "GROUP",
    parent: root,
    width: 200,
    height: 100,
    absoluteBoundingBox: { x: 120, y: 130, width: 200, height: 100 },
    absoluteRenderBounds: { x: 132, y: 139, width: 150, height: 72 },
    absoluteTransform: transform(120, 130, 2),
    relativeTransform: transform(20, 30, 2),
    visible: true,
    opacity: 1,
    rotation: 15,
    getPluginData() {
      return "";
    }
  };
  root.children.push(nine);

  const exported = exportFigmaSelectionToPixiUI(root, {
    useParentFrameAsCanvas: false,
    assetScale: 1
  });
  const node = exported.document.children[0];
  const asset = exported.document.assets[0];

  assert.equal(exported.document.scaleMode, "fitWidth");
  assert.equal(node.type, "nineSlice");
  assert.deepEqual(
    { x: node.x, y: node.y, width: node.width, height: node.height },
    { x: 32, y: 39, width: 150, height: 72 }
  );
  assert.equal(node.rotation, 0);
  assert.equal(node.scaleX, undefined);
  assert.equal(node.scaleY, undefined);
  assert.deepEqual(node.slice, { left: 24, top: 18, right: 24, bottom: 18 });
  assert.deepEqual(
    { width: asset.width, height: asset.height },
    { width: 150, height: 72 }
  );
  assert.deepEqual(node.debug.figmaSize, { width: 200, height: 100 });
  assert.deepEqual(node.debug.exportedSize, { width: 150, height: 72 });
});

test("dialog exports remain fully fitted", () => {
  const root = {
    id: "dialog-root",
    name: "@dialog Test",
    type: "FRAME",
    parent: null,
    width: 1080,
    height: 2400,
    absoluteBoundingBox: { x: 0, y: 0, width: 1080, height: 2400 },
    absoluteRenderBounds: { x: 0, y: 0, width: 1080, height: 2400 },
    absoluteTransform: transform(0, 0),
    relativeTransform: transform(0, 0),
    visible: true,
    opacity: 1,
    rotation: 0,
    itemReverseZIndex: false,
    children: []
  };

  const exported = exportFigmaSelectionToPixiUI(root, {
    useParentFrameAsCanvas: false
  });

  assert.equal(exported.document.scaleMode, "fit");
});

test("@nine export fails visibly when the layer has no rendered pixels", () => {
  const root = {
    id: "root-empty",
    name: "@screen Empty",
    type: "FRAME",
    parent: null,
    width: 100,
    height: 100,
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    absoluteRenderBounds: { x: 0, y: 0, width: 100, height: 100 },
    absoluteTransform: transform(0, 0),
    relativeTransform: transform(0, 0),
    visible: true,
    opacity: 1,
    rotation: 0,
    children: []
  };
  const nine = {
    id: "nine-empty",
    name: "@nine Empty panel",
    type: "GROUP",
    parent: root,
    width: 80,
    height: 40,
    absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 40 },
    absoluteRenderBounds: null,
    absoluteTransform: transform(10, 10),
    relativeTransform: transform(10, 10),
    visible: true,
    opacity: 1,
    rotation: 0,
    getPluginData() {
      return "";
    }
  };
  root.children.push(nine);

  assert.throws(
    () => exportFigmaSelectionToPixiUI(root, { useParentFrameAsCanvas: false }),
    /has no visible rendered pixels/
  );
});
