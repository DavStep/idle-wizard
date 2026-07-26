# Retained Pixi Research Page

`ResearchPixiPage` is a build-once Pixi view. It consumes a renderer-neutral
research view model; research costs, prerequisites, lock reasons, ordering, and
completion rules remain outside rendering.

Expected view-model fields are `tabs`, `selectedTabId`, optional `runFocus`, and
decorated `boxes[].researches[]`. Actions are supplied as `selectTab`,
`setRunFocus`, `buyResearch`, and `showLockedReason`.

Category title plaques use the selected tab as their visual variant: Regular
is yellow, Automation is red, Advanced is emerald green, and the `emerald`
Crystal Research tab is purple. The visible category title remains the primary
identifier.

Rows and boxes are keyed and pooled. Selecting an unlocked label opens the
lazy-once `research.info` dialog through the injected `DialogRegistry`.
Selecting a locked row keeps the requirement off the cost button and opens the
retained theme tooltip instead.

The shared `PixiInputRouter`, theme snapshot, asset manager, viewport
projection, and semantic-target registry are constructor/runtime dependencies.
The renderer never queries DOM geometry or derives locked-state behavior.
