# Gameplay Save Backend

Stores the full gameplay save JSON in SpacetimeDB under the connected identity.

The save table is private. Clients load only their own row through the `own_player_gameplay_save` authenticated view and write through `set_player_gameplay_save`.

Before sending, the client journals the latest hydrated save under the connected identity. Startup reconciliation replays that journal when it is ahead of the same save lineage, clears it when the server already accepted it, and rejects it when another session advanced the server row.

Residual risk: the save is still client-reported progress. The reducer normalizes shape, caps values, and clamps level jumps, but it cannot prove earned inventory, research, timers, coin, or crystal until those systems move to server-authoritative reducers.
