import { Assets, Container } from "pixi.js";
import { FigmaPixiRenderer } from "../../src/runtime/index";
import ui from "./main-menu.ui.json" assert { type: "json" };

export async function mountMainMenu(layer: Container, startGame: () => void) {
  await Assets.load(ui.assets.map((asset) => asset.src));

  const renderer = new FigmaPixiRenderer();
  const view = await renderer.render(ui);
  layer.addChild(view.root);

  view.bind("StartButton", ({ display }) => {
    display.eventMode = "static";
    display.cursor = "pointer";
    display.on("pointertap", startGame);
  });

  return view;
}
