import assert from "node:assert/strict";
import { parseLayerName } from "./layerNameParser.js";

function run(name: string, fn: () => void): void {
  fn();
  console.log(`ok - ${name}`);
}

run("parses @screen", () => {
  const out = parseLayerName("@screen HomeScreen");
  assert.equal(out.cleanName, "HomeScreen");
  assert.equal(out.tags.screen, true);
});

run("parses @dialog + align + modal", () => {
  const out = parseLayerName("@dialog RewardDialog @align(center) @modal");
  assert.equal(out.cleanName, "RewardDialog");
  assert.equal(out.tags.dialog, true);
  assert.equal(out.tags.modal, true);
  assert.equal(out.tags.align, "center");
});

run("parses @raster", () => {
  const out = parseLayerName("@raster header_art");
  assert.equal(out.cleanName, "header_art");
  assert.equal(out.tags.raster, true);
});

run("parses @asset(name)", () => {
  const out = parseLayerName("@raster @asset(icon_coin) Rectangle 42");
  assert.equal(out.cleanName, "Rectangle 42");
  assert.equal(out.tags.raster, true);
  assert.equal(out.tags.assetName, "icon_coin");
});

run("parses @button + align", () => {
  const out = parseLayerName("@button btn_play @align(bottom-center)");
  assert.equal(out.cleanName, "btn_play");
  assert.equal(out.tags.button, true);
  assert.equal(out.tags.align, "bottom-center");
});

run("parses @text", () => {
  const out = parseLayerName("@text txt_coins");
  assert.equal(out.cleanName, "txt_coins");
  assert.equal(out.tags.text, true);
});

run("parses @nine(left,top,right,bottom)", () => {
  const out = parseLayerName("@nine(40,32,40,32) panel_bg");
  assert.equal(out.cleanName, "panel_bg");
  assert.equal(out.tags.nine, true);
  assert.deepEqual(out.nineSlice, {
    left: 40,
    top: 32,
    right: 40,
    bottom: 32
  });
});

run("parses @ignore", () => {
  const out = parseLayerName("@ignore notes");
  assert.equal(out.cleanName, "notes");
  assert.equal(out.tags.ignore, true);
});
