# UI Editor Style

The editor follows the quiet dark product language of the Codex desktop app.
This style is intentionally separate from Idle Wizard's illustrated in-game
HUD.

## Character

- Dense, calm, and tool-first.
- Neutral charcoal surfaces create hierarchy without decorative gradients.
- Thin borders and small surface shifts separate regions.
- Color communicates focus, status, or destructive intent only.
- System typography keeps the editor familiar on desktop platforms.

## Surface hierarchy

| Role | Token | Value |
| --- | --- | --- |
| Workspace canvas | `--editor-canvas` | `#171717` |
| Recessed region | `--editor-surface-subtle` | `#1a1a1a` |
| Panel or message | `--editor-surface` | `#232323` |
| Input or elevated control | `--editor-surface-raised` | `#282828` |
| Hovered control | `--editor-surface-hover` | `#2f2f2f` |
| Selected row | `--editor-surface-selected` | `#414348` |

Use borders before shadows. Panels use `--editor-border-subtle` or
`--editor-border`; focused or strongly separated edges may use
`--editor-border-strong`.

## Typography

- Font: native system sans through `--editor-font`.
- Body: `14px` with `1.5` line height.
- Controls: `13px`.
- Metadata: `12px`.
- Dense auxiliary labels: `11px`.
- Use medium or semibold weight for titles and selected labels. Do not use a
  display face, all-caps body copy, or decorative text effects.
- Technical values and source locations may use `--editor-font-mono`.

## Geometry and spacing

- Spacing follows a `4px` base scale.
- Controls use an `8px` radius.
- Panels use a `12px` radius.
- Large composer-like inputs may use a `16px` radius.
- Avoid nested rounded containers when a divider or spacing is enough.
- A compact global toolbar spans the editor above every dock. Its workspace
  status stays adjacent to the single `Save workspace` action.
- The left and right dock panels run the remaining height below the toolbar.
- The bottom dock sits under the preview, between the two side panels.
- The preview always consumes every remaining pixel.
- Asset and nine-slice workbenches collapse the component-hierarchy dock and
  reuse that width for the preview; returning to a component scene restores the
  hierarchy at its previous width.
- Dock defaults are `260px` left, `300px` right, and `220px` bottom. Responsive
  clamps preserve a usable preview on narrow windows.
- Splitters use a `5px` hit area with a centered `1px` neutral divider.
- The bottom panel is a folder browser with a compact breadcrumb header.
  Folder rows use a familiar outline icon, remain visually flat at rest, and
  form a responsive grid without card chrome.
- The asset catalogue covers every production-manifest texture. Source
  directories remain nested under their normal category folders unless a
  reusable visual role is clearer. Shared title plaques and ribbons live under
  `UI/Banners` instead of account, dialog, market, or research feature folders;
  related paper, card, and inner-panel nine-slices live under `UI/Backgrounds`;
  canonical coin, crystal, emerald, mana, and ruby icons live under
  `UI/Currencies`. Background grouping is for discovery only: the inspector
  names each geometry family and visual variant, while asset-specific slice and
  minimum-size contracts still control compatibility. Runtime aliases live
  under `Public`, and generated textures live under `Generated`.
  A directory may show direct assets and child folders together. Every asset
  folder keeps one native search field at the far right of the breadcrumb
  header; it searches that folder and its descendants by filename or production
  ID and reports the visible count without moving selection into a separate
  modal. Preview-only
  assets use the same gallery and inspector, with their editor access stated in
  metadata instead of introducing disabled-looking tiles.
- Asset thumbnails keep the compact blue `9` badge at the top-right for
  nine-slices. A source texture with no scanned project references gets a
  compact amber `Unused` badge at the top-left; the tile's accessible name must
  communicate the same state. Do not classify runtime or generated assets as
  unused.
- The `Library` root owns `UI Assets`, `UI Widgets`, `Dialogs`, and `Scenes`;
  widget categories are nested folders rather than tabs or permanent columns.
