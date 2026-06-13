# Backend Leaderboard

Watches SpacetimeDB `leaderboard_summary` rows, reports generated gold totals through reducers, and exposes compact period leaderboard snapshots to room UI.

The backend owns the shared user list. Shared player levels and generated-gold totals are accepted from the client only through bounded reducers. The server tracks daily, weekly, monthly, and all-time income counters from accepted deltas. The client subscribes to a summary view with top-ten leaderboard rows and the connected player's own rank so the UI can show that rank when it falls outside the top ten.
