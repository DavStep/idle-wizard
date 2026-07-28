# Personal Tasks

Personal tasks are daily quests for one player. They watch successful gameplay
actions, then completed daily quests add points to both the daily and weekly
progression tracks.

The feature stays client/gameplay-save owned. It is not the event system, not
alliance weekly quests, and not a new SpacetimeDB table.

Only daily quest rows exist. Weekly is a reward progression track fed by daily
quest completions, not a separate weekly quest list. Rewards live on milestone
thresholds in the daily and weekly tracks.

The player-facing Workshop dialog is `Daily Tasks`. Its `Tasks` tab reads
`progressQuantity` / `requiredQuantity` from the personal-task snapshot, while
its `Rewards` tab exposes claimable daily and weekly milestones.
