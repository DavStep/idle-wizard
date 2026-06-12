# Account Session Backend

Keeps one active SpacetimeDB connection per account. When a newer device opens the same account, the older client sees its own session row change and blocks local play before it can keep saving stale progress.
