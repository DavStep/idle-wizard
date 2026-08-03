# Tintable White Squircles

This directory contains the reusable solid white squircle nine-slices imported
from Idle Outpost. The original Android one-pixel nine-patch marker border has
been stripped from every runtime PNG, and each file has matching
`.9slice.json` metadata.

Available radius families are `2`, `4`, `6`, `10`, `15`, `16`, `19`, `20`,
`25`, `30`, `35`, `40`, `50`, `55`, `60`, `70`, `80`, `90`, and `114`.

Keep these textures white. Consumers choose semantic colors with Pixi `tint`
or a CSS background color through the squircle mask. Do not add duplicate
color-baked squircle PNGs.
