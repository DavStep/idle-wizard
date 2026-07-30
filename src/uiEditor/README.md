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
that component in the scene without removing it from the hierarchy.

The right panel lists the selected widget's registered production usages. Each
row names the feature use and its source module. Dialog and scene selections
clear the list because their usage catalogues are outside this widget-focused
view.

The bottom panel is a folder browser. Its `Library` root contains `UI Assets`,
`UI Widgets`, `Dialogs`, and `Scenes`. `UI Assets` is empty for now.
`UI Widgets` contains `Buttons`, `Progress bars`, `Sliders`, and
`Composite widgets` folders. Open folders with their native buttons and use
the breadcrumb path to move back up the library.

Library entries are native buttons. Selecting a widget, dialog, or scene mounts
a fresh instance in the central preview, keeps the catalogue row selected, and
updates the left hierarchy. Empty folders keep a quiet placeholder until real
editor content is registered.

The `Buttons` folder is populated by default with the real retained Idle Wizard
button primitives: regular color/state variants, popup and account tabs,
account save, inline and border-label controls, cost-button compositions, the
info button, and the HUD settings and avatar buttons. Their previews load the
production Pixi classes and artwork rather than editor-specific copies.
The folder presents them as a compact thumbnail gallery; thumbnails render the
same retained controls but remain passive so the complete tile owns selection.

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
