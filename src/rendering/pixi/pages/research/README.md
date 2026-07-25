# Retained Pixi Research Page

`ResearchPixiPage` is a build-once Pixi view. It consumes a renderer-neutral
research view model; research costs, prerequisites, lock reasons, ordering, and
completion rules remain outside rendering.

Expected view-model fields are `tabs`, `selectedTabId`, optional `runFocus`, and
decorated `boxes[].researches[]`. Actions are supplied as `selectTab`,
`setRunFocus`, `buyResearch`, and `showLockedReason`.

Rows and boxes are keyed and pooled. Selecting a label opens the lazy-once
`research.info` dialog through the injected `DialogRegistry`.

The shared `PixiInputRouter`, theme snapshot, asset manager, viewport
projection, and semantic-target registry are constructor/runtime dependencies.
The renderer never queries DOM geometry or derives locked-state behavior.