- Library entries are compact text rows. The selected row uses
  `--editor-surface-selected`; opening it replaces the center preview without
  adding preview chrome.
- The hierarchy owns one sticky `Find layers` field and direct-match count.
  Filtering keeps every matching ancestor visible, while native disclosure
  buttons and Left/Right keys collapse or expand branches independently from
  the eye visibility control.
- Hierarchy rows use `28px` pitch, depth-based `12px` indentation, a disclosure,
  leading eye control, an ellipsized component label, and a muted element tag. Hiding a
  parent visually mutes its descendants while preserving their individual
  visibility choices. Retained-canvas atomic rows use the same rhythm and the
  existing selected-row surface.
- The right Inspector pins the selected-object summary and a compact native tab
  row. `Controls`, `Properties`, or `Details` owns editing and metadata;
  `Usage` owns production references. Tabs use the shared blue underline and
  Left/Right focus-following selection instead of stacking both long sections.
- Atomic-component inspector fields use the existing raised control surface.
  Position fields share one row; text and asset controls span the inspector
  width.
- UI Lab integrations reuse the right Inspector for one compact vertical flow:
  scenario, typed controls, actions, then the latest events. Scenario and field
  labels stay secondary; live values use the editor mono face. Actions wrap at
  narrow widths and the event list scrolls within its own bounded region rather
  than expanding the dock indefinitely.
- Retained dialog and standalone button previews expose the complete authored
  `390px` screen frame against the recessed grid canvas. The preview fills the
  complete central canvas, and the compact bottom toolbar overlays that world
  like the Root Run level-editor HUD. It contains only Pan, zoom out,
  percentage, zoom in, and Center so it reads as editor chrome rather than game
  UI. Compatible button selections retain that view on the live canvas.
- The nine-slice workbench keeps its source and guides in the left pane. The
  source contain-fits upward as well as downward, preserving crisp source
  pixels, and supports cursor-centered wheel zoom plus drag and keyboard pan.
  Zooming changes the rendered source size rather than scaling the guide
  overlays, so guide lines and pointer targets keep their authored thickness.
  The right pane uses compact accessible tabs: `Preview cases` holds a fixed
  two-column Original/Height/Width/Both matrix with seam-free rendered results;
  Original uses the slice's calculated minimum renderable dimensions and the
  three stretch cases derive from that minimum. `Custom testing` owns exact and
  slider dimensions, reversible ratio locking, zoom, fit, and pan. Fixed cases
  never zoom or move, and the two modes do not share a preview scroller. Source
  guides use an `11px` pointer target
  around a `1px` blue line, expose their current value on hover, focus, or drag,
  and remain adjustable through arrow keys. Reset returns to registered runtime
  geometry, and Copy CSS reports success or failure through the local polite
  status.
- The generated-atlas workbench keeps the packed image primary. A thin neutral
  hover box and one persistent blue selection box sit directly on frame bounds;
  the selected frame label stays attached to that box. Its compact toolbar
  reuses native editor controls for name/path search, match navigation, copy ID,
  copy path, fit width, stepped zoom, and `100%`. Search marks all matching
  frames without hiding nonmatches or rearranging the atlas. The right inspector
  owns detailed frame metadata so the canvas does not grow a competing card.
- Ordinary PNG previews expose one compact `Convert to 9-slice` action in the
  asset header. Authoring stays inline in the central workbench and adds only
  `Cancel` plus `Save 9-slice`; saving reports the written metadata path through
  the same polite semantic status treatment. Existing editable source
  nine-slices expose the same `Save 9-slice` action without `Cancel`.
- Source assets expose a restrained red `Delete asset` action. Its review dialog
  uses one flat target summary, visual usage rows, dense source-reference rows,
  and a scrollable replacement gallery built from the existing asset thumbnail
  treatment. The footer remains visible while the review scrolls. Runtime and
  generated assets keep the action disabled instead of implying that their
  backing files can be removed locally.
- Widget usage rows use the same dense auxiliary rhythm: a readable feature
  label, one muted monospace source location, and dividers instead of cards.

