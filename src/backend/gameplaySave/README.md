# Gameplay Save Backend

Stores the full gameplay save JSON in SpacetimeDB under the connected identity.

The save table is private. Clients keep the authenticated `own_player_gameplay_save` view subscribed after hydration and write through `set_player_gameplay_save`.

Hydration and permission to send are separate states, so a baseline created from an empty hydrated server snapshot is journaled before sending is enabled. Before each reducer call, the client journals the latest hydrated save under the connected identity. Reducer completion is not persistence acknowledgement: the journal remains until the live own-save view reports the exact submitted `clientSaveSessionId` and `clientSaveSequence`. Rejections, timeouts, mismatched snapshots, and disconnects retain the latest journal for reconnect recovery.

Startup reconciliation replays that journal when it is ahead of the same save lineage, clears it when the server already contains that revision or a later one, and rejects it when another session advanced the server row. Explicit account-session takeover or reset invalidation may discard pending saves instead of replaying stale progress.

Residual risk: the save is still client-reported progress. The reducer normalizes shape, caps values, and clamps level jumps, but it cannot prove earned inventory, research, timers, coin, or crystal until those systems move to server-authoritative reducers.
