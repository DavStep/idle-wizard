# UI Editor

The UI editor is a development-only app for building and inspecting Idle Wizard
interfaces.

Its shell has resizable left and right panels, a resizable bottom panel, and a
central preview that always fills the remaining space. Drag a divider to resize
its panel. With a divider focused, use the arrow keys for an `8px` step or hold
Shift for a `32px` step.

Use `Save workspace` in the top toolbar, or press `Ctrl+S` / `Command+S`, to
store the current dock sizes, open library folder, selected preview, and
hierarchy visibility overrides in browser-local storage. The editor restores
the latest saved workspace when it next opens.

The left panel mirrors the authored component hierarchy of the widget or dialog
mounted in the central preview. Retained dialogs appear as
`<Feature>Dialog:BaseDialog`, then their paper `Content`, reusable child-widget
instances as leaf nodes, and the remaining visible production buttons, text,
images, and text fields as semantic atoms. Dialog adapters list reusable
children explicitly so automatic discovery stops at those ownership
boundaries; hidden panes and renderer internals stay out of the active tree.
Use `Find layers` to filter by component name or semantic type while preserving
the matching ancestor path. The result count reports direct matches. Branch
disclosure buttons, or Left/Right while a row is focused, collapse and expand
the tree without changing production visibility.
Selecting any hierarchy row marks the row;
double-clicking a reusable component instance opens its standalone
production-backed library view, where that widget's meaningful inner atoms are
shown. DOM-backed components receive a blue outline in the preview. Retained
Pixi atoms receive the same live blue bounds, eight resize reference handles,
and a pivot marker drawn from their production world geometry. Every component has an
eye control that hides or restores that component in the scene without removing
it from the hierarchy. Retained Pixi widgets bridge their meaningful atomic
parts into the same tree, so a button exposes its background and label, while
compound controls also expose their icons and additional labels. Asset previews,
including the nine-slice workbench, collapse the hierarchy dock because their
internal DOM is editor implementation rather than an editable component scene.
Selecting a widget, dialog, or scene restores the dock at its previous width.

The right panel inspects the selected widget, asset, or atomic component.
Its Storybook-style section tabs keep live controls or static properties
separate from production usage references. Left/Right moves between available
tabs, and the selected object summary stays pinned above them while the panel
scrolls.
Retained button controls follow hierarchy ownership. Selecting the button
background exposes its live color family and `50` / `30` / `15` corner-size
selector, selecting a label exposes copy and typography/layout, and selecting
the `IdleWizardButtonWidget` root exposes input state. Changes update the
production widget immediately; the preview status counts its real activation,
click-sound, and haptic path.
Selecting an atomic part in the hierarchy opens a preview-only property editor.
Text parts group copy, font, size, weight, line height, letter spacing,
alignment, and wrap width above their transform. Relative positioning uses a
familiar 3x3 parent anchor with X/Y offsets and four edge paddings; absolute
positioning exposes direct parent-local X/Y coordinates. Background atoms keep
their compatible production-asset picker. Every edit updates the mounted
preview immediately without mutating production source files. Widget
entries expose their production font and background asset before the registered
usage list; assets expose their production ID, type, slice margins when
applicable, and the widgets that use them. Assetless or image-only controls show
an explicit `None`. Dialog and scene selections clear the inspector.

The bottom panel is a folder browser. Its `Library` root contains `UI Assets`,
`UI Widgets`, `Dialogs`, and `Scenes`. `UI Assets` contains every texture in the
production asset manifest, including source images, public/runtime textures,
and generated atlases that are not mounted by a registered editor widget.
Source assets generally follow their production directories, so categories
such as `Avatars`, `Icons`, `Items`, `Rooms`, and `UI` remain separate. Reusable
UI chrome may instead use a semantic editor folder: shared title plaques and
ribbons live under `UI/Banners`; related paper, card, and inner-panel nine-slices live under
`UI/Backgrounds`; and the canonical coin, crystal, emerald, mana, and ruby icons
live under `UI/Currencies`. Background entries expose their geometry family and
visual variant in the inspector. Grouping means visual kinship, not automatic
interchangeability: each asset keeps its own slice and minimum-size contract.
This changes only editor discovery; production paths and asset IDs remain
unchanged. Runtime aliases live under `Public`, and
generated textures live under `Generated`. Feature folders remain nested
beneath those roots when no semantic category applies. Mixed directories show
their direct assets and child folders together. Shared source images are
deduplicated, each tile shows the real texture, and the breadcrumb header's
right-aligned filter searches the current folder and all of its descendants by
filename or production ID. Registered widget
consumers still appear in the inspector. The inspector marks source PNGs as
available for preview and nine-slice authoring; runtime aliases and generated
textures are preview-only. After mount, one bulk local reference scan marks
source textures with no project references using an amber `Unused` thumbnail
badge. This uses the same reference rules as asset deletion; runtime aliases and
generated textures are not classified as unused. `UI Widgets` contains
`Buttons`, `Progress bars`, `Sliders`, and `Composite widgets` folders. Open folders with their native
buttons and use the breadcrumb path to move back up the library. Folder visits
also keep session history: use `Command+[` / `Command+]` or
`Alt+Left` / `Alt+Right` to move backward and forward. Opening a different
folder after moving back discards the old forward path, matching browser
history. Shortcuts do not replace navigation keys inside editable fields or
open dialogs.

