# qUIck UI Toolkit Project Handoff

This document is meant to be handed to another ChatGPT thread so it can understand and continue work on this project without rediscovering the whole repository.

qUIck is a portable Figma-to-Pixi UI toolkit. Artists/designers create UI screens in Figma, tag layers with qUIck naming conventions, export JSON plus PNG assets with a Figma plugin, and a PixiJS game loads the JSON/assets at runtime.

## Quick Facts

- Repo path in this workspace: `C:\Users\User\Documents\quick`
- Project name: `quick-ui-toolkit`
- Node requirement: Node `>=20`
- Main runtime target: PixiJS v8
- Package manager: npm workspaces
- Main app/example: `example-pixi-project`
- Loadable Figma plugin bundle: `figma-plugin/manifest.json`, `figma-plugin/code.js`, `figma-plugin/ui.html`
- Current package runtime: `packages/pixi-runtime`
- Shared schema/parser package: `packages/shared`
- Legacy/reference exporter/runtime code: `src`

## Repository Map

```text
README.md
docs/
  game-integration.md
  PROJECT_HANDOFF.md
figma-plugin/
  manifest.json
  code.ts
  code.js
  ui.html
packages/
  shared/
    src/schema.ts
    src/layerNameParser.ts
  pixi-runtime/
    src/uiFactory.ts
    src/uiScreen.ts
    src/uiButton.ts
    src/layout/*
  figma-plugin/
    src/exporter.ts
    src/pluginMain.ts
src/
  schema.ts
  exporter/*
  runtime/*
example-pixi-project/
  src/main.ts
  public/generated-ui/*.json
  public/assets/ui/*
examples/
  basic/*
scripts/
  ship-to-game.mjs
  start-example-dev.mjs
test/
  nineSliceAutoDetection.test.mjs
  layout.test.mjs
```

There are two important implementation tracks:

1. `packages/*` is the package-based version intended for clean workspace imports.
2. Root-level `figma-plugin/` plus `src/exporter/*` is the richer loadable Figma plugin path currently used by the Figma manifest. This path includes advanced nine-slice auto-detection, PNG asset dedupe, ZIP download, and nine-slice compaction.

When debugging what the actual Figma plugin does, inspect `figma-plugin/code.ts`, `figma-plugin/ui.html`, and `src/exporter/*` first. The package under `packages/figma-plugin` is simpler and does not contain all advanced UI/ZIP behavior.

## Install, Build, Dev

From repo root:

```bash
npm install
npm run build
npm run typecheck
npm run dev
```

Important scripts from root `package.json`:

- `npm run build`: runs package build and then builds the root loadable Figma plugin.
- `npm run build:packages`: runs `tsc -b` across workspace references.
- `npm run build:figma-plugin`: runs the build in root `figma-plugin/`.
- `npm run dev`: starts the example Pixi project through the workspace.
- `npm run dev:background`: starts the example Vite dev server detached and logs to `quick-vite.out.log` / `quick-vite.err.log`.
- `npm run ship -- "C:\Path\To\Game Project"`: copies qUIck into a game project under `tools/qUIck` by default.

The example Vite project runs on:

```text
http://127.0.0.1:5181/
```

The example app supports query params:

- `?ui=StartDialog` or `?ui=main-game` to choose an export JSON from `public/generated-ui`.
- `?debug=1` to enable runtime debug logging and bounds/name overlays.

## Package Relationships

### `packages/shared`

Exports:

- `schema.ts`: current runtime-facing types such as `UIExport`, `UINode`, `UINineSliceNode`, `UIButtonNode`, `UITextNode`, `UIAlign`.
- `layerNameParser.ts`: parses Figma layer names and strips qUIck tags.

Current shared schema uses:

```ts
export interface UIExport {
  version: number;
  name: string;
  kind: "screen" | "dialog" | "hud" | "component";
  designSize: { width: number; height: number };
  scaleMode: "fit" | "fitWidth" | "fitHeight" | "cover" | "none";
  safeArea?: UIRect;
  contentBounds?: UIRect;
  padding?: UIPadding;
  modal?: boolean;
  align?: UIAlign;
  children: UINode[];
  assets: UIAssetRef[];
}
```

Generated JSON in `example-pixi-project/public/generated-ui` often comes from the root/legacy exporter and uses `"version": "1.0.0"`. The package `UIFactory` does not strictly validate the version, so it can consume these generated exports. The legacy `FigmaPixiRenderer` in `src/runtime` does validate against string version `"1.0.0"`.

