# World Event

World events are weekly world events with at most two matched response requests.
They are not the daily/weekly personal task board. They give normal gameplay
actions a world-news reason for the week.

The active pair keeps one primary item-donation request plus the event's
story-backed coin request. Existing saves are normalized to the same two-request
limit so the dialog never hides an active objective.

Default events should not ask for raw funding as a main objective. Direct coin
requests read like a quest tax unless the story makes the need unavoidable; use
normal workshop actions first.

The feature is client/gameplay-save owned in v1. The weekly period uses the
project Monday UTC anchor so every player sees the same event id for the same
week. Player level gates the feature unlock; event requests do not have
individual targets.

Requests award event contribution points, not immediate completion rewards. The
leaderboard reward table is shown in the event popup, and players need 2000
points to qualify for rank or participation rewards.

Every donation request is an uncapped points exchange for the whole event.
Requests never complete or dim, and players may keep donating any available
listed resource to add leaderboard points.

Open the deterministic retained dialog recipe at
`/src/dev/uiRecipes/world-event-dialog.html?tab=leaderboard` to review the
shared leaderboard-row composition. Use `tab=tasks` or `tab=rewards` to verify
renderer changes across all three pooled row families.
