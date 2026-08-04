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
week. Player level only scales request targets.

Requests award event contribution points, not immediate completion rewards. The
leaderboard reward table is shown in the event popup, and players need 2000
points to qualify for rank or participation rewards.

Request progress completes at its target, but matching actions keep adding
contribution points after completion. Completion changes response status; it
does not cap leaderboard scoring.
