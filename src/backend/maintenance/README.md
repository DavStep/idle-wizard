# Maintenance Backend

`MaintenanceBackendFacade` combines two server-owned blockers:

- global maintenance from `game_config.maintenance`;
- connected-player maintenance from the private `own_player_maintenance` view.

The strictest mode wins (`locked` over `drain` over `off`). Player-scoped rows
let support work pause only the affected account while every other player keeps
playing. The app reuses the existing non-dismissible Maintenance dialog and
reloads after a scoped lock is removed, just as it does after global locked
maintenance.

Player-scoped maintenance must be deployed to both the backend and client before
live use. Old clients cannot observe `own_player_maintenance` and will show an
account-session blocker instead of the intended support message after locking.

Preview the production blocker at
`http://127.0.0.1:55173/?devUi=accountMigrationMaintenance` or run
`cheats.openUi('accountMigrationMaintenance')`. Pass `{ saving: true }` to the
cheat for the final-save state.
