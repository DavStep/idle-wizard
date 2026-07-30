# Root Run top HUD assets

These are the exact optimized qUIck exports from Root Run
`main-base-hud`, retained at the original `1080px` authored scale and
rendered inside Idle Wizard at `/3`.

- `avatar-frame-9slice.png`: source insets `54 54 55 55`; authored node
  `186x186`.
- `avatar-head-bg.png`: authored portrait backing `148x149`.
- `currency-bg-9slice.png`: source insets `25 24 25 25`; authored node
  `208x66`.
- `settings-bg-9slice.png`: source insets `46 46 46 46`; authored node
  `122x122`.
- `level-progress-panel.png`: fixed authored backing `656x76`.
- `level-progress-track-9slice.png`: horizontal insets `31 0 31 0`;
  authored node `631x51`.
- `level-progress-fill-mask.png`: `53x42` lossless distillation of the exact
  qUIck fill export. Use source insets `26 20 26 21` and render at the
  authored `51px` rail height; the compact texture is not its output size.
  Only the single-pixel center stretches while the alpha preserves the
  authored rounded caps.

The settings gear stays in `root-run-settings`, and the level star stays
in the existing public Root Run asset path. The level rail renders the
authored yellow fill texture directly and adds request separators over the
retained track.
