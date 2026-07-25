# Research icon masters

The transparent high-resolution illustrations under `primitives/` are the
reusable object kit for the Root Run-style research cards. They stay outside
`assets/game/source` so Vite does not ship them in the game bundle.

Run `node scripts/generate-research-icons.js` to render the 256 px runtime icons.
The generator composes the same plot, cauldron, seed pack, hourglass, arrow,
bottle, lens, and stall masters across the set, adds the canonical project
checkmark to automation icons, and writes the final PNGs to
`assets/game/source/icons/research`.

Generation direction: chunky painted mobile-game objects, clean dark-brown
outlines, warm golden accents, restrained saturated colors, centered silhouette,
no frame, text, badge, currency, or watermark.