### `packages/pixi-runtime`

Exports:

- `UIFactory`
- `UIScreen`
- `UIDialog`
- `UIButton`

This is the main runtime a game should use. It converts exported JSON into Pixi v8 containers, sprites, text, buttons, overlays, and nine-slice display objects.

### `packages/figma-plugin`

Contains a package-oriented Figma exporter and plugin entrypoint. It can export selected roots and includes a simple nine-slice panel. It is not as feature-rich as the root `figma-plugin/` loadable bundle.

### Root `figma-plugin`

This is what Figma loads through `figma-plugin/manifest.json`.

- `manifest.json` points to `code.js` and `ui.html`.
- `code.ts` is bundled by esbuild to `code.js`.
- `ui.html` contains the plugin UI, JSZip-based ZIP download, nine-slice preview, auto-detection, and PNG compaction logic.

Build it with:

```bash
npm run build:figma-plugin
```

Then in Figma:

```text
Plugins > Development > Import plugin from manifest > figma-plugin/manifest.json
```

## Layer Tag System

Layer names are parsed with regex tags like `@tag` or `@tag(args)`. Tags are stripped from exported node names.

Supported root kind tags:

- `@screen`
- `@dialog`
- `@hud`
- `@component`

Behavior tags:

- `@modal`: marks root export as modal.
- `@container`: exports a node as a logical container and recursively exports children.
- `@button`: exports as a button container with `hitArea: { x: 0, y: 0, width, height }`.
- `@raster`: forces PNG-backed raster output.
- `@image`: exports a PNG-backed image node.
- `@text`: exports structured text. If applied to a wrapper, the wrapper must contain exactly one visible text descendant.
- `@overlay`: exports a colored opacity overlay.
- `@nine`: exports as a nine-slice image node.
- `@nine(left,top,right,bottom)`: legacy inline/manual nine-slice values.
- `@ignore`: skips the layer and descendants.
- `@align(value)`: enables runtime alignment/resizing behavior.

Supported alignment values:

```text
center
top
bottom
left
right
top-left
top-center
top-right
bottom-left
bottom-center
bottom-right
left-center
right-center
stretch-width
stretch-height
stretch-full
```

Special legacy/root exporter helper:

- A layer named exactly `@content` defines root `contentBounds` and `padding`. It is used for layout metadata and is not exported as a visible node.

Example names:

```text
@dialog StartDialog
@hud main-game
@button btn_start
@text txt_start
@nine dialog_bg
@nine(40,32,40,32) panel_bg
@container bottom @align(center)
@raster icon_close
@ignore notes
```

## Exported JSON Shape

Generated exports contain a root document:

```json
{
  "version": "1.0.0",
  "name": "StartDialog",
  "kind": "dialog",
  "designSize": { "width": 1080, "height": 2122 },
  "scaleMode": "fit",
  "safeArea": { "x": 0, "y": 0, "width": 1080, "height": 2122 },
  "contentBounds": { "x": 40, "y": 547, "width": 1000, "height": 1283 },
  "padding": { "left": 40, "top": 547, "right": 40, "bottom": 292 },
  "modal": false,
  "children": [],
  "assets": [],
  "meta": {
    "source": "figma",
    "exportedRootId": "67:287",
    "validation": { "warnings": [], "errors": [] }
  }
}
```

Common node fields:

```json
{
  "id": "btn_start__67_311",
  "name": "btn_start",
  "type": "button",
  "x": 308,
  "y": 1415,
  "width": 464,
  "height": 217,
  "rotation": 0,
  "alpha": 1,
  "visible": true,
  "align": "bottom-center",
  "debug": {},
  "children": []
}
```

Asset-backed nodes use:

```json
{
  "type": "raster",
  "assetId": "asset-1a8960b7-15268",
  "asset": "assets/ui/StartDialog/asset-1a8960b7.png"
}
```

Text nodes use:

```json
{
  "type": "text",
  "text": "Start",
  "style": {
    "fontFamily": "Lilita One",
    "fontSize": 86,
    "fontWeight": "Regular",
    "fill": "#ffffff",
    "stroke": "#0a0a0a",
    "strokeWidth": 8,
    "align": "center",
    "wrap": true,
    "wordWrapWidth": 188
  }
}
```

