# Retained Pixi Prestige Page

`PrestigePixiPage` keeps the description, milestone rows, point-reward rows,
and confirmation panel in one retained Pixi tree. The global bottom HUD owns
icon-backed Main/Points controls alongside the icon-backed Workshop return,
using the normal bottom-room icon-tab behavior. Milestone and reward rows are
keyed and pooled.
Summary and reward info controls open the page-owned `PrestigeInfoDialogPixi`
through the shared retained dialog registry.

The identity ribbon reuses `MarketTitleRibbon` and binds its three-slot star
group to completed Prestige Points. `Next Prestige` and `Milestones` reuse
`ResearchStationTitlePlaque`. The compact summary card shows the target level,
new-run starting level, and starting resources; reset details open from the
shared info button. `PrestigeRowWidget` extends the Research paper-card visual
contract as a dense numbered row: a small state marker, one-line level and
icon-led reward content, plus a fixed right action only when available. It does
not repeat the Research art well, rank badge, or a `Reward` label. Point rewards
use the shared star-level marker and keep the threshold and licence on one line.
Currency icons retain their identity color while amount text uses the common
paper ink. Locked future rows keep the same geometry under a quiet overlay.

The page consumes presenter output. It does not calculate milestone eligibility,
credited levels, reset contents, point unlocks, or market licences. Supply those
as decorated `milestones`, `pointRewards`, `summary`, and `confirm` fields, with
actions for tab selection and prestige completion.

The runtime supplies the shared input router, Pixi theme/assets, viewport
projection, semantic-target registry, and dialog registry. The renderer keeps
confirmation state in the retained tree but receives all player-facing content
and eligibility from its presenter. The info dialog derives its height from the
wrapped copy and centers that copy on both axes inside the shared shell.
