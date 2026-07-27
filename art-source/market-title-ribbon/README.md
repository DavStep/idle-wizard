# Market Title Ribbon

The high-resolution transparent master was generated with the built-in image
generation tool from:

- `assets/game/source/ui/root-run-dialog/expedition-dialog-title-purple.png`
  as the material/style reference;
- the user-supplied folded-ribbon screenshot as the silhouette reference.

The prompt requested a textless, symmetric violet fantasy HUD ribbon with a
quiet horizontal center, fixed folded tails, a heavy near-black outline, and a
flat removable chroma-key background. The chroma key was removed with the
bundled ImageGen helper.

The runtime asset is
`assets/game/source/ui/root-run-market/market-title-ribbon-9slice.png`.
It is a `267x55` PNG with slice margins `73 27 73 27` in
left/top/right/bottom order. Runtime height is fixed; only the horizontal
center stretches. The runtime ribbon has no separate jewel or left-side
decoration. The title-and-stars group receives a `6px` authored-surface upward
optical correction so it centers on the raised front panel rather than the
lower folds.
