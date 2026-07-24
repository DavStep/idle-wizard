# Game assets

This directory is the source of truth for runtime art, fonts, Spine bundles,
and generated atlases. JavaScript helpers stay under `src/`; binary assets do
not.

```text
assets/
  app/                         app icons
  fonts/                       bundled fonts
  game/
    source/
      audio/
      characters/
      icons/
      items/
      rooms/
      ui/
    atlas/
      game-asset-atlas.png
      game-asset-atlas.json
  quick-ui/
    source/                    imported qUIck PNGs
    exports/                   imported qUIck screen/dialog JSON
    atlas/
      atlas.png
      atlas.json
      manifest.json
  runtime/                     copied verbatim by the web build
    spine/
      tutorial-pointer/        skeleton, texture atlas, and texture
```

Run `npm run assets:atlas` to rebuild every generated atlas. The normal dev
and production builds run it automatically.

Do not edit files in either `atlas/` directory by hand:

- `assets/game/atlas/` is generated from the selected files under
  `assets/game/source/`.
- `assets/quick-ui/atlas/` is generated from qUIck exports and source PNGs.
  Put export ZIPs in `qUIck-inbox/` and run `npm run import:quick-ui`.

Native iOS and Android launcher/splash catalogs stay in their platform
projects because those build systems own them.
