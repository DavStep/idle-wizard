# Backend World Event Leaderboard

Syncs the current player's weekly world event contribution points to SpacetimeDB and subscribes to the shared top rows for the current event. The Workshop event popup renders those rows with the same user/score rhythm as the main leaderboard, while falling back to local points when offline.

Contribution totals are monotonic and nonnegative but do not have a player-level cap. Event donation quests are intentionally uncapped for the full weekly period, so a level-derived server cap would leave the shared row stale while the local total continues to increase.
