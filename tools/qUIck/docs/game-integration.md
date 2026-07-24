# qUIck Game Integration

qUIck has two sides:

- `figma-plugin/` exports UI JSON plus PNG assets from Figma.
- `packages/pixi-runtime/` renders the exported JSON in a PixiJS v8 game.

## Ship The Toolkit

From this repo:

```bash
npm run ship -- "C:\Path\To\Game Project"
```

By default this copies qUIck into:

```text
<Game Project>/tools/qUIck
```

The ship script skips dependency folders and generated build output, but keeps source, examples, docs, and the loadable Figma plugin files.

## Load The Figma Plugin

1. Run `npm run build:figma-plugin` after changing `figma-plugin/code.ts`.
2. In Figma, choose `Plugins > Development > Import plugin from manifest`.
3. Select `figma-plugin/manifest.json`.

The plugin UI is `figma-plugin/ui.html`; the plugin entrypoint is the built `figma-plugin/code.js`.

## Export Layout

A game should serve exports from:

```text
public/generated-ui/<ScreenName>.json
public/generated-ui/assets/ui/<ScreenName>/*.png
```

If an exported asset path is `assets/ui/StartDialog/panel.png`, the file should exist at:

```text
public/generated-ui/assets/ui/StartDialog/panel.png
```

## Runtime Option A: Vite Source Aliases

This is the easiest while actively editing qUIck in a game repo. Adjust the `../tools/qUIck` path based on where the game's Vite config lives.

```ts
import { fileURLToPath, URL } from "node:url";

export default {
  resolve: {
    alias: {
      "@figma-pixi/shared": fileURLToPath(new URL("../tools/qUIck/packages/shared/src/index.ts", import.meta.url)),
      "@figma-pixi/pixi-runtime": fileURLToPath(new URL("../tools/qUIck/packages/pixi-runtime/src/index.ts", import.meta.url))
    }
  }
};
```

## Runtime Option B: File Dependencies

Use this when the game should consume built package output.

```json
{
  "dependencies": {
    "@figma-pixi/shared": "file:tools/qUIck/packages/shared",
    "@figma-pixi/pixi-runtime": "file:tools/qUIck/packages/pixi-runtime"
  }
}
```

Build qUIck before building the game:

```bash
npm run build --prefix tools/qUIck
```

## Minimal Pixi Usage

```ts
import { UIFactory } from "@figma-pixi/pixi-runtime";
import type { UIExport } from "@figma-pixi/shared";

const response = await fetch("/generated-ui/StartDialog.json");
const exportData = (await response.json()) as UIExport;
const factory = new UIFactory({ assetBasePath: "/generated-ui" });

await factory.loadAssets(exportData);
const screen = await factory.createScreen(exportData);

screen.getButton("btn_start")?.onClick(() => {
  // Bind game behavior here.
});

screen.resize(390, 844);
stage.addChild(screen);
```

Root Run also has a game-specific adapter around qUIck under `client/src/game/ui/quick` plus atlas tooling in `client/scripts/build-ui-editor-assets.mjs`. Bring that adapter into another game only if that game wants the same atlas cache and preview URL behavior.