Nine-slice nodes use:

```json
{
  "type": "nineSlice",
  "assetId": "asset-4827cb46-10007",
  "asset": "assets/ui/StartDialog/asset-4827cb46.png",
  "slice": { "left": 77, "top": 170, "right": 77, "bottom": 91 },
  "textureSlice": { "left": 77, "top": 170, "right": 77, "bottom": 91 },
  "assetOptimization": {
    "type": "nineSliceCompact",
    "enabled": true,
    "sourceWidth": 977,
    "sourceHeight": 1152,
    "textureWidth": 155,
    "textureHeight": 262,
    "compactCenterWidth": 1,
    "compactCenterHeight": 1,
    "assetScale": 1
  }
}
```

`slice` is the design-space slice metadata. `textureSlice` is the actual slice to use against the final PNG texture. Usually they match when `assetScale` is 1; they become especially important when assets are compacted or exported at a different scale.

Assets are listed in `assets`:

```json
{
  "id": "asset-4827cb46-10007",
  "src": "assets/ui/StartDialog/asset-4827cb46.png",
  "width": 155,
  "height": 262,
  "scale": 1,
  "mimeType": "image/png"
}
```

## Figma Export Flow

Root plugin export path:

1. User selects one Figma root node, or multiple root nodes tagged `@screen`, `@dialog`, `@hud`, or `@component`.
2. UI sends `exportSelection` from `figma-plugin/ui.html`.
3. `figma-plugin/code.ts` validates selection.
4. `prepareAutoNineSliceNodes(selection)` walks visible `@nine` nodes and prepares auto/default nine-slice metadata when needed.
5. `exportFigmaSelectionToPixiUI(selection, options)` from `src/exporter/figmaExporter.ts` converts Figma nodes into a `FigmaPixiDocument` plus `assetRequests`.
6. `figma-plugin/code.ts` fulfills each `assetRequest` by calling Figma `exportAsync`.
7. Exported PNG bytes are deduplicated by hash.
8. UI receives `export-complete` with one document or a `documents` bundle plus canonical asset bytes.
9. User can download a ZIP. During ZIP download, nine-slice PNGs may be compacted, then assets are globally finalized again so shared/local paths match the final bytes.

The plugin UI has:

- `assetBasePath`: default `assets/ui`.
- `assetScale`: default `1`.
- `Optimize ninepatch assets`: default checked.
- `Stretch sample pixels`: default `1`.
- Ninepatch panel with preview, left/top/right/bottom inputs, `Recalculate`, `Save Override`, and `Use Auto`.
- `Export Selection` and `Download Export ZIP`.

The single-root ZIP layout is:

```text
generated-ui/<ExportName>.json
assets/ui/<ExportName>/*.png
assets/ui/manifest.json
```

The multi-root bundle ZIP layout is:

```text
generated-ui/StartDialog.json
generated-ui/ShopDialog.json
generated-ui/InventoryDialog.json
assets/ui/shared/*.png
assets/ui/StartDialog/*.png
assets/ui/ShopDialog/*.png
assets/ui/InventoryDialog/*.png
assets/ui/manifest.json
```

In the example Vite project, the JSON files live under:

```text
example-pixi-project/public/generated-ui/*.json
```

and asset URLs in the JSON resolve under:

```text
example-pixi-project/public/assets/ui/<ExportName>/*.png
```

The docs mention `public/generated-ui/assets/ui/...` as an alternative hosting layout. The package runtime has asset path fallback candidates to handle some common extra-folder path mismatches.

## Asset Export Details

The root legacy exporter does not directly export bytes. It registers asset requests:

- `registerAsset` in `src/exporter/figmaExporter.ts`
- Initial asset id: `asset-${stableId(node.id)}`
- Initial semantic asset name from `src/exporter/assetNaming.ts`
- Explicit readable filename override: `@asset(name)`
- Initial src: `${assetBasePath}/${normalizeRootName(rootName)}/${fileName}`
- Asset dimensions: Figma bounds multiplied by `assetScale`

Then `figma-plugin/code.ts` performs PNG export:

```ts
node.exportAsync({
  format: "PNG",
  useAbsoluteBounds: false,
  constraint: {
    type: "SCALE",
    value: request.scale
  }
})
```

After exporting bytes, qUIck finalizes assets with content-hash identity and semantic filenames. The content hash remains the source of truth:

