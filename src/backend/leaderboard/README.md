# Backend Leaderboard

Watches SpacetimeDB `leaderboard` rows, reports generated gold totals through reducers, and exposes compact leaderboard snapshots to room UI.

The backend owns the shared user list. Shared player levels and generated-gold totals are accepted from the client only through bounded reducers. The client subscribes to top-ten leaderboard rows and the connected player's own rank so the UI can show that rank when it falls outside the top ten.
