# Regular Button Assets

This folder owns the shared color and corner-radius variants for regular
image-backed buttons.

Each color has three border-free PNG nine-slices:

- `<color>-button-50.9.png`: large-radius button, `141x171`, minimum rendered
  height `171px`, source slice `L86 T100 R52 B68`.
- `<color>-button-30.9.png`: medium-radius button, `87x104`, minimum rendered
  height `104px`, source slice `L52 T60 R32 B41`.
- `<color>-button-15.9.png`: small-radius button, `46x53`, minimum rendered
  height `53px`, source slice `L27 T30 R16 B20`.

Colors are `blue`, `brown`, `dark-brown`, `gray`, `green`, `purple`, `red`, and
`yellow`.
The radius tier changes the squircle corner geometry and the corresponding
minimum asset size. The bottom slice includes the authored shadow and
decoration. Every tier keeps a flat `3x3` center area so renderers have
explicit horizontal and vertical stretch pixels without extending the
decorative highlight. One matching flat gutter pixel surrounds each side of
that center so smoothed nine-slice rendering cannot sample decoration or
curved-cap pixels across a join.

These checked-in tiers are the canonical regular-button assets. Run
`npm run assets:regular-buttons` to validate the complete matrix and its
metadata after editing them. Cost buttons compose these shared nine-slices
with resource content. Popup tabs reuse the radius-50 brown, dark-brown, and
gray textures with compact output insets instead of owning duplicate PNGs.
Production regular buttons read their source slices, output insets, and minimum
center directly from each adjacent `.9slice.json` sidecar. The runtime maps all
four authored corners with one shared scale at the target button size so it
cannot make one side rounder than the other. Text buttons also derive their
vertical optical center from the rendered bottom shadow (`20px`, `12px`, and
`6px` in the radius-50, radius-30, and radius-15 source assets respectively),
so labels center on the visible face rather than the complete PNG rectangle.