- Canonical asset id: `asset-${hash}-${bytes.length}`
- Canonical filename: readable semantic base such as `dialog_bg.png`, `btn_green.png`, or `icon_coin.png`
- Document node `assetId` fields are remapped.
- Manifest `assets` are replaced with the deduped list.

Semantic naming rules:

- `@asset(name)` wins, for example `@raster @asset(icon_coin) Rectangle 42` becomes `icon_coin.png`.
- Component/main component names are preferred when available.
- qUIck tags such as `@nine`, `@raster`, `@image`, `@button`, and `@align(...)` are stripped before sanitizing.
- Generic Figma names such as `Rectangle`, `Group`, `Frame`, `Vector`, and numbered variants get parent/root context or a deterministic fallback.
- If the same readable name maps to different PNG bytes, later files receive a deterministic short hash suffix such as `icon_coin__a83f21.png`, and a validation warning is added.
- If different readable names map to identical PNG bytes, only one PNG is written and aliases may be recorded in metadata/warnings.

ZIP download runs nine-slice compaction first, then performs a global finalization pass across one or more exported documents. In bundle mode, assets reused by 2+ exported roots are written once under:

```text
assets/ui/shared/<semantic_name>.png
```

Assets used by one root stay local:

```text
assets/ui/<RootName>/<semantic_name>.png
```

The ZIP also writes:

```text
assets/ui/manifest.json
```

Each exported JSON receives `meta.assetStats` with total referenced, unique, shared, and local asset counts.

The package exporter in `packages/figma-plugin/src/exporter.ts` is similar but exports bytes inside the exporter and uses slightly different ids:

- `asset_${hash}_${bytes.length}`
- `${cleanFileName(nodeName)}_${hash}.png`

## Nine-Slice Overview

Nine-slice is the most important specialized feature in the project.

The goal is to let panels/buttons scale in Pixi without stretching fixed corners, borders, shadows, or cap details. qUIck supports:

- Full nine-slice: left, top, right, bottom are all meaningful.
- Horizontal three-slice: top and bottom are `0`, so only left cap, center stretch, and right cap are used. This is for pill/capsule buttons and horizontal badges.
- Vertical-only detection is recognized as a candidate but not emitted, because the runtime only supports full nine-slice and horizontal three-slice. It falls back to safe defaults with a warning.

### Nine-Slice Metadata

Stored Figma plugin data key:

```text
nineSlice
```

Algorithm version:

```text
safe-zone-v2
```

Metadata shape:

```ts
interface NineSliceMetadata {
  source: "manual" | "auto" | "default";
  approved: boolean;
  confidence?: number;
  insets: { left: number; top: number; right: number; bottom: number };
  assetHash?: string;
  algorithmVersion?: string;
  mode?: "nineSlice" | "horizontalThreeSlice" | "verticalThreeSliceCandidate" | "fallback";
  warnings?: string[];
  debug?: Record<string, unknown>;
  generatedAt?: number;
}
```

### Slice Priority

`resolveNineSliceMetadata` in `src/exporter/nineSlice.ts` decides which slice is used:

1. Stored plugin metadata with `source: "manual"` wins.
2. Inline layer name values from `@nine(left,top,right,bottom)` are used next.
3. Stored auto metadata is used if `source: "auto"` and `algorithmVersion === "safe-zone-v2"`.
4. Stored default metadata is used if present.
5. Otherwise qUIck creates a safe default slice.

Auto-detection is skipped if a node already has a manual override or inline `@nine(...)` values.

### Safe Default Slice

`createSafeDefaultNineSlice(width, height)`:

- Uses about 8 percent of width/height.
- Clamps base values between `24` and `96`.
- For small width `< 200`, side max is `width * 0.25`.
- For small height `< 100`, vertical max is `height * 0.25`.
- Ensures `left + right <= width - 1`.
- Ensures `top + bottom <= height - 1`.

This gives safe, non-crashing insets when auto-detection cannot run or is low confidence.

### Selection Preview and Manual Override

When a selected layer is tagged `@nine`, `figma-plugin/code.ts` sends selection info to the UI:

- node id
- raw/clean name
- width/height
- stored metadata
- inline layer-name metadata
- resolved metadata
- current slice

The plugin exports a preview PNG at max side `512` pixels using `computePreviewScale`. Preview bytes are cached by node id, size, and preview scale. The UI draws the preview with guide lines and lets the user edit left/top/right/bottom.

