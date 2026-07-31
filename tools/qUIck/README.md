# qUIck UI Toolkit

Portable Figma-to-Pixi UI tooling extracted from Root Run.

Artists build screens in Figma, mark layers with qUIck tags, export JSON plus PNG assets, and a PixiJS game renders the result with lightweight behavior binding.

## What Is Here

```text
figma-plugin/          loadable local Figma plugin bundle
packages/shared/      shared export schema and layer-name parser
packages/pixi-runtime/ PixiJS v8 runtime for exported UI JSON
packages/figma-plugin/ plugin/exporter package source
example-pixi-project/ standalone Pixi preview project
examples/             small JSON and usage examples
src/                  legacy/reference exporter/runtime code
test/                 legacy/reference tests
```

## Quick Start

```bash
npm install
npm run build
npm run dev
```

`npm run dev` starts the example Pixi project.

## Figma Plugin

```bash
npm run build:figma-plugin
```

In Figma, choose `Plugins > Development > Import plugin from manifest`, then select:

```text
figma-plugin/manifest.json
```

The manifest points at `figma-plugin/code.js` and `figma-plugin/ui.html`.

## Ship To A Game

```bash
npm run ship -- "C:\Path\To\Game Project"
```

This copies the toolkit to:

```text
<Game Project>/tools/qUIck
```

It skips `node_modules`, `dist`, build folders, logs, and TypeScript build info. See `docs/game-integration.md` for runtime wiring options.

## Export Flow

1. Name the root `@screen HomeScreen`, `@dialog RewardDialog`, `@hud GameplayHud`, or `@component ButtonSet`.
2. Add tags such as `@button`, `@text`, `@image`, `@raster`, `@nine`, `@align(bottom-center)`, or `@ignore`.
3. Run the qUIck Figma plugin.
4. Put the exported JSON at `public/generated-ui/<ExportName>.json`.
5. Put exported PNG assets under `public/generated-ui/assets/ui/<ExportName>/`.
6. Load the JSON with `UIFactory` from `@figma-pixi/pixi-runtime`.

## Nine-Slice Workflow

1. Name a layer `@nine dialog_bg`.
2. Select that layer.
3. The plugin auto-detects slice values and shows guides.
4. Drag lines or edit numbers if needed.
5. Click `Save Override` only when locking a manual override.
6. Select the root screen or dialog and export.

Export fallback order is manual override, auto-detected slice, then safe default slice.

## Layer Tag Cheat Sheet

- `@screen` root tag for a normal screen export.
- `@dialog` root tag for a dialog export; on a child layer, exports that node as a dialog container.
- `@hud` root tag for a HUD export.
- `@component` root tag for a reusable component export.
- `@modal` marks the exported root document as modal.
- `@container` exports the node as a logical container with children.
- `@button` exports the node as a button container with a hit area matching its bounds.
- `@raster` forces the node to export as a PNG-backed raster asset.
- `@image` exports the node as an image asset node.
- `@text` exports a text layer as structured text instead of rasterizing it.
- `@overlay` exports the node as a color/opacity overlay.
- `@nine` exports the node as a nine-slice asset. Inline `@nine(left,top,right,bottom)` still works.
- `@ignore` skips the layer during export.
- `@align(...)` adds runtime alignment behavior.
- `@content` exact layer name for defining root content area and padding; this helper layer is not exported.

## Alignment Values

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

## Example Names

```text
@screen HomeScreen
@dialog RewardDialog @modal
@button btn_play @align(bottom-center)
@text coins_label
@nine(40,32,40,32) panel_bg
```

Nine-slice exports include a derived `minimumSize`. Export reports an error,
and the Pixi runtime refuses the node, when its final width or height is smaller
than the protected design-space edges plus one stretchable pixel. Compacted
`textureSlice` values remain texture-sampling metadata and never replace this
layout constraint.