Library entries are native buttons. The first selection mounts the requested
widget, dialog, or scene in the central preview, keeps the catalogue row
selected, and updates the left hierarchy. Compatible retained button selections
reuse the mounted preview canvas and replace only the widget display object so
the stable background does not flash. Empty folders keep a quiet placeholder
until real editor content is registered.

The `Buttons` folder is populated by default with the real retained Idle Wizard
button hierarchy: one configurable Base / Text Button, popup tabs, inline and
border-label controls, the Cost Button composition, and the specialized info,
HUD settings, and HUD avatar buttons. Color, corner size, cost layout, and
button state are editor configurations rather than duplicate catalogue
entries. Their previews load the production Pixi classes and artwork rather
than editor-specific copies. Cost buttons reference the shared `UI/Regular Button` nine-slices and
`UI/Currencies` icons, so the asset library does not carry duplicate
cost-button artwork.
The folder presents them as a compact thumbnail gallery; thumbnails render the
same retained controls but remain passive so the complete tile owns selection.
Thumbnail captures run serially through one shared Pixi renderer and display as
static canvases, so revealing more rows does not allocate a WebGL context per
tile.

## UI Lab integrations

Interactive editor previews are discovered from colocated `*.ui-editor.js`
modules under `src/rendering` and `src/pages`. Each module exports a versioned
manifest created with `defineUiEditorIntegration`. The manifest chooses its
library section and optional nested feature folder, declares named scenarios,
and mounts the real production widget, dialog, composite HUD, page, or scene.
Adding an integration does not require editing the editor catalogue or shell.
Visually meaningful integrations may also declare a passive production-backed
thumbnail. The library then presents them in the same lazy, static-canvas
gallery used by retained buttons; selecting the tile still opens the complete
interactive scenario.

The selected integration receives an editor-owned deterministic clock, event
reporter, invalidation callback, and cleanup registrar. Its mounted instance may
contribute typed controls, actions, atomic hierarchy components, and a dispose
callback. The Inspector renders those contributions through the shared UI Lab
panel. Scenario fixtures and adapter state stay development-only; production
widgets are exercised through their public binding and interaction APIs without
editor branches in engine code.

### Production parity contract

- A preview imports and instantiates the exported production class or factory
  used by the game. Do not recreate game markup, Pixi trees, skins, or layout in
  editor-only code.
- Fixtures may replace data, time, callbacks, input routing, and backend
  services. They must not replace rendering code.
- Every scene, dialog, and `feature.*` integration declares every reusable
  visual or interactive child in `childWidgetIds`.
- Every declared child must resolve to a separate `kind: 'widget'` library
  entry with a passive production-backed thumbnail. The parent and standalone
  preview must use the same production class.
- A reusable child hidden as a private class must be exported or extracted
  before its large parent preview is considered complete.
- `validateUiEditorCompositionCoverage` runs before editor mount, while focused
  tests guard manifest coverage. Missing children, non-widget children,
  self-references, and children without thumbnails fail fast.

The validator proves that declared dependencies exist and are discoverable.
Code review is still responsible for ensuring `childWidgetIds` is exhaustive
for the production composition.

Current proof integrations cover manual, timed, and ranged progress bars;
range, milestone, and disabled sliders; the settings toggle; text fields;
regular, outlined, wrapped, inline, resource, and star labels; the managed
scroll area; the complete device-preferences board; HUD level and currency
widgets; the standalone bottom room tab and its composing tab group; the complete retained production-dialog inventory;
the Brewing HUD; the Research room; and the standalone Research Row, Research
Station Title, Dialog Frame, and Inventory Choice Row components. The `Dialogs` library folder groups
all 39 production dialogs under `Global`, `Workshop`, `Garden`, `Brewing`,
`Market`, and `Guild`. Each entry mounts the real production dialog with
deterministic populated and alternate-state fixtures. The level widget lives directly under
`Progress bars`; other
foundational entries stay independently selectable under nested `Text`,
`Inputs`, `Settings`, `Scrolling`, `HUD`, and `Navigation` folders. One entry
owns all compatible states as scenarios, so state variants do not become
duplicate catalogue tiles. Existing retained button previews use the same
Inspector extension point for configuration and live activation feedback.

