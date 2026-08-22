# Backend Leaderboard

Watches SpacetimeDB `leaderboard_summary` rows, reports generated coin totals through reducers, and exposes compact period leaderboard snapshots to room UI.

The backend owns the shared user list. Shared player levels and generated-coin totals are accepted from the client through reducers. Leaderboard income has no application-level numeric cap: canonical decimal strings preserve exact daily, weekly, monthly, and all-time totals, while saturated `u64` mirrors keep older clients compatible. The client subscribes to a summary view with top 100 leaderboard rows and the connected player's own rank so the UI can show that rank when it falls outside the top 100.

Leaderboard entries and visible player rows are keyed by the Spacetime identity shown to players as their user ID. Usernames are presentation-only: duplicate usernames may belong to different user IDs, while one user ID must render at most once.
