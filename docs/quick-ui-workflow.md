# qUIck UI and Nine-Slice Workflow

Idle Wizard carries the same qUIck Figma-to-Pixi workflow used by Root Run. Existing room DOM remains supported. Use qUIck for a Figma-authored dialog, screen, HUD, or reusable component that should preserve its exported composition and raster chrome.

## One-time Figma setup

1. The checked-in plugin bundle is ready to load. Only after changing its source, install its isolated tool dependencies and rebuild it:

   ```bash
   npm install --prefix tools/qUIck
   npm run build:figma-plugin --prefix tools/qUIck
   ```

2. In Figma, choose `Plugins > Development > Import plugin from manifest`.
3. Select `tools/qUIck/figma-plugin/manifest.json`.

The loadable plugin is the checked-in `figma-plugin/code.js` plus `figma-plugin/ui.html`. The exporter and Pixi runtime source live under `tools/qUIck/packages/`.

## Authoring tags

Name the selected root with one root tag:

- `@screen HomeScreen`
- `@dialog RewardDialog`
- `@hud GameplayHud`
- `@component ButtonSet`

Use child tags as needed:

- `@container`
- `@button`
- `@text`
- `@image`
- `@raster`
- `@overlay`
- `@nine`
- `@align(bottom-center)` or another supported alignment
- `@ignore`

An exact `@content` helper layer defines root content bounds and padding but is not exported.

## Nine-slice authoring

1. Name the Figma layer `@nine <name>`.
2. Select that layer. The plugin exports its rendered PNG bounds, auto-detects the fixed left, top, right, and bottom regions, and shows draggable guides.
3. Inspect the preview at natural size and stretched in both axes.
4. Adjust the guides or numeric values only when auto-detection is wrong.
5. Use `Save Override` only to lock an intentional manual slice.
6. Export the containing root.

Resolution order is manual override, current auto-detection, then a safe default with a warning. During ZIP creation qUIck compacts nine-slice PNGs to their fixed edges plus a small center sample. The JSON retains both authored `slice` data and compact-texture `textureSlice` data. Runtime rendering must use `textureSlice`.

Pixi renders full frames with `NineSliceSprite`. Horizontal-only assets use qUIck's three-slice renderer. Corners remain unscaled, edges stretch along one axis, and only the center stretches in both axes.

Generated qUIck screens must stay on that Pixi path. When an existing DOM surface intentionally reuses a qUIck-compacted texture, keep the exported source slices. Large flat panels may scale their rendered fixed widths by the screen design ratio (`390 / 1080` for Root Run exports) when native and fractional-fit QA remains clean. Compact curved badges and headers must instead compose the nine-slice at the exported node size with unscaled `textureSlice` margins, then scale the whole composed element by the design ratio; this matches Pixi's `NineSliceSprite` order and prevents visible joins in an already-reduced CSS `border-image`. CSS `border-image` can also leave transparent one-pixel gaps between its independently rasterized regions at fractional contain scales; place the texture's exact opaque center-sample color behind large frames and clip that underlay to the frame silhouette. Verify both native `390x844` pixels and a fractional fitted desktop viewport.

For screenshot extraction or a standalone PNG that did not originate in qUIck/Figma, use the local `nine-slice-generator` workflow instead. Do not hand-edit either pipeline's final PNG.

## Export and import

1. Export the qUIck ZIP directly into `qUIck-inbox/`.
2. Keep only the ZIPs intended for this import.
3. Run:

   ```bash
   npm run import:quick-ui
   ```

The importer:

- rejects unsafe, encrypted, multi-disk, ZIP64, oversized, unsupported, or conflicting entries;
- accepts only generated qUIck JSON and PNG files;
- verifies every document asset reference exists in the same ZIP;
- writes screen/dialog JSON to `assets/quick-ui/exports/`;
- writes referenced PNGs to `assets/quick-ui/source/`;
- packs referenced PNGs into `assets/quick-ui/atlas/atlas.png`;
- writes `atlas.json` and `manifest.json` beside that atlas;
- deletes source ZIPs only after atlas generation succeeds.

If the command fails, fix the reported export and leave the ZIP in place. Do not manually extract around the guard.

## Preview

Start or reuse the normal Idle Wizard dev server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:55173/?quick_ui=<ExportName>
```

Add `&quick_debug=1` to draw node bounds and labels. The preview uses the real `390x844` Pixi surface and contain-fit behavior. In development it exposes:

- `window.__quickUi`, the mounted screen;
- `window.__quickUiExport`, the parsed and asset-scoped export.

## Runtime binding

Use `QuickUiFacade` from a feature-owned manager. Gameplay stays outside the generated document:

```js
const quickUi = new QuickUiFacade({
  whenPixiReady: () => renderFacade.whenPixiReady(),
  getCanvas: () => renderFacade.getCanvas(),
});

const { screen } = await quickUi.createScreen('RewardDialog');
screen.getButton('btn_claim')?.onClick(() => {
  rewardFacade.claim();
});

const layers = await renderFacade.whenPixiReady();
quickUi.mountScreen(screen, layers.popup);
```

Use `quickUi.unmountScreen(screen)` when the owning surface closes. `mountScreen` keeps the qUIck document contain-fitted inside the centered `390x844` source surface, including Idle Wizard's intentionally wider desktop world stage.

The importer owns files and atlas generation, qUIck owns exported layout and raster slicing, the Pixi runtime owns display objects and alignment, and the feature manager owns callbacks and game state.

## Validation

For a changed export:

1. Run `npm run test:quick-ui-import`.
2. Run `npm run assets:quick-ui`.
3. Preview the export at `390x844`.
4. Check the fitted desktop viewport.
5. Check original, width-stretched, height-stretched, and both-stretched nine-slice states.
6. Run the owning feature tests and `npm run check:ui`.

For the shared DOM panel exception, use `http://127.0.0.1:55173/src/dev/uiRecipes/nine-slice-panels.html?theme=witchcraft` and substitute `black` or `midnight` for the other theme assets. The recipe includes the compact chat, task, and top-panel heights that previously exposed slice-join gaps.

Missing atlas frames, invalid JSON, unsafe ZIP paths, or missing PNGs are failures. Do not add fallback assets that hide them.

Fixed-size DOM surfaces should not keep qUIck nine-slice regions live when the whole surface is later fractionally scaled. Chrome/WebView can round and filter the nine regions independently, exposing hairline joins even when the source pixels are correct. Preserve the compact qUIck PNG and slice metadata, precompose the final authored-size skin into one PNG with a deterministic generator, and render that whole PNG with `border-image: none`. Research station cards use `npm run assets:research-skins` for this path.