Buttons:

- `Recalculate`: runs the auto detector on the preview image and applies/stores auto metadata.
- `Save Override`: stores manual metadata with `source: "manual"` and `approved: true`.
- `Use Auto`: returns to last auto/default metadata or a safe default.

Manual save posts `saveNineSlice`; code.ts validates and sanitizes values before writing plugin data.

### Auto-Detection Algorithm

The auto detector lives in `figma-plugin/ui.html`.

Entrypoints:

- `buildAutoMetadataFromImage(image, width, height, assetHash, nodeName)`
- `buildAutoMetadataFromRgba(data, sourceWidth, sourceHeight, width, height, assetHash, nodeName)`

Important constants:

```js
AUTO_NINE_SLICE_ALGORITHM_VERSION = "safe-zone-v2"
NINE_SLICE_VISUAL_ALPHA_THRESHOLD = 4
NINE_SLICE_SOLID_ALPHA_THRESHOLD = 64
NINE_SLICE_DETAIL_ALPHA_THRESHOLD = 12
NINE_SLICE_MIN_CONFIDENCE = 0.58
```

High-level process:

1. Decode preview PNG into RGBA.
2. Build pixel features:
   - alpha per pixel
   - luminance per pixel
   - alpha-aware gradient/detail score
   - visible bounds based on alpha threshold
3. Build axis safety for x and y:
   - visible spans
   - solid spans
   - mass per line
   - detail per line
   - transition score between adjacent lines
   - smoothed line scores
4. Compute thresholds from line score statistics:
   - median
   - median absolute deviation
   - percentiles
   - safe and unsafe thresholds
5. Estimate stable shape protection around the center to avoid cutting through rounded corners, shadows, borders, and caps.
6. Find the safest horizontal and vertical stretch bands.
7. Apply symmetry preference when the shape is nearly symmetric.
8. Compute localized detail guards by finding connected high-detail components. These guard against icons, shine marks, decorations, labels, and asymmetric cap detail being placed inside stretch regions.
9. Choose mode:
   - Full `nineSlice` by default.
   - `horizontalThreeSlice` for wide pill/capsule shapes or localized cap detail where only horizontal stretching is safe.
   - fallback for unsupported vertical-only cases.
10. Map detected bands from preview pixel coordinates back to design-space insets.
11. Validate the detected slice:
   - finite and non-negative values
   - fixed borders do not consume the full width/height
   - selected guide lines do not cross high-detail pixels
   - warn if stretch region is narrow or confidence is modest
12. If confidence is below `0.58`, return safe default metadata with warnings.

Tests in `test/nineSliceAutoDetection.test.mjs` cover:

- rounded panel corners and borders
- horizontal-only pill buttons
- shadows and glows
- localized cap shine marks
- asymmetric fixed artwork
- smooth gradient centers
- tiny fallback assets
- unsupported vertical-only candidates

### Exporting Nine-Slice Nodes

In `src/exporter/figmaExporter.ts`, `convertNode` handles `tags.nine`:

1. Read stored plugin metadata.
2. Read inline `@nine(...)` metadata.
3. Resolve metadata priority.
4. Push warnings for auto/default/manual layer-name slices.
5. Register the node as a PNG asset.
6. Return a node:

```json
{
  "type": "nineSlice",
  "assetId": "asset-...",
  "asset": "assets/ui/<Root>/asset-....png",
  "slice": { "left": 87, "top": 74, "right": 90, "bottom": 105 }
}
```

The richer `textureSlice` and `assetOptimization` fields are added later during ZIP download if PNG compaction succeeds.

### Nine-Slice PNG Compaction

Compaction lives in `figma-plugin/ui.html`:

- `optimizeNineSliceAssetsForZip`
- `compactNineSlicePng`
- `validateNineSliceForCompaction`

It runs only when downloading the ZIP and `Optimize ninepatch assets` is checked. The raw `export-complete` payload contains full-size exported PNGs; the downloaded ZIP may contain compacted PNGs and an updated JSON document.

Compaction process:

1. Walk document nodes and map each `nineSlice` node by `assetId`.
2. For each nine-slice asset, decode the PNG.
3. Validate slice values against node size and source PNG size.
4. Convert design slice values to texture pixels using `asset.scale`.
5. If top and bottom are `0`, treat it as horizontal-only.
6. Create a compact output canvas:
   - Full nine-slice width: `leftPx + samplePixels + rightPx`
   - Full nine-slice height: `topPx + samplePixels + bottomPx`
   - Horizontal-only width: `leftPx + samplePixels + rightPx`
   - Horizontal-only height: full source height
