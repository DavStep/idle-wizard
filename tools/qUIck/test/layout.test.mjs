import assert from "node:assert/strict";
import test from "node:test";
import { Rectangle, Texture } from "pixi.js";
import { createRuntimePlan, hexToNumber } from "../dist/runtime/layout.js";
import { FigmaPixiRenderer } from "../dist/runtime/renderer.js";

test("createRuntimePlan preserves layout and resolves assets", () => {
  const assets = new Map([
    [
      "button",
      {
        id: "button",
        src: "assets/button.png",
        width: 100,
        height: 40,
        scale: 1
      }
    ]
  ]);

  const plan = createRuntimePlan(
    {
      id: "start",
      name: "StartButton",
      type: "sprite",
      x: 50,
      y: 70,
      width: 100,
      height: 40,
      alpha: 0.75,
      assetId: "button"
    },
    assets
  );

  assert.equal(plan.x, 50);
  assert.equal(plan.y, 70);
  assert.equal(plan.alpha, 0.75);
  assert.equal(plan.asset.src, "assets/button.png");
});

test("createRuntimePlan fails fast on missing asset references", () => {
  assert.throws(
    () =>
      createRuntimePlan(
        {
          id: "panel",
          name: "Panel",
          type: "nineSlice",
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          assetId: "missing",
          insets: {
            left: 16,
            top: 16,
            right: 16,
            bottom: 16
          }
        },
        new Map()
      ),
    /Missing asset/
  );
});

test("hexToNumber converts CSS hex colors for Pixi APIs", () => {
  assert.equal(hexToNumber("#ffcc00"), 0xffcc00);
  assert.equal(hexToNumber("102030"), 0x102030);
});

test("renderer places exported children inside the document content container", async () => {
  const renderer = new FigmaPixiRenderer();
  const view = await renderer.render({
    version: "1.0.0",
    name: "ScreenWithContent",
    kind: "screen",
    designSize: { width: 390, height: 844 },
    scaleMode: "fit",
    safeArea: { x: 0, y: 0, width: 390, height: 844 },
    contentBounds: { x: 24, y: 32, width: 342, height: 780 },
    padding: { left: 24, right: 24, top: 32, bottom: 32 },
    children: [
      {
        id: "panel",
        name: "Panel",
        type: "container",
        x: 0,
        y: 0,
        width: 342,
        height: 780,
        children: []
      }
    ],
    assets: []
  });

  assert.equal(view.root.children.length, 1);
  const contentRoot = view.root.children[0];
  assert.equal(contentRoot.x, 24);
  assert.equal(contentRoot.y, 32);
  assert.equal(contentRoot.children[0].x, 0);
  assert.equal(contentRoot.children[0].y, 0);
});

test("renderer treats zero top and bottom margins as a horizontal 3-slice", async () => {
  const renderer = new FigmaPixiRenderer({
    textureResolver: () =>
      new Texture({
        source: Texture.WHITE.source,
        frame: new Rectangle(0, 0, 15, 6),
        orig: new Rectangle(0, 0, 15, 6)
      })
  });

  const view = await renderer.render({
    version: "1.0.0",
    name: "HorizontalOnlyNineSlice",
    kind: "screen",
    designSize: { width: 30, height: 10 },
    scaleMode: "fit",
    safeArea: { x: 0, y: 0, width: 30, height: 10 },
    children: [
      {
        id: "panel",
        name: "Panel",
        type: "nineSlice",
        x: 0,
        y: 0,
        width: 18,
        height: 6,
        assetId: "panel-asset",
        slice: {
          left: 4,
          top: 0,
          right: 3,
          bottom: 0
        }
      }
    ],
    assets: [
      {
        id: "panel-asset",
        src: "assets/panel.png",
        width: 15,
        height: 6,
        scale: 1
      }
    ]
  });

  const rendered = view.get("panel");
  assert.ok(rendered);
  assert.equal(rendered.display.children.length, 3);

  const [leftCap, center, rightCap] = rendered.display.children;
  assert.equal(leftCap.width, 4);
  assert.equal(leftCap.height, 6);
  assert.equal(center.x, 4);
  assert.equal(center.width, 11);
  assert.equal(center.height, 6);
  assert.equal(rightCap.x, 15);
  assert.equal(rightCap.width, 3);
  assert.equal(rightCap.height, 6);
});
