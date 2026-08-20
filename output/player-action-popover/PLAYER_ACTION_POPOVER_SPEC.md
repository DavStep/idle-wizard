# Player Action Popover

## Visual role

`PlayerActionPopover` is a compact anchored action surface opened from a player avatar. It should feel like a miniature piece of the established Root Run dialog family, but remain visibly lighter and smaller than the owning Chat dialog.

The popover is not a speech balloon. It has no pointer triangle. Its position and slight overlap beneath the avatar establish ownership.

## Authored geometry at 390 logical width

- Target open size: `146x103px`.
- Runtime nine-slice: `player-action-popover.9.png`.
- Slice margins: `L34 T42 R34 B22`.
- Inner content inset: `12px` horizontally and `14px` vertically.
- Default single action: centered `96x34px` shared red button.
- Avatar anchor: place the popover below the avatar and extend its left edge about `12px` past the avatar's left edge.
- Keep the full popover inside the dialog paper bounds. Flip or clamp horizontally when the avatar is near an edge.

## Surface treatment

- Near-black outer keyline defines the silhouette.
- Warm medium-brown frame supplies the tactile fantasy material.
- Pale parchment center matches the fixed dialog-paper family in both Night and Day themes.
- The tiny paper nicks and ink marks are restrained edge detail. They must remain inside fixed nine-slice corners and never stretch.
- Add the shared compact dialog shadow at runtime: `3px 4px 4px rgb(0 0 0 / 42%)`.
- No glow, arrow, title plaque, avatar, icon, or baked action content belongs in the background raster.

## Content and interaction

- Render `Unfriend` as a separate shared red text button with the normal white outlined label.
- Opening the popover must not move the chat header or message list.
- Tap the avatar again, tap outside, press Back/Escape, or close Chat to dismiss it.
- Opening uses a `140ms` opacity plus `0.96 -> 1` scale transition with an ease-out curve. Reduced-motion mode uses an immediate show/hide.
- The popover shell supports open, clamped-left, clamped-right, and disabled-action compositions. Pending and error feedback belong to the button/status layer, not the background asset.

## Asset separation

- `player-action-popover-polished-composite.png` is the high-resolution visual target with the action included. It is reference-only.
- `player-action-popover-polished-source.png` is the high-resolution empty shell source generated with the built-in image tool.
- `player-action-popover.9.png` is the compact runtime background. Text and buttons must be rendered separately.
- `nine-slice-qa/` contains the original, height-stretched, width-stretched, both-stretched, and interactive browser preview evidence.
