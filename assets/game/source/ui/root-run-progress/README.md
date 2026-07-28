# Root Run progress assets

These compact PNGs are copied from Root Run's reusable progress-bar art:

- `progress-track-9slice.png` comes from `progress-bar-bg.9.png`. Preserve `32px` left/right caps and stretch only the `4px` center band.
- `progress-fill-mask-9slice.png` comes from `progress-bar-fill.9.png`. Preserve `20px` left/right caps and use its alpha as the shared fill mask so Idle Wizard can retain its existing fill colors and gradients.

The retained Pixi renderer rotates the same capsule skin for vertical scrollbars. The assets remain direct source textures rather than game-atlas frames so their nine-slice source geometry is never trimmed.
