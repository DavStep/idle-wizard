---
name: idle-wizard-world-events
description: Use for Idle Wizard weekly world event design or implementation: generating new world event lore, event families, quest titles, player-facing situations/descriptions, donation quest options, point values, event-only potion concepts, outcome text, archive text, and catalog changes in src/gameplay/worldNotice. Trigger when the user asks for a new event, event quests, donation quests, world crisis copy, world notice/event balance, or improving world event descriptions.
---

# Idle Wizard World Events

## Required Context

Read first:

- `experience.md`
- `docs/ai-workflow.md`
- `src/gameplay/worldNotice/README.md`
- `src/gameplay/worldNotice/managers/WorldNoticeCatalogManager.js`
- `src/gameplay/worldNotice/managers/WorldNoticeContributionManager.js`

If changing UI text/layout, also use `idle-wizard-ui-workflow`.

For examples and copy patterns, read `references/event-patterns.md`.

## Workflow

1. Keep the event as a weekly world crisis or world news item, not a personal task board.
2. Pick one family: `village crisis`, `political change`, `military danger`, `exploration discovery`, or `trade disruption`.
3. Write the event first: `eventId`, `family`, `tags`, `headline`, two `body` lines, outcomes, and archive text.
4. Create three player-facing event quests. Keep internal `requests` if editing code, but visible copy must say quests.
5. For each quest, write:
   - `title`: short and flavorful.
   - `situation`: what happened and why the quest exists.
   - `description`: who is helped and why the donation helps.
   - `donationOptions`: exact items or coin, with points per unit.
6. Use exact in-game item names. Prefer existing items; introduce event-only potions only when the user asks or the event needs one strongly.
7. Balance against coin: `1 coin = 1 point`. Item donations must grant more points than coin because they cost crafting time/resources.
8. Write outcomes as weak/decent/strong resolution flavor. Never hard-fail the world event.
9. Verify tests near world notice gameplay and Workshop UI after implementation.

## Donation Quest Rules

- Donation quests consume owned item or coin.
- Use amount picker, not one-tap donation.
- Show points in the picker before confirm.
- Show per-option accumulated points: `total 300 points`.
- Completion caps visible quest progress only; contribution points keep accumulating after completion.
- Leaderboard uses total contribution points.

## Event-Only Potions

Only add event-only potions when explicitly approved or clearly requested.

If added:

- Show the recipe in the event quest/popup.
- Make the potion craftable only during that active event.
- Keep leftover behavior explicit before implementation: keep but uncraftable, hide, convert, or remove.
- Update item config, recipe config, gameplay rules, UI, and tests together.
