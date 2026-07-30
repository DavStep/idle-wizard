# UI Editor Style

The editor follows the quiet dark product language of the Codex desktop app.
This style is intentionally separate from Idle Wizard's illustrated in-game
HUD.

## Character

- Dense, calm, and tool-first.
- Neutral charcoal surfaces create hierarchy without decorative gradients.
- Thin borders and small surface shifts separate regions.
- Color communicates focus, status, or destructive intent only.
- System typography keeps the editor familiar on desktop platforms.

## Surface hierarchy

| Role | Token | Value |
| --- | --- | --- |
| Workspace canvas | `--editor-canvas` | `#171717` |
| Recessed region | `--editor-surface-subtle` | `#1a1a1a` |
| Panel or message | `--editor-surface` | `#232323` |
| Input or elevated control | `--editor-surface-raised` | `#282828` |
| Hovered control | `--editor-surface-hover` | `#2f2f2f` |
| Selected row | `--editor-surface-selected` | `#414348` |

Use borders before shadows. Panels use `--editor-border-subtle` or
`--editor-border`; focused or strongly separated edges may use
`--editor-border-strong`.

## Typography

- Font: native system sans through `--editor-font`.
- Body: `14px` with `1.5` line height.
- Controls: `13px`.
- Metadata: `12px`.
- Dense auxiliary labels: `11px`.
- Use medium or semibold weight for titles and selected labels. Do not use a
  display face, all-caps body copy, or decorative text effects.
- Technical values and source locations may use `--editor-font-mono`.

## Geometry and spacing

- Spacing follows a `4px` base scale.
- Controls use an `8px` radius.
- Panels use a `12px` radius.
- Large composer-like inputs may use a `16px` radius.
- Avoid nested rounded containers when a divider or spacing is enough.
- The left and right dock panels run the full editor height.
- The bottom dock sits under the preview, between the two side panels.
- The preview always consumes every remaining pixel.
- Dock defaults are `260px` left, `300px` right, and `220px` bottom. Responsive
  clamps preserve a usable preview on narrow windows.
- Splitters use a `5px` hit area with a centered `1px` neutral divider.
- The bottom panel is a folder browser with a compact breadcrumb header.
  Folder rows use a familiar outline icon, remain visually flat at rest, and
  form a responsive grid without card chrome.
- The `Library` root owns `UI Assets`, `UI Widgets`, `Dialogs`, and `Scenes`;
  widget categories are nested folders rather than tabs or permanent columns.
- Library entries are compact text rows. The selected row uses
  `--editor-surface-selected`; opening it replaces the center preview without
  adding preview chrome.
- Hierarchy rows use `28px` pitch, depth-based `12px` indentation, a leading eye
  control, an ellipsized component label, and a muted element tag. Hiding a
  parent visually mutes its descendants while preserving their individual
  visibility choices.

## Interaction

- Focus uses the shared `2px` blue ring.
- Hover and pressed states change the surface by one elevation step.
- Folder and breadcrumb navigation uses native release-only buttons with
  normal keyboard activation. Folder content scrolls inside the bottom panel.
- Hierarchy eye controls are native buttons with visible/hidden icons and
  `Hide …` / `Show …` accessible labels. They apply an editor-only visibility
  marker and never remove a component from the preview tree.
- Normal transitions last `150ms`; larger state changes may use `200ms`.
- Motion must explain state and respect reduced-motion preferences.
- Disabled content uses `--editor-text-disabled` without introducing a new
  surface color.

## Semantic color

- Blue is reserved for focus and primary selection.
- Green is success or added state.
- Amber is warning or pending state.
- Red is destructive or removed state.
- Inactive chrome stays neutral.

## Reference contract

The supplied Codex screenshot is the visual reference. Its sampled main
workspace is `#171717`, elevated message surfaces are `#232323`, and the bottom
composer is `#282828`. The empty editor intentionally matches only the
workspace canvas in this step; future components must use the tokens above
rather than resampling or introducing feature-local colors.