## Interaction

- Focus uses the shared `2px` blue ring.
- Hover and pressed states change the surface by one elevation step.
- `Save workspace` is a native button and shares its action with
  `Ctrl+S` / `Command+S`. Successful and failed saves use the existing semantic
  status colors in a polite live region.
- Folder and breadcrumb navigation uses native release-only buttons with
  normal keyboard activation. Folder visits keep browser-style session history:
  `Command+[` / `Command+]`, `Alt+Left` / `Alt+Right`, and dedicated browser
  navigation keys move backward and forward without overriding editable fields
  or open dialogs. Folder content scrolls inside the bottom panel.
- Hierarchy eye controls are native buttons with visible/hidden icons and
  `Hide …` / `Show …` accessible labels. They apply an editor-only visibility
  marker and never remove a component from the preview tree.
- Every hierarchy row is pointer- and keyboard-selectable. Selection uses the
  existing selected-row surface, and DOM-backed selection outlines the matching
  preview component in blue. Retained atomic selection opens native number,
  text, and select controls in the inspector and applies edits immediately to
  the mounted preview. Double-clicking a reusable retained component instance
  opens its standalone production-backed library entry; embedded widget
  instances remain hierarchy leaves, and their inner components appear only in
  that standalone view. Single click remains selection only.
- Retained button selections expose compact native inspector groups instead of
  duplicate catalogue entries. Use labeled color swatches, segmented `50` /
  `30` / `15` corner-size choices, and explicit state choices; Cost Button also
  exposes layout, optional top label, label copy, price, and availability. Every
  choice updates the mounted production control without remounting the editor.
- The selected button preview carries a polite live status that confirms the
  real activation, click-sound, and haptic pipeline, so one press verifies all
  three shared behaviors.
- UI Lab scenario selects, native fields, and action buttons are keyboard
  operable. Production Pixi controls keep their real input-router behavior in
  the central canvas. Changing scenario remounts only that integration and
  disposes its clock, listeners, isolated state, and Pixi tree before the next
  scenario starts.
- Dialog-preview Pan is opt-in so production canvas controls remain interactive
  by default. Zoom may use the toolbar, wheel, or keyboard. Center clears only
  pan and preserves the current zoom; Home provides the same keyboard action.
- Nine-slice source margins may be changed by direct number entry, pointer drag,
  or keyboard movement. Opposing guides may never cross, and every size or slice
  change updates the stretched result immediately. Clipboard output is a
  user-initiated convenience only. Explicit `Save 9-slice` promotes an ordinary
  source filename to `.9.png`, updates project references, writes its sidecar
  definition, and preserves the source PNG pixels byte-for-byte. Existing
  `.9.png` assets open directly in the nine-slice workbench.
- Atlas frames are selected on pointer release from their exact packed bounds.
  The atlas region is keyboard focusable: arrow keys traverse the active search
  matches, Home/End jump to the first/last match, and Escape clears selection.
  Search Enter advances through matches. Selection never mutates production
  metadata, and copy actions remain explicit user gestures.
- Normal transitions last `150ms`; larger state changes may use `200ms`.
- Motion must explain state and respect reduced-motion preferences.
- Disabled content uses `--editor-text-disabled` without introducing a new
  surface color.
- Asset deletion uses a native modal dialog with focus restoration, Escape,
  backdrop, and explicit Cancel dismissal. A used asset cannot be confirmed
  until source inspection succeeds and one compatible replacement is selected.
  The final destructive label states both effects: `Replace references and
  delete`.

## Semantic color

- Blue is reserved for focus and primary selection.
- Green is success or added state.
- Amber is warning or pending state.
- Red is destructive or removed state.
- Inactive chrome stays neutral.

## Reference contract

The supplied Codex screenshot is the visual reference. Its sampled main
workspace is `#171717`, elevated message surfaces are `#232323`, and the bottom
composer is `#282828`. The empty editor intentionally matches only the
workspace canvas in this step; future components must use the tokens above
rather than resampling or introducing feature-local colors.