7. Draw the fixed regions and a sampled stretch center into the compact canvas:
   - Horizontal-only draws left cap, center sample, right cap.
   - Full nine-slice draws all nine regions.
8. Encode the canvas back to PNG bytes.
9. Replace the asset bytes in the ZIP.
10. Update JSON:
   - `asset.width`
   - `asset.height`
   - `node.textureSlice`
   - `node.assetOptimization`

Example optimized node:

```json
"assetOptimization": {
  "type": "nineSliceCompact",
  "enabled": true,
  "sourceWidth": 1000,
  "sourceHeight": 1219,
  "textureWidth": 269,
  "textureHeight": 183,
  "compactCenterWidth": 1,
  "compactCenterHeight": 1,
  "assetScale": 1
}
```

If compaction fails, the ZIP falls back to the full-size PNG and appends a warning to `doc.meta.validation.warnings`.

The default `Stretch sample pixels` is `1`. This gives maximum savings but may be risky if the stretch region contains gradients, patterns, text, icons, or decoration. The plugin appends warnings when sample pixels are `1`.

## Runtime Build Flow

The package runtime is centered on `UIFactory` in `packages/pixi-runtime/src/uiFactory.ts`.

Typical game usage:

```ts
import { UIFactory } from "@figma-pixi/pixi-runtime";
import type { UIExport } from "@figma-pixi/shared";

const response = await fetch("/generated-ui/StartDialog.json");
const exportData = (await response.json()) as UIExport;

const factory = new UIFactory({ assetBasePath: "" });
await factory.loadAssets(exportData);

const screen = await factory.createScreen(exportData);
screen.resize(app.screen.width, app.screen.height);
app.stage.addChild(screen);

screen.getButton("btn_start")?.onClick(() => {
  console.log("start clicked");
});
```

In `example-pixi-project/src/main.ts`, the factory loads a requested JSON file, creates the screen/dialog, adds it to the stage, binds buttons, and resizes on window resize.

### Asset Loading

`UIFactory.loadAssets(exportData)`:

1. Normalizes legacy data if needed.
2. Builds a manifest map by asset id.
3. Collects all asset ids referenced by nodes.
4. Resolves `asset.src` through `assetBasePath` unless the src is absolute.
5. Tries fallback asset path candidates for common extra-folder mismatches.
6. Loads assets with Pixi `Assets.load`.
7. Caches loaded textures by `assetId` using `Assets.cache.set(assetId, loaded)`.

`UIFactory.loadAssetsBundle(exports)` loads assets for multiple exported UI JSON documents in one pass:

- Normalizes every export.
- Collects all asset refs by `asset.id`.
- Deduplicates repeated IDs before loading.
- Skips any asset ID already present in Pixi `Assets.cache`.
- Uses the same fallback path logic as `loadAssets(exportData)`.

If assets are missing, the runtime logs warnings. Missing assets render as a magenta placeholder box with diagonals.

### Node Construction

`UIFactory.createScreen(exportData)`:

1. Waits up to 1.5 seconds for `document.fonts.ready`.
2. Normalizes export data.
3. Resolves content bounds from `contentBounds` or `padding`.
4. Creates a root `Container` and a `layoutRoot`.
5. Creates `UIDialog` if `kind === "dialog"`, otherwise `UIScreen`.
6. Recursively creates every child node.
7. Registers nodes by id and name for lookup.
8. Registers layout metadata for alignment/resizing.

Node creation:

- `container` and `dialog`: Pixi `Container`
- `raster` and `image`: Pixi `Sprite`
- `text`: Pixi `Text`
- `button`: custom `UIButton`
- `overlay`: Pixi `Graphics`
- `nineSlice`: Pixi `NineSliceSprite` or custom `HorizontalThreeSliceSprite`

### Runtime Nine-Slice Rendering

`createNineSliceOrPlaceholder` uses:

```ts
const slice = node.textureSlice ?? node.slice;
```

If `slice.top === 0 && slice.bottom === 0`, the runtime creates `HorizontalThreeSliceSprite`. This custom class:

