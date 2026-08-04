# Player Inbox Backend

Server-backed player mail for system messages, broadcasts, manual admin rewards, and world-event rewards.

`PlayerInboxBackendFacade` is the only entry point other client features should use. It subscribes to the own-mail view, exposes a compact snapshot for UI, marks visible mail read, and coordinates reward claim confirmation with gameplay.

Insert/update/delete callbacks project their supplied row into the current snapshot directly. Do not immediately rescan the subscribed iterator inside those callbacks: SpacetimeDB can invoke the callback before `table.iter()` exposes the updated row, which leaves a successful claim visibly claimable.
