# Retained Pixi Prestige Page

`PrestigePixiPage` keeps the main/points tabs, description, milestone rows,
point-reward rows, confirmation panel, and licence tooltip in one retained Pixi
tree. Milestone and reward rows are keyed and pooled.

The page consumes presenter output. It does not calculate milestone eligibility,
credited levels, reset contents, point unlocks, or market licences. Supply those
as decorated `milestones`, `pointRewards`, `summary`, and `confirm` fields, with
actions for tab selection and prestige completion.

The runtime supplies the shared input router, Pixi theme/assets, viewport
projection, and semantic-target registry. The renderer keeps confirmation and
tooltip state in the retained tree but receives all player-facing content and
eligibility from its presenter.
