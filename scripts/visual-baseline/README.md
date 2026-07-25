# Visual Baseline Harness

This harness inventories the current DOM renderer before the retained PixiJS
cutover. It does not change production rendering and it does not treat an
existing screenshot as an approved golden automatically.

The manifest is the source of truth:

- `manifest.json` lists production pages, gates, chrome, dialogs, transient
  effects, tutorial steps, visual settings, state variants, anchors, glyph-edge
  masks, and the three required viewport targets.
- `manifest.schema.json` documents the checked-in wire shape.
- `manifest.mjs` validates the manifest against current source registries.

Validation discovers registered page IDs, `cheats.openUi` recipes, mounted
global UI owners, every static production `style-dialog` class, tutorial step
IDs, and visual-setting options. Adding one of those without manifest coverage
makes the check fail.

## Inventory and readiness

```sh
npm run visual:baseline:check
npm run visual:baseline:capture -- --list
```

The normal check permits explicit recipe gaps and uncaptured states, and reports
both as warnings. Use this migration gate when every state is expected to be
automatable:

```sh
npm run visual:baseline:check -- --strict-capture-ready
```

An `uncaptured` state means exactly that: the manifest records required evidence
but makes no visual-parity claim. Existing files under `screenshots/` and
`docs/tutorial-flow/screenshots/` remain useful historical evidence, but they
are not silently promoted to migration goldens.

## Chromium capture

The generic capture runner uses the real app and existing checked-in recipes.
It never starts or stops shared services. Before capture:

1. Confirm Vite and the required backend are up.
2. Start the Vite build with `VITE_ENABLE_CHEATS=true`; the runner fails if
   `window.cheats` is absent.
3. Use an initialized local QA profile so fresh-start, intro, and online gates
   do not cover page/dialog captures.

Preview a job without opening Chrome:

```sh
npm run visual:baseline:capture -- \
  --surface page.workshop \
  --state default \
  --viewport authored-1080x2170 \
  --dry-run
```

Capture the default visual settings:

```sh
npm run visual:baseline:capture -- \
  --surface page.workshop \
  --state default \
  --viewport authored-1080x2170
```

Expand the surface's declared theme/font/progress Cartesian matrix only when
that full run is intended:

```sh
npm run visual:baseline:capture -- \
  --surface page.workshop \
  --state default \
  --viewport authored-1080x2170 \
  --all-variants
```

Outputs go to ignored `tmp/visual-baselines/dom/` by default. Every PNG has a
JSON sidecar containing the exact manifest hash, viewport, settings, recipe,
setup results, frozen clock, random seed, resolved DOM anchor bounds,
typography, and glyph-mask rectangles. The runner refuses to overwrite an
existing job unless `--force` is passed.

The Chromium runner does not pretend to capture Android. The
`android-reference` viewport stays a placeholder until the team records a
physical device, Android build, WebView version, native screenshot dimensions,
orientation, and safe-area insets.

## Pixel and anchor comparison

Compare equivalent full images or equivalent native-pixel semantic crops:

```sh
npm run visual:baseline:diff -- \
  --surface page.workshop \
  --state default \
  --reference tmp/path/reference.png \
  --actual tmp/path/actual.png \
  --reference-metadata tmp/path/reference.metadata.json \
  --actual-metadata tmp/path/actual.metadata.json \
  --out-dir tmp/workshop-default-diff
```

The command writes:

- `difference.png`: quiet grayscale context, amber tolerated glyph-edge pixels,
  and magenta mismatches.
- `overlay.png`: a 50/50 raster overlay.
- `summary.json`: pixel totals, masks, semantic-anchor deltas, typography/text
  mismatches, and the verdict.

Only pixels inside a declared mask that look like an edge in both images can
use the glyph tolerance. Flat fills, borders, spacing, assets, and geometry do
not inherit text anti-alias tolerance. Anchor metadata is required by default
and every required `x`, `y`, `width`, and `height` value must stay within its
declared tolerance.

For human approval, also generate the existing side-by-side/opacity artifact:

```sh
npm run ui:compare -- \
  --reference tmp/path/reference.png \
  --actual tmp/path/actual.png \
  --out tmp/ui-reference-review.html
```

A green pixel result is not approval by itself. Follow
`docs/visual-reference-qa.md`: inspect the native-pixel crop at 100%, review the
overlay, and record a verdict for every declared relationship.

## Current documented gaps

The manifest deliberately calls out states that cannot yet be reopened from one
generic command. They include connection/maintenance gates, account-save
conflicts, transient reward frames, nested row-driven Garden/Brewing/Market
dialogs, player/alliance detail fixtures, and some error/loading branches.
`--strict-capture-ready` remains red until those states get real checked-in
recipes. Do not bypass the gaps with temporary source edits or unrecorded DOM
mutation.
