# Backend Leaderboard

Watches SpacetimeDB `leaderboard` rows, reports generated gold totals through reducers, and exposes compact leaderboard snapshots to room UI.

The backend owns the shared user list, player levels, total generated gold values, and income values. The client reports its local lifetime generated gold total; the server keeps the highest value for the leaderboard. The client only subscribes and renders leaderboard income.
