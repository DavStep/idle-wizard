# Backend Leaderboard

Watches SpacetimeDB `leaderboard` rows and exposes compact `topUsers` snapshots to room UI.

The backend owns the shared user list and total income values. The client only subscribes and renders.
