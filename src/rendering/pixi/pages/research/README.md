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

Rows and boxes are keyed and pooled. Research labels are passive; the cost
button owns available purchases. Selecting a locked row keeps the requirement
off the cost button and opens the retained theme tooltip instead.

Item-unlock rows consume `itemKind` and `itemKey`: seeds render the shared
seed-pack plus matching herb mark, and potion recipes render the exact potion
atlas frame. Other research rows continue to use their family `artAssetId`.

The shared `PixiInputRouter`, theme snapshot, asset manager, viewport
projection, and semantic-target registry are constructor/runtime dependencies.
The renderer never queries DOM geometry or derives locked-state behavior.

The fixed category tabs use the regular-button tier `30` source assets at the
shared `36px` room-control height. They use the editor-authored sidecar geometry;
the separate compact `28px` footer-tab treatment does not apply to this row.
Locked tabs keep release input only for the retained requirement tooltip, do
not select, use the gray tier-30 skin, and replace their visible label with the
centered shared lock icon.

The UI Lab exposes the complete room as `feature.research-room` and the exact
production `ResearchRowWidget` and `ResearchStationTitlePlaque` classes as
standalone `compound.research-row` and `compound.research-station-title`
entries. The room manifest declares both children, and the row separately
declares its shared cost-button, star-label, and progress-bar dependencies.
The `locked-tabs` room scenario reproduces all three gated tab states and their
tooltips without changing saved gameplay data.
