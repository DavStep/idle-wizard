# Retained Pixi Prestige Page

`PrestigePixiPage` keeps the main/points tabs, description, milestone rows,
point-reward rows, confirmation panel, and licence tooltip in one retained Pixi
tree. Milestone and reward rows are keyed and pooled.

The identity ribbon reuses `MarketTitleRibbon` and binds its three-slot star
group to completed Prestige Points. `Description` and `Progression` reuse
`ResearchStationTitlePlaque`; the description block and `PrestigeRowWidget`
extend the Research paper-card visual contract. Generated milestone rows bind
crystal/ruby rewards through `PixiResourceLabel`, status art uses existing
prestige/check/lock icons, and the available action uses the Research
`PixiCostButton` geometry. Player-facing headings, statuses, and tab labels use
Title Case while explanatory copy remains sentence case.

The page consumes presenter output. It does not calculate milestone eligibility,
credited levels, reset contents, point unlocks, or market licences. Supply those
as decorated `milestones`, `pointRewards`, `summary`, and `confirm` fields, with
actions for tab selection and prestige completion.

The runtime supplies the shared input router, Pixi theme/assets, viewport
projection, and semantic-target registry. The renderer keeps confirmation and
tooltip state in the retained tree but receives all player-facing content and
eligibility from its presenter.
