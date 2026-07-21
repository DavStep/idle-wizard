# Account Session Backend

Keeps one active SpacetimeDB connection per account. When a newer device opens the same account, the older client sees its own session row change and blocks local play before it can keep saving stale progress.

Session ownership fails closed: a missing own-session row, missing connection identity, or subscription error blocks play instead of treating the connection as active. Observation errors reconnect without deleting the gameplay-save journal; a genuinely missing row is treated as session invalidation while the maintenance feed stays connected.
