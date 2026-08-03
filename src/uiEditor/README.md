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

The left panel mirrors the component hierarchy of the widget or dialog mounted
in the central preview. Every component has an eye control that hides or restores
that component in the scene without removing it from the hierarchy. Retained
Pixi widgets bridge their meaningful atomic parts into the same tree, so a
button exposes its background and label, while compound controls also expose
their icons and additional labels. Asset previews, including the nine-slice
workbench, collapse the hierarchy dock because their internal DOM is editor
implementation rather than an editable component scene. Selecting a widget,
dialog, or scene restores the dock at its previous width.

The right panel inspects the selected widget, asset, or atomic component.
Selecting an atomic part in the hierarchy exposes live local `X` and `Y`
controls. Text parts also expose their copy, and compatible backgrounds expose
an asset picker backed by the registered production button skins. These edits
change the mounted preview without mutating production source files. Widget
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
UI chrome may instead use a semantic editor folder: title plaques and ribbons
from account, dialog, market, and research source folders live together under
`UI/Banners`; related paper, card, and inner-panel nine-slices live under
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
available for preview and nine-slice authoring; WebP, runtime, and generated
textures are preview-only. `UI Widgets` contains `Buttons`, `Progress bars`,
`Sliders`, and `Composite widgets` folders. Open folders with their native
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
button primitives: regular color/state variants, popup and account tabs,
account save, inline and border-label controls, cost-button compositions, the
info button, and the HUD settings and avatar buttons. Their previews load the
production Pixi classes and artwork rather than editor-specific copies. Cost
buttons reference the shared `UI/Regular Button` nine-slices and
`UI/Currencies` icons, so the asset library does not carry duplicate
cost-button artwork.
The folder presents them as a compact thumbnail gallery; thumbnails render the
same retained controls but remain passive so the complete tile owns selection.
Thumbnail captures run serially through one shared Pixi renderer and display as
static canvases, so revealing more rows does not allocate a WebGL context per
tile.

Selecting a normal asset opens an image preview. Any PNG source asset can enter
`Convert to 9-slice`, which opens the reusable nine-slice workbench. Edit slice
margins numerically or drag and keyboard-adjust the guides over the stable
source. The right pane has separate `Preview cases` and `Custom testing` tabs.
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
rewrites or copies the source pixels. WebP assets remain preview-only because
project nine-slices are PNG-only.

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