- Slices the source texture into left, center, and right textures.
- Keeps the left cap fixed.
- Stretches the center horizontally.
- Keeps the right cap fixed and anchored to the right edge.
- Stretches the whole height to `node.height`.

Otherwise it creates Pixi v8 `NineSliceSprite`:

```ts
new NineSliceSprite({
  texture,
  leftWidth: slice.left,
  topHeight: slice.top,
  rightWidth: slice.right,
  bottomHeight: slice.bottom
})
```

Then it sets:

```ts
panel.width = node.width;
panel.height = node.height;
```

For compacted assets, `textureSlice` must be used because the PNG no longer has the original full-size center. This is why compaction writes both `textureSlice` and `assetOptimization`.

### Text Rendering

Text nodes become Pixi `Text` with:

- font family plus fallbacks: `Arial`, `Helvetica`, `sans-serif`
- font size
- font weight normalized from names/numbers
- style fill or color
- stroke and stroke width
- line height
- letter spacing
- word wrap for fixed-width Figma text boxes

The runtime warns if:

- text is empty
- width/height is zero
- font is not available through `document.fonts.check`
- text has non-uniform scale
- invalid text align or auto-resize values are encountered

For fixed-width text, it applies horizontal/vertical box alignment by offsetting the rendered Pixi text inside the exported text box.

### Buttons

`UIButton` extends Pixi `Container`.

Behavior:

- `eventMode = "static"`
- cursor pointer when enabled
- hover alpha `0.92`
- pressed alpha `0.82`
- disabled alpha `0.55`
- `onClick(callback)` binds `pointertap`
- `setEnabled(enabled)` toggles event mode and alpha
- `setHitArea(x, y, width, height)` sets a Pixi `Rectangle`

Exported `@button` nodes are containers. Children are still rendered normally inside the button container.

### Layout and Resize

`UIScreen.resize(width, height, safeArea?)`:

1. Resolves root scale with `scaleMode`.
2. Positions root content with root `align` if present, otherwise center-fit offsets.
3. Resolves safe area:
   - explicit resize safeArea if provided
   - viewport safe area when explicit align is used and exported safe area equals full design
   - exported fallback safe area
4. Resolves content bounds from `contentBounds` or `padding`.
5. Moves `layoutRoot` to content bounds.
6. Applies alignment recursively.

Scale modes:

- `fit`: min viewport/design scale
- `fitWidth`: width scale
- `fitHeight`: height scale
- `cover`: max viewport/design scale
- `none`: 1

The Figma exporter assigns `fitWidth` to `screen` and `hud` roots so their
horizontal measurements stay faithful to the design. Dialog and component
roots use `fit` so the complete surface remains visible.

Alignment behavior in `applyAlignment`:

- Positional aligns preserve the original design margin or center offset relative to the parent/content bounds.
- `stretch-width`, `stretch-height`, and `stretch-full` resize only assets and overlays.
- Text is deliberately not resized through stretch alignment; the runtime logs a warning instead.

Useful lookup API:

```ts
screen.get("nodeNameOrId")
screen.getAll("nodeName")
screen.getText("txt_start")
screen.getButton("btn_start")
screen.show()
screen.hide()
screen.resize(width, height, safeArea)
```

## Example Project

`example-pixi-project` is a Pixi v8 Vite app.

Aliases in `example-pixi-project/vite.config.js` point directly to local source:

```js
"@figma-pixi/pixi-runtime": "../packages/pixi-runtime/src/index.ts"
"@figma-pixi/shared": "../packages/shared/src/index.ts"
```

`example-pixi-project/src/main.ts`:

- Selects an export JSON by `?ui=...` or fallback candidates.
- Rejects HTML responses masquerading as JSON.
- Creates a Pixi `Application`.
- Creates a `UIFactory`.
- Loads assets.
- Creates the screen/dialog.
- Adds it to stage.
- Binds known buttons such as `btn_start`, `btn_close`, `btn_booster_bag`, `btn_booster_gate`.
- Calls `dialog.resize(app.screen.width, app.screen.height)`.

Generated JSON examples:

- `StartDialog.json`: dialog with text, close/start buttons, booster buttons, and compacted nine-slices.
- `streak-dialog.json`: dialog with `contentBounds`, `padding`, compacted panels, repeated button/icon groups, and horizontal three-slice badge.
- `backpack-dialog.json`: dialog with repeated item slots and compacted nine-slices.
- `main-game.json`: HUD with explicit `@align(center)`, `@align(top-right)`, and `@align(top-left)` examples.