Retained dialog and standalone button previews sit inside the authored `390px`
game-screen frame so their placement and scale can be judged against the real
rendering bounds. The compact bottom toolbar floats over the preview world and
provides zoom out, the current percentage, zoom in, and Center. Enable Pan
before dragging the screen; leaving Pan off keeps the production controls
interactive. Button previews preserve the current view while switching between
compatible button entries on the live canvas.

Integration modules must not evaluate arbitrary scripts, call production
backend services, or import themselves from production entry points. Every
timer, listener, Pixi tree, and isolated feature world must be returned through
the integration cleanup lifecycle.

Selecting a normal asset opens an image preview. Any PNG source asset can enter
`Convert to 9-slice`, which opens the reusable nine-slice workbench. Edit slice
margins numerically or drag and keyboard-adjust the guides over the source.
The source auto-fits in both directions, so small assets enlarge to use the
available pane while large assets remain contained. Use the mouse wheel over
the source to zoom around the cursor, drag to pan, or use the visible zoom
controls and keyboard equivalents. The right pane has separate `Preview cases`
and `Custom testing` tabs.
The first shows a fixed, seam-free Original case at the slice's minimum
renderable size, then derives Height stretched, Width stretched, and Both
stretched cases from that minimum without zoom or pan. The second accepts exact
or slider dimensions, optional ratio locking, zoom, fit, and drag/keyboard pan.
When a matching registered nine-slice sibling exists, the draft starts from
those proven margins, so
`green-button-50.9.png` starts at `L86 T100 R52 B68`. The asset browser groups
the full seven-color, three-radius matrix under `UI/Regular Button`.
`Save 9-slice` promotes an ordinary PNG to the `.9.png` naming convention,
updates its project references, and writes a `.9slice.json` definition beside
it through the local development server. Existing `.9.png` assets open as
nine-slices even before they have authored sidecar metadata. Conversion never
rewrites or copies the source pixels. Project runtime raster assets and
nine-slices are PNG-only.

Selecting an existing `.9.png` nine-slice opens the same workbench directly. Reset
restores its registered runtime geometry, Copy CSS copies the current preview
declaration, and `Save 9-slice` writes edited source margins back to the
sidecar definition. The sidecar records logical output insets and the derived
minimum rendered size separately from source slice pixels.

Selecting a generated atlas opens the atlas workbench instead of a passive
image. Click any packed frame to keep its exact box selected and inspect its
frame ID, source path, packed size, source canvas, atlas coordinates, and atlas
footprint in the right panel. Search matches frame IDs and source paths and
marks every matching box; Enter selects the next match. Previous/Next buttons
and the canvas arrow keys move through the current match set, while Escape
clears selection. `Copy ID` and `Copy path` copy the two values most often used
in source work. The view starts fitted to width and also supports stepped zoom
and exact `100%` inspection without changing atlas data.

When editing a widget background, the asset picker keeps incompatible
nine-slices visible but disabled. Its reason states the skin minimum and the
widget's registered minimum. Direct editor or runtime assignment uses the same
guard and leaves the previous valid skin unchanged when protected borders
cannot fit. Runtime aliases and generated assets remain preview-only.

Every source asset also exposes `Delete asset`. The deletion review shows the
selected texture, registered widget previews with their feature locations, and
the exact project files and lines that reference the asset. Used assets require
a compatible visual replacement of the same file and nine-slice type. Confirming
updates every reviewed source reference, deletes the original texture and its
optional `.9slice.json` sidecar, removes the old library entry, and opens the
replacement. Assets with no source references may be deleted without choosing a
replacement. Runtime aliases and generated assets cannot be deleted from the
editor.

## Open

Run the shared development server:

```sh
npm run dev
```

Then open:

```txt
http://127.0.0.1:55173/ui-editor.html
```

For the deterministic hierarchy QA fixture, open:

```txt
http://127.0.0.1:55173/ui-editor.html?preview=hierarchy
```

For deterministic widget, dialog, and scene selection QA, open:

```txt
http://127.0.0.1:55173/ui-editor.html?preview=library-selection
```

For the deterministic asset deletion review, open:

```txt
http://127.0.0.1:55173/ui-editor.html?preview=asset-deletion
```
