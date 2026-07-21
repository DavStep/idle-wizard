# UI Editor

The UI editor wraps the real running game with a development-only hierarchy and
inspector. It does not ship in production builds.

## Start

Set the explicit local flag, then use the shared dev server:

```sh
VITE_ENABLE_UI_EDITOR=true npm run dev
```

The editor is designed for a landscape desktop viewport. The game remains live in
the center, the hierarchy stays on the left, and the inspector stays on the right.

## Use

- `select` mode pauses game input. Click a game element or a hierarchy row to inspect it.
- Drag the blue outline label, use arrow keys, or edit `offset x` / `offset y`.
- `shift` plus an arrow key nudges by 10 source units. A plain arrow nudges by 1.
- `interact` mode, or the `v` key, gives input back to the game.
- `open prefab` clones the selected DOM widget into an isolated preview.
- `cmd+s` / `ctrl+s`, or `save changes`, writes
  `src/dev/uiEditor/ui-layout-overrides.json` through a fixed local-only endpoint.

Saved values are declarative source-unit overrides. The editor never rewrites an
arbitrary JavaScript or CSS file. The inspector also reports the most likely view
manager source and the image/background asset used by the selected element.

For automation, development sessions expose `window.uiEditor` with `select`,
`setMode`, `refresh`, `getLayout`, and `save` methods.