## Shipping Into a Game

Use:

```bash
npm run ship -- "C:\Path\To\Game Project"
```

Default target:

```text
<Game Project>/tools/qUIck
```

The ship script skips:

- `.git`
- `.vite`
- `build`
- `dist`
- `node_modules`
- `*.log`
- `*.tsbuildinfo`

Runtime integration options are documented in `docs/game-integration.md`.

Option A: Vite aliases directly to source while actively developing.

Option B: file dependencies to built packages:

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

## Tests and Verification

Useful commands:

```bash
npm run typecheck
npm run build
npm run test -w @figma-pixi/shared
node test/nineSliceAutoDetection.test.mjs
```

The root `test/layout.test.mjs` targets legacy `dist/runtime/*` output and may not reflect the package runtime if the root legacy build is not current. Treat it as reference coverage unless the task specifically involves `src/runtime`.

When changing runtime rendering:

- Test with the example app.
- Use `?debug=1` to show debug overlays/logs.
- Check text rendering with the expected fonts installed/loaded.
- Check compacted and non-compacted nine-slice assets.
- Check `main-game` alignment on multiple viewport sizes.

When changing nine-slice detection:

- Run `node test/nineSliceAutoDetection.test.mjs`.
- Test manual override priority.
- Test inline `@nine(...)` priority.
- Test low-confidence fallback.
- Test horizontal three-slice output.
- Test ZIP download with compaction on and off.
- Confirm `textureSlice` and `assetOptimization` are written correctly when compaction is on.

## Known Gotchas

- The root loadable Figma plugin and the workspace package Figma plugin are not the same implementation. For the actual Figma plugin, edit root `figma-plugin/code.ts`, `figma-plugin/ui.html`, and `src/exporter/*`.
- `figma-plugin/ui.html` loads JSZip from CDN. If Figma cannot load the CDN script, ZIP download will fail even if export itself works.
- Generated JSON may use `"version": "1.0.0"` while `packages/shared` types say `version: number`. The package runtime currently accepts it because it does not strict-validate version.
- Asset dedupe can cause several nodes to share the same asset id and PNG file.
- Compacted nine-slice PNGs must be rendered with `textureSlice`; using `slice` against the compacted source can be wrong if asset scale or compact center dimensions change.
- Horizontal three-slice is represented as a normal `nineSlice` node with `top: 0` and `bottom: 0`.
- Vertical-only stretch is intentionally unsupported and falls back.
- Text depends on game/browser font availability. Missing fonts will visually differ from Figma.
- Hidden layers are skipped by default.
- `@text` wrappers must contain exactly one visible text layer.
- `@content` is exact-name metadata in the legacy/root exporter, not a general tag.
- `itemReverseZIndex` is respected in the legacy/root exporter when walking children.
- Stretch alignment resizes sprites, nine-slices, images, rasters, and overlays, but not text.

## Best Next Steps For A New ChatGPT Thread

If another ChatGPT thread takes over, give it this document and ask it to read these files first, depending on the task:

- General architecture: `README.md`, `docs/game-integration.md`, this file.
- Runtime bugs: `packages/pixi-runtime/src/uiFactory.ts`, `uiScreen.ts`, `layout/*`, `uiButton.ts`.
- Shared format/tag bugs: `packages/shared/src/schema.ts`, `packages/shared/src/layerNameParser.ts`.
- Actual Figma plugin/export bugs: `figma-plugin/code.ts`, `figma-plugin/ui.html`, `src/exporter/*`.
- Nine-slice auto-detection: `figma-plugin/ui.html`, `src/exporter/nineSlice.ts`, `test/nineSliceAutoDetection.test.mjs`.
- Example rendering: `example-pixi-project/src/main.ts`, generated JSON under `example-pixi-project/public/generated-ui`.

Suggested handoff prompt:

```text
You are working on the qUIck UI Toolkit in C:\Users\User\Documents\quick. Read docs/PROJECT_HANDOFF.md first. The project exports tagged Figma UI into JSON and PNGs, then renders it in PixiJS v8. The actual loadable Figma plugin is root figma-plugin/ plus src/exporter/*; packages/pixi-runtime is the current game runtime. Pay special attention to nine-slice metadata, auto-detection, compacted PNGs, and textureSlice handling before changing export or runtime behavior.
```
