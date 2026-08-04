# Root Run top HUD assets

These retain Root Run `main-base-hud` geometry at the original `1080px`
authored scale and render inside Idle Wizard at `/3`. Unique artwork remains
an optimized qUIck export; flat color layers use shared or neutral tint masks.

- `avatar-frame.9.png`: source insets `54 54 55 55`; authored node
  `186x186`.
- `avatar-head-bg.png`: authored portrait backing `148x149`.
- `level-progress-track.9.png`: horizontal insets `31 0 31 0`;
  authored node `631x51`. The texture is a neutral white mask; retained Pixi
  applies the authored black tint while preserving the source alpha.
- `level-progress-fill-mask.9.png`: `53x42` lossless distillation of the exact
  qUIck fill export's alpha. Use source insets `26 20 26 21` and render at the
  authored `51px` rail height; the compact texture is not its output size.
  Only the single-pixel center stretches while the alpha preserves the
  authored rounded caps. The texture stays white and retained Pixi applies
  the authored yellow `#ffdf41` tint.

The flat HUD backings do not own feature-local textures. Currency capsules
reuse `white-squircle-20.9.png`, the settings control reuses
`white-squircle-40.9.png`, and the level panel reuses
`white-squircle-30.9.png`; retained Pixi applies black tint at 40% alpha.

The settings gear stays in `root-run-settings`, and the level star stays
in the existing public Root Run asset path. The level rail tints the neutral
fill mask yellow and adds request separators over the retained track.
