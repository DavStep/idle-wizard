# Gameplay Save Backend

Stores the full gameplay save JSON in SpacetimeDB under the connected identity.

The save table is private. Clients load only their own row through the `own_player_gameplay_save` authenticated view and write through `set_player_gameplay_save`.

Residual risk: the save is still client-reported progress. The reducer normalizes shape, caps values, and clamps level jumps, but it cannot prove earned inventory, research, timers, gold, or crystal until those systems move to server-authoritative reducers.
